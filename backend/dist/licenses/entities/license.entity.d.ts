export declare enum LicensePlan {
    DEMO = "DEMO",
    LITE = "LITE",
    STANDARD = "STANDARD",
    PRO = "PRO",
    ENTERPRISE = "ENTERPRISE"
}
export declare enum LicenseStatus {
    ACTIVE = "ACTIVE",
    EXPIRED = "EXPIRED",
    REVOKED = "REVOKED",
    GRACE = "GRACE"
}
export declare class License {
    id: string;
    companyId: string;
    companyName: string;
    plan: LicensePlan;
    status: LicenseStatus;
    expiresAt: Date;
    activatedBy?: string;
    activatedIp?: string;
    features?: string[];
    maxUsers?: number;
    maxCompanies?: number;
    isRevoked: boolean;
    revokedAt?: Date;
    revokedBy?: string;
    revokedReason?: string;
    gracePeriodHours: number;
    licenseToken?: string;
    createdAt: Date;
    updatedAt: Date;
}
