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
exports.ActivateLicenseDto = exports.GenerateLicenseDto = void 0;
const class_validator_1 = require("class-validator");
const license_entity_1 = require("../entities/license.entity");
class GenerateLicenseDto {
    companyId;
    companyName;
    plan;
    durationDays;
    features;
    maxUsers;
    maxCompanies;
    gracePeriodHours;
}
exports.GenerateLicenseDto = GenerateLicenseDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateLicenseDto.prototype, "companyId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateLicenseDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(license_entity_1.LicensePlan),
    __metadata("design:type", String)
], GenerateLicenseDto.prototype, "plan", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(3650),
    __metadata("design:type", Number)
], GenerateLicenseDto.prototype, "durationDays", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], GenerateLicenseDto.prototype, "features", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GenerateLicenseDto.prototype, "maxUsers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GenerateLicenseDto.prototype, "maxCompanies", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GenerateLicenseDto.prototype, "gracePeriodHours", void 0);
class ActivateLicenseDto {
    token;
}
exports.ActivateLicenseDto = ActivateLicenseDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivateLicenseDto.prototype, "token", void 0);
//# sourceMappingURL=generate-license.dto.js.map