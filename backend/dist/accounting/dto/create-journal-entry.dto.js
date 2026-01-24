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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateJournalEntryDto = exports.CreateJournalLineDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreateJournalLineDto {
    id;
    accountId;
    accountCode;
    accountName;
    description;
    debit;
    credit;
}
exports.CreateJournalLineDto = CreateJournalLineDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-id', description: 'ID of the line' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalLineDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'account-id', description: 'The ID of the account' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateJournalLineDto.prototype, "accountId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1.1', description: 'The code of the account' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalLineDto.prototype, "accountCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Caixa', description: 'The name of the account' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalLineDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Payment of Invoice #123', description: 'Description of the line item', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalLineDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00, description: 'Debit amount' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateJournalLineDto.prototype, "debit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.00, description: 'Credit amount' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateJournalLineDto.prototype, "credit", void 0);
class CreateJournalEntryDto {
    id;
    companyId;
    journalId;
    description;
    date;
    status;
    reference;
    sourceDocument;
    sourceType;
    lines;
}
exports.CreateJournalEntryDto = CreateJournalEntryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-id', description: 'ID of the entry' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-id', description: 'Company ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'journal-id', description: 'Journal ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "journalId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Sales Invoice #123', description: 'Description of the journal entry' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2023-10-27', description: 'Date of the journal entry' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status of the entry', default: 'DRAFT' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INV-2023-001', description: 'External reference', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'DOC-001', description: 'Source document', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "sourceDocument", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SALE', description: 'Source type', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalEntryDto.prototype, "sourceType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateJournalLineDto], description: 'List of journal lines' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateJournalLineDto),
    __metadata("design:type", Array)
], CreateJournalEntryDto.prototype, "lines", void 0);
//# sourceMappingURL=create-journal-entry.dto.js.map