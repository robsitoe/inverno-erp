import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { JournalEntryStatus } from '../entities/journal-entry.entity';

export class CreateJournalLineDto {
    @ApiProperty({ example: 'uuid-id', description: 'ID of the line' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'account-id', description: 'The ID of the account' })
    @IsString()
    @IsNotEmpty()
    accountId: string;

    @ApiProperty({ example: '1.1', description: 'The code of the account' })
    @IsString()
    @IsOptional()
    accountCode?: string;

    @ApiProperty({ example: 'Caixa', description: 'The name of the account' })
    @IsString()
    @IsOptional()
    accountName?: string;

    @ApiProperty({ example: 'Payment of Invoice #123', description: 'Description of the line item', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 100.00, description: 'Debit amount' })
    @IsNumber()
    debit: number;

    @ApiProperty({ example: 0.00, description: 'Credit amount' })
    @IsNumber()
    credit: number;
}

export class CreateJournalEntryDto {
    @ApiProperty({ example: 'uuid-id', description: 'ID of the entry' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'company-id', description: 'Company ID' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ example: 'journal-id', description: 'Journal ID' })
    @IsString()
    @IsOptional()
    journalId?: string;

    @ApiProperty({ example: 'Sales Invoice #123', description: 'Description of the journal entry' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ example: '2023-10-27', description: 'Date of the journal entry' })
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @ApiProperty({ description: 'Status of the entry', default: 'DRAFT' })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiProperty({ example: 'INV-2023-001', description: 'External reference', required: false })
    @IsString()
    @IsOptional()
    reference?: string;

    @ApiProperty({ example: 'DOC-001', description: 'Source document', required: false })
    @IsString()
    @IsOptional()
    sourceDocument?: string;

    @ApiProperty({ example: 'SALE', description: 'Source type', required: false })
    @IsString()
    @IsOptional()
    sourceType?: string;

    @ApiProperty({ type: [CreateJournalLineDto], description: 'List of journal lines' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateJournalLineDto)
    lines: CreateJournalLineDto[];
}
