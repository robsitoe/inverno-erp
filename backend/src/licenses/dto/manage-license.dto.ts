import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLicensePricingDto {
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @IsOptional()
    @IsArray()
    companyIds?: string[];
}

export class BlockLicensesDto {
    @IsOptional()
    @IsArray()
    companyIds?: string[];

    @IsOptional()
    @IsString()
    reason?: string;
}

export class ListLicensesQueryDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    search?: string;
}
