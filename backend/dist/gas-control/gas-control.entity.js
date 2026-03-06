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
exports.GasDailyEntry = exports.GasDailyControl = exports.GasCylinderType = void 0;
const typeorm_1 = require("typeorm");
let GasCylinderType = class GasCylinderType {
    id;
    companyId;
    name;
    brand;
    priceRevendedor;
    priceBomba;
    priceConsumidor;
    isActive;
};
exports.GasCylinderType = GasCylinderType;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], GasCylinderType.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GasCylinderType.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GasCylinderType.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'PETROGAS' }),
    __metadata("design:type", String)
], GasCylinderType.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], GasCylinderType.prototype, "priceRevendedor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], GasCylinderType.prototype, "priceBomba", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], GasCylinderType.prototype, "priceConsumidor", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], GasCylinderType.prototype, "isActive", void 0);
exports.GasCylinderType = GasCylinderType = __decorate([
    (0, typeorm_1.Entity)('gas_cylinder_types')
], GasCylinderType);
let GasDailyControl = class GasDailyControl {
    id;
    companyId;
    date;
    status;
    openedBy;
    openedAt;
    closedBy;
    closedAt;
    initialStock;
    finalStock;
    auditLog;
    createdAt;
    updatedAt;
};
exports.GasDailyControl = GasDailyControl;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], GasDailyControl.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GasDailyControl.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], GasDailyControl.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'NOT_STARTED' }),
    __metadata("design:type", String)
], GasDailyControl.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], GasDailyControl.prototype, "openedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], GasDailyControl.prototype, "openedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], GasDailyControl.prototype, "closedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], GasDailyControl.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], GasDailyControl.prototype, "initialStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], GasDailyControl.prototype, "finalStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], GasDailyControl.prototype, "auditLog", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], GasDailyControl.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], GasDailyControl.prototype, "updatedAt", void 0);
exports.GasDailyControl = GasDailyControl = __decorate([
    (0, typeorm_1.Entity)('gas_daily_controls')
], GasDailyControl);
let GasDailyEntry = class GasDailyEntry {
    id;
    controlId;
    companyId;
    cylinderTypeId;
    customerName;
    entryType;
    priceType;
    s_gpl;
    s_vaz;
    s_av;
    vz_vend;
    adc_caucao;
    e_gpl;
    e_vaz;
    e_av;
    p_divida;
    totalAmount;
    gr;
    invoice;
};
exports.GasDailyEntry = GasDailyEntry;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], GasDailyEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GasDailyEntry.prototype, "controlId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GasDailyEntry.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GasDailyEntry.prototype, "cylinderTypeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GasDailyEntry.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'CUSTOMER' }),
    __metadata("design:type", String)
], GasDailyEntry.prototype, "entryType", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'REVENDEDOR' }),
    __metadata("design:type", String)
], GasDailyEntry.prototype, "priceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "s_gpl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "s_vaz", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "s_av", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "vz_vend", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "adc_caucao", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "e_gpl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "e_vaz", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "e_av", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "p_divida", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], GasDailyEntry.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], GasDailyEntry.prototype, "gr", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], GasDailyEntry.prototype, "invoice", void 0);
exports.GasDailyEntry = GasDailyEntry = __decorate([
    (0, typeorm_1.Entity)('gas_daily_entries')
], GasDailyEntry);
//# sourceMappingURL=gas-control.entity.js.map