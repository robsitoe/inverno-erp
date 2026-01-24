import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTreasuryLineDto {
    @ApiProperty({ example: 'uuid-id' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'INV-001' })
    @IsString()
    @IsNotEmpty()
    docNumber: string;

    @ApiProperty({ example: 100.00 })
    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @ApiProperty({ example: 'CASH' })
    @IsString()
    @IsOptional()
    paymentMode?: string;
}

export class CreateTreasuryDto {
    @ApiProperty({ example: 'uuid-id' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'company-id' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ example: 'RECEIPT' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ example: 'RE' })
    @IsString()
    @IsOptional()
    docType?: string;

    @ApiProperty({ example: '2024' })
    @IsString()
    @IsOptional()
    series?: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsOptional()
    seriesNumber?: number;

    @ApiProperty({ example: 'RE 2024/1' })
    @IsString()
    @IsNotEmpty()
    number: string;

    @ApiProperty({ example: '2024-01-01' })
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @ApiProperty({ example: 100.00 })
    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @ApiProperty({ example: 'acc-id' })
    @IsString()
    @IsOptional()
    treasuryAccountId?: string;

    @ApiProperty({ example: 'CLI001' })
    @IsString()
    @IsOptional()
    entityCode?: string;

    @ApiProperty({ example: 'Customer Name' })
    @IsString()
    @IsOptional()
    entityName?: string;

    @ApiProperty({ example: 'CLI001' })
    @IsString()
    @IsOptional()
    customerCode?: string;

    @ApiProperty({ example: 'Customer Name' })
    @IsString()
    @IsOptional()
    customerName?: string;

    @ApiProperty({ example: 'SUP001' })
    @IsString()
    @IsOptional()
    beneficiaryCode?: string;

    @ApiProperty({ example: 'Supplier Name' })
    @IsString()
    @IsOptional()
    beneficiaryName?: string;

    @ApiProperty({ example: 'CASH' })
    @IsString()
    @IsOptional()
    paymentMethod?: string;

    @ApiProperty({ example: 'Description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'Observations' })
    @IsString()
    @IsOptional()
    observations?: string;

    @ApiProperty({ example: 'INV-001' })
    @IsString()
    @IsOptional()
    relatedDocument?: string;

    @ApiProperty({ type: [CreateTreasuryLineDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateTreasuryLineDto)
    lines?: CreateTreasuryLineDto[];
}
