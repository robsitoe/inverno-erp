export declare enum StockMovementType {
    IN = "IN",
    OUT = "OUT"
}
export declare enum StockDocumentType {
    FI = "FI",
    FS = "FS",
    SI = "SI",
    GT = "GT",
    GR = "GR",
    NC = "NC",
    ND = "ND"
}
export declare class StockMovement {
    id: string;
    companyId: string;
    date: string;
    articleId: string;
    articleCode: string;
    articleName: string;
    warehouseId: string;
    locationId: string;
    batchId: string;
    movementType: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    reference: string;
    sourceDocument: string;
    notes: string;
    createdAt: Date;
}
