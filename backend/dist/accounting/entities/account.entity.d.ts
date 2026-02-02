export declare enum AccountType {
    ASSET = "ASSET",
    LIABILITY = "LIABILITY",
    EQUITY = "EQUITY",
    REVENUE = "REVENUE",
    EXPENSE = "EXPENSE"
}
export declare class Account {
    id: string;
    companyId: string | null;
    code: string;
    name: string;
    description: string;
    type: string;
    level: number;
    parentId: string;
    balance: number;
    allowPosting: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
