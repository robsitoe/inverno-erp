import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseDocument } from './entities/purchase.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { WorkflowService, WorkflowTarget } from '../common/workflow.service';
import { PeriodControlService } from '../periods/period-control.service';

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
    private readonly inventoryService: InventoryService
  ) { }

  // ... (getRepo methods remain same) ...
  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>, companyId?: string): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  private async getPurchaseRepo(companyId?: string) { return this.getRepo(PurchaseDocument, this.defaultPurchaseRepo, companyId); }

  async create(createPurchaseDto: CreatePurchaseDto) {
    // ... existing create logic ...
    await this.periodControlService.ensureDateInOpenPeriod(createPurchaseDto.date, createPurchaseDto.companyId);
    const { lines, ...documentData } = createPurchaseDto;
    const repo = await this.getPurchaseRepo();

    // Totais calculados a partir das linhas (mesma fórmula do formulário de compras),
    // para não depender dos totais enviados pelo cliente.
    let merchandiseTotal = 0;
    let discountValue = 0;
    let taxTotal = 0;
    const documentLines = lines.map(line => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const taxRate = Number(line.ivaRate || 0);
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
        taxCode: line.ivaCode || 'IVA'
      };
    });

    const entityData: any = {
      ...documentData,
      type: documentData.documentType,
      number: documentData.seriesNumber,
      merchandiseTotal,
      discountValue,
      taxTotal,
      totalValue: merchandiseTotal - discountValue + taxTotal,
      lines: documentLines
    };

    // Remove DTO redundant fields
    delete entityData.documentType;
    delete entityData.seriesNumber;
    delete entityData.subtotal;
    delete entityData.discounts;
    delete entityData.totalIva;
    delete entityData.total;

    if (!entityData.number) {
      const lastDoc = await repo.findOne({
        where: {
          type: entityData.type,
          series: entityData.series,
          companyId: entityData.companyId
        },
        order: { number: 'DESC' } as any,
      });
      entityData.number = (lastDoc?.number || 0) + 1;
    }

    if (!entityData.documentNumber || entityData.documentNumber.includes('undefined')) {
      entityData.documentNumber = `${entityData.type} ${entityData.series}/${entityData.number}`;
    }

    const purchase = repo.create(entityData);
    const savedDoc = await repo.save(purchase) as unknown as PurchaseDocument;

    // Trigger stock movements if doc is created with final status
    if (savedDoc.status === 'APPROVED' || savedDoc.status === 'POSTED') {
      console.log(`[PurchasesService] Direct create trigger for ${savedDoc.type} ${savedDoc.series}/${savedDoc.number} (${savedDoc.status})`);
      const fullDoc = await this.findOne(savedDoc.id);
      await this.createStockMovementsForPurchases(fullDoc);
    }

    return savedDoc;
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
    if ((updatePurchaseDto as any).date) {
      await this.periodControlService.ensureDateInOpenPeriod((updatePurchaseDto as any).date, (updatePurchaseDto as any).companyId);
    }
    const repo = await this.getPurchaseRepo();
    const document = await this.findOne(id);

    if (user) {
      this.workflowService.checkEditLock(document.status as any, user);
    }

    const oldStatus = document.status;
    repo.merge(document, updatePurchaseDto as any);
    const savedDoc = await repo.save(document) as unknown as PurchaseDocument;

    // Documento anulado depois de ter movimentado stock: estorna os movimentos
    if (savedDoc.status === 'REJECTED' && (oldStatus === 'APPROVED' || oldStatus === 'POSTED')) {
      const fullDoc = await this.findOne(savedDoc.id);
      await this.reverseStockMovementsForPurchases(fullDoc);
    }
    // Trigger stock movements if status just changed to final
    if ((savedDoc.status === 'APPROVED' || savedDoc.status === 'POSTED') && oldStatus !== savedDoc.status) {
      console.log(`[PurchasesService] Direct update trigger for ${savedDoc.type} ${savedDoc.series}/${savedDoc.number} (${savedDoc.status})`);
      const fullDoc = await this.findOne(savedDoc.id);
      await this.createStockMovementsForPurchases(fullDoc);
    }

    return savedDoc;
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

    return repo.remove(document);
  }

  async processWorkflow(id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, notes?: string) {
    const document = await this.findOne(id);
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
  }

  async getWorkflowHistory(id: string) {
    return this.workflowService.getHistory(id);
  }
}
