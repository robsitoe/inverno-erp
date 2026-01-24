import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
    @ApiProperty({ example: 'uuid-id' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'company-id' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ example: 'S001' })
    @IsString()
    code: string;

    @ApiProperty({ example: 'Supplier Name' })
    @IsString()
    name: string;

    @ApiProperty({ example: '123456789' })
    @IsString()
    @IsOptional()
    nif?: string;

    @ApiProperty({ example: 'Address' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: 'City' })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({ example: 'Postal Code' })
    @IsString()
    @IsOptional()
    postalCode?: string;

    @ApiProperty({ example: 'Country' })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiProperty({ example: 'Phone' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ example: 'Email' })
    @IsString()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 30 })
    @IsNumber()
    @IsOptional()
    paymentTerms?: number;

    @ApiProperty({ example: 1000 })
    @IsNumber()
    @IsOptional()
    creditLimit?: number;

    @ApiProperty({ example: 0 })
    @IsNumber()
    @IsOptional()
    currentBalance?: number;

    @ApiProperty({ example: 'acc-id' })
    @IsString()
    @IsOptional()
    payableAccountId?: string;

    @IsOptional()
    isActive?: boolean;
}
