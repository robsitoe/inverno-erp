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
let AccountingService = class AccountingService {
    accountRepository;
    journalEntryRepository;
    journalLineRepository;
    constructor(accountRepository, journalEntryRepository, journalLineRepository) {
        this.accountRepository = accountRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.journalLineRepository = journalLineRepository;
    }
    async create(createAccountDto) {
        if (Array.isArray(createAccountDto)) {
            const accounts = this.accountRepository.create(createAccountDto);
            return this.accountRepository.save(accounts);
        }
        const account = this.accountRepository.create(createAccountDto);
        return this.accountRepository.save(account);
    }
    findAll() {
        return this.accountRepository.find({ order: { code: 'ASC' } });
    }
    async findOne(id) {
        const account = await this.accountRepository.findOne({ where: { id } });
        if (!account) {
            throw new common_1.NotFoundException(`Account with ID ${id} not found`);
        }
        return account;
    }
    async update(id, updateAccountDto) {
        const account = await this.findOne(id);
        this.accountRepository.merge(account, updateAccountDto);
        return this.accountRepository.save(account);
    }
    async remove(id) {
        const account = await this.findOne(id);
        return this.accountRepository.remove(account);
    }
    async createJournalEntry(createJournalEntryDto) {
        const { lines } = createJournalEntryDto;
        const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
        const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new common_1.BadRequestException(`Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
        }
        const journalEntry = this.journalEntryRepository.create({
            ...createJournalEntryDto,
            lines: lines.map(line => this.journalLineRepository.create(line)),
        });
        return this.journalEntryRepository.save(journalEntry);
    }
    findAllJournalEntries() {
        return this.journalEntryRepository.find({
            relations: ['lines'],
            order: { date: 'DESC', createdAt: 'DESC' }
        });
    }
    async findOneJournalEntry(id) {
        const entry = await this.journalEntryRepository.findOne({
            where: { id },
            relations: ['lines']
        });
        if (!entry) {
            throw new common_1.NotFoundException(`Journal Entry with ID ${id} not found`);
        }
        return entry;
    }
};
exports.AccountingService = AccountingService;
exports.AccountingService = AccountingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(account_entity_1.Account)),
    __param(1, (0, typeorm_1.InjectRepository)(journal_entry_entity_1.JournalEntry)),
    __param(2, (0, typeorm_1.InjectRepository)(journal_entry_entity_1.JournalLine)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AccountingService);
//# sourceMappingURL=accounting.service.js.map