import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { WorkflowService, WorkflowTarget } from '../common/workflow.service';
import { PeriodControlService } from '../periods/period-control.service';

import { InventoryService } from '../inventory/inventory.service';
import { CreateStockMovementDto } from '../inventory/dto/create-stock-movement.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly periodControlService: PeriodControlService,
    @InjectRepository(SalesDocument)
    private readonly defaultSalesDocumentRepo: Repository<SalesDocument>,
    @InjectRepository(SalesDocumentLine)
    private readonly defaultSalesLineRepo: Repository<SalesDocumentLine>,
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

  private async getSalesDocRepo(companyId?: string) { return this.getRepo(SalesDocument, this.defaultSalesDocumentRepo, companyId); }
  private async getSalesLineRepo(companyId?: string) { return this.getRepo(SalesDocumentLine, this.defaultSalesLineRepo, companyId); }

  async create(createSalesDocumentDto: CreateSalesDocumentDto) {
    // ... (existing create logic) ...
    await this.periodControlService.ensureDateInOpenPeriod(createSalesDocumentDto.date, createSalesDocumentDto.companyId);
    const { lines, ...documentData } = createSalesDocumentDto;
    const companyId = documentData.companyId;

    const sdRepo = await this.getSalesDocRepo(companyId);
    const slRepo = await this.getSalesLineRepo(companyId);

    // Calculate totals
    let subtotal = 0;
    let totalIva = 0;
    let discounts = 0;

    const documentLines = lines.map(line => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const discount = Number(line.discount || 0);
      const ivaRate = Number(line.ivaRate || 0);

      const grossAmount = quantity * unitPrice;
      const discountAmount = grossAmount * (discount / 100);
      const netAmount = grossAmount - discountAmount;
      const ivaAmount = netAmount * (ivaRate / 100);
      const total = netAmount + ivaAmount;

      subtotal += netAmount;
      totalIva += ivaAmount;
      discounts += discountAmount;

      return slRepo.create({
        ...line,
        total,
      });
    });

    const total = subtotal + totalIva;

    let seriesNumber = documentData.seriesNumber;
    let documentNumber = documentData.documentNumber;

    // If it's a new document (no ID), we usually want to auto-generate the number
    if (!documentData.id) {
      if (!seriesNumber) {
        const lastDoc = await sdRepo.findOne({
          where: {
            documentType: documentData.documentType,
            series: documentData.series,
            companyId: documentData.companyId
          },
          order: { seriesNumber: 'DESC' } as any,
        });
        seriesNumber = (lastDoc?.seriesNumber || 0) + 1;
      }

      // Enforce documentNumber format
      if (!documentNumber || documentNumber.includes('undefined')) {
        documentNumber = `${documentData.documentType} ${documentData.series}/${seriesNumber}`;
      }
    }

    const document = sdRepo.create({
      ...documentData,
      documentNumber,
      seriesNumber,
      subtotal,
      totalIva,
      discounts,
      total,
      lines: documentLines,
    });

    const savedDoc = await sdRepo.save(document);

    // Trigger stock movements if doc is created with final status
    if (savedDoc.status === 'APPROVED' || savedDoc.status === 'POSTED') {
      console.log(`[SalesService] Document saved in tenant database. ID: ${savedDoc.id}, Company: ${companyId || 'default'}. Triggering stock movements...`);
      const fullDoc = await this.findOne(savedDoc.id, companyId);
      await this.createStockMovementsForSales(fullDoc, companyId);
    }

    return savedDoc;
  }

  // ... (findAll, findOne, update, findByNumber, remove remain same) ...
  async findAll(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const sdRepo = await this.getSalesDocRepo(listCompanyId);
    return sdRepo.find({
      order: { date: 'DESC', createdAt: 'DESC' },
      relations: ['lines']
    });
  }

  async findOne(id: string, companyId?: string) {
    const sdRepo = await this.getSalesDocRepo(companyId);
    const document = await sdRepo.findOne({
      where: { id },
      relations: ['lines']
    });
    if (!document) {
      throw new NotFoundException(`Sales Document with ID ${id} not found in database for Company: ${companyId || 'Global Context'}`);
    }
    return document;
  }

  async update(id: string, updateSalesDocumentDto: UpdateSalesDocumentDto, user?: any) {
    if (updateSalesDocumentDto.date) {
      await this.periodControlService.ensureDateInOpenPeriod(updateSalesDocumentDto.date, updateSalesDocumentDto.companyId);
    }
    const sdRepo = await this.getSalesDocRepo();
    const document = await this.findOne(id, updateSalesDocumentDto.companyId);

    if (user) {
      this.workflowService.checkEditLock(document.status, user);
    }

    const oldStatus = document.status;
    sdRepo.merge(document, updateSalesDocumentDto);
    const savedDoc = await sdRepo.save(document);

    // Trigger stock movements if status just changed to final
    if ((savedDoc.status === 'APPROVED' || savedDoc.status === 'POSTED') && oldStatus !== savedDoc.status) {
      console.log(`[SalesService] Direct update trigger for ${savedDoc.documentNumber} (${savedDoc.status})`);
      const fullDoc = await this.findOne(savedDoc.id, updateSalesDocumentDto.companyId);
      await this.createStockMovementsForSales(fullDoc, updateSalesDocumentDto.companyId);
    }

    return savedDoc;
  }

  async findByNumber(companyId: string, type: string, series: string, number: number) {
    const sdRepo = await this.getSalesDocRepo();
    const document = await sdRepo.findOne({
      where: {
        companyId,
        documentType: type,
        series,
        seriesNumber: number
      },
      relations: ['lines']
    });
    return document;
  }

  async remove(id: string, user?: any) {
    const sdRepo = await this.getSalesDocRepo();
    const document = await this.findOne(id);

    if (user) {
      this.workflowService.checkEditLock(document.status, user);
    }

    return sdRepo.remove(document);
  }

  async processWorkflow(id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, notes?: string) {
    const document = await this.findOne(id);
    const sdRepo = await this.getSalesDocRepo();

    const result = await this.workflowService.transition(
      document as unknown as WorkflowTarget,
      action,
      user,
      sdRepo,
      'SALES',
      notes
    );

    // Movements are handled inside the transition check or after.
    // However, since we added the trigger to create/update, we need to ensure 
    // it's also called here if the transition happened. 
    // The create/update logic above handles Repository.save() calls.
    // Workflow transition calls Repository.save() inside it.
    // So let's re-verify document after transition.
    const updatedDoc = await this.findOne(id, document.companyId);
    if (updatedDoc.status === 'POSTED' || updatedDoc.status === 'APPROVED') {
      await this.createStockMovementsForSales(updatedDoc, document.companyId);
    }

    return result;
  }

  private async createStockMovementsForSales(document: SalesDocument, companyId?: string) {
    // Check if movements already exist for this document to prevent doubles
    const targetId = companyId || document.companyId;
    const existing = await this.inventoryService.findAllStockMovements(targetId);
    const alreadyProcessed = existing.some(m => m.sourceDocument === document.id);
    if (alreadyProcessed) {
      console.log(`[SalesService] Stock movements for doc ${document.documentNumber} already exist. Skipping.`);
      return;
    }

    // Logic to determine if this doc type moves stock
    const type = document.documentType;
    const isOut = ['FA', 'FR', 'VD', 'FS', 'GT'].includes(type);
    const isIn = ['NC', 'DC'].includes(type);

    console.log(`[SalesService] Processing movements for ${document.documentNumber}. Type: ${type}, Lines: ${document.lines?.length || 0}`);

    if (!isOut && !isIn) return;

    if (!document.lines || document.lines.length === 0) {
      console.warn(`[SalesService] Document ${document.documentNumber} has NO lines to process movements.`);
      return;
    }

    for (const line of document.lines) {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice || 0);

      const movementDto: CreateStockMovementDto = {
        date: document.date,
        articleId: line.articleId,
        companyId: document.companyId,
        articleCode: line.articleCode,
        articleName: line.articleName,
        movementType: isOut ? 'OUT' : 'IN',
        quantity: quantity,
        unitCost: unitPrice,
        totalCost: quantity * unitPrice,
        reference: document.documentNumber,
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
