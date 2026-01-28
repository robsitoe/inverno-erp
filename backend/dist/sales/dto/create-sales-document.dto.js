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
exports.CreateSalesDocumentDto = exports.CreateSalesDocumentLineDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreateSalesDocumentLineDto {
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
exports.CreateSalesDocumentLineDto = CreateSalesDocumentLineDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'article-id', description: 'Article ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSalesDocumentLineDto.prototype, "articleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'A001', description: 'Article Code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSalesDocumentLineDto.prototype, "articleCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Product Name', description: 'Article Name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSalesDocumentLineDto.prototype, "articleName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Quantity' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateSalesDocumentLineDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00, description: 'Unit Price' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateSalesDocumentLineDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'LINE-ID', description: 'Line ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentLineDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0, description: 'Discount percentage' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentLineDto.prototype, "discount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 16, description: 'IVA Rate' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentLineDto.prototype, "ivaRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'IVA', description: 'IVA Code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentLineDto.prototype, "ivaCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00, description: 'Subtotal' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentLineDto.prototype, "subtotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 16.00, description: 'IVA Amount' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentLineDto.prototype, "ivaAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 116.00, description: 'Total' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentLineDto.prototype, "total", void 0);
class CreateSalesDocumentDto {
    id;
    companyId;
    documentType;
    series;
    documentNumber;
    seriesNumber;
    date;
    dueDate;
    customerId;
    customerName;
    customerNif;
    customerAddress;
    subtotal;
    discounts;
    totalIva;
    total;
    notes;
    status;
    lines;
}
exports.CreateSalesDocumentDto = CreateSalesDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-id', description: 'ID of the document' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-id', description: 'Company ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document Type' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'A', description: 'Series' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "series", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INV-001', description: 'Document Number' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Series Number' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentDto.prototype, "seriesNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2023-10-27', description: 'Document Date' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2023-11-27', description: 'Due Date' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'customer-id', description: 'Customer ID', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Customer Name', description: 'Customer Name', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456789', description: 'Customer NIF', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "customerNif", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Address', description: 'Customer Address', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "customerAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00, description: 'Subtotal' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentDto.prototype, "subtotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0, description: 'Discounts' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentDto.prototype, "discounts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 16.00, description: 'Total IVA' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentDto.prototype, "totalIva", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 116.00, description: 'Total' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateSalesDocumentDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Notes', description: 'Notes' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status', default: 'DRAFT' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesDocumentDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateSalesDocumentLineDto], description: 'Document Lines' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateSalesDocumentLineDto),
    __metadata("design:type", Array)
], CreateSalesDocumentDto.prototype, "lines", void 0);
//# sourceMappingURL=create-sales-document.dto.js.map