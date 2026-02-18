import { LicensesService } from './licenses.service';
import { GenerateLicenseDto, ActivateLicenseDto } from './dto/generate-license.dto';
export declare class LicensesController {
    private readonly licensesService;
    constructor(licensesService: LicensesService);
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
        plan: import("./entities/license.entity").LicensePlan;
        expiresAt: Date;
        message: string;
        error?: undefined;
    }>;
    activate(dto: ActivateLicenseDto, req: any): Promise<import("./licenses.service").LicenseStatusResponse>;
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
    listAll(req: any): Promise<import("./entities/license.entity").License[] | {
        error: string;
    }>;
}
