import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { GasCylinderType, GasDailyControl, GasDailyEntry } from './gas-control.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { InventoryService } from '../inventory/inventory.service';
import { Article } from '../inventory/entities/article.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { SalesDocument } from '../sales/entities/sales-document.entity';
import { isIssued } from '../common/document-integrity';

const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toUpperCase();
// Documentos de venda que fazem sair garrafas cheias; a nota de crédito devolve-as
const OUT_DOC_TYPES = ['FA', 'FR', 'VD', 'FS', 'FT', 'GT'];
const RETURN_DOC_TYPES = ['NC'];
// Linhas de vasilhame, caução, vazias ou avariadas não são garrafas cheias
const NOT_FULL = /VAZI|VASILH|^VAS\b|VAS-|AVARIA|CAU[CÇ]/;

@Injectable()
export class GasControlService {
  constructor(
    @InjectRepository(GasCylinderType)
    private readonly defaultTypeRepo: Repository<GasCylinderType>,
    @InjectRepository(GasDailyControl)
    private readonly defaultControlRepo: Repository<GasDailyControl>,
    @InjectRepository(GasDailyEntry)
    private readonly defaultEntryRepo: Repository<GasDailyEntry>,
    @InjectRepository(Article)
    private readonly defaultArticleRepo: Repository<Article>,
    @InjectRepository(StockMovement)
    private readonly defaultStockMovementRepo: Repository<StockMovement>,
    private readonly tenancyService: TenancyService,
    private readonly inventoryService: InventoryService,
  ) { }

  private async getRepo<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    defaultRepo: Repository<T>,
    companyId?: string,
  ): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return defaultRepo;
    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  async getCylinderTypes(companyId?: string) {
    const repo = await this.getRepo(GasCylinderType, this.defaultTypeRepo, companyId);
    const cid = companyId || TenancyContext.getCompanyId();
    return repo.find({ where: { companyId: cid, isActive: true } });
  }

  async ensureStandardCylinderTypes(companyId: string) {
    const repo = await this.getRepo(GasCylinderType, this.defaultTypeRepo, companyId);

    const standardTypes = [
      { name: '9KG', capacity: 9, priceConsumidor: 850, priceRevendedor: 750 },
      { name: '48KG', capacity: 48, priceConsumidor: 4500, priceRevendedor: 4200 },
      { name: '45KG', capacity: 45, priceConsumidor: 4200, priceRevendedor: 3900 },
      { name: '05KG', capacity: 5, priceConsumidor: 500, priceRevendedor: 450 },
      { name: '14KG', capacity: 14, priceConsumidor: 1300, priceRevendedor: 1200 },
      { name: '19KG', capacity: 19, priceConsumidor: 1800, priceRevendedor: 1650 },
      { name: '6KG', capacity: 6, priceConsumidor: 600, priceRevendedor: 550 },
      { name: '11KG', capacity: 11, priceConsumidor: 1050, priceRevendedor: 950 }
    ];

    for (const st of standardTypes) {
      let type = await repo.findOne({ where: { name: st.name, companyId } });
      if (!type) {
        type = repo.create({
          id: `${st.name}-${companyId}`,
          name: st.name,
          capacity: st.capacity,
          priceConsumidor: st.priceConsumidor,
          priceRevendedor: st.priceRevendedor,
          companyId,
          isActive: true,
          fullArticleCode: st.name,
          emptyArticleCode: `${st.name}-VZ`,
          damagedArticleCode: `${st.name}-AV`
        });
        await repo.save(type);
      }
    }
  }

  async getDailyControl(date: string, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const controlRepo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);
    const entryRepo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, cid);

    let control = await controlRepo.findOne({ where: { date, companyId: cid } });
    if (!control) {
      // Day not registered. Look for rollover from last closed day
      const lastControl = await controlRepo.createQueryBuilder('c')
        .where('c.date < :date AND c.companyId = :cid', { date, cid })
        .orderBy('c.date', 'DESC')
        .getOne();

      let initialStock = {};
      if (lastControl && lastControl.finalStock) {
        initialStock = lastControl.finalStock;
      }

      return {
        control: {
          date,
          companyId: cid,
          status: 'NOT_STARTED',
          initialStock
        } as any,
        entries: []
      };
    }

    const entries = await entryRepo.find({ where: { controlId: control.id, companyId: cid } });
    return { control, entries };
  }

  async saveEntry(data: any, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, cid);
    await this.assertDayOpen(data.controlId, cid);
    if (!data.id) {
      data.id = `GDE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    data.companyId = cid;
    return repo.save(data);
  }

  async deleteEntry(id: string, companyId?: string) {
    const repo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, companyId);
    const entry = await repo.findOne({ where: { id } });
    if (entry) await this.assertDayOpen(entry.controlId, companyId);
    return repo.delete(id);
  }

  /** Os lançamentos só mudam com o dia aberto: um dia fechado tem de ser reaberto, o que fica no registo de auditoria. */
  private async assertDayOpen(controlId: string, companyId?: string) {
    const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
    const control = controlId ? await repo.findOne({ where: { id: controlId } }) : null;
    if (!control || control.status === 'NOT_STARTED') throw new BadRequestException('O dia ainda não foi aberto. Faça a abertura antes de lançar movimentos.');
    if (control.status === 'CLOSED') throw new BadRequestException(`O mapa de ${String(control.date).slice(0, 10).split('-').reverse().join('/')} está fechado. Reabra-o para corrigir (a reabertura fica registada).`);
  }

  async openDaily(date: string, user: string, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);

    let control = await repo.findOne({ where: { date, companyId: cid } });

    if (control) {
      if (control.status === 'NOT_STARTED' || !control.status) {
        control.status = 'OPENED';
        control.openedBy = user;
        control.openedAt = new Date();
        return repo.save(control);
      }
      return control; // Already OPENED or CLOSED
    }

    // Roll over from last closed day
    const lastControl = await repo.createQueryBuilder('c')
      .where('c.date < :date AND c.companyId = :cid', { date, cid })
      .orderBy('c.date', 'DESC')
      .getOne();

    let initialStock = {};
    if (lastControl && lastControl.finalStock) {
      initialStock = lastControl.finalStock;
    }

    control = repo.create({
      id: `GAS-${date}-${cid}`,
      date,
      companyId: cid,
      status: 'OPENED',
      openedBy: user,
      openedAt: new Date(),
      initialStock,
      finalStock: {},
      auditLog: []
    });

    return repo.save(control);
  }

  async closeDaily(id: string, user: string, companyId?: string) {
    const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
    const control = await repo.findOne({ where: { id } });
    if (!control) throw new NotFoundException('Control not found');
    if (control.status !== 'OPENED') throw new BadRequestException('Só um dia aberto pode ser fechado.');

    control.status = 'CLOSED';
    control.closedBy = user;
    control.closedAt = new Date();

    return repo.save(control);
  }

  async reopenDaily(id: string, user: string, companyId?: string) {
    const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
    const control = await repo.findOne({ where: { id } });
    if (!control) throw new NotFoundException('Control not found');
    if (control.status !== 'CLOSED') return control;

    control.status = 'OPENED';
    if (!control.auditLog) control.auditLog = [];
    control.auditLog.push({
      type: 'REOPEN',
      user,
      timestamp: new Date(),
      summary: 'O documento foi reaberto para edição.'
    });

    return repo.save(control);
  }

  async updateStocks(controlId: string, initialStock: any, finalStock: any, user: string, companyId?: string) {
    const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
    const cid = companyId || TenancyContext.getCompanyId();
    const control = await repo.findOne({ where: { id: controlId, companyId: cid } });
    if (!control) throw new NotFoundException('Control not found');

    if (control.status !== 'OPENED') throw new BadRequestException(control.status === 'CLOSED'
      ? 'O mapa deste dia está fechado. Reabra-o para corrigir (a reabertura fica registada).'
      : 'O dia ainda não foi aberto.');

    // Num dia reaberto, cada alteração de valores fica no registo de auditoria
    const wasReopened = (control.auditLog || []).some(l => l?.type === 'REOPEN');
    const previousFinal = control.finalStock;

    control.initialStock = initialStock;
    control.finalStock = finalStock;

    if (wasReopened) {
      if (!control.auditLog) control.auditLog = [];
      const changes: string[] = [];

      // Check for stock changes in keys (cylinder types)
      for (const key of Object.keys(finalStock || {})) {
        if (key === 'footers') continue;
        const oldGpl = previousFinal?.[key]?.gpl || 0;
        const newGpl = finalStock[key]?.gpl || 0;
        if (oldGpl !== newGpl) {
          changes.push(`${key} (GPL: ${oldGpl}->${newGpl})`);
        }
      }

      // Check for physical cash changes
      const oldCash = previousFinal?.footers?.closingBalance || 0;
      const newCash = finalStock?.footers?.closingBalance || 0;
      if (oldCash !== newCash) {
        changes.push(`Numerário (${oldCash}->${newCash})`);
      }

      if (changes.length) control.auditLog.push({
        type: 'EDIT_AFTER_CLOSURE',
        user,
        timestamp: new Date(),
        summary: `Alterações: ${changes.join(', ')}`
      });
    }

    const saved = await repo.save(control);

    // PROPAGATE TO FOLLOWING DAYS recursively
    await this.propagateStockToFollowingDays(control.date, finalStock, cid as string, repo);

    // SYNC TO GENERAL INVENTORY
    await this.syncGasInventoryToArticles(finalStock, control.date, cid as string);

    return saved;
  }

  async syncGasInventoryToArticles(finalStock: any, date: string, companyId: string) {
    console.log(`[GasSync] Starting sync for ${date} (Company: ${companyId})`);

    // 1. Get all gas cylindertypes FOR THIS COMPANY
    const cylinderTypes = await this.getCylinderTypes(companyId);
    console.log(`[GasSync] Found ${cylinderTypes.length} cylinder types`);

    if (cylinderTypes.length === 0) {
      console.warn(`[GasSync] No cylinder types found for company ${companyId}. Sync aborted.`);
      return;
    }

    const smRepo = await this.getRepo(StockMovement, this.defaultStockMovementRepo, companyId);
    const artRepo = await this.getRepo(Article, this.defaultArticleRepo, companyId);

    for (const type of cylinderTypes) {
      // Support both direct keys and physicalManeio fallback
      let stockData = finalStock[type.name];
      if (!stockData && finalStock.footers?.physicalManeio) {
        stockData = {
          gpl: finalStock.footers.physicalManeio[type.name] || 0
        };
      }

      if (!stockData) {
        console.log(`[GasSync] No stock data for type ${type.name} in finalStock. Skipping.`);
        continue;
      }

      const states = [
        { suffix: 'CHEIA', name: 'CHEIA', key: 'gpl', customCode: type.fullArticleCode },
        { suffix: 'VAZIA', name: 'VAZIA', key: 'empty', customCode: type.emptyArticleCode },
        { suffix: 'AVARIADA', name: 'AVARIADA', key: 'damaged', customCode: type.damagedArticleCode }
      ];

      for (const state of states) {
        const articleCode = state.customCode || `GAS-${type.name}-${state.suffix}`;
        const articleName = `GÁS ${type.name} (${state.name})`;
        const targetQty = Number(stockData[state.key]) || 0;

        try {
          let article = await artRepo.findOne({ where: { code: articleCode, companyId } });

          if (!article) {
            console.log(`[GasSync] Creating article ${articleCode}`);
            article = artRepo.create({
              companyId,
              code: articleCode,
              name: articleName,
              description: `Cilindro de Gás ${type.name} - Estado: ${state.name}`,
              familyId: 'GAS',
              type: 'PRODUCT',
              unit: 'UN',
              salePrice: type.priceConsumidor || 0,
              purchasePrice: type.priceRevendedor || 0,
              stockControl: true,
              currentStock: 0,
              isActive: true
            });
            await artRepo.save(article);
          }

          // 1. Get current balance up to this date
          const currentBalance = await this.inventoryService.getStockBalanceAtDate(articleCode, date, 'ARM01', companyId);

          // 2. Find existing sync movement for this day
          const syncRef = `GAS-INV-SYNC`;
          const existingSync = await smRepo.findOne({
            where: { articleCode, date, reference: syncRef, companyId }
          });

          const currentSyncQty = existingSync ? Number(existingSync.quantity) : 0;
          const balanceWithoutThisSync = currentBalance - currentSyncQty;
          const neededAdjustment = targetQty - balanceWithoutThisSync;

          console.log(`[GasSync] ${articleCode} | Target: ${targetQty} | Balance: ${currentBalance} | SyncQty: ${currentSyncQty} | Needed: ${neededAdjustment}`);

          if (neededAdjustment !== 0 || !existingSync) {
            if (existingSync) {
              console.log(`[GasSync] Updating existing sync ${existingSync.id}`);
              existingSync.quantity = neededAdjustment;
              existingSync.unitCost = type.priceRevendedor || 0;
              existingSync.totalCost = neededAdjustment * (type.priceRevendedor || 0);
              await smRepo.save(existingSync);
            } else if (neededAdjustment !== 0) {
              console.log(`[GasSync] Creating new sync movement`);
              await this.inventoryService.createStockMovement({
                companyId,
                date,
                articleId: article.id,
                articleCode: article.code,
                articleName: article.name,
                warehouseId: 'ARM01',
                movementType: 'ADJUSTMENT' as any,
                quantity: neededAdjustment,
                unitCost: type.priceRevendedor || 0,
                totalCost: neededAdjustment * (type.priceRevendedor || 0),
                reference: syncRef,
                notes: 'Sincronização Automática via Controlo de Gás'
              });
            }
          }

          // Sync Article.currentStock property just to be sure
          const currentActualArticleStock = await this.inventoryService.getStockBalanceAtDate(articleCode, '2099-12-31', 'ARM01', companyId);
          if (Number(article.currentStock) !== currentActualArticleStock) {
            article.currentStock = currentActualArticleStock;
            await artRepo.save(article);
          }

          // Ensure article prices and category are always updated
          if (Number(article.purchasePrice) !== Number(type.priceRevendedor) || article.familyId !== 'GAS') {
            await artRepo.update(article.id, {
              purchasePrice: type.priceRevendedor || 0,
              salePrice: type.priceConsumidor || 0,
              familyId: 'GAS'
            });
          }

        } catch (err) {
          console.error(`[GasSync] Error syncing ${articleCode}:`, err);
        }
      }
    }
  }

  async saveCylinderType(data: any, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getRepo(GasCylinderType, this.defaultTypeRepo, cid);
    if (!data.id) {
      data.id = `${data.name}-${cid}`;
    }
    data.companyId = cid;
    return repo.save(data);
  }

  async getStatistics(from: string, to: string, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const controlRepo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);
    const entryRepo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, cid);

    const controls = await controlRepo.createQueryBuilder('c')
      .where('c.date >= :from AND c.date <= :to AND c.companyId = :cid', { from, to, cid })
      .orderBy('c.date', 'ASC')
      .getMany();

    if (controls.length === 0) return { salesByType: {}, dailyAverages: {}, totals: { vds: 0, invoices: 0 } };

    const controlIds = controls.map(c => c.id);
    const entries = await entryRepo.createQueryBuilder('e')
      .where('e.controlId IN (:...controlIds) AND e.companyId = :cid', { controlIds, cid })
      .getMany();

    const stats = {
      period: { from, to, days: controls.length },
      salesByType: {} as any,
      dailyAverages: {} as any,
      vdsTotal: 0,
      invoicesTotal: 0,
      stockTrend: controls.map(c => ({ date: c.date, stock: c.finalStock }))
    };

    const cylinderTypes = await this.getCylinderTypes(cid as string);

    cylinderTypes.forEach(t => {
      const typeEntries = entries.filter(e => e.cylinderTypeId === t.id);
      const qtySold = typeEntries.reduce((acc, e) => acc + (Number(e.s_gpl) || 0) + (Number(e.vz_vend) || 0), 0);
      const valVds = typeEntries.reduce((acc, e) => acc + ((!e.invoice && !e.gr) ? Number(e.totalAmount) || 0 : 0), 0);
      const valInv = typeEntries.reduce((acc, e) => acc + (e.invoice ? Number(e.totalAmount) || 0 : 0), 0);

      stats.salesByType[t.name] = {
        quantity: qtySold,
        vds: valVds,
        invoices: valInv,
        total: valVds + valInv
      };

      stats.dailyAverages[t.name] = (qtySold / controls.length).toFixed(2);
      stats.vdsTotal += valVds;
      stats.invoicesTotal += valInv;
    });

    return stats;
  }

  /**
   * Análise diária (como a folha "Analises" do mapa): continuidade do stock entre dias,
   * vendas por tamanho, valores e diferenças de caixa e do fundo de maneio, e dias sem registo.
   */
  async getAnalysis(from: string, to: string, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const controlRepo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);
    const entryRepo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, cid);
    const iso = (d: any) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);

    const controls = (await controlRepo.createQueryBuilder('c')
      .where('c.date >= :from AND c.date <= :to AND c.companyId = :cid', { from, to, cid })
      .orderBy('c.date', 'ASC').getMany()).map(c => ({ ...c, date: iso(c.date) }));
    const before = await controlRepo.createQueryBuilder('c')
      .where('c.date < :from AND c.companyId = :cid', { from, cid })
      .orderBy('c.date', 'DESC').getOne();

    const types = await this.getCylinderTypes(cid as string);
    const typeName = new Map(types.map(t => [t.id, t.name]));
    const entries = controls.length ? await entryRepo.createQueryBuilder('e')
      .where('e.controlId IN (:...ids) AND e.companyId = :cid', { ids: controls.map(c => c.id), cid }).getMany() : [];

    const num = (v: any) => Number(v) || 0;
    const sum = (list: any[], f: (x: any) => number) => list.reduce((a, x) => a + f(x), 0);
    const fields: [string, string][] = [['gpl', 'Cheias'], ['empty', 'Vazias'], ['damaged', 'Avariadas']];

    let prev: any = before ? { ...before, date: iso(before.date) } : null;
    const days = controls.map(c => {
      const dayEntries = entries.filter(e => e.controlId === c.id && !e.isAdj);
      const customer = dayEntries.filter(e => e.entryType === 'CUSTOMER');
      const footers = c.finalStock?.footers || {};

      // Continuidade: o stock inicial de hoje tem de ser o final do último dia registado
      const continuity: { type: string; field: string; expected: number; found: number }[] = [];
      if (prev?.finalStock) {
        for (const t of types) {
          for (const [f, label] of fields) {
            const expected = num(prev.finalStock?.[t.name]?.[f]);
            const found = num(c.initialStock?.[t.name]?.[f]);
            if (expected !== found) continuity.push({ type: t.name, field: label, expected, found });
          }
        }
      }

      const salesByType: Record<string, number> = {};
      for (const t of types) {
        const q = sum(customer.filter(e => e.cylinderTypeId === t.id), e => num(e.s_gpl) + num(e.vz_vend));
        if (q) salesByType[t.name] = q;
      }
      const s = footers.summary || {};
      const maneioDiff: Record<string, number> = {};
      for (const [k, v] of Object.entries(s.maneioDiff || {})) if (num(v)) maneioDiff[k] = num(v);

      const day = {
        date: c.date, status: c.status, openedBy: c.openedBy || null, closedBy: c.closedBy || null,
        previousDate: prev?.date || null,
        continuity,
        salesByType,
        cylindersSold: Object.values(salesByType).reduce((a, b) => a + b, 0),
        vds: sum(customer.filter(e => !e.invoice && !e.gr), e => num(e.totalAmount)),
        invoices: sum(customer.filter(e => e.invoice), e => num(e.totalAmount)),
        guides: sum(customer.filter(e => e.gr), e => num(e.totalAmount)),
        bank: sum(footers.bankDeposits || [], (b: any) => num(b.value)),
        expenses: sum(footers.dailyExpenses || [], (x: any) => num(x.value)),
        // Só existe nos dias gravados depois desta versão (o ecrã guarda o resumo do fecho de caixa)
        expected: s.expected ?? null,
        physical: s.physical ?? null,
        cashDifference: s.discrepancy ?? null,
        maneioDiff,
        notes: (footers.notes || []).length,
      };
      prev = c;
      return day;
    });

    // Dias úteis sem registo (domingos não contam)
    const registered = new Set(controls.map(c => c.date));
    const missing: string[] = [];
    const end = new Date(to + 'T12:00:00Z');
    for (let d = new Date(from + 'T12:00:00Z'); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      if (d.getUTCDay() !== 0 && !registered.has(k) && k <= new Date().toISOString().slice(0, 10)) missing.push(k);
    }

    const issues = (d: any) => d.continuity.length > 0 || (d.cashDifference !== null && Math.abs(d.cashDifference) >= 0.01) || Object.keys(d.maneioDiff).length > 0;
    return {
      period: { from, to },
      types: types.map(t => t.name),
      days,
      missing,
      totals: {
        days: days.length,
        closed: days.filter(d => d.status === 'CLOSED').length,
        withIssues: days.filter(issues).length,
        continuityBreaks: days.filter(d => d.continuity.length).length,
        cylindersSold: sum(days, d => d.cylindersSold),
        vds: sum(days, d => d.vds),
        invoices: sum(days, d => d.invoices),
        guides: sum(days, d => d.guides),
        bank: sum(days, d => d.bank),
        expenses: sum(days, d => d.expenses),
        cashDifference: sum(days, d => num(d.cashDifference)),
        salesByType: types.reduce((acc, t) => { const q = sum(days, d => num(d.salesByType[t.name])); if (q) acc[t.name] = q; return acc; }, {} as Record<string, number>),
      },
    };
  }

  /**
   * Conferência do dia entre o mapa e os documentos de venda emitidos no ERP: garrafas cheias que saíram
   * para clientes no mapa contra as faturadas (FA/FR/VD/FS/FT e guias GT, menos as devolvidas em NC),
   * por tamanho e por cliente. Uma saída sem documento é uma venda por faturar.
   */
  async getFiscalCheck(date: string, companyId?: string) {
    const cid = (companyId || TenancyContext.getCompanyId()) as string;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) throw new BadRequestException('Indique a data do mapa.');
    const types = await this.getCylinderTypes(cid);
    const num = (v: any) => Number(v) || 0;

    // Linha de documento → tamanho da garrafa: pelo código do artigo da garrafa cheia, ou pelos "kg" no código/nome
    const byCode = new Map<string, string>();
    const byKg = new Map<number, string>();
    for (const t of types) {
      for (const code of [t.fullArticleCode, `GAS-${t.name}-CHEIA`, t.name]) if (code) byCode.set(norm(code), t.name);
      const kg = parseInt(t.name, 10) || num(t.capacity);
      if (kg && !byKg.has(kg)) byKg.set(kg, t.name);
    }
    const typeOfLine = (code: string, name: string): string | null => {
      const direct = byCode.get(norm(code));
      if (direct) return direct;
      const text = `${code} ${name}`.toUpperCase();
      if (NOT_FULL.test(text)) return null;
      const m = text.match(/(\d{1,2})\s*KG/);
      return m ? byKg.get(parseInt(m[1], 10)) || null : null;
    };

    // Saídas do mapa: garrafas cheias entregues a clientes (sem os acertos)
    const { control, entries } = await this.getDailyControl(date, cid);
    const typeName = new Map(types.map(t => [t.id, t.name]));
    const mapRows = (entries || []).filter(e => e.entryType === 'CUSTOMER' && !e.isAdj && num(e.s_gpl) > 0);

    const ds = await this.tenancyService.getTenantDataSource(cid);
    const docs = await ds.getRepository(SalesDocument).createQueryBuilder('d')
      .leftJoinAndSelect('d.lines', 'l')
      .where('d.date = :date', { date })
      .andWhere('d.documentType IN (:...types)', { types: [...OUT_DOC_TYPES, ...RETURN_DOC_TYPES] })
      .orderBy('d.documentNumber', 'ASC')
      .getMany();

    const documents = docs
      .filter(d => isIssued(d.status) || !!d.voidedAt)
      .map(d => {
        const quantities: Record<string, number> = {};
        for (const l of d.lines || []) {
          const t = typeOfLine(l.articleCode, l.articleName);
          if (t) quantities[t] = (quantities[t] || 0) + num(l.quantity);
        }
        return {
          id: d.id, number: d.documentNumber, type: d.documentType, customerName: d.customerName || '',
          voided: !!d.voidedAt, total: num(d.total), quantities,
          sign: RETURN_DOC_TYPES.includes(d.documentType) ? -1 : 1,
        };
      })
      .filter(d => Object.keys(d.quantities).length > 0);

    // Por cliente e tamanho
    const rows = new Map<string, { customer: string; type: string; map: number; documented: number; documents: string[]; mapKind: string[] }>();
    const row = (customer: string, type: string) => {
      const k = `${norm(customer)}|${type}`;
      if (!rows.has(k)) rows.set(k, { customer, type, map: 0, documented: 0, documents: [], mapKind: [] });
      return rows.get(k)!;
    };
    for (const e of mapRows) {
      const t = typeName.get(e.cylinderTypeId);
      if (!t) continue;
      const r = row(e.customerName || '(sem nome)', t);
      r.map += num(e.s_gpl);
      const kind = e.invoice ? 'Fatura' : e.gr ? 'Guia' : 'VD';
      if (!r.mapKind.includes(kind)) r.mapKind.push(kind);
    }
    for (const d of documents) {
      if (d.voided) continue;
      for (const [t, q] of Object.entries(d.quantities)) {
        const r = row(d.customerName || '(sem nome)', t);
        r.documented += d.sign * q;
        if (!r.documents.includes(d.number)) r.documents.push(d.number);
      }
    }
    const byCustomer = [...rows.values()]
      .map(r => ({ ...r, difference: r.map - r.documented }))
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference) || a.customer.localeCompare(b.customer));

    const byType = types.map(t => {
      const map = byCustomer.filter(r => r.type === t.name).reduce((a, r) => a + r.map, 0);
      const documented = byCustomer.filter(r => r.type === t.name).reduce((a, r) => a + r.documented, 0);
      return { type: t.name, map, documented, difference: map - documented };
    }).filter(r => r.map || r.documented);

    return {
      date,
      status: control?.status || 'NOT_STARTED',
      documents,
      byType,
      byCustomer,
      totals: {
        map: byType.reduce((a, r) => a + r.map, 0),
        documented: byType.reduce((a, r) => a + r.documented, 0),
        // Garrafas que saíram no mapa sem documento, e faturadas que não aparecem no mapa
        undocumented: byCustomer.reduce((a, r) => a + Math.max(0, r.difference), 0),
        notInMap: byCustomer.reduce((a, r) => a + Math.max(0, -r.difference), 0),
      },
    };
  }

  private async propagateStockToFollowingDays(date: string, finalStock: any, companyId: string, repo: any) {
    let currentDate = new Date(date);
    currentDate.setUTCHours(12, 0, 0, 0);

    // Propagate to the next 15 days if they exist. Sequential updates.
    for (let i = 0; i < 15; i++) {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      const dateStr = currentDate.toISOString().split('T')[0];

      const nextControl = await repo.findOne({ where: { date: dateStr, companyId } });
      if (!nextControl) break;

      // Only update if actually different
      if (JSON.stringify(nextControl.initialStock) !== JSON.stringify(finalStock)) {
        nextControl.initialStock = finalStock;
        await repo.save(nextControl);
      }

      // If the next day is CLOSED, we usually don't want to mess with its finalStock 
      // unless we had a specific requirement to cascade balances. 
      // However, the standard behavior is that the user must re-open and re-save 
      // the next day if they change something in the past that affects the future.

      // Since the user is complaining about Carry-overs, we stop at CLOSED days 
      // as they represent a "snapshot" taken by the user.
      if (nextControl.status === 'CLOSED') break;
    }
  }

  async reSyncAllDays(companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    console.log(`[GasSync] Starting BATCH re-sync for company ${cid}`);

    const controlRepo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);

    const controls = await controlRepo.find({
      where: { companyId: cid },
      order: { date: 'ASC' }
    });

    console.log(`[GasSync] Found ${controls.length} controls to process`);

    let count = 0;
    for (const control of controls) {
      // We sync even if finalStock is sparse, because of our new fallback logic
      if (control.finalStock) {
        await this.syncGasInventoryToArticles(control.finalStock, control.date, cid as string);
        count++;
      }
    }
    return { message: `${count} dias sincronizados com sucesso`, count };
  }
}
