import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StockDocumentType, StockMovementType } from '../entities/stock-movement.entity';

export class CreateStockMovementDto {
    @ApiProperty({ example: 'uuid-id', description: 'ID of the movement' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'company-id', description: 'Company ID' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ example: 'article-id', description: 'The ID of the article' })
    @IsString()
    @IsNotEmpty()
    articleId: string;

    @ApiProperty({ example: 'A001', description: 'Article Code' })
    @IsString()
    @IsOptional()
    articleCode?: string;

    @ApiProperty({ example: 'Product Name', description: 'Article Name' })
    @IsString()
    @IsOptional()
    articleName?: string;

    @ApiProperty({ example: '2023-10-27', description: 'Date of the movement' })
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @ApiProperty({ description: 'Type of the movement (IN/OUT/ADJUSTMENT/TRANSFER)' })
    @IsString()
    @IsNotEmpty()
    movementType: string;

    @ApiProperty({ example: 10, description: 'Quantity' })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @ApiProperty({ example: 1500.00, description: 'Unit cost' })
    @IsNumber()
    @IsOptional()
    unitCost?: number;

    @ApiProperty({ example: 15000.00, description: 'Total cost' })
    @IsNumber()
    @IsOptional()
    totalCost?: number;

    @ApiProperty({ example: 'warehouse-id', description: 'Warehouse ID', required: false })
    @IsString()
    @IsOptional()
    warehouseId?: string;

    @ApiProperty({ example: 'location-id', description: 'Location ID', required: false })
    @IsString()
    @IsOptional()
    locationId?: string;

    @ApiProperty({ example: 'batch-id', description: 'Batch ID', required: false })
    @IsString()
    @IsOptional()
    batchId?: string;

    @ApiProperty({ example: 'REF001', description: 'Reference', required: false })
    @IsString()
    @IsOptional()
    reference?: string;

    @ApiProperty({ example: 'DOC001', description: 'Source Document', required: false })
    @IsString()
    @IsOptional()
    sourceDocument?: string;

    @ApiProperty({ example: 'Notes', description: 'Notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
