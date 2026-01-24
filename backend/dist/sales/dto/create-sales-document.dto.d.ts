export declare class CreateSalesDocumentLineDto {
    articleId: string;
    articleCode: string;
    articleName: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    ivaRate?: number;
    ivaCode?: string;
    subtotal?: number;
    ivaAmount?: number;
    total?: number;
}
export declare class CreateSalesDocumentDto {
    id?: string;
    companyId?: string;
    documentType: string;
    series?: string;
    documentNumber?: string;
    date: string;
    dueDate: string;
    customerId?: string;
    customerName?: string;
    customerNif?: string;
    customerAddress?: string;
    subtotal?: number;
    discounts?: number;
    totalIva?: number;
    total?: number;
    notes?: string;
    status?: string;
    lines: CreateSalesDocumentLineDto[];
}
