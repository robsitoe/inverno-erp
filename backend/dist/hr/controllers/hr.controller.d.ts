import { HRService } from '../services/hr.service';
import { PayrollService } from '../services/payroll.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { AbsenceStatus } from '../entities/absence.entity';
export declare class HRController {
    private readonly hrService;
    private readonly payrollService;
    constructor(hrService: HRService, payrollService: PayrollService);
    createEmployee(createEmployeeDto: CreateEmployeeDto): Promise<import("../entities/employee.entity").Employee>;
    findAllEmployees(companyId?: string): Promise<import("../entities/employee.entity").Employee[]>;
    findOneEmployee(id: string): Promise<import("../entities/employee.entity").Employee>;
    updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<import("../entities/employee.entity").Employee>;
    removeEmployee(id: string): Promise<import("../entities/employee.entity").Employee>;
    processMonthlyPayroll(payload: {
        year: number;
        month: number;
    }, companyId?: string): Promise<import("../entities/payroll.entity").Payroll[]>;
    postPayrollToAccounting(payload: {
        year: number;
        month: number;
    }, companyId?: string): Promise<{
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
    findAllPayroll(companyId?: string, year?: number, month?: number): never[];
    createAbsence(data: any): Promise<import("../entities/absence.entity").Absence[]>;
    findAllAbsences(companyId?: string, employeeId?: string): Promise<import("../entities/absence.entity").Absence[]>;
    updateAbsenceStatus(id: string, status: AbsenceStatus): Promise<import("../entities/absence.entity").Absence>;
}
