export declare enum ArticleType {
    PRODUCT = "PRODUCT",
    SERVICE = "SERVICE"
}
export declare class Article {
    id: string;
    companyId: string | null;
    code: string;
    name: string;
    description: string;
    familyId: string;
    type: string;
    unit: string;
    purchasePrice: number;
    salePrice: number;
    ivaRate: number;
    ivaCode: string;
    stockControl: boolean;
    currentStock: number;
    minStock: number;
    maxStock: number;
    revenueAccountId: string;
    cogsAccountId: string;
    inventoryAccountId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
