import { LicensesService } from './licenses.service';
import { GenerateLicenseDto, ActivateLicenseDto } from './dto/generate-license.dto';
import { LicensePlan } from './entities/license.entity';
import { BlockLicensesDto, ListLicensesQueryDto, UpdateLicensePricingDto } from './dto/manage-license.dto';
export declare class LicensesController {
    private readonly licensesService;
    constructor(licensesService: LicensesService);
    getPlans(): Promise<import("./licenses.service").LicensePlanDefinition[]>;
    validatePromo(code: string): Promise<{
        valid: boolean;
        message: string;
        promo?: undefined;
    } | {
        valid: boolean;
        promo: import("./licenses.service").PromoCode;
        message?: undefined;
    }>;
    generate(dto: GenerateLicenseDto, req: any): Promise<{
        error: string;
        token?: undefined;
        licenseId?: undefined;
        companyId?: undefined;
        plan?: undefined;
        expiresAt?: undefined;
        message?: undefined;
    } | {
        token: string;
        licenseId: string;
        companyId: string;
        plan: LicensePlan;
        expiresAt: Date;
        message: string;
        error?: undefined;
    }>;
    activate(dto: ActivateLicenseDto, req: any): Promise<import("./licenses.service").LicenseStatusResponse>;
    subscribe(body: {
        companyId: string;
        plan: LicensePlan;
    }): Promise<import("./licenses.service").LicenseStatusResponse>;
    getStatus(companyId: string): Promise<import("./licenses.service").LicenseStatusResponse>;
    revoke(companyId: string, body: {
        reason: string;
    }, req: any): Promise<{
        error: string;
        message?: undefined;
    } | {
        message: string;
        error?: undefined;
    }>;
    listAll(req: any, query: ListLicensesQueryDto): Promise<import("./entities/license.entity").License[] | {
        error: string;
    }>;
    listActive(req: any): Promise<import("./entities/license.entity").License[] | {
        error: string;
    }>;
    listRenewalsByCompany(companyId: string, req: any): Promise<import("./entities/license-renewal.entity").LicenseRenewal[]>;
    updatePricing(dto: UpdateLicensePricingDto, req: any): Promise<{
        error: string;
    } | {
        updated: number;
        message: string;
        error?: undefined;
    }>;
    block(dto: BlockLicensesDto, req: any): Promise<{
        error: string;
    } | {
        blocked: number;
        message: string;
        error?: undefined;
    }>;
}
