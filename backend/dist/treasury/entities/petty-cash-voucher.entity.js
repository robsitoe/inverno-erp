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
exports.PettyCashVoucher = void 0;
const typeorm_1 = require("typeorm");
let PettyCashVoucher = class PettyCashVoucher {
    id;
    companyId;
    number;
    date;
    amount;
    amountInWords;
    titularName;
    employeeId;
    reason;
    isPersonalAdvance;
    isDeducted;
    deductedInPayrollId;
    status;
    issuedBy;
    observations;
    createdAt;
    updatedAt;
};
exports.PettyCashVoucher = PettyCashVoucher;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], PettyCashVoucher.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "amountInWords", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "titularName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PettyCashVoucher.prototype, "isPersonalAdvance", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PettyCashVoucher.prototype, "isDeducted", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "deductedInPayrollId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: 'PAID'
    }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "issuedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PettyCashVoucher.prototype, "observations", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PettyCashVoucher.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PettyCashVoucher.prototype, "updatedAt", void 0);
exports.PettyCashVoucher = PettyCashVoucher = __decorate([
    (0, typeorm_1.Entity)('petty_cash_vouchers')
], PettyCashVoucher);
//# sourceMappingURL=petty-cash-voucher.entity.js.map