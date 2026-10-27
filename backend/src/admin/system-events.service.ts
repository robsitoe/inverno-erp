import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface SystemEventInput {
  category: 'ACESSO' | 'UTILIZADOR' | 'CONFIGURAÇÃO' | 'SISTEMA';
  action: string;
  detail?: string;
  user?: string;
  companyId?: string;
}

/** Registo de eventos de administração (acessos, utilizadores, configuração, backups). Nunca guarda palavras-passe nem corpos de pedidos. */
@Injectable()
export class SystemEventsService {
  private readonly logger = new Logger(SystemEventsService.name);
  private ready: Promise<void> | null = null;

  constructor(private readonly ds: DataSource) { }

  private ensureTable(): Promise<void> {
    if (!this.ready) {
      this.ready = this.ds.query(`CREATE TABLE IF NOT EXISTS system_events (
        id BIGSERIAL PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL DEFAULT now(),
        category VARCHAR(30) NOT NULL,
        action VARCHAR(200) NOT NULL,
        detail TEXT,
        username VARCHAR(120),
        "companyId" VARCHAR(80)
      )`).then(() => undefined).catch((e: any) => { this.ready = null; throw e; });
    }
    return this.ready;
  }

  async log(e: SystemEventInput): Promise<void> {
    try {
      await this.ensureTable();
      await this.ds.query(
        'INSERT INTO system_events (category, action, detail, username, "companyId") VALUES ($1,$2,$3,$4,$5)',
        [e.category, e.action.slice(0, 200), (e.detail || '').slice(0, 1000), e.user || null, e.companyId || null],
      );
    } catch (err: any) {
      this.logger.warn(`Não foi possível registar evento: ${err?.message}`);
    }
  }

  async list(companyId: string | undefined, limit: number): Promise<any[]> {
    try {
      await this.ensureTable();
      const rows = await this.ds.query(
        `SELECT at, category, action, detail, username FROM system_events
         WHERE ($1::text IS NULL OR "companyId" IS NULL OR "companyId" = $1)
         ORDER BY at DESC LIMIT $2`, [companyId || null, limit]);
      return rows.map((r: any) => ({ at: r.at, category: r.category, user: r.username || '-', action: r.action, detail: r.detail || '', ref: '' }));
    } catch {
      return [];
    }
  }
}
