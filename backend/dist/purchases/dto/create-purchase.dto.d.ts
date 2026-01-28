export declare class CreatePurchaseLineDto {
    articleId: string;
    articleCode: string;
    articleName: string;
    quantity: number;
    unitPrice: number;
    id?: string;
    discount?: number;
    ivaRate?: number;
    ivaCode?: string;
    subtotal?: number;
    ivaAmount?: number;
    total?: number;
}
export declare class CreatePurchaseDto {
    id?: string;
    companyId?: string;
    documentType: string;
    series?: string;
    documentNumber?: string;
    seriesNumber?: number;
    date: string;
    dueDate: string;
    supplierId?: string;
    supplierName?: string;
    supplierNif?: string;
    supplierAddress?: string;
    subtotal?: number;
    discounts?: number;
    totalIva?: number;
    total?: number;
    notes?: string;
    status?: string;
    lines: CreatePurchaseLineDto[];
}
