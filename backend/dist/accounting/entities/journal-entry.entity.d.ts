import { Account } from './account.entity';
export declare enum JournalEntryStatus {
    DRAFT = "DRAFT",
    POSTED = "POSTED",
    CANCELED = "CANCELED"
}
export declare class JournalEntry {
    id: string;
    companyId: string;
    journalId: string;
    date: string;
    description: string;
    reference: string;
    sourceDocument: string;
    sourceType: string;
    lines: JournalLine[];
    status: string;
    createdBy: string;
    updatedBy: string;
    correctionReason: string;
    relatedEntryId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class JournalLine {
    id: string;
    journalEntry: JournalEntry;
    accountId: string;
    account: Account;
    accountCode: string;
    accountName: string;
    description: string;
    debit: number;
    credit: number;
}
