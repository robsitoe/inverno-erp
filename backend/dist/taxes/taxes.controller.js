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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const taxes_service_1 = require("./taxes.service");
const create_tax_rate_dto_1 = require("./dto/create-tax-rate.dto");
const update_tax_rate_dto_1 = require("./dto/update-tax-rate.dto");
const license_guard_1 = require("../auth/guards/license.guard");
let TaxesController = class TaxesController {
    taxesService;
    constructor(taxesService) {
        this.taxesService = taxesService;
    }
    create(createDto) {
        return this.taxesService.create(createDto);
    }
    findAll(companyId) {
        return this.taxesService.findAll(companyId);
    }
    findOne(id, companyId) {
        return this.taxesService.findOne(id, companyId);
    }
    update(id, updateDto) {
        return this.taxesService.update(id, updateDto);
    }
    remove(id, companyId) {
        return this.taxesService.remove(id, companyId);
    }
    seed(companyId) {
        return this.taxesService.seedDefaults(companyId);
    }
};
exports.TaxesController = TaxesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new tax rate' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tax_rate_dto_1.CreateTaxRateDto]),
    __metadata("design:returntype", void 0)
], TaxesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all tax rates' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TaxesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a tax rate by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TaxesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a tax rate' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_tax_rate_dto_1.UpdateTaxRateDto]),
    __metadata("design:returntype", void 0)
], TaxesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a tax rate' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TaxesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('seed'),
    (0, swagger_1.ApiOperation)({ summary: 'Seed default tax rates for a company' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TaxesController.prototype, "seed", null);
exports.TaxesController = TaxesController = __decorate([
    (0, swagger_1.ApiTags)('taxes'),
    (0, common_1.Controller)('taxes'),
    (0, common_1.UseGuards)(license_guard_1.LicenseGuard),
    __metadata("design:paramtypes", [taxes_service_1.TaxesService])
], TaxesController);
//# sourceMappingURL=taxes.controller.js.map