import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Between, DataSource, In } from 'typeorm';
import { TenancyService } from '../tenancy/tenancy.service';
import { Company } from '../companies/entities/company.entity';
import { SalesDocument } from '../sales/entities/sales-document.entity';
import { PurchaseDocument } from '../purchases/entities/purchase.entity';
import { TaxRate } from '../taxes/entities/tax-rate.entity';
import { isIssued } from '../common/document-integrity';
import { CurrentAccountsService } from '../treasury/current-accounts.service';

/**
 * Ficheiro mensal de faturas para a AT (comunicação no e-Declaração).
 *
 * A estrutura oficial do SAF-T (Moz) ainda não foi publicada: este ficheiro segue a organização do SAF-T
 * (cabeçalho da empresa + documentos + linhas + totais, nomes dos campos do SAF-T PT/AO) e será ajustado
 * ao layout oficial quando a AT o disponibilizar. Formatos aceites pela AT: XML, XLSX e CSV.
 */
export type FiscalExportKind = 'SALES' | 'PURCHASES';
export type FiscalExportFormat = 'xml' | 'csv';

/** Tipos de documento que contam para o IVA (orçamentos, encomendas e guias ficam de fora). */
const FISCAL_TYPES: Record<FiscalExportKind, string[]> = {
  SALES: ['FA', 'FR', 'VD', 'FT', 'NC', 'ND'],
  PURCHASES: ['FC', 'VDC', 'NCC', 'NDC'],
};
const CREDIT_TYPES = ['NC', 'NCC'];

export const FORMAT_VERSION = 'INVERNO-MZ-1.0';
const PRODUCT = 'Inverno ERP';

interface ExportLine {
  lineNo: number; code: string; description: string; unit: string; quantity: number; unitPrice: number;
  discountPct: number; taxBase: number; taxCode: string; taxRate: number; taxAmount: number; exemptionReason: string; total: number;
}
interface ExportDoc {
  number: string; type: string; series: string; date: string; status: 'N' | 'A'; statusReason: string;
  partyTaxId: string; partyName: string; partyAddress: string; reference: string;
  lines: ExportLine[]; netTotal: number; taxTotal: number; grossTotal: number;
  /** Data e hora da anulação; vendas a dinheiro e faturas-recibo nascem pagas. */
  voidedAt?: string; paidOnIssue?: boolean;
}

/** Faturas (o que gera dívida ou se recebe no ato), notas de crédito e de débito de cada lado. */
const INVOICE_TYPES: Record<FiscalExportKind, string[]> = { SALES: ['FA', 'FR', 'VD', 'FT'], PURCHASES: ['FC', 'VDC'] };
const DEBIT_NOTE_TYPES = ['ND', 'NDC'];
const PAID_ON_ISSUE_TYPES = ['FR', 'VD', 'VDC'];

export type PaymentState = 'PAGO' | 'PARCIAL' | 'POR_PAGAR' | 'NA';
const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n: number) => r2(n).toFixed(2);
const day = (d: any) => (d instanceof Date ? d.toISOString() : String(d || '')).slice(0, 10);
const xml = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const csv = (s: any) => { const v = String(s ?? ''); return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };

@Injectable()
export class FiscalExportService {
  constructor(private readonly main: DataSource, private readonly tenancy: TenancyService, private readonly currentAccounts: CurrentAccountsService) { }

  private period(year: number, month: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Indique um ano e um mês válidos.');
    }
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = day(new Date(Date.UTC(year, month, 0)));
    return { start, end };
  }

  /** Emitidos (aprovados/lançados) e anulados do período; rascunhos e rejeitados nunca emitidos ficam de fora. */
  private counts = (d: { status: any; voidedAt?: Date | null }) => isIssued(d.status) || !!d.voidedAt;

  private lineFrom(no: number, l: { code: string; description: string; unit: string; q: number; p: number; d: number; r: number; taxCode: string }, reasons: Map<string, string>): ExportLine {
    const gross = l.q * l.p;
    const taxBase = r2(gross - gross * (l.d / 100));
    const taxAmount = r2(taxBase * (l.r / 100));
    return {
      lineNo: no, code: l.code, description: l.description, unit: l.unit, quantity: l.q, unitPrice: l.p, discountPct: l.d,
      taxBase, taxCode: l.taxCode, taxRate: l.r, taxAmount,
      exemptionReason: l.r === 0 ? (reasons.get(l.taxCode) || 'Isento') : '',
      total: r2(taxBase + taxAmount),
    };
  }

  /** Totais do ficheiro recalculados a partir das linhas, como na emissão. */
  private totals(doc: Omit<ExportDoc, 'netTotal' | 'taxTotal' | 'grossTotal'>): ExportDoc {
    const netTotal = r2(doc.lines.reduce((s, l) => s + l.taxBase, 0));
    const taxTotal = r2(doc.lines.reduce((s, l) => s + l.taxAmount, 0));
    return { ...doc, netTotal, taxTotal, grossTotal: r2(netTotal + taxTotal) };
  }

  private async load(ds: DataSource, kind: FiscalExportKind, start: string, end: string): Promise<ExportDoc[]> {
    const taxes = await ds.getRepository(TaxRate).find().catch(() => [] as TaxRate[]);
    const reasons = new Map(taxes.map(t => [String(t.code), String(t.description || '')]));
    const types = FISCAL_TYPES[kind];

    if (kind === 'SALES') {
      const docs = await ds.getRepository(SalesDocument).find({
        where: { documentType: In(types), date: Between(start, end) }, relations: ['lines'], order: { documentType: 'ASC', series: 'ASC', seriesNumber: 'ASC' },
      });
      return docs.filter(this.counts).map(d => this.totals({
        number: d.documentNumber, type: d.documentType, series: d.series || '', date: day(d.date),
        status: d.voidedAt ? 'A' : 'N', statusReason: d.voidedAt ? (d.statusNotes || '') : '',
        voidedAt: d.voidedAt ? new Date(d.voidedAt).toISOString() : undefined, paidOnIssue: PAID_ON_ISSUE_TYPES.includes(d.documentType),
        partyTaxId: d.customerNif || '', partyName: d.customerName || '', partyAddress: d.customerAddress || '', reference: '',
        lines: (d.lines || []).map((l, i) => this.lineFrom(i + 1, {
          code: l.articleCode, description: l.articleName, unit: '', q: +l.quantity || 0, p: +l.unitPrice || 0, d: +l.discount || 0, r: +l.ivaRate || 0,
          taxCode: String(l.ivaCode || ''),
        }, reasons)),
      }));
    }

    const docs = await ds.getRepository(PurchaseDocument).find({
      where: { type: In(types), date: Between(start, end) }, relations: ['lines'], order: { type: 'ASC', series: 'ASC', number: 'ASC' },
    });
    return docs.filter(this.counts).map(d => this.totals({
      number: `${d.type} ${d.series}/${d.number}`, type: d.type, series: d.series || '', date: day(d.date),
      status: d.voidedAt ? 'A' : 'N', statusReason: d.voidedAt ? (d.statusNotes || '') : '',
      voidedAt: d.voidedAt ? new Date(d.voidedAt).toISOString() : undefined, paidOnIssue: PAID_ON_ISSUE_TYPES.includes(d.type),
      partyTaxId: d.supplierNif || '', partyName: d.supplierName || '', partyAddress: d.supplierAddress || '', reference: d.reference || '',
      lines: (d.lines || []).map((l, i) => this.lineFrom(i + 1, {
        code: l.articleCode, description: l.description || l.articleName, unit: l.unit || '', q: +l.quantity || 0, p: +l.unitPrice || 0, d: +l.discount || 0, r: +l.taxRate || 0,
        taxCode: String(l.taxCode || ''),
      }, reasons)),
    }));
  }

  /**
   * Mapa de documentos fiscais de um período (Despacho do Ministro das Finanças de 22/12/2011, n.º 10, g) e h)):
   * faturas emitidas, pagas e anuladas e notas de crédito e de débito, com os valores e o estado de pagamento.
   * O pago vem das contas-correntes (recibos/pagamentos que liquidam cada documento).
   */
  async listing(companyId: string, kind: FiscalExportKind, from: string, to: string) {
    if (!FISCAL_TYPES[kind]) throw new BadRequestException('Escolha vendas ou compras.');
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso.test(String(from)) || !iso.test(String(to)) || from > to) throw new BadRequestException('Indique um período válido (de … até …).');
    const company = await this.main.getRepository(Company).findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');

    const ds = await this.tenancy.getTenantDataSource(companyId);
    const docs = await this.load(ds, kind, from, to);
    const open = await this.currentAccounts.getOpenItems(kind === 'SALES' ? 'CUSTOMER' : 'SUPPLIER', { companyId, includeSettled: true });
    const byNumber = new Map(open.map(o => [norm(o.docNumber), o]));

    const rows = docs.map(d => {
      let paid = 0, pending = 0, payment: PaymentState = 'NA';
      if (d.status === 'N' && !CREDIT_TYPES.includes(d.type)) {
        const o = byNumber.get(norm(d.number));
        if (d.paidOnIssue) paid = d.grossTotal;
        else if (o) paid = Math.max(0, Math.min(d.grossTotal, r2(o.paid)));
        pending = r2(d.grossTotal - paid);
        payment = pending <= 0.01 ? 'PAGO' : paid > 0.01 ? 'PARCIAL' : 'POR_PAGAR';
      }
      return {
        number: d.number, type: d.type, date: d.date, partyName: d.partyName, partyTaxId: d.partyTaxId, reference: d.reference,
        netTotal: d.netTotal, taxTotal: d.taxTotal, grossTotal: d.grossTotal,
        state: d.status === 'A' ? 'ANULADO' : 'EMITIDO', voidReason: d.statusReason, voidedAt: d.voidedAt || null,
        paid, pending, payment,
      };
    });

    const group = (pick: (r: typeof rows[number]) => boolean) => {
      const g = rows.filter(pick);
      return { count: g.length, total: r2(g.reduce((s, r) => s + r.grossTotal, 0)) };
    };
    const invoices = rows.filter(r => r.state === 'EMITIDO' && INVOICE_TYPES[kind].includes(r.type));
    const summary = {
      invoices: { ...group(r => r.state === 'EMITIDO' && INVOICE_TYPES[kind].includes(r.type)),
        paid: r2(invoices.reduce((s, r) => s + r.paid, 0)), pending: r2(invoices.reduce((s, r) => s + r.pending, 0)),
        paidCount: invoices.filter(r => r.payment === 'PAGO').length },
      voided: group(r => r.state === 'ANULADO'),
      creditNotes: group(r => r.state === 'EMITIDO' && CREDIT_TYPES.includes(r.type)),
      debitNotes: group(r => r.state === 'EMITIDO' && DEBIT_NOTE_TYPES.includes(r.type)),
    };
    return { company: { name: company.name, nif: company.nif || '' }, kind, from, to, rows, summary };
  }

  /** Resumo do mês (para o ecrã) e ficheiro no formato pedido. */
  async export(companyId: string, kind: FiscalExportKind, year: number, month: number, format: FiscalExportFormat) {
    if (!FISCAL_TYPES[kind]) throw new BadRequestException('Escolha vendas ou compras.');
    if (format !== 'xml' && format !== 'csv') throw new BadRequestException('Formato não suportado (use XML ou CSV).');
    const { start, end } = this.period(year, month);
    const company = await this.main.getRepository(Company).findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    if (!company.nif) throw new BadRequestException('A empresa não tem NUIT. Preencha o NUIT nos dados da empresa antes de exportar.');

    const ds = await this.tenancy.getTenantDataSource(companyId);
    const docs = await this.load(ds, kind, start, end);
    const valid = docs.filter(d => d.status === 'N');
    const sign = (d: ExportDoc) => (CREDIT_TYPES.includes(d.type) ? -1 : 1);
    const summary = {
      documents: docs.length, voided: docs.length - valid.length,
      netTotal: r2(valid.reduce((s, d) => s + sign(d) * d.netTotal, 0)),
      taxTotal: r2(valid.reduce((s, d) => s + sign(d) * d.taxTotal, 0)),
      grossTotal: r2(valid.reduce((s, d) => s + sign(d) * d.grossTotal, 0)),
      withoutTaxId: valid.filter(d => !d.partyTaxId).length,
    };

    const nuit = String(company.nif).replace(/\s/g, '');
    const fileName = `${kind === 'SALES' ? 'Faturas_Emitidas' : 'Faturas_Recebidas'}_${nuit}_${year}${String(month).padStart(2, '0')}.${format}`;
    const content = format === 'xml'
      ? this.toXml(company, kind, start, end, docs)
      : this.toCsv(docs);
    return { fileName, mimeType: format === 'xml' ? 'application/xml' : 'text/csv', content, summary, period: { start, end }, formatVersion: FORMAT_VERSION };
  }

  private toXml(c: Company, kind: FiscalExportKind, start: string, end: string, docs: ExportDoc[]): string {
    const valid = docs.filter(d => d.status === 'N');
    // Como no SAF-T: nas vendas as faturas vão a crédito e as notas de crédito a débito; nas compras ao contrário.
    // Os totais são sem IVA e sem anulados.
    const invoicesSide = kind === 'SALES' ? 'CreditAmount' : 'DebitAmount';
    const notesSide = kind === 'SALES' ? 'DebitAmount' : 'CreditAmount';
    const invoices = valid.filter(d => !CREDIT_TYPES.includes(d.type)).reduce((s, d) => s + d.netTotal, 0);
    const notes = valid.filter(d => CREDIT_TYPES.includes(d.type)).reduce((s, d) => s + d.netTotal, 0);
    const debit = kind === 'SALES' ? notes : invoices;
    const credit = kind === 'SALES' ? invoices : notes;
    const party = kind === 'SALES' ? 'Customer' : 'Supplier';
    const section = kind === 'SALES' ? 'SalesInvoices' : 'PurchaseInvoices';
    const out: string[] = [];
    out.push('<?xml version="1.0" encoding="UTF-8"?>');
    out.push(`<AuditFile formatVersion="${FORMAT_VERSION}">`);
    out.push('  <Header>');
    out.push(`    <AuditFileVersion>${FORMAT_VERSION}</AuditFileVersion>`);
    out.push(`    <CompanyID>${xml(c.legalId || c.nif)}</CompanyID>`);
    out.push(`    <TaxRegistrationNumber>${xml(String(c.nif).replace(/\s/g, ''))}</TaxRegistrationNumber>`);
    out.push('    <TaxAccountingBasis>F</TaxAccountingBasis>');
    out.push(`    <CompanyName>${xml(c.name)}</CompanyName>`);
    out.push('    <CompanyAddress>');
    out.push(`      <AddressDetail>${xml(c.address || '')}</AddressDetail>`);
    out.push(`      <City>${xml(c.city || c.location || '')}</City>`);
    out.push('      <Country>MZ</Country>');
    out.push('    </CompanyAddress>');
    out.push(`    <FiscalYear>${start.slice(0, 4)}</FiscalYear>`);
    out.push(`    <StartDate>${start}</StartDate>`);
    out.push(`    <EndDate>${end}</EndDate>`);
    out.push(`    <CurrencyCode>${xml(c.currency || 'MZN')}</CurrencyCode>`);
    out.push(`    <DateCreated>${day(new Date())}</DateCreated>`);
    out.push('    <TaxEntity>Global</TaxEntity>');
    out.push(`    <ProductID>${PRODUCT}</ProductID>`);
    out.push(`    <ProductVersion>${FORMAT_VERSION}</ProductVersion>`);
    out.push('  </Header>');
    out.push('  <SourceDocuments>');
    out.push(`    <${section}>`);
    out.push(`      <NumberOfEntries>${docs.length}</NumberOfEntries>`);
    out.push(`      <TotalDebit>${money(debit)}</TotalDebit>`);
    out.push(`      <TotalCredit>${money(credit)}</TotalCredit>`);
    for (const d of docs) {
      const amountTag = CREDIT_TYPES.includes(d.type) ? notesSide : invoicesSide;
      out.push('      <Invoice>');
      out.push(`        <InvoiceNo>${xml(d.number)}</InvoiceNo>`);
      out.push('        <DocumentStatus>');
      out.push(`          <InvoiceStatus>${d.status}</InvoiceStatus>`);
      if (d.statusReason) out.push(`          <Reason>${xml(d.statusReason)}</Reason>`);
      out.push('        </DocumentStatus>');
      out.push(`        <InvoiceDate>${d.date}</InvoiceDate>`);
      out.push(`        <InvoiceType>${xml(d.type)}</InvoiceType>`);
      out.push(`        <Series>${xml(d.series)}</Series>`);
      if (d.reference) out.push(`        <Reference>${xml(d.reference)}</Reference>`);
      out.push(`        <${party}TaxID>${xml(d.partyTaxId)}</${party}TaxID>`);
      out.push(`        <${party}Name>${xml(d.partyName)}</${party}Name>`);
      if (d.partyAddress) out.push(`        <${party}Address>${xml(d.partyAddress)}</${party}Address>`);
      for (const l of d.lines) {
        out.push('        <Line>');
        out.push(`          <LineNumber>${l.lineNo}</LineNumber>`);
        out.push(`          <ProductCode>${xml(l.code)}</ProductCode>`);
        out.push(`          <ProductDescription>${xml(l.description)}</ProductDescription>`);
        out.push(`          <Quantity>${l.quantity}</Quantity>`);
        if (l.unit) out.push(`          <UnitOfMeasure>${xml(l.unit)}</UnitOfMeasure>`);
        out.push(`          <UnitPrice>${money(l.unitPrice)}</UnitPrice>`);
        if (l.discountPct) out.push(`          <SettlementAmount>${money(l.quantity * l.unitPrice - l.taxBase)}</SettlementAmount>`);
        out.push(`          <${amountTag}>${money(l.taxBase)}</${amountTag}>`);
        out.push('          <Tax>');
        out.push('            <TaxType>IVA</TaxType>');
        out.push('            <TaxCountryRegion>MZ</TaxCountryRegion>');
        out.push(`            <TaxCode>${xml(l.taxCode || (l.taxRate ? 'NOR' : 'ISE'))}</TaxCode>`);
        out.push(`            <TaxPercentage>${money(l.taxRate)}</TaxPercentage>`);
        out.push(`            <TaxAmount>${money(l.taxAmount)}</TaxAmount>`);
        out.push('          </Tax>');
        if (l.exemptionReason) out.push(`          <TaxExemptionReason>${xml(l.exemptionReason)}</TaxExemptionReason>`);
        out.push('        </Line>');
      }
      out.push('        <DocumentTotals>');
      out.push(`          <TaxPayable>${money(d.taxTotal)}</TaxPayable>`);
      out.push(`          <NetTotal>${money(d.netTotal)}</NetTotal>`);
      out.push(`          <GrossTotal>${money(d.grossTotal)}</GrossTotal>`);
      out.push('        </DocumentTotals>');
      out.push('      </Invoice>');
    }
    out.push(`    </${section}>`);
    out.push('  </SourceDocuments>');
    out.push('</AuditFile>');
    return out.join('\n') + '\n';
  }

  /** Uma linha por linha de documento (o Excel abre com ";" e acentos por causa do BOM). */
  private toCsv(docs: ExportDoc[]): string {
    const head = ['Numero', 'Tipo', 'Serie', 'Data', 'Estado', 'Motivo anulacao', 'NUIT', 'Nome', 'Referencia',
      'Linha', 'Codigo', 'Descricao', 'Unidade', 'Quantidade', 'Preco unitario', 'Desconto %', 'Base tributavel',
      'Codigo IVA', 'Taxa IVA %', 'Valor IVA', 'Motivo isencao', 'Total linha', 'Total base doc', 'Total IVA doc', 'Total doc'];
    const rows = [head.join(';')];
    const num = (n: number) => money(n).replace('.', ',');
    for (const d of docs) {
      const lines = d.lines.length ? d.lines : [null];
      for (const l of lines) {
        rows.push([
          d.number, d.type, d.series, d.date, d.status === 'A' ? 'Anulado' : 'Normal', d.statusReason, d.partyTaxId, d.partyName, d.reference,
          l?.lineNo ?? '', l?.code ?? '', l?.description ?? '', l?.unit ?? '', l ? String(l.quantity).replace('.', ',') : '', l ? num(l.unitPrice) : '',
          l ? String(l.discountPct).replace('.', ',') : '', l ? num(l.taxBase) : '', l?.taxCode ?? '', l ? num(l.taxRate) : '', l ? num(l.taxAmount) : '',
          l?.exemptionReason ?? '', l ? num(l.total) : '', num(d.netTotal), num(d.taxTotal), num(d.grossTotal),
        ].map(csv).join(';'));
      }
    }
    return '﻿' + rows.join('\r\n') + '\r\n';
  }
}
