import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Payroll } from '../entities/payroll.entity';
import { Absence } from '../entities/absence.entity';
import { PettyCashVoucher } from '../../treasury/entities/petty-cash-voucher.entity';
import { TaxBracket, HRSettings } from '../entities/hr-settings.entity';
import { AccountingService } from '../../accounting/accounting.service';
import { TenancyService } from '../../tenancy/tenancy.service';
export declare class PayrollService {
    private readonly defaultEmployeeRepo;
    private readonly defaultPayrollRepo;
    private readonly defaultTaxBracketRepo;
    private readonly defaultHRSettingsRepo;
    private readonly defaultAbsenceRepo;
    private readonly defaultPettyCashVoucherRepo;
    private readonly accountingService;
    private readonly tenancyService;
    constructor(defaultEmployeeRepo: Repository<Employee>, defaultPayrollRepo: Repository<Payroll>, defaultTaxBracketRepo: Repository<TaxBracket>, defaultHRSettingsRepo: Repository<HRSettings>, defaultAbsenceRepo: Repository<Absence>, defaultPettyCashVoucherRepo: Repository<PettyCashVoucher>, accountingService: AccountingService, tenancyService: TenancyService);
    private getRepo;
    private getEmployeeRepo;
    private getPayrollRepo;
    private getTaxBracketRepo;
    private getHRSettingsRepo;
    private getAbsenceRepo;
    private getPettyCashVoucherRepo;
    calculateIRPS(taxableAmount: number, brackets: TaxBracket[], dependents?: any): number;
    calculateINSS(grossSalary: number, settings: HRSettings): {
        employee: number;
        employer: number;
    };
    processPayroll(year: number, month: number, companyId?: string): Promise<Payroll[]>;
    postPayrollToAccounting(year: number, month: number, companyId?: string): Promise<{
        success: boolean;
        message: string;
        entryId?: undefined;
        processed?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        entryId: string;
        processed: number;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        entryId?: undefined;
        processed?: undefined;
    }>;
    getPayrollReportData(year: number, month: number, companyId?: string): Promise<{
        records: Payroll[];
        totals: {
            grossSalary: number;
            inssEmployee: number;
            inssEmployer: number;
            irps: number;
            netSalary: number;
            transportSubsidy: number;
            foodSubsidy: number;
            bonusAmount: number;
        };
    }>;
}
