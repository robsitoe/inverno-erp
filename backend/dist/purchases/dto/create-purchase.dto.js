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
exports.CreatePurchaseDto = exports.CreatePurchaseLineDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreatePurchaseLineDto {
    articleId;
    articleCode;
    articleName;
    quantity;
    unitPrice;
    id;
    discount;
    ivaRate;
    ivaCode;
    subtotal;
    ivaAmount;
    total;
}
exports.CreatePurchaseLineDto = CreatePurchaseLineDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'article-id', description: 'Article ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePurchaseLineDto.prototype, "articleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'A001', description: 'Article Code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePurchaseLineDto.prototype, "articleCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Product Name', description: 'Article Name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePurchaseLineDto.prototype, "articleName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Quantity' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreatePurchaseLineDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00, description: 'Unit Price' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreatePurchaseLineDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'LINE-ID', description: 'Line ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseLineDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0, description: 'Discount percentage' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseLineDto.prototype, "discount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 16, description: 'IVA Rate' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseLineDto.prototype, "ivaRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'IVA', description: 'IVA Code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseLineDto.prototype, "ivaCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00, description: 'Subtotal' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseLineDto.prototype, "subtotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 16.00, description: 'IVA Amount' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseLineDto.prototype, "ivaAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 116.00, description: 'Total' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseLineDto.prototype, "total", void 0);
class CreatePurchaseDto {
    id;
    companyId;
    documentType;
    series;
    documentNumber;
    seriesNumber;
    date;
    dueDate;
    supplierCode;
    supplierId;
    supplierName;
    supplierNif;
    supplierAddress;
    subtotal;
    discounts;
    totalIva;
    total;
    notes;
    status;
    lines;
}
exports.CreatePurchaseDto = CreatePurchaseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-id', description: 'ID of the document' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-id', description: 'Company ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document Type' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'A', description: 'Series' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "series", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PUR-001', description: 'Document Number' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Series Number' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseDto.prototype, "seriesNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2023-10-27', description: 'Document Date' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2023-11-27', description: 'Due Date' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SUP001', description: 'Supplier Code', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "supplierCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'supplier-id', description: 'Supplier ID', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Supplier Name', description: 'Supplier Name', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "supplierName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456789', description: 'Supplier NIF', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "supplierNif", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Address', description: 'Supplier Address', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "supplierAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00, description: 'Subtotal' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseDto.prototype, "subtotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0, description: 'Discounts' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseDto.prototype, "discounts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 16.00, description: 'Total IVA' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseDto.prototype, "totalIva", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 116.00, description: 'Total' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePurchaseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Notes', description: 'Notes' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status', default: 'DRAFT' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePurchaseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreatePurchaseLineDto], description: 'Document Lines' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreatePurchaseLineDto),
    __metadata("design:type", Array)
], CreatePurchaseDto.prototype, "lines", void 0);
//# sourceMappingURL=create-purchase.dto.js.map