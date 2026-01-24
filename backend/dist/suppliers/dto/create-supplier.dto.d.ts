export declare class CreateSupplierDto {
    id?: string;
    companyId?: string;
    code: string;
    name: string;
    nif?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    paymentTerms?: number;
    creditLimit?: number;
    currentBalance?: number;
    payableAccountId?: string;
    isActive?: boolean;
}
