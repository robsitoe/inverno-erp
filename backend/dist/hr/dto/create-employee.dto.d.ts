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
    salaryBase: number;
    subsidyTransport?: number;
    subsidyFood?: number;
    subsidyHousing?: number;
    isActive?: boolean;
    companyId?: string;
}
