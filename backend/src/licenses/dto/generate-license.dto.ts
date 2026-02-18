import { IsString, IsEnum, IsNumber, IsOptional, IsArray, Min, Max, IsEmail } from 'class-validator';
import { LicensePlan } from '../entities/license.entity';

export class GenerateLicenseDto {
    @IsString()
    companyId: string;

    @IsString()
    companyName: string;

    @IsEnum(LicensePlan)
    plan: LicensePlan;

    @IsNumber()
    @Min(1)
    @Max(3650) // max 10 years
    durationDays: number;

    @IsOptional()
    @IsArray()
    features?: string[];

    @IsOptional()
    @IsNumber()
    maxUsers?: number;

    @IsOptional()
    @IsNumber()
    maxCompanies?: number;

    @IsOptional()
    @IsNumber()
    gracePeriodHours?: number;

    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @IsOptional()
    @IsString()
    contactPhone?: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price?: number;
}

export class ActivateLicenseDto {
    @IsString()
    token: string; // The signed JWT license token
}
