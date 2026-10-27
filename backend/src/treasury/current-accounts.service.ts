import { Injectable, BadRequestException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { SalesDocument } from '../sales/entities/sales-document.entity';
import { PurchaseDocument } from '../purchases/entities/purchase.entity';
import { TreasuryDocument, TreasuryDocumentType } from './entities/treasury.entity';

export type AccountSide = 'CUSTOMER' | 'SUPPLIER';

export interface OpenItem {
  docType: string;
  docNumber: string;
  date: string;
  dueDate: string;
  entityCode: string;
  entityName: string;
  /** Valor com sinal: notas de crédito vêm negativas. */
  total: number;
  paid: number;
  pending: number;
  daysOverdue: number;
  bucket: AgingBucket;
}

export type AgingBucket = 'A_VENCER' | 'D0_30' | 'D31_60' | 'D61_90' | 'D90_MAIS';

export interface AgingRow {
  entityCode: string;
  entityName: string;
  A_VENCER: number;
  D0_30: number;
  D31_60: number;
  D61_90: number;
  D90_MAIS: number;
  total: number;
}

/**
 * Só estes estados contam como documento efectivo / liquidação efectiva.
 * Rascunhos, submetidos e rejeitados não geram dívida nem liquidam nada.
 */
const EFFECTIVE_DOC_STATUS = ['APPROVED', 'POSTED'];
// Recibos/pagamentos feitos pela janela de tesouraria ficam gravados como DRAFT mas já estão
// lançados na contabilidade, por isso só os rejeitados deixam de liquidar.
const IGNORED_RECEIPT_STATUS = ['REJECTED'];

/**
 * Tipos de documento que criam dívida / crédito. VD e FR já nascem liquidados
 * e cotações/encomendas não são documentos financeiros, por isso ficam fora.
 */
const DEBIT_TYPES: Record<AccountSide, string[]> = {
  CUSTOMER: ['FA', 'FT', 'ND'],
  SUPPLIER: ['FC', 'NDC'],
};
const CREDIT_TYPES: Record<AccountSide, string[]> = {
  CUSTOMER: ['NC'],
  SUPPLIER: ['NCC'],
};

/**
 * Venda a pronto com conta de tesouraria: o lançamento debita logo a caixa/banco
 * em vez do cliente, por isso o documento nasce liquidado.
 */
const isPaidOnIssue = (d: { paymentCondition?: string; treasuryAccountId?: string }) =>
  String(d.paymentCondition || '').toUpperCase() === 'PRONTO' && !!d.treasuryAccountId;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();

/** Dias entre duas datas YYYY-MM-DD, sem depender do fuso horário. */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = to.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

function bucketFor(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return 'A_VENCER';
  if (daysOverdue <= 30) return 'D0_30';
  if (daysOverdue <= 60) return 'D31_60';
  if (daysOverdue <= 90) return 'D61_90';
  return 'D90_MAIS';
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class CurrentAccountsService {
  constructor(private readonly tenancyService: TenancyService) { }

  private async ds(companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    if (!cid) throw new BadRequestException('companyId é obrigatório.');
    return { cid, ds: await this.tenancyService.getTenantDataSource(cid) };
  }

  /**
   * Documentos em aberto (pendentes) à data `asOf`.
   * `entity` filtra por código ou nome do cliente/fornecedor.
   */
  async getOpenItems(
    side: AccountSide,
    opts: { companyId?: string; entity?: string; asOf?: string; includeSettled?: boolean } = {},
  ): Promise<OpenItem[]> {
    const { cid, ds } = await this.ds(opts.companyId);
    const asOf = opts.asOf || todayLocal();
    const debitTypes = DEBIT_TYPES[side];
    const creditTypes = CREDIT_TYPES[side];

    // 1) Documentos de origem normalizados
    type Src = { docType: string; docNumber: string; date: string; dueDate: string; code: string; name: string; total: number; paidOnIssue?: boolean };
    let sources: Src[];

    if (side === 'CUSTOMER') {
      const docs = await ds.getRepository(SalesDocument).find({ where: { companyId: cid } });
      sources = docs.map(d => ({
        docType: d.documentType,
        docNumber: d.documentNumber,
        date: d.date,
        dueDate: d.dueDate || d.date,
        code: d.customerId || '',
        name: d.customerName || '',
        total: Number(d.total) || 0,
        status: d.status,
        paidOnIssue: debitTypes.includes(d.documentType) && isPaidOnIssue(d),
      } as any)).filter((d: any) => EFFECTIVE_DOC_STATUS.includes(d.status));
    } else {
      const docs = await ds.getRepository(PurchaseDocument).find({ where: { companyId: cid } });
      sources = docs.map(d => ({
        docType: d.type,
        docNumber: `${d.type} ${d.series}/${d.number}`,
        date: d.date,
        dueDate: d.dueDate || d.date,
        code: d.supplierCode || '',
        name: d.supplierName || '',
        total: Number(d.totalValue) || 0,
        status: d.status,
      } as any)).filter((d: any) => EFFECTIVE_DOC_STATUS.includes(d.status));
    }

    sources = sources.filter(
      s => (debitTypes.includes(s.docType) || creditTypes.includes(s.docType)) && s.date <= asOf,
    );

    if (opts.entity) {
      const q = norm(opts.entity);
      sources = sources.filter(s => norm(s.code) === q || norm(s.name) === q);
    }

    // 2) Liquidações: linhas de recibos (clientes) ou pagamentos (fornecedores)
    const treasury = await ds.getRepository(TreasuryDocument).find({
      where: {
        companyId: cid,
        type: side === 'CUSTOMER' ? TreasuryDocumentType.RECEIPT : TreasuryDocumentType.PAYMENT,
      },
      relations: ['lines'],
    });

    const settled = new Map<string, number>();
    const add = (key: string, v: number) => settled.set(key, (settled.get(key) || 0) + v);
    for (const t of treasury) {
      if (IGNORED_RECEIPT_STATUS.includes(String(t.status))) continue;
      if (t.date > asOf) continue;
      if (t.lines && t.lines.length > 0) {
        for (const l of t.lines) add(norm(l.docNumber), (Number(l.amount) || 0) + (Number(l.discount) || 0));
      } else if (t.relatedDocument) {
        add(norm(t.relatedDocument), Number(t.amount) || 0);
      }
    }

    // 3) Montar itens
    const items: OpenItem[] = [];
    for (const s of sources) {
      const isCredit = creditTypes.includes(s.docType);
      const sign = isCredit ? -1 : 1;
      const total = round2(sign * s.total);
      const paid = s.paidOnIssue ? total : round2(sign * (settled.get(norm(s.docNumber)) || 0));
      const pending = round2(total - paid);
      if (!opts.includeSettled && Math.abs(pending) <= 0.01) continue;
      const daysOverdue = daysBetween(s.dueDate, asOf);
      items.push({
        docType: s.docType,
        docNumber: s.docNumber,
        date: s.date,
        dueDate: s.dueDate,
        entityCode: s.code,
        entityName: s.name,
        total,
        paid,
        pending,
        daysOverdue,
        bucket: bucketFor(daysOverdue),
      });
    }

    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.docNumber.localeCompare(b.docNumber));
  }

  /** Mapa de antiguidade de saldos por entidade, com totais gerais. */
  async getAging(
    side: AccountSide,
    opts: { companyId?: string; asOf?: string } = {},
  ) {
    const asOf = opts.asOf || todayLocal();
    const items = await this.getOpenItems(side, { ...opts, asOf });

    const byEntity = new Map<string, AgingRow>();
    const emptyRow = (code: string, name: string): AgingRow => ({
      entityCode: code, entityName: name, A_VENCER: 0, D0_30: 0, D31_60: 0, D61_90: 0, D90_MAIS: 0, total: 0,
    });

    for (const it of items) {
      const key = it.entityCode || it.entityName;
      let row = byEntity.get(key);
      if (!row) {
        row = emptyRow(it.entityCode, it.entityName);
        byEntity.set(key, row);
      }
      row[it.bucket] = round2(row[it.bucket] + it.pending);
      row.total = round2(row.total + it.pending);
    }

    const rows = [...byEntity.values()].sort((a, b) => b.total - a.total);
    const totals = emptyRow('', 'TOTAL');
    for (const r of rows) {
      totals.A_VENCER = round2(totals.A_VENCER + r.A_VENCER);
      totals.D0_30 = round2(totals.D0_30 + r.D0_30);
      totals.D31_60 = round2(totals.D31_60 + r.D31_60);
      totals.D61_90 = round2(totals.D61_90 + r.D61_90);
      totals.D90_MAIS = round2(totals.D90_MAIS + r.D90_MAIS);
      totals.total = round2(totals.total + r.total);
    }

    return { side, asOf, rows, totals };
  }

  /**
   * Extracto de conta corrente de um cliente/fornecedor: saldo inicial, movimentos do período
   * (documentos + recibos/pagamentos) e saldo acumulado. Cliente: saldo = débito - crédito;
   * fornecedor: saldo = crédito - débito (o que devemos é positivo).
   */
  async getStatement(
    side: AccountSide,
    opts: { companyId?: string; entity: string; name?: string; id?: string; from?: string; to?: string; includeDrafts?: boolean },
  ) {
    if (!opts.entity && !opts.name) throw new BadRequestException('entity é obrigatório.');
    const { cid, ds } = await this.ds(opts.companyId);
    const to = opts.to || todayLocal();
    const from = opts.from || '0000-01-01';
    const debitTypes = DEBIT_TYPES[side];
    const creditTypes = CREDIT_TYPES[side];
    const codeQ = norm(opts.entity);
    const nameQ = norm(opts.name);
    const idQ = norm(opts.id);
    const same = (code: any, name: any) =>
      (!!codeQ && norm(code) === codeQ) || (!!idQ && norm(code) === idQ) || (!!nameQ && norm(name) === nameQ);
    const okStatus = (st: any) => {
      const x = String(st);
      if (EFFECTIVE_DOC_STATUS.includes(x)) return true;
      return !!opts.includeDrafts && (x === 'DRAFT' || x === 'SUBMITTED');
    };

    type Mov = { date: string; order: number; docType: string; docNumber: string; description: string; debit: number; credit: number; draft: boolean };
    const all: Mov[] = [];
    let skippedDrafts = 0;
    const ts = (d: any, fallback: string) => (d?.createdAt ? new Date(d.createdAt).getTime() : new Date(fallback).getTime());

    if (side === 'CUSTOMER') {
      const docs = await ds.getRepository(SalesDocument).find({ where: { companyId: cid } });
      for (const d of docs) {
        if (!same(d.customerId, d.customerName)) continue;
        if (!okStatus(d.status)) { if (String(d.status) !== 'REJECTED' && (debitTypes.includes(d.documentType) || creditTypes.includes(d.documentType))) skippedDrafts++; continue; }
        const isDebit = debitTypes.includes(d.documentType);
        const isCredit = creditTypes.includes(d.documentType);
        if (!isDebit && !isCredit) continue;
        const v = round2(Number(d.total) || 0);
        all.push({ date: String(d.date).slice(0, 10), order: ts(d, d.date), docType: d.documentType, docNumber: d.documentNumber,
          description: isCredit ? 'Nota de crédito' : 'Documento de venda', debit: isDebit ? v : 0, credit: isCredit ? v : 0,
          draft: !EFFECTIVE_DOC_STATUS.includes(String(d.status)) });
        if (isDebit && isPaidOnIssue(d)) {
          all.push({ date: String(d.date).slice(0, 10), order: ts(d, d.date) + 1, docType: d.documentType, docNumber: d.documentNumber,
            description: 'Pagamento a pronto', debit: 0, credit: v, draft: !EFFECTIVE_DOC_STATUS.includes(String(d.status)) });
        }
      }
    } else {
      const docs = await ds.getRepository(PurchaseDocument).find({ where: { companyId: cid } });
      for (const d of docs) {
        if (!same(d.supplierCode, d.supplierName)) continue;
        if (!okStatus(d.status)) { if (String(d.status) !== 'REJECTED' && (debitTypes.includes(d.type) || creditTypes.includes(d.type))) skippedDrafts++; continue; }
        const isCredit = debitTypes.includes(d.type);   // fatura de compra: aumenta a dívida (crédito)
        const isDebit = creditTypes.includes(d.type);   // nota de crédito de compra: reduz a dívida (débito)
        if (!isDebit && !isCredit) continue;
        const v = round2(Number(d.totalValue) || 0);
        all.push({ date: String(d.date).slice(0, 10), order: ts(d, d.date), docType: d.type, docNumber: `${d.type} ${d.series}/${d.number}`,
          description: isDebit ? 'Nota de crédito de compra' : 'Documento de compra', debit: isDebit ? v : 0, credit: isCredit ? v : 0,
          draft: !EFFECTIVE_DOC_STATUS.includes(String(d.status)) });
      }
    }

    const treasury = await ds.getRepository(TreasuryDocument).find({
      where: { companyId: cid, type: side === 'CUSTOMER' ? TreasuryDocumentType.RECEIPT : TreasuryDocumentType.PAYMENT },
      relations: ['lines'],
    });
    for (const t of treasury) {
      const st = String(t.status);
      if (st === 'REJECTED') continue;
      const code = side === 'CUSTOMER' ? (t.customerCode || t.entityCode) : (t.beneficiaryCode || t.entityCode);
      const name = side === 'CUSTOMER' ? (t.customerName || t.entityName) : (t.beneficiaryName || t.entityName);
      if (!same(code, name)) continue;
      const fromLines = (t.lines || []).reduce((a, l) => a + (Number(l.amount) || 0) + (Number(l.discount) || 0), 0);
      const v = round2(fromLines > 0 ? fromLines : Number(t.amount) || 0);
      if (v === 0) continue;
      all.push({ date: String(t.date).slice(0, 10), order: ts(t, t.date), docType: t.docType || (side === 'CUSTOMER' ? 'RE' : 'PAG'),
        docNumber: t.number, description: side === 'CUSTOMER' ? 'Recebimento' : 'Pagamento',
        debit: side === 'CUSTOMER' ? 0 : v, credit: side === 'CUSTOMER' ? v : 0, draft: false });
    }

    const sign = (m: Mov) => (side === 'CUSTOMER' ? m.debit - m.credit : m.credit - m.debit);
    all.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
    let initialBalance = 0;
    for (const m of all) if (m.date < from) initialBalance += sign(m);
    initialBalance = round2(initialBalance);
    let running = initialBalance, totalDebit = 0, totalCredit = 0;
    const movements = all.filter(m => m.date >= from && m.date <= to).map(m => {
      running = round2(running + sign(m));
      totalDebit += m.debit; totalCredit += m.credit;
      return { date: m.date, docType: m.docType, docNumber: m.docNumber,
        description: m.draft ? `${m.description} (Rascunho)` : m.description, debit: m.debit, credit: m.credit, balance: running };
    });
    return { side, from, to, initialBalance, movements, totalDebit: round2(totalDebit), totalCredit: round2(totalCredit), finalBalance: running, skippedDrafts };
  }
}
