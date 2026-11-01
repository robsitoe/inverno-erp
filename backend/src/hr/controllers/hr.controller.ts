import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, UseInterceptors, UploadedFile, Req,
  BadRequestException, Res, NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import * as express from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { HRService } from '../services/hr.service';
import { PayrollService } from '../services/payroll.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { AbsenceStatus } from '../entities/absence.entity';
import { LicenseGuard } from '../../auth/guards/license.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'hr');

function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
}

function multerStorage(subfolder: string) {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(UPLOADS_DIR, subfolder);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  });
}

@ApiTags('hr')
@Controller('hr')
@UseGuards(LicenseGuard)
export class HRController {
  constructor(
    private readonly hrService: HRService,
    private readonly payrollService: PayrollService,
  ) {
    ensureUploadsDir();
  }

  // ── Employee CRUD ───────────────────────────────────────────────────────────

  @Post('employees')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.employees.manage')
  @ApiOperation({ summary: 'Create a new employee' })
  createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.hrService.create(createEmployeeDto);
  }

  @Get('employees')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all employees' })
  findAllEmployees(@Query('companyId') companyId?: string) {
    return this.hrService.findAll(companyId);
  }

  // ── Specific routes BEFORE /:id to avoid NestJS route conflicts ─────────────

  @Get('employees/next-code')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get next available employee code' })
  getNextCode(@Query('companyId') companyId: string) {
    return this.hrService.getNextCode(companyId);
  }

  @Get('employees/check-code')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if employee code is available' })
  checkCode(
    @Query('code') code: string,
    @Query('companyId') companyId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.hrService.checkCodeAvailability(code, companyId, excludeId);
  }

  @Get('employees/check-nib')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if NIB is already registered' })
  checkNib(
    @Query('nib') nib: string,
    @Query('companyId') companyId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.hrService.checkNibAvailability(nib, companyId, excludeId);
  }

  @Get('employees/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get an employee by ID' })
  findOneEmployee(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.findOne(id, companyId);
  }

  @Patch('employees/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.employees.manage')
  @ApiOperation({ summary: 'Update an employee' })
  updateEmployee(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto, @Req() req: any) {
    return this.hrService.update(id, updateEmployeeDto, req.user);
  }

  @Get('employees/:id/salary-history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get salary history for an employee' })
  getSalaryHistory(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.getSalaryHistory(id, companyId);
  }

  @Post('salary-variations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.employees.manage')
  @ApiOperation({ summary: 'Create a new salary variation' })
  createSalaryVariation(@Body() data: any, @Query('companyId') companyId?: string) {
    return this.hrService.createSalaryVariation(data, companyId);
  }

  @Patch('salary-variations/:id/apply')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.employees.manage')
  @ApiOperation({ summary: 'Apply a salary variation' })
  applySalaryVariation(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.applySalaryVariation(id, companyId);
  }

  @Delete('employees/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.employees.manage')
  @ApiOperation({ summary: 'Delete an employee' })
  removeEmployee(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.remove(id, companyId);
  }

  // ── Photo Upload ────────────────────────────────────────────────────────────

  @Post('employees/:id/photo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.employees.manage')
  @ApiOperation({ summary: 'Upload employee profile photo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', {
    storage: multerStorage('photos'),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException('Apenas imagens são permitidas (JPG, PNG, etc.)'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  }))
  uploadPhoto(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('Nenhum ficheiro enviado.');
    const url = `/hr/files/photos/${file.filename}`;
    return this.hrService.updatePhoto(id, url, companyId);
  }

  // ── Document Attachments ────────────────────────────────────────────────────

  @Post('employees/:id/documents')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.employees.manage')
  @ApiOperation({ summary: 'Upload employee document (BI, contract, etc.)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: multerStorage('docs'),
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowed.includes(file.mimetype)) {
        return cb(new BadRequestException('Tipo de ficheiro não suportado. Use PDF, imagem ou Word.'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  }))
  uploadDocument(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Query('type') docType: 'BI' | 'CONTRATO' | 'NUIT' | 'INSS' | 'OUTRO',
    @Query('label') label: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('Nenhum ficheiro enviado.');
    const url = `/hr/files/docs/${file.filename}`;
    return this.hrService.addDocument(id, {
      type: docType || 'OUTRO',
      label: label || file.originalname,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
    }, companyId);
  }

  @Delete('employees/:id/documents/:docId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.employees.manage')
  @ApiOperation({ summary: 'Remove an employee document' })
  removeDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.hrService.removeDocument(id, docId, companyId);
  }

  // ── Static file serving ─────────────────────────────────────────────────────

  @Get('files/photos/:filename')
  @ApiOperation({ summary: 'Serve employee photo' })
  servePhoto(@Param('filename') filename: string, @Res() res: express.Response) {
    const filePath = join(UPLOADS_DIR, 'photos', filename);
    if (!existsSync(filePath)) throw new NotFoundException('Ficheiro não encontrado.');
    res.sendFile(filePath);
  }

  @Get('files/docs/:filename')
  @ApiOperation({ summary: 'Serve employee document' })
  serveDocument(@Param('filename') filename: string, @Res() res: express.Response) {
    const filePath = join(UPLOADS_DIR, 'docs', filename);
    if (!existsSync(filePath)) throw new NotFoundException('Ficheiro não encontrado.');
    res.sendFile(filePath);
  }

  // ── Payroll ─────────────────────────────────────────────────────────────────

  @Post('payroll/process')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.generate')
  @ApiOperation({ summary: 'Process payroll for a specific month' })
  processMonthlyPayroll(@Body() payload: { year: number, month: number }, @Query('companyId') companyId?: string) {
    return this.payrollService.processPayroll(payload.year, payload.month, companyId);
  }

  @Post('payroll/submit')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.generate')
  @ApiOperation({ summary: 'Submit generated payroll for approval' })
  submitPayroll(@Body() payload: { year: number, month: number }, @Req() req: any, @Query('companyId') companyId?: string) {
    return this.payrollService.submitPayroll(payload.year, payload.month, companyId, req.user);
  }

  @Post('payroll/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.approve')
  @ApiOperation({ summary: 'Approve submitted payroll' })
  approvePayroll(@Body() payload: { year: number, month: number, notes?: string }, @Req() req: any, @Query('companyId') companyId?: string) {
    return this.payrollService.approvePayroll(payload.year, payload.month, companyId, req.user, payload.notes);
  }

  @Post('payroll/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.approve')
  @ApiOperation({ summary: 'Reject submitted payroll (notes required)' })
  rejectPayroll(@Body() payload: { year: number, month: number, notes: string }, @Req() req: any, @Query('companyId') companyId?: string) {
    return this.payrollService.rejectPayroll(payload.year, payload.month, companyId, req.user, payload.notes);
  }

  @Post('payroll/post-to-accounting')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.post')
  @ApiOperation({ summary: 'Post APPROVED payroll to accounting module' })
  postPayrollToAccounting(@Body() payload: { year: number, month: number }, @Req() req: any, @Query('companyId') companyId?: string) {
    return this.payrollService.postPayrollToAccounting(payload.year, payload.month, companyId, req.user);
  }

  @Post('payroll/pay')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.pay')
  @ApiOperation({ summary: 'Pay net salaries (posts 4.6.2.2 against treasury account)' })
  payPayroll(@Body() payload: { year: number, month: number, paymentAccountCode: string }, @Req() req: any, @Query('companyId') companyId?: string) {
    return this.payrollService.payPayroll(payload.year, payload.month, payload.paymentAccountCode || '1.2.1', companyId, req.user);
  }

  @Get('payroll/workflow-history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Workflow history for a payroll period' })
  getPayrollWorkflowHistory(@Query('year') year: number, @Query('month') month: number, @Query('companyId') companyId?: string) {
    return this.payrollService.getPayrollWorkflowHistory(Number(year), Number(month), companyId);
  }

  @Get('payroll')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Payroll records of a period (without recalculating)' })
  findPayroll(@Query('year') year: number, @Query('month') month: number, @Query('companyId') companyId?: string, @Query('employeeId') employeeId?: string) {
    // Por funcionário (ex.: tesouraria, salários por pagar) ou por período
    if (employeeId) return this.payrollService.getEmployeePayrolls(employeeId, companyId);
    if (!year || !month) throw new BadRequestException('Indique o ano e o mês.');
    return this.payrollService.getPayroll(Number(year), Number(month), companyId);
  }

  @Get('payroll/sequence-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Whether earlier months were processed before this one' })
  getPayrollSequenceStatus(@Query('year') year: number, @Query('month') month: number, @Query('companyId') companyId?: string) {
    if (!year || !month) throw new BadRequestException('Indique o ano e o mês.');
    return this.payrollService.getSequenceStatus(Number(year), Number(month), companyId);
  }

  @Patch('payroll/:id/variables')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.generate')
  @ApiOperation({ summary: 'Set overtime / bonus of a draft payroll record and recalculate it' })
  updatePayrollVariables(@Param('id') id: string, @Body() data: { overtimeAmount?: number; bonusAmount?: number }, @Query('companyId') companyId?: string) {
    return this.payrollService.updatePayrollVariables(id, data, companyId);
  }

  // ── Absences ────────────────────────────────────────────────────────────────

  @Post('absences')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.absences.manage')
  @ApiOperation({ summary: 'Request an absence/vacation' })
  createAbsence(@Body() data: any) {
    return this.hrService.createAbsence(data);
  }

  @Get('absences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List absences' })
  findAllAbsences(@Query('companyId') companyId?: string, @Query('employeeId') employeeId?: string) {
    return this.hrService.findAllAbsences(companyId, employeeId);
  }

  @Patch('absences/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.absences.manage')
  @ApiOperation({ summary: 'Update an absence (dates/days/reason/status)' })
  updateAbsence(@Param('id') id: string, @Body() data: any, @Query('companyId') companyId?: string) {
    return this.hrService.updateAbsence(id, data, companyId);
  }

  @Delete('absences/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.absences.manage')
  @ApiOperation({ summary: 'Delete an absence' })
  deleteAbsence(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.deleteAbsence(id, companyId);
  }

  @Patch('absences/:id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.absences.approve')
  @ApiOperation({ summary: 'Update absence status' })
  updateAbsenceStatus(@Param('id') id: string, @Body('status') status: AbsenceStatus) {
    return this.hrService.updateAbsenceStatus(id, status);
  }

  // ── Tax Tables & Settings ───────────────────────────────────────────────────

  @Get('tax-brackets')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all tax brackets' })
  findAllTaxBrackets(@Query('companyId') companyId?: string) {
    return this.hrService.findAllTaxBrackets(companyId);
  }

  @Post('tax-brackets')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.generate')
  @ApiOperation({ summary: 'Save/Update a tax bracket' })
  saveTaxBracket(@Body() data: any, @Query('companyId') companyId?: string) {
    return this.hrService.saveTaxBracket(data, companyId);
  }

  @Delete('tax-brackets/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.generate')
  @ApiOperation({ summary: 'Delete a tax bracket' })
  deleteTaxBracket(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.deleteTaxBracket(id, companyId);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get HR settings' })
  getSettings(@Query('companyId') companyId?: string) {
    return this.hrService.getSettings(companyId);
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('hr.payroll.generate')
  @ApiOperation({ summary: 'Update HR settings' })
  updateSettings(@Body() data: any, @Query('companyId') companyId?: string) {
    return this.hrService.updateSettings(data, companyId);
  }

  // ── Reports ─────────────────────────────────────────────────────────────────

  @Get('reports/payroll-sheet')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payroll sheet data' })
  getPayrollSheet(@Query('year') year: number, @Query('month') month: number, @Query('companyId') companyId?: string) {
    return this.payrollService.getPayrollReportData(Number(year), Number(month), companyId);
  }

  @Get('reports/nominal-relation')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get nominal relation data' })
  getNominalRelation(@Query('companyId') companyId?: string) {
    return this.hrService.getNominalRelation(companyId);
  }

  @Get('reports/seniority')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get seniority map data' })
  getSeniorityMap(@Query('companyId') companyId?: string) {
    return this.hrService.getSeniorityMap(companyId);
  }

  @Get('reports/vacation-plan')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get vacation plan data' })
  getVacationPlan(@Query('year') year: number, @Query('companyId') companyId?: string) {
    return this.hrService.getVacationPlan(Number(year), companyId);
  }
}
