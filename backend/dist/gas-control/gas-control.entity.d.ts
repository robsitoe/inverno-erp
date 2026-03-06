export declare class GasCylinderType {
    id: string;
    companyId: string;
    name: string;
    brand: string;
    priceRevendedor: number;
    priceBomba: number;
    priceConsumidor: number;
    isActive: boolean;
}
export declare class GasDailyControl {
    id: string;
    companyId: string;
    date: string;
    status: string;
    openedBy: string;
    openedAt: Date;
    closedBy: string;
    closedAt: Date;
    initialStock: any;
    finalStock: any;
    auditLog: any[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class GasDailyEntry {
    id: string;
    controlId: string;
    companyId: string;
    cylinderTypeId: string;
    customerName: string;
    entryType: string;
    priceType: string;
    s_gpl: number;
    s_vaz: number;
    s_av: number;
    vz_vend: number;
    adc_caucao: number;
    e_gpl: number;
    e_vaz: number;
    e_av: number;
    p_divida: number;
    totalAmount: number;
    gr: boolean;
    invoice: boolean;
}
