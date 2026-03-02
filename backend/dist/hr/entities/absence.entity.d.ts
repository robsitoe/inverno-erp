import { Employee } from './employee.entity';
export declare enum AbsenceType {
    VACATION = "VACATION",
    SICKNESS = "SICKNESS",
    JUSTIFIED = "JUSTIFIED",
    UNJUSTIFIED = "UNJUSTIFIED",
    MATERNITY = "MATERNITY",
    OTHER = "OTHER"
}
export declare enum AbsenceStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare class Absence {
    id: string;
    companyId: string;
    employeeId: string;
    employee: Employee;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: AbsenceStatus;
    createdAt: Date;
    updatedAt: Date;
}
