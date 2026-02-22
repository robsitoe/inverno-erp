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
exports.LicensesController = void 0;
const common_1 = require("@nestjs/common");
const licenses_service_1 = require("./licenses.service");
const generate_license_dto_1 = require("./dto/generate-license.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const manage_license_dto_1 = require("./dto/manage-license.dto");
let LicensesController = class LicensesController {
    licensesService;
    constructor(licensesService) {
        this.licensesService = licensesService;
    }
    async getPlans() {
        return this.licensesService.getAvailablePlans();
    }
    async validatePromo(code) {
        const promo = await this.licensesService.validatePromoCode(code);
        if (!promo) {
            return { valid: false, message: 'Código inválido ou expirado.' };
        }
        return { valid: true, promo };
    }
    async generate(dto, req) {
        const user = req.user;
        if (!user?.isSuperAdmin && !user?.isAdmin) {
            return { error: 'Acesso negado. Apenas administradores podem gerar licenças.' };
        }
        const result = await this.licensesService.generate(dto, user.username || user.sub);
        return {
            token: result.token,
            licenseId: result.license.id,
            companyId: result.license.companyId,
            plan: result.license.plan,
            expiresAt: result.license.expiresAt,
            message: 'Licença gerada com sucesso. Copie o token e envie ao cliente.',
        };
    }
    async activate(dto, req) {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        return this.licensesService.activate(dto.token, ip);
    }
    async subscribe(body) {
        return this.licensesService.subscribe(body.companyId, body.plan);
    }
    async getStatus(companyId) {
        return this.licensesService.getStatus(companyId);
    }
    async revoke(companyId, body, req) {
        const user = req.user;
        if (!user?.isSuperAdmin) {
            return { error: 'Acesso negado. Apenas super-administradores podem revogar licenças.' };
        }
        await this.licensesService.revoke(companyId, body.reason, user.username || user.sub);
        return { message: `Licença da empresa ${companyId} revogada com sucesso.` };
    }
    async listAll(req, query) {
        const user = req.user;
        if (!user?.isSuperAdmin && !user?.isAdmin) {
            return { error: 'Acesso negado.' };
        }
        return this.licensesService.listAll(query);
    }
    async listActive(req) {
        const user = req.user;
        if (!user?.isSuperAdmin && !user?.isAdmin) {
            return { error: 'Acesso negado.' };
        }
        return this.licensesService.listActive();
    }
    async listRenewalsByCompany(companyId, req) {
        const user = req.user;
        if (!user?.isSuperAdmin && !user?.isAdmin) {
            throw new common_1.UnauthorizedException('Acesso negado. Apenas administradores podem ver o histórico de renovações.');
        }
        return this.licensesService.listRenewalsByCompany(companyId);
    }
    async updatePricing(dto, req) {
        const user = req.user;
        if (!user?.isSuperAdmin) {
            return { error: 'Acesso negado. Apenas super-administradores podem atualizar preços.' };
        }
        const result = await this.licensesService.updatePricing(dto.price, dto.companyIds);
        return { message: 'Preço atualizado com sucesso.', ...result };
    }
    async block(dto, req) {
        const user = req.user;
        if (!user?.isSuperAdmin) {
            return { error: 'Acesso negado. Apenas super-administradores podem bloquear licenças.' };
        }
        const result = await this.licensesService.blockLicenses(user.username || user.sub, dto.reason, dto.companyIds);
        return { message: 'Licenças bloqueadas com sucesso.', ...result };
    }
};
exports.LicensesController = LicensesController;
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Get)('promo/:code'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "validatePromo", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_license_dto_1.GenerateLicenseDto, Object]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('activate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_license_dto_1.ActivateLicenseDto, Object]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Get)('status/:companyId'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "getStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':companyId'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "revoke", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, manage_license_dto_1.ListLicensesQueryDto]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "listAll", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('active'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "listActive", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':companyId/renewals'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "listRenewalsByCompany", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('pricing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [manage_license_dto_1.UpdateLicensePricingDto, Object]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "updatePricing", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('block'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [manage_license_dto_1.BlockLicensesDto, Object]),
    __metadata("design:returntype", Promise)
], LicensesController.prototype, "block", null);
exports.LicensesController = LicensesController = __decorate([
    (0, common_1.Controller)('licenses'),
    __metadata("design:paramtypes", [licenses_service_1.LicensesService])
], LicensesController);
//# sourceMappingURL=licenses.controller.js.map