export declare class UpdateLicensePricingDto {
    price: number;
    companyIds?: string[];
}
export declare class BlockLicensesDto {
    companyIds?: string[];
    reason?: string;
}
export declare class ListLicensesQueryDto {
    status?: string;
    search?: string;
}
