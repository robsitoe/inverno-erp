import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { Account } from './entities/account.entity';
import { JournalEntry, JournalLine } from './entities/journal-entry.entity';

import { EntityTarget, ObjectLiteral } from 'typeorm';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { ACCOUNT_PRESETS } from './accounting-presets';
import { PeriodControlService } from '../periods/period-control.service';

interface AccountingMvpRecord {
  id: string;
  code?: string;
  description?: string;
  active?: boolean;
  period?: { fromDate?: string; toDate?: string };
  createdAt: string;
}

interface PeriodCloseRecord {
  id: string;
  year: number;
  month: number;
  status: 'CLOSED';
  createdAt: string;
}

@Injectable()
export class AccountingService {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly periodControlService: PeriodControlService,
    @InjectRepository(Account)
    private readonly defaultAccountRepo: Repository<Account>,
    @InjectRepository(JournalEntry)
    private readonly defaultJournalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly defaultJournalLineRepo: Repository<JournalLine>,
  ) { }


  private readonly costCenters: AccountingMvpRecord[] = [];
  private readonly periodClosures: PeriodCloseRecord[] = [];


  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) {
      console.warn(`[AccountingService] No companyId in context, using default repository for ${entity.toString()}`);
      return defaultRepo;
    }

    try {
      const ds = await this.tenancyService.getTenantDataSource(companyId);
      return ds.getRepository(entity);
    } catch (err: any) {
      console.error(`[AccountingService] Error getting tenant repository for company ${companyId}:`, err.message);
      throw err;
    }
  }

  private async getAccountRepo() { return this.getRepo(Account, this.defaultAccountRepo); }
  private async getJournalEntryRepo() { return this.getRepo(JournalEntry, this.defaultJournalEntryRepo); }
  private async getJournalLineRepo() { return this.getRepo(JournalLine, this.defaultJournalLineRepo); }

  // Accounts

  async create(createAccountDto: CreateAccountDto | CreateAccountDto[]) {
    try {
      const repo = await this.getAccountRepo();
      if (Array.isArray(createAccountDto)) {
        const accounts = repo.create(createAccountDto);
        return await repo.save(accounts);
      }
      const account = repo.create(createAccountDto);
      return await repo.save(account);
    } catch (error) {
      console.error('Error saving account(s):', error);
      throw new BadRequestException(`Failed to save account: ${error.message}`);
    }
  }

  async findAll(companyId?: string) {
    const repo = await this.getAccountRepo();
    if (companyId) {
      return repo.find({
        where: { companyId },
        order: { code: 'ASC' }
      });
    }
    return repo.find({ order: { code: 'ASC' } });
  }


  async findOne(id: string) {
    const repo = await this.getAccountRepo();
    const account = await repo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto) {
    console.log(`Updating account ${id}:`, updateAccountDto);
    const repo = await this.getAccountRepo();
    const account = await this.findOne(id);
    repo.merge(account, updateAccountDto);
    return repo.save(account);
  }


  async remove(id: string) {
    const repo = await this.getAccountRepo();
    const account = await this.findOne(id);
    return repo.remove(account);
  }

  // Journal Entries

  async createJournalEntry(createJournalEntryDto: CreateJournalEntryDto) {
    const { lines } = createJournalEntryDto;

    await this.periodControlService.ensureDateInOpenPeriod(createJournalEntryDto.date, createJournalEntryDto.companyId);

    // Validate that debits equal credits
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(`Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    const jeRepo = await this.getJournalEntryRepo();
    const jlRepo = await this.getJournalLineRepo();

    const journalEntry = jeRepo.create({
      ...createJournalEntryDto,
      lines: lines.map(line => jlRepo.create(line)),
    });

    return jeRepo.save(journalEntry);
  }

  async findAllJournalEntries(companyId?: string) {
    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }
    const repo = await this.getJournalEntryRepo();
    return repo.find({
      where,
      relations: ['lines'],
      order: { date: 'DESC', createdAt: 'DESC' }
    });
  }


  async findOneJournalEntry(id: string) {
    const repo = await this.getJournalEntryRepo();
    const entry = await repo.findOne({
      where: { id },
      relations: ['lines']
    });
    if (!entry) {
      throw new NotFoundException(`Journal Entry with ID ${id} not found`);
    }
    return entry;
  }

  async getAccountStatement(accountId: string, fromDate?: string, toDate?: string, companyId?: string, includeDrafts: boolean = false) {
    const accRepo = await this.getAccountRepo();
    const account = await accRepo.findOne({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Conta não encontrada');

    const isAssetSide = ['ASSET', 'EXPENSE'].includes(account.type);
    const balanceExpression = isAssetSide
      ? 'SUM(CAST(line.debit AS DECIMAL) - CAST(line.credit AS DECIMAL))'
      : 'SUM(CAST(line.credit AS DECIMAL) - CAST(line.debit AS DECIMAL))';

    const statuses = includeDrafts ? ['POSTED', 'DRAFT'] : ['POSTED'];

    const jlRepo = await this.getJournalLineRepo();

    // 1. Calculate Initial Balance
    const initialBalanceQuery = jlRepo.createQueryBuilder('line')
      .leftJoin('line.journalEntry', 'entry')
      .select(balanceExpression, 'balance')
      .where('line.accountId = :accountId', { accountId })
      .andWhere('entry.status IN (:...statuses)', { statuses });

    if (companyId) {
      initialBalanceQuery.andWhere('entry.companyId = :companyId', { companyId });
    }

    if (fromDate) {
      initialBalanceQuery.andWhere('entry.date < :fromDate', { fromDate });
    }

    const initialRes = await initialBalanceQuery.getRawOne();
    const initialBalance = parseFloat(initialRes?.balance || '0');

    // 2. Fetch movements in period
    const movementsQuery = jlRepo.createQueryBuilder('line')
      .leftJoinAndSelect('line.journalEntry', 'entry')
      .where('line.accountId = :accountId', { accountId })
      .andWhere('entry.status IN (:...statuses)', { statuses });

    if (companyId) {
      movementsQuery.andWhere('entry.companyId = :companyId', { companyId });
    }

    if (fromDate) {
      movementsQuery.andWhere('entry.date >= :fromDate', { fromDate });
    }
    if (toDate) {
      movementsQuery.andWhere('entry.date <= :toDate', { toDate });
    }

    const lines = await movementsQuery.orderBy('entry.date', 'ASC').addOrderBy('entry.createdAt', 'ASC').getMany();

    let runningBalance = initialBalance;
    const movements = lines.map(l => {
      const movementAmount = isAssetSide
        ? (Number(l.debit) - Number(l.credit))
        : (Number(l.credit) - Number(l.debit));

      runningBalance += movementAmount;

      return {
        date: l.journalEntry.date,
        docType: l.journalEntry.sourceType || 'JE',
        docNumber: l.journalEntry.reference,
        description: l.journalEntry.description || l.description,
        debit: Number(l.debit),
        credit: Number(l.credit),
        balance: runningBalance
      };
    });

    return {
      initialBalance,
      movements
    };
  }

  async loadPresetAccountSystem(presetName: string) {
    const repo = await this.getAccountRepo();
    const companyId = TenancyContext.getCompanyId();

    // Check if accounts already exist
    const count = await repo.count();
    console.log(`[AccountingService] Checking preset for company ${companyId}. Current account count: ${count}`);

    if (count > 0) {
      throw new BadRequestException('O sistema de contas já foi inicializado para esta empresa.');
    }

    const preset = ACCOUNT_PRESETS[presetName];

    if (!preset) {
      throw new NotFoundException(`Plano de contas '${presetName}' não encontrado.`);
    }

    // Assign companyId to all accounts
    const accountsToSave = preset.map(acc => ({
      ...acc,
      companyId
    }));

    console.log(`[AccountingService] Loading ${accountsToSave.length} accounts from preset "${presetName}" for company ${companyId}`);
    return await repo.save(accountsToSave);
  }

  // MVP endpoints for placeholder accounting modules
  async listCostCenters() {
    return this.costCenters;
  }

  async createCostCenter(payload: { code: string; description: string; active?: boolean }) {
    if (!payload.code?.trim() || !payload.description?.trim()) {
      throw new BadRequestException('Código e descrição são obrigatórios.');
    }

    const exists = this.costCenters.some(item => item.code === payload.code.trim());
    if (exists) {
      throw new BadRequestException('Código de centro de custo já existe.');
    }

    const item: AccountingMvpRecord = {
      id: `cc-${Date.now()}`,
      code: payload.code.trim(),
      description: payload.description.trim(),
      active: payload.active ?? true,
      createdAt: new Date().toISOString()
    };

    this.costCenters.push(item);
    return item;
  }

  async getVatSummary(fromDate?: string, toDate?: string) {
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('Data inicial deve ser menor ou igual à data final.');
    }

    return {
      fromDate,
      toDate,
      vatSettled: 0,
      vatDeductible: 0,
      generatedAt: new Date().toISOString()
    };
  }

  async closePeriod(payload: { year: number; month: number }) {
    const { year, month } = payload;
    if (!year || !month) {
      throw new BadRequestException('Ano e mês são obrigatórios.');
    }
    if (month < 1 || month > 12) {
      throw new BadRequestException('Mês inválido.');
    }

    const now = new Date();
    const futurePeriod = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
    if (futurePeriod) {
      throw new BadRequestException('Não é permitido fechar períodos futuros.');
    }

    const alreadyClosed = this.periodClosures.find(item => item.year === year && item.month === month);
    if (alreadyClosed) {
      throw new BadRequestException('Período já encerrado.');
    }

    const closure: PeriodCloseRecord = {
      id: `pc-${Date.now()}`,
      year,
      month,
      status: 'CLOSED',
      createdAt: new Date().toISOString()
    };

    this.periodClosures.push(closure);
    return closure;
  }

  async getExplorationSummary(fromDate?: string, toDate?: string) {
    return {
      period: { fromDate, toDate },
      totalDebit: 0,
      totalCredit: 0,
      topVariations: [],
      generatedAt: new Date().toISOString()
    };
  }

  async getUtilitiesAuditLog(page: number = 1, limit: number = 50) {
    const boundedLimit = Math.min(Math.max(limit, 1), 500);
    const start = (Math.max(page, 1) - 1) * boundedLimit;
    const records = this.periodClosures.slice(start, start + boundedLimit).map(item => ({
      id: item.id,
      action: 'PERIOD_CLOSE',
      reference: `${item.year}-${String(item.month).padStart(2, '0')}`,
      createdAt: item.createdAt
    }));

    return {
      page,
      limit: boundedLimit,
      total: this.periodClosures.length,
      records
    };
  }
}
