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
exports.AccountingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const accounting_service_1 = require("./accounting.service");
const update_account_dto_1 = require("./dto/update-account.dto");
const create_journal_entry_dto_1 = require("./dto/create-journal-entry.dto");
let AccountingController = class AccountingController {
    accountingService;
    constructor(accountingService) {
        this.accountingService = accountingService;
    }
    create(createAccountDto) {
        return this.accountingService.create(createAccountDto);
    }
    findAll(companyId) {
        return this.accountingService.findAll(companyId);
    }
    findOne(id) {
        return this.accountingService.findOne(id);
    }
    update(id, updateAccountDto) {
        return this.accountingService.update(id, updateAccountDto);
    }
    remove(id) {
        return this.accountingService.remove(id);
    }
    createJournalEntry(createJournalEntryDto) {
        return this.accountingService.createJournalEntry(createJournalEntryDto);
    }
    findAllJournalEntries(companyId) {
        return this.accountingService.findAllJournalEntries(companyId);
    }
    findOneJournalEntry(id) {
        return this.accountingService.findOneJournalEntry(id);
    }
    getStatement(accountId, fromDate, toDate, companyId, includeDrafts) {
        const drafts = includeDrafts === 'true';
        return this.accountingService.getAccountStatement(accountId, fromDate, toDate, companyId, drafts);
    }
    loadPreset(presetName) {
        return this.accountingService.loadPresetAccountSystem(presetName);
    }
};
exports.AccountingController = AccountingController;
__decorate([
    (0, common_1.Post)('accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new account' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The account has been successfully created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all accounts' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('accounts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an account by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('accounts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an account' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_account_dto_1.UpdateAccountDto]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('accounts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an account' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('journal-entries'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new journal entry' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The journal entry has been successfully created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_journal_entry_dto_1.CreateJournalEntryDto]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createJournalEntry", null);
__decorate([
    (0, common_1.Get)('journal-entries'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all journal entries' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findAllJournalEntries", null);
__decorate([
    (0, common_1.Get)('journal-entries/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a journal entry by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findOneJournalEntry", null);
__decorate([
    (0, common_1.Get)('statements/:accountId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get account statement' }),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, common_1.Query)('fromDate')),
    __param(2, (0, common_1.Query)('toDate')),
    __param(3, (0, common_1.Query)('companyId')),
    __param(4, (0, common_1.Query)('includeDrafts')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "getStatement", null);
__decorate([
    (0, common_1.Post)('accounts/presets/:presetName'),
    (0, swagger_1.ApiOperation)({ summary: 'Load a predefined chart of accounts' }),
    __param(0, (0, common_1.Param)('presetName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "loadPreset", null);
exports.AccountingController = AccountingController = __decorate([
    (0, swagger_1.ApiTags)('accounting'),
    (0, common_1.Controller)('accounting'),
    __metadata("design:paramtypes", [accounting_service_1.AccountingService])
], AccountingController);
//# sourceMappingURL=accounting.controller.js.map