export declare class CreateCustomerDto {
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
    receivableAccountId?: string;
    isActive?: boolean;
}
