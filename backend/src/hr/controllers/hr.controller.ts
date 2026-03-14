import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, UseInterceptors, UploadedFile,
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
  @ApiOperation({ summary: 'Create a new employee' })
  createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.hrService.create(createEmployeeDto);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get all employees' })
  findAllEmployees(@Query('companyId') companyId?: string) {
    return this.hrService.findAll(companyId);
  }

  // ── Specific routes BEFORE /:id to avoid NestJS route conflicts ─────────────

  @Get('employees/next-code')
  @ApiOperation({ summary: 'Get next available employee code' })
  getNextCode(@Query('companyId') companyId: string) {
    return this.hrService.getNextCode(companyId);
  }

  @Get('employees/check-code')
  @ApiOperation({ summary: 'Check if employee code is available' })
  checkCode(
    @Query('code') code: string,
    @Query('companyId') companyId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.hrService.checkCodeAvailability(code, companyId, excludeId);
  }

  @Get('employees/check-nib')
  @ApiOperation({ summary: 'Check if NIB is already registered' })
  checkNib(
    @Query('nib') nib: string,
    @Query('companyId') companyId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.hrService.checkNibAvailability(nib, companyId, excludeId);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get an employee by ID' })
  findOneEmployee(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.findOne(id, companyId);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update an employee' })
  updateEmployee(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    // Note: in a production app, we would get the user from the request (e.g. req.user)
    return this.hrService.update(id, updateEmployeeDto);
  }

  @Get('employees/:id/salary-history')
  @ApiOperation({ summary: 'Get salary history for an employee' })
  getSalaryHistory(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.getSalaryHistory(id, companyId);
  }

  @Post('salary-variations')
  @ApiOperation({ summary: 'Create a new salary variation' })
  createSalaryVariation(@Body() data: any, @Query('companyId') companyId?: string) {
    return this.hrService.createSalaryVariation(data, companyId);
  }

  @Patch('salary-variations/:id/apply')
  @ApiOperation({ summary: 'Apply a salary variation' })
  applySalaryVariation(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.applySalaryVariation(id, companyId);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Delete an employee' })
  removeEmployee(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.remove(id, companyId);
  }

  // ── Photo Upload ────────────────────────────────────────────────────────────

  @Post('employees/:id/photo')
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
  findAllPayroll(@Query('companyId') companyId?: string) {
    return [];
  }

  // ── Absences ────────────────────────────────────────────────────────────────

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

  // ── Tax Tables & Settings ───────────────────────────────────────────────────

  @Get('tax-brackets')
  @ApiOperation({ summary: 'List all tax brackets' })
  findAllTaxBrackets(@Query('companyId') companyId?: string) {
    return this.hrService.findAllTaxBrackets(companyId);
  }

  @Post('tax-brackets')
  @ApiOperation({ summary: 'Save/Update a tax bracket' })
  saveTaxBracket(@Body() data: any, @Query('companyId') companyId?: string) {
    return this.hrService.saveTaxBracket(data, companyId);
  }

  @Delete('tax-brackets/:id')
  @ApiOperation({ summary: 'Delete a tax bracket' })
  deleteTaxBracket(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.hrService.deleteTaxBracket(id, companyId);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get HR settings' })
  getSettings(@Query('companyId') companyId?: string) {
    return this.hrService.getSettings(companyId);
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update HR settings' })
  updateSettings(@Body() data: any, @Query('companyId') companyId?: string) {
    return this.hrService.updateSettings(data, companyId);
  }

  // ── Reports ─────────────────────────────────────────────────────────────────

  @Get('reports/payroll-sheet')
  @ApiOperation({ summary: 'Get payroll sheet data' })
  getPayrollSheet(@Query('year') year: number, @Query('month') month: number, @Query('companyId') companyId?: string) {
    return this.payrollService.getPayrollReportData(Number(year), Number(month), companyId);
  }

  @Get('reports/nominal-relation')
  @ApiOperation({ summary: 'Get nominal relation data' })
  getNominalRelation(@Query('companyId') companyId?: string) {
    return this.hrService.getNominalRelation(companyId);
  }

  @Get('reports/seniority')
  @ApiOperation({ summary: 'Get seniority map data' })
  getSeniorityMap(@Query('companyId') companyId?: string) {
    return this.hrService.getSeniorityMap(companyId);
  }

  @Get('reports/vacation-plan')
  @ApiOperation({ summary: 'Get vacation plan data' })
  getVacationPlan(@Query('year') year: number, @Query('companyId') companyId?: string) {
    return this.hrService.getVacationPlan(Number(year), companyId);
  }
}
