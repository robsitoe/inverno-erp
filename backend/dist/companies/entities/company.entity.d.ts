export declare class Company {
    id: string;
    name: string;
    nif?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    currentYear?: number;
    type?: string;
    category?: string;
    country?: string;
    location?: string;
    chartOfAccounts?: string;
    currency?: string;
    logoUrl?: string;
    seriesConfig?: any;
    dbConfig?: {
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        database?: string;
        type?: 'postgres' | 'sqlite';
    };
    documentNameFormat?: string;
    createdAt: Date;
    updatedAt: Date;
}
