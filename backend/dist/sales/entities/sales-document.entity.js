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
exports.SalesDocumentLine = exports.SalesDocument = exports.SalesDocumentType = void 0;
const typeorm_1 = require("typeorm");
const workflow_status_enum_1 = require("../../common/enums/workflow-status.enum");
var SalesDocumentType;
(function (SalesDocumentType) {
    SalesDocumentType["INVOICE"] = "INVOICE";
    SalesDocumentType["RECEIPT"] = "RECEIPT";
    SalesDocumentType["CREDIT_NOTE"] = "CREDIT_NOTE";
    SalesDocumentType["DEBIT_NOTE"] = "DEBIT_NOTE";
    SalesDocumentType["QUOTE"] = "QUOTE";
    SalesDocumentType["ORDER"] = "ORDER";
})(SalesDocumentType || (exports.SalesDocumentType = SalesDocumentType = {}));
let SalesDocument = class SalesDocument {
    id;
    companyId;
    documentType;
    documentNumber;
    series;
    seriesNumber;
    date;
    dueDate;
    customerId;
    customerName;
    customerNif;
    customerAddress;
    lines;
    subtotal;
    discounts;
    totalIva;
    total;
    status;
    statusNotes;
    journalEntryId;
    notes;
    createdAt;
    updatedAt;
};
exports.SalesDocument = SalesDocument;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], SalesDocument.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'varchar' }),
    __metadata("design:type", String)
], SalesDocument.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesDocument.prototype, "documentType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesDocument.prototype, "documentNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocument.prototype, "series", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], SalesDocument.prototype, "seriesNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], SalesDocument.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], SalesDocument.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocument.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocument.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocument.prototype, "customerNif", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocument.prototype, "customerAddress", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SalesDocumentLine, (line) => line.document, { cascade: true }),
    __metadata("design:type", Array)
], SalesDocument.prototype, "lines", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocument.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocument.prototype, "discounts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocument.prototype, "totalIva", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocument.prototype, "total", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: workflow_status_enum_1.WorkflowStatus.DRAFT,
    }),
    __metadata("design:type", String)
], SalesDocument.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocument.prototype, "statusNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocument.prototype, "journalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocument.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SalesDocument.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SalesDocument.prototype, "updatedAt", void 0);
exports.SalesDocument = SalesDocument = __decorate([
    (0, typeorm_1.Entity)('sales_documents')
], SalesDocument);
let SalesDocumentLine = class SalesDocumentLine {
    id;
    document;
    articleId;
    articleCode;
    articleName;
    quantity;
    unitPrice;
    discount;
    ivaRate;
    ivaCode;
    subtotal;
    ivaAmount;
    total;
};
exports.SalesDocumentLine = SalesDocumentLine;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], SalesDocumentLine.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SalesDocument, (document) => document.lines, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'documentId' }),
    __metadata("design:type", SalesDocument)
], SalesDocumentLine.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesDocumentLine.prototype, "articleId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesDocumentLine.prototype, "articleCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SalesDocumentLine.prototype, "articleName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], SalesDocumentLine.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], SalesDocumentLine.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocumentLine.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocumentLine.prototype, "ivaRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesDocumentLine.prototype, "ivaCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocumentLine.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocumentLine.prototype, "ivaAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesDocumentLine.prototype, "total", void 0);
exports.SalesDocumentLine = SalesDocumentLine = __decorate([
    (0, typeorm_1.Entity)('sales_document_lines')
], SalesDocumentLine);
//# sourceMappingURL=sales-document.entity.js.map