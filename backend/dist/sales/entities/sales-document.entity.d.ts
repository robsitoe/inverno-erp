import { WorkflowStatus } from '../../common/enums/workflow-status.enum';
export declare enum SalesDocumentType {
    INVOICE = "INVOICE",
    RECEIPT = "RECEIPT",
    CREDIT_NOTE = "CREDIT_NOTE",
    DEBIT_NOTE = "DEBIT_NOTE",
    QUOTE = "QUOTE",
    ORDER = "ORDER"
}
export declare class SalesDocument {
    id: string;
    companyId: string;
    documentType: string;
    documentNumber: string;
    series: string;
    seriesNumber: number;
    date: string;
    dueDate: string;
    customerId: string;
    customerName: string;
    customerNif: string;
    customerAddress: string;
    lines: SalesDocumentLine[];
    subtotal: number;
    discounts: number;
    totalIva: number;
    total: number;
    status: WorkflowStatus;
    statusNotes: string;
    journalEntryId: string;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class SalesDocumentLine {
    id: string;
    document: SalesDocument;
    articleId: string;
    articleCode: string;
    articleName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    ivaRate: number;
    ivaCode: string;
    subtotal: number;
    ivaAmount: number;
    total: number;
}
