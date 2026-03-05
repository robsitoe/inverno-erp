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
exports.HRSettings = exports.TaxBracket = void 0;
const typeorm_1 = require("typeorm");
let TaxBracket = class TaxBracket {
    id;
    companyId;
    minAmount;
    maxAmount;
    rate;
    deduction0;
    deduction1;
    deduction2;
    deduction3;
    deduction4Plus;
    isActive;
};
exports.TaxBracket = TaxBracket;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], TaxBracket.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxBracket.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], TaxBracket.prototype, "minAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], TaxBracket.prototype, "maxAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], TaxBracket.prototype, "rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], TaxBracket.prototype, "deduction0", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], TaxBracket.prototype, "deduction1", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], TaxBracket.prototype, "deduction2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], TaxBracket.prototype, "deduction3", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], TaxBracket.prototype, "deduction4Plus", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], TaxBracket.prototype, "isActive", void 0);
exports.TaxBracket = TaxBracket = __decorate([
    (0, typeorm_1.Entity)('hr_tax_brackets')
], TaxBracket);
let HRSettings = class HRSettings {
    companyId;
    inssEmployeeRate;
    inssEmployerRate;
    currency;
};
exports.HRSettings = HRSettings;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], HRSettings.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 3 }),
    __metadata("design:type", Number)
], HRSettings.prototype, "inssEmployeeRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 4 }),
    __metadata("design:type", Number)
], HRSettings.prototype, "inssEmployerRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'MT' }),
    __metadata("design:type", String)
], HRSettings.prototype, "currency", void 0);
exports.HRSettings = HRSettings = __decorate([
    (0, typeorm_1.Entity)('hr_settings')
], HRSettings);
//# sourceMappingURL=hr-settings.entity.js.map