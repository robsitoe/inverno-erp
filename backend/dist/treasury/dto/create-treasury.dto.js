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
exports.CreateTreasuryDto = exports.CreateTreasuryLineDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreateTreasuryLineDto {
    id;
    docNumber;
    amount;
    paymentMode;
}
exports.CreateTreasuryLineDto = CreateTreasuryLineDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-id' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryLineDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INV-001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTreasuryLineDto.prototype, "docNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateTreasuryLineDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CASH' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryLineDto.prototype, "paymentMode", void 0);
class CreateTreasuryDto {
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
}
exports.CreateTreasuryDto = CreateTreasuryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-id' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-id' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'RECEIPT' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'RE' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "docType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "series", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateTreasuryDto.prototype, "seriesNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'RE 2024/1' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100.00 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateTreasuryDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'acc-id' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "treasuryAccountId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CLI001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "entityCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Customer Name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "entityName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CLI001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "customerCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Customer Name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SUP001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "beneficiaryCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Supplier Name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "beneficiaryName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CASH' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Description' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Observations' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "observations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INV-001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTreasuryDto.prototype, "relatedDocument", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateTreasuryLineDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateTreasuryLineDto),
    __metadata("design:type", Array)
], CreateTreasuryDto.prototype, "lines", void 0);
//# sourceMappingURL=create-treasury.dto.js.map