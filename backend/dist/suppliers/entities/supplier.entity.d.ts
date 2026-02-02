export declare class Supplier {
    id: string;
    companyId: string | null;
    code: string;
    name: string;
    nif: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    paymentTerms: number;
    creditLimit: number;
    currentBalance: number;
    payableAccountId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
