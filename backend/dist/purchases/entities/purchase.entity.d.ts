import { WorkflowStatus } from '../../common/enums/workflow-status.enum';
export declare enum PurchaseDocumentType {
    INVOICE = "INVOICE",
    RECEIPT = "RECEIPT",
    CREDIT_NOTE = "CREDIT_NOTE",
    DEBIT_NOTE = "DEBIT_NOTE",
    ORDER = "ORDER",
    QUOTE = "QUOTE"
}
export declare class PurchaseDocument {
    id: string;
    companyId: string;
    type: string;
    series: string;
    number: number;
    date: string;
    dueDate: string;
    supplierCode: string;
    supplierName: string;
    supplierNif: string;
    supplierAddress: string;
    supplierAccountId: string;
    reference: string;
    paymentCondition: string;
    paymentDays: number;
    currency: string;
    status: WorkflowStatus;
    statusNotes: string;
    lines: PurchaseDocumentLine[];
    merchandiseTotal: number;
    discountValue: number;
    taxTotal: number;
    totalValue: number;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class PurchaseDocumentLine {
    id: string;
    document: PurchaseDocument;
    articleId: string;
    articleCode: string;
    articleName: string;
    warehouse: string;
    location: string;
    batch: string;
    description: string;
    taxCode: string;
    taxRate: number;
    unitPrice: number;
    discount: number;
    unit: string;
    quantity: number;
    totalLiquid: number;
    totalValue: number;
    project: string;
    costCenter: string;
    analytic: string;
    functional: string;
}
