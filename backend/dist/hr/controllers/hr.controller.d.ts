import * as express from 'express';
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
    getNextCode(companyId: string): Promise<{
        code: string;
    }>;
    checkCode(code: string, companyId: string, excludeId?: string): Promise<{
        available: boolean;
    }>;
    checkNib(nib: string, companyId: string, excludeId?: string): Promise<{
        available: boolean;
        usedBy?: string;
    }>;
    findOneEmployee(id: string, companyId?: string): Promise<import("../entities/employee.entity").Employee>;
    updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<import("../entities/employee.entity").Employee>;
    removeEmployee(id: string, companyId?: string): Promise<import("../entities/employee.entity").Employee>;
    uploadPhoto(id: string, companyId: string, file: any): Promise<import("../entities/employee.entity").Employee>;
    uploadDocument(id: string, companyId: string, docType: 'BI' | 'CONTRATO' | 'NUIT' | 'INSS' | 'OUTRO', label: string, file: any): Promise<import("../entities/employee.entity").Employee>;
    removeDocument(id: string, docId: string, companyId: string): Promise<import("../entities/employee.entity").Employee>;
    servePhoto(filename: string, res: express.Response): void;
    serveDocument(filename: string, res: express.Response): void;
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
    findAllPayroll(companyId?: string): never[];
    createAbsence(data: any): Promise<import("../entities/absence.entity").Absence[]>;
    findAllAbsences(companyId?: string, employeeId?: string): Promise<import("../entities/absence.entity").Absence[]>;
    updateAbsenceStatus(id: string, status: AbsenceStatus): Promise<import("../entities/absence.entity").Absence>;
    findAllTaxBrackets(companyId?: string): Promise<import("../entities/hr-settings.entity").TaxBracket[]>;
    saveTaxBracket(data: any, companyId?: string): Promise<any>;
    deleteTaxBracket(id: string, companyId?: string): Promise<import("typeorm").DeleteResult>;
    getSettings(companyId?: string): Promise<import("../entities/hr-settings.entity").HRSettings>;
    updateSettings(data: any, companyId?: string): Promise<any>;
    getPayrollSheet(year: number, month: number, companyId?: string): Promise<{
        records: import("../entities/payroll.entity").Payroll[];
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
    getNominalRelation(companyId?: string): Promise<import("../entities/employee.entity").Employee[]>;
    getSeniorityMap(companyId?: string): Promise<import("../entities/employee.entity").Employee[]>;
    getVacationPlan(year: number, companyId?: string): Promise<import("../entities/absence.entity").Absence[]>;
}
