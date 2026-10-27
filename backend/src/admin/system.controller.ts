import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, Req, Res, UseGuards, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { createHash } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { SystemEventsService } from './system-events.service';
import { MaintenanceService } from './maintenance.service';

/**
 * Gestão do sistema para o administrador: estado, cópia de segurança e eventos de auditoria.
 * Todas as rotas exigem utilizador administrador (isAdmin / isSuperAdmin / isTechnical).
 */
@Controller('admin/system')
@UseGuards(JwtAuthGuard)
export class SystemController {
  private readonly logger = new Logger(SystemController.name);

  constructor(
    private readonly tenancy: TenancyService,
    private readonly config: ConfigService,
    private readonly sysEvents: SystemEventsService,
    private readonly maintenance: MaintenanceService,
  ) { }

  private assertAdmin(req: any) {
    const u = req?.user || {};
    if (!(u.isAdmin || u.isSuperAdmin || u.isTechnical)) {
      throw new ForbiddenException('Apenas administradores podem aceder a esta área.');
    }
  }

  private async tenantDs(companyId?: string) {
    const id = companyId || TenancyContext.getCompanyId();
    if (!id) throw new ForbiddenException('Empresa não especificada.');
    return { id, ds: await this.tenancy.getTenantDataSource(id) };
  }

  /** Estado do sistema e volumes de dados da empresa activa. */
  @Get('info')
  async info(@Req() req: any, @Query('companyId') companyId?: string) {
    this.assertAdmin(req);
    const { id, ds } = await this.tenantDs(companyId);
    const tables: { table: string; rows: number }[] = [];
    for (const m of ds.entityMetadatas) {
      try {
        const r = await ds.query(`SELECT COUNT(*)::int AS n FROM "${m.tableName}"`);
        tables.push({ table: m.tableName, rows: Number(r?.[0]?.n) || 0 });
      } catch { /* tabela inexistente: ignora */ }
    }
    tables.sort((a, b) => b.rows - a.rows);
    let dbSizeBytes: number | null = null;
    try {
      const r = await ds.query('SELECT pg_database_size(current_database())::bigint AS s, current_database() AS name');
      dbSizeBytes = Number(r?.[0]?.s) || null;
      return this.buildInfo(id, r?.[0]?.name, dbSizeBytes, tables);
    } catch {
      return this.buildInfo(id, null, dbSizeBytes, tables);
    }
  }

  private buildInfo(companyId: string, dbName: string | null, dbSizeBytes: number | null, tables: { table: string; rows: number }[]) {
    return {
      companyId,
      version: this.config.get<string>('APP_VERSION', '1.0.0'),
      node: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      database: { name: dbName, sizeBytes: dbSizeBytes },
      totalRows: tables.reduce((s, t) => s + t.rows, 0),
      tables,
      serverTime: new Date().toISOString(),
    };
  }


  private buildBackup(ds: any, companyId: string, username: string | null) {
    return this.maintenance.buildBackup(ds, companyId, username);
  }

  /** Cópia de segurança completa (JSON) da base de dados da empresa. */
  @Get('backup')
  async backup(@Req() req: any, @Res() res: Response, @Query('companyId') companyId?: string) {
    this.assertAdmin(req);
    const { id, ds } = await this.tenantDs(companyId);
    const payload = await this.buildBackup(ds, id, req.user?.username || null);
    const body = JSON.stringify(payload);
    const checksum = createHash('sha256').update(body).digest('hex');
    this.logger.log(`Backup gerado por ${req.user?.username} (${id}): ${Object.values(payload.counts as Record<string, number>).reduce((s, n) => s + n, 0)} registos, sha256=${checksum.slice(0, 12)}`);
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inverno-backup-${id}-${stamp}.json"`);
    res.setHeader('X-Backup-Checksum', checksum);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Backup-Checksum');
    res.send(body);
  }

  /** Eventos de auditoria: transições de estado de documentos e abertura/fecho de períodos. */
  @Get('events')
  async events(@Req() req: any, @Query('companyId') companyId?: string, @Query('limit') limit?: string) {
    this.assertAdmin(req);
    const { ds } = await this.tenantDs(companyId);
    const max = Math.min(Math.max(parseInt(limit || '200', 10) || 200, 1), 1000);
    const out: any[] = [];
    try {
      const wf = await ds.query(`SELECT "createdAt", "documentType", "documentId", "fromStatus", "toStatus", "userName", "notes" FROM workflow_history ORDER BY "createdAt" DESC LIMIT ${max}`);
      for (const w of wf) out.push({
        at: w.createdAt, category: 'DOCUMENTO', user: w.userName || '-',
        action: `${w.documentType}: ${w.fromStatus} → ${w.toStatus}`, detail: w.notes || '', ref: w.documentId,
      });
    } catch { /* tabela pode não existir */ }
    try {
      const pa = await ds.query(`SELECT "createdAt", action, "performedByUsername", reason, "fiscalYearId" FROM period_audit_logs ORDER BY "createdAt" DESC LIMIT ${max}`);
      for (const p of pa) out.push({
        at: p.createdAt, category: 'PERÍODO', user: p.performedByUsername || '-',
        action: p.action === 'CLOSE' ? 'Fecho de período' : p.action === 'REOPEN' ? 'Reabertura de período' : String(p.action),
        detail: p.reason || '', ref: p.fiscalYearId,
      });
    } catch { /* idem */ }
    out.push(...(await this.sysEvents.list(companyId || TenancyContext.getCompanyId(), max)));
    out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return out.slice(0, max);
  }

  /**
   * Restauro de uma cópia de segurança (JSON gerado por /backup) para a empresa activa.
   * - `dryRun=true` só valida o ficheiro e devolve o que seria restaurado.
   * - Exige `confirm` igual ao id da empresa e que a cópia seja dessa mesma empresa.
   * - Antes de substituir, guarda uma cópia de segurança automática no servidor e executa tudo numa transacção.
   */
  @Post('restore')
  async restore(@Req() req: any, @Body() body: any, @Query('dryRun') dryRun?: string, @Query('companyId') companyId?: string) {
    this.assertAdmin(req);
    const { id, ds } = await this.tenantDs(companyId);
    const bk = body?.backup;
    if (!bk || bk.format !== 'inverno-erp-backup' || bk.formatVersion !== 1 || typeof bk.data !== 'object') {
      throw new BadRequestException('Ficheiro inválido: não é uma cópia de segurança do Inverno ERP.');
    }
    if (bk.companyId !== id) {
      throw new BadRequestException(`Esta cópia pertence à empresa "${bk.companyId}", não à empresa activa "${id}".`);
    }
    const known = new Set<string>(ds.entityMetadatas.map((m: any) => m.tableName));
    const tables = Object.keys(bk.data).filter(t => known.has(t) && Array.isArray(bk.data[t]));
    const ignored = Object.keys(bk.data).filter(t => !known.has(t));
    for (const t of tables) {
      if (typeof bk.counts?.[t] === 'number' && bk.counts[t] !== bk.data[t].length) {
        throw new BadRequestException(`Ficheiro corrompido ou incompleto (tabela ${t}).`);
      }
    }
    const summary = { createdAt: bk.createdAt, createdBy: bk.createdBy, appVersion: bk.appVersion, tables: tables.length, rows: tables.reduce((s, t) => s + bk.data[t].length, 0), ignoredTables: ignored };
    if (dryRun === 'true') return { dryRun: true, ok: true, ...summary };
    if (body?.confirm !== id) throw new BadRequestException('Confirmação em falta: escreva o id da empresa para restaurar.');

    // 1) cópia de segurança automática do estado actual
    const safetyDir = this.maintenance.backupDir;
    await fs.mkdir(safetyDir, { recursive: true });
    const current = await this.buildBackup(ds, id, req.user?.username || null);
    const safetyFile = join(safetyDir, `pre-restauro-${id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await fs.writeFile(safetyFile, JSON.stringify(current));

    // 2) substituição transaccional
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      if (tables.length) await qr.query(`TRUNCATE ${tables.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
      for (const t of tables) {
        const rows: any[] = bk.data[t];
        for (let i = 0; i < rows.length; i += 500) {
          await qr.query(`INSERT INTO "${t}" SELECT * FROM json_populate_recordset(NULL::"${t}", $1::json)`, [JSON.stringify(rows.slice(i, i + 500))]);
        }
      }
      await qr.commitTransaction();
    } catch (e: any) {
      await qr.rollbackTransaction();
      this.logger.error(`Restauro falhou e foi revertido: ${e?.message}`);
      throw new BadRequestException(`Restauro falhou e foi revertido, nada foi alterado. Motivo: ${e?.message}`);
    } finally {
      await qr.release();
    }
    this.logger.log(`Restauro concluído por ${req.user?.username} (${id}): ${summary.rows} registos. Cópia anterior: ${safetyFile}`);
    return { ok: true, ...summary, safetyBackup: safetyFile };
  }
}
