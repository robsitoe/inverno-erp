import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseLineDto {
    @ApiProperty({ example: 'article-id', description: 'Article ID' })
    @IsString()
    @IsNotEmpty()
    articleId: string;

    @ApiProperty({ example: 'A001', description: 'Article Code' })
    @IsString()
    @IsNotEmpty()
    articleCode: string;

    @ApiProperty({ example: 'Product Name', description: 'Article Name' })
    @IsString()
    @IsNotEmpty()
    articleName: string;

    @ApiProperty({ example: 1, description: 'Quantity' })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @ApiProperty({ example: 100.00, description: 'Unit Price' })
    @IsNumber()
    @IsNotEmpty()
    unitPrice: number;

    @ApiProperty({ example: 'LINE-ID', description: 'Line ID' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 0, description: 'Discount percentage' })
    @IsNumber()
    @IsOptional()
    discount?: number;

    @ApiProperty({ example: 16, description: 'IVA Rate' })
    @IsNumber()
    @IsOptional()
    ivaRate?: number;

    @ApiProperty({ example: 'IVA', description: 'IVA Code' })
    @IsString()
    @IsOptional()
    ivaCode?: string;

    @ApiProperty({ example: 100.00, description: 'Subtotal' })
    @IsNumber()
    @IsOptional()
    subtotal?: number;

    @ApiProperty({ example: 16.00, description: 'IVA Amount' })
    @IsNumber()
    @IsOptional()
    ivaAmount?: number;

    @ApiProperty({ example: 116.00, description: 'Total' })
    @IsNumber()
    @IsOptional()
    total?: number;
}

export class CreatePurchaseDto {
    @ApiProperty({ example: 'uuid-id', description: 'ID of the document' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'company-id', description: 'Company ID' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ description: 'Document Type' })
    @IsString()
    @IsNotEmpty()
    documentType: string;

    @ApiProperty({ example: 'A', description: 'Series' })
    @IsString()
    @IsOptional()
    series?: string;

    @ApiProperty({ example: 'PUR-001', description: 'Document Number' })
    @IsString()
    @IsOptional()
    documentNumber?: string;

    @ApiProperty({ example: 1, description: 'Series Number' })
    @IsNumber()
    @IsOptional()
    seriesNumber?: number;

    @ApiProperty({ example: '2023-10-27', description: 'Document Date' })
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @ApiProperty({ example: '2023-11-27', description: 'Due Date' })
    @IsDateString()
    @IsNotEmpty()
    dueDate: string;

    @ApiProperty({ example: 'SUP001', description: 'Supplier Code', required: false })
    @IsString()
    @IsOptional()
    supplierCode?: string;

    @ApiProperty({ example: 'supplier-id', description: 'Supplier ID', required: false })
    @IsString()
    @IsOptional()
    supplierId?: string;

    @ApiProperty({ example: 'Supplier Name', description: 'Supplier Name', required: false })
    @IsString()
    @IsOptional()
    supplierName?: string;

    @ApiProperty({ example: '123456789', description: 'Supplier NIF', required: false })
    @IsString()
    @IsOptional()
    supplierNif?: string;

    @ApiProperty({ example: 'Address', description: 'Supplier Address', required: false })
    @IsString()
    @IsOptional()
    supplierAddress?: string;

    @ApiProperty({ example: 100.00, description: 'Subtotal' })
    @IsNumber()
    @IsOptional()
    subtotal?: number;

    @ApiProperty({ example: 0, description: 'Discounts' })
    @IsNumber()
    @IsOptional()
    discounts?: number;

    @ApiProperty({ example: 16.00, description: 'Total IVA' })
    @IsNumber()
    @IsOptional()
    totalIva?: number;

    @ApiProperty({ example: 116.00, description: 'Total' })
    @IsNumber()
    @IsOptional()
    total?: number;

    @ApiProperty({ example: 'Notes', description: 'Notes' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ description: 'Status', default: 'DRAFT' })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiProperty({ type: [CreatePurchaseLineDto], description: 'Document Lines' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePurchaseLineDto)
    lines: CreatePurchaseLineDto[];
}
