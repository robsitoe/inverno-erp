"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const account_entity_1 = require("./entities/account.entity");
const journal_entry_entity_1 = require("./entities/journal-entry.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
const accounting_presets_1 = require("./accounting-presets");
const period_control_service_1 = require("../periods/period-control.service");
let AccountingService = class AccountingService {
    tenancyService;
    periodControlService;
    defaultAccountRepo;
    defaultJournalEntryRepo;
    defaultJournalLineRepo;
    constructor(tenancyService, periodControlService, defaultAccountRepo, defaultJournalEntryRepo, defaultJournalLineRepo) {
        this.tenancyService = tenancyService;
        this.periodControlService = periodControlService;
        this.defaultAccountRepo = defaultAccountRepo;
        this.defaultJournalEntryRepo = defaultJournalEntryRepo;
        this.defaultJournalLineRepo = defaultJournalLineRepo;
    }
    costCenters = [];
    periodClosures = [];
    async getRepo(entity, defaultRepo, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId) {
            console.warn(`[AccountingService] No companyId in context, using default repository for ${entity.toString()}`);
            return defaultRepo;
        }
        try {
            const ds = await this.tenancyService.getTenantDataSource(targetId);
            return ds.getRepository(entity);
        }
        catch (err) {
            console.error(`[AccountingService] Error getting tenant repository for company ${targetId}:`, err.message);
            throw err;
        }
    }
    async getAccountRepo(companyId) { return this.getRepo(account_entity_1.Account, this.defaultAccountRepo, companyId); }
    async getJournalEntryRepo(companyId) { return this.getRepo(journal_entry_entity_1.JournalEntry, this.defaultJournalEntryRepo, companyId); }
    async getJournalLineRepo(companyId) { return this.getRepo(journal_entry_entity_1.JournalLine, this.defaultJournalLineRepo, companyId); }
    async create(createAccountDto) {
        try {
            const repo = await this.getAccountRepo();
            if (Array.isArray(createAccountDto)) {
                const accounts = repo.create(createAccountDto);
                return await repo.save(accounts);
            }
            const account = repo.create(createAccountDto);
            return await repo.save(account);
        }
        catch (error) {
            console.error('Error saving account(s):', error);
            throw new common_1.BadRequestException(`Failed to save account: ${error.message}`);
        }
    }
    async findAll(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getAccountRepo(listCompanyId);
        return repo.find({ order: { code: 'ASC' } });
    }
    async findOne(id) {
        const repo = await this.getAccountRepo();
        const account = await repo.findOne({ where: { id } });
        if (!account) {
            throw new common_1.NotFoundException(`Account with ID ${id} not found`);
        }
        return account;
    }
    async update(id, updateAccountDto) {
        console.log(`Updating account ${id}:`, updateAccountDto);
        const repo = await this.getAccountRepo();
        const account = await this.findOne(id);
        repo.merge(account, updateAccountDto);
        return repo.save(account);
    }
    async remove(id) {
        const repo = await this.getAccountRepo();
        const account = await this.findOne(id);
        return repo.remove(account);
    }
    async createJournalEntry(createJournalEntryDto) {
        const { lines } = createJournalEntryDto;
        await this.periodControlService.ensureDateInOpenPeriod(createJournalEntryDto.date, createJournalEntryDto.companyId);
        const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
        const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new common_1.BadRequestException(`Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
        }
        const jeRepo = await this.getJournalEntryRepo();
        const jlRepo = await this.getJournalLineRepo();
        const accRepo = await this.getAccountRepo();
        const preparedLines = await Promise.all(lines.map(async (line) => {
            let jl = jlRepo.create(line);
            if (!jl.id || jl.id.includes('TEMP')) {
                jl.id = `JL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            }
            if (!jl.accountCode || !jl.accountName) {
                const acc = await accRepo.findOne({ where: { id: jl.accountId } });
                if (acc) {
                    jl.accountCode = acc.code;
                    jl.accountName = acc.name;
                }
            }
            return jl;
        }));
        const journalEntry = jeRepo.create({
            ...createJournalEntryDto,
            lines: preparedLines,
        });
        try {
            return await jeRepo.save(journalEntry);
        }
        catch (err) {
            console.error('[AccountingService] Error saving Journal Entry:', err);
            throw new common_1.BadRequestException(`Erro ao gravar lançamento: ${err.message}`);
        }
    }
    async findAllJournalEntries(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getJournalEntryRepo(listCompanyId);
        return repo.find({
            relations: ['lines'],
            order: { date: 'DESC', createdAt: 'DESC' }
        });
    }
    async findOneJournalEntry(id) {
        const repo = await this.getJournalEntryRepo();
        const entry = await repo.findOne({
            where: { id },
            relations: ['lines']
        });
        if (!entry) {
            throw new common_1.NotFoundException(`Journal Entry with ID ${id} not found`);
        }
        return entry;
    }
    async getAccountStatement(accountId, fromDate, toDate, companyId, includeDrafts = false) {
        const accRepo = await this.getAccountRepo();
        const account = await accRepo.findOne({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Conta não encontrada');
        const isAssetSide = ['ASSET', 'EXPENSE'].includes(account.type);
        const balanceExpression = isAssetSide
            ? 'SUM(CAST(line.debit AS DECIMAL) - CAST(line.credit AS DECIMAL))'
            : 'SUM(CAST(line.credit AS DECIMAL) - CAST(line.debit AS DECIMAL))';
        const statuses = includeDrafts ? ['POSTED', 'DRAFT'] : ['POSTED'];
        const jlRepo = await this.getJournalLineRepo();
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
    async loadPresetAccountSystem(presetName, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getAccountRepo(targetId);
        const count = await repo.count();
        console.log(`[AccountingService] Checking preset for company ${targetId}. Current account count: ${count}`);
        if (count > 0) {
            console.log(`[AccountingService] Preset already loaded for company ${targetId}. Returning existing accounts.`);
            return repo.find({ order: { code: 'ASC' } });
        }
        const preset = accounting_presets_1.ACCOUNT_PRESETS[presetName];
        if (!preset) {
            throw new common_1.NotFoundException(`Plano de contas '${presetName}' não encontrado.`);
        }
        const accountsToSave = preset.map(acc => ({
            ...acc,
            companyId: targetId
        }));
        console.log(`[AccountingService] Loading ${accountsToSave.length} accounts from preset "${presetName}" for company ${targetId}`);
        return await repo.save(accountsToSave);
    }
    async listCostCenters() {
        return this.costCenters;
    }
    async createCostCenter(payload) {
        if (!payload.code?.trim() || !payload.description?.trim()) {
            throw new common_1.BadRequestException('Código e descrição são obrigatórios.');
        }
        const exists = this.costCenters.some(item => item.code === payload.code.trim());
        if (exists) {
            throw new common_1.BadRequestException('Código de centro de custo já existe.');
        }
        const item = {
            id: `cc-${Date.now()}`,
            code: payload.code.trim(),
            description: payload.description.trim(),
            active: payload.active ?? true,
            createdAt: new Date().toISOString()
        };
        this.costCenters.push(item);
        return item;
    }
    async getVatSummary(fromDate, toDate) {
        if (fromDate && toDate && fromDate > toDate) {
            throw new common_1.BadRequestException('Data inicial deve ser menor ou igual à data final.');
        }
        return {
            fromDate,
            toDate,
            vatSettled: 0,
            vatDeductible: 0,
            generatedAt: new Date().toISOString()
        };
    }
    async closePeriod(payload) {
        const { year, month } = payload;
        if (!year || !month) {
            throw new common_1.BadRequestException('Ano e mês são obrigatórios.');
        }
        if (month < 1 || month > 12) {
            throw new common_1.BadRequestException('Mês inválido.');
        }
        const now = new Date();
        const futurePeriod = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
        if (futurePeriod) {
            throw new common_1.BadRequestException('Não é permitido fechar períodos futuros.');
        }
        const alreadyClosed = this.periodClosures.find(item => item.year === year && item.month === month);
        if (alreadyClosed) {
            throw new common_1.BadRequestException('Período já encerrado.');
        }
        const closure = {
            id: `pc-${Date.now()}`,
            year,
            month,
            status: 'CLOSED',
            createdAt: new Date().toISOString()
        };
        this.periodClosures.push(closure);
        return closure;
    }
    async getExplorationSummary(fromDate, toDate) {
        return {
            period: { fromDate, toDate },
            totalDebit: 0,
            totalCredit: 0,
            topVariations: [],
            generatedAt: new Date().toISOString()
        };
    }
    async getUtilitiesAuditLog(page = 1, limit = 50) {
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
};
exports.AccountingService = AccountingService;
exports.AccountingService = AccountingService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(account_entity_1.Account)),
    __param(3, (0, typeorm_1.InjectRepository)(journal_entry_entity_1.JournalEntry)),
    __param(4, (0, typeorm_1.InjectRepository)(journal_entry_entity_1.JournalLine)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        period_control_service_1.PeriodControlService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AccountingService);
//# sourceMappingURL=accounting.service.js.map