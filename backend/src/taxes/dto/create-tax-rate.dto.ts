import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxRateDto {
    @ApiProperty({ example: 'company-id', description: 'Company ID' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ example: '16', description: 'Unique code of the tax rate' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'IVA Taxa Normal', description: 'Description of the tax rate' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ example: 16, description: 'Percentage rate' })
    @IsNumber()
    @IsNotEmpty()
    rate: number;

    @ApiProperty({ example: 'IVA', enum: ['IVA', 'IS', 'IRPC', 'IRPS', 'OTHER'] })
    @IsEnum(['IVA', 'IS', 'IRPC', 'IRPS', 'OTHER'])
    @IsOptional()
    type?: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
