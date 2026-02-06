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
exports.PurchaseDocumentLine = exports.PurchaseDocument = exports.PurchaseDocumentType = void 0;
const typeorm_1 = require("typeorm");
const workflow_status_enum_1 = require("../../common/enums/workflow-status.enum");
var PurchaseDocumentType;
(function (PurchaseDocumentType) {
    PurchaseDocumentType["INVOICE"] = "INVOICE";
    PurchaseDocumentType["RECEIPT"] = "RECEIPT";
    PurchaseDocumentType["CREDIT_NOTE"] = "CREDIT_NOTE";
    PurchaseDocumentType["DEBIT_NOTE"] = "DEBIT_NOTE";
    PurchaseDocumentType["ORDER"] = "ORDER";
    PurchaseDocumentType["QUOTE"] = "QUOTE";
})(PurchaseDocumentType || (exports.PurchaseDocumentType = PurchaseDocumentType = {}));
let PurchaseDocument = class PurchaseDocument {
    id;
    companyId;
    type;
    series;
    number;
    date;
    dueDate;
    supplierCode;
    supplierName;
    supplierNif;
    supplierAddress;
    supplierAccountId;
    reference;
    paymentCondition;
    paymentDays;
    currency;
    status;
    statusNotes;
    lines;
    merchandiseTotal;
    discountValue;
    taxTotal;
    totalValue;
    notes;
    createdAt;
    updatedAt;
};
exports.PurchaseDocument = PurchaseDocument;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "series", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PurchaseDocument.prototype, "number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "supplierCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "supplierName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "supplierNif", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "supplierAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "supplierAccountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "paymentCondition", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocument.prototype, "paymentDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'MZN' }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: workflow_status_enum_1.WorkflowStatus.DRAFT,
    }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "statusNotes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PurchaseDocumentLine, (line) => line.document, { cascade: true }),
    __metadata("design:type", Array)
], PurchaseDocument.prototype, "lines", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocument.prototype, "merchandiseTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocument.prototype, "discountValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocument.prototype, "taxTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocument.prototype, "totalValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocument.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PurchaseDocument.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PurchaseDocument.prototype, "updatedAt", void 0);
exports.PurchaseDocument = PurchaseDocument = __decorate([
    (0, typeorm_1.Entity)('purchase_documents')
], PurchaseDocument);
let PurchaseDocumentLine = class PurchaseDocumentLine {
    id;
    document;
    articleId;
    articleCode;
    articleName;
    warehouse;
    location;
    batch;
    description;
    taxCode;
    taxRate;
    unitPrice;
    discount;
    unit;
    quantity;
    totalLiquid;
    totalValue;
    project;
    costCenter;
    analytic;
    functional;
};
exports.PurchaseDocumentLine = PurchaseDocumentLine;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PurchaseDocument, (document) => document.lines, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'documentId' }),
    __metadata("design:type", PurchaseDocument)
], PurchaseDocumentLine.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "articleId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "articleCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "articleName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "warehouse", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "batch", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "taxCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocumentLine.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseDocumentLine.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocumentLine.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseDocumentLine.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocumentLine.prototype, "totalLiquid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseDocumentLine.prototype, "totalValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "costCenter", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "analytic", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseDocumentLine.prototype, "functional", void 0);
exports.PurchaseDocumentLine = PurchaseDocumentLine = __decorate([
    (0, typeorm_1.Entity)('purchase_document_lines')
], PurchaseDocumentLine);
//# sourceMappingURL=purchase.entity.js.map