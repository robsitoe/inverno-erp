import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJournalDto {
    @ApiProperty({ example: 'JNL-001', description: 'ID of the journal' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'company-id', description: 'Company ID' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ example: 'VENDAS', description: 'Code of the journal' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Diário de Vendas', description: 'Name of the journal' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'SALES', description: 'Type of the journal' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ example: true, description: 'Is active' })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
