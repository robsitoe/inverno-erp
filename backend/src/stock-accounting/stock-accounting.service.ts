import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenancyService } from '../tenancy/tenancy.service';
import { AccountingService } from '../accounting/accounting.service';
import { Account } from '../accounting/entities/account.entity';
import { JournalEntry } from '../accounting/entities/journal-entry.entity';

export type StockModule = 'SALES' | 'PURCHASES' | 'STOCK';
export type Valuation = 'AVERAGE' | 'FIFO';

export interface PostingRule {
  module: StockModule;
  docType: string;
  label: string;
  enabled: boolean;
  debitAccount: string;
  creditAccount: string;
}

export interface StockAccountingSettings {
  enabled: boolean;
  valuation: Valuation;
  inventoryAccount: string;
  rules: PostingRule[];
}

/** Marca usada nas regras para "a conta de inventário da empresa". */
export const INV = '{INVENTARIO}';
const DEFAULT_INVENTORY_ACCOUNT = '2.2.9';

/**
 * Regras por omissão (PGC-NIR, inventário permanente). O valor é sempre o custo do movimento de stock
 * (custo médio ou FIFO), nunca o preço de venda.
 *  - Vendas: CMV a débito, inventário a crédito (devoluções ao contrário).
 *  - Compras: inventário a débito, 2.1.1 Compras a crédito (a fatura de compra já debitou 2.1.1).
 *  - Documentos de stock: ganhos/perdas de inventário. INV- = parte negativa de um inventário.
 */
const DEFAULT_RULES: PostingRule[] = [
  { module: 'SALES', docType: 'FA', label: 'Fatura', enabled: true, debitAccount: '6.1.1.2', creditAccount: INV },
  { module: 'SALES', docType: 'FR', label: 'Fatura-Recibo', enabled: true, debitAccount: '6.1.1.2', creditAccount: INV },
  { module: 'SALES', docType: 'VD', label: 'Venda a Dinheiro', enabled: true, debitAccount: '6.1.1.2', creditAccount: INV },
  { module: 'SALES', docType: 'FS', label: 'Fatura Simplificada', enabled: true, debitAccount: '6.1.1.2', creditAccount: INV },
  { module: 'SALES', docType: 'GT', label: 'Guia de Transporte', enabled: true, debitAccount: '6.1.1.2', creditAccount: INV },
  { module: 'SALES', docType: 'NC', label: 'Nota de Crédito (devolução)', enabled: true, debitAccount: INV, creditAccount: '6.1.1.2' },
  { module: 'PURCHASES', docType: 'FC', label: 'Fatura de Compra', enabled: true, debitAccount: INV, creditAccount: '2.1.1' },
  { module: 'PURCHASES', docType: 'VDC', label: 'Venda a Dinheiro (Compra)', enabled: true, debitAccount: INV, creditAccount: '2.1.1' },
  { module: 'PURCHASES', docType: 'GRC', label: 'Guia de Remessa (Compra)', enabled: true, debitAccount: INV, creditAccount: '2.1.1' },
  { module: 'PURCHASES', docType: 'NCC', label: 'Nota de Crédito (devolução ao fornecedor)', enabled: true, debitAccount: '2.1.1', creditAccount: INV },
  { module: 'STOCK', docType: 'ENT', label: 'Entrada de Stock', enabled: true, debitAccount: INV, creditAccount: '7.6.4' },
  { module: 'STOCK', docType: 'SAI', label: 'Saída de Stock', enabled: true, debitAccount: '6.8.4.2', creditAccount: INV },
  { module: 'STOCK', docType: 'INV', label: 'Inventário — sobras', enabled: true, debitAccount: INV, creditAccount: '7.6.4' },
  { module: 'STOCK', docType: 'INV-', label: 'Inventário — faltas', enabled: true, debitAccount: '6.8.4.9', creditAccount: INV },
  { module: 'STOCK', docType: 'TRA', label: 'Transferência entre armazéns', enabled: false, debitAccount: INV, creditAccount: INV },
];

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Integração stock–contabilidade: configuração por empresa (ligar/desligar, custo médio ou FIFO),
 * regras de contas por tipo de documento e lançamento automático, um por documento.
 */
@Injectable()
export class StockAccountingService {
  private readonly logger = new Logger(StockAccountingService.name);
  private ready: Promise<void> | null = null;
  private cache = new Map<string, { at: number; settings: StockAccountingSettings }>();

  constructor(
    private readonly main: DataSource,
    private readonly tenancy: TenancyService,
    private readonly accounting: AccountingService,
  ) { }

  private ensureTables(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.main.query(`CREATE TABLE IF NOT EXISTS stock_accounting_settings (
          "companyId" VARCHAR(80) PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT false,
          valuation VARCHAR(10) NOT NULL DEFAULT 'AVERAGE', "inventoryAccount" VARCHAR(40) NOT NULL DEFAULT '${DEFAULT_INVENTORY_ACCOUNT}',
          "updatedBy" VARCHAR(80), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
        await this.main.query(`CREATE TABLE IF NOT EXISTS stock_posting_rules (
          "companyId" VARCHAR(80) NOT NULL, module VARCHAR(20) NOT NULL, "docType" VARCHAR(20) NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT true, "debitAccount" VARCHAR(40) NOT NULL, "creditAccount" VARCHAR(40) NOT NULL,
          PRIMARY KEY ("companyId", module, "docType"))`);
      })().catch(e => { this.ready = null; throw e; });
    }
    return this.ready;
  }

  defaultRules(): PostingRule[] { return DEFAULT_RULES.map(r => ({ ...r })); }

  async getSettings(companyId: string): Promise<StockAccountingSettings> {
    const hit = this.cache.get(companyId);
    if (hit && Date.now() - hit.at < 15_000) return hit.settings;
    await this.ensureTables();
    const s = (await this.main.query(`SELECT * FROM stock_accounting_settings WHERE "companyId"=$1`, [companyId]))[0];
    const stored = await this.main.query(`SELECT * FROM stock_posting_rules WHERE "companyId"=$1`, [companyId]);
    const rules = this.defaultRules().map(r => {
      const x = stored.find((y: any) => y.module === r.module && y.docType === r.docType);
      return x ? { ...r, enabled: !!x.enabled, debitAccount: x.debitAccount, creditAccount: x.creditAccount } : r;
    });
    const settings: StockAccountingSettings = {
      enabled: !!s?.enabled,
      valuation: s?.valuation === 'FIFO' ? 'FIFO' : 'AVERAGE',
      inventoryAccount: s?.inventoryAccount || DEFAULT_INVENTORY_ACCOUNT,
      rules,
    };
    this.cache.set(companyId, { at: Date.now(), settings });
    return settings;
  }

  async getValuation(companyId?: string): Promise<Valuation> {
    if (!companyId) return 'AVERAGE';
    try { return (await this.getSettings(companyId)).valuation; } catch { return 'AVERAGE'; }
  }

  // ---------------------------------------------------------------- configuração

  private async accountsOf(companyId: string) {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    return ds.getRepository(Account);
  }

  /** Garante a conta de inventário por omissão (2.2.9 Mercadorias em armazém), que o PGC base não tem como movimento. */
  private async ensureInventoryAccount(companyId: string, code: string) {
    const repo = await this.accountsOf(companyId);
    if (await repo.findOne({ where: { code } })) return;
    if (code !== DEFAULT_INVENTORY_ACCOUNT) return;
    const parent = await repo.findOne({ where: { code: '2.2' } });
    if (!parent) return;
    await repo.save(repo.create({
      id: `ACC-229-${companyId}`, companyId, code, name: 'Mercadorias em armazém', type: 'ASSET',
      level: (Number((parent as any).level) || 1) + 1, parentId: parent.id, balance: 0, allowPosting: true, isActive: true,
      description: 'Inventário de mercadorias valorizado ao custo (integração automática com o stock).',
    } as any));
    this.logger.log(`Conta ${code} criada para ${companyId}.`);
  }

  async saveSettings(companyId: string, body: any, user: string | null): Promise<StockAccountingSettings> {
    await this.ensureTables();
    const before = await this.getSettings(companyId);
    const valuation: Valuation = body?.valuation === 'FIFO' ? 'FIFO' : 'AVERAGE';
    const inventoryAccount = String(body?.inventoryAccount || DEFAULT_INVENTORY_ACCOUNT).trim();
    const enabled = !!body?.enabled;
    const incoming: any[] = Array.isArray(body?.rules) ? body.rules : [];

    await this.ensureInventoryAccount(companyId, inventoryAccount);

    // Validação das contas: existem e aceitam lançamentos
    const repo = await this.accountsOf(companyId);
    const errors: string[] = [];
    const checkAccount = async (code: string, where: string) => {
      const real = code === INV ? inventoryAccount : code;
      const acc = await repo.findOne({ where: { code: real } });
      if (!acc) errors.push(`${where}: a conta ${real} não existe no plano de contas.`);
      else if (acc.allowPosting === false) errors.push(`${where}: a conta ${real} (${acc.name}) é de soma e não aceita lançamentos.`);
    };
    await checkAccount(inventoryAccount, 'Conta de inventário');
    const rules = this.defaultRules().map(r => {
      const x = incoming.find(y => y.module === r.module && y.docType === r.docType);
      return x ? { ...r, enabled: !!x.enabled, debitAccount: String(x.debitAccount || '').trim(), creditAccount: String(x.creditAccount || '').trim() } : r;
    });
    for (const r of rules.filter(x => x.enabled)) {
      if (!r.debitAccount || !r.creditAccount) { errors.push(`${r.docType}: indique a conta a débito e a crédito.`); continue; }
      await checkAccount(r.debitAccount, `${r.docType} (débito)`);
      await checkAccount(r.creditAccount, `${r.docType} (crédito)`);
    }
    if (errors.length) throw new BadRequestException({ message: 'A configuração tem contas inválidas.', errors });

    await this.main.query(`INSERT INTO stock_accounting_settings ("companyId",enabled,valuation,"inventoryAccount","updatedBy","updatedAt") VALUES ($1,$2,$3,$4,$5,now())
      ON CONFLICT ("companyId") DO UPDATE SET enabled=$2, valuation=$3, "inventoryAccount"=$4, "updatedBy"=$5, "updatedAt"=now()`,
      [companyId, enabled, valuation, inventoryAccount, user]);
    for (const r of rules) {
      await this.main.query(`INSERT INTO stock_posting_rules ("companyId",module,"docType",enabled,"debitAccount","creditAccount") VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT ("companyId",module,"docType") DO UPDATE SET enabled=$4, "debitAccount"=$5, "creditAccount"=$6`,
        [companyId, r.module, r.docType, r.enabled, r.debitAccount, r.creditAccount]);
    }
    this.cache.delete(companyId);

    // Passagem a FIFO: o stock existente entra como primeiro lote, ao custo médio atual
    if (valuation === 'FIFO' && before.valuation !== 'FIFO') await this.openFifoLayers(companyId);
    return this.getSettings(companyId);
  }

  async openFifoLayers(companyId: string) {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    await ensureLayerTable(ds);
    const res = await ds.query(`INSERT INTO stock_cost_layers ("articleId", "movementId", date, "qtyRemaining", "unitCost")
      SELECT a.id::text, 'ABERTURA', CURRENT_DATE, a."currentStock", COALESCE(NULLIF(a."averageCost", 0), a."purchasePrice", 0)
      FROM articles a WHERE a."currentStock" > 0 AND NOT EXISTS (SELECT 1 FROM stock_cost_layers l WHERE l."articleId" = a.id::text)`);
    this.logger.log(`FIFO aberto para ${companyId}: ${Array.isArray(res) ? res[1] ?? '' : ''} artigo(s).`);
  }

  // ---------------------------------------------------------------- lançamentos

  private async journalId(companyId: string): Promise<string | undefined> {
    const ds = await this.tenancy.getTenantDataSource(companyId);
    try {
      const rows = await ds.query(`SELECT id, type FROM journals`);
      const pick = rows.find((j: any) => j.type === 'OPERATIONS') || rows.find((j: any) => j.type === 'GENERAL') || rows[0];
      return pick?.id;
    } catch { return undefined; }
  }

  /**
   * Gera o lançamento de stock de um documento (soma dos custos dos seus movimentos).
   * Idempotente: um documento tem no máximo um lançamento de stock. Nunca falha a gravação do documento.
   * reverse = estorno (movimentos `${id}:VOID`): contas trocadas.
   */
  async postDocument(p: { companyId?: string; module: StockModule; docType: string; sourceDocument: string; reference: string; date: string; reverse?: boolean }) {
    const companyId = p.companyId;
    if (!companyId || !p.sourceDocument) return null;
    try {
      const settings = await this.getSettings(companyId);
      if (!settings.enabled) return null;

      const ds = await this.tenancy.getTenantDataSource(companyId);
      const jeRepo = ds.getRepository(JournalEntry);
      if (await jeRepo.findOne({ where: { sourceDocument: p.sourceDocument, sourceType: 'STOCK' as any } })) return null;

      // Anulação: espelho exato do lançamento original (mesmos valores, contas trocadas)
      if (p.reverse) {
        const originalId = p.sourceDocument.replace(/:VOID$/, '');
        const original = await jeRepo.findOne({ where: { sourceDocument: originalId, sourceType: 'STOCK' as any }, relations: ['lines'] });
        if (original) {
          const saved = await this.accounting.createJournalEntry({
            id: `JE-STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            companyId, journalId: original.journalId || await this.journalId(companyId), date: String(p.date).slice(0, 10),
            description: `Estorno do custo — ${p.reference}`, reference: p.reference, sourceDocument: p.sourceDocument,
            sourceType: 'STOCK', status: 'POSTED', createdBy: 'stock-integration', relatedEntryId: original.id,
            lines: (original.lines || []).map((l, i) => ({
              id: `JL-STK-${Date.now()}-${i}r`, accountId: l.accountId, accountCode: l.accountCode, accountName: l.accountName,
              description: `Estorno: ${l.description || ''}`.trim(), debit: Number(l.credit) || 0, credit: Number(l.debit) || 0,
            })),
          } as any);
          this.logger.log(`Estorno de stock ${saved.id} (espelho de ${original.id}) para ${p.reference}`);
          return saved;
        }
      }

      const active = (await this.computeParts(ds, settings, p.module, p.docType, p.sourceDocument)).filter(x => x.value > 0);
      if (!active.length) return null;

      const real = (code: string) => (code === INV ? settings.inventoryAccount : code);
      const lines: any[] = [];
      active.forEach((x, i) => {
        const debit = real(p.reverse ? x.rule.creditAccount : x.rule.debitAccount);
        const credit = real(p.reverse ? x.rule.debitAccount : x.rule.creditAccount);
        const text = `${p.reverse ? 'Estorno ' : ''}Stock ${p.reference} (${x.rule.label})`;
        lines.push({ id: `JL-STK-${Date.now()}-${i}d`, accountId: debit, description: text, debit: x.value, credit: 0 });
        lines.push({ id: `JL-STK-${Date.now()}-${i}c`, accountId: credit, description: text, debit: 0, credit: x.value });
      });

      const saved = await this.accounting.createJournalEntry({
        id: `JE-STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        companyId, journalId: await this.journalId(companyId), date: String(p.date).slice(0, 10),
        description: `${p.reverse ? 'Estorno do custo' : 'Custo de stock'} — ${p.reference}`,
        reference: p.reference, sourceDocument: p.sourceDocument, sourceType: 'STOCK', status: 'POSTED', createdBy: 'stock-integration',
        lines,
      } as any);
      this.logger.log(`Lançamento de stock ${saved.id} para ${p.reference}: ${active.map(a => a.value).join(' + ')}`);
      return saved;
    } catch (e: any) {
      // A gravação do documento não pode falhar por causa da contabilidade: fica registado e pode ser repetido
      this.logger.error(`Lançamento de stock falhou para ${p.reference}: ${e?.message || e}`);
      return null;
    }
  }

  /** Partes do lançamento de um documento: regra a aplicar e valor (custo dos seus movimentos). */
  private async computeParts(ds: DataSource, settings: StockAccountingSettings, module: StockModule, docType: string, sourceDocument: string) {
    const moves = await ds.query(`SELECT "movementType", quantity, "totalCost" FROM stock_movements WHERE "sourceDocument"=$1`, [sourceDocument]);
    if (!moves.length) return [];
    const isIn = (m: any) => m.movementType === 'IN' || (m.movementType === 'ADJUSTMENT' && Number(m.quantity) > 0);
    const sum = (list: any[]) => round2(list.reduce((a: number, m: any) => a + Math.abs(Number(m.totalCost) || 0), 0));
    const valueIn = sum(moves.filter(isIn));
    const valueOut = sum(moves.filter((m: any) => !isIn(m) && m.movementType !== 'TRANSFER'));
    const type = String(docType || '').toUpperCase();
    const ruleFor = (dt: string) => settings.rules.find(r => r.module === module && r.docType === dt);
    const parts: { rule: PostingRule; value: number }[] = [];
    if (module === 'STOCK' && type === 'INV') {
      const plus = ruleFor('INV'), minus = ruleFor('INV-');
      if (plus) parts.push({ rule: plus, value: valueIn });
      if (minus) parts.push({ rule: minus, value: valueOut });
    } else {
      const r = ruleFor(type);
      if (r) parts.push({ rule: r, value: sum(moves) });
    }
    return parts.filter(x => x.rule.enabled && x.rule.debitAccount !== x.rule.creditAccount);
  }

  /**
   * Recalcula o custo de todos os movimentos com o método escolhido (por ordem cronológica, artigo a artigo):
   * as entradas mantêm o seu custo (as entradas sem custo e todas as saídas são revalorizadas), o custo médio
   * e os lotes FIFO são reconstruídos. Os lançamentos já feitos não são alterados: a diferença de cada documento
   * é lançada como ajuste com a data de hoje (rasto de auditoria).
   */
  async revalue(companyId: string, user: string | null) {
    const settings = await this.getSettings(companyId);
    const ds = await this.tenancy.getTenantDataSource(companyId);
    const fifo = settings.valuation === 'FIFO';
    const moves = await ds.query(`SELECT id, "articleId", "movementType", quantity, "unitCost", "totalCost", "sourceDocument"
      FROM stock_movements ORDER BY date, "createdAt", id`);
    const byArticle = new Map<string, any[]>();
    for (const m of moves) { if (!byArticle.has(m.articleId)) byArticle.set(m.articleId, []); byArticle.get(m.articleId)!.push(m); }

    let changedMoves = 0;
    const touchedSources = new Set<string>();
    await ensureLayerTable(ds);
    await ds.query(`DELETE FROM stock_cost_layers`);
    for (const [articleId, list] of byArticle) {
      let qty = 0, avg = 0;
      let layers: { qty: number; cost: number }[] = [];
      for (const m of list) {
        const q = Math.abs(Number(m.quantity) || 0);
        const t = String(m.movementType);
        const isIn = t === 'IN' || (t === 'ADJUSTMENT' && Number(m.quantity) > 0);
        const isOut = t === 'OUT' || (t === 'ADJUSTMENT' && Number(m.quantity) < 0);
        let unit = Number(m.unitCost) || 0;
        if (isIn) {
          if (unit <= 0) unit = avg; // entrada sem custo (ex.: devolução): ao custo corrente
          const base = Math.max(qty, 0);
          avg = base + q > 0 ? (base * avg + q * unit) / (base + q) : unit;
          qty += q;
          layers.push({ qty: q, cost: unit });
        } else if (isOut) {
          if (fifo) {
            let left = q, cost = 0;
            for (const l of layers) {
              if (left <= 0) break;
              const take = Math.min(left, l.qty); cost += take * l.cost; l.qty -= take; left -= take;
            }
            layers = layers.filter(l => l.qty > 0.00001);
            if (left > 0) cost += left * avg;
            unit = q > 0 ? cost / q : 0;
          } else {
            unit = avg;
            // mantém os lotes coerentes com a quantidade, para uma futura passagem a FIFO
            let left = q;
            for (const l of layers) { if (left <= 0) break; const take = Math.min(left, l.qty); l.qty -= take; left -= take; }
            layers = layers.filter(l => l.qty > 0.00001);
          }
          qty -= q;
        } else continue;
        const total = round2(unit * q);
        // o custo unitário é guardado com 2 casas: compara-se com essa precisão (recalcular de novo não muda nada)
        if (Math.abs(total - Number(m.totalCost || 0)) >= 0.01 || Math.abs(round2(unit) - Number(m.unitCost || 0)) >= 0.01) {
          await ds.query(`UPDATE stock_movements SET "unitCost"=$1, "totalCost"=$2 WHERE id=$3`, [round2(unit), total, m.id]);
          changedMoves++;
          if (m.sourceDocument) touchedSources.add(String(m.sourceDocument));
        }
      }
      await ds.query(`UPDATE articles SET "averageCost"=$1 WHERE id::text=$2`, [Math.round(avg * 10000) / 10000, articleId]);
      if (fifo) {
        for (const l of layers) {
          await ds.query(`INSERT INTO stock_cost_layers ("articleId","movementId",date,"qtyRemaining","unitCost") VALUES ($1,'RECALCULO',CURRENT_DATE,$2,$3)`, [articleId, l.qty, l.cost]);
        }
      }
    }

    // Ajustes contabilísticos pela diferença entre o novo custo e o já lançado
    let adjustments = 0;
    if (settings.enabled) {
      const real = (code: string) => (code === INV ? settings.inventoryAccount : code);
      const today = new Date().toISOString().slice(0, 10);
      for (const src of touchedSources) {
        if (src.endsWith(':VOID')) continue;
        const found = await this.findSource(ds, src);
        if (!found) continue;
        const posted = await ds.query(`SELECT l."accountCode" AS code, l.debit, l.credit FROM journal_entries e JOIN journal_lines l ON l."journalEntryId" = e.id
          WHERE e."sourceType"='STOCK' AND e.status='POSTED' AND (e."sourceDocument"=$1 OR e."sourceDocument" LIKE $2)`, [src, `${src}:AJ%`]);
        if (!posted.length) continue; // nunca contabilizado: trata-se em "movimentos pendentes"
        const lines: any[] = [];
        for (const part of await this.computeParts(ds, settings, found.module, found.docType, src)) {
          // mede-se pela conta que não é a de inventário (CMV, compras, ganhos, perdas)
          const useDebit = part.rule.debitAccount !== INV;
          const account = real(useDebit ? part.rule.debitAccount : part.rule.creditAccount);
          const already = round2(posted.filter((x: any) => x.code === account).reduce((a: number, x: any) => a + (useDebit ? Number(x.debit) - Number(x.credit) : Number(x.credit) - Number(x.debit)), 0));
          const diff = round2(part.value - already);
          if (Math.abs(diff) < 0.01) continue;
          const d = real(diff > 0 ? part.rule.debitAccount : part.rule.creditAccount);
          const c = real(diff > 0 ? part.rule.creditAccount : part.rule.debitAccount);
          const text = `Ajuste de valorização ${found.reference} (${part.rule.label})`;
          lines.push({ id: `JL-STK-${Date.now()}-${lines.length}d`, accountId: d, description: text, debit: Math.abs(diff), credit: 0 });
          lines.push({ id: `JL-STK-${Date.now()}-${lines.length}c`, accountId: c, description: text, debit: 0, credit: Math.abs(diff) });
        }
        if (!lines.length) continue;
        await this.accounting.createJournalEntry({
          id: `JE-STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`, companyId, journalId: await this.journalId(companyId), date: today,
          description: `Ajuste de valorização de stock — ${found.reference}`, reference: found.reference,
          sourceDocument: `${src}:AJ${Date.now()}`, sourceType: 'STOCK', status: 'POSTED', createdBy: user || 'stock-integration', lines,
        } as any);
        adjustments++;
      }
    }
    this.logger.log(`Revalorização (${settings.valuation}) em ${companyId}: ${changedMoves} movimento(s), ${adjustments} ajuste(s).`);
    return { valuation: settings.valuation, articles: byArticle.size, changedMovements: changedMoves, adjustments };
  }

  /** Contabiliza os movimentos já existentes que ainda não têm lançamento de stock (ex.: ao ligar a integração). */
  async postPending(companyId: string) {
    const settings = await this.getSettings(companyId);
    if (!settings.enabled) throw new BadRequestException('Ligue a integração antes de contabilizar movimentos pendentes.');
    const ds = await this.tenancy.getTenantDataSource(companyId);
    const pending = await ds.query(`SELECT m."sourceDocument" AS src, MIN(m.date)::text AS date, MIN(m.reference) AS ref
      FROM stock_movements m WHERE m."sourceDocument" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM journal_entries e WHERE e."sourceDocument" = m."sourceDocument" AND e."sourceType" = 'STOCK')
      GROUP BY m."sourceDocument" ORDER BY MIN(m.date)`);
    let posted = 0, skipped = 0;
    for (const row of pending) {
      const src = String(row.src);
      const reverse = src.endsWith(':VOID');
      const id = reverse ? src.slice(0, -5) : src;
      const found = await this.findSource(ds, id);
      if (!found) { skipped++; continue; }
      const r = await this.postDocument({ companyId, module: found.module, docType: found.docType, sourceDocument: src, reference: found.reference, date: row.date, reverse });
      if (r) posted++; else skipped++;
    }
    return { posted, skipped, total: pending.length };
  }

  private async findSource(ds: DataSource, id: string): Promise<{ module: StockModule; docType: string; reference: string } | null> {
    const q = async (sql: string) => (await ds.query(sql, [id]).catch(() => []))[0];
    const s = await q(`SELECT "documentType" AS t, "documentNumber" AS n FROM sales_documents WHERE id::text=$1`);
    if (s) return { module: 'SALES', docType: s.t, reference: s.n };
    const pu = await q(`SELECT type AS t, series, number FROM purchase_documents WHERE id::text=$1`);
    if (pu) return { module: 'PURCHASES', docType: pu.t, reference: `${pu.t} ${pu.series}/${pu.number}` };
    const st = await q(`SELECT type AS t, series, number FROM stock_documents WHERE id::text=$1`);
    if (st) return { module: 'STOCK', docType: st.t, reference: `${st.t} ${st.series}/${st.number}` };
    return null;
  }
}

/** Lotes de custo FIFO (base da empresa). */
export async function ensureLayerTable(ds: DataSource) {
  await ds.query(`CREATE TABLE IF NOT EXISTS stock_cost_layers (
    id BIGSERIAL PRIMARY KEY, "articleId" VARCHAR(80) NOT NULL, "movementId" VARCHAR(80), date DATE NOT NULL,
    "qtyRemaining" NUMERIC(18,4) NOT NULL, "unitCost" NUMERIC(18,4) NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await ds.query(`CREATE INDEX IF NOT EXISTS stock_cost_layers_article ON stock_cost_layers ("articleId", date, id)`);
}
