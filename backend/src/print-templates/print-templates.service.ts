import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHmac, randomUUID } from 'crypto';
import { TenancyService } from '../tenancy/tenancy.service';
import { Company } from '../companies/entities/company.entity';
import { SalesDocument } from '../sales/entities/sales-document.entity';
import { PurchaseDocument } from '../purchases/entities/purchase.entity';
import { TreasuryDocument } from '../treasury/entities/treasury.entity';
import { StockDocument } from '../inventory/entities/stock-document.entity';
import { DocumentType } from '../common-entities/entities/document-type.entity';
import {
  MODULES, PrintModule, RenderData, checkRendered, expectedValues, fieldsFor, fmtDate, fmtMoney, fmtQty, renderTemplate, validateTemplate,
} from './template-engine';
import { starterFor } from './starter-template';

export interface PrintTemplate {
  id: string;
  companyId: string;
  module: PrintModule;
  name: string;
  docTypes: string[];
  isDefault: boolean;
  active: boolean;
  html: string;
  css: string;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}

/** Documento gravado, já traduzido para os campos do modelo. */
interface LoadedDoc {
  id: string;
  docType: string;
  numero: string;
  date: string;
  nif: string;
  total: number;
  status: string;
  data: RenderData;
}

const DOC_DESCRIPTIONS: Record<string, string> = {
  FA: 'Fatura', FR: 'Fatura-Recibo', VD: 'Venda a Dinheiro', FT: 'Fatura', NC: 'Nota de Crédito', ND: 'Nota de Débito',
  NE: 'Nota de Encomenda', OR: 'Orçamento', GT: 'Guia de Transporte', FC: 'Fatura de Compra', VDC: 'Venda a Dinheiro (Compra)',
  NCC: 'Nota de Crédito (Compra)', NDC: 'Nota de Débito (Compra)', NEC: 'Nota de Encomenda (Compra)', GRC: 'Guia de Remessa',
  RE: 'Recibo', PA: 'Pagamento', PAG: 'Pagamento', ENT: 'Entrada de Stock', SAI: 'Saída de Stock', TRA: 'Transferência de Stock', INV: 'Inventário',
};
const CONDITIONS: Record<string, string> = { PRONTO: 'Pronto pagamento', PRAZO: 'A prazo' };
const VOIDED = ['REJECTED', 'CANCELLED', 'ANULADO'];
const DRAFTS = ['DRAFT', 'SUBMITTED', 'RASCUNHO'];

/**
 * Modelos de impressão por empresa e módulo (base principal), com histórico de versões e registo de impressões.
 * A impressão de um documento só é entregue depois de comparada com a base de dados.
 */
@Injectable()
export class PrintTemplatesService {
  private ready: Promise<void> | null = null;

  constructor(private readonly main: DataSource, private readonly tenancy: TenancyService) { }

  private ensureTables(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.main.query(`CREATE TABLE IF NOT EXISTS print_templates (
          id VARCHAR(40) PRIMARY KEY, "companyId" VARCHAR(80) NOT NULL, module VARCHAR(20) NOT NULL DEFAULT 'SALES',
          name VARCHAR(120) NOT NULL, "docTypes" TEXT NOT NULL DEFAULT '', "isDefault" BOOLEAN NOT NULL DEFAULT false,
          active BOOLEAN NOT NULL DEFAULT true, html TEXT NOT NULL, css TEXT NOT NULL DEFAULT '', version INT NOT NULL DEFAULT 1,
          "updatedBy" VARCHAR(80), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await this.main.query(`CREATE TABLE IF NOT EXISTS print_template_versions (
          id BIGSERIAL PRIMARY KEY, "templateId" VARCHAR(40) NOT NULL, version INT NOT NULL, name VARCHAR(120),
          "docTypes" TEXT, html TEXT NOT NULL, css TEXT NOT NULL DEFAULT '', "createdBy" VARCHAR(80),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await this.main.query(`CREATE TABLE IF NOT EXISTS print_logs (
          id BIGSERIAL PRIMARY KEY, "companyId" VARCHAR(80), module VARCHAR(20), "documentId" VARCHAR(80), "documentNumber" VARCHAR(80),
          "templateId" VARCHAR(40), version INT, "userName" VARCHAR(80), "controlCode" VARCHAR(20),
          result VARCHAR(10) NOT NULL, reason TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
      })().catch(e => { this.ready = null; throw e; });
    }
    return this.ready;
  }

  private moduleOf(m: any): PrintModule {
    const x = String(m || '').toUpperCase() as PrintModule;
    if (!MODULES.includes(x)) throw new BadRequestException('Módulo inválido (use SALES, PURCHASES, TREASURY ou STOCK).');
    return x;
  }

  private toTemplate(r: any): PrintTemplate {
    return {
      id: r.id, companyId: r.companyId, module: r.module, name: r.name, docTypes: String(r.docTypes || '').split(',').filter(Boolean),
      isDefault: !!r.isDefault, active: !!r.active, html: r.html, css: r.css || '', version: Number(r.version),
      updatedBy: r.updatedBy, updatedAt: r.updatedAt,
    };
  }

  fields(module: any) { return fieldsFor(this.moduleOf(module)); }
  starter(module: any) { return starterFor(this.moduleOf(module)); }
  validate(html: string, css: string, module: any) { return { errors: validateTemplate(html, css, this.moduleOf(module)) }; }

  // ---------------------------------------------------------------- modelos

  async list(companyId: string): Promise<PrintTemplate[]> {
    await this.ensureTables();
    const rows = await this.main.query(`SELECT * FROM print_templates WHERE "companyId"=$1 AND active ORDER BY module, name`, [companyId]);
    return rows.map((r: any) => this.toTemplate(r));
  }

  async get(companyId: string, id: string): Promise<PrintTemplate> {
    await this.ensureTables();
    const r = (await this.main.query(`SELECT * FROM print_templates WHERE id=$1 AND "companyId"=$2`, [id, companyId]))[0];
    if (!r) throw new NotFoundException('Modelo não encontrado.');
    return this.toTemplate(r);
  }

  async save(companyId: string, body: any, user: string | null): Promise<PrintTemplate> {
    await this.ensureTables();
    const module = this.moduleOf(body?.module);
    const name = String(body?.name || '').trim();
    const html = String(body?.html || '');
    const css = String(body?.css || '');
    const docTypes: string[] = Array.isArray(body?.docTypes) ? body.docTypes.map((t: any) => String(t).toUpperCase().trim()).filter(Boolean) : [];
    const fail = (msg: string, errors = [msg]) => new BadRequestException({ message: msg, errors });
    if (!name) throw fail('Indique o nome do modelo.');
    if (!docTypes.length) throw fail('Escolha pelo menos um tipo de documento.');
    const errors = validateTemplate(html, css, module);
    if (errors.length) throw fail('O modelo tem problemas e não foi gravado.', errors);

    const isDefault = !!body?.isDefault;
    let id = body?.id ? String(body.id) : '';
    let version = 1;
    if (id) {
      const current = await this.get(companyId, id);
      if (current.module !== module) throw fail('Não é possível mudar o módulo de um modelo existente.');
      version = current.version + 1;
      await this.main.query(`UPDATE print_templates SET name=$1,"docTypes"=$2,"isDefault"=$3,html=$4,css=$5,version=$6,"updatedBy"=$7,"updatedAt"=now(),active=true WHERE id=$8`,
        [name, docTypes.join(','), isDefault, html, css, version, user, id]);
    } else {
      id = randomUUID();
      await this.main.query(`INSERT INTO print_templates (id,"companyId",module,name,"docTypes","isDefault",html,css,version,"updatedBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9)`,
        [id, companyId, module, name, docTypes.join(','), isDefault, html, css, user]);
    }
    await this.main.query(`INSERT INTO print_template_versions ("templateId",version,name,"docTypes",html,css,"createdBy") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, version, name, docTypes.join(','), html, css, user]);
    if (isDefault) {
      // Só um modelo por defeito por tipo de documento
      for (const o of await this.list(companyId)) {
        if (o.id !== id && o.module === module && o.isDefault && o.docTypes.some(t => docTypes.includes(t))) {
          await this.main.query(`UPDATE print_templates SET "isDefault"=false WHERE id=$1`, [o.id]);
        }
      }
    }
    return this.get(companyId, id);
  }

  async remove(companyId: string, id: string) {
    await this.get(companyId, id);
    await this.main.query(`UPDATE print_templates SET active=false, "isDefault"=false WHERE id=$1`, [id]);
    return { ok: true };
  }

  async versions(companyId: string, id: string) {
    await this.get(companyId, id);
    return this.main.query(`SELECT version, name, "createdBy", "createdAt" FROM print_template_versions WHERE "templateId"=$1 ORDER BY version DESC`, [id]);
  }

  async restore(companyId: string, id: string, version: number, user: string | null) {
    const t = await this.get(companyId, id);
    const v = (await this.main.query(`SELECT * FROM print_template_versions WHERE "templateId"=$1 AND version=$2`, [id, version]))[0];
    if (!v) throw new NotFoundException('Versão não encontrada.');
    return this.save(companyId, { id, module: t.module, name: v.name, docTypes: String(v.docTypes || '').split(',').filter(Boolean), isDefault: t.isDefault, html: v.html, css: v.css }, user);
  }

  async forDocType(companyId: string, module: any, docType: string): Promise<PrintTemplate | null> {
    const m = this.moduleOf(module);
    const all = (await this.list(companyId)).filter(t => t.module === m);
    // Um modelo escolhido para o tipo concreto ganha a um modelo "todos os documentos do módulo" (*)
    const exact = all.filter(t => t.docTypes.includes(String(docType || '').toUpperCase()));
    const wide = all.filter(t => t.docTypes.includes('*'));
    return exact.find(t => t.isDefault) || exact[0] || wide.find(t => t.isDefault) || wide[0] || null;
  }

  // ---------------------------------------------------------------- documentos gravados -> campos

  private companyFields(c: Company): Record<string, string> {
    return {
      'empresa.nome': c.name || '', 'empresa.nif': c.nif || '', 'empresa.morada': c.address || '',
      'empresa.telefone': c.phone || '', 'empresa.email': c.email || '', 'empresa.website': c.website || '',
    };
  }

  private async describe(ds: DataSource, code: string): Promise<string> {
    const dt = await ds.getRepository(DocumentType).findOne({ where: { code } }).catch(() => null);
    return (dt as any)?.description || (dt as any)?.name || DOC_DESCRIPTIONS[code] || code;
  }

  /** Linhas comerciais (vendas/compras): valores da linha e resumo de IVA. */
  private commercialLines(rows: { codigo: string; descricao: string; unidade?: string; q: number; p: number; d: number; r: number; liquid?: number | null; iva?: number | null; total?: number | null }[]) {
    const vals = rows.map(x => {
      const liquid = x.liquid != null ? Number(x.liquid) : x.q * x.p * (1 - x.d / 100);
      const iva = x.iva != null ? Number(x.iva) : liquid * x.r / 100;
      const total = x.total != null ? Number(x.total) : liquid + iva;
      return { ...x, liquid, iva, total };
    });
    const groups = new Map<number, { base: number; valor: number }>();
    for (const v of vals) {
      const g = groups.get(v.r) || { base: 0, valor: 0 };
      g.base += v.liquid; g.valor += v.iva; groups.set(v.r, g);
    }
    return {
      linhas: vals.map(v => ({
        'linha.codigo': v.codigo || '', 'linha.descricao': v.descricao || '', 'linha.unidade': v.unidade || '',
        'linha.quantidade': fmtQty(v.q), 'linha.precoUnitario': fmtMoney(v.p), 'linha.desconto': fmtMoney(v.d),
        'linha.taxaIva': fmtMoney(v.r), 'linha.iva': fmtMoney(v.iva), 'linha.total': fmtMoney(v.total),
      })),
      resumoIva: [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([taxa, g]) => ({
        'iva.taxa': fmtMoney(taxa), 'iva.base': fmtMoney(g.base), 'iva.valor': fmtMoney(g.valor),
      })),
    };
  }

  private async loadDocument(companyId: string, module: PrintModule, id: string, copia: string): Promise<LoadedDoc> {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    const company = await this.main.getRepository(Company).findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const base = this.companyFields(company);
    const notFound = () => new NotFoundException('Documento não encontrado. Grave o documento antes de imprimir.');

    if (module === 'SALES') {
      const d = await ds.getRepository(SalesDocument).findOne({ where: { id }, relations: ['lines'] });
      if (!d) throw notFound();
      const { linhas, resumoIva } = this.commercialLines((d.lines || []).map(l => ({
        codigo: l.articleCode, descricao: l.articleName, q: +l.quantity || 0, p: +l.unitPrice || 0, d: +l.discount || 0, r: +l.ivaRate || 0,
        liquid: l.subtotal, iva: l.ivaAmount, total: l.total,
      })));
      return {
        id: d.id, docType: d.documentType, numero: d.documentNumber, date: d.date, nif: d.customerNif || '', total: +d.total || 0, status: String(d.status),
        data: {
          logoDataUri: company.logoUrl || undefined, linhas, resumoIva,
          doc: {
            ...base, 'entidade.nome': d.customerName || '', 'entidade.nif': d.customerNif || '', 'entidade.morada': d.customerAddress || '',
            'documento.descricao': await this.describe(ds, d.documentType), 'documento.numero': d.documentNumber || '', 'documento.serie': d.series || '',
            'documento.data': fmtDate(d.date), 'documento.vencimento': fmtDate(d.dueDate),
            'documento.condicao': CONDITIONS[String(d.paymentCondition || '').toUpperCase()] || '',
            'documento.observacoes': d.notes || '', 'documento.copia': copia,
            'totais.subtotal': fmtMoney(d.subtotal), 'totais.descontos': fmtMoney(d.discounts), 'totais.iva': fmtMoney(d.totalIva), 'totais.total': fmtMoney(d.total),
          },
        },
      };
    }

    if (module === 'PURCHASES') {
      const d = await ds.getRepository(PurchaseDocument).findOne({ where: { id }, relations: ['lines'] });
      if (!d) throw notFound();
      const numero = `${d.type} ${d.series}/${d.number}`;
      const { linhas, resumoIva } = this.commercialLines((d.lines || []).map(l => ({
        codigo: l.articleCode, descricao: l.articleName || l.description, unidade: l.unit, q: +l.quantity || 0, p: +l.unitPrice || 0,
        d: +l.discount || 0, r: +l.taxRate || 0, liquid: l.totalLiquid, total: l.totalValue,
        iva: l.totalValue != null && l.totalLiquid != null ? Number(l.totalValue) - Number(l.totalLiquid) : null,
      })));
      return {
        id: d.id, docType: d.type, numero, date: d.date, nif: d.supplierNif || '', total: +d.totalValue || 0, status: String(d.status),
        data: {
          logoDataUri: company.logoUrl || undefined, linhas, resumoIva,
          doc: {
            ...base, 'entidade.nome': d.supplierName || '', 'entidade.nif': d.supplierNif || '', 'entidade.morada': d.supplierAddress || '',
            'documento.descricao': await this.describe(ds, d.type), 'documento.numero': numero, 'documento.serie': d.series || '',
            'documento.data': fmtDate(d.date), 'documento.vencimento': fmtDate(d.dueDate),
            'documento.condicao': CONDITIONS[String(d.paymentCondition || '').toUpperCase()] || '', 'documento.referencia': d.reference || '',
            'documento.observacoes': d.notes || '', 'documento.copia': copia,
            'totais.subtotal': fmtMoney(d.merchandiseTotal), 'totais.descontos': fmtMoney(d.discountValue), 'totais.iva': fmtMoney(d.taxTotal), 'totais.total': fmtMoney(d.totalValue),
          },
        },
      };
    }

    if (module === 'TREASURY') {
      const d = await ds.getRepository(TreasuryDocument).findOne({ where: { id }, relations: ['lines'] });
      if (!d) throw notFound();
      const isReceipt = String(d.type).toUpperCase() === 'RECEIPT';
      const entity = (isReceipt ? d.customerName : d.beneficiaryName) || d.entityName || '';
      const lines = d.lines || [];
      const fromLines = lines.reduce((a, l) => a + (+l.amount || 0), 0);
      const total = lines.length ? fromLines : +d.amount || 0;
      const disc = lines.reduce((a, l) => a + (+l.discount || 0), 0);
      const docType = d.docType || (isReceipt ? 'RE' : 'PA');
      return {
        id: d.id, docType, numero: d.number, date: d.date, nif: '', total, status: String(d.status),
        data: {
          logoDataUri: company.logoUrl || undefined, resumoIva: [],
          linhas: lines.map(l => ({
            'linha.documento': `${l.docNumber || ''}`.trim(), 'linha.descricao': l.docType || '',
            'linha.valorOriginal': fmtMoney(l.originalAmount), 'linha.desconto': fmtMoney(l.discount),
            'linha.total': fmtMoney(l.amount), 'linha.pendente': fmtMoney(l.pendingAfter),
          })),
          doc: {
            ...base, 'entidade.nome': entity,
            'documento.descricao': await this.describe(ds, docType), 'documento.numero': d.number || '', 'documento.serie': d.series || '',
            'documento.data': fmtDate(d.date), 'documento.meioPagamento': d.paymentMethod || '', 'documento.referencia': d.relatedDocument || '',
            'documento.observacoes': d.observations || d.description || '', 'documento.copia': copia,
            'totais.descontos': fmtMoney(disc), 'totais.total': fmtMoney(total),
          },
        },
      };
    }

    const d = await ds.getRepository(StockDocument).findOne({ where: { id }, relations: ['lines'] });
    if (!d) throw notFound();
    const numero = `${d.type} ${d.series}/${d.number}`;
    const total = (d.lines || []).reduce((a, l) => a + (+l.total || (+l.quantity || 0) * (+l.unitPrice || 0)), 0);
    return {
      id: d.id, docType: d.type, numero, date: d.date, nif: '', total, status: String(d.status),
      data: {
        logoDataUri: company.logoUrl || undefined, resumoIva: [],
        linhas: (d.lines || []).map(l => ({
          'linha.codigo': l.articleCode || '', 'linha.descricao': l.articleName || l.description || '', 'linha.unidade': l.unit || '',
          'linha.quantidade': fmtQty(l.quantity), 'linha.precoUnitario': fmtMoney(l.unitPrice),
          'linha.total': fmtMoney(l.total != null ? l.total : (+l.quantity || 0) * (+l.unitPrice || 0)),
        })),
        doc: {
          ...base, 'documento.descricao': await this.describe(ds, d.type), 'documento.numero': numero, 'documento.serie': d.series || '',
          'documento.data': fmtDate(d.date), 'documento.armazem': d.warehouse || '', 'documento.observacoes': d.notes || '', 'documento.copia': copia,
        },
      },
    };
  }

  private sampleData(company: Company | null, module: PrintModule): RenderData {
    const c: any = company || {};
    const doc: Record<string, string> = {
      'empresa.nome': c.name || 'Empresa Exemplo, Lda', 'empresa.nif': c.nif || '400000000', 'empresa.morada': c.address || 'Av. Exemplo, Maputo',
      'empresa.telefone': c.phone || '', 'empresa.email': c.email || '', 'empresa.website': c.website || '',
      'entidade.nome': module === 'PURCHASES' ? 'Fornecedor de Exemplo' : 'Cliente de Exemplo', 'entidade.nif': '400111222', 'entidade.morada': 'Rua de Exemplo, Matola',
      'documento.serie': '2026', 'documento.data': '01/01/2026', 'documento.vencimento': '31/01/2026', 'documento.condicao': 'A prazo',
      'documento.referencia': 'REF-001', 'documento.meioPagamento': 'Numerário', 'documento.armazem': 'ARM01',
      'documento.observacoes': 'Observações do documento.', 'documento.copia': 'Original',
    };
    const byModule: Record<PrintModule, [string, string]> = {
      SALES: ['Fatura', 'FA 2026/1'], PURCHASES: ['Fatura de Compra', 'FC 2026/1'], TREASURY: ['Recibo', 'RE 2026/1'], STOCK: ['Entrada de Stock', 'ENT 2026/1'],
    };
    doc['documento.descricao'] = byModule[module][0];
    doc['documento.numero'] = byModule[module][1];
    if (module === 'TREASURY') {
      Object.assign(doc, { 'totais.descontos': fmtMoney(0), 'totais.total': fmtMoney(1740) });
      return {
        logoDataUri: c.logoUrl || undefined, doc, resumoIva: [],
        linhas: [{ 'linha.documento': 'FA 2026/1', 'linha.descricao': 'FA', 'linha.valorOriginal': fmtMoney(1740), 'linha.desconto': fmtMoney(0), 'linha.total': fmtMoney(1740), 'linha.pendente': fmtMoney(0) }],
      };
    }
    const { linhas, resumoIva } = this.commercialLines([
      { codigo: 'A001', descricao: 'Artigo de exemplo', unidade: 'UN', q: 2, p: 500, d: 0, r: 16 },
      { codigo: 'S010', descricao: 'Serviço de exemplo', unidade: 'UN', q: 1, p: 500, d: 0, r: 16 },
    ]);
    Object.assign(doc, { 'totais.subtotal': fmtMoney(1500), 'totais.descontos': fmtMoney(0), 'totais.iva': fmtMoney(240), 'totais.total': fmtMoney(1740) });
    return { logoDataUri: c.logoUrl || undefined, doc, linhas, resumoIva: module === 'STOCK' ? [] : resumoIva };
  }

  /** Código de controlo: assinatura dos valores fiscais gravados (não pode ser calculado sem o segredo do servidor). */
  controlCode(companyId: string, module: PrintModule, d: LoadedDoc): string {
    const secret = process.env.LICENSE_SECRET || process.env.JWT_SECRET || 'inverno-erp';
    const payload = [companyId, module, d.id, d.numero, String(d.date).slice(0, 10), d.nif, fmtMoney(d.total)].join('|');
    const h = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 12).toUpperCase();
    return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}`;
  }

  // ---------------------------------------------------------------- pré-visualização, impressão e verificação

  async preview(companyId: string, body: any) {
    const module = this.moduleOf(body?.module);
    const html = String(body?.html || ''), css = String(body?.css || '');
    const errors = validateTemplate(html, css, module);
    const company = await this.main.getRepository(Company).findOne({ where: { id: companyId } });
    const rendered = renderTemplate(html, css, this.sampleData(company, module), {
      title: 'Pré-visualização', watermark: 'PRÉ-VISUALIZAÇÃO — DADOS DE EXEMPLO — SEM VALOR',
      footer: `Pré-visualização do modelo «${body?.name || 'sem nome'}» · Documento processado por computador · Inverno ERP`,
    });
    return { html: rendered, errors };
  }

  async renderDocument(companyId: string, moduleIn: any, documentId: string, copia: string, user: string | null) {
    await this.ensureTables();
    const module = this.moduleOf(moduleIn);
    const d = await this.loadDocument(companyId, module, documentId, copia);
    const template = await this.forDocType(companyId, module, d.docType);
    if (!template) throw new NotFoundException({ message: 'Sem modelo para este tipo de documento.', useDefault: true });

    const log = async (result: 'OK' | 'BLOCKED', reason: string | null, code: string | null) => {
      await this.main.query(`INSERT INTO print_logs ("companyId",module,"documentId","documentNumber","templateId",version,"userName","controlCode",result,reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [companyId, module, d.id, d.numero, template.id, template.version, user, code, result, reason]);
    };

    // 1. O modelo continua válido (as regras podem ter ficado mais estritas desde que foi gravado)
    const templateErrors = validateTemplate(template.html, template.css, module);
    if (templateErrors.length) {
      await log('BLOCKED', templateErrors.join(' | '), null);
      throw new UnprocessableEntityException({ message: `Impressão bloqueada: o modelo «${template.name}» não é válido.`, errors: templateErrors });
    }

    const code = this.controlCode(companyId, module, d);
    const status = d.status.toUpperCase();
    const watermark = VOIDED.includes(status) ? 'DOCUMENTO ANULADO' : DRAFTS.includes(status) ? 'RASCUNHO — SEM VALOR FISCAL' : undefined;
    const description = d.data.doc['documento.descricao'];
    const html = renderTemplate(template.html, template.css, d.data, {
      title: `${description} ${d.numero}`,
      watermark,
      footer: `Documento processado por computador · Inverno ERP · ${d.numero} · Código de controlo: ${code} · Modelo «${template.name}» v${template.version}${copia ? ' · ' + copia : ''}`,
    });

    // 2. Comparação com a base de dados: se não bater, a impressão não é entregue
    const allowed = [d.data.doc['empresa.nif'], d.data.doc['empresa.telefone']].filter(Boolean);
    const mismatch = checkRendered(html, expectedValues(template.html, d.data), allowed);
    if (mismatch.length) {
      await log('BLOCKED', mismatch.join(' | '), code);
      throw new UnprocessableEntityException({ message: 'Impressão bloqueada: o que ia ser impresso não corresponde ao documento gravado.', errors: mismatch });
    }

    await log('OK', null, code);
    return { html, controlCode: code, templateId: template.id, templateName: template.name, version: template.version };
  }

  /** Confirma um papel impresso: número do documento + código de controlo do rodapé. */
  async verify(companyId: string, numero: string, codigo: string) {
    await this.ensureTables();
    const norm = (s: string) => String(s || '').toUpperCase().replace(/[^0-9A-F]/g, '');
    const want = norm(codigo);
    const n = String(numero || '').trim();
    // Só documentos já impressos têm código: procura no registo de impressões
    const logs = await this.main.query(`SELECT DISTINCT module, "documentId" FROM print_logs WHERE "companyId"=$1 AND result='OK' AND "documentNumber"=$2`, [companyId, n]);
    for (const l of logs) {
      const d = await this.loadDocument(companyId, l.module, l.documentId, '').catch(() => null);
      if (d && norm(this.controlCode(companyId, l.module, d)) === want) {
        return {
          valid: true,
          documento: {
            numero: d.numero, tipo: d.data.doc['documento.descricao'], data: fmtDate(d.date), entidade: d.data.doc['entidade.nome'] || '',
            nif: d.nif, total: fmtMoney(d.total), estado: d.status,
          },
        };
      }
    }
    return { valid: false, message: 'O código não corresponde a nenhum documento impresso desta empresa, ou o documento foi alterado depois de impresso.' };
  }

  async logs(companyId: string) {
    await this.ensureTables();
    return this.main.query(`SELECT * FROM print_logs WHERE "companyId"=$1 ORDER BY "createdAt" DESC LIMIT 200`, [companyId]);
  }
}
