import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { TenancyService } from '../tenancy/tenancy.service';
import { AccountingService } from './accounting.service';
import { ensurePeriodClosuresTable } from '../periods/period-closures';

const r2 = (n: any) => Math.round((Number(n) || 0) * 100) / 100;
const isDate = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const monthRange = (y: number, m: number) => {
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from, to };
};

const VAT_PAYABLE = '4.4.3.7';
const VAT_RECOVERABLE = '4.4.3.8';
const RESULT_ACCOUNT = '8.8';

/**
 * Ferramentas contabilísticas: apuramento do IVA, fecho mensal, apuramento de resultados do exercício,
 * verificação de integridade e registo de auditoria. Tudo calculado a partir dos lançamentos lançados (POSTED).
 */
@Injectable()
export class AccountingToolsService {
  constructor(private readonly tenancy: TenancyService, private readonly accounting: AccountingService) { }

  private async ds(companyId: string): Promise<DataSource> {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    await ensurePeriodClosuresTable(ds);
    return ds;
  }

  private async journalId(ds: DataSource) {
    const rows = await ds.query(`SELECT id, type FROM journals`).catch(() => []);
    return (rows.find((j: any) => j.type === 'OPERATIONS') || rows.find((j: any) => j.type === 'GENERAL') || rows[0])?.id;
  }

  /** Saldos (débito − crédito) por conta de movimento, num intervalo, excluindo lançamentos de uma origem. */
  private async balances(ds: DataSource, from: string, to: string, like: string[], excludeSourcePrefix?: string) {
    const where = like.map((_, i) => `l."accountCode" LIKE $${i + 3}`).join(' OR ');
    const params: any[] = [from, to, ...like];
    let excl = '';
    if (excludeSourcePrefix) { params.push(`${excludeSourcePrefix}%`); excl = ` AND COALESCE(e."sourceDocument", '') NOT LIKE $${params.length}`; }
    const rows = await ds.query(`SELECT l."accountCode" AS code, MAX(l."accountName") AS name, SUM(CAST(l.debit AS decimal)) AS d, SUM(CAST(l.credit AS decimal)) AS c
      FROM journal_lines l JOIN journal_entries e ON e.id = l."journalEntryId"
      WHERE e.status = 'POSTED' AND e.date >= $1 AND e.date <= $2 AND (${where})${excl}
      GROUP BY l."accountCode" ORDER BY l."accountCode"`, params);
    return rows.map((r: any) => ({ code: r.code, name: r.name, debit: r2(r.d), credit: r2(r.c), balance: r2(Number(r.d) - Number(r.c)) }));
  }

  // ---------------------------------------------------------------- IVA

  async vatSummary(companyId: string, from: string, to: string) {
    if (!isDate(from) || !isDate(to) || from > to) throw new BadRequestException('Indique um período válido (data inicial ≤ data final).');
    const ds = await this.ds(companyId);
    const tag = `IVA-APUR-${from}-${to}`;
    const acc = await this.balances(ds, from, to, ['4.4.3.%'], 'IVA-APUR-');
    const sum = (prefix: string, sign: 1 | -1) => r2(acc.filter((a: any) => a.code.startsWith(prefix)).reduce((s: number, a: any) => s + sign * a.balance, 0));
    const liquidado = sum('4.4.3.3', -1);
    const dedutivel = sum('4.4.3.2', 1);
    const suportado = sum('4.4.3.1', 1);
    const regFavorEmpresa = sum('4.4.3.4.1', 1);
    const regFavorEstado = sum('4.4.3.4.2', -1);
    const result = r2(liquidado + regFavorEstado - dedutivel - regFavorEmpresa);

    // Detalhe por taxa e por documento (documentos aprovados/lançados; notas de crédito a subtrair)
    const sales = await ds.query(`SELECT d.id, d."documentType" AS type, d."documentNumber" AS number, d.date::text AS date, d."customerName" AS entity, d."customerNif" AS nif,
        l."ivaRate" AS rate, SUM(COALESCE(NULLIF(CAST(l.subtotal AS decimal), 0), CAST(l.quantity AS decimal) * CAST(l."unitPrice" AS decimal) * (1 - COALESCE(CAST(l.discount AS decimal), 0) / 100))) AS base,
        SUM(CASE WHEN COALESCE(CAST(l."ivaAmount" AS decimal), 0) = 0 AND COALESCE(CAST(l."ivaRate" AS decimal), 0) > 0 THEN COALESCE(NULLIF(CAST(l.subtotal AS decimal), 0), CAST(l.quantity AS decimal) * CAST(l."unitPrice" AS decimal) * (1 - COALESCE(CAST(l.discount AS decimal), 0) / 100)) * CAST(l."ivaRate" AS decimal) / 100 ELSE COALESCE(CAST(l."ivaAmount" AS decimal), 0) END) AS iva
      FROM sales_documents d JOIN sales_document_lines l ON l."documentId" = d.id
      WHERE d.status IN ('APPROVED','POSTED') AND d.date >= $1 AND d.date <= $2 AND d."documentType" IN ('FA','FR','VD','FS','ND','NC')
      GROUP BY d.id, l."ivaRate" ORDER BY d.date, d."documentNumber"`, [from, to]).catch(() => []);
    const purchases = await ds.query(`SELECT d.id, d.type, (d.type || ' ' || d.series || '/' || d.number) AS number, d.date::text AS date, d."supplierName" AS entity, d."supplierNif" AS nif,
        l."taxRate" AS rate, SUM(CAST(COALESCE(l."totalLiquid", 0) AS decimal)) AS base, SUM(CAST(COALESCE(l."totalValue", 0) AS decimal) - CAST(COALESCE(l."totalLiquid", 0) AS decimal)) AS iva
      FROM purchase_documents d JOIN purchase_document_lines l ON l."documentId" = d.id
      WHERE d.status IN ('APPROVED','POSTED') AND d.date >= $1 AND d.date <= $2 AND d.type IN ('FC','VDC','NDC','NCC')
      GROUP BY d.id, l."taxRate" ORDER BY d.date, d.number`, [from, to]).catch(() => []);
    const signed = (rows: any[], negTypes: string[]) => rows.map(r => {
      const s = negTypes.includes(r.type) ? -1 : 1;
      return { ...r, rate: r2(r.rate), base: r2(s * Number(r.base)), iva: r2(s * Number(r.iva)) };
    });
    const sl = signed(sales, ['NC']), pl = signed(purchases, ['NCC']);
    const byRate = (rows: any[]) => {
      const m = new Map<number, { rate: number; base: number; iva: number }>();
      for (const r of rows) { const g = m.get(r.rate) || { rate: r.rate, base: 0, iva: 0 }; g.base = r2(g.base + r.base); g.iva = r2(g.iva + r.iva); m.set(r.rate, g); }
      return [...m.values()].sort((a, b) => a.rate - b.rate);
    };
    const docs = (rows: any[]) => {
      const m = new Map<string, any>();
      for (const r of rows) { const g = m.get(r.id) || { ...r, base: 0, iva: 0 }; g.base = r2(g.base + r.base); g.iva = r2(g.iva + r.iva); m.set(r.id, g); }
      return [...m.values()].map(({ rate, ...x }) => x);
    };
    const posted = (await ds.query(`SELECT id, date::text AS date FROM journal_entries WHERE "sourceDocument"=$1 AND status='POSTED'`, [tag]))[0] || null;

    return {
      from, to,
      liquidado, dedutivel, suportado, regFavorEmpresa, regFavorEstado,
      result, toPay: result > 0 ? result : 0, toRecover: result < 0 ? -result : 0,
      accounts: acc,
      sales: { byRate: byRate(sl), documents: docs(sl) },
      purchases: { byRate: byRate(pl), documents: docs(pl) },
      settlement: posted,
    };
  }

  /** Apuramento: salda o IVA liquidado, dedutível e regularizações do período contra IVA a pagar / a recuperar. */
  async postVatSettlement(companyId: string, from: string, to: string, user: string | null) {
    const s = await this.vatSummary(companyId, from, to);
    if (s.settlement) throw new BadRequestException(`O apuramento deste período já foi lançado (${s.settlement.id}).`);
    const lines: any[] = [];
    let i = 0;
    for (const a of s.accounts as any[]) {
      if (!(a.code.startsWith('4.4.3.2') || a.code.startsWith('4.4.3.3') || a.code.startsWith('4.4.3.4'))) continue;
      if (Math.abs(a.balance) < 0.01) continue;
      // Inverte o saldo da conta no período
      lines.push({ id: `JL-IVA-${Date.now()}-${i++}`, accountId: a.code, description: `Apuramento IVA ${from} a ${to}`,
        debit: a.balance < 0 ? -a.balance : 0, credit: a.balance > 0 ? a.balance : 0 });
    }
    if (!lines.length) throw new BadRequestException('Não há IVA a apurar neste período.');
    if (s.result > 0) lines.push({ id: `JL-IVA-${Date.now()}-${i++}`, accountId: VAT_PAYABLE, description: 'IVA a pagar', debit: 0, credit: s.result });
    if (s.result < 0) lines.push({ id: `JL-IVA-${Date.now()}-${i++}`, accountId: VAT_RECOVERABLE, description: 'IVA a recuperar', debit: -s.result, credit: 0 });
    const ds = await this.ds(companyId);
    const je = await this.accounting.createJournalEntry({
      id: `JE-IVA-${Date.now()}`, companyId, journalId: await this.journalId(ds), date: to,
      description: `Apuramento do IVA ${from} a ${to}`, reference: `IVA ${from.slice(0, 7)}`, sourceDocument: `IVA-APUR-${from}-${to}`,
      sourceType: 'REGULARIZATION', status: 'POSTED', createdBy: user || 'accounting', lines,
    } as any);
    return { ...(await this.vatSummary(companyId, from, to)), journalEntryId: je.id };
  }

  // ---------------------------------------------------------------- fecho mensal

  async months(companyId: string, year: number) {
    const ds = await this.ds(companyId);
    const closures = await ds.query(`SELECT * FROM period_closures WHERE year=$1`, [year]);
    const fy = (await ds.query(`SELECT * FROM fiscal_years WHERE year=$1`, [year]))[0] || null;
    const out: any[] = [];
    for (let m = 1; m <= 12; m++) {
      const { from, to } = monthRange(year, m);
      const c = closures.find((x: any) => Number(x.month) === m);
      const [entries] = await ds.query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(CASE WHEN ABS(t.d - t.c) > 0.01 THEN 1 ELSE 0 END), 0)::int AS unbalanced FROM (
          SELECT e.id, SUM(CAST(l.debit AS decimal)) AS d, SUM(CAST(l.credit AS decimal)) AS c FROM journal_entries e LEFT JOIN journal_lines l ON l."journalEntryId" = e.id
          WHERE e.status='POSTED' AND e.date >= $1 AND e.date <= $2 GROUP BY e.id) t`, [from, to]);
      const [drafts] = await ds.query(`SELECT
          (SELECT COUNT(*) FROM sales_documents WHERE status IN ('DRAFT','SUBMITTED') AND date >= $1 AND date <= $2)::int AS sales,
          (SELECT COUNT(*) FROM purchase_documents WHERE status IN ('DRAFT','SUBMITTED') AND date >= $1 AND date <= $2)::int AS purchases,
          (SELECT COUNT(*) FROM journal_entries WHERE status='DRAFT' AND date >= $1 AND date <= $2)::int AS entries`, [from, to]).catch(() => [{ sales: 0, purchases: 0, entries: 0 }]);
      out.push({
        year, month: m, from, to, status: c?.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
        closedBy: c?.closedBy || null, closedAt: c?.closedAt || null, reason: c?.reason || null,
        postedEntries: entries?.n || 0, unbalancedEntries: entries?.unbalanced || 0,
        draftSales: drafts?.sales || 0, draftPurchases: drafts?.purchases || 0, draftEntries: drafts?.entries || 0,
      });
    }
    return { year, fiscalYear: fy ? { id: fy.id, status: fy.status, startDate: String(fy.startDate).slice(0, 10), endDate: String(fy.endDate).slice(0, 10) } : null, months: out };
  }

  private async audit(ds: DataSource, companyId: string, year: number, action: string, reason: string, user: string | null, metadata: any) {
    const fy = (await ds.query(`SELECT id FROM fiscal_years WHERE year=$1`, [year]))[0];
    await ds.query(`INSERT INTO period_audit_logs (id, "companyId", "fiscalYearId", action, "performedByUsername", reason, metadata, "createdAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now())`, [companyId, fy?.id || String(year), action, user, reason, JSON.stringify(metadata || {})])
      .catch(async () => {
        // bases sem gen_random_uuid: id gerado aqui
        await ds.query(`INSERT INTO period_audit_logs (id, "companyId", "fiscalYearId", action, "performedByUsername", reason, metadata, "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, now())`, [randomUUID(), companyId, fy?.id || String(year), action, user, reason, JSON.stringify(metadata || {})]);
      });
  }

  async closeMonth(companyId: string, year: number, month: number, reason: string, force: boolean, user: string | null) {
    if (!(month >= 1 && month <= 12)) throw new BadRequestException('Mês inválido.');
    const today = new Date().toISOString().slice(0, 10);
    const { from, to } = monthRange(year, month);
    if (from > today) throw new BadRequestException('Não é possível fechar meses futuros.');
    const ds = await this.ds(companyId);
    const info = (await this.months(companyId, year)).months[month - 1];
    if (info.status === 'CLOSED') throw new BadRequestException('O mês já está fechado.');
    const problems: string[] = [];
    if (info.unbalancedEntries) problems.push(`${info.unbalancedEntries} lançamento(s) desequilibrado(s).`);
    if (info.draftEntries) problems.push(`${info.draftEntries} lançamento(s) em rascunho.`);
    if (info.draftSales || info.draftPurchases) problems.push(`${info.draftSales + info.draftPurchases} documento(s) de venda/compra por aprovar.`);
    if (problems.length && !force) throw new BadRequestException({ message: 'O mês tem pendentes. Resolva-os ou feche mesmo assim.', errors: problems });
    if (info.unbalancedEntries) throw new BadRequestException('Não é possível fechar um mês com lançamentos desequilibrados.');
    await ds.query(`INSERT INTO period_closures (year, month, status, reason, "closedBy", "closedAt") VALUES ($1,$2,'CLOSED',$3,$4,now())
      ON CONFLICT (year, month) DO UPDATE SET status='CLOSED', reason=$3, "closedBy"=$4, "closedAt"=now()`, [year, month, reason || null, user]);
    await this.audit(ds, companyId, year, 'CLOSE_MONTH', reason || `Fecho de ${String(month).padStart(2, '0')}/${year}`, user, { year, month, from, to, pending: problems });
    return (await this.months(companyId, year)).months[month - 1];
  }

  async reopenMonth(companyId: string, year: number, month: number, reason: string, user: string | null) {
    if (!String(reason || '').trim()) throw new BadRequestException('A reabertura exige um motivo (fica no registo de auditoria).');
    const ds = await this.ds(companyId);
    const fy = (await ds.query(`SELECT status FROM fiscal_years WHERE year=$1`, [year]))[0];
    if (fy && String(fy.status).toUpperCase() !== 'OPEN') throw new BadRequestException(`O exercício ${year} está fechado: reabra primeiro o exercício.`);
    await ds.query(`UPDATE period_closures SET status='OPEN', "reopenedBy"=$3, "reopenedAt"=now(), "reopenReason"=$4 WHERE year=$1 AND month=$2`, [year, month, user, reason]);
    await this.audit(ds, companyId, year, 'REOPEN_MONTH', reason, user, { year, month });
    return (await this.months(companyId, year)).months[month - 1];
  }

  // ---------------------------------------------------------------- apuramento de resultados

  async resultsPreview(companyId: string, year: number) {
    const ds = await this.ds(companyId);
    const fy = (await ds.query(`SELECT * FROM fiscal_years WHERE year=$1`, [year]))[0];
    if (!fy) throw new NotFoundException(`Exercício ${year} não encontrado.`);
    const from = String(fy.startDate).slice(0, 10), to = String(fy.endDate).slice(0, 10);
    const tag = `APUR-RES-${year}`;
    const acc = await this.balances(ds, from, to, ['6.%', '7.%'], 'APUR-RES-');
    const expenses = acc.filter((a: any) => a.code.startsWith('6') && Math.abs(a.balance) >= 0.01);
    const revenues = acc.filter((a: any) => a.code.startsWith('7') && Math.abs(a.balance) >= 0.01);
    const totalExpenses = r2(expenses.reduce((s: number, a: any) => s + a.balance, 0));
    const totalRevenues = r2(revenues.reduce((s: number, a: any) => s - a.balance, 0));
    const posted = (await ds.query(`SELECT id, date::text AS date FROM journal_entries WHERE "sourceDocument"=$1 AND status='POSTED'`, [tag]))[0] || null;
    return { year, from, to, expenses, revenues, totalExpenses, totalRevenues, result: r2(totalRevenues - totalExpenses), posted, fiscalYearStatus: fy.status };
  }

  /** Salda as contas das classes 6 e 7 contra 8.8 Resultado líquido do período, com data do fim do exercício. */
  async postResults(companyId: string, year: number, user: string | null) {
    const p = await this.resultsPreview(companyId, year);
    if (p.posted) throw new BadRequestException(`O apuramento de resultados de ${year} já foi lançado (${p.posted.id}).`);
    const lines: any[] = [];
    let i = 0;
    for (const a of [...p.expenses, ...p.revenues]) {
      lines.push({ id: `JL-RES-${Date.now()}-${i++}`, accountId: a.code, description: `Apuramento de resultados ${year}`,
        debit: a.balance < 0 ? -a.balance : 0, credit: a.balance > 0 ? a.balance : 0 });
    }
    if (!lines.length) throw new BadRequestException('Não há gastos nem rendimentos a apurar neste exercício.');
    if (p.result > 0) lines.push({ id: `JL-RES-${Date.now()}-${i++}`, accountId: RESULT_ACCOUNT, description: 'Resultado líquido (lucro)', debit: 0, credit: p.result });
    if (p.result < 0) lines.push({ id: `JL-RES-${Date.now()}-${i++}`, accountId: RESULT_ACCOUNT, description: 'Resultado líquido (prejuízo)', debit: -p.result, credit: 0 });
    const ds = await this.ds(companyId);
    const je = await this.accounting.createJournalEntry({
      id: `JE-RES-${Date.now()}`, companyId, journalId: await this.journalId(ds), date: p.to,
      description: `Apuramento de resultados do exercício ${year}`, reference: `RES ${year}`, sourceDocument: `APUR-RES-${year}`,
      sourceType: 'REGULARIZATION', status: 'POSTED', createdBy: user || 'accounting', lines,
    } as any);
    await this.audit(ds, companyId, year, 'RESULTS', `Apuramento de resultados ${year}`, user, { result: p.result, journalEntryId: je.id });
    return { ...(await this.resultsPreview(companyId, year)), journalEntryId: je.id };
  }

  // ---------------------------------------------------------------- integridade e auditoria

  async integrity(companyId: string) {
    const ds = await this.ds(companyId);
    const unbalanced = await ds.query(`SELECT e.id, e.date::text AS date, e.description, SUM(CAST(l.debit AS decimal)) AS d, SUM(CAST(l.credit AS decimal)) AS c
      FROM journal_entries e LEFT JOIN journal_lines l ON l."journalEntryId" = e.id WHERE e.status='POSTED'
      GROUP BY e.id HAVING ABS(COALESCE(SUM(CAST(l.debit AS decimal)),0) - COALESCE(SUM(CAST(l.credit AS decimal)),0)) > 0.01 ORDER BY e.date LIMIT 50`);
    const summaryLines = await ds.query(`SELECT e.id, e.date::text AS date, l."accountCode" AS code FROM journal_lines l JOIN journal_entries e ON e.id = l."journalEntryId"
      JOIN accounts a ON a.id = l."accountId" WHERE e.status='POSTED' AND a."allowPosting" = false LIMIT 50`);
    const unknownAccounts = await ds.query(`SELECT e.id, e.date::text AS date, l."accountCode" AS code FROM journal_lines l JOIN journal_entries e ON e.id = l."journalEntryId"
      LEFT JOIN accounts a ON a.id = l."accountId" WHERE e.status='POSTED' AND a.id IS NULL LIMIT 50`);
    const inClosedMonths = await ds.query(`SELECT e.id, e.date::text AS date, e.description FROM journal_entries e JOIN period_closures p
      ON p.year = EXTRACT(YEAR FROM e.date) AND p.month = EXTRACT(MONTH FROM e.date) AND p.status='CLOSED'
      WHERE e.status='POSTED' AND p."closedAt" IS NOT NULL AND e."createdAt" > p."closedAt" LIMIT 50`);
    const orphans = await ds.query(`SELECT e.id, e.date::text AS date, e.description, e."sourceType" FROM journal_entries e WHERE e.status='POSTED' AND (
      (e."sourceType"='SALE' AND NOT EXISTS (SELECT 1 FROM sales_documents d WHERE d.id::text = e."sourceDocument")) OR
      (e."sourceType"='PURCHASE' AND NOT EXISTS (SELECT 1 FROM purchase_documents d WHERE d.id::text = e."sourceDocument")) OR
      (e."sourceType" IN ('RECEIPT','PAYMENT') AND NOT EXISTS (SELECT 1 FROM treasury_documents d WHERE d.id::text = e."sourceDocument"))) LIMIT 50`).catch(() => []);
    // Saldos guardados vs. recalculados a partir das linhas (contas de movimento)
    const drift = await ds.query(`SELECT a.code, a.name, a.type, CAST(a.balance AS decimal) AS stored,
        COALESCE(SUM(CASE WHEN a.type IN ('ASSET','EXPENSE') THEN CAST(l.debit AS decimal) - CAST(l.credit AS decimal) ELSE CAST(l.credit AS decimal) - CAST(l.debit AS decimal) END), 0) AS computed
      FROM accounts a LEFT JOIN journal_lines l ON l."accountId" = a.id LEFT JOIN journal_entries e ON e.id = l."journalEntryId" AND e.status='POSTED'
      WHERE a."allowPosting" = true AND (l.id IS NULL OR e.id IS NOT NULL)
      GROUP BY a.id HAVING ABS(CAST(a.balance AS decimal) - COALESCE(SUM(CASE WHEN a.type IN ('ASSET','EXPENSE') THEN CAST(l.debit AS decimal) - CAST(l.credit AS decimal) ELSE CAST(l.credit AS decimal) - CAST(l.debit AS decimal) END), 0)) > 0.01
      ORDER BY a.code LIMIT 50`).catch(() => []);
    const [totals] = await ds.query(`SELECT COALESCE(SUM(CAST(l.debit AS decimal)),0) AS d, COALESCE(SUM(CAST(l.credit AS decimal)),0) AS c
      FROM journal_lines l JOIN journal_entries e ON e.id = l."journalEntryId" WHERE e.status='POSTED'`);
    const checks = [
      { key: 'trial', label: 'Balancete: total a débito = total a crédito', ok: Math.abs(Number(totals.d) - Number(totals.c)) <= 0.01, detail: `Débito ${r2(totals.d)} · Crédito ${r2(totals.c)}`, items: [] as any[] },
      { key: 'unbalanced', label: 'Lançamentos desequilibrados', ok: !unbalanced.length, detail: `${unbalanced.length}`, items: unbalanced.map((x: any) => ({ ...x, d: r2(x.d), c: r2(x.c) })) },
      { key: 'summary', label: 'Linhas em contas de soma (não aceitam lançamentos)', ok: !summaryLines.length, detail: `${summaryLines.length}`, items: summaryLines },
      { key: 'unknown', label: 'Linhas em contas inexistentes', ok: !unknownAccounts.length, detail: `${unknownAccounts.length}`, items: unknownAccounts },
      { key: 'closed', label: 'Lançamentos feitos depois do fecho do mês', ok: !inClosedMonths.length, detail: `${inClosedMonths.length}`, items: inClosedMonths },
      { key: 'orphans', label: 'Lançamentos de documentos que já não existem', ok: !orphans.length, detail: `${orphans.length}`, items: orphans },
      { key: 'drift', label: 'Saldos guardados diferentes dos lançamentos', ok: !drift.length, detail: `${drift.length}`, items: drift.map((x: any) => ({ ...x, stored: r2(x.stored), computed: r2(x.computed) })) },
    ];
    return { checkedAt: new Date().toISOString(), ok: checks.every(c => c.ok), checks };
  }

  async auditLog(companyId: string, page = 1, limit = 50, from?: string, to?: string) {
    const ds = await this.ds(companyId);
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const off = (Math.max(Number(page) || 1, 1) - 1) * lim;
    const f = isDate(from) ? from : '1900-01-01', t = isDate(to) ? `${to} 23:59:59` : '2999-12-31';
    const sql = `
      SELECT 'PERIODO' AS origem, p.action AS acao, COALESCE(p.reason, '') AS descricao, COALESCE(p."performedByUsername", '') AS utilizador, p."createdAt" AS quando, '' AS referencia
        FROM period_audit_logs p WHERE p."createdAt" BETWEEN $1 AND $2
      UNION ALL
      SELECT 'LANCAMENTO', CASE WHEN e.status IN ('CANCELLED','REVERSED','VOIDED') THEN 'ANULACAO' WHEN e."sourceType"='REVERSAL' THEN 'ESTORNO' ELSE 'CRIACAO' END,
             COALESCE(e.description, '') || CASE WHEN e."correctionReason" IS NOT NULL THEN ' — ' || e."correctionReason" ELSE '' END,
             COALESCE(e."updatedBy", e."createdBy", ''), COALESCE(e."updatedAt", e."createdAt"), e.id
        FROM journal_entries e WHERE COALESCE(e."updatedAt", e."createdAt") BETWEEN $1 AND $2`;
    const [count] = await ds.query(`SELECT COUNT(*)::int AS n FROM (${sql}) x`, [f, t]);
    const records = await ds.query(`SELECT * FROM (${sql}) x ORDER BY quando DESC LIMIT ${lim} OFFSET ${off}`, [f, t]);
    return { page: Math.max(Number(page) || 1, 1), limit: lim, total: count?.n || 0, records };
  }
}
