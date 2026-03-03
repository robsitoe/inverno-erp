import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContractType } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nif?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  inss?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nib?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ enum: ContractType })
  @IsEnum(ContractType)
  @IsOptional()
  contractType?: ContractType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hireDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trialPeriodEnd?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  weeklyHours?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  dependents?: number;

  @ApiProperty()
  @IsNumber()
  salaryBase: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  subsidyTransport?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  subsidyFood?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  subsidyHousing?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  terminationReason?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  vacationBalance?: number;

  @IsOptional()
  @IsString()
  companyId?: string;
}
