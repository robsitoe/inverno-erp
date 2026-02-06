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

@Injectable()
export class PurchasesService {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly periodControlService: PeriodControlService,
    @InjectRepository(PurchaseDocument)
    private readonly defaultPurchaseRepo: Repository<PurchaseDocument>,
    private readonly workflowService: WorkflowService,
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(companyId);
    return ds.getRepository(entity);
  }

  private async getPurchaseRepo() { return this.getRepo(PurchaseDocument, this.defaultPurchaseRepo); }

  async create(createPurchaseDto: CreatePurchaseDto) {
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
        id: line.id || `LINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    if (!entityData.id) {
      entityData.id = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
    }

    const purchase = repo.create(entityData);
    return repo.save(purchase);
  }

  async findAll(companyId?: string) {
    const repo = await this.getPurchaseRepo();
    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }
    return repo.find({ where, relations: ['lines'] });
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

    repo.merge(document, updatePurchaseDto as any);
    return repo.save(document);
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

    return this.workflowService.transition(
      document as unknown as WorkflowTarget,
      action,
      user,
      repo,
      'PURCHASES',
      notes
    );
  }

  async getWorkflowHistory(id: string) {
    return this.workflowService.getHistory(id);
  }
}
