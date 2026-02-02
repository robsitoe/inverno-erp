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
exports.TreasuryDocumentLine = exports.TreasuryDocument = exports.TreasuryDocumentType = void 0;
const typeorm_1 = require("typeorm");
var TreasuryDocumentType;
(function (TreasuryDocumentType) {
    TreasuryDocumentType["RECEIPT"] = "RECEIPT";
    TreasuryDocumentType["PAYMENT"] = "PAYMENT";
})(TreasuryDocumentType || (exports.TreasuryDocumentType = TreasuryDocumentType = {}));
let TreasuryDocument = class TreasuryDocument {
    id;
    companyId;
    type;
    docType;
    series;
    seriesNumber;
    number;
    date;
    amount;
    treasuryAccountId;
    entityCode;
    entityName;
    customerCode;
    customerName;
    beneficiaryCode;
    beneficiaryName;
    paymentMethod;
    description;
    observations;
    relatedDocument;
    lines;
    createdAt;
    updatedAt;
};
exports.TreasuryDocument = TreasuryDocument;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ['RECEIPT', 'PAYMENT'],
    }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "docType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "series", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], TreasuryDocument.prototype, "seriesNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], TreasuryDocument.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "treasuryAccountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "entityCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "entityName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "customerCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "beneficiaryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "beneficiaryName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "observations", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocument.prototype, "relatedDocument", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TreasuryDocumentLine, (line) => line.document, { cascade: true }),
    __metadata("design:type", Array)
], TreasuryDocument.prototype, "lines", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TreasuryDocument.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TreasuryDocument.prototype, "updatedAt", void 0);
exports.TreasuryDocument = TreasuryDocument = __decorate([
    (0, typeorm_1.Entity)('treasury_documents')
], TreasuryDocument);
let TreasuryDocumentLine = class TreasuryDocumentLine {
    id;
    document;
    docNumber;
    amount;
    paymentMode;
};
exports.TreasuryDocumentLine = TreasuryDocumentLine;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], TreasuryDocumentLine.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TreasuryDocument, (document) => document.lines, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'documentId' }),
    __metadata("design:type", TreasuryDocument)
], TreasuryDocumentLine.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TreasuryDocumentLine.prototype, "docNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], TreasuryDocumentLine.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TreasuryDocumentLine.prototype, "paymentMode", void 0);
exports.TreasuryDocumentLine = TreasuryDocumentLine = __decorate([
    (0, typeorm_1.Entity)('treasury_document_lines')
], TreasuryDocumentLine);
//# sourceMappingURL=treasury.entity.js.map