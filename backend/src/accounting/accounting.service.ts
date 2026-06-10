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
import { ACCOUNT_PRESETS, PRESET_METADATA } from './accounting-presets';
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


  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>, companyId?: string): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) {
      console.warn(`[AccountingService] No companyId in context, using default repository for ${entity.toString()}`);
      return defaultRepo;
    }

    try {
      const ds = await this.tenancyService.getTenantDataSource(targetId);
      return ds.getRepository(entity);
    } catch (err: any) {
      console.error(`[AccountingService] Error getting tenant repository for company ${targetId}:`, err.message);
      throw err;
    }
  }

  private async getAccountRepo(companyId?: string) { return this.getRepo(Account, this.defaultAccountRepo, companyId); }
  private async getJournalEntryRepo(companyId?: string) { return this.getRepo(JournalEntry, this.defaultJournalEntryRepo, companyId); }
  private async getJournalLineRepo(companyId?: string) { return this.getRepo(JournalLine, this.defaultJournalLineRepo, companyId); }

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
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getAccountRepo(listCompanyId);
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
    const jlRepo = await this.getJournalLineRepo();

    const usages = await jlRepo.count({ where: { accountId: id } });
    if (usages > 0) {
      throw new BadRequestException('Esta conta não pode ser eliminada porque possui lançamentos associados. Por favor, desative-a.');
    }

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

    const jeRepo = await this.getJournalEntryRepo(createJournalEntryDto.companyId);
    const jlRepo = await this.getJournalLineRepo(createJournalEntryDto.companyId);
    const accRepo = await this.getAccountRepo(createJournalEntryDto.companyId);

    // Map lines and ensure account details + valid IDs
    const preparedLines = await Promise.all(lines.map(async line => {
      let jl = jlRepo.create(line);

      // If id is TEMP or missing, generate one or let it be generated (though we use PrimaryColumn so we MUST provide it)
      if (!jl.id || jl.id.includes('TEMP')) {
        jl.id = `JL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }

      // Ensure account details + valid IDs
      let acc = await accRepo.findOne({ where: { id: jl.accountId } });

      if (!acc) {
        // Fallback 1: Literal code match
        acc = await accRepo.findOne({ where: { code: jl.accountId } });
      }

      if (!acc && typeof jl.accountId === 'string') {
        // Fallback 2: Formatted code handle (e.g. '71' -> '7.1')
        // Use a database-side normalization for comparison
        const cleanTarget = jl.accountId.replace(/\./g, '');
        acc = await accRepo.createQueryBuilder('acc')
          .where("REPLACE(acc.code, '.', '') = :code", { code: cleanTarget })
          .getOne();
      }

      if (!acc) {
        console.error(`[AccountingService] Account not found for ID/Code: ${jl.accountId}`);
        throw new BadRequestException(`Conta com ID/Código '${jl.accountId}' não encontrada. Verifique se o Plano de Contas está carregado para esta empresa.`);
      }

      if (acc.allowPosting === false) {
        throw new BadRequestException(`A conta '${acc.code} - ${acc.name}' é uma conta de soma/índice e não permite lançamentos diretos. Por favor, use uma de suas sub-contas (nível final).`);
      }

      if (acc.isActive === false) {
        throw new BadRequestException(`A conta '${acc.code} - ${acc.name}' encontra-se inativa.`);
      }

      // Override the accountId with the internal database ID from the found account
      jl.accountId = acc.id;

      if (!jl.accountCode || !jl.accountName) {
        jl.accountCode = acc.code;
        jl.accountName = acc.name;
      }
      return jl;
    }));

    const journalEntry = jeRepo.create({
      ...createJournalEntryDto,
      lines: preparedLines,
    });

    // id is a PrimaryColumn without auto-generation; server-side callers
    // (e.g. payroll posting) may not provide one.
    if (!journalEntry.id) {
      journalEntry.id = `JE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }

    try {
      console.log(`[AccountingService] Saving Journal Entry ${journalEntry.id} with ${journalEntry.lines?.length} lines`);
      const savedEntry = await jeRepo.save(journalEntry);

      // Point 6: Synchronize balances if POSTED
      if (savedEntry.status === 'POSTED') {
        console.log(`[AccountingService] Entry is POSTED, updating account balances...`);
        await this.updateAccountBalances(savedEntry.lines, createJournalEntryDto.companyId);
      }

      return savedEntry;
    } catch (err: any) {
      console.error('[AccountingService] Error saving Journal Entry:', err);
      // If it's already an HttpException, just throw it
      if (err.status && err.getResponse) throw err;
      throw new BadRequestException(`Erro ao gravar lançamento na base de dados: ${err.message}`);
    }
  }

  /**
   * Atualiza os saldos das contas com base nas linhas de lançamento.
   * Suporta atualização incremental e hierárquica.
   */
  async updateAccountBalances(lines: JournalLine[], companyId?: string) {
    const accRepo = await this.getAccountRepo(companyId);

    // Agrupar mudanças por conta para minimizar queries
    const changes = new Map<string, { debit: number, credit: number }>();
    for (const line of lines) {
      const current = changes.get(line.accountId) || { debit: 0, credit: 0 };
      changes.set(line.accountId, {
        debit: current.debit + Number(line.debit),
        credit: current.credit + Number(line.credit)
      });
    }

    for (const [accountId, delta] of changes.entries()) {
      let account = await accRepo.findOne({ where: { id: accountId } });

      if (!account) {
        // Fallback: Check if the accountId is actually a code (common with preset hardcoded IDs)
        account = await accRepo.findOne({ where: { code: accountId } });
      }

      if (!account) {
        console.warn(`[AccountingService] Skipping balance update for unknown account ID/Code: ${accountId}`);
        continue;
      }

      const upperType = (account.type || '').toUpperCase();
      const isAssetSide = ['ASSET', 'EXPENSE', 'ATIVO', 'GASTO', 'CUSTO'].includes(upperType);
      const amount = isAssetSide ? (delta.debit - delta.credit) : (delta.credit - delta.debit);

      // Atualizar conta atual
      account.balance = Number(account.balance) + amount;
      await accRepo.save(account);

      // Atualizar pais recursivamente
      let parentId = account.parentId;
      while (parentId) {
        const parent = await accRepo.findOne({ where: { id: parentId } });
        if (!parent) break;
        parent.balance = Number(parent.balance) + amount;
        await accRepo.save(parent);
        parentId = parent.parentId;
      }
    }
  }

  /**
   * Recalcula todos os saldos de todas as contas do zero.
   * Essencial para reparar inconsistências.
   */
  async recalculateAllBalances(companyId?: string) {
    const targetCompanyId = companyId || TenancyContext.getCompanyId();
    const accRepo = await this.getAccountRepo(targetCompanyId);
    const jeRepo = await this.getJournalEntryRepo(targetCompanyId);

    console.log(`[AccountingService] Recalculating all balances for company: ${targetCompanyId}`);

    // 1. Resetar todos os saldos para zero
    await accRepo.createQueryBuilder('acc')
      .update(Account)
      .set({ balance: 0 })
      .execute();

    // 2. Obter todos os lançamentos que devem afetar o saldo (estritamente POSTED)
    const entries = await jeRepo.find({
      where: { status: 'POSTED' },
      relations: ['lines'],
      order: { date: 'ASC' }
    });

    console.log(`[AccountingService] Found ${entries.length} posted entries to process.`);

    // 3. Aplicar cada lançamento
    for (const entry of entries) {
      await this.updateAccountBalances(entry.lines, targetCompanyId);
    }

    return { success: true, processedEntries: entries.length };
  }

  async findAllJournalEntries(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getJournalEntryRepo(listCompanyId);
    return repo.find({
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

  async clearAccounts(companyId?: string) {
    const targetId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getAccountRepo(targetId);
    const jlRepo = await this.getJournalLineRepo(targetId);

    // Verificação de segurança: não permitir apagar se houver lançamentos
    const count = await jlRepo.count();
    if (count > 0) {
      throw new BadRequestException('Não é possível substituir o plano de contas porque já existem lançamentos contabilísticos registados.');
    }

    console.log(`[AccountingService] Cleaning all accounts for company ${targetId}`);
    return await repo.delete({ companyId: targetId });
  }

  async loadPresetAccountSystem(presetName: string, companyId?: string) {
    const targetId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getAccountRepo(targetId);

    // Check if accounts already exist
    const count = await repo.count();
    console.log(`[AccountingService] Checking preset for company ${targetId}. Current account count: ${count}`);

    // Removida a limitação if (count > 0) return; para permitir Upsert (Atualização em massa do PGC-PE)
    console.log(`[AccountingService] Updating preset for company ${targetId}. Current account count was: ${count}`);

    const preset = ACCOUNT_PRESETS[presetName];

    if (!preset) {
      throw new NotFoundException(`Plano de contas '${presetName}' não encontrado.`);
    }

    // Assign companyId to all accounts
    const accountsToSave = preset.map(acc => ({
      ...acc,
      companyId: targetId
    }));

    console.log(`[AccountingService] Loading ${accountsToSave.length} accounts from preset "${presetName}" for company ${targetId}`);
    return await repo.save(accountsToSave);
  }

  /** List all available preset plans with metadata */
  getAvailablePresets() {
    return PRESET_METADATA;
  }

  /** Import accounts from parsed CSV rows — upsert by code+companyId */
  async importAccountsFromCsv(
    rows: Array<{ code: string; name: string; type?: string; allowPosting?: boolean; level?: number; parentCode?: string; description?: string }>,
    companyId?: string,
    mergeMode: 'REPLACE' | 'MERGE' = 'MERGE',
  ) {
    const targetId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getAccountRepo(targetId);

    // Safety: block replace if journal entries exist
    if (mergeMode === 'REPLACE') {
      const dsForCheck = await this.getAccountRepo(targetId);
      const jlRepo = (dsForCheck as any).manager?.getRepository?.('journal_lines') || null;
      if (jlRepo) {
        const count = await jlRepo.count();
        if (count > 0) {
          throw new BadRequestException('Não é possível substituir o plano de contas porque já existem lançamentos contabilísticos registados.');
        }
      }
      await repo.delete({ companyId: targetId });
    }

    const accounts = rows
      .filter(r => r.code?.trim() && r.name?.trim())
      .map(r => ({
        id: `${r.code.trim()}-${targetId}`,
        companyId: targetId,
        code: r.code.trim(),
        name: r.name.trim(),
        type: (r.type || 'ASSET').toUpperCase(),
        allowPosting: r.allowPosting !== undefined ? Boolean(r.allowPosting) : true,
        level: r.level || 1,
        parentId: r.parentCode ? `${r.parentCode.trim()}-${targetId}` : null,
        description: r.description || '',
        balance: 0,
        isActive: true,
      }));

    if (accounts.length === 0) {
      throw new BadRequestException('Nenhuma conta válida encontrada no ficheiro CSV.');
    }

    await repo.save(accounts as any[]);
    return { imported: accounts.length, mode: mergeMode };
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

  /**
   * Generates a Balance Sheet (Balanço) according to Mozambican PGC-NIR
   */
  async getBalanceSheet(companyId?: string) {
    const accounts = await this.findAll(companyId);

    const getSum = (codes: string[]) => {
      return accounts
        .filter(acc => acc.allowPosting && codes.some(code => acc.code === code || acc.code.startsWith(code + '.')))
        .filter(acc => true) // We only want root level balances or direct sum
        // Wait, balance in root accounts should already be the sum of children if recalculateAllBalances was run.
        // If not, we should sum only the leaf accounts.
        // Current implementation of updateAccountBalances updates parents, so root balance is sum.
        .reduce((sum, acc) => {
          return sum + Number(acc.balance || 0);
          return sum;
        }, 0);
    };

    const assets = {
      nonCurrent: {
        tangible: getSum(['3.2']),
        intangible: getSum(['3.3']),
        biological: getSum(['2.7']), // Assuming biologico non-current
        financial: getSum(['3.1']),
        total: 0
      },
      current: {
        inventory: getSum(['2.1', '2.2', '2.3', '2.4', '2.5', '2.6']),
        clients: getSum(['4.1']),
        cashAndBanks: getSum(['1.1', '1.2']),
        total: 0
      },
      total: 0
    };

    assets.nonCurrent.total = assets.nonCurrent.tangible + assets.nonCurrent.intangible + assets.nonCurrent.biological + assets.nonCurrent.financial;
    assets.current.total = assets.current.inventory + assets.current.clients + assets.current.cashAndBanks;
    assets.total = assets.nonCurrent.total + assets.current.total;

    const equity = {
      capital: getSum(['5.1']),
      reservas: getSum(['5.5']),
      retainedEarnings: getSum(['5.9']),
      netIncome: getSum(['8.8']),
      total: 0
    };
    equity.total = equity.capital + equity.reservas + equity.retainedEarnings + equity.netIncome;

    const liabilities = {
      nonCurrent: {
        loans: 0, // Simplified
        provisions: getSum(['4.8']),
        total: 0
      },
      current: {
        suppliers: getSum(['4.2']),
        loans: getSum(['4.3']),
        taxes: getSum(['4.4']),
        total: 0
      },
      total: 0
    };
    liabilities.nonCurrent.total = liabilities.nonCurrent.provisions;
    liabilities.current.total = liabilities.current.suppliers + liabilities.current.loans + liabilities.current.taxes;
    liabilities.total = liabilities.nonCurrent.total + liabilities.current.total;

    return {
      assets,
      equityAndLiabilities: {
        equity,
        liabilities,
        total: equity.total + liabilities.total
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generates an Income Statement (Demonstração de Resultados por Natureza)
   */
  async getIncomeStatement(companyId?: string) {
    const accounts = await this.findAll(companyId);

    const getSum = (codes: string[]) => {
      return accounts
        .filter(acc => acc.allowPosting && codes.some(code => acc.code === code || acc.code.startsWith(code + '.')))
        .reduce((sum, acc) => {
          return sum + Number(acc.balance || 0);
          return sum;
        }, 0);
    };

    const revenue = getSum(['7.1', '7.2']);
    const varProduction = getSum(['6.1.2']); // Variation - class 6 but can be negative
    const costOfGoods = getSum(['6.1.1']);
    const personnelExpenses = getSum(['6.2']);
    const fse = getSum(['6.3']);
    const depreciation = getSum(['6.5']);
    const provisions = getSum(['6.6']);
    const otherGains = getSum(['7.6']);
    const otherLosses = getSum(['6.8']);

    const operatingResult = revenue - costOfGoods - personnelExpenses - fse - depreciation - provisions + otherGains - otherLosses;

    const financialRevenue = getSum(['7.8']);
    const financialExpenses = getSum(['6.9']);
    const financialResult = financialRevenue - financialExpenses;

    const currentResult = operatingResult + financialResult;
    const taxes = getSum(['8.5']);
    const netProfit = currentResult - taxes;

    return {
      revenue,
      varProduction,
      costOfGoods,
      personnelExpenses,
      fse,
      depreciation,
      provisions,
      otherGains,
      otherLosses,
      operatingResult,
      financialResult: {
        revenue: financialRevenue,
        expenses: financialExpenses,
        total: financialResult
      },
      currentResult,
      taxes,
      netProfit,
      generatedAt: new Date().toISOString()
    };
  }
}
