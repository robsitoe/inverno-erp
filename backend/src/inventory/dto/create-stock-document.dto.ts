import { IsString, IsNumber, IsDateString, IsOptional, ValidateNested, IsNotEmpty, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StockDocumentStatus } from '../entities/stock-document.entity';

class StockDocumentLineDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsString()
    articleId?: string;

    @IsString()
    articleCode: string;

    @IsString()
    @IsOptional()
    articleName?: string;

    @IsString()
    @IsOptional()
    warehouse?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    batch?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    @IsOptional()
    unitPrice?: number;

    @IsNumber()
    @IsOptional()
    total?: number;

    // Analytics
    @IsOptional() @IsString() generalAccount?: string;
    @IsOptional() @IsString() costCenter?: string;
    @IsOptional() @IsString() analytic?: string;
    @IsOptional() @IsString() functional?: string;
    @IsOptional() @IsString() project?: string;
    @IsOptional() @IsString() pepElement?: string;
    @IsOptional() @IsString() item?: string;
}

export class CreateStockDocumentDto {
    @IsOptional()
    @IsString()
    companyId?: string;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    series: string;

    @IsNumber()
    @IsNotEmpty()
    number: number;

    @IsDateString()
    date: string;

    @IsString()
    @IsOptional()
    time?: string;

    @IsString()
    @IsOptional()
    warehouse?: string;

    // Origin
    @IsOptional() @IsString() originAccount?: string;
    @IsOptional() @IsString() originCostCenter?: string;
    @IsOptional() @IsString() originProject?: string;
    @IsOptional() @IsString() originAnalytic?: string;
    @IsOptional() @IsString() originFunctional?: string;
    @IsOptional() @IsString() originPep?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StockDocumentLineDto)
    lines: StockDocumentLineDto[];

    @IsEnum(StockDocumentStatus)
    @IsOptional()
    status?: StockDocumentStatus;

    @IsString()
    @IsOptional()
    notes?: string;
}
