import { Repository } from 'typeorm';
import { LicenseRenewal } from './entities/license-renewal.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { License, LicensePlan, LicenseStatus } from './entities/license.entity';
import { GenerateLicenseDto } from './dto/generate-license.dto';
import { ListLicensesQueryDto } from './dto/manage-license.dto';
export interface LicensePayload {
    sub: string;
    cid: string;
    cn: string;
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
    token?: string;
}
export interface PromoCode {
    code: string;
    discountPercent?: number;
    discountFixed?: number;
    expiresAt: Date;
    region?: string;
    description: string;
}
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
export declare class LicensesService {
    private readonly licenseRepo;
    private readonly licenseRenewalRepo;
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    constructor(licenseRepo: Repository<License>, licenseRenewalRepo: Repository<LicenseRenewal>, jwtService: JwtService, configService: ConfigService);
    getAvailablePlans(): Promise<LicensePlanDefinition[]>;
    validatePromoCode(code: string): Promise<PromoCode | null>;
    generate(dto: GenerateLicenseDto, issuedBy: string): Promise<{
        token: string;
        license: License;
    }>;
    subscribe(companyId: string, plan: LicensePlan): Promise<LicenseStatusResponse>;
    activate(token: string, requestIp: string): Promise<LicenseStatusResponse>;
    getStatus(companyId: string): Promise<LicenseStatusResponse>;
    revoke(companyId: string, reason: string, revokedBy: string): Promise<void>;
    listAll(filters?: ListLicensesQueryDto): Promise<License[]>;
    listActive(): Promise<License[]>;
    updatePricing(price: number, companyIds?: string[]): Promise<{
        updated: number;
    }>;
    blockLicenses(blockedBy: string, reason?: string, companyIds?: string[]): Promise<{
        blocked: number;
    }>;
    listRenewalsByCompany(companyId: string): Promise<LicenseRenewal[]>;
    validateToken(token: string): Promise<LicensePayload | null>;
    private syncStatus;
    private buildStatusResponse;
    private buildDemoStatus;
    private defaultFeaturesForPlan;
}
