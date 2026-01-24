import { IsString, IsNotEmpty, IsOptional, MinLength, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ example: 'admin', description: 'ID' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'admin', description: 'Username' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'password123', description: 'Password' })
    @IsString()
    @IsNotEmpty()
    @MinLength(4)
    password: string;

    @ApiProperty({ example: 'Admin User', description: 'Name' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'admin@erp.com', description: 'Email' })
    @IsString()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: '123456789', description: 'Phone' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ example: true, description: 'Is Admin' })
    @IsBoolean()
    @IsOptional()
    isAdmin?: boolean;

    @ApiProperty({ example: true, description: 'Is Super Admin' })
    @IsBoolean()
    @IsOptional()
    isSuperAdmin?: boolean;

    @ApiProperty({ example: true, description: 'Is Technical' })
    @IsBoolean()
    @IsOptional()
    isTechnical?: boolean;

    @ApiProperty({ example: true, description: 'Is Active' })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ example: 'Administrador', description: 'Profile' })
    @IsString()
    @IsOptional()
    profile?: string;

    @ApiProperty({ example: 'pt', description: 'Language' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiProperty({ example: [], description: 'Permissions' })
    @IsArray()
    @IsOptional()
    permissions?: any[];
}
