import { signLicenseToken, verifyLicenseToken, hashInstallation } from './license-crypto';
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

export const EULA_VERSION = '1.0';

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
        features: ['ACCOUNTING', 'INVENTORY', 'SALES', 'PURCHASES', 'TREASURY', 'HR'],
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

        const token = signLicenseToken({ ...payload, iid: dto.installationId }, Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));

        license.licenseToken = token;
        await this.licenseRepo.save(license);

        this.logger.log(`License generated for company ${dto.companyId} (${dto.plan}) by ${issuedBy}`);

        return { token, license };
    }

    // ─── SUBSCRIBE (Auto-generation after payment) ───────────────────────────

    async subscribe(companyId: string, plan: LicensePlan): Promise<LicenseStatusResponse> {
        this.logger.log(`Auto-subscribing company ${companyId} to plan ${plan}`);

        const planConfig = LICENSE_PLANS_CONFIG.find(p => p.id === plan);
        if (!planConfig && plan !== LicensePlan.DEMO) {
            throw new BadRequestException('Plano de licença inválido.');
        }

        // Fetch company name from main DB to ensure license record is accurate
        const company = await this.licenseRepo.manager.getRepository(License).query(
            `SELECT name FROM companies WHERE id = $1`, [companyId]
        );
        const companyName = company && company[0] ? company[0].name : companyId;

        const dto: GenerateLicenseDto = {
            companyId,
            companyName,
            plan,
            durationDays: plan === LicensePlan.DEMO ? 30 : 365,
            features: planConfig?.features || this.defaultFeaturesForPlan(plan),
            price: planConfig?.price || 0,
        };

        const result = await this.generate(dto, 'SYSTEM-PAYMENT-AUTO');
        return this.buildStatusResponse(result.license, result.token);
    }

    // ─── ACTIVATE (Client activates their license) ────────────────────────────

    async activate(token: string, requestIp: string): Promise<LicenseStatusResponse> {

        let payload: LicensePayload;
        try {
            payload = verifyLicenseToken<LicensePayload>(token);
        } catch (err) {
            throw new BadRequestException('Token de licença inválido ou expirado.');
        }

        const boundTo = (payload as any).iid;
        if (boundTo) {
            const here = await this.getInstallationId();
            if (here && here !== boundTo) {
                throw new UnauthorizedException('Esta licença pertence a outra instalação. Contacte o fornecedor.');
            }
        }

        // A licença é emitida pelo fabricante (offline): o registo local é criado/atualizado a partir do token assinado.
        let license = await this.licenseRepo.findOne({ where: { companyId: payload.cid } });
        const issuedAtMs = ((payload as any).iat || 0) * 1000;
        if (license?.isRevoked) {
            // Uma licença emitida DEPOIS da revogação (cliente regularizou) levanta a revogação.
            if (license.revokedAt && issuedAtMs > new Date(license.revokedAt).getTime()) {
                license.isRevoked = false; license.revokedAt = undefined; license.revokedBy = undefined; license.revokedReason = undefined;
            } else {
                throw new UnauthorizedException('Esta licença foi revogada.');
            }
        }
        if (!license) {
            license = this.licenseRepo.create({ isRevoked: false, offlineGraceDays: 7 } as any) as unknown as License;
            license.companyId = payload.cid;
        }
        license.companyName = payload.cn;
        license.plan = payload.plan;
        license.status = LicenseStatus.ACTIVE;
        license.expiresAt = new Date((payload.exp as number) * 1000);
        license.features = payload.features?.length ? payload.features : this.defaultFeaturesForPlan(payload.plan);
        license.maxUsers = payload.maxUsers;
        license.maxCompanies = payload.maxCompanies;
        license.gracePeriodHours = payload.gracePeriodHours ?? 168;

        // Update activation IP
        license.activatedIp = requestIp;
        license.licenseToken = token;
        await this.licenseRepo.save(license);

        this.logger.log(`License activated for company ${payload.cid} from IP ${requestIp}`);

        return this.buildStatusResponse(license, token);
    }

    // ─── STATUS (Frontend polls this) ─────────────────────────────────────────

    /** Limites da licença da instalação, lidos do token ASSINADO (não da tabela). Sem licença válida: sem limites (período de avaliação). */
    async getLimits(): Promise<{ maxUsers?: number; maxCompanies?: number }> {
        const rows = await this.licenseRepo.find();
        let maxUsers: number | undefined;
        let maxCompanies: number | undefined;
        for (const r of rows) {
            try {
                const p = verifyLicenseToken<any>(r.licenseToken || '', true);
                if (p.cid !== '*' && !r.companyId) continue;
                if (p.iid) {
                    const here = await this.getInstallationId();
                    if (here && here !== p.iid) continue;
                }
                if (p.maxUsers) maxUsers = Math.max(maxUsers ?? 0, p.maxUsers);
                if (p.maxCompanies) maxCompanies = Math.max(maxCompanies ?? 0, p.maxCompanies);
            } catch { /* ignora licenças inválidas */ }
        }
        return { maxUsers, maxCompanies };
    }

    async assertCanAddUser(currentUsers: number): Promise<void> {
        const { maxUsers } = await this.getLimits();
        if (maxUsers && currentUsers >= maxUsers) {
            throw new BadRequestException(`Limite de utilizadores da licença atingido (${maxUsers}). Contacte o fornecedor para ampliar a licença.`);
        }
    }

    async assertCanAddCompany(currentCompanies: number): Promise<void> {
        const { maxCompanies } = await this.getLimits();
        if (maxCompanies && currentCompanies >= maxCompanies) {
            throw new BadRequestException(`Limite de empresas da licença atingido (${maxCompanies}). Contacte o fornecedor para ampliar a licença.`);
        }
    }

    async getStatus(companyId: string): Promise<LicenseStatusResponse> {
        // Licença da empresa e licença da INSTALAÇÃO (companyId '*') que cobre todas as empresas.
        // Ambas são consideradas: uma chave antiga/inválida da empresa não pode esconder uma chave
        // válida da instalação (era o que fazia a licença "voltar a DEMO" depois de ativada).
        const candidates = [
            await this.licenseRepo.findOne({ where: { companyId } }),
            companyId !== '*' ? await this.licenseRepo.findOne({ where: { companyId: '*' } }) : null,
        ].filter((l): l is License => !!l);

        let fallback: LicenseStatusResponse | null = null;
        for (const license of candidates) {
            // A validade vem SEMPRE do token assinado — a tabela pode ser editada pelo cliente.
            try {
                const p = verifyLicenseToken<any>(license.licenseToken || '', true);
                if (p.cid !== '*' && p.cid !== companyId) throw new Error('empresa diferente');
                if (p.iid) {
                    const here = await this.getInstallationId();
                    if (here && here !== p.iid) throw new Error('instalação diferente');
                }
                license.expiresAt = new Date(p.exp * 1000);
                license.gracePeriodHours = p.gracePeriodHours ?? license.gracePeriodHours;
                if (p.plan) license.plan = p.plan;
                if (Array.isArray(p.features) && p.features.length) license.features = p.features;
            } catch (e: any) {
                this.logger.warn(`Licença ${license.companyId} sem assinatura válida para ${companyId} (${e?.message || 'token inválido'}) — ignorada.`);
                continue;
            }

            // Sync status based on current time (server time — tamper-proof)
            await this.syncStatus(license);
            const status = this.buildStatusResponse(license);
            if (status.valid) return status;
            fallback = fallback || status; // expirada/revogada: só se nenhuma outra for válida
        }

        return fallback || this.buildDemoStatus(companyId);
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

    /**
     * Issues a short-lived operational token (30 days) signed by LICENSE_SECRET.
     * On-premise installs validate this token locally — no internet needed.
     * Because it's signed with our private secret, the client cannot forge or
     * extend it. After 30 days they MUST contact this server for a new one.
     */
    async issueOperationalToken(companyId: string): Promise<string> {
        const license = await this.licenseRepo.findOne({ where: { companyId } });
        if (!license) throw new Error(`No license for ${companyId}`);

        return signLicenseToken({
                sub: license.id,
                cid: companyId,
                plan: license.plan,
                features: license.features,
                type: 'operational',
            }, 30 * 86400);
    }

    /**
     * Validates an operational token locally (no HTTP call).
     * Returns the payload if valid, throws if expired or tampered.
     */
    verifyOperationalToken(token: string): any {
        return verifyLicenseToken(token);
    }

    /** Identificador estável desta instalação (derivado do cluster PostgreSQL). Enviado ao fabricante para emitir a licença. */
    async getInstallationId(): Promise<string | null> {
        if (process.env.INSTALLATION_ID) return hashInstallation(process.env.INSTALLATION_ID);
        try {
            const r = await this.licenseRepo.manager.query('SELECT system_identifier::text AS id FROM pg_control_system()');
            return r?.[0]?.id ? hashInstallation(r[0].id) : null;
        } catch {
            return null;
        }
    }

    // ─── VALIDATE TOKEN (for LicenseGuard) ───────────────────────────────────

    async validateToken(token: string): Promise<LicensePayload | null> {
        try {
            return verifyLicenseToken<LicensePayload>(token);
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

    /** Início do período de avaliação (1.º arranque desta instalação) — persistente. */
    private async getTrialStart(): Promise<Date> {
        const m = this.licenseRepo.manager;
        await m.query(`CREATE TABLE IF NOT EXISTS installation_info (key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz DEFAULT now())`);
        await m.query(`INSERT INTO installation_info (key, value) VALUES ('trial_start', $1) ON CONFLICT (key) DO NOTHING`, [new Date().toISOString()]);
        const r = await m.query(`SELECT value FROM installation_info WHERE key = 'trial_start'`);
        return new Date(r[0].value);
    }

    private async buildDemoStatus(companyId: string): Promise<LicenseStatusResponse> {
        const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 30);
        let expires: Date;
        if (process.env.NODE_ENV !== 'production') {
            // Desenvolvimento: demo sempre válida (não bloqueia o ambiente de trabalho).
            expires = new Date(); expires.setDate(expires.getDate() + TRIAL_DAYS);
        } else {
            expires = new Date((await this.getTrialStart()).getTime() + TRIAL_DAYS * 86400000);
        }
        const msLeft = expires.getTime() - Date.now();
        const valid = msLeft > 0;
        return {
            valid,
            status: valid ? LicenseStatus.ACTIVE : LicenseStatus.EXPIRED,
            plan: LicensePlan.DEMO,
            companyName: companyId,
            expiresAt: expires,
            daysRemaining: Math.max(0, Math.ceil(msLeft / 86400000)),
            features: ['SALES', 'PURCHASES', 'BASIC', 'HR'],
            inGracePeriod: false,
            gracePeriodEndsAt: expires,
        };
    }

    // ─── EULA ────────────────────────────────────────────────────────────────
    async getEulaStatus(): Promise<{ accepted: boolean; acceptedAt?: string; version: string }> {
        const m = this.licenseRepo.manager;
        await m.query(`CREATE TABLE IF NOT EXISTS installation_info (key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz DEFAULT now())`);
        const r = await m.query(`SELECT value FROM installation_info WHERE key = 'eula'`);
        const v = r[0] ? JSON.parse(r[0].value) : null;
        return { accepted: !!v && v.version === EULA_VERSION, acceptedAt: v?.at, version: EULA_VERSION };
    }

    async acceptEula(user: string, ip: string, signerName: string): Promise<void> {
        const m = this.licenseRepo.manager;
        await this.getEulaStatus();
        const value = JSON.stringify({ version: EULA_VERSION, at: new Date().toISOString(), by: user, signer: signerName, ip });
        await m.query(`INSERT INTO installation_info (key, value) VALUES ('eula', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`, [value]);
        this.logger.log(`EULA ${EULA_VERSION} aceite por ${user} (${signerName}) de ${ip}`);
    }

    private defaultFeaturesForPlan(plan: LicensePlan): string[] {
        switch (plan) {
            case LicensePlan.DEMO:
                return ['SALES', 'PURCHASES', 'BASIC', 'HR'];
            case LicensePlan.LITE:
                return ['SALES', 'INVENTORY', 'BASIC'];
            case LicensePlan.STANDARD:
                return ['SALES', 'INVENTORY', 'PURCHASES', 'TREASURY', 'BASIC'];
            case LicensePlan.PRO:
                return ['ACCOUNTING', 'INVENTORY', 'SALES', 'PURCHASES', 'TREASURY', 'HR'];
            case LicensePlan.ENTERPRISE:
                return ['ALL'];
            default:
                return ['BASIC'];
        }
    }
}
