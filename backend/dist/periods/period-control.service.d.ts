import { DataSource } from 'typeorm';
import { FiscalYear } from '../companies/entities/fiscal-year.entity';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class PeriodControlService {
    private readonly mainDataSource;
    private readonly tenancyService;
    constructor(mainDataSource: DataSource, tenancyService: TenancyService);
    private getDataSource;
    private normalizeDate;
    ensureDateInOpenPeriod(date: string, companyId?: string): Promise<FiscalYear>;
    getClosureChecklist(fiscalYearId: string, companyId?: string): Promise<{
        fiscalYear: FiscalYear;
        checklist: {
            trialBalance: {
                ok: boolean;
                debit: number;
                credit: number;
                difference: number;
            };
            pendingDocuments: {
                ok: boolean;
                salesDraft: number;
                purchaseDraft: number;
                total: number;
            };
            reconciliations: {
                ok: boolean;
                pending: number;
            };
        };
    }>;
    closeFiscalYear(fiscalYearId: string, reason: string, performedBy?: {
        id?: string;
        username?: string;
    }, companyId?: string): Promise<{
        success: boolean;
        fiscalYear: FiscalYear;
        checklist: {
            trialBalance: {
                ok: boolean;
                debit: number;
                credit: number;
                difference: number;
            };
            pendingDocuments: {
                ok: boolean;
                salesDraft: number;
                purchaseDraft: number;
                total: number;
            };
            reconciliations: {
                ok: boolean;
                pending: number;
            };
        };
    }>;
    reopenFiscalYear(fiscalYearId: string, reason: string, requestedBy: {
        userId: string;
        username?: string;
        requireElevatedPermission?: boolean;
    }, companyId?: string): Promise<{
        success: boolean;
        fiscalYear: FiscalYear;
    }>;
}
