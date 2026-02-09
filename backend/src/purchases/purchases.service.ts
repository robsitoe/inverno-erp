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

    const entityData: any = {
      ...documentData,
      type: documentData.documentType,
      number: documentData.seriesNumber,
      merchandiseTotal: documentData.subtotal || 0,
      discountValue: documentData.discounts || 0,
      taxTotal: documentData.totalIva || 0,
      totalValue: documentData.total || 0,
      lines: lines.map(line => ({
        ...line,
        totalLiquid: line.subtotal || (line.quantity * line.unitPrice),
        totalValue: line.total || (line.quantity * line.unitPrice * (1 + (line.ivaRate || 0) / 100)),
        taxRate: line.ivaRate || 0,
        taxCode: line.ivaCode || 'IVA'
      }))
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

    if (user) {
      this.workflowService.checkEditLock(document.status as any, user);
    }

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

    // Setup logic for IN/OUT based on doc type
    // FC (Fatura Compra), GR (Guia Remessa), ND (Nota Debito) = IN
    // NC (Nota Credito), DC (Devolucao) = OUT
    const isIn = ['FC', 'GR', 'ND', 'FCOMP'].includes(type);
    const isOut = ['NC', 'DC'].includes(type);

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
        unitCost: Number(line.unitPrice),
        totalCost: Number(line.totalValue),
        reference: `${document.type} ${document.series}/${document.number}`,
        sourceDocument: document.id,
        notes: `Gerado via ${type}`
      };

      await this.inventoryService.createStockMovement(movementDto);
    }
  }

  async getWorkflowHistory(id: string) {
    return this.workflowService.getHistory(id);
  }
}
