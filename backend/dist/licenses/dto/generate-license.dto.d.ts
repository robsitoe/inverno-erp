import { LicensePlan } from '../entities/license.entity';
export declare class GenerateLicenseDto {
    companyId: string;
    companyName: string;
    plan: LicensePlan;
    durationDays: number;
    features?: string[];
    maxUsers?: number;
    maxCompanies?: number;
    gracePeriodHours?: number;
    contactEmail?: string;
    contactPhone?: string;
    price?: number;
}
export declare class ActivateLicenseDto {
    token: string;
}
