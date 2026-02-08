export declare class PeriodAuditLog {
    id: string;
    companyId: string;
    fiscalYearId: string;
    action: string;
    performedByUserId?: string;
    performedByUsername?: string;
    reason: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}
