export declare class CreateAccountDto {
    id?: string;
    companyId?: string;
    code: string;
    name: string;
    description?: string;
    type: string;
    level?: number;
    parentId?: string;
    allowPosting?: boolean;
    balance?: number;
    isActive?: boolean;
}
