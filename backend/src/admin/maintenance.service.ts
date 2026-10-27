import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { TenancyService } from '../tenancy/tenancy.service';
import { SystemEventsService } from './system-events.service';

const gz = promisify(gzip);

export type PlanType = 'BACKUP' | 'INTEGRITY' | 'CLEANUP';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface MaintenancePlan {
  id: number;
  companyId: string;
  type: PlanType;
  frequency: Frequency;
  timeOfDay: string;      // HH:mm (hora do servidor)
  dayOfWeek: number;      // 0=domingo..6 (semanal)
  dayOfMonth: number;     // 1..28 (mensal)
  retention: number;      // BACKUP: nº de cópias a manter; CLEANUP: dias de histórico a manter
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  nextRunAt: string | null;
}

export interface IntegrityIssue {
  code: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  count: number;
  repairable: boolean;
  samples: any[];
}

/** Planos de manutenção: cópias automáticas, verificação de integridade e limpeza, com agendador no servidor. */
@Injectable()
export class MaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceService.name);
  private timer: NodeJS.Timeout | null = null;
  private ready: Promise<void> | null = null;
  private running = new Set<number>();

  constructor(
    private readonly main: DataSource,
    private readonly tenancy: TenancyService,
    private readonly config: ConfigService,
    private readonly events: SystemEventsService,
  ) { }

  // ---------- infra ----------
  get backupDir(): string {
    return this.config.get<string>('BACKUP_DIR') || join(process.cwd(), 'backups');
  }

  private ensureTables(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.main.query(`CREATE TABLE IF NOT EXISTS maintenance_plans (
          id SERIAL PRIMARY KEY, "companyId" VARCHAR(80) NOT NULL, type VARCHAR(20) NOT NULL, frequency VARCHAR(10) NOT NULL,
          "timeOfDay" VARCHAR(5) NOT NULL DEFAULT '22:00', "dayOfWeek" INT NOT NULL DEFAULT 0, "dayOfMonth" INT NOT NULL DEFAULT 1,
          retention INT NOT NULL DEFAULT 14, enabled BOOLEAN NOT NULL DEFAULT true,
          "lastRunAt" TIMESTAMPTZ, "lastStatus" VARCHAR(10), "lastMessage" TEXT, "nextRunAt" TIMESTAMPTZ)`);
        await this.main.query(`CREATE TABLE IF NOT EXISTS maintenance_runs (
          id BIGSERIAL PRIMARY KEY, "planId" INT, "companyId" VARCHAR(80), type VARCHAR(20), trigger VARCHAR(10),
          "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "finishedAt" TIMESTAMPTZ, status VARCHAR(10), message TEXT, result JSONB)`);
      })().catch(e => { this.ready = null; throw e; });
    }
    return this.ready;
  }

  onModuleInit() {
    // Verifica de minuto a minuto se há planos por executar
    this.timer = setInterval(() => { void this.tick(); }, 60_000);
    this.timer.unref?.();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  // ---------- agendamento ----------
  computeNext(p: Pick<MaintenancePlan, 'frequency' | 'timeOfDay' | 'dayOfWeek' | 'dayOfMonth'>, from = new Date()): Date {
    const [h, m] = (p.timeOfDay || '22:00').split(':').map(n => parseInt(n, 10) || 0);
    const d = new Date(from);
    d.setSeconds(0, 0); d.setHours(h, m);
    if (p.frequency === 'DAILY') { if (d <= from) d.setDate(d.getDate() + 1); }
    else if (p.frequency === 'WEEKLY') {
      let add = (p.dayOfWeek - d.getDay() + 7) % 7;
      if (add === 0 && d <= from) add = 7;
      d.setDate(d.getDate() + add);
    } else {
      d.setDate(Math.min(Math.max(p.dayOfMonth || 1, 1), 28));
      if (d <= from) { d.setMonth(d.getMonth() + 1); d.setDate(Math.min(Math.max(p.dayOfMonth || 1, 1), 28)); }
    }
    return d;
  }

  private async tick() {
    try {
      await this.ensureTables();
      const due: MaintenancePlan[] = await this.main.query(`SELECT * FROM maintenance_plans WHERE enabled AND "nextRunAt" IS NOT NULL AND "nextRunAt" <= now()`);
      for (const p of due) { void this.runPlan(p.id, 'AUTO'); }
    } catch (e: any) { this.logger.warn(`Agendador: ${e?.message}`); }
  }

  // ---------- planos ----------
  async listPlans(companyId: string): Promise<MaintenancePlan[]> {
    await this.ensureTables();
    return this.main.query(`SELECT * FROM maintenance_plans WHERE "companyId"=$1 ORDER BY type, id`, [companyId]);
  }

  async savePlan(companyId: string, input: Partial<MaintenancePlan>): Promise<MaintenancePlan> {
    await this.ensureTables();
    const type = String(input.type) as PlanType;
    if (!['BACKUP', 'INTEGRITY', 'CLEANUP'].includes(type)) throw new Error('Tipo de plano inválido.');
    const frequency = (['DAILY', 'WEEKLY', 'MONTHLY'].includes(String(input.frequency)) ? input.frequency : 'DAILY') as Frequency;
    const time = /^\d{2}:\d{2}$/.test(String(input.timeOfDay)) ? String(input.timeOfDay) : '22:00';
    const dow = Math.min(Math.max(Number(input.dayOfWeek) || 0, 0), 6);
    const dom = Math.min(Math.max(Number(input.dayOfMonth) || 1, 1), 28);
    const retention = Math.min(Math.max(Number(input.retention) || (type === 'CLEANUP' ? 90 : 14), 1), 3650);
    const enabled = input.enabled !== false;
    const next = enabled ? this.computeNext({ frequency, timeOfDay: time, dayOfWeek: dow, dayOfMonth: dom }) : null;
    if (input.id) {
      const rows = await this.main.query(
        `UPDATE maintenance_plans SET type=$2, frequency=$3, "timeOfDay"=$4, "dayOfWeek"=$5, "dayOfMonth"=$6, retention=$7, enabled=$8, "nextRunAt"=$9
         WHERE id=$1 AND "companyId"=$10 RETURNING *`, [input.id, type, frequency, time, dow, dom, retention, enabled, next, companyId]);
      if (!rows.length) throw new Error('Plano não encontrado.');
      return rows[0];
    }
    const rows = await this.main.query(
      `INSERT INTO maintenance_plans ("companyId", type, frequency, "timeOfDay", "dayOfWeek", "dayOfMonth", retention, enabled, "nextRunAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [companyId, type, frequency, time, dow, dom, retention, enabled, next]);
    return rows[0];
  }

  async deletePlan(companyId: string, id: number) {
    await this.ensureTables();
    await this.main.query(`DELETE FROM maintenance_plans WHERE id=$1 AND "companyId"=$2`, [id, companyId]);
  }

  /** Cria o conjunto recomendado se a empresa ainda não tem planos. */
  async createDefaults(companyId: string) {
    const existing = await this.listPlans(companyId);
    if (existing.length) return existing;
    await this.savePlan(companyId, { type: 'BACKUP', frequency: 'DAILY', timeOfDay: '22:00', retention: 14 });
    await this.savePlan(companyId, { type: 'INTEGRITY', frequency: 'WEEKLY', dayOfWeek: 0, timeOfDay: '03:00' });
    await this.savePlan(companyId, { type: 'CLEANUP', frequency: 'MONTHLY', dayOfMonth: 1, timeOfDay: '04:00', retention: 180 });
    return this.listPlans(companyId);
  }

  async listRuns(companyId: string, limit = 100) {
    await this.ensureTables();
    return this.main.query(`SELECT id, "planId", type, trigger, "startedAt", "finishedAt", status, message FROM maintenance_runs WHERE "companyId"=$1 ORDER BY "startedAt" DESC LIMIT $2`, [companyId, limit]);
  }

  // ---------- execução ----------
  async runPlan(planId: number, trigger: 'AUTO' | 'MANUAL', companyScope?: string): Promise<any> {
    await this.ensureTables();
    if (this.running.has(planId)) return { status: 'SKIPPED', message: 'Plano já em execução.' };
    const rows: MaintenancePlan[] = await this.main.query(`SELECT * FROM maintenance_plans WHERE id=$1`, [planId]);
    const plan = rows[0];
    if (!plan || (companyScope && plan.companyId !== companyScope)) throw new Error('Plano não encontrado.');
    this.running.add(planId);
    const run = (await this.main.query(`INSERT INTO maintenance_runs ("planId","companyId",type,trigger,status) VALUES ($1,$2,$3,$4,'RUNNING') RETURNING id`, [plan.id, plan.companyId, plan.type, trigger]))[0];
    let status = 'OK'; let message = ''; let result: any = null;
    try {
      const ds = await this.tenancy.getTenantDataSource(plan.companyId);
      if (plan.type === 'BACKUP') { result = await this.autoBackup(ds, plan.companyId, plan.retention); message = `Cópia criada (${this.fmt(result.size)}), ${result.kept} mantida(s).`; }
      else if (plan.type === 'INTEGRITY') {
        result = await this.checkIntegrity(ds);
        const crit = result.issues.filter((i: IntegrityIssue) => i.severity === 'CRITICAL').length;
        const warn = result.issues.filter((i: IntegrityIssue) => i.severity === 'WARNING').length;
        status = crit ? 'ERRO' : warn ? 'AVISO' : 'OK';
        message = result.issues.length ? `${crit} crítico(s), ${warn} aviso(s).` : 'Sem problemas encontrados.';
      } else { result = await this.cleanup(ds, plan.companyId, plan.retention); message = `Removidos ${result.events} evento(s) e ${result.files} ficheiro(s) antigos.`; }
    } catch (e: any) { status = 'ERRO'; message = e?.message || 'Falha na execução.'; this.logger.error(`Plano ${plan.id} (${plan.type}) falhou: ${message}`); }
    const next = plan.enabled ? this.computeNext(plan) : null;
    await this.main.query(`UPDATE maintenance_runs SET "finishedAt"=now(), status=$2, message=$3, result=$4 WHERE id=$1`, [run.id, status, message, result ? JSON.stringify(result) : null]);
    await this.main.query(`UPDATE maintenance_plans SET "lastRunAt"=now(), "lastStatus"=$2, "lastMessage"=$3, "nextRunAt"=$4 WHERE id=$1`, [plan.id, status, message, next]);
    await this.events.log({ category: 'SISTEMA', action: `Manutenção ${plan.type} (${trigger === 'AUTO' ? 'agendada' : 'manual'}): ${status}`, detail: message, user: trigger === 'AUTO' ? 'agendador' : undefined, companyId: plan.companyId });
    this.running.delete(planId);
    return { status, message, result };
  }

  private fmt(b: number) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  // ---------- backup ----------
  async buildBackup(ds: DataSource, companyId: string, username: string | null) {
    const data: Record<string, any[]> = {};
    const counts: Record<string, number> = {};
    for (const m of ds.entityMetadatas) {
      try {
        const rows = await ds.query(`SELECT * FROM "${m.tableName}"`);
        data[m.tableName] = rows; counts[m.tableName] = rows.length;
      } catch (e: any) { this.logger.warn(`Backup: tabela ${m.tableName} ignorada (${e?.message})`); }
    }
    return { format: 'inverno-erp-backup', formatVersion: 1, appVersion: this.config.get<string>('APP_VERSION', '1.0.0'), companyId, createdAt: new Date().toISOString(), createdBy: username, counts, data };
  }

  private async autoBackup(ds: DataSource, companyId: string, keep: number) {
    const dir = join(this.backupDir, 'auto', companyId);
    await fs.mkdir(dir, { recursive: true });
    const bk = await this.buildBackup(ds, companyId, 'agendador');
    const buf = await gz(Buffer.from(JSON.stringify(bk)));
    const name = `auto-${companyId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json.gz`;
    await fs.writeFile(join(dir, name), buf);
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json.gz')).sort().reverse();
    for (const old of files.slice(keep)) await fs.unlink(join(dir, old)).catch(() => undefined);
    return { file: name, size: buf.length, kept: Math.min(files.length, keep) };
  }

  async listBackupFiles(companyId: string) {
    const out: { name: string; size: number; at: string; kind: string }[] = [];
    for (const [sub, kind] of [[join('auto', companyId), 'Automática'], ['', 'Pré-restauro']] as const) {
      const dir = join(this.backupDir, sub);
      let files: string[] = [];
      try { files = await fs.readdir(dir); } catch { continue; }
      for (const f of files) {
        if (!(f.endsWith('.json.gz') || (kind === 'Pré-restauro' && f.startsWith('pre-restauro-') && f.includes(companyId) && f.endsWith('.json')))) continue;
        const st = await fs.stat(join(dir, f));
        out.push({ name: (kind === 'Automática' ? 'auto/' : '') + f, size: st.size, at: st.mtime.toISOString(), kind });
      }
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }

  async readBackupFile(companyId: string, name: string): Promise<{ path: string; filename: string }> {
    const clean = name.replace(/\\/g, '/');
    const isAuto = clean.startsWith('auto/');
    const base = clean.replace(/^auto\//, '');
    if (!/^[A-Za-z0-9._-]+$/.test(base) || !(base.endsWith('.json.gz') || base.endsWith('.json')) || !base.includes(companyId)) throw new Error('Ficheiro inválido.');
    const p = join(this.backupDir, isAuto ? join('auto', companyId) : '', base);
    await fs.access(p);
    return { path: p, filename: base };
  }

  // ---------- limpeza ----------
  private async cleanup(ds: DataSource, companyId: string, days: number) {
    const ev = await this.main.query(`DELETE FROM system_events WHERE at < now() - ($1 || ' days')::interval AND ("companyId" = $2 OR "companyId" IS NULL)`, [String(days), companyId]).catch(() => [[], 0]);
    let files = 0;
    const cutoff = Date.now() - days * 86400000;
    for (const dir of [this.backupDir]) {
      try {
        for (const f of await fs.readdir(dir)) {
          if (!f.startsWith('pre-restauro-') || !f.includes(companyId)) continue;
          const st = await fs.stat(join(dir, f));
          if (st.mtimeMs < cutoff) { await fs.unlink(join(dir, f)); files++; }
        }
      } catch { /* pasta inexistente */ }
    }
    const events = Array.isArray(ev) ? (typeof ev[1] === 'number' ? ev[1] : 0) : 0;
    return { events, files, olderThanDays: days };
  }

  // ---------- integridade ----------
  async checkIntegrity(ds: DataSource) {
    const issues: IntegrityIssue[] = [];
    const q = async (sql: string, params: any[] = []) => { try { return await ds.query(sql, params); } catch { return null; } };
    const add = (code: string, severity: IntegrityIssue['severity'], title: string, rows: any[] | null, repairable = false) => {
      if (rows && rows.length) issues.push({ code, severity, title, count: rows.length, repairable, samples: rows.slice(0, 10) });
    };

    add('UNBALANCED', 'CRITICAL', 'Lançamentos descompensados (débito ≠ crédito)',
      await q(`SELECT e.id, e.reference, e."sourceType" AS tipo, round(sum(l.debit)-sum(l.credit),2) AS dif FROM journal_entries e JOIN journal_lines l ON l."journalEntryId"=e.id WHERE e.status='POSTED' GROUP BY e.id HAVING abs(sum(l.debit)-sum(l.credit))>0.005 LIMIT 200`));
    const g = await q(`SELECT round(coalesce(sum(l.debit),0)-coalesce(sum(l.credit),0),2) AS dif FROM journal_lines l JOIN journal_entries e ON e.id=l."journalEntryId" WHERE e.status='POSTED'`);
    if (g && Math.abs(Number(g[0].dif)) > 0.005) issues.push({ code: 'GLOBAL_IMBALANCE', severity: 'CRITICAL', title: 'Balancete global não fecha a zero', count: 1, repairable: false, samples: [{ diferenca: Number(g[0].dif) }] });

    add('ORPHAN_SALE', 'CRITICAL', 'Lançamentos de venda sem documento (órfãos) — inflacionam a contabilidade',
      await q(`SELECT e.id, e.reference, e.date, (SELECT sum(debit) FROM journal_lines WHERE "journalEntryId"=e.id) AS valor FROM journal_entries e WHERE e."sourceType"='SALE' AND e.status='POSTED' AND NOT EXISTS (SELECT 1 FROM sales_documents d WHERE d.id::text=e."sourceDocument") LIMIT 200`), true);
    add('ORPHAN_PURCHASE', 'CRITICAL', 'Lançamentos de compra sem documento (órfãos)',
      await q(`SELECT e.id, e.reference, e.date, (SELECT sum(debit) FROM journal_lines WHERE "journalEntryId"=e.id) AS valor FROM journal_entries e WHERE e."sourceType"='PURCHASE' AND e.status='POSTED' AND NOT EXISTS (SELECT 1 FROM purchase_documents d WHERE d.id::text=e."sourceDocument") LIMIT 200`), true);
    add('ORPHAN_TREASURY', 'CRITICAL', 'Lançamentos de recibo/pagamento sem documento (órfãos)',
      await q(`SELECT e.id, e.reference, e.date, (SELECT sum(debit) FROM journal_lines WHERE "journalEntryId"=e.id) AS valor FROM journal_entries e WHERE e."sourceType" IN ('RECEIPT','PAYMENT') AND e.status='POSTED' AND NOT EXISTS (SELECT 1 FROM treasury_documents d WHERE d.id::text=e."sourceDocument") LIMIT 200`), true);

    add('VOIDED_SALE_ACTIVE', 'WARNING', 'Vendas anuladas/rascunho com lançamento activo sem estorno',
      await q(`SELECT d."documentNumber", d.status, d.total FROM sales_documents d WHERE d.status IN ('REJECTED','DRAFT','SUBMITTED') AND EXISTS (SELECT 1 FROM journal_entries e WHERE e."sourceType"='SALE' AND e."sourceDocument"=d.id::text AND e.status='POSTED') AND NOT EXISTS (SELECT 1 FROM journal_entries r WHERE r."sourceType"='REVERSAL' AND r."sourceDocument"=d.id::text) LIMIT 200`));
    add('SALE_NO_ENTRY', 'WARNING', 'Vendas aprovadas sem lançamento contabilístico',
      await q(`SELECT d."documentNumber", d.status, d.total FROM sales_documents d WHERE d.status IN ('APPROVED','POSTED') AND NOT EXISTS (SELECT 1 FROM journal_entries e WHERE e."sourceType"='SALE' AND e."sourceDocument"=d.id::text AND e.status='POSTED') LIMIT 200`));
    add('PURCHASE_NO_ENTRY', 'WARNING', 'Compras aprovadas sem lançamento contabilístico',
      await q(`SELECT d.number, d.type, d.status, d."totalValue" FROM purchase_documents d WHERE d.status IN ('APPROVED','POSTED') AND NOT EXISTS (SELECT 1 FROM journal_entries e WHERE e."sourceType"='PURCHASE' AND e."sourceDocument"=d.id::text AND e.status='POSTED') LIMIT 200`));
    add('NEGATIVE_STOCK', 'WARNING', 'Artigos com stock negativo',
      await q(`SELECT code, name, "currentStock" FROM articles WHERE "currentStock" < 0 ORDER BY "currentStock" LIMIT 200`));

    return { checkedAt: new Date().toISOString(), issues };
  }

  /** Anula (CANCELLED) lançamentos órfãos. Faz antes uma cópia de segurança. Reversível via correctionReason. */
  async repairOrphans(ds: DataSource, companyId: string, username: string | null) {
    const pre = await this.autoBackup(ds, companyId, 30);
    const tag = `ORFAO-${new Date().toISOString().slice(0, 10)}`;
    const sql = `UPDATE journal_entries e SET status='CANCELLED', "correctionReason"=$1 WHERE e.status='POSTED' AND (
      (e."sourceType"='SALE' AND NOT EXISTS (SELECT 1 FROM sales_documents d WHERE d.id::text=e."sourceDocument")) OR
      (e."sourceType"='PURCHASE' AND NOT EXISTS (SELECT 1 FROM purchase_documents d WHERE d.id::text=e."sourceDocument")) OR
      (e."sourceType" IN ('RECEIPT','PAYMENT') AND NOT EXISTS (SELECT 1 FROM treasury_documents d WHERE d.id::text=e."sourceDocument")))`;
    const res = await ds.query(sql, [tag]);
    const cancelled = Array.isArray(res) ? (typeof res[1] === 'number' ? res[1] : 0) : 0;
    await this.events.log({ category: 'SISTEMA', action: 'Correcção de lançamentos órfãos', detail: `${cancelled} lançamento(s) anulados (${tag}). Cópia prévia: ${pre.file}`, user: username || undefined, companyId });
    return { cancelled, tag, safetyBackup: pre.file };
  }
}
