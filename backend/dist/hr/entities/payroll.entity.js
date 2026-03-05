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
exports.Payroll = exports.PayrollStatus = void 0;
const typeorm_1 = require("typeorm");
var PayrollStatus;
(function (PayrollStatus) {
    PayrollStatus["DRAFT"] = "DRAFT";
    PayrollStatus["POSTED"] = "POSTED";
    PayrollStatus["PAID"] = "PAID";
    PayrollStatus["CANCELED"] = "CANCELED";
})(PayrollStatus || (exports.PayrollStatus = PayrollStatus = {}));
let Payroll = class Payroll {
    id;
    companyId;
    employeeId;
    employeeName;
    employeeCode;
    year;
    month;
    grossSalary;
    inssEmployee;
    inssEmployer;
    irps;
    transportSubsidy;
    foodSubsidy;
    overtimeAmount;
    bonusAmount;
    dependents;
    daysWorked;
    absenceDays;
    absenceDeduction;
    vacationDays;
    cashVoucherDeduction;
    netSalary;
    status;
    journalEntryId;
    paymentDate;
    createdAt;
    updatedAt;
};
exports.Payroll = Payroll;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], Payroll.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Payroll.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Payroll.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Payroll.prototype, "employeeName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Payroll.prototype, "employeeCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Payroll.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Payroll.prototype, "month", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "grossSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "inssEmployee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "inssEmployer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "irps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "transportSubsidy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "foodSubsidy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "overtimeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "bonusAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "dependents", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 30 }),
    __metadata("design:type", Number)
], Payroll.prototype, "daysWorked", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "absenceDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "absenceDeduction", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "vacationDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "cashVoucherDeduction", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Payroll.prototype, "netSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ['DRAFT', 'POSTED', 'PAID', 'CANCELED'],
        default: 'DRAFT',
    }),
    __metadata("design:type", String)
], Payroll.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payroll.prototype, "journalEntryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", String)
], Payroll.prototype, "paymentDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Payroll.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Payroll.prototype, "updatedAt", void 0);
exports.Payroll = Payroll = __decorate([
    (0, typeorm_1.Entity)('payroll_records'),
    (0, typeorm_1.Unique)(['companyId', 'employeeId', 'year', 'month'])
], Payroll);
//# sourceMappingURL=payroll.entity.js.map