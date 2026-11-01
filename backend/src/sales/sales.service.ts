import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral, LessThan, MoreThan } from 'typeorm';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { WorkflowService, WorkflowTarget } from '../common/workflow.service';
import { PeriodControlService } from '../periods/period-control.service';
import { WorkflowStatus } from '../common/enums/workflow-status.enum';
import { AccountingService } from '../accounting/accounting.service';
import { assertDateBetween, isIssued, issuedLockError, isUniqueViolation, reverseJournalEntriesOf } from '../common/document-integrity';

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

  private async getSalesDocRepo(companyId?: string) { return this.getRepo(SalesDocument, this.defaultSalesDocumentRepo, companyId); }
  private async getSalesLineRepo(companyId?: string) { return this.getRepo(SalesDocumentLine, this.defaultSalesLineRepo, companyId); }

  /** Linhas e totais calculados a partir das linhas (o servidor não confia nos totais enviados). */
  private buildLines(slRepo: Repository<SalesDocumentLine>, lines: any[]) {
    let subtotal = 0;
    let totalIva = 0;
    let discounts = 0;
    const documentLines = (lines || []).map(line => {
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

      return slRepo.create({ ...line, total } as Partial<SalesDocumentLine>) as SalesDocumentLine;
    });
    return { documentLines, subtotal, totalIva, discounts, total: subtotal + totalIva };
  }

  async create(createSalesDocumentDto: CreateSalesDocumentDto, user?: any) {
    const companyId = createSalesDocumentDto.companyId || TenancyContext.getCompanyId();
    const sdRepo = await this.getSalesDocRepo(companyId);

    // O ecrã grava por aqui também os documentos que já existem: aplicam-se as regras de alteração
    if (createSalesDocumentDto.id) {
      const existing = await sdRepo.findOne({ where: { id: createSalesDocumentDto.id }, relations: ['lines'] });
      if (existing) return this.saveExisting(existing, createSalesDocumentDto, user);
    }

    await this.periodControlService.ensureDateInOpenPeriod(createSalesDocumentDto.date, companyId);
    const { lines, ...documentData } = createSalesDocumentDto;
    const slRepo = await this.getSalesLineRepo(companyId);
    const { documentLines, subtotal, totalIva, discounts, total } = this.buildLines(slRepo, lines);

    // Numeração sempre pelo servidor: o número seguinte da empresa, tipo e série (o número enviado pelo ecrã é ignorado).
    // Se dois postos gravarem ao mesmo tempo, o índice único recusa o repetido e usa-se o número seguinte.
    let savedDoc: SalesDocument | null = null;
    for (let attempt = 0; attempt < 5 && !savedDoc; attempt++) {
      const last = await sdRepo.findOne({
        where: { documentType: documentData.documentType, series: documentData.series, companyId },
        order: { seriesNumber: 'DESC' } as any,
      });
      if (attempt === 0) assertDateBetween(documentData.date, last);
      const seriesNumber = (last?.seriesNumber || 0) + 1;
      const document = sdRepo.create({
        ...documentData,
        companyId,
        seriesNumber,
        documentNumber: `${documentData.documentType} ${documentData.series}/${seriesNumber}`,
        subtotal,
        totalIva,
        discounts,
        total,
        lines: documentLines,
      });
      try {
        savedDoc = await sdRepo.save(document);
      } catch (e) {
        if (!isUniqueViolation(e) || attempt === 4) throw e;
      }
    }

    // Emitido logo ao gravar: movimenta o stock e fica no histórico
    if (isIssued(savedDoc!.status)) {
      console.log(`[SalesService] Document saved in tenant database. ID: ${savedDoc!.id}, Company: ${companyId || 'default'}. Triggering stock movements...`);
      const fullDoc = await this.findOne(savedDoc!.id, companyId);
      await this.createStockMovementsForSales(fullDoc, companyId);
      await this.workflowService.recordHistory({
        documentId: savedDoc!.id, documentType: 'SALES', fromStatus: 'DRAFT', toStatus: savedDoc!.status,
        user: user || { id: 'system', name: 'Sistema' }, notes: 'Emitido ao gravar', companyId,
      });
    }

    return savedDoc!;
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
    const existing = await this.findOne(id, (updateSalesDocumentDto as any).companyId);
    return this.saveExisting(existing, updateSalesDocumentDto, user);
  }

  /**
   * Gravar um documento que já existe. Emitido (aprovado/lançado): só se pode anular. Anulado: não muda.
   * Rascunho/submetido/rejeitado: pode mudar, mas o tipo, a série e o número ficam os que o servidor atribuiu.
   */
  private async saveExisting(existing: SalesDocument, dto: any, user?: any) {
    const companyId = existing.companyId || dto.companyId || TenancyContext.getCompanyId();
    if (existing.voidedAt) {
      throw new BadRequestException(`O documento ${existing.documentNumber} está anulado e não pode ser alterado.`);
    }
    // Pedido de anulação: o ecrã envia o documento com o estado REJECTED
    if (dto.status === WorkflowStatus.REJECTED && existing.status !== WorkflowStatus.REJECTED) {
      return this.voidDocument(existing, user, dto.statusNotes || dto.voidReason);
    }
    if (isIssued(existing.status)) throw issuedLockError(existing.documentNumber);

    const sdRepo = await this.getSalesDocRepo(companyId);
    const slRepo = await this.getSalesLineRepo(companyId);
    if (dto.date) {
      await this.periodControlService.ensureDateInOpenPeriod(dto.date, companyId);
      // A data tem de ficar entre o documento anterior e o seguinte da série
      const same = { companyId, documentType: existing.documentType, series: existing.series };
      const [prev, next] = await Promise.all([
        sdRepo.findOne({ where: { ...same, seriesNumber: LessThan(existing.seriesNumber) }, order: { seriesNumber: 'DESC' } as any }),
        sdRepo.findOne({ where: { ...same, seriesNumber: MoreThan(existing.seriesNumber) }, order: { seriesNumber: 'ASC' } as any }),
      ]);
      assertDateBetween(dto.date, prev, next);
    }

    const oldStatus = existing.status;
    // O número, a série e o tipo não mudam depois de atribuídos; os totais vêm das linhas
    const {
      lines, id: _id, companyId: _c, documentType: _t, series: _s, seriesNumber: _n, documentNumber: _d,
      voidedAt: _va, voidedBy: _vb, subtotal: _st, totalIva: _ti, discounts: _di, total: _to, ...changes
    } = dto;
    sdRepo.merge(existing, changes);
    if (Array.isArray(lines)) {
      const built = this.buildLines(slRepo, lines);
      await slRepo.createQueryBuilder().delete().from(SalesDocumentLine).where('"documentId" = :id', { id: existing.id }).execute();
      existing.lines = built.documentLines;
      Object.assign(existing, { subtotal: built.subtotal, totalIva: built.totalIva, discounts: built.discounts, total: built.total });
    }
    const savedDoc = await sdRepo.save(existing);

    // Emitido agora: movimenta o stock e fica no histórico
    if (isIssued(savedDoc.status) && oldStatus !== savedDoc.status) {
      console.log(`[SalesService] Direct update trigger for ${savedDoc.documentNumber} (${savedDoc.status})`);
      const fullDoc = await this.findOne(savedDoc.id, companyId);
      await this.createStockMovementsForSales(fullDoc, companyId);
      await this.workflowService.recordHistory({
        documentId: savedDoc.id, documentType: 'SALES', fromStatus: oldStatus, toStatus: savedDoc.status,
        user: user || { id: 'system', name: 'Sistema' }, notes: 'Emitido ao gravar', companyId,
      });
    }
    return savedDoc;
  }

  /**
   * Anulação definitiva: o documento fica no sistema e na numeração, com quem e quando anulou.
   * Se já estava emitido, o servidor estorna a contabilidade e o stock (antes de o marcar como anulado).
   */
  private async voidDocument(existing: SalesDocument, user: any, reason?: string) {
    const companyId = (existing.companyId || TenancyContext.getCompanyId()) as string;
    const motivo = String(reason || '').trim() || 'Anulação';
    const who = user?.username || user?.name || 'Sistema';
    if (isIssued(existing.status)) {
      const ds = await this.tenancyService.getTenantDataSource(companyId);
      await reverseJournalEntriesOf(ds, this.accountingService, {
        companyId, documentId: existing.id, sourceType: 'SALE', documentNumber: existing.documentNumber, reason: motivo, user,
      });
      const fullDoc = await this.findOne(existing.id, companyId);
      await this.reverseStockMovementsForSales(fullDoc, companyId);
    }
    const sdRepo = await this.getSalesDocRepo(companyId);
    const oldStatus = existing.status;
    existing.status = WorkflowStatus.REJECTED;
    existing.voidedAt = new Date();
    existing.voidedBy = who;
    existing.statusNotes = `Anulado por ${who}: ${motivo}`;
    const saved = await sdRepo.save(existing);
    await this.workflowService.recordHistory({
      documentId: existing.id, documentType: 'SALES', fromStatus: oldStatus, toStatus: WorkflowStatus.REJECTED,
      user: user || { id: 'system', name: 'Sistema' }, notes: `Anulação: ${motivo}`, companyId,
    });
    return saved;
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

    this.workflowService.checkDeleteLock(document.status);
    if (document.voidedAt) {
      throw new BadRequestException(`O documento ${document.documentNumber} está anulado: fica guardado para a numeração não ter falhas.`);
    }
    // Só o último da série se pode apagar: apagar outro deixaria uma falha na numeração
    const later = await sdRepo.count({
      where: { companyId: document.companyId, documentType: document.documentType, series: document.series, seriesNumber: MoreThan(document.seriesNumber) },
    });
    if (later > 0) {
      throw new BadRequestException(`Só se pode apagar o último documento da série. ${document.documentNumber} já tem documentos a seguir: anule-o em vez de o apagar (fica registado e a numeração continua sem falhas).`);
    }

    return sdRepo.remove(document);
  }

  async processWorkflow(id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, notes?: string) {
    const document = await this.findOne(id);
    if (document.voidedAt) throw new BadRequestException(`O documento ${document.documentNumber} está anulado.`);
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
    await this.createStockMovementsForSalesOnly(document, companyId);
    // Custo das mercadorias vendidas (integração stock–contabilidade; idempotente)
    await this.inventoryService.postStockAccounting({
      companyId: companyId || document.companyId, module: 'SALES', docType: document.documentType,
      sourceDocument: document.id, reference: document.documentNumber, date: document.date,
    });
  }

  /**
   * Estorna o stock de um documento de venda anulado: movimentos inversos ao custo a que saíram
   * e lançamento do custo espelhado (integração stock–contabilidade).
   */
  private async reverseStockMovementsForSales(document: SalesDocument, companyId?: string) {
    const cid = companyId || document.companyId;
    const all = await this.inventoryService.findAllStockMovements(cid);
    if (!all.some(m => m.sourceDocument === `${document.id}:VOID`)) {
      for (const m of all.filter(x => x.sourceDocument === document.id)) {
        const inverse = m.movementType === 'IN' ? 'OUT' : m.movementType === 'OUT' ? 'IN' : null;
        if (!inverse) continue;
        await this.inventoryService.createStockMovement({
          date: new Date().toISOString().slice(0, 10),
          articleId: m.articleId,
          companyId: cid,
          articleCode: m.articleCode,
          articleName: m.articleName,
          warehouseId: m.warehouseId,
          movementType: inverse as any,
          quantity: Number(m.quantity),
          // a mercadoria regressa ao custo a que saiu (entrada com custo: lote FIFO / custo médio)
          unitCost: Number(m.unitCost) || 0,
          totalCost: Number(m.totalCost) || 0,
          reference: `Anulação ${document.documentNumber}`,
          sourceDocument: `${document.id}:VOID`,
          notes: `Estorno por anulação de ${document.documentNumber}`,
        } as any);
      }
    }
    await this.inventoryService.postStockAccounting({
      companyId: cid, module: 'SALES', docType: document.documentType, sourceDocument: `${document.id}:VOID`,
      reference: `Anulação ${document.documentNumber}`, date: new Date().toISOString().slice(0, 10), reverse: true,
    });
  }

  private async createStockMovementsForSalesOnly(document: SalesDocument, companyId?: string) {
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
        unitCost: 0, // valorizado ao PMP pelo InventoryService
        totalCost: 0,
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
