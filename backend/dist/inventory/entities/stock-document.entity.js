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
exports.StockDocumentLine = exports.StockDocument = exports.StockDocumentStatus = void 0;
const typeorm_1 = require("typeorm");
var StockDocumentStatus;
(function (StockDocumentStatus) {
    StockDocumentStatus["DRAFT"] = "DRAFT";
    StockDocumentStatus["POSTED"] = "POSTED";
    StockDocumentStatus["CANCELED"] = "CANCELED";
})(StockDocumentStatus || (exports.StockDocumentStatus = StockDocumentStatus = {}));
let StockDocument = class StockDocument {
    id;
    companyId;
    type;
    series;
    number;
    date;
    time;
    warehouse;
    originAccount;
    originCostCenter;
    originProject;
    originAnalytic;
    originFunctional;
    originPep;
    lines;
    status;
    notes;
    createdAt;
    updatedAt;
};
exports.StockDocument = StockDocument;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StockDocument.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StockDocument.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StockDocument.prototype, "series", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], StockDocument.prototype, "number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], StockDocument.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "time", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "warehouse", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "originAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "originCostCenter", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "originProject", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "originAnalytic", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "originFunctional", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "originPep", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StockDocumentLine, (line) => line.document, { cascade: true }),
    __metadata("design:type", Array)
], StockDocument.prototype, "lines", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: StockDocumentStatus.DRAFT,
    }),
    __metadata("design:type", String)
], StockDocument.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocument.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StockDocument.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StockDocument.prototype, "updatedAt", void 0);
exports.StockDocument = StockDocument = __decorate([
    (0, typeorm_1.Entity)('stock_documents')
], StockDocument);
let StockDocumentLine = class StockDocumentLine {
    id;
    document;
    articleId;
    articleCode;
    articleName;
    warehouse;
    location;
    batch;
    description;
    unit;
    quantity;
    unitPrice;
    total;
    generalAccount;
    costCenter;
    analytic;
    functional;
    project;
    pepElement;
    item;
};
exports.StockDocumentLine = StockDocumentLine;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => StockDocument, (document) => document.lines, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'documentId' }),
    __metadata("design:type", StockDocument)
], StockDocumentLine.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "articleId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "articleCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "articleName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "warehouse", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "batch", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], StockDocumentLine.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], StockDocumentLine.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], StockDocumentLine.prototype, "total", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "generalAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "costCenter", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "analytic", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "functional", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "pepElement", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockDocumentLine.prototype, "item", void 0);
exports.StockDocumentLine = StockDocumentLine = __decorate([
    (0, typeorm_1.Entity)('stock_document_lines')
], StockDocumentLine);
//# sourceMappingURL=stock-document.entity.js.map