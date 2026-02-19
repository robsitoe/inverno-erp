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
exports.LicenseRenewal = void 0;
const typeorm_1 = require("typeorm");
const license_entity_1 = require("./license.entity");
let LicenseRenewal = class LicenseRenewal {
    id;
    companyId;
    licenseId;
    license;
    paidAt;
    durationDays;
    amount;
    previousExpiresAt;
    newExpiresAt;
    issuedBy;
    createdAt;
};
exports.LicenseRenewal = LicenseRenewal;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], LicenseRenewal.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LicenseRenewal.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LicenseRenewal.prototype, "licenseId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => license_entity_1.License, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'licenseId' }),
    __metadata("design:type", license_entity_1.License)
], LicenseRenewal.prototype, "license", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], LicenseRenewal.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], LicenseRenewal.prototype, "durationDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], LicenseRenewal.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], LicenseRenewal.prototype, "previousExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], LicenseRenewal.prototype, "newExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LicenseRenewal.prototype, "issuedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], LicenseRenewal.prototype, "createdAt", void 0);
exports.LicenseRenewal = LicenseRenewal = __decorate([
    (0, typeorm_1.Entity)('license_renewals')
], LicenseRenewal);
//# sourceMappingURL=license-renewal.entity.js.map