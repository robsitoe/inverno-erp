import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { TenancyService } from '../tenancy/tenancy.service';
import { AccountingService } from '../accounting/accounting.service';

export type AssetCategory = 'TANGIBLE' | 'INTANGIBLE';

/** Contas por omissão (PGC-NIR). */
export const CATEGORY_ACCOUNTS: Record<AssetCategory, { asset: string; accDep: string; expense: string }> = {
  TANGIBLE: { asset: '3.2.2', accDep: '3.8.2', expense: '6.5.1' },
  INTANGIBLE: { asset: '3.3.2', accDep: '3.8.3', expense: '6.5.2' },
};
const GAIN_ACCOUNT = '7.6.3.1';         // Ganhos em investimentos de capital — alienação
const LOSS_SALE_ACCOUNT = '6.8.3.1';    // Perdas — alienação
const LOSS_WRITEOFF_ACCOUNT = '6.8.3.2'; // Perdas — abates
const SURPLUS_ACCOUNT = '5.6.2';        // Excedentes de revalorização — outros

/** Data (DATE do Postgres chega como Date local) no formato AAAA-MM-DD. */
const iso = (d: any): string => {
  if (d instanceof Date) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return d ? String(d).slice(0, 10) : '';
};
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const monthEnd = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/**
 * Equipamentos e ativos fixos (imobilizado): ficha, depreciações (quotas constantes, mensais),
 * manutenções, seguros, transferências, abates/alienações e reavaliações, com os respetivos lançamentos.
 */
@Injectable()
export class AssetsService {
  private ready = new Map<string, Promise<void>>();

  constructor(private readonly tenancy: TenancyService, private readonly accounting: AccountingService) { }

  private async ds(companyId: string): Promise<DataSource> {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    if (!this.ready.has(companyId)) {
      this.ready.set(companyId, (async () => {
        await ds.query(`CREATE TABLE IF NOT EXISTS fixed_assets (
          id VARCHAR(40) PRIMARY KEY, code VARCHAR(40) NOT NULL UNIQUE, description VARCHAR(200) NOT NULL,
          category VARCHAR(12) NOT NULL DEFAULT 'TANGIBLE', "assetAccount" VARCHAR(40) NOT NULL, "accDepAccount" VARCHAR(40) NOT NULL,
          "expenseAccount" VARCHAR(40) NOT NULL, "acquisitionDate" DATE NOT NULL, "startDate" DATE NOT NULL,
          cost NUMERIC(18,2) NOT NULL, "residualValue" NUMERIC(18,2) NOT NULL DEFAULT 0, "usefulLifeMonths" INT NOT NULL,
          "accumulatedDepreciation" NUMERIC(18,2) NOT NULL DEFAULT 0, revaluation NUMERIC(18,2) NOT NULL DEFAULT 0,
          location VARCHAR(120), "costCenter" VARCHAR(80), supplier VARCHAR(160), "documentRef" VARCHAR(80), "serialNumber" VARCHAR(80),
          status VARCHAR(12) NOT NULL DEFAULT 'ACTIVE', "disposedAt" DATE, notes TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await ds.query(`CREATE TABLE IF NOT EXISTS asset_events (
          id BIGSERIAL PRIMARY KEY, "assetId" VARCHAR(40) NOT NULL, type VARCHAR(20) NOT NULL, date DATE NOT NULL,
          description TEXT, amount NUMERIC(18,2) NOT NULL DEFAULT 0, data JSONB, period VARCHAR(7),
          "journalEntryId" VARCHAR(80), "createdBy" VARCHAR(80), "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await ds.query(`CREATE INDEX IF NOT EXISTS asset_events_asset ON asset_events ("assetId", type, date)`);
        await ds.query(`CREATE UNIQUE INDEX IF NOT EXISTS asset_events_dep ON asset_events ("assetId", period) WHERE type = 'DEPRECIATION'`);
      })().catch(e => { this.ready.delete(companyId); throw e; }));
    }
    await this.ready.get(companyId);
    return ds;
  }

  private shape(a: any) {
    const cost = Number(a.cost) + Number(a.revaluation || 0);
    const acc = Number(a.accumulatedDepreciation || 0);
    return {
      ...a, cost: Number(a.cost), residualValue: Number(a.residualValue), revaluation: Number(a.revaluation || 0),
      accumulatedDepreciation: acc, grossValue: r2(cost), netBookValue: r2(cost - acc),
      monthlyDepreciation: r2(Math.max(0, cost - Number(a.residualValue)) / Math.max(1, Number(a.usefulLifeMonths))),
      acquisitionDate: iso(a.acquisitionDate), startDate: iso(a.startDate),
      disposedAt: a.disposedAt ? iso(a.disposedAt) : null,
    };
  }

  defaults() { return CATEGORY_ACCOUNTS; }

  async list(companyId: string) {
    const ds = await this.ds(companyId);
    return (await ds.query(`SELECT * FROM fixed_assets ORDER BY code`)).map((a: any) => this.shape(a));
  }

  async get(companyId: string, id: string) {
    const ds = await this.ds(companyId);
    const a = (await ds.query(`SELECT * FROM fixed_assets WHERE id=$1`, [id]))[0];
    if (!a) throw new NotFoundException('Ativo não encontrado.');
    const events = await ds.query(`SELECT *, to_char(date, 'YYYY-MM-DD') AS date FROM asset_events WHERE "assetId"=$1 ORDER BY asset_events.date DESC, id DESC`, [id]);
    return { ...this.shape(a), events };
  }

  private async checkAccounts(companyId: string, codes: string[]) {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    const errors: string[] = [];
    for (const code of codes) {
      const acc = (await ds.query(`SELECT code, name, "allowPosting" FROM accounts WHERE code=$1`, [code]))[0];
      if (!acc) errors.push(`A conta ${code} não existe no plano de contas.`);
      else if (acc.allowPosting === false) errors.push(`A conta ${code} (${acc.name}) é de soma e não aceita lançamentos.`);
    }
    if (errors.length) throw new BadRequestException({ message: 'Contas inválidas.', errors });
  }

  private async journalId(companyId: string) {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    const rows = await ds.query(`SELECT id, type FROM journals`).catch(() => []);
    return (rows.find((j: any) => j.type === 'OPERATIONS') || rows.find((j: any) => j.type === 'GENERAL') || rows[0])?.id;
  }

  private async post(companyId: string, date: string, description: string, reference: string, sourceDocument: string, lines: { account: string; debit: number; credit: number; text: string }[], user: string | null) {
    const clean = lines.filter(l => r2(l.debit) > 0 || r2(l.credit) > 0);
    if (!clean.length) return null;
    return this.accounting.createJournalEntry({
      id: `JE-AST-${Date.now()}-${Math.floor(Math.random() * 1000)}`, companyId, journalId: await this.journalId(companyId),
      date, description, reference, sourceDocument, sourceType: 'ASSET', status: 'POSTED', createdBy: user || 'assets',
      lines: clean.map((l, i) => ({ id: `JL-AST-${Date.now()}-${i}`, accountId: l.account, description: l.text, debit: r2(l.debit), credit: r2(l.credit) })),
    } as any);
  }

  private async event(ds: DataSource, assetId: string, type: string, date: string, description: string, amount: number, data: any, user: string | null, journalEntryId?: string | null, period?: string) {
    await ds.query(`INSERT INTO asset_events ("assetId", type, date, description, amount, data, "journalEntryId", "createdBy", period) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [assetId, type, date, description, r2(amount), data ? JSON.stringify(data) : null, journalEntryId || null, user, period || null]);
  }

  // ---------------------------------------------------------------- ficha

  async save(companyId: string, body: any, user: string | null) {
    const ds = await this.ds(companyId);
    const category: AssetCategory = body?.category === 'INTANGIBLE' ? 'INTANGIBLE' : 'TANGIBLE';
    const d = CATEGORY_ACCOUNTS[category];
    const v = {
      code: String(body?.code || '').trim(), description: String(body?.description || '').trim(), category,
      assetAccount: String(body?.assetAccount || d.asset).trim(), accDepAccount: String(body?.accDepAccount || d.accDep).trim(),
      expenseAccount: String(body?.expenseAccount || d.expense).trim(),
      acquisitionDate: String(body?.acquisitionDate || '').slice(0, 10), startDate: String(body?.startDate || body?.acquisitionDate || '').slice(0, 10),
      cost: r2(body?.cost), residualValue: r2(body?.residualValue), usefulLifeMonths: Math.round(Number(body?.usefulLifeMonths) || 0),
      location: body?.location || null, costCenter: body?.costCenter || null, supplier: body?.supplier || null,
      documentRef: body?.documentRef || null, serialNumber: body?.serialNumber || null, notes: body?.notes || null,
    };
    const errors: string[] = [];
    if (!v.code) errors.push('Indique o código do ativo.');
    if (!v.description) errors.push('Indique a descrição.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.acquisitionDate)) errors.push('Indique a data de aquisição.');
    if (!(v.cost > 0)) errors.push('O custo de aquisição tem de ser maior que zero.');
    if (v.residualValue < 0 || v.residualValue >= v.cost) errors.push('O valor residual tem de ser menor que o custo.');
    if (!(v.usefulLifeMonths > 0)) errors.push('Indique a vida útil (em meses ou anos).');
    if (errors.length) throw new BadRequestException({ message: 'A ficha tem problemas.', errors });
    await this.checkAccounts(companyId, [v.assetAccount, v.accDepAccount, v.expenseAccount]);

    if (body?.id) {
      const current = (await ds.query(`SELECT * FROM fixed_assets WHERE id=$1`, [body.id]))[0];
      if (!current) throw new NotFoundException('Ativo não encontrado.');
      const hasDep = Number(current.accumulatedDepreciation) > 0;
      // Com depreciações lançadas, o custo, as datas e as contas já não se alteram (seriam lançamentos falsos)
      if (hasDep && (r2(current.cost) !== v.cost || iso(current.startDate) !== v.startDate || current.assetAccount !== v.assetAccount || current.accDepAccount !== v.accDepAccount)) {
        throw new BadRequestException('O ativo já tem depreciações lançadas: o custo, a data de início e as contas não podem ser alterados. Use uma reavaliação.');
      }
      await ds.query(`UPDATE fixed_assets SET code=$1, description=$2, category=$3, "assetAccount"=$4, "accDepAccount"=$5, "expenseAccount"=$6,
        "acquisitionDate"=$7, "startDate"=$8, cost=$9, "residualValue"=$10, "usefulLifeMonths"=$11, location=$12, "costCenter"=$13, supplier=$14,
        "documentRef"=$15, "serialNumber"=$16, notes=$17, "updatedAt"=now() WHERE id=$18`,
        [v.code, v.description, v.category, v.assetAccount, v.accDepAccount, v.expenseAccount, v.acquisitionDate, v.startDate, v.cost, v.residualValue,
          v.usefulLifeMonths, v.location, v.costCenter, v.supplier, v.documentRef, v.serialNumber, v.notes, body.id]);
      return this.get(companyId, body.id);
    }

    if ((await ds.query(`SELECT 1 FROM fixed_assets WHERE code=$1`, [v.code])).length) throw new BadRequestException(`Já existe um ativo com o código ${v.code}.`);
    const id = randomUUID();
    await ds.query(`INSERT INTO fixed_assets (id, code, description, category, "assetAccount", "accDepAccount", "expenseAccount", "acquisitionDate", "startDate",
      cost, "residualValue", "usefulLifeMonths", location, "costCenter", supplier, "documentRef", "serialNumber", notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [id, v.code, v.description, v.category, v.assetAccount, v.accDepAccount, v.expenseAccount, v.acquisitionDate, v.startDate, v.cost, v.residualValue,
        v.usefulLifeMonths, v.location, v.costCenter, v.supplier, v.documentRef, v.serialNumber, v.notes]);

    // Opcional: lançar a aquisição (quando não veio de uma fatura de compra já contabilizada)
    let je: any = null;
    if (body?.postAcquisition) {
      const counterpart = String(body?.counterpartAccount || '').trim();
      if (!counterpart) throw new BadRequestException('Indique a conta de contrapartida da aquisição.');
      await this.checkAccounts(companyId, [counterpart]);
      je = await this.post(companyId, v.acquisitionDate, `Aquisição do ativo ${v.code} — ${v.description}`, v.code, `AST-${id}`, [
        { account: v.assetAccount, debit: v.cost, credit: 0, text: `Aquisição ${v.code}` },
        { account: counterpart, debit: 0, credit: v.cost, text: `Aquisição ${v.code}` },
      ], user);
    }
    await this.event(ds, id, 'ACQUISITION', v.acquisitionDate, `Aquisição${v.supplier ? ' — ' + v.supplier : ''}`, v.cost, { documentRef: v.documentRef }, user, je?.id);
    return this.get(companyId, id);
  }

  async remove(companyId: string, id: string) {
    const ds = await this.ds(companyId);
    const a = await this.get(companyId, id);
    if (a.accumulatedDepreciation > 0 || a.events.some((e: any) => e.journalEntryId)) {
      throw new BadRequestException('O ativo tem lançamentos contabilísticos: não pode ser apagado. Use o abate.');
    }
    await ds.query(`DELETE FROM asset_events WHERE "assetId"=$1`, [id]);
    await ds.query(`DELETE FROM fixed_assets WHERE id=$1`, [id]);
    return { ok: true };
  }

  // ---------------------------------------------------------------- depreciações

  /** Quota do mês para um ativo (quotas constantes), sem ultrapassar o valor depreciável. */
  private quota(a: any, period: string): number {
    if (a.status !== 'ACTIVE') return 0;
    const end = monthEnd(period);
    if (iso(a.startDate) > end) return 0;
    const base = Number(a.cost) + Number(a.revaluation || 0) - Number(a.residualValue);
    const left = r2(base - Number(a.accumulatedDepreciation || 0));
    if (left <= 0) return 0;
    const q = r2(base / Math.max(1, Number(a.usefulLifeMonths)));
    return Math.min(q, left);
  }

  /** Pré-visualização (post=false) ou lançamento (post=true) das depreciações de um mês. Idempotente por ativo e mês. */
  async runDepreciation(companyId: string, period: string, post: boolean, user: string | null) {
    if (!/^\d{4}-\d{2}$/.test(String(period || ''))) throw new BadRequestException('Indique o mês no formato AAAA-MM.');
    const ds = await this.ds(companyId);
    const assets = await ds.query(`SELECT * FROM fixed_assets WHERE status='ACTIVE' ORDER BY code`);
    const done = new Set((await ds.query(`SELECT "assetId" FROM asset_events WHERE type='DEPRECIATION' AND period=$1`, [period])).map((r: any) => r.assetId));
    const rows = assets.map((a: any) => ({
      id: a.id, code: a.code, description: a.description, expenseAccount: a.expenseAccount, accDepAccount: a.accDepAccount,
      amount: done.has(a.id) ? 0 : this.quota(a, period), alreadyPosted: done.has(a.id),
    }));
    const toPost = rows.filter((r: any) => r.amount > 0);
    const total = r2(toPost.reduce((s: number, r: any) => s + r.amount, 0));
    if (!post || !toPost.length) return { period, total, rows, posted: false };

    // Um lançamento por mês, agrupado por par de contas
    const groups = new Map<string, { expense: string; accDep: string; amount: number }>();
    for (const r of toPost) {
      const k = `${r.expenseAccount}|${r.accDepAccount}`;
      const g = groups.get(k) || { expense: r.expenseAccount, accDep: r.accDepAccount, amount: 0 };
      g.amount = r2(g.amount + r.amount); groups.set(k, g);
    }
    const lines: any[] = [];
    for (const g of groups.values()) {
      lines.push({ account: g.expense, debit: g.amount, credit: 0, text: `Depreciações ${period}` });
      lines.push({ account: g.accDep, debit: 0, credit: g.amount, text: `Depreciações ${period}` });
    }
    const date = monthEnd(period);
    const je = await this.post(companyId, date, `Depreciações do período ${period}`, `DEP ${period}`, `DEP-${period}-${Date.now()}`, lines, user);
    for (const r of toPost) {
      await ds.query(`UPDATE fixed_assets SET "accumulatedDepreciation" = "accumulatedDepreciation" + $1, "updatedAt"=now() WHERE id=$2`, [r.amount, r.id]);
      await this.event(ds, r.id, 'DEPRECIATION', date, `Depreciação ${period}`, r.amount, null, user, je?.id, period);
    }
    return { period, total, rows, posted: true, journalEntryId: je?.id };
  }

  // ---------------------------------------------------------------- abate / alienação

  async dispose(companyId: string, id: string, body: any, user: string | null) {
    const ds = await this.ds(companyId);
    const a = await this.get(companyId, id);
    if (a.status !== 'ACTIVE') throw new BadRequestException('O ativo já foi abatido.');
    const kind = body?.kind === 'SALE' ? 'SALE' : 'WRITE_OFF';
    const date = String(body?.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Indique a data do abate.');
    const proceeds = kind === 'SALE' ? r2(body?.proceeds) : 0;
    const proceedsAccount = String(body?.proceedsAccount || '').trim();
    if (kind === 'SALE' && (!(proceeds > 0) || !proceedsAccount)) throw new BadRequestException('Na alienação indique o valor de venda e a conta de recebimento.');
    const gross = a.grossValue, acc = a.accumulatedDepreciation, nbv = a.netBookValue;
    const result = r2(proceeds - nbv); // >0 ganho, <0 perda
    const lossAccount = kind === 'SALE' ? LOSS_SALE_ACCOUNT : LOSS_WRITEOFF_ACCOUNT;
    await this.checkAccounts(companyId, [a.assetAccount, a.accDepAccount, ...(proceeds > 0 ? [proceedsAccount] : []), result > 0 ? GAIN_ACCOUNT : lossAccount]);

    const text = `${kind === 'SALE' ? 'Alienação' : 'Abate'} ${a.code}`;
    const je = await this.post(companyId, date, `${text} — ${a.description}`, a.code, `AST-${id}-DISP`, [
      { account: a.accDepAccount, debit: acc, credit: 0, text },
      { account: proceedsAccount, debit: proceeds, credit: 0, text },
      { account: lossAccount, debit: result < 0 ? -result : 0, credit: 0, text },
      { account: a.assetAccount, debit: 0, credit: gross, text },
      { account: GAIN_ACCOUNT, debit: 0, credit: result > 0 ? result : 0, text },
    ], user);
    await ds.query(`UPDATE fixed_assets SET status='DISPOSED', "disposedAt"=$1, "updatedAt"=now() WHERE id=$2`, [date, id]);
    await this.event(ds, id, 'DISPOSAL', date, `${kind === 'SALE' ? 'Alienação' : 'Abate'}${body?.reason ? ' — ' + body.reason : ''}`, proceeds,
      { kind, proceeds, proceedsAccount, netBookValue: nbv, result, reason: body?.reason || null }, user, je?.id);
    return this.get(companyId, id);
  }

  // ---------------------------------------------------------------- reavaliação

  async revalue(companyId: string, id: string, body: any, user: string | null) {
    const ds = await this.ds(companyId);
    const a = await this.get(companyId, id);
    if (a.status !== 'ACTIVE') throw new BadRequestException('Só se reavaliam ativos em uso.');
    const date = String(body?.date || '').slice(0, 10);
    const newValue = r2(body?.newValue);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Indique a data da reavaliação.');
    const increase = r2(newValue - a.netBookValue);
    if (!(increase > 0)) throw new BadRequestException(`O novo valor (${newValue}) tem de ser superior ao valor líquido atual (${a.netBookValue}). Perdas de valor registam-se como imparidade.`);
    const surplus = String(body?.surplusAccount || SURPLUS_ACCOUNT).trim();
    await this.checkAccounts(companyId, [a.assetAccount, surplus]);
    const je = await this.post(companyId, date, `Reavaliação do ativo ${a.code} — ${a.description}`, a.code, `AST-${id}-REV-${Date.now()}`, [
      { account: a.assetAccount, debit: increase, credit: 0, text: `Reavaliação ${a.code}` },
      { account: surplus, debit: 0, credit: increase, text: `Reavaliação ${a.code}` },
    ], user);
    // A vida útil remanescente mantém-se; o aumento entra na base depreciável
    await ds.query(`UPDATE fixed_assets SET revaluation = revaluation + $1, "updatedAt"=now() WHERE id=$2`, [increase, id]);
    await this.event(ds, id, 'REVALUATION', date, `Reavaliação${body?.reason ? ' — ' + body.reason : ''}`, increase,
      { previousNetBookValue: a.netBookValue, newValue, surplusAccount: surplus, reason: body?.reason || null }, user, je?.id);
    return this.get(companyId, id);
  }

  // ---------------------------------------------------------------- transferências, manutenções, seguros

  async transfer(companyId: string, id: string, body: any, user: string | null) {
    const ds = await this.ds(companyId);
    const a = await this.get(companyId, id);
    const date = String(body?.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const toLocation = body?.toLocation ?? a.location, toCostCenter = body?.toCostCenter ?? a.costCenter;
    if (toLocation === a.location && toCostCenter === a.costCenter) throw new BadRequestException('Indique um novo local ou centro de custo.');
    await ds.query(`UPDATE fixed_assets SET location=$1, "costCenter"=$2, "updatedAt"=now() WHERE id=$3`, [toLocation || null, toCostCenter || null, id]);
    await this.event(ds, id, 'TRANSFER', date, `Transferência: ${a.location || '—'} → ${toLocation || '—'}`, 0,
      { fromLocation: a.location, toLocation, fromCostCenter: a.costCenter, toCostCenter, responsible: body?.responsible || null, notes: body?.notes || null }, user);
    return this.get(companyId, id);
  }

  async addMaintenance(companyId: string, id: string, body: any, user: string | null) {
    const ds = await this.ds(companyId);
    await this.get(companyId, id);
    const date = String(body?.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !String(body?.description || '').trim()) throw new BadRequestException('Indique a data e a descrição da manutenção.');
    await this.event(ds, id, 'MAINTENANCE', date, String(body.description).trim(), r2(body?.cost),
      { kind: body?.kind === 'CORRECTIVE' ? 'CORRECTIVE' : 'PREVENTIVE', supplier: body?.supplier || null, nextDate: body?.nextDate || null, documentRef: body?.documentRef || null }, user);
    return this.get(companyId, id);
  }

  async addInsurance(companyId: string, id: string, body: any, user: string | null) {
    const ds = await this.ds(companyId);
    await this.get(companyId, id);
    const start = String(body?.startDate || '').slice(0, 10), end = String(body?.endDate || '').slice(0, 10);
    if (!String(body?.insurer || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) {
      throw new BadRequestException('Indique a seguradora e um período válido (início e fim).');
    }
    await this.event(ds, id, 'INSURANCE', start, `Seguro ${body.insurer}${body?.policy ? ' — apólice ' + body.policy : ''}`, r2(body?.premium),
      { insurer: body.insurer, policy: body?.policy || null, startDate: start, endDate: end, insuredValue: r2(body?.insuredValue), premium: r2(body?.premium), coverage: body?.coverage || null }, user);
    return this.get(companyId, id);
  }

  /** Eventos de um tipo, de todos os ativos (para as listas de manutenções, seguros, transferências, abates, reavaliações). */
  async events(companyId: string, type: string) {
    const ds = await this.ds(companyId);
    return ds.query(`SELECT e.*, to_char(e.date, 'YYYY-MM-DD') AS date, a.code, a.description AS "assetDescription" FROM asset_events e JOIN fixed_assets a ON a.id = e."assetId"
      WHERE e.type=$1 ORDER BY e.date DESC, e.id DESC`, [String(type || '').toUpperCase()]);
  }

  // ---------------------------------------------------------------- exploração

  async report(companyId: string) {
    const list = await this.list(companyId);
    const today = new Date().toISOString().slice(0, 10);
    const ds = await this.ds(companyId);
    const insurance = await ds.query(`SELECT "assetId", MAX((data->>'endDate')) AS "endDate" FROM asset_events WHERE type='INSURANCE' GROUP BY "assetId"`);
    const maint = await ds.query(`SELECT "assetId", MIN((data->>'nextDate')) FILTER (WHERE (data->>'nextDate') >= $1) AS "nextDate" FROM asset_events WHERE type='MAINTENANCE' GROUP BY "assetId"`, [today]);
    const rows = list.map((a: any) => ({
      ...a,
      insuranceEnd: insurance.find((i: any) => i.assetId === a.id)?.endDate || null,
      nextMaintenance: maint.find((m: any) => m.assetId === a.id)?.nextDate || null,
    }));
    const active = rows.filter((a: any) => a.status === 'ACTIVE');
    const sum = (k: string) => r2(active.reduce((s: number, a: any) => s + Number(a[k] || 0), 0));
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    return {
      rows,
      totals: { count: active.length, gross: sum('grossValue'), accumulated: sum('accumulatedDepreciation'), net: sum('netBookValue'), monthly: sum('monthlyDepreciation') },
      alerts: {
        insuranceExpiring: rows.filter((a: any) => a.status === 'ACTIVE' && a.insuranceEnd && a.insuranceEnd <= in30).length,
        uninsured: rows.filter((a: any) => a.status === 'ACTIVE' && (!a.insuranceEnd || a.insuranceEnd < today)).length,
        maintenanceDue: rows.filter((a: any) => a.status === 'ACTIVE' && a.nextMaintenance && a.nextMaintenance <= in30).length,
      },
    };
  }
}
