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
var LicensesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicensesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const license_entity_1 = require("./entities/license.entity");
const PROMO_CODES = [
    {
        code: 'MAPUTO20',
        discountPercent: 20,
        expiresAt: new Date('2026-12-31'),
        description: 'Desconto de Boas-vindas Maputo'
    },
    {
        code: 'MANHICA-OFERTA',
        discountFixed: 500,
        expiresAt: new Date('2026-06-30'),
        description: 'Desconto Especial Manhiça'
    },
    {
        code: 'INVERNO-SALE',
        discountPercent: 15,
        expiresAt: new Date('2026-03-31'),
        description: 'Promoção de Verão'
    }
];
const LICENSE_PLANS_CONFIG = [
    {
        id: license_entity_1.LicensePlan.LITE,
        name: 'PLAN LOJA / GÁS',
        description: 'Foco em Vendas e Stock',
        price: 3500,
        billing: 'Anual por Empresa',
        features: ['SALES', 'INVENTORY', 'BASIC'],
        benefitSummary: ['Vendas de Balcão', 'Controlo de Stock Simples', '1 Empresa + 1 Utilizador'],
        icon: 'store',
        color: 'green'
    },
    {
        id: license_entity_1.LicensePlan.STANDARD,
        name: 'PLAN ARMAZÉM',
        description: 'Foco em Distribuição',
        price: 8500,
        billing: 'Anual por Empresa',
        features: ['SALES', 'INVENTORY', 'PURCHASES', 'TREASURY', 'BASIC'],
        benefitSummary: ['Compras e Fornecedores', 'Gestão de Armazém', '3 Utilizadores'],
        icon: 'warehouse',
        color: 'blue'
    },
    {
        id: license_entity_1.LicensePlan.PRO,
        name: 'PLAN INDÚSTRIA',
        description: 'Contabilidade Completa',
        price: 15000,
        billing: 'Anual por Empresa',
        features: ['ACCOUNTING', 'INVENTORY', 'SALES', 'PURCHASES', 'TREASURY'],
        benefitSummary: ['Contabilidade e Fiscal', 'Tesouraria Avançada', '5 Utilizadores'],
        icon: 'business',
        color: 'purple',
        isPopular: true
    },
    {
        id: license_entity_1.LicensePlan.ENTERPRISE,
        name: 'PLAN ENTERPRISE',
        description: 'Gestão VIP',
        price: 50000,
        billing: 'Anual com Suporte VIP',
        features: ['ALL'],
        benefitSummary: ['Utilizadores ILIMITADOS', 'Multi-Empresa', 'Suporte VIP 24/7'],
        icon: 'corporate_fare',
        color: 'amber'
    }
];
let LicensesService = LicensesService_1 = class LicensesService {
    licenseRepo;
    jwtService;
    configService;
    logger = new common_1.Logger(LicensesService_1.name);
    constructor(licenseRepo, jwtService, configService) {
        this.licenseRepo = licenseRepo;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async getAvailablePlans() {
        return LICENSE_PLANS_CONFIG;
    }
    async validatePromoCode(code) {
        const promo = PROMO_CODES.find(p => p.code.toUpperCase() === code.toUpperCase());
        if (!promo)
            return null;
        const now = new Date();
        if (promo.expiresAt < now)
            return null;
        return promo;
    }
    async generate(dto, issuedBy) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + dto.durationDays);
        const features = dto.features ?? this.defaultFeaturesForPlan(dto.plan);
        const gracePeriodHours = dto.gracePeriodHours ?? 72;
        let license = await this.licenseRepo.findOne({ where: { companyId: dto.companyId } });
        if (!license) {
            license = this.licenseRepo.create();
        }
        license.companyId = dto.companyId;
        license.companyName = dto.companyName;
        license.plan = dto.plan;
        license.status = license_entity_1.LicenseStatus.ACTIVE;
        license.expiresAt = expiresAt;
        license.activatedBy = issuedBy;
        license.features = features;
        license.maxUsers = dto.maxUsers;
        license.maxCompanies = dto.maxCompanies;
        license.gracePeriodHours = gracePeriodHours;
        license.isRevoked = false;
        license.revokedAt = undefined;
        license.revokedBy = undefined;
        license.revokedReason = undefined;
        await this.licenseRepo.save(license);
        const licenseSecret = this.configService.get('LICENSE_SECRET') || 'license-secret-change-in-production';
        const payload = {
            sub: license.id,
            cid: dto.companyId,
            cn: dto.companyName,
            plan: dto.plan,
            features,
            maxUsers: dto.maxUsers,
            maxCompanies: dto.maxCompanies,
            gracePeriodHours,
        };
        const token = this.jwtService.sign(payload, {
            secret: licenseSecret,
            expiresIn: `${dto.durationDays}d`,
        });
        license.licenseToken = token;
        await this.licenseRepo.save(license);
        this.logger.log(`License generated for company ${dto.companyId} (${dto.plan}) by ${issuedBy}`);
        return { token, license };
    }
    async activate(token, requestIp) {
        const licenseSecret = this.configService.get('LICENSE_SECRET') || 'license-secret-change-in-production';
        let payload;
        try {
            payload = this.jwtService.verify(token, { secret: licenseSecret });
        }
        catch (err) {
            throw new common_1.BadRequestException('Token de licença inválido ou expirado.');
        }
        const license = await this.licenseRepo.findOne({ where: { id: payload.sub, companyId: payload.cid } });
        if (!license) {
            throw new common_1.NotFoundException('Licença não encontrada no servidor.');
        }
        if (license.isRevoked) {
            throw new common_1.UnauthorizedException('Esta licença foi revogada.');
        }
        license.activatedIp = requestIp;
        license.licenseToken = token;
        await this.licenseRepo.save(license);
        this.logger.log(`License activated for company ${payload.cid} from IP ${requestIp}`);
        return this.buildStatusResponse(license, token);
    }
    async getStatus(companyId) {
        const license = await this.licenseRepo.findOne({ where: { companyId } });
        if (!license) {
            return this.buildDemoStatus(companyId);
        }
        await this.syncStatus(license);
        return this.buildStatusResponse(license);
    }
    async revoke(companyId, reason, revokedBy) {
        const license = await this.licenseRepo.findOne({ where: { companyId } });
        if (!license)
            throw new common_1.NotFoundException('Licença não encontrada.');
        license.isRevoked = true;
        license.status = license_entity_1.LicenseStatus.REVOKED;
        license.revokedAt = new Date();
        license.revokedBy = revokedBy;
        license.revokedReason = reason;
        await this.licenseRepo.save(license);
        this.logger.warn(`License REVOKED for company ${companyId} by ${revokedBy}. Reason: ${reason}`);
    }
    async listAll() {
        return this.licenseRepo.find({ order: { createdAt: 'DESC' } });
    }
    async validateToken(token) {
        const licenseSecret = this.configService.get('LICENSE_SECRET') || 'license-secret-change-in-production';
        try {
            return this.jwtService.verify(token, { secret: licenseSecret });
        }
        catch {
            return null;
        }
    }
    async syncStatus(license) {
        if (license.isRevoked) {
            license.status = license_entity_1.LicenseStatus.REVOKED;
            await this.licenseRepo.save(license);
            return;
        }
        const now = new Date();
        const gracePeriodEnd = new Date(license.expiresAt);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + license.gracePeriodHours);
        if (now <= license.expiresAt) {
            license.status = license_entity_1.LicenseStatus.ACTIVE;
        }
        else if (now <= gracePeriodEnd) {
            license.status = license_entity_1.LicenseStatus.GRACE;
        }
        else {
            license.status = license_entity_1.LicenseStatus.EXPIRED;
        }
        await this.licenseRepo.save(license);
    }
    buildStatusResponse(license, token) {
        const now = new Date();
        const msRemaining = license.expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
        const gracePeriodEnd = new Date(license.expiresAt);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + license.gracePeriodHours);
        const inGracePeriod = license.status === license_entity_1.LicenseStatus.GRACE;
        return {
            valid: license.status === license_entity_1.LicenseStatus.ACTIVE || license.status === license_entity_1.LicenseStatus.GRACE,
            status: license.status,
            plan: license.plan,
            companyName: license.companyName,
            expiresAt: license.expiresAt,
            daysRemaining,
            features: license.features ?? [],
            maxUsers: license.maxUsers,
            maxCompanies: license.maxCompanies,
            inGracePeriod,
            gracePeriodEndsAt: inGracePeriod ? gracePeriodEnd : undefined,
            token,
        };
    }
    buildDemoStatus(companyId) {
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);
        return {
            valid: true,
            status: license_entity_1.LicenseStatus.ACTIVE,
            plan: license_entity_1.LicensePlan.DEMO,
            companyName: companyId,
            expiresAt: expires,
            daysRemaining: 30,
            features: ['SALES', 'PURCHASES', 'BASIC'],
            inGracePeriod: false,
        };
    }
    defaultFeaturesForPlan(plan) {
        switch (plan) {
            case license_entity_1.LicensePlan.DEMO:
                return ['SALES', 'PURCHASES', 'BASIC'];
            case license_entity_1.LicensePlan.LITE:
                return ['SALES', 'INVENTORY', 'BASIC'];
            case license_entity_1.LicensePlan.STANDARD:
                return ['SALES', 'INVENTORY', 'PURCHASES', 'TREASURY', 'BASIC'];
            case license_entity_1.LicensePlan.PRO:
                return ['ACCOUNTING', 'INVENTORY', 'SALES', 'PURCHASES', 'TREASURY'];
            case license_entity_1.LicensePlan.ENTERPRISE:
                return ['ALL'];
            default:
                return ['BASIC'];
        }
    }
};
exports.LicensesService = LicensesService;
exports.LicensesService = LicensesService = LicensesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(license_entity_1.License)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService])
], LicensesService);
//# sourceMappingURL=licenses.service.js.map