import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
import { TreasuryDocument, TreasuryDocumentType } from './entities/treasury.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PettyCashVoucher } from './entities/petty-cash-voucher.entity';
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
    @InjectRepository(PettyCashVoucher)
    private readonly defaultPettyCashVoucherRepo: Repository<PettyCashVoucher>,
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
  private async getPettyCashVoucherRepo(companyId?: string) { return this.getRepo(PettyCashVoucher, this.defaultPettyCashVoucherRepo, companyId); }

  // ── Treasury Documents ─────────────────────────────────────────────────────

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

  // ── Petty Cash Vouchers ────────────────────────────────────────────────────
  async getNextVoucherNumber(companyId: string) {
    const repo = await this.getPettyCashVoucherRepo(companyId);
    const year = new Date().getFullYear();

    // Find last vouchers for this year
    const all = await repo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 20
    });

    let nextSeq = 1;
    const lastWithYear = all.find(v => v.number && typeof v.number === 'string' && v.number.startsWith(`${year}/`));
    if (lastWithYear) {
      const parts = lastWithYear.number.split('/');
      const lastSeq = parseInt(parts[1]);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return { number: `${year}/${nextSeq.toString().padStart(3, '0')}` };
  }

  async createVoucher(data: any, user?: any) {
    try {
      const cid = data.companyId || TenancyContext.getCompanyId();
      await this.periodControlService.ensureDateInOpenPeriod(data.date, cid);

      const res = await this.getNextVoucherNumber(cid);
      const repo = await this.getPettyCashVoucherRepo(cid);

      const vId = `PCV-${Date.now()}-${cid}`;
      const voucher = repo.create({
        ...data,
        id: vId,
        number: res.number,
        companyId: cid,
        issuedBy: user?.name || user?.username || 'Sistema'
      });
      return await repo.save(voucher);
    } catch (error) {
      console.error('[TreasuryService] Error creating voucher:', error);
      throw error;
    }
  }

  async findAllVouchers(companyId?: string) {
    try {
      const cid = companyId || TenancyContext.getCompanyId();
      if (!cid) return []; // No company context, return empty

      const repo = await this.getPettyCashVoucherRepo(cid);
      return await repo.find({ where: { companyId: cid }, order: { number: 'DESC' } });
    } catch (error) {
      console.error('[TreasuryService] Error listing vouchers:', error);
      throw error;
    }
  }

  async findOneVoucher(id: string) {
    const cid = id.split('-')[2] || TenancyContext.getCompanyId();
    const repo = await this.getPettyCashVoucherRepo(cid);
    return repo.findOne({ where: { id } });
  }

  async updateVoucher(id: string, data: any) {
    const cid = data.companyId || id.split('-')[2] || TenancyContext.getCompanyId();
    if (data.date) {
      await this.periodControlService.ensureDateInOpenPeriod(data.date, cid);
    }
    const repo = await this.getPettyCashVoucherRepo(cid);
    const doc = await repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Vale não encontrado');
    repo.merge(doc, data);
    return repo.save(doc);
  }

  async removeVoucher(id: string) {
    const repo = await this.getPettyCashVoucherRepo();
    return repo.delete(id);
  }
}
