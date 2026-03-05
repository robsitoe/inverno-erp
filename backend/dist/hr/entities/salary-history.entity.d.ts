import { Employee } from './employee.entity';
export declare class EmployeeSalaryHistory {
    id: string;
    employeeId: string;
    companyId: string;
    changeDate: string;
    oldSalary: number;
    newSalary: number;
    oldTransport: number;
    newTransport: number;
    oldFood: number;
    newFood: number;
    oldDependents: number;
    newDependents: number;
    reason: string;
    updatedBy: string;
    createdAt: Date;
    employee: Employee;
}
