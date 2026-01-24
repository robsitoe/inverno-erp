export declare class CreateTreasuryLineDto {
    id?: string;
    docNumber: string;
    amount: number;
    paymentMode?: string;
}
export declare class CreateTreasuryDto {
    id?: string;
    companyId?: string;
    type: string;
    docType?: string;
    series?: string;
    seriesNumber?: number;
    number: string;
    date: string;
    amount: number;
    treasuryAccountId?: string;
    entityCode?: string;
    entityName?: string;
    customerCode?: string;
    customerName?: string;
    beneficiaryCode?: string;
    beneficiaryName?: string;
    paymentMethod?: string;
    description?: string;
    observations?: string;
    relatedDocument?: string;
    lines?: CreateTreasuryLineDto[];
}
