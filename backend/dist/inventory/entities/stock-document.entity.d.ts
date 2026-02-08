export declare enum StockDocumentStatus {
    DRAFT = "DRAFT",
    POSTED = "POSTED",
    CANCELED = "CANCELED"
}
export declare class StockDocument {
    id: string;
    companyId: string;
    type: string;
    series: string;
    number: number;
    date: string;
    time: string;
    warehouse: string;
    originAccount: string;
    originCostCenter: string;
    originProject: string;
    originAnalytic: string;
    originFunctional: string;
    originPep: string;
    lines: StockDocumentLine[];
    status: StockDocumentStatus;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class StockDocumentLine {
    id: string;
    document: StockDocument;
    articleId: string;
    articleCode: string;
    articleName: string;
    warehouse: string;
    location: string;
    batch: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    total: number;
    generalAccount: string;
    costCenter: string;
    analytic: string;
    functional: string;
    project: string;
    pepElement: string;
    item: string;
}
