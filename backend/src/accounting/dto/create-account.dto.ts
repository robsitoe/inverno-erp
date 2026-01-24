import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '../entities/account.entity';

export class CreateAccountDto {
    @ApiProperty({ example: 'uuid-id', description: 'ID of the account' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'company-id', description: 'Company ID' })
    @IsString()
    @IsOptional()
    companyId?: string;

    @ApiProperty({ example: '1.1', description: 'The unique code of the account' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Caixa', description: 'The name of the account' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Description', description: 'The description of the account' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'The type of the account' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ example: 1, description: 'The hierarchy level of the account' })
    @IsNumber()
    @IsOptional()
    level?: number;

    @ApiProperty({ example: null, description: 'The parent account ID', required: false })
    @IsString()
    @IsOptional()
    parentId?: string;

    @ApiProperty({ example: true, description: 'Whether posting is allowed on this account' })
    @IsBoolean()
    @IsOptional()
    allowPosting?: boolean;

    @ApiProperty({ example: 0, description: 'Current balance' })
    @IsNumber()
    @IsOptional()
    balance?: number;

    @ApiProperty({ example: true, description: 'Is active' })
    @IsOptional()
    isActive?: boolean;
}
