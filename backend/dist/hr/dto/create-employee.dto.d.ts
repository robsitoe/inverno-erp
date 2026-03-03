import { ContractType } from '../entities/employee.entity';
export declare class CreateEmployeeDto {
    code: string;
    name: string;
    nif?: string;
    inss?: string;
    nib?: string;
    bankName?: string;
    email?: string;
    phone?: string;
    address?: string;
    department?: string;
    position?: string;
    contractType?: ContractType;
    hireDate?: string;
    endDate?: string;
    trialPeriodEnd?: string;
    weeklyHours?: number;
    dependents?: number;
    salaryBase: number;
    subsidyTransport?: number;
    subsidyFood?: number;
    subsidyHousing?: number;
    isActive?: boolean;
    terminationReason?: string;
    vacationBalance?: number;
    companyId?: string;
}
