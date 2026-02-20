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
exports.JournalLine = exports.JournalEntry = exports.JournalEntryStatus = void 0;
const typeorm_1 = require("typeorm");
const account_entity_1 = require("./account.entity");
var JournalEntryStatus;
(function (JournalEntryStatus) {
    JournalEntryStatus["DRAFT"] = "DRAFT";
    JournalEntryStatus["POSTED"] = "POSTED";
    JournalEntryStatus["CANCELED"] = "CANCELED";
})(JournalEntryStatus || (exports.JournalEntryStatus = JournalEntryStatus = {}));
let JournalEntry = class JournalEntry {
    id;
    companyId;
    journalId;
    date;
    description;
    reference;
    sourceDocument;
    sourceType;
    lines;
    status;
    createdBy;
    updatedBy;
    correctionReason;
    relatedEntryId;
    createdAt;
    updatedAt;
};
exports.JournalEntry = JournalEntry;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], JournalEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "journalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], JournalEntry.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], JournalEntry.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "sourceDocument", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ['SALE', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'MANUAL', 'REVERSAL', 'CORRECTION'],
        nullable: true
    }),
    __metadata("design:type", String)
], JournalEntry.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => JournalLine, (line) => line.journalEntry, { cascade: true }),
    __metadata("design:type", Array)
], JournalEntry.prototype, "lines", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ['DRAFT', 'POSTED', 'CANCELLED', 'REVERSED', 'CORRECTED', 'VOIDED'],
        default: 'DRAFT',
    }),
    __metadata("design:type", String)
], JournalEntry.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "correctionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "relatedEntryId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JournalEntry.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], JournalEntry.prototype, "updatedAt", void 0);
exports.JournalEntry = JournalEntry = __decorate([
    (0, typeorm_1.Entity)('journal_entries')
], JournalEntry);
let JournalLine = class JournalLine {
    id;
    journalEntry;
    accountId;
    account;
    accountCode;
    accountName;
    description;
    debit;
    credit;
};
exports.JournalLine = JournalLine;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], JournalLine.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => JournalEntry, (journalEntry) => journalEntry.lines, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'journalEntryId' }),
    __metadata("design:type", JournalEntry)
], JournalLine.prototype, "journalEntry", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], JournalLine.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => account_entity_1.Account),
    (0, typeorm_1.JoinColumn)({ name: 'accountId' }),
    __metadata("design:type", account_entity_1.Account)
], JournalLine.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalLine.prototype, "accountCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalLine.prototype, "accountName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JournalLine.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], JournalLine.prototype, "debit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], JournalLine.prototype, "credit", void 0);
exports.JournalLine = JournalLine = __decorate([
    (0, typeorm_1.Entity)('journal_lines')
], JournalLine);
//# sourceMappingURL=journal-entry.entity.js.map