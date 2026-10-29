import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { AccountingService } from '../accounting/accounting.service';
import { CurrentAccountsService } from './current-accounts.service';

const r2 = (n: number) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
const iso = (d: any): string => {
  if (!d) return '';
  if (d instanceof Date) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return String(d).slice(0, 10);
};
const today = () => iso(new Date());
const addDays = (date: string, n: number) => { const [y, m, d] = date.split('-').map(Number); return iso(new Date(y, m - 1, d + n)); };
const addMonths = (date: string, n: number) => { const [y, m, d] = date.split('-').map(Number); return iso(new Date(y, m - 1 + n, d)); };
const isDate = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

/** Ciclo de vida de cheques e letras: estados seguintes permitidos. */
const FLOWS: Record<string, Record<string, string[]>> = {
  'CHEQUE:IN': { CARTEIRA: ['DEPOSITADO', 'ANULADO'], DEPOSITADO: ['COBRADO', 'DEVOLVIDO'], DEVOLVIDO: ['CARTEIRA', 'ANULADO'] },
  'CHEQUE:OUT': { EMITIDO: ['ENTREGUE', 'ANULADO'], ENTREGUE: ['PAGO', 'ANULADO'] },
  'LETRA:IN': { CARTEIRA: ['DESCONTADA', 'COBRADA', 'REFORMADA', 'PROTESTADA'], DESCONTADA: ['COBRADA', 'PROTESTADA'], PROTESTADA: ['COBRADA', 'ANULADO'] },
  'LETRA:OUT': { ACEITE: ['PAGA', 'REFORMADA'] },
};
const INITIAL: Record<string, string> = { 'CHEQUE:IN': 'CARTEIRA', 'CHEQUE:OUT': 'EMITIDO', 'LETRA:IN': 'CARTEIRA', 'LETRA:OUT': 'ACEITE' };
/** Estados em que o valor já não está por receber/pagar (não entram na previsão). */
const CLOSED = ['COBRADO', 'PAGO', 'COBRADA', 'PAGA', 'ANULADO', 'REFORMADA', 'DESCONTADA'];
export const STATUS_LABEL: Record<string, string> = {
  CARTEIRA: 'Em carteira', DEPOSITADO: 'Depositado', COBRADO: 'Cobrado', DEVOLVIDO: 'Devolvido', ANULADO: 'Anulado',
  EMITIDO: 'Emitido', ENTREGUE: 'Entregue', PAGO: 'Pago', DESCONTADA: 'Descontada', COBRADA: 'Cobrada',
  REFORMADA: 'Reformada', PROTESTADA: 'Protestada', ACEITE: 'Aceite', PAGA: 'Paga',
};

/**
 * Caixas e bancos (fichas ligadas a contas do plano: o saldo e os movimentos vêm da contabilidade),
 * transferências entre eles, carteira de cheques e letras, e tesouraria previsional.
 */
@Injectable()
export class TreasuryRegistryService {
  private ready = new Map<string, Promise<void>>();

  constructor(
    private readonly tenancy: TenancyService,
    private readonly accounting: AccountingService,
    private readonly currentAccounts: CurrentAccountsService,
  ) { }

  cid(c?: string) {
    const id = c || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return id;
  }

  private async ds(cid: string): Promise<DataSource> {
    const ds = await this.tenancy.getTenantDataSource(cid);
    if (!this.ready.has(cid)) {
      this.ready.set(cid, (async () => {
        await ds.query(`CREATE TABLE IF NOT EXISTS treasury_accounts (
          id VARCHAR(40) PRIMARY KEY, type VARCHAR(10) NOT NULL, code VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL,
          "accountingAccount" VARCHAR(30) NOT NULL, currency VARCHAR(5) NOT NULL DEFAULT 'MZN',
          "bankName" VARCHAR(120), branch VARCHAR(120), "accountNumber" VARCHAR(60), nib VARCHAR(40), iban VARCHAR(50), swift VARCHAR(20),
          responsible VARCHAR(120), "minBalance" NUMERIC(18,2), notes TEXT, active BOOLEAN NOT NULL DEFAULT TRUE,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await ds.query(`CREATE TABLE IF NOT EXISTS treasury_transfers (
          id VARCHAR(40) PRIMARY KEY, date DATE NOT NULL, "fromId" VARCHAR(40) NOT NULL, "toId" VARCHAR(40) NOT NULL,
          amount NUMERIC(18,2) NOT NULL, description VARCHAR(250), "journalEntryId" VARCHAR(60), "createdBy" VARCHAR(80),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await ds.query(`CREATE TABLE IF NOT EXISTS treasury_instruments (
          id VARCHAR(40) PRIMARY KEY, kind VARCHAR(10) NOT NULL, direction VARCHAR(4) NOT NULL, number VARCHAR(60) NOT NULL,
          "entityName" VARCHAR(160), "entityCode" VARCHAR(40), "bankName" VARCHAR(120), "treasuryAccountId" VARCHAR(40),
          amount NUMERIC(18,2) NOT NULL, "issueDate" DATE NOT NULL, "dueDate" DATE NOT NULL, status VARCHAR(15) NOT NULL,
          "documentRef" VARCHAR(80), notes TEXT, "replacedById" VARCHAR(40), "replacesId" VARCHAR(40), history JSONB NOT NULL DEFAULT '[]',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await ds.query(`CREATE INDEX IF NOT EXISTS treasury_instruments_due ON treasury_instruments (kind, status, "dueDate")`);
        await ds.query(`CREATE TABLE IF NOT EXISTS treasury_forecast_items (
          id VARCHAR(40) PRIMARY KEY, date DATE NOT NULL, description VARCHAR(200) NOT NULL, direction VARCHAR(4) NOT NULL,
          amount NUMERIC(18,2) NOT NULL, recurrence VARCHAR(10) NOT NULL DEFAULT 'NONE', "endDate" DATE, category VARCHAR(60),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
      })().catch(e => { this.ready.delete(cid); throw e; }));
    }
    await this.ready.get(cid);
    return ds;
  }

  // ======================= CAIXAS E BANCOS =======================

  /** Saldos (débito − crédito) por código de conta, incluindo as subcontas, até uma data. */
  private async balanceOf(ds: DataSource, code: string, upTo?: string, from?: string) {
    const params: any[] = [code, code + '.%'];
    let where = `e.status = 'POSTED' AND (l."accountCode" = $1 OR l."accountCode" LIKE $2)`;
    if (from) { params.push(from); where += ` AND e.date >= $${params.length}`; }
    if (upTo) { params.push(upTo); where += ` AND e.date <= $${params.length}`; }
    const [r] = await ds.query(`SELECT COALESCE(SUM(CAST(l.debit AS decimal)),0) AS d, COALESCE(SUM(CAST(l.credit AS decimal)),0) AS c, MAX(e.date)::text AS last
      FROM journal_lines l JOIN journal_entries e ON e.id = l."journalEntryId" WHERE ${where}`, params);
    return { debit: r2(r.d), credit: r2(r.c), balance: r2(Number(r.d) - Number(r.c)), lastMovement: r.last };
  }

  async listAccounts(c: string | undefined, type?: string) {
    const cid = this.cid(c);
    const ds = await this.ds(cid);
    const rows = await ds.query(`SELECT * FROM treasury_accounts ${type ? 'WHERE type = $1' : ''} ORDER BY type, code`, type ? [type] : []);
    const out: any[] = [];
    for (const a of rows) {
      const b = await this.balanceOf(ds, a.accountingAccount);
      const min = a.minBalance === null ? null : Number(a.minBalance);
      out.push({ ...a, minBalance: min, balance: b.balance, lastMovement: b.lastMovement, belowMinimum: min !== null && a.active && b.balance < min });
    }
    return out;
  }

  /** Contas de movimento do plano em 1.1 (caixa) e 1.2 (bancos) que ainda não têm ficha. */
  async chartCandidates(c?: string) {
    const cid = this.cid(c);
    const ds = await this.ds(cid);
    const used = new Set((await ds.query(`SELECT "accountingAccount" FROM treasury_accounts`)).map((r: any) => r.accountingAccount));
    const accounts = await this.accounting.findAll(cid).catch(() => [] as any[]);
    return (accounts as any[]).filter(a => a.allowPosting !== false && /^1\.[12](\.|$)/.test(a.code) && !used.has(a.code))
      .map(a => ({ code: a.code, name: a.name, type: a.code.startsWith('1.1') ? 'CASH' : 'BANK' }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async importFromChart(c?: string) {
    const cid = this.cid(c);
    const list = await this.chartCandidates(cid);
    const ds = await this.ds(cid);
    const existing = await ds.query(`SELECT code FROM treasury_accounts`);
    const codes = new Set(existing.map((r: any) => r.code));
    let n = { CASH: existing.length, BANK: existing.length };
    const created: any[] = [];
    for (const a of list) {
      let code = '';
      do { n[a.type as 'CASH' | 'BANK']++; code = `${a.type === 'CASH' ? 'CX' : 'BC'}${String(n[a.type as 'CASH' | 'BANK']).padStart(2, '0')}`; } while (codes.has(code));
      codes.add(code);
      created.push(await this.saveAccount(cid, { type: a.type, code, name: a.name, accountingAccount: a.code }));
    }
    return { created: created.length, accounts: created };
  }

  async saveAccount(c: string | undefined, b: any) {
    const cid = this.cid(c);
    const ds = await this.ds(cid);
    const v = {
      type: b?.type === 'BANK' ? 'BANK' : 'CASH', code: String(b?.code || '').trim().toUpperCase(), name: String(b?.name || '').trim(),
      accountingAccount: String(b?.accountingAccount || '').trim(), currency: String(b?.currency || 'MZN').trim().toUpperCase().slice(0, 5),
      bankName: b?.bankName || null, branch: b?.branch || null, accountNumber: b?.accountNumber || null, nib: b?.nib || null,
      iban: b?.iban || null, swift: b?.swift || null, responsible: b?.responsible || null,
      minBalance: b?.minBalance === '' || b?.minBalance === null || b?.minBalance === undefined ? null : r2(b.minBalance),
      notes: b?.notes || null, active: b?.active !== false,
    };
    const errors: string[] = [];
    if (!v.code) errors.push('Indique o código.');
    if (!v.name) errors.push('Indique a descrição.');
    if (!v.accountingAccount) errors.push('Indique a conta do plano (ex.: 1.1.1 para caixa, 1.2.1 para banco).');
    else {
      const acc = (await this.accounting.findAll(cid).catch(() => [] as any[]) as any[]).find(a => a.code === v.accountingAccount);
      if (!acc) errors.push(`A conta ${v.accountingAccount} não existe no plano de contas.`);
      else if (acc.allowPosting === false) errors.push(`A conta ${v.accountingAccount} é de resumo: escolha uma conta de movimento.`);
    }
    const dupCode = (await ds.query(`SELECT id FROM treasury_accounts WHERE code = $1`, [v.code]))[0];
    if (dupCode && dupCode.id !== b?.id) errors.push(`Já existe uma ficha com o código ${v.code}.`);
    const dupAcc = (await ds.query(`SELECT code FROM treasury_accounts WHERE "accountingAccount" = $1 AND id <> $2`, [v.accountingAccount, b?.id || '']))[0];
    if (dupAcc) errors.push(`A conta ${v.accountingAccount} já está ligada à ficha ${dupAcc.code}.`);
    if (errors.length) throw new BadRequestException({ message: 'A ficha tem problemas.', errors });

    const cols = ['type', 'code', 'name', 'accountingAccount', 'currency', 'bankName', 'branch', 'accountNumber', 'nib', 'iban', 'swift', 'responsible', 'minBalance', 'notes', 'active'] as const;
    const vals = cols.map(k => (v as any)[k]);
    if (b?.id) {
      const set = cols.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const r = await ds.query(`UPDATE treasury_accounts SET ${set}, "updatedAt" = now() WHERE id = $${cols.length + 1}`, [...vals, b.id]);
      if (Array.isArray(r) && r[1] === 0) throw new NotFoundException('Ficha não encontrada.');
      return (await this.listAccounts(cid)).find(a => a.id === b.id);
    }
    const id = randomUUID();
    await ds.query(`INSERT INTO treasury_accounts (id, ${cols.map(k => `"${k}"`).join(', ')}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')})`, [id, ...vals]);
    return (await this.listAccounts(cid)).find(a => a.id === id);
  }

  private async account(ds: DataSource, id: string) {
    const a = (await ds.query(`SELECT * FROM treasury_accounts WHERE id = $1`, [id]))[0];
    if (!a) throw new NotFoundException('Caixa/banco não encontrado.');
    return a;
  }

  /** Movimentos da conta (da contabilidade), com saldo inicial e saldo acumulado. */
  async movements(c: string | undefined, id: string, from: string, to: string) {
    const cid = this.cid(c);
    const ds = await this.ds(cid);
    const a = await this.account(ds, id);
    if (!isDate(from) || !isDate(to)) throw new BadRequestException('Indique o período (de/até).');
    const opening = (await this.balanceOf(ds, a.accountingAccount, addDays(from, -1))).balance;
    const rows = await ds.query(`SELECT e.id AS "entryId", e.date::text AS date, e.description AS "entryDescription", e.reference, e."sourceType", e."sourceDocument",
        l.description, CAST(l.debit AS decimal) AS debit, CAST(l.credit AS decimal) AS credit
      FROM journal_lines l JOIN journal_entries e ON e.id = l."journalEntryId"
      WHERE e.status = 'POSTED' AND (l."accountCode" = $1 OR l."accountCode" LIKE $2) AND e.date >= $3 AND e.date <= $4
      ORDER BY e.date, e."createdAt", l.id`, [a.accountingAccount, a.accountingAccount + '.%', from, to]);
    let running = opening;
    const lines = rows.map((r: any) => {
      const debit = r2(r.debit), credit = r2(r.credit);
      running = r2(running + debit - credit);
      return { ...r, description: r.description || r.entryDescription, debit, credit, balance: running };
    });
    return {
      account: a, from, to, opening,
      inflows: r2(lines.reduce((s: number, l: any) => s + l.debit, 0)), outflows: r2(lines.reduce((s: number, l: any) => s + l.credit, 0)),
      closing: running, lines,
    };
  }

  /** Transferência entre caixas/bancos (ex.: depósito do dinheiro da caixa no banco): gera o lançamento. */
  async transfer(c: string | undefined, b: any, user: string | null) {
    const cid = this.cid(c);
    const ds = await this.ds(cid);
    const amount = r2(b?.amount);
    const date = isDate(b?.date) ? b.date : today();
    if (!(amount > 0)) throw new BadRequestException('O valor da transferência tem de ser maior que zero.');
    if (!b?.fromId || !b?.toId || b.fromId === b.toId) throw new BadRequestException('Escolha a origem e o destino (diferentes).');
    const from = await this.account(ds, b.fromId);
    const to = await this.account(ds, b.toId);
    if (!from.active || !to.active) throw new BadRequestException('A origem e o destino têm de estar ativos.');
    const kind = from.type === 'CASH' && to.type === 'BANK' ? 'Depósito' : from.type === 'BANK' && to.type === 'CASH' ? 'Levantamento' : 'Transferência';
    const text = String(b?.description || `${kind} ${from.code} → ${to.code}`).slice(0, 240);
    const id = randomUUID();
    const journals = await ds.query(`SELECT id, type FROM journals`).catch(() => []);
    const journal = journals.find((j: any) => j.type === 'BANK') || journals.find((j: any) => j.type === 'CASH') || journals.find((j: any) => j.type === 'GENERAL') || journals[0];
    const je = await this.accounting.createJournalEntry({
      id: `JE-TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`, companyId: cid, journalId: journal?.id, date,
      description: text, reference: `TRF ${from.code}→${to.code}`, sourceDocument: `TRF-${id}`, sourceType: 'MANUAL', status: 'POSTED', createdBy: user || 'tesouraria',
      lines: [
        { id: `JL-TRF-${Date.now()}-d`, accountId: to.accountingAccount, description: text, debit: amount, credit: 0 },
        { id: `JL-TRF-${Date.now()}-c`, accountId: from.accountingAccount, description: text, debit: 0, credit: amount },
      ],
    } as any);
    await ds.query(`INSERT INTO treasury_transfers (id, date, "fromId", "toId", amount, description, "journalEntryId", "createdBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, date, from.id, to.id, amount, text, je.id, user]);
    return { id, date, amount, description: text, journalEntryId: je.id, from: from.code, to: to.code };
  }

  async transfers(c?: string) {
    const ds = await this.ds(this.cid(c));
    return ds.query(`SELECT t.id, t.date::text AS date, t.amount, t.description, t."journalEntryId", t."createdBy", f.code AS "fromCode", f.name AS "fromName", d.code AS "toCode", d.name AS "toName"
      FROM treasury_transfers t LEFT JOIN treasury_accounts f ON f.id = t."fromId" LEFT JOIN treasury_accounts d ON d.id = t."toId" ORDER BY t.date DESC, t."createdAt" DESC LIMIT 200`);
  }

  // ======================= CHEQUES E LETRAS =======================

  private shapeInstrument(r: any) {
    const due = iso(r.dueDate);
    const days = Math.round((new Date(due + 'T12:00:00').getTime() - new Date(today() + 'T12:00:00').getTime()) / 86400000);
    const flow = FLOWS[`${r.kind}:${r.direction}`] || {};
    return {
      ...r, amount: r2(r.amount), issueDate: iso(r.issueDate), dueDate: due,
      history: typeof r.history === 'string' ? JSON.parse(r.history) : (r.history || []),
      statusLabel: STATUS_LABEL[r.status] || r.status, open: !CLOSED.includes(r.status), daysToDue: days,
      overdue: !CLOSED.includes(r.status) && days < 0, nextStatuses: (flow[r.status] || []).map(s => ({ status: s, label: STATUS_LABEL[s] || s })),
    };
  }

  async listInstruments(c: string | undefined, q: { kind?: string; direction?: string; status?: string }) {
    const ds = await this.ds(this.cid(c));
    const params: any[] = [];
    const where: string[] = [];
    if (q.kind) { params.push(q.kind); where.push(`i.kind = $${params.length}`); }
    if (q.direction) { params.push(q.direction); where.push(`i.direction = $${params.length}`); }
    if (q.status === 'OPEN') where.push(`i.status NOT IN (${CLOSED.map(s => `'${s}'`).join(',')})`);
    else if (q.status) { params.push(q.status); where.push(`i.status = $${params.length}`); }
    const rows = await ds.query(`SELECT i.*, a.code AS "accountCode", a.name AS "accountName" FROM treasury_instruments i LEFT JOIN treasury_accounts a ON a.id = i."treasuryAccountId"
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY i."dueDate", i."createdAt"`, params);
    return rows.map((r: any) => this.shapeInstrument(r));
  }

  async saveInstrument(c: string | undefined, b: any, user: string | null) {
    const cid = this.cid(c);
    const ds = await this.ds(cid);
    const kind = b?.kind === 'LETRA' ? 'LETRA' : 'CHEQUE';
    const direction = b?.direction === 'OUT' ? 'OUT' : 'IN';
    const v = {
      number: String(b?.number || '').trim(), entityName: b?.entityName ? String(b.entityName).trim() : null, entityCode: b?.entityCode || null,
      bankName: b?.bankName || null, treasuryAccountId: b?.treasuryAccountId || null, amount: r2(b?.amount),
      issueDate: isDate(b?.issueDate) ? b.issueDate : today(), dueDate: isDate(b?.dueDate) ? b.dueDate : (isDate(b?.issueDate) ? b.issueDate : today()),
      documentRef: b?.documentRef || null, notes: b?.notes || null,
    };
    const errors: string[] = [];
    if (!v.number) errors.push(`Indique o número ${kind === 'CHEQUE' ? 'do cheque' : 'da letra'}.`);
    if (!(v.amount > 0)) errors.push('O valor tem de ser maior que zero.');
    if (!v.entityName) errors.push(direction === 'IN' ? 'Indique de quem foi recebido (sacador/aceitante).' : 'Indique o beneficiário.');
    if (v.dueDate < v.issueDate) errors.push('A data de vencimento não pode ser anterior à de emissão.');
    if (kind === 'CHEQUE' && direction === 'OUT' && !v.treasuryAccountId) errors.push('Indique o banco (conta) de onde sai o cheque.');
    if (v.treasuryAccountId) await this.account(ds, v.treasuryAccountId);
    const dup = (await ds.query(`SELECT id FROM treasury_instruments WHERE kind = $1 AND direction = $2 AND number = $3 AND COALESCE("bankName",'') = COALESCE($4,'') AND status <> 'ANULADO'`,
      [kind, direction, v.number, v.bankName]))[0];
    if (dup && dup.id !== b?.id) errors.push(`Já existe ${kind === 'CHEQUE' ? 'um cheque' : 'uma letra'} com o número ${v.number}${v.bankName ? ' do ' + v.bankName : ''}.`);
    if (errors.length) throw new BadRequestException({ message: 'O registo tem problemas.', errors });

    if (b?.id) {
      const cur = (await ds.query(`SELECT * FROM treasury_instruments WHERE id = $1`, [b.id]))[0];
      if (!cur) throw new NotFoundException('Registo não encontrado.');
      if (CLOSED.includes(cur.status)) throw new BadRequestException(`Já está ${STATUS_LABEL[cur.status]?.toLowerCase()}: não pode ser alterado.`);
      await ds.query(`UPDATE treasury_instruments SET number=$1, "entityName"=$2, "entityCode"=$3, "bankName"=$4, "treasuryAccountId"=$5, amount=$6, "issueDate"=$7, "dueDate"=$8, "documentRef"=$9, notes=$10, "updatedAt"=now() WHERE id=$11`,
        [v.number, v.entityName, v.entityCode, v.bankName, v.treasuryAccountId, v.amount, v.issueDate, v.dueDate, v.documentRef, v.notes, b.id]);
      return this.getInstrument(ds, b.id);
    }
    const id = randomUUID();
    const status = INITIAL[`${kind}:${direction}`];
    const history = [{ at: new Date().toISOString(), date: v.issueDate, status, user, note: 'Registo' }];
    await ds.query(`INSERT INTO treasury_instruments (id, kind, direction, number, "entityName", "entityCode", "bankName", "treasuryAccountId", amount, "issueDate", "dueDate", status, "documentRef", notes, history, "replacesId")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [id, kind, direction, v.number, v.entityName, v.entityCode, v.bankName, v.treasuryAccountId, v.amount, v.issueDate, v.dueDate, status, v.documentRef, v.notes, JSON.stringify(history), b?.replacesId || null]);
    return this.getInstrument(ds, id);
  }

  private async getInstrument(ds: DataSource, id: string) {
    const r = (await ds.query(`SELECT i.*, a.code AS "accountCode", a.name AS "accountName" FROM treasury_instruments i LEFT JOIN treasury_accounts a ON a.id = i."treasuryAccountId" WHERE i.id = $1`, [id]))[0];
    if (!r) throw new NotFoundException('Registo não encontrado.');
    return this.shapeInstrument(r);
  }

  /**
   * Muda o estado seguindo o ciclo de vida (ex.: cheque em carteira → depositado → cobrado).
   * "Reformada" fecha a letra e cria a nova com o novo vencimento/valor.
   */
  async changeStatus(c: string | undefined, id: string, b: any, user: string | null) {
    const cid = this.cid(c);
    const ds = await this.ds(cid);
    const cur = await this.getInstrument(ds, id);
    const next = String(b?.status || '').toUpperCase();
    if (!cur.nextStatuses.some((s: any) => s.status === next)) {
      throw new BadRequestException(`Não é possível passar de "${cur.statusLabel}" para "${STATUS_LABEL[next] || next}".`);
    }
    const date = isDate(b?.date) ? b.date : today();
    let accountId = cur.treasuryAccountId;
    if (next === 'DEPOSITADO' || next === 'DESCONTADA') {
      if (!b?.treasuryAccountId) throw new BadRequestException('Indique o banco onde foi depositado/descontado.');
      accountId = (await this.account(ds, b.treasuryAccountId)).id;
    }
    let replacement: any = null;
    if (next === 'REFORMADA') {
      if (!isDate(b?.newDueDate) || b.newDueDate <= cur.dueDate) throw new BadRequestException('Na reforma, indique o novo vencimento (posterior ao atual).');
      const newAmount = b?.newAmount !== undefined && b?.newAmount !== '' ? r2(b.newAmount) : cur.amount;
      replacement = await this.saveInstrument(cid, {
        kind: cur.kind, direction: cur.direction, number: String(b?.newNumber || `${cur.number}-R`), entityName: cur.entityName, entityCode: cur.entityCode,
        bankName: cur.bankName, treasuryAccountId: cur.treasuryAccountId, amount: newAmount, issueDate: date, dueDate: b.newDueDate,
        documentRef: cur.documentRef, notes: `Reforma de ${cur.number}`, replacesId: cur.id,
      }, user);
    }
    const history = [...cur.history, { at: new Date().toISOString(), date, status: next, user, note: b?.note || null, accountId }];
    await ds.query(`UPDATE treasury_instruments SET status=$1, "treasuryAccountId"=$2, history=$3, "replacedById"=$4, "updatedAt"=now() WHERE id=$5`,
      [next, accountId, JSON.stringify(history), replacement?.id || cur.replacedById || null, id]);
    return { instrument: await this.getInstrument(ds, id), replacement };
  }

  // ======================= TESOURARIA PREVISIONAL =======================

  async listForecastItems(c?: string) {
    const ds = await this.ds(this.cid(c));
    return (await ds.query(`SELECT * FROM treasury_forecast_items ORDER BY date`)).map((r: any) => ({ ...r, date: iso(r.date), endDate: r.endDate ? iso(r.endDate) : null, amount: r2(r.amount) }));
  }

  async saveForecastItem(c: string | undefined, b: any) {
    const ds = await this.ds(this.cid(c));
    const v = {
      date: isDate(b?.date) ? b.date : '', description: String(b?.description || '').trim(), direction: b?.direction === 'OUT' ? 'OUT' : 'IN',
      amount: r2(b?.amount), recurrence: ['NONE', 'WEEKLY', 'MONTHLY'].includes(b?.recurrence) ? b.recurrence : 'NONE',
      endDate: isDate(b?.endDate) ? b.endDate : null, category: b?.category || null,
    };
    const errors: string[] = [];
    if (!v.date) errors.push('Indique a data.');
    if (!v.description) errors.push('Indique a descrição.');
    if (!(v.amount > 0)) errors.push('O valor tem de ser maior que zero.');
    if (v.endDate && v.endDate < v.date) errors.push('A data final não pode ser anterior à inicial.');
    if (errors.length) throw new BadRequestException({ message: 'A previsão tem problemas.', errors });
    const id = b?.id || randomUUID();
    await ds.query(`INSERT INTO treasury_forecast_items (id, date, description, direction, amount, recurrence, "endDate", category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO UPDATE SET date=$2, description=$3, direction=$4, amount=$5, recurrence=$6, "endDate"=$7, category=$8`,
      [id, v.date, v.description, v.direction, v.amount, v.recurrence, v.endDate, v.category]);
    return (await this.listForecastItems(this.cid(c))).find((x: any) => x.id === id);
  }

  async deleteForecastItem(c: string | undefined, id: string) {
    const ds = await this.ds(this.cid(c));
    await ds.query(`DELETE FROM treasury_forecast_items WHERE id = $1`, [id]);
    return { ok: true };
  }

  /**
   * Previsão: saldo atual das caixas/bancos + recebimentos previstos (documentos de clientes em aberto,
   * cheques e letras a receber, previsões manuais) − pagamentos previstos (fornecedores, cheques e letras a pagar,
   * previsões manuais), por semana ou mês. O que já está vencido entra no primeiro período.
   */
  async forecast(c: string | undefined, horizonDays = 90, granularity: 'WEEK' | 'MONTH' = 'WEEK') {
    const cid = this.cid(c);
    const ds = await this.ds(cid);
    const start = today();
    const end = addDays(start, Math.min(Math.max(Number(horizonDays) || 90, 7), 730));

    // Saldo inicial: fichas ativas; sem fichas, todas as contas de caixa e bancos do plano
    const accounts = (await this.listAccounts(cid)).filter(a => a.active);
    let opening = 0;
    if (accounts.length) opening = r2(accounts.reduce((s, a) => s + a.balance, 0));
    else opening = r2((await this.balanceOf(ds, '1.1')).balance + (await this.balanceOf(ds, '1.2')).balance);

    type Flow = { date: string; direction: 'IN' | 'OUT'; amount: number; source: string; description: string; overdue: boolean };
    const flows: Flow[] = [];
    const push = (date: string, direction: 'IN' | 'OUT', amount: number, source: string, description: string) => {
      if (!(amount > 0)) return;
      const overdue = date < start;
      const d = overdue ? start : date;
      if (d <= end) flows.push({ date: d, direction, amount: r2(amount), source, description, overdue });
    };

    // Cheques e letras em aberto (descontadas já foram recebidas)
    const instruments = (await this.listInstruments(cid, { status: 'OPEN' }));
    const instrumentDocs = new Set(instruments.map(i => String(i.documentRef || '').trim()).filter(Boolean));
    for (const i of instruments) {
      const label = `${i.kind === 'CHEQUE' ? 'Cheque' : 'Letra'} ${i.number} — ${i.entityName || ''}`;
      if (i.direction === 'IN' && i.status === 'DEVOLVIDO') continue; // devolvido: só volta à previsão se for reapresentado
      push(i.dueDate, i.direction, i.amount, i.kind === 'CHEQUE' ? (i.direction === 'IN' ? 'Cheques a receber' : 'Cheques emitidos') : (i.direction === 'IN' ? 'Letras a receber' : 'Letras a pagar'), label);
    }

    // Documentos em aberto (o que já está coberto por um cheque/letra não conta duas vezes)
    for (const [side, dir, source] of [['CUSTOMER', 'IN', 'Clientes'], ['SUPPLIER', 'OUT', 'Fornecedores']] as const) {
      const items = await this.currentAccounts.getOpenItems(side as any, { companyId: cid }).catch(() => []);
      for (const it of items) {
        if (instrumentDocs.has(String(it.docNumber).trim())) continue;
        if (it.pending > 0) push(it.dueDate, dir as any, it.pending, source, `${it.docNumber} — ${it.entityName}`);
        else if (it.pending < 0) push(it.dueDate, dir === 'IN' ? 'OUT' : 'IN', -it.pending, source, `${it.docNumber} — ${it.entityName} (crédito)`);
      }
    }

    // Previsões manuais (com repetição semanal/mensal)
    for (const m of await this.listForecastItems(cid)) {
      const stop = m.endDate && m.endDate < end ? m.endDate : end;
      let d = m.date;
      for (let k = 0; k < 800 && d <= stop; k++) {
        if (d >= start || m.recurrence === 'NONE') push(d, m.direction, m.amount, m.category || 'Previsões manuais', m.description);
        if (m.recurrence === 'NONE') break;
        d = m.recurrence === 'WEEKLY' ? addDays(m.date, 7 * (k + 1)) : addMonths(m.date, k + 1);
      }
    }

    // Períodos
    const periods: { from: string; to: string; label: string; inflows: number; outflows: number; net: number; closing: number; bySource: Record<string, number> }[] = [];
    let p = start;
    while (p <= end) {
      let to: string;
      if (granularity === 'MONTH') { const [y, m] = p.split('-').map(Number); to = iso(new Date(y, m, 0)); }
      else to = addDays(p, 6);
      if (to > end) to = end;
      periods.push({ from: p, to, label: granularity === 'MONTH' ? p.slice(0, 7) : `${p.slice(8, 10)}/${p.slice(5, 7)} – ${to.slice(8, 10)}/${to.slice(5, 7)}`, inflows: 0, outflows: 0, net: 0, closing: 0, bySource: {} });
      p = addDays(to, 1);
    }
    for (const f of flows) {
      const per = periods.find(x => f.date >= x.from && f.date <= x.to);
      if (!per) continue;
      if (f.direction === 'IN') per.inflows = r2(per.inflows + f.amount); else per.outflows = r2(per.outflows + f.amount);
      per.bySource[f.source] = r2((per.bySource[f.source] || 0) + (f.direction === 'IN' ? f.amount : -f.amount));
    }
    let running = opening;
    let minimum = { balance: opening, period: null as string | null };
    for (const per of periods) {
      per.net = r2(per.inflows - per.outflows);
      running = r2(running + per.net);
      per.closing = running;
      if (running < minimum.balance) minimum = { balance: running, period: per.label };
    }
    const sum = (dir: 'IN' | 'OUT', overdue?: boolean) => r2(flows.filter(f => f.direction === dir && (overdue === undefined || f.overdue === overdue)).reduce((s, f) => s + f.amount, 0));
    const bySource: Record<string, { in: number; out: number }> = {};
    for (const f of flows) { bySource[f.source] ||= { in: 0, out: 0 }; bySource[f.source][f.direction === 'IN' ? 'in' : 'out'] = r2(bySource[f.source][f.direction === 'IN' ? 'in' : 'out'] + f.amount); }
    return {
      start, end, granularity, opening, accountsUsed: accounts.length,
      inflows: sum('IN'), outflows: sum('OUT'), overdueIn: sum('IN', true), overdueOut: sum('OUT', true),
      closing: running, minimum, negative: periods.some(x => x.closing < 0), periods, bySource,
      flows: flows.sort((a, b) => a.date.localeCompare(b.date) || a.direction.localeCompare(b.direction)),
    };
  }
}
