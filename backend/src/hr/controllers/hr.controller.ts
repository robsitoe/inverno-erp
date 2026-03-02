import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HRService } from '../services/hr.service';
import { PayrollService } from '../services/payroll.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { AbsenceStatus } from '../entities/absence.entity';
import { LicenseGuard } from '../../auth/guards/license.guard';

@ApiTags('hr')
@Controller('hr')
@UseGuards(LicenseGuard)
export class HRController {
  constructor(
    private readonly hrService: HRService,
    private readonly payrollService: PayrollService,
  ) {}

  @Post('employees')
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, description: 'The employee has been successfully created.' })
  createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.hrService.create(createEmployeeDto);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get all employees' })
  findAllEmployees(@Query('companyId') companyId?: string) {
    return this.hrService.findAll(companyId);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get an employee by ID' })
  findOneEmployee(@Param('id') id: string) {
    return this.hrService.findOne(id);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update an employee' })
  updateEmployee(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.hrService.update(id, updateEmployeeDto);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Delete an employee' })
  removeEmployee(@Param('id') id: string) {
    return this.hrService.remove(id);
  }

  // Payroll Endpoints

  @Post('payroll/process')
  @ApiOperation({ summary: 'Process payroll for a specific month' })
  processMonthlyPayroll(@Body() payload: { year: number, month: number }, @Query('companyId') companyId?: string) {
    return this.payrollService.processPayroll(payload.year, payload.month, companyId);
  }

  @Post('payroll/post-to-accounting')
  @ApiOperation({ summary: 'Post processed payroll to accounting module' })
  postPayrollToAccounting(@Body() payload: { year: number, month: number }, @Query('companyId') companyId?: string) {
    return this.payrollService.postPayrollToAccounting(payload.year, payload.month, companyId);
  }

  @Get('payroll')
  @ApiOperation({ summary: 'Get all payroll records' })
  findAllPayroll(@Query('companyId') companyId?: string, @Query('year') year?: number, @Query('month') month?: number) {
    // Basic placeholder, in reality service will handle company/year/month filter
    return []; 
  }

  // Absence Endpoints

  @Post('absences')
  @ApiOperation({ summary: 'Request an absence/vacation' })
  createAbsence(@Body() data: any) {
    return this.hrService.createAbsence(data);
  }

  @Get('absences')
  @ApiOperation({ summary: 'List absences' })
  findAllAbsences(@Query('companyId') companyId?: string, @Query('employeeId') employeeId?: string) {
    return this.hrService.findAllAbsences(companyId, employeeId);
  }

  @Patch('absences/:id/status')
  @ApiOperation({ summary: 'Update absence status' })
  updateAbsenceStatus(@Param('id') id: string, @Body('status') status: AbsenceStatus) {
    return this.hrService.updateAbsenceStatus(id, status);
  }
}
