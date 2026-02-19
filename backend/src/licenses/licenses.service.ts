import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, ILike, Repository } from 'typeorm';
import { LicenseRenewal } from './entities/license-renewal.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { License, LicensePlan, LicenseStatus } from './entities/license.entity';
import { GenerateLicenseDto } from './dto/generate-license.dto';
import { ListLicensesQueryDto } from './dto/manage-license.dto';

export interface LicensePayload {
    sub: string;        // license id
    cid: string;        // companyId
    cn: string;         // companyName
    plan: LicensePlan;
    features: string[];
    maxUsers?: number;
    maxCompanies?: number;
    gracePeriodHours: number;
    iat?: number;
    exp?: number;
}

export interface LicenseStatusResponse {
    valid: boolean;
    status: LicenseStatus;
    plan: LicensePlan;
    companyName: string;
    expiresAt: Date;
    daysRemaining: number;
    features: string[];
    maxUsers?: number;
    maxCompanies?: number;
    inGracePeriod: boolean;
    gracePeriodEndsAt: Date;
    token?: string; // returned on activation
}

export interface PromoCode {
    code: string;
    discountPercent?: number;
    discountFixed?: number;
    expiresAt: Date;
    region?: string; // Optional: restrict to a region
    description: string;
}

const PROMO_CODES: PromoCode[] = [
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

export interface LicensePlanDefinition {
    id: LicensePlan;
    name: string;
    description: string;
    price: number;
    billing: string;
    features: string[];
    benefitSummary: string[];
    icon: string;
    color: string;
    isPopular?: boolean;
}

const LICENSE_PLANS_CONFIG: LicensePlanDefinition[] = [
    {
        id: LicensePlan.LITE,
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
        id: LicensePlan.STANDARD,
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
        id: LicensePlan.PRO,
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
        id: LicensePlan.ENTERPRISE,
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

@Injectable()
export class LicensesService {
    private readonly logger = new Logger(LicensesService.name);

    constructor(
        @InjectRepository(License)
        private readonly licenseRepo: Repository<License>,
        @InjectRepository(LicenseRenewal)
        private readonly licenseRenewalRepo: Repository<LicenseRenewal>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async getAvailablePlans(): Promise<LicensePlanDefinition[]> {
        return LICENSE_PLANS_CONFIG;
    }

    async validatePromoCode(code: string): Promise<PromoCode | null> {
        const promo = PROMO_CODES.find(p => p.code.toUpperCase() === code.toUpperCase());
        if (!promo) return null;

        const now = new Date();
        if (promo.expiresAt < now) return null;

        return promo;
    }

    // ─── GENERATE (Admin only) ────────────────────────────────────────────────

    async generate(dto: GenerateLicenseDto, issuedBy: string): Promise<{ token: string; license: License }> {
        const now = new Date();
        const features = dto.features ?? this.defaultFeaturesForPlan(dto.plan);
        const gracePeriodHours = dto.gracePeriodHours ?? 72;

        // Upsert: if company already has a license, update it without losing validity history
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
        license.status = LicenseStatus.ACTIVE;
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

        await this.licenseRenewalRepo.save(
            this.licenseRenewalRepo.create({
                companyId: dto.companyId,
                licenseId: license.id,
                paidAt: now,
                durationDays: dto.durationDays,
                amount: dto.price,
                previousExpiresAt,
                newExpiresAt: expiresAt,
                issuedBy,
            }),
        );

        // Sign JWT with license secret (separate from user auth secret)
        const licenseSecret = this.configService.get<string>('LICENSE_SECRET') || 'license-secret-change-in-production';

        const payload: LicensePayload = {
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

    // ─── ACTIVATE (Client activates their license) ────────────────────────────

    async activate(token: string, requestIp: string): Promise<LicenseStatusResponse> {
        const licenseSecret = this.configService.get<string>('LICENSE_SECRET') || 'license-secret-change-in-production';

        let payload: LicensePayload;
        try {
            payload = this.jwtService.verify<LicensePayload>(token, { secret: licenseSecret });
        } catch (err) {
            throw new BadRequestException('Token de licença inválido ou expirado.');
        }

        const license = await this.licenseRepo.findOne({ where: { id: payload.sub, companyId: payload.cid } });
        if (!license) {
            throw new NotFoundException('Licença não encontrada no servidor.');
        }

        if (license.isRevoked) {
            throw new UnauthorizedException('Esta licença foi revogada.');
        }

        // Update activation IP
        license.activatedIp = requestIp;
        license.licenseToken = token;
        await this.licenseRepo.save(license);

        this.logger.log(`License activated for company ${payload.cid} from IP ${requestIp}`);

        return this.buildStatusResponse(license, token);
    }

    // ─── STATUS (Frontend polls this) ─────────────────────────────────────────

    async getStatus(companyId: string): Promise<LicenseStatusResponse> {
        const license = await this.licenseRepo.findOne({ where: { companyId } });

        if (!license) {
            // Return a DEMO license status if none found
            return this.buildDemoStatus(companyId);
        }

        // Sync status based on current time (server time — tamper-proof)
        await this.syncStatus(license);

        return this.buildStatusResponse(license);
    }

    // ─── REVOKE (Admin only) ──────────────────────────────────────────────────

    async revoke(companyId: string, reason: string, revokedBy: string): Promise<void> {
        const license = await this.licenseRepo.findOne({ where: { companyId } });
        if (!license) throw new NotFoundException('Licença não encontrada.');

        license.isRevoked = true;
        license.status = LicenseStatus.REVOKED;
        license.revokedAt = new Date();
        license.revokedBy = revokedBy;
        license.revokedReason = reason;

        await this.licenseRepo.save(license);
        this.logger.warn(`License REVOKED for company ${companyId} by ${revokedBy}. Reason: ${reason}`);
    }

    // ─── LIST (Admin only) ────────────────────────────────────────────────────

    async listAll(filters?: ListLicensesQueryDto): Promise<License[]> {
        const where: any[] = [];

        if (filters?.search) {
            where.push(
                { companyName: ILike(`%${filters.search}%`) },
                { companyId: ILike(`%${filters.search}%`) },
                { contactEmail: ILike(`%${filters.search}%`) },
                { contactPhone: ILike(`%${filters.search}%`) },
            );
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

    async listActive(): Promise<License[]> {
        const licenses = await this.licenseRepo.find({
            where: { isRevoked: false },
            order: { createdAt: 'DESC' },
        });

        for (const license of licenses) {
            await this.syncStatus(license);
        }

        return licenses.filter((license) => [LicenseStatus.ACTIVE, LicenseStatus.GRACE].includes(license.status));
    }

    async updatePricing(price: number, companyIds?: string[]): Promise<{ updated: number }> {
        if (companyIds?.length) {
            const result = await this.licenseRepo.update({ companyId: In(companyIds) }, { price });
            return { updated: result.affected ?? 0 };
        }

        const result = await this.licenseRepo
            .createQueryBuilder()
            .update(License)
            .set({ price })
            .execute();

        return { updated: result.affected ?? 0 };
    }

    async blockLicenses(blockedBy: string, reason?: string, companyIds?: string[]): Promise<{ blocked: number }> {
        const licenses = companyIds?.length
            ? await this.licenseRepo.find({ where: { companyId: In(companyIds) } })
            : await this.licenseRepo.find();

        for (const license of licenses) {
            license.isRevoked = true;
            license.status = LicenseStatus.REVOKED;
            license.revokedAt = new Date();
            license.revokedBy = blockedBy;
            license.revokedReason = reason || 'Bloqueio administrativo';
            await this.licenseRepo.save(license);
        }

        return { blocked: licenses.length };
    }

    async listRenewalsByCompany(companyId: string): Promise<LicenseRenewal[]> {
        return this.licenseRenewalRepo.find({
            where: { companyId },
            order: { paidAt: 'DESC' },
        });
    }

    // ─── VALIDATE TOKEN (for LicenseGuard) ───────────────────────────────────

    async validateToken(token: string): Promise<LicensePayload | null> {
        const licenseSecret = this.configService.get<string>('LICENSE_SECRET') || 'license-secret-change-in-production';
        try {
            return this.jwtService.verify<LicensePayload>(token, { secret: licenseSecret });
        } catch {
            return null;
        }
    }

    // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

    private async syncStatus(license: License): Promise<void> {
        if (license.isRevoked) {
            license.status = LicenseStatus.REVOKED;
            await this.licenseRepo.save(license);
            return;
        }

        const now = new Date();
        const gracePeriodEnd = new Date(license.expiresAt);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + license.gracePeriodHours);

        if (now <= license.expiresAt) {
            license.status = LicenseStatus.ACTIVE;
        } else if (now <= gracePeriodEnd) {
            license.status = LicenseStatus.GRACE;
        } else {
            license.status = LicenseStatus.EXPIRED;
        }

        await this.licenseRepo.save(license);
    }

    private buildStatusResponse(license: License, token?: string): LicenseStatusResponse {
        const now = new Date();
        const msRemaining = license.expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

        const gracePeriodEnd = new Date(license.expiresAt);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + license.gracePeriodHours);

        const inGracePeriod = license.status === LicenseStatus.GRACE;

        return {
            valid: license.status === LicenseStatus.ACTIVE || license.status === LicenseStatus.GRACE,
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

    private buildDemoStatus(companyId: string): LicenseStatusResponse {
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);

        return {
            valid: true,
            status: LicenseStatus.ACTIVE,
            plan: LicensePlan.DEMO,
            companyName: companyId,
            expiresAt: expires,
            daysRemaining: 30,
            features: ['SALES', 'PURCHASES', 'BASIC'],
            inGracePeriod: false,
            gracePeriodEndsAt: expires,
        };
    }

    private defaultFeaturesForPlan(plan: LicensePlan): string[] {
        switch (plan) {
            case LicensePlan.DEMO:
                return ['SALES', 'PURCHASES', 'BASIC'];
            case LicensePlan.LITE:
                return ['SALES', 'INVENTORY', 'BASIC'];
            case LicensePlan.STANDARD:
                return ['SALES', 'INVENTORY', 'PURCHASES', 'TREASURY', 'BASIC'];
            case LicensePlan.PRO:
                return ['ACCOUNTING', 'INVENTORY', 'SALES', 'PURCHASES', 'TREASURY'];
            case LicensePlan.ENTERPRISE:
                return ['ALL'];
            default:
                return ['BASIC'];
        }
    }
}
