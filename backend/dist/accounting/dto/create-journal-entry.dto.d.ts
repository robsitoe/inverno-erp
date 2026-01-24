export declare class CreateJournalLineDto {
    id?: string;
    accountId: string;
    accountCode?: string;
    accountName?: string;
    description?: string;
    debit: number;
    credit: number;
}
export declare class CreateJournalEntryDto {
    id?: string;
    companyId?: string;
    journalId?: string;
    description: string;
    date: string;
    status?: string;
    reference?: string;
    sourceDocument?: string;
    sourceType?: string;
    lines: CreateJournalLineDto[];
}
