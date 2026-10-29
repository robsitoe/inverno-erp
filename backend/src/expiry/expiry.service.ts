import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { TenancyService } from '../tenancy/tenancy.service';

export interface ExpiryCategory { code: string; label: string; intervalMonths: number; alertDays: number; attributes: { key: string; label: string; options?: string[] }[] }

/** Categorias com valores por omissão; a empresa pode usar outras (texto livre). */
export const CATEGORIES: ExpiryCategory[] = [
  { code: 'EXTINTOR', label: 'Extintores', intervalMonths: 12, alertDays: 30, attributes: [
    { key: 'agente', label: 'Agente extintor', options: ['Pó químico ABC', 'CO₂', 'Água', 'Espuma', 'Pó BC', 'Outro'] },
    { key: 'capacidade', label: 'Capacidade (kg/L)' }, { key: 'fabricante', label: 'Fabricante' }, { key: 'anoFabrico', label: 'Ano de fabrico' },
    { key: 'provaHidraulica', label: 'Próxima prova hidráulica' }] },
  { code: 'VIATURA', label: 'Inspeções de viaturas', intervalMonths: 12, alertDays: 30, attributes: [{ key: 'matricula', label: 'Matrícula' }, { key: 'marcaModelo', label: 'Marca/modelo' }] },
  { code: 'LICENCA', label: 'Licenças e alvarás', intervalMonths: 12, alertDays: 60, attributes: [{ key: 'entidade', label: 'Entidade emissora' }, { key: 'numero', label: 'N.º da licença' }] },
  { code: 'SEGURO', label: 'Seguros', intervalMonths: 12, alertDays: 30, attributes: [{ key: 'seguradora', label: 'Seguradora' }, { key: 'apolice', label: 'Apólice' }] },
  { code: 'CERTIFICADO', label: 'Certificados e inspeções técnicas', intervalMonths: 12, alertDays: 30, attributes: [{ key: 'entidade', label: 'Entidade certificadora' }] },
  { code: 'CONTRATO', label: 'Contratos', intervalMonths: 12, alertDays: 45, attributes: [{ key: 'contraparte', label: 'Contraparte' }] },
  { code: 'PESSOAL', label: 'Documentos de funcionários', intervalMonths: 12, alertDays: 30, attributes: [{ key: 'funcionario', label: 'Funcionário' }, { key: 'documento', label: 'Documento (BI, DIRE, carta...)' }] },
  { code: 'MANUTENCAO', label: 'Manutenções periódicas', intervalMonths: 6, alertDays: 15, attributes: [{ key: 'equipamento', label: 'Equipamento' }] },
  { code: 'OUTRO', label: 'Outros prazos', intervalMonths: 12, alertDays: 30, attributes: [] },
];

const iso = (d: any): string => {
  if (!d) return '';
  if (d instanceof Date) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return String(d).slice(0, 10);
};
const today = () => iso(new Date());
const addMonths = (date: string, months: number) => {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y, m - 1 + months, d);
  return iso(t);
};
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

/**
 * Controlo de validades e prazos (extintores, inspeções, licenças, seguros, contratos, documentos...):
 * cada item tem a próxima data e uma antecedência de aviso; as renovações ficam no histórico.
 */
@Injectable()
export class ExpiryService {
  private ready = new Map<string, Promise<void>>();

  constructor(private readonly tenancy: TenancyService) { }

  private async ds(companyId: string): Promise<DataSource> {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    if (!this.ready.has(companyId)) {
      this.ready.set(companyId, (async () => {
        await ds.query(`CREATE TABLE IF NOT EXISTS expiry_items (
          id VARCHAR(40) PRIMARY KEY, category VARCHAR(40) NOT NULL, code VARCHAR(60), description VARCHAR(200) NOT NULL,
          location VARCHAR(160), responsible VARCHAR(160), supplier VARCHAR(160), "serialNumber" VARCHAR(80), attributes JSONB,
          "lastDate" DATE, "nextDate" DATE NOT NULL, "intervalMonths" INT, "alertDays" INT NOT NULL DEFAULT 30,
          status VARCHAR(12) NOT NULL DEFAULT 'ACTIVE', notes TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await ds.query(`CREATE INDEX IF NOT EXISTS expiry_items_next ON expiry_items (status, "nextDate")`);
        await ds.query(`CREATE TABLE IF NOT EXISTS expiry_events (
          id BIGSERIAL PRIMARY KEY, "itemId" VARCHAR(40) NOT NULL, date DATE NOT NULL, type VARCHAR(20) NOT NULL,
          description TEXT, cost NUMERIC(18,2) NOT NULL DEFAULT 0, "documentRef" VARCHAR(80), "previousDate" DATE, "nextDate" DATE,
          "createdBy" VARCHAR(80), "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
      })().catch(e => { this.ready.delete(companyId); throw e; }));
    }
    await this.ready.get(companyId);
    return ds;
  }

  categories() { return CATEGORIES; }

  private shape(r: any) {
    const next = iso(r.nextDate), now = today();
    const daysLeft = daysBetween(now, next);
    const alertDays = Number(r.alertDays) || 30;
    const state = r.status !== 'ACTIVE' ? 'RETIRED' : daysLeft < 0 ? 'EXPIRED' : daysLeft <= alertDays ? 'DUE' : 'OK';
    return {
      ...r, lastDate: r.lastDate ? iso(r.lastDate) : null, nextDate: next, alertDays,
      intervalMonths: r.intervalMonths != null ? Number(r.intervalMonths) : null,
      attributes: typeof r.attributes === 'string' ? JSON.parse(r.attributes || '{}') : (r.attributes || {}),
      daysLeft, state,
      categoryLabel: CATEGORIES.find(c => c.code === r.category)?.label || r.category,
    };
  }

  async list(companyId: string, q: { category?: string; state?: string; location?: string } = {}) {
    const ds = await this.ds(companyId);
    const rows = (await ds.query(`SELECT * FROM expiry_items ORDER BY "nextDate", description`)).map((r: any) => this.shape(r));
    return rows.filter((r: any) =>
      (!q.category || r.category === q.category) &&
      (!q.state || (q.state === 'ALERT' ? ['EXPIRED', 'DUE'].includes(r.state) : r.state === q.state)) &&
      (!q.location || String(r.location || '').toLowerCase().includes(String(q.location).toLowerCase())));
  }

  /** Resumo para o sino de notificações e o painel: vencidos e a vencer. */
  async summary(companyId: string) {
    const all = (await this.list(companyId)).filter((r: any) => r.state !== 'RETIRED');
    const expired = all.filter((r: any) => r.state === 'EXPIRED');
    const due = all.filter((r: any) => r.state === 'DUE');
    const byCategory = CATEGORIES.map(c => ({
      code: c.code, label: c.label,
      total: all.filter((r: any) => r.category === c.code).length,
      expired: expired.filter((r: any) => r.category === c.code).length,
      due: due.filter((r: any) => r.category === c.code).length,
    })).filter(c => c.total);
    const pick = (r: any) => ({ id: r.id, category: r.category, categoryLabel: r.categoryLabel, description: r.description, code: r.code, location: r.location, nextDate: r.nextDate, daysLeft: r.daysLeft, state: r.state });
    return { total: all.length, expired: expired.length, due: due.length, alerts: [...expired, ...due].slice(0, 20).map(pick), byCategory };
  }

  async get(companyId: string, id: string) {
    const ds = await this.ds(companyId);
    const r = (await ds.query(`SELECT * FROM expiry_items WHERE id=$1`, [id]))[0];
    if (!r) throw new NotFoundException('Item não encontrado.');
    const events = await ds.query(`SELECT *, to_char(date, 'YYYY-MM-DD') AS date, to_char("previousDate", 'YYYY-MM-DD') AS "previousDate", to_char("nextDate", 'YYYY-MM-DD') AS "nextDate"
      FROM expiry_events WHERE "itemId"=$1 ORDER BY expiry_events.date DESC, id DESC`, [id]);
    return { ...this.shape(r), events };
  }

  async save(companyId: string, b: any, user: string | null) {
    const ds = await this.ds(companyId);
    const cat = CATEGORIES.find(c => c.code === b?.category);
    const v = {
      category: String(b?.category || 'OUTRO').trim().toUpperCase(), code: b?.code ? String(b.code).trim() : null,
      description: String(b?.description || '').trim(), location: b?.location || null, responsible: b?.responsible || null,
      supplier: b?.supplier || null, serialNumber: b?.serialNumber || null, attributes: JSON.stringify(b?.attributes || {}),
      lastDate: b?.lastDate ? iso(b.lastDate) : null,
      intervalMonths: b?.intervalMonths !== undefined && b?.intervalMonths !== null && b?.intervalMonths !== '' ? Math.max(0, Math.round(Number(b.intervalMonths))) : (cat?.intervalMonths ?? null),
      alertDays: Math.max(0, Math.round(Number(b?.alertDays ?? cat?.alertDays ?? 30))),
      notes: b?.notes || null,
      nextDate: b?.nextDate ? iso(b.nextDate) : '',
    };
    if (!v.nextDate && v.lastDate && v.intervalMonths) v.nextDate = addMonths(v.lastDate, v.intervalMonths);
    const errors: string[] = [];
    if (!v.description) errors.push('Indique a descrição.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.nextDate)) errors.push('Indique a data de validade / próxima renovação (ou a última data e a periodicidade).');
    if (v.lastDate && v.nextDate && v.lastDate > v.nextDate) errors.push('A próxima data tem de ser posterior à última.');
    if (errors.length) throw new BadRequestException({ message: 'O registo tem problemas.', errors });

    if (b?.id) {
      const r = await ds.query(`UPDATE expiry_items SET category=$1, code=$2, description=$3, location=$4, responsible=$5, supplier=$6, "serialNumber"=$7, attributes=$8,
        "lastDate"=$9, "nextDate"=$10, "intervalMonths"=$11, "alertDays"=$12, notes=$13, "updatedAt"=now() WHERE id=$14`,
        [v.category, v.code, v.description, v.location, v.responsible, v.supplier, v.serialNumber, v.attributes, v.lastDate, v.nextDate, v.intervalMonths, v.alertDays, v.notes, b.id]);
      if (Array.isArray(r) && r[1] === 0) throw new NotFoundException('Item não encontrado.');
      return this.get(companyId, b.id);
    }
    const id = randomUUID();
    await ds.query(`INSERT INTO expiry_items (id, category, code, description, location, responsible, supplier, "serialNumber", attributes, "lastDate", "nextDate", "intervalMonths", "alertDays", notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, v.category, v.code, v.description, v.location, v.responsible, v.supplier, v.serialNumber, v.attributes, v.lastDate, v.nextDate, v.intervalMonths, v.alertDays, v.notes]);
    await ds.query(`INSERT INTO expiry_events ("itemId", date, type, description, "nextDate", "createdBy") VALUES ($1, CURRENT_DATE, 'CREATED', 'Registo criado', $2, $3)`, [id, v.nextDate, user]);
    return this.get(companyId, id);
  }

  /** Renovação (recarga, inspeção, renovação da licença...): guarda o histórico e calcula a próxima data. */
  async renew(companyId: string, id: string, b: any, user: string | null) {
    const ds = await this.ds(companyId);
    const item = await this.get(companyId, id);
    if (item.status !== 'ACTIVE') throw new BadRequestException('O item está retirado.');
    const date = b?.date ? iso(b.date) : today();
    let next = b?.nextDate ? iso(b.nextDate) : '';
    if (!next && item.intervalMonths) next = addMonths(date, item.intervalMonths);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) throw new BadRequestException('Indique a nova data de validade (o item não tem periodicidade definida).');
    if (next <= date) throw new BadRequestException('A nova data de validade tem de ser posterior à data da renovação.');
    await ds.query(`INSERT INTO expiry_events ("itemId", date, type, description, cost, "documentRef", "previousDate", "nextDate", "createdBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, date, b?.type === 'INSPECTION' ? 'INSPECTION' : 'RENEWAL', String(b?.description || 'Renovação').trim(), Math.round((Number(b?.cost) || 0) * 100) / 100,
        b?.documentRef || null, item.nextDate, next, user]);
    await ds.query(`UPDATE expiry_items SET "lastDate"=$1, "nextDate"=$2, "updatedAt"=now() WHERE id=$3`, [date, next, id]);
    return this.get(companyId, id);
  }

  async retire(companyId: string, id: string, reason: string, user: string | null) {
    const ds = await this.ds(companyId);
    await this.get(companyId, id);
    await ds.query(`UPDATE expiry_items SET status='RETIRED', "updatedAt"=now() WHERE id=$1`, [id]);
    await ds.query(`INSERT INTO expiry_events ("itemId", date, type, description, "createdBy") VALUES ($1, CURRENT_DATE, 'RETIRED', $2, $3)`, [id, reason || 'Retirado de serviço', user]);
    return this.get(companyId, id);
  }
}
