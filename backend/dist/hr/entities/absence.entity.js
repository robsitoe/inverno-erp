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
exports.Absence = exports.AbsenceStatus = exports.AbsenceType = void 0;
const typeorm_1 = require("typeorm");
const employee_entity_1 = require("./employee.entity");
var AbsenceType;
(function (AbsenceType) {
    AbsenceType["VACATION"] = "VACATION";
    AbsenceType["SICKNESS"] = "SICKNESS";
    AbsenceType["JUSTIFIED"] = "JUSTIFIED";
    AbsenceType["UNJUSTIFIED"] = "UNJUSTIFIED";
    AbsenceType["MATERNITY"] = "MATERNITY";
    AbsenceType["OTHER"] = "OTHER";
})(AbsenceType || (exports.AbsenceType = AbsenceType = {}));
var AbsenceStatus;
(function (AbsenceStatus) {
    AbsenceStatus["PENDING"] = "PENDING";
    AbsenceStatus["APPROVED"] = "APPROVED";
    AbsenceStatus["REJECTED"] = "REJECTED";
})(AbsenceStatus || (exports.AbsenceStatus = AbsenceStatus = {}));
let Absence = class Absence {
    id;
    companyId;
    employeeId;
    employee;
    type;
    startDate;
    endDate;
    days;
    reason;
    status;
    createdAt;
    updatedAt;
};
exports.Absence = Absence;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], Absence.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Absence.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Absence.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => employee_entity_1.Employee),
    (0, typeorm_1.JoinColumn)({ name: 'employeeId' }),
    __metadata("design:type", employee_entity_1.Employee)
], Absence.prototype, "employee", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: AbsenceType,
        default: AbsenceType.VACATION,
    }),
    __metadata("design:type", String)
], Absence.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Absence.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Absence.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Absence.prototype, "days", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Absence.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: AbsenceStatus,
        default: AbsenceStatus.PENDING,
    }),
    __metadata("design:type", String)
], Absence.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Absence.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Absence.prototype, "updatedAt", void 0);
exports.Absence = Absence = __decorate([
    (0, typeorm_1.Entity)('hr_absences')
], Absence);
//# sourceMappingURL=absence.entity.js.map