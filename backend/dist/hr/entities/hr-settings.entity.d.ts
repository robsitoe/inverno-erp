export declare class TaxBracket {
    id: string;
    companyId: string;
    minAmount: number;
    maxAmount: number | null;
    rate: number;
    deduction0: number;
    deduction1: number;
    deduction2: number;
    deduction3: number;
    deduction4Plus: number;
    isActive: boolean;
}
export declare class HRSettings {
    companyId: string;
    inssEmployeeRate: number;
    inssEmployerRate: number;
    currency: string;
}
