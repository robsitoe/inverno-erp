import { WorkflowStatus } from '../../common/enums/workflow-status.enum';
export declare enum TreasuryDocumentType {
    RECEIPT = "RECEIPT",
    PAYMENT = "PAYMENT"
}
export declare class TreasuryDocument {
    id: string;
    companyId: string;
    type: string;
    docType: string;
    series: string;
    seriesNumber: number;
    number: string;
    date: string;
    amount: number;
    treasuryAccountId: string;
    entityCode: string;
    entityName: string;
    customerCode: string;
    customerName: string;
    beneficiaryCode: string;
    beneficiaryName: string;
    paymentMethod: string;
    description: string;
    observations: string;
    relatedDocument: string;
    status: WorkflowStatus;
    statusNotes: string;
    lines: TreasuryDocumentLine[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class TreasuryDocumentLine {
    id: string;
    document: TreasuryDocument;
    docType: string;
    docNumber: string;
    originalAmount: number;
    amount: number;
    discount: number;
    pendingAfter: number;
    paymentMode: string;
}
