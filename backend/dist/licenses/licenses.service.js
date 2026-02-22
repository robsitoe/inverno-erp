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
const license_renewal_entity_1 = require("./entities/license-renewal.entity");
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
    licenseRenewalRepo;
    jwtService;
    configService;
    logger = new common_1.Logger(LicensesService_1.name);
    constructor(licenseRepo, licenseRenewalRepo, jwtService, configService) {
        this.licenseRepo = licenseRepo;
        this.licenseRenewalRepo = licenseRenewalRepo;
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
        const now = new Date();
        const features = dto.features ?? this.defaultFeaturesForPlan(dto.plan);
        const gracePeriodHours = dto.gracePeriodHours ?? 72;
        let license = await this.licenseRepo.findOne({ where: { companyId: dto.companyId } });
        if (!license) {
            license = this.licenseRepo.create();
        }
        const previousExpiresAt = license.expiresAt ? new Date(license.expiresAt) : undefined;
        const baseDate = license.expiresAt && !license.isRevoked
            ? new Date(Math.max(now.getTime(), new Date(license.expiresAt).getTime()))
            : now;
        const expiresAt = new Date(baseDate);
        expiresAt.setDate(expiresAt.getDate() + dto.durationDays);
        license.companyId = dto.companyId;
        license.companyName = dto.companyName;
        license.plan = dto.plan;
        license.status = license_entity_1.LicenseStatus.ACTIVE;
        license.expiresAt = expiresAt;
        license.activatedBy = issuedBy;
        license.features = features;
        license.maxUsers = dto.maxUsers;
        license.maxCompanies = dto.maxCompanies;
        license.contactEmail = dto.contactEmail;
        license.contactPhone = dto.contactPhone;
        license.price = dto.price;
        license.gracePeriodHours = gracePeriodHours;
        license.isRevoked = false;
        license.revokedAt = undefined;
        license.revokedBy = undefined;
        license.revokedReason = undefined;
        await this.licenseRepo.save(license);
        await this.licenseRenewalRepo.save(this.licenseRenewalRepo.create({
            companyId: dto.companyId,
            licenseId: license.id,
            paidAt: now,
            durationDays: dto.durationDays,
            amount: dto.price,
            previousExpiresAt,
            newExpiresAt: expiresAt,
            issuedBy,
        }));
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
    async subscribe(companyId, plan) {
        this.logger.log(`Auto-subscribing company ${companyId} to plan ${plan}`);
        const planConfig = LICENSE_PLANS_CONFIG.find(p => p.id === plan);
        if (!planConfig && plan !== license_entity_1.LicensePlan.DEMO) {
            throw new common_1.BadRequestException('Plano de licença inválido.');
        }
        const company = await this.licenseRepo.manager.getRepository(license_entity_1.License).query(`SELECT name FROM companies WHERE id = $1`, [companyId]);
        const companyName = company && company[0] ? company[0].name : companyId;
        const dto = {
            companyId,
            companyName,
            plan,
            durationDays: plan === license_entity_1.LicensePlan.DEMO ? 30 : 365,
            features: planConfig?.features || this.defaultFeaturesForPlan(plan),
            price: planConfig?.price || 0,
        };
        const result = await this.generate(dto, 'SYSTEM-PAYMENT-AUTO');
        return this.buildStatusResponse(result.license, result.token);
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
    async listAll(filters) {
        const where = [];
        if (filters?.search) {
            where.push({ companyName: (0, typeorm_2.ILike)(`%${filters.search}%`) }, { companyId: (0, typeorm_2.ILike)(`%${filters.search}%`) }, { contactEmail: (0, typeorm_2.ILike)(`%${filters.search}%`) }, { contactPhone: (0, typeorm_2.ILike)(`%${filters.search}%`) });
        }
        const licenses = await this.licenseRepo.find({
            where: where.length ? where : undefined,
            order: { createdAt: 'DESC' },
        });
        if (!filters?.status) {
            return licenses;
        }
        const status = filters.status.toUpperCase();
        return licenses.filter((license) => license.status === status);
    }
    async listActive() {
        const licenses = await this.licenseRepo.find({
            where: { isRevoked: false },
            order: { createdAt: 'DESC' },
        });
        for (const license of licenses) {
            await this.syncStatus(license);
        }
        return licenses.filter((license) => [license_entity_1.LicenseStatus.ACTIVE, license_entity_1.LicenseStatus.GRACE].includes(license.status));
    }
    async updatePricing(price, companyIds) {
        if (companyIds?.length) {
            const result = await this.licenseRepo.update({ companyId: (0, typeorm_2.In)(companyIds) }, { price });
            return { updated: result.affected ?? 0 };
        }
        const result = await this.licenseRepo
            .createQueryBuilder()
            .update(license_entity_1.License)
            .set({ price })
            .execute();
        return { updated: result.affected ?? 0 };
    }
    async blockLicenses(blockedBy, reason, companyIds) {
        const licenses = companyIds?.length
            ? await this.licenseRepo.find({ where: { companyId: (0, typeorm_2.In)(companyIds) } })
            : await this.licenseRepo.find();
        for (const license of licenses) {
            license.isRevoked = true;
            license.status = license_entity_1.LicenseStatus.REVOKED;
            license.revokedAt = new Date();
            license.revokedBy = blockedBy;
            license.revokedReason = reason || 'Bloqueio administrativo';
            await this.licenseRepo.save(license);
        }
        return { blocked: licenses.length };
    }
    async listRenewalsByCompany(companyId) {
        return this.licenseRenewalRepo.find({
            where: { companyId },
            order: { paidAt: 'DESC' },
        });
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
            gracePeriodEndsAt: gracePeriodEnd,
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
            gracePeriodEndsAt: expires,
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
    __param(1, (0, typeorm_1.InjectRepository)(license_renewal_entity_1.LicenseRenewal)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService])
], LicensesService);
//# sourceMappingURL=licenses.service.js.map