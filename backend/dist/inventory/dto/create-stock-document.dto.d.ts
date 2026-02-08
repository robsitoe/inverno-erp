import { StockDocumentStatus } from '../entities/stock-document.entity';
declare class StockDocumentLineDto {
    id?: string;
    articleId?: string;
    articleCode: string;
    articleName?: string;
    warehouse?: string;
    location?: string;
    batch?: string;
    description?: string;
    unit?: string;
    quantity: number;
    unitPrice?: number;
    total?: number;
    generalAccount?: string;
    costCenter?: string;
    analytic?: string;
    functional?: string;
    project?: string;
    pepElement?: string;
    item?: string;
}
export declare class CreateStockDocumentDto {
    companyId?: string;
    type: string;
    series: string;
    number: number;
    date: string;
    time?: string;
    warehouse?: string;
    originAccount?: string;
    originCostCenter?: string;
    originProject?: string;
    originAnalytic?: string;
    originFunctional?: string;
    originPep?: string;
    lines: StockDocumentLineDto[];
    status?: StockDocumentStatus;
    notes?: string;
}
export {};
