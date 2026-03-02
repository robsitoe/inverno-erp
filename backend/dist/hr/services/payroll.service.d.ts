import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Payroll } from '../entities/payroll.entity';
import { AccountingService } from '../../accounting/accounting.service';
export declare class PayrollService {
    private readonly employeeRepo;
    private readonly payrollRepo;
    private readonly accountingService;
    constructor(employeeRepo: Repository<Employee>, payrollRepo: Repository<Payroll>, accountingService: AccountingService);
    calculateIRM(taxableAmount: number): number;
    calculateINSS(grossSalary: number): {
        employee: number;
        employer: number;
    };
    processPayroll(year: number, month: number, companyId?: string): Promise<Payroll[]>;
    postPayrollToAccounting(year: number, month: number, companyId?: string): Promise<{
        success: boolean;
        message: string;
        entryId?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        entryId: string;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        entryId?: undefined;
    }>;
}
