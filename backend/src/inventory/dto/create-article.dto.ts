import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ArticleType } from '../entities/article.entity';

export class CreateArticleDto {
    @ApiProperty({ example: 'uuid-id', description: 'ID of the article' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'company-id', description: 'Company ID' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ example: 'A001', description: 'Unique code of the article' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Laptop Dell XPS 15', description: 'Name of the article' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Description', description: 'Description of the article' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Type of the article', default: 'PRODUCT' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiProperty({ example: 'Un', description: 'Unit of measure', required: false })
    @IsString()
    @IsOptional()
    unit?: string;

    @ApiProperty({ example: 1500.00, description: 'Purchase price' })
    @IsNumber()
    @IsOptional()
    purchasePrice?: number;

    @ApiProperty({ example: 2000.00, description: 'Sale price' })
    @IsNumber()
    @IsOptional()
    salePrice?: number;

    @ApiProperty({ example: 10, description: 'Minimum stock level' })
    @IsNumber()
    @IsOptional()
    minStock?: number;

    @ApiProperty({ example: 100, description: 'Maximum stock level' })
    @IsNumber()
    @IsOptional()
    maxStock?: number;

    @ApiProperty({ example: 0, description: 'Current stock level' })
    @IsNumber()
    @IsOptional()
    currentStock?: number;

    @ApiProperty({ example: 16, description: 'IVA Rate' })
    @IsNumber()
    @IsOptional()
    ivaRate?: number;

    @ApiProperty({ example: 'IVA', description: 'IVA Code' })
    @IsString()
    @IsOptional()
    ivaCode?: string;

    @ApiProperty({ example: true, description: 'Stock control' })
    @IsOptional()
    stockControl?: boolean;

    @ApiProperty({ example: 'family-id', description: 'Family ID' })
    @IsString()
    @IsOptional()
    familyId?: string;

    @ApiProperty({ example: 'revenue-acc-id', description: 'Revenue Account ID' })
    @IsString()
    @IsOptional()
    revenueAccountId?: string;

    @ApiProperty({ example: 'cogs-acc-id', description: 'COGS Account ID' })
    @IsString()
    @IsOptional()
    cogsAccountId?: string;

    @ApiProperty({ example: 'inventory-acc-id', description: 'Inventory Account ID' })
    @IsString()
    @IsOptional()
    inventoryAccountId?: string;

    @ApiProperty({ example: true, description: 'Is active' })
    @IsOptional()
    isActive?: boolean;
}
