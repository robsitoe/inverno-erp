export declare enum PayrollStatus {
    DRAFT = "DRAFT",
    POSTED = "POSTED",
    PAID = "PAID",
    CANCELED = "CANCELED"
}
export declare class Payroll {
    id: string;
    companyId: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    year: number;
    month: number;
    grossSalary: number;
    inssEmployee: number;
    inssEmployer: number;
    irps: number;
    transportSubsidy: number;
    foodSubsidy: number;
    overtimeAmount: number;
    bonusAmount: number;
    dependents: number;
    daysWorked: number;
    absenceDays: number;
    absenceDeduction: number;
    vacationDays: number;
    cashVoucherDeduction: number;
    netSalary: number;
    status: string;
    journalEntryId: string;
    paymentDate: string;
    createdAt: Date;
    updatedAt: Date;
}
