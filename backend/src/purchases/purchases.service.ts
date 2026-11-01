import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral, MoreThan } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseDocument, PurchaseDocumentLine } from './entities/purchase.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { WorkflowService, WorkflowTarget } from '../common/workflow.service';
import { PeriodControlService } from '../periods/period-control.service';
import { WorkflowStatus } from '../common/enums/workflow-status.enum';
import { AccountingService } from '../accounting/accounting.service';
import { isIssued, issuedLockError, isUniqueViolation, reverseJournalEntriesOf } from '../common/document-integrity';

import { InventoryService } from '../inventory/inventory.service';
import { CreateStockMovementDto } from '../inventory/dto/create-stock-movement.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly periodControlService: PeriodControlService,
    @InjectRepository(PurchaseDocument)
    private readonly defaultPurchaseRepo: Repository<PurchaseDocument>,
    private readonly workflowService: WorkflowService,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
  ) { }

  // ... (getRepo methods remain same) ...
  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>, companyId?: string): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  private async getPurchaseRepo(companyId?: string) { return this.getRepo(PurchaseDocument, this.defaultPurchaseRepo, companyId); }

  /** Número do documento como se mostra: TIPO SÉRIE/N.º */
  private numberOf(d: PurchaseDocument) { return `${d.type} ${d.series}/${d.number}`; }

  /** Linhas e totais calculados a partir das linhas (mesma fórmula do formulário de compras). */
  private buildLines(lines: any[]) {
    let merchandiseTotal = 0;
    let discountValue = 0;
    let taxTotal = 0;
    const documentLines = (lines || []).map(line => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const taxRate = Number(line.ivaRate ?? line.taxRate ?? 0);
      const gross = quantity * unitPrice;
      const discount = gross * (Number(line.discount || 0) / 100);
      const liquid = gross - discount;
      const tax = liquid * (taxRate / 100);
      merchandiseTotal += gross;
      discountValue += discount;
      taxTotal += tax;
      return {
        ...line,
        totalLiquid: liquid,
        totalValue: liquid + tax,
        taxRate,
        taxCode: line.ivaCode || line.taxCode || 'IVA'
      };
    });
    return { documentLines, merchandiseTotal, discountValue, taxTotal, totalValue: merchandiseTotal - discountValue + taxTotal };
  }

  async create(createPurchaseDto: CreatePurchaseDto, user?: any) {
    const repo = await this.getPurchaseRepo();

    // O ecrã grava por aqui também os documentos que já existem: aplicam-se as regras de alteração
    if (createPurchaseDto.id) {
      const existing = await repo.findOne({ where: { id: createPurchaseDto.id }, relations: ['lines'] });
      if (existing) return this.saveExisting(existing, createPurchaseDto, user);
    }

    await this.periodControlService.ensureDateInOpenPeriod(createPurchaseDto.date, createPurchaseDto.companyId);
    const { lines, ...documentData } = createPurchaseDto;
    const { documentLines, merchandiseTotal, discountValue, taxTotal, totalValue } = this.buildLines(lines);

    const entityData: any = {
      ...documentData,
      type: documentData.documentType,
      merchandiseTotal,
      discountValue,
      taxTotal,
      totalValue,
      lines: documentLines
    };

    // Remove DTO redundant fields
    delete entityData.documentType;
    delete entityData.seriesNumber;
    delete entityData.subtotal;
    delete entityData.discounts;
    delete entityData.totalIva;
    delete entityData.total;

    // Numeração sempre pelo servidor (o número enviado pelo ecrã é ignorado); repetido em simultâneo -> número seguinte
    let savedDoc: PurchaseDocument | null = null;
    for (let attempt = 0; attempt < 5 && !savedDoc; attempt++) {
      const lastDoc = await repo.findOne({
        where: { type: entityData.type, series: entityData.series, companyId: entityData.companyId },
        order: { number: 'DESC' } as any,
      });
      entityData.number = (lastDoc?.number || 0) + 1;
      try {
        savedDoc = await repo.save(repo.create(entityData)) as unknown as PurchaseDocument;
      } catch (e) {
        if (!isUniqueViolation(e) || attempt === 4) throw e;
      }
    }

    // Emitido logo ao gravar: movimenta o stock e fica no histórico
    if (isIssued(savedDoc!.status)) {
      console.log(`[PurchasesService] Direct create trigger for ${savedDoc!.type} ${savedDoc!.series}/${savedDoc!.number} (${savedDoc!.status})`);
      const fullDoc = await this.findOne(savedDoc!.id);
      await this.createStockMovementsForPurchases(fullDoc);
      await this.workflowService.recordHistory({
        documentId: savedDoc!.id, documentType: 'PURCHASES', fromStatus: 'DRAFT', toStatus: savedDoc!.status,
        user: user || { id: 'system', name: 'Sistema' }, notes: 'Emitido ao gravar', companyId: savedDoc!.companyId,
      });
    }

    return savedDoc!;
  }

  async findAll(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getPurchaseRepo(listCompanyId);
    return repo.find({ relations: ['lines'] });
  }

  async findOne(id: string) {
    const repo = await this.getPurchaseRepo();
    const doc = await repo.findOne({ where: { id }, relations: ['lines'] });
    if (!doc) throw new NotFoundException(`Purchase document ${id} not found`);
    return doc;
  }

  async update(id: string, updatePurchaseDto: UpdatePurchaseDto, user?: any) {
    const existing = await this.findOne(id);
    return this.saveExisting(existing, updatePurchaseDto, user);
  }

  /**
   * Gravar um documento que já existe. Emitido (aprovado/lançado): só se pode anular. Anulado: não muda.
   * Rascunho/submetido/rejeitado: pode mudar, mas o tipo, a série e o número ficam os que o servidor atribuiu.
   */
  private async saveExisting(existing: PurchaseDocument, dto: any, user?: any) {
    if (existing.voidedAt) {
      throw new BadRequestException(`O documento ${this.numberOf(existing)} está anulado e não pode ser alterado.`);
    }
    if (dto.status === WorkflowStatus.REJECTED && existing.status !== WorkflowStatus.REJECTED) {
      return this.voidDocument(existing, user, dto.statusNotes || dto.voidReason);
    }
    if (isIssued(existing.status)) throw issuedLockError(this.numberOf(existing));

    if (dto.date) await this.periodControlService.ensureDateInOpenPeriod(dto.date, existing.companyId || dto.companyId);
    const repo = await this.getPurchaseRepo();
    const oldStatus = existing.status;
    // O número, a série e o tipo não mudam depois de atribuídos; os totais vêm das linhas
    const {
      lines, id: _id, companyId: _c, documentType: _dt, type: _t, series: _s, seriesNumber: _sn, number: _n, documentNumber: _d,
      voidedAt: _va, voidedBy: _vb, subtotal: _st, discounts: _di, totalIva: _ti, total: _to,
      merchandiseTotal: _mt, discountValue: _dv, taxTotal: _tt, totalValue: _tv, ...changes
    } = dto;
    repo.merge(existing, changes);
    if (Array.isArray(lines)) {
      const built = this.buildLines(lines);
      await repo.manager.createQueryBuilder().delete().from(PurchaseDocumentLine).where('"documentId" = :id', { id: existing.id }).execute();
      existing.lines = built.documentLines as any;
      Object.assign(existing, { merchandiseTotal: built.merchandiseTotal, discountValue: built.discountValue, taxTotal: built.taxTotal, totalValue: built.totalValue });
    }
    const savedDoc = await repo.save(existing) as unknown as PurchaseDocument;

    if (isIssued(savedDoc.status) && oldStatus !== savedDoc.status) {
      console.log(`[PurchasesService] Direct update trigger for ${savedDoc.type} ${savedDoc.series}/${savedDoc.number} (${savedDoc.status})`);
      const fullDoc = await this.findOne(savedDoc.id);
      await this.createStockMovementsForPurchases(fullDoc);
      await this.workflowService.recordHistory({
        documentId: savedDoc.id, documentType: 'PURCHASES', fromStatus: oldStatus, toStatus: savedDoc.status,
        user: user || { id: 'system', name: 'Sistema' }, notes: 'Emitido ao gravar', companyId: savedDoc.companyId,
      });
    }
    return savedDoc;
  }

  /** Anulação definitiva; se já estava emitido, o servidor estorna a contabilidade e o stock. */
  private async voidDocument(existing: PurchaseDocument, user: any, reason?: string) {
    const companyId = (existing.companyId || TenancyContext.getCompanyId()) as string;
    const numero = this.numberOf(existing);
    const motivo = String(reason || '').trim() || 'Anulação';
    const who = user?.username || user?.name || 'Sistema';
    if (isIssued(existing.status)) {
      const ds = await this.tenancyService.getTenantDataSource(companyId);
      await reverseJournalEntriesOf(ds, this.accountingService, {
        companyId, documentId: existing.id, sourceType: 'PURCHASE', documentNumber: numero, reason: motivo, user,
      });
      const fullDoc = await this.findOne(existing.id);
      await this.reverseStockMovementsForPurchases(fullDoc);
    }
    const repo = await this.getPurchaseRepo();
    const oldStatus = existing.status;
    existing.status = WorkflowStatus.REJECTED as any;
    existing.voidedAt = new Date();
    existing.voidedBy = who;
    existing.statusNotes = `Anulado por ${who}: ${motivo}`;
    const saved = await repo.save(existing);
    await this.workflowService.recordHistory({
      documentId: existing.id, documentType: 'PURCHASES', fromStatus: oldStatus, toStatus: WorkflowStatus.REJECTED,
      user: user || { id: 'system', name: 'Sistema' }, notes: `Anulação: ${motivo}`, companyId,
    });
    return saved;
  }

  async findByNumber(companyId: string, type: string, series: string, number: number) {
    const repo = await this.getPurchaseRepo();
    return repo.findOne({
      where: {
        companyId,
        type,
        series,
        number
      },
      relations: ['lines']
    });
  }

  async remove(id: string, user?: any) {
    const repo = await this.getPurchaseRepo();
    const document = await this.findOne(id);

    this.workflowService.checkDeleteLock(document.status as any);
    const numero = this.numberOf(document);
    if (document.voidedAt) {
      throw new BadRequestException(`O documento ${numero} está anulado: fica guardado para a numeração não ter falhas.`);
    }
    // Só o último da série se pode apagar: apagar outro deixaria uma falha na numeração
    const later = await repo.count({ where: { companyId: document.companyId, type: document.type, series: document.series, number: MoreThan(document.number) } });
    if (later > 0) {
      throw new BadRequestException(`Só se pode apagar o último documento da série. ${numero} já tem documentos a seguir: anule-o em vez de o apagar (fica registado e a numeração continua sem falhas).`);
    }

    return repo.remove(document);
  }

  async processWorkflow(id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, notes?: string) {
    const document = await this.findOne(id);
    if (document.voidedAt) throw new BadRequestException(`O documento ${this.numberOf(document)} está anulado.`);
    const repo = await this.getPurchaseRepo();

    const result = await this.workflowService.transition(
      document as unknown as WorkflowTarget,
      action,
      user,
      repo,
      'PURCHASES',
      notes
    );

    // Re-verify document after transition for stock movement triggering
    const updatedDoc = await this.findOne(id);
    if (updatedDoc.status === 'POSTED' || updatedDoc.status === 'APPROVED') {
      await this.createStockMovementsForPurchases(updatedDoc);
    }
    if (updatedDoc.status === 'REJECTED') {
      await this.reverseStockMovementsForPurchases(updatedDoc);
    }

    return result;
  }

  private async createStockMovementsForPurchases(document: PurchaseDocument) {
    await this.createStockMovementsForPurchasesOnly(document);
    // Entrada em inventário ao custo (integração stock–contabilidade; idempotente)
    await this.inventoryService.postStockAccounting({
      companyId: document.companyId, module: 'PURCHASES', docType: document.type,
      sourceDocument: document.id, reference: `${document.type} ${document.series}/${document.number}`, date: document.date,
    });
  }

  private async createStockMovementsForPurchasesOnly(document: PurchaseDocument) {
    // Check if movements already exist for this document to prevent doubles
    const existing = await this.inventoryService.findAllStockMovements(document.companyId);
    const alreadyProcessed = existing.some(m => m.sourceDocument === document.id);
    if (alreadyProcessed) {
      console.log(`[PurchasesService] Stock movements for doc ${document.type} ${document.series}/${document.number} already exist. Skipping.`);
      return;
    }

    const type = document.type;

    // Tipos de compra que movimentam stock:
    // FC (Fatura de Compra), VDC (Venda a Dinheiro de Compra) e GRC (Guia de Remessa de Compra) = entrada
    // NCC (Nota de Crédito de Compra / devolução ao fornecedor) = saída
    // NDC (Nota de Débito) e NEC (Nota de Encomenda) não movimentam stock.
    const isIn = ['FC', 'VDC', 'GRC', 'GR', 'FCOMP'].includes(type);
    const isOut = ['NCC', 'DC'].includes(type);

    console.log(`[PurchasesService] Processing movements for ${document.type} ${document.series}/${document.number}. Type: ${type}, Lines: ${document.lines?.length || 0}`);

    if (!isIn && !isOut) return;

    if (!document.lines || document.lines.length === 0) {
      console.warn(`[PurchasesService] Document ${document.type} ${document.series}/${document.number} has NO lines to process movements.`);
      return;
    }

    for (const line of document.lines) {
      const movementDto: CreateStockMovementDto = {
        date: document.date,
        articleId: line.articleId,
        companyId: document.companyId,
        articleCode: line.articleCode,
        articleName: line.articleName,
        movementType: isIn ? 'IN' : 'OUT',
        quantity: Number(line.quantity),
        // custo líquido de desconto e sem IVA, para o preço médio ponderado
        unitCost: Number(line.quantity) > 0 && Number((line as any).totalLiquid) > 0 ? Math.round((Number((line as any).totalLiquid) / Number(line.quantity)) * 10000) / 10000 : Number(line.unitPrice),
        totalCost: Number((line as any).totalLiquid) || Number(line.quantity) * Number(line.unitPrice),
        reference: `${document.type} ${document.series}/${document.number}`,
        sourceDocument: document.id,
        notes: `Gerado via ${type}`
      };

      await this.inventoryService.createStockMovement(movementDto);
    }
  }

  /** Estorna (movimentos inversos) o stock gerado por um documento de compra anulado. */
  private async reverseStockMovementsForPurchases(document: PurchaseDocument) {
    const all = await this.inventoryService.findAllStockMovements(document.companyId);
    if (all.some(m => m.sourceDocument === `${document.id}:VOID`)) return; // já estornado
    const originals = all.filter(m => m.sourceDocument === document.id);
    for (const m of originals) {
      const inverse = m.movementType === 'IN' ? 'OUT' : m.movementType === 'OUT' ? 'IN' : null;
      if (!inverse) continue;
      await this.inventoryService.createStockMovement({
        date: new Date().toISOString().slice(0, 10),
        articleId: m.articleId,
        companyId: document.companyId,
        articleCode: m.articleCode,
        articleName: m.articleName,
        warehouseId: m.warehouseId,
        movementType: inverse as any,
        quantity: Number(m.quantity),
        unitCost: 0,
        totalCost: 0,
        reference: `Anulação ${document.type} ${document.series}/${document.number}`,
        sourceDocument: `${document.id}:VOID`,
        notes: `Estorno por anulação de ${document.type} ${document.series}/${document.number}`
      } as any);
    }
    // Estorno do lançamento de stock (contas trocadas)
    await this.inventoryService.postStockAccounting({
      companyId: document.companyId, module: 'PURCHASES', docType: document.type, sourceDocument: `${document.id}:VOID`,
      reference: `Anulação ${document.type} ${document.series}/${document.number}`, date: new Date().toISOString().slice(0, 10), reverse: true,
    });
  }

  async getWorkflowHistory(id: string) {
    return this.workflowService.getHistory(id);
  }
}
