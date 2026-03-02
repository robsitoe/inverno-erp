export declare enum ContractType {
    FULL_TIME = "FULL_TIME",
    PART_TIME = "PART_TIME",
    CONTRACTOR = "CONTRACTOR",
    INTERN = "INTERN"
}
export declare class Employee {
    id: string;
    companyId: string;
    code: string;
    name: string;
    nif: string;
    inss: string;
    nib: string;
    bankName: string;
    email: string;
    phone: string;
    address: string;
    department: string;
    position: string;
    contractType: string;
    hireDate: string;
    salaryBase: number;
    subsidyTransport: number;
    subsidyFood: number;
    subsidyHousing: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
