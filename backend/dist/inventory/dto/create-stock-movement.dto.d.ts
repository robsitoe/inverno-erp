export declare class CreateStockMovementDto {
    id?: string;
    companyId?: string;
    articleId: string;
    articleCode?: string;
    articleName?: string;
    date: string;
    movementType: string;
    quantity: number;
    unitCost?: number;
    totalCost?: number;
    warehouseId?: string;
    locationId?: string;
    batchId?: string;
    reference?: string;
    sourceDocument?: string;
    notes?: string;
}
