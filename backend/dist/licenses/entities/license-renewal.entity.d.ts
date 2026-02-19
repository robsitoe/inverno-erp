import { License } from './license.entity';
export declare class LicenseRenewal {
    id: string;
    companyId: string;
    licenseId: string;
    license: License;
    paidAt: Date;
    durationDays: number;
    amount?: number;
    previousExpiresAt?: Date;
    newExpiresAt: Date;
    issuedBy: string;
    createdAt: Date;
}
