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
exports.TreasuryController = void 0;
const common_1 = require("@nestjs/common");
const treasury_service_1 = require("./treasury.service");
const create_treasury_dto_1 = require("./dto/create-treasury.dto");
const update_treasury_dto_1 = require("./dto/update-treasury.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const license_guard_1 = require("../auth/guards/license.guard");
let TreasuryController = class TreasuryController {
    treasuryService;
    constructor(treasuryService) {
        this.treasuryService = treasuryService;
    }
    create(createTreasuryDto) {
        return this.treasuryService.create(createTreasuryDto);
    }
    findAll(companyId) {
        return this.treasuryService.findAll(companyId);
    }
    findOne(id) {
        return this.treasuryService.findOne(id);
    }
    update(id, updateTreasuryDto) {
        return this.treasuryService.update(id, updateTreasuryDto);
    }
    remove(id) {
        return this.treasuryService.remove(id);
    }
    processWorkflow(id, data, req) {
        return this.treasuryService.processWorkflow(id, data.action, req.user, data.notes);
    }
    getHistory(id) {
        return this.treasuryService.getWorkflowHistory(id);
    }
    findAllReceipts(companyId) {
        return this.treasuryService.findAllReceipts(companyId);
    }
    createReceipt(data) {
        return this.treasuryService.createReceipt(data);
    }
    findAllPayments(companyId) {
        return this.treasuryService.findAllPayments(companyId);
    }
    createPayment(data) {
        return this.treasuryService.createPayment(data);
    }
    createVoucher(data, req) {
        return this.treasuryService.createVoucher(data, req.user);
    }
    getNextNumber(companyId) {
        return this.treasuryService.getNextVoucherNumber(companyId);
    }
    findAllVouchers(companyId) {
        return this.treasuryService.findAllVouchers(companyId);
    }
    findOneVoucher(id) {
        return this.treasuryService.findOneVoucher(id);
    }
    updateVoucher(id, data) {
        return this.treasuryService.updateVoucher(id, data);
    }
    removeVoucher(id) {
        return this.treasuryService.removeVoucher(id);
    }
};
exports.TreasuryController = TreasuryController;
__decorate([
    (0, common_1.Post)('documents'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_treasury_dto_1.CreateTreasuryDto]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('documents'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('documents/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('documents/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_treasury_dto_1.UpdateTreasuryDto]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)('documents/:id/workflow'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "processWorkflow", null);
__decorate([
    (0, common_1.Get)('documents/:id/history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('receipts'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "findAllReceipts", null);
__decorate([
    (0, common_1.Post)('receipts'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "createReceipt", null);
__decorate([
    (0, common_1.Get)('payments'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "findAllPayments", null);
__decorate([
    (0, common_1.Post)('payments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Post)('vouchers'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "createVoucher", null);
__decorate([
    (0, common_1.Get)('vouchers/next-number'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "getNextNumber", null);
__decorate([
    (0, common_1.Get)('vouchers'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "findAllVouchers", null);
__decorate([
    (0, common_1.Get)('vouchers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "findOneVoucher", null);
__decorate([
    (0, common_1.Patch)('vouchers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "updateVoucher", null);
__decorate([
    (0, common_1.Delete)('vouchers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "removeVoucher", null);
exports.TreasuryController = TreasuryController = __decorate([
    (0, common_1.Controller)('treasury'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, license_guard_1.LicenseGuard),
    __metadata("design:paramtypes", [treasury_service_1.TreasuryService])
], TreasuryController);
//# sourceMappingURL=treasury.controller.js.map