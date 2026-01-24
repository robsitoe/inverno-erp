export declare class CreateArticleDto {
    id?: string;
    companyId?: string;
    code: string;
    name: string;
    description?: string;
    type?: string;
    unit?: string;
    purchasePrice?: number;
    salePrice?: number;
    minStock?: number;
    maxStock?: number;
    currentStock?: number;
    ivaRate?: number;
    ivaCode?: string;
    stockControl?: boolean;
    familyId?: string;
    revenueAccountId?: string;
    cogsAccountId?: string;
    inventoryAccountId?: string;
    isActive?: boolean;
}
