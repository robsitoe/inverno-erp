import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
import { TreasuryDocument, TreasuryDocumentType } from './entities/treasury.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { WorkflowService, WorkflowTarget } from '../common/workflow.service';
import { PeriodControlService } from '../periods/period-control.service';

@Injectable()
export class TreasuryService {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly periodControlService: PeriodControlService,
    @InjectRepository(TreasuryDocument)
    private readonly defaultTreasuryRepo: Repository<TreasuryDocument>,
    @InjectRepository(PaymentMethod)
    private readonly defaultPaymentMethodRepo: Repository<PaymentMethod>,
    private readonly workflowService: WorkflowService,
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>, companyId?: string): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  private async getTreasuryRepo(companyId?: string) { return this.getRepo(TreasuryDocument, this.defaultTreasuryRepo, companyId); }
  private async getPaymentMethodRepo(companyId?: string) { return this.getRepo(PaymentMethod, this.defaultPaymentMethodRepo, companyId); }

  async create(createTreasuryDto: CreateTreasuryDto) {
    await this.periodControlService.ensureDateInOpenPeriod(createTreasuryDto.date, createTreasuryDto.companyId);
    const repo = await this.getTreasuryRepo();
    const treasury = repo.create(createTreasuryDto);
    return repo.save(treasury);
  }

  async findAll(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getTreasuryRepo(listCompanyId);
    return repo.find({ relations: ['lines'] });
  }


  async findOne(id: string) {
    const repo = await this.getTreasuryRepo();
    const doc = await repo.findOne({ where: { id }, relations: ['lines'] });
    if (!doc) throw new NotFoundException('Documento de tesouraria não encontrado');
    return doc;
  }

  async update(id: string, updateTreasuryDto: UpdateTreasuryDto, user?: any) {
    if ((updateTreasuryDto as any).date) {
      await this.periodControlService.ensureDateInOpenPeriod((updateTreasuryDto as any).date, (updateTreasuryDto as any).companyId);
    }
    const repo = await this.getTreasuryRepo();
    const document = await this.findOne(id);

    if (user) {
      this.workflowService.checkEditLock(document.status as any, user);
    }

    repo.merge(document, updateTreasuryDto as any);
    return repo.save(document);
  }

  async remove(id: string, user?: any) {
    const repo = await this.getTreasuryRepo();
    const document = await this.findOne(id);

    if (user) {
      this.workflowService.checkEditLock(document.status as any, user);
    }

    return repo.remove(document);
  }

  async processWorkflow(id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, notes?: string) {
    const document = await this.findOne(id);
    const repo = await this.getTreasuryRepo();

    return this.workflowService.transition(
      document as unknown as WorkflowTarget,
      action,
      user,
      repo,
      'TREASURY',
      notes
    );
  }

  async getWorkflowHistory(id: string) {
    return this.workflowService.getHistory(id);
  }

  async findAllReceipts(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getTreasuryRepo(listCompanyId);
    return repo.find({
      where: { type: TreasuryDocumentType.RECEIPT },
      relations: ['lines']
    });
  }


  async createReceipt(data: any) {
    await this.periodControlService.ensureDateInOpenPeriod(data.date, data.companyId);
    const repo = await this.getTreasuryRepo();
    const receipt = repo.create({ ...data, type: TreasuryDocumentType.RECEIPT });
    return repo.save(receipt);
  }

  async findAllPayments(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getTreasuryRepo(listCompanyId);
    return repo.find({
      where: { type: TreasuryDocumentType.PAYMENT },
      relations: ['lines']
    });
  }


  async createPayment(data: any) {
    await this.periodControlService.ensureDateInOpenPeriod(data.date, data.companyId);
    const repo = await this.getTreasuryRepo();
    const payment = repo.create({ ...data, type: TreasuryDocumentType.PAYMENT });
    return repo.save(payment);
  }

  // Payment Methods
  async savePaymentMethod(data: Partial<PaymentMethod>) {
    const repo = await this.getPaymentMethodRepo();
    return repo.save(data);
  }

  async findAllPaymentMethods(companyId?: string) {
    const repo = await this.getPaymentMethodRepo();
    if (companyId) {
      return repo.find({
        where: { companyId },
        order: { sortOrder: 'ASC' }
      });
    }
    return repo.find({ order: { sortOrder: 'ASC' } });
  }

  async removePaymentMethod(id: string) {
    const repo = await this.getPaymentMethodRepo();
    return repo.delete(id);
  }
}
