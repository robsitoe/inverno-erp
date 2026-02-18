import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { License, LicensePlan, LicenseStatus } from './entities/license.entity';
import { GenerateLicenseDto } from './dto/generate-license.dto';
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
    gracePeriodEndsAt?: Date;
    token?: string;
}
export declare class LicensesService {
    private readonly licenseRepo;
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    constructor(licenseRepo: Repository<License>, jwtService: JwtService, configService: ConfigService);
    generate(dto: GenerateLicenseDto, issuedBy: string): Promise<{
        token: string;
        license: License;
    }>;
    activate(token: string, requestIp: string): Promise<LicenseStatusResponse>;
    getStatus(companyId: string): Promise<LicenseStatusResponse>;
    revoke(companyId: string, reason: string, revokedBy: string): Promise<void>;
    listAll(): Promise<License[]>;
    validateToken(token: string): Promise<LicensePayload | null>;
    private syncStatus;
    private buildStatusResponse;
    private buildDemoStatus;
    private defaultFeaturesForPlan;
}
