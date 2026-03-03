export declare enum ContractType {
    INDETERMINADO = "INDETERMINADO",
    DETERMINADO_CERTO = "DETERMINADO_CERTO",
    DETERMINADO_INCERTO = "DETERMINADO_INCERTO",
    EVENTUAL = "EVENTUAL",
    SAZONAL = "SAZONAL",
    INTERMITENTE = "INTERMITENTE",
    TELETRABALHO = "TELETRABALHO",
    DOMICILIO = "DOMICILIO",
    ESTAGIO = "ESTAGIO"
}
export interface EmployeeDocument {
    id: string;
    type: 'BI' | 'CONTRATO' | 'NUIT' | 'INSS' | 'OUTRO';
    label: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    url: string;
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
    trialPeriodEnd: string;
    weeklyHours: number;
    hireDate: string;
    endDate: string;
    terminationReason: string;
    vacationBalance: number;
    dependents: number;
    salaryBase: number;
    subsidyTransport: number;
    subsidyFood: number;
    subsidyHousing: number;
    photoUrl: string;
    documents: EmployeeDocument[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
