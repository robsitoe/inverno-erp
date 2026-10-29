import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { AccountingService } from '../accounting/accounting.service';

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
    private readonly accountingService: AccountingService,
  ) { }

  /** Lançamento do vale: débito da despesa (ou adiantamento ao pessoal) e crédito da caixa. */
  private async postVoucher(v: PettyCashVoucher, cid: string, reverse = false) {
    const debit = reverse ? v.cashAccount : v.debitAccount;
    const credit = reverse ? v.debitAccount : v.cashAccount;
    const text = `${reverse ? 'Anulação do vale' : 'Vale de caixa'} Nº ${v.number} — ${v.titularName || ''}${v.reason ? ' — ' + v.reason : ''}`.slice(0, 250);
    const amount = Math.round((Number(v.amount) || 0) * 100) / 100;
    const ds = await this.tenancyService.getTenantDataSource(cid);
    const journals = await ds.query(`SELECT id, type FROM journals`).catch(() => []);
    const journal = journals.find((j: any) => j.type === 'CASH') || journals.find((j: any) => j.type === 'GENERAL') || journals[0];
    return this.accountingService.createJournalEntry({
      id: `JE-VAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`, companyId: cid, journalId: journal?.id,
      date: reverse ? new Date().toISOString().slice(0, 10) : String(v.date).slice(0, 10),
      description: text, reference: `VALE ${v.number}`, sourceDocument: reverse ? `${v.id}:VOID` : v.id, sourceType: 'VOUCHER',
      status: 'POSTED', createdBy: v.issuedBy || 'tesouraria', relatedEntryId: reverse ? v.journalEntryId : undefined,
      lines: [
        { id: `JL-VAL-${Date.now()}-d`, accountId: debit, description: text, debit: amount, credit: 0 },
        { id: `JL-VAL-${Date.now()}-c`, accountId: credit, description: text, debit: 0, credit: amount },
      ],
    } as any);
  }

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

    this.workflowService.checkDeleteLock(document.status as any);

    return repo.remove(document);
  }

  /**
   * Anula um recibo/pagamento: o documento mantém o número e fica com o estado REJECTED
   * (anulado) e o motivo; deixa de liquidar documentos. O estorno contabilístico é feito
   * pelo cliente através do lançamento de estorno.
   */
  async voidDocument(id: string, reason: string, user?: any) {
    if (!reason || !reason.trim()) throw new BadRequestException('O motivo da anulação é obrigatório.');
    const repo = await this.getTreasuryRepo();
    const doc = await this.findOne(id);
    if (String(doc.status) === 'REJECTED') throw new BadRequestException('Este documento já está anulado.');
    await this.periodControlService.ensureDateInOpenPeriod(doc.date, doc.companyId);
    doc.status = 'REJECTED' as any;
    doc.statusNotes = `Anulado${user?.username ? ' por ' + user.username : ''}: ${reason.trim()}`;
    return repo.save(doc);
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


  /** As linhas de recibo/pagamento chegam sem id; a chave primaria e manual, por isso atribui-se aqui. */
  private withLineIds(data: any) {
    const stamp = Date.now();
    const lines = Array.isArray(data?.lines) ? data.lines.map((l: any, i: number) => ({ ...l, id: l.id || `${data.id || 'DOC'}-L${i + 1}-${stamp}` })) : data?.lines;
    return { ...data, lines };
  }

  async createReceipt(data: any) {
    await this.periodControlService.ensureDateInOpenPeriod(data.date, data.companyId);
    const repo = await this.getTreasuryRepo();
    const receipt = repo.create({ ...this.withLineIds(data), type: TreasuryDocumentType.RECEIPT });
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
    const payment = repo.create({ ...this.withLineIds(data), type: TreasuryDocumentType.PAYMENT });
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

      if (!(Number(data.amount) > 0)) throw new BadRequestException('O valor do vale tem de ser maior que zero.');
      const debitAccount = String(data.debitAccount || (data.isPersonalAdvance ? '4.5.1.2' : '')).trim();
      if (!debitAccount) throw new BadRequestException('Indique a conta da despesa (a débito) do vale.');

      const vId = `PCV-${Date.now()}-${cid}`;
      const voucher = repo.create({
        ...data,
        id: vId,
        number: res.number,
        companyId: cid,
        debitAccount,
        cashAccount: String(data.cashAccount || '1.1').trim(),
        issuedBy: user?.name || user?.username || 'Sistema'
      });
      const saved = await repo.save(voucher) as unknown as PettyCashVoucher;
      // Lançamento: se falhar (ex.: conta inválida), o vale não fica emitido sem contabilidade
      try {
        const je = await this.postVoucher(saved, cid);
        saved.journalEntryId = je.id;
        return await repo.save(saved);
      } catch (e) {
        await repo.delete(saved.id);
        throw e;
      }
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
    const cid = id.split('-').slice(2).join('-') || TenancyContext.getCompanyId();
    const repo = await this.getPettyCashVoucherRepo(cid);
    return repo.findOne({ where: { id } });
  }

  async updateVoucher(id: string, data: any) {
    const cid = data.companyId || id.split('-').slice(2).join('-') || TenancyContext.getCompanyId();
    if (data.date) {
      await this.periodControlService.ensureDateInOpenPeriod(data.date, cid);
    }
    const repo = await this.getPettyCashVoucherRepo(cid);
    const doc = await repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Vale não encontrado');
    const wasCancelled = String(doc.status).toUpperCase() === 'CANCELLED';
    // Depois de lançado, o valor e as contas só se corrigem anulando e emitindo outro vale
    if (doc.journalEntryId && ['amount', 'debitAccount', 'cashAccount', 'date'].some(k => data[k] !== undefined && String(data[k]) !== String((doc as any)[k]))) {
      throw new BadRequestException('O vale já está lançado: o valor, a data e as contas não se alteram. Anule-o e emita um novo.');
    }
    repo.merge(doc, data);
    const saved = await repo.save(doc);
    // Anulação: estorno do lançamento (uma única vez)
    if (!wasCancelled && String(saved.status).toUpperCase() === 'CANCELLED' && saved.journalEntryId && !saved.reversalEntryId) {
      const je = await this.postVoucher(saved, cid, true);
      saved.reversalEntryId = je.id;
      return repo.save(saved);
    }
    return saved;
  }

  async removeVoucher(id: string) {
    const cid = id.split('-').slice(2).join('-') || TenancyContext.getCompanyId();
    const repo = await this.getPettyCashVoucherRepo(cid);
    const doc = await repo.findOne({ where: { id } });
    if (doc?.journalEntryId) throw new BadRequestException('O vale já está lançado na contabilidade: não pode ser apagado. Anule-o.');
    return repo.delete(id);
  }
}
