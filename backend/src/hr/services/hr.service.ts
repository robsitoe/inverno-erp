import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral, Not } from 'typeorm';
import { Employee, ContractType } from '../entities/employee.entity';
import { Absence, AbsenceStatus } from '../entities/absence.entity';
import { TaxBracket, HRSettings } from '../entities/hr-settings.entity';
import { Company } from '../../companies/entities/company.entity';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { TenancyService } from '../../tenancy/tenancy.service';
import { TenancyContext } from '../../tenancy/tenancy.context';

@Injectable()
export class HRService {
  constructor(
    private readonly tenancyService: TenancyService,
    @InjectRepository(Employee)
    private readonly defaultEmployeeRepo: Repository<Employee>,
    @InjectRepository(Absence)
    private readonly defaultAbsenceRepo: Repository<Absence>,
    @InjectRepository(TaxBracket)
    private readonly defaultTaxBracketRepo: Repository<TaxBracket>,
    @InjectRepository(HRSettings)
    private readonly defaultHRSettingsRepo: Repository<HRSettings>,
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>, companyId?: string): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return defaultRepo;
    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  private async getEmployeeRepo(companyId?: string) {
    return this.getRepo(Employee, this.defaultEmployeeRepo, companyId);
  }

  private async getAbsenceRepo(companyId?: string) {
    return this.getRepo(Absence, this.defaultAbsenceRepo, companyId);
  }

  private async getTaxBracketRepo(companyId?: string) {
    return this.getRepo(TaxBracket, this.defaultTaxBracketRepo, companyId);
  }

  private async getHRSettingsRepo(companyId?: string) {
    return this.getRepo(HRSettings, this.defaultHRSettingsRepo, companyId);
  }

  /** Generates the next sequential employee code for a company (e.g. "001", "002") */
  async getNextCode(companyId: string): Promise<{ code: string }> {
    const repo = await this.getEmployeeRepo(companyId);
    const all = await repo.find({ where: { companyId }, order: { code: 'DESC' }, take: 1 });
    if (all.length === 0) return { code: '001' };
    const last = parseInt(all[0].code, 10);
    const next = isNaN(last) ? 1 : last + 1;
    return { code: String(next).padStart(3, '0') };
  }

  /** Checks if a code is already in use (excluding current employee on edit) */
  async checkCodeAvailability(code: string, companyId: string, excludeId?: string): Promise<{ available: boolean }> {
    const repo = await this.getEmployeeRepo(companyId);
    const where: any = { companyId, code };
    if (excludeId) where.id = Not(excludeId);
    const existing = await repo.findOne({ where });
    return { available: !existing };
  }

  /** Checks if a NIB is already registered (excluding current employee on edit) */
  async checkNibAvailability(nib: string, companyId: string, excludeId?: string): Promise<{ available: boolean; usedBy?: string }> {
    if (!nib || nib.trim() === '') return { available: true };
    const repo = await this.getEmployeeRepo(companyId);
    const where: any = { companyId, nib: nib.trim() };
    if (excludeId) where.id = Not(excludeId);
    const existing = await repo.findOne({ where });
    if (!existing) return { available: true };
    return { available: false, usedBy: existing.name };
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    const companyId = createEmployeeDto.companyId || TenancyContext.getCompanyId() || '0';
    const repo = await this.getEmployeeRepo(companyId);

    // Validate code uniqueness
    const codeCheck = await this.checkCodeAvailability(createEmployeeDto.code, companyId);
    if (!codeCheck.available) {
      throw new ConflictException(`Já existe um funcionário com o código "${createEmployeeDto.code}".`);
    }

    // Validate NIB uniqueness
    if (createEmployeeDto.nib) {
      const nibCheck = await this.checkNibAvailability(createEmployeeDto.nib, companyId);
      if (!nibCheck.available) {
        throw new ConflictException(`O NIB "${createEmployeeDto.nib}" já está registado em nome de "${nibCheck.usedBy}".`);
      }
    }

    const employee = repo.create({
      ...createEmployeeDto,
      id: `EMP-${createEmployeeDto.code}-${companyId}`
    });
    return await repo.save(employee);
  }

  async findAll(companyId?: string) {
    const targetId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getEmployeeRepo(targetId);
    return await repo.find({ where: { companyId: targetId }, order: { code: 'ASC' } });
  }

  async findOne(id: string, companyId?: string) {
    const repo = await this.getEmployeeRepo(companyId);
    const employee = await repo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException(`Funcionário com ID ${id} não encontrado.`);
    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const companyId = updateEmployeeDto.companyId || TenancyContext.getCompanyId();
    const repo = await this.getEmployeeRepo(companyId);
    const employee = await this.findOne(id, companyId);

    // Validate NIB uniqueness on update
    if (updateEmployeeDto.nib && updateEmployeeDto.nib !== employee.nib) {
      const nibCheck = await this.checkNibAvailability(updateEmployeeDto.nib, companyId || employee.companyId, id);
      if (!nibCheck.available) {
        throw new ConflictException(`O NIB "${updateEmployeeDto.nib}" já está registado em nome de "${nibCheck.usedBy}".`);
      }
    }

    repo.merge(employee, updateEmployeeDto);
    return await repo.save(employee);
  }

  async remove(id: string, companyId?: string) {
    const repo = await this.getEmployeeRepo(companyId);
    const employee = await this.findOne(id, companyId);
    return await repo.remove(employee);
  }

  // Absence Management

  async createAbsence(data: any) {
    const repo = await this.getAbsenceRepo(data.companyId);
    const id = `ABS-${Date.now()}-${data.companyId || '0'}`;
    const absence = repo.create({ ...data, id });
    return await repo.save(absence);
  }

  async findAllAbsences(companyId?: string, employeeId?: string) {
    const targetId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getAbsenceRepo(targetId);
    const where: any = { companyId: targetId };
    if (employeeId) where.employeeId = employeeId;
    return await repo.find({ where, order: { startDate: 'DESC' }, relations: ['employee'] });
  }

  async updateAbsenceStatus(id: string, status: AbsenceStatus) {
    const repo = await this.getAbsenceRepo();
    const absence = await repo.findOne({ where: { id } });
    if (!absence) throw new NotFoundException('Registo de ausência não encontrado.');
    absence.status = status;
    return await repo.save(absence);
  }

  // ── Photo & Document Management ─────────────────────────────────────────────

  async updatePhoto(id: string, photoUrl: string, companyId?: string) {
    const repo = await this.getEmployeeRepo(companyId);
    const employee = await this.findOne(id, companyId);
    employee.photoUrl = photoUrl;
    return await repo.save(employee);
  }

  async addDocument(id: string, doc: any, companyId?: string) {
    const repo = await this.getEmployeeRepo(companyId);
    const employee = await this.findOne(id, companyId);

    if (!employee.documents) employee.documents = [];

    const newDoc = {
      ...doc,
      id: `DOC-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      uploadedAt: new Date().toISOString()
    };

    employee.documents.push(newDoc);
    return await repo.save(employee);
  }

  async removeDocument(id: string, docId: string, companyId?: string) {
    const repo = await this.getEmployeeRepo(companyId);
    const employee = await this.findOne(id, companyId);

    if (!employee.documents) return employee;

    employee.documents = employee.documents.filter(d => d.id !== docId);
    return await repo.save(employee);
  }

  // ── Tax Tables & Settings ───────────────────────────────────────────────────

  async findAllTaxBrackets(companyId?: string) {
    const repo = await this.getTaxBracketRepo(companyId);
    return await repo.find({ where: { companyId: companyId || TenancyContext.getCompanyId() }, order: { minAmount: 'ASC' } });
  }

  async saveTaxBracket(data: any, companyId?: string) {
    const cid = companyId || data.companyId || TenancyContext.getCompanyId();
    const repo = await this.getTaxBracketRepo(cid);
    return await repo.save({ ...data, companyId: cid });
  }

  async deleteTaxBracket(id: string, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getTaxBracketRepo(cid);
    return await repo.delete({ id, companyId: cid });
  }

  async getSettings(companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getHRSettingsRepo(cid);
    let settings = await repo.findOne({ where: { companyId: cid } });
    if (!settings) {
      settings = repo.create({ companyId: cid, inssEmployeeRate: 3, inssEmployerRate: 4, currency: 'MT' });
      await repo.save(settings);
    }
    return settings;
  }

  async updateSettings(data: any, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getHRSettingsRepo(cid);
    return await repo.save({ ...data, companyId: cid });
  }

  async getNominalRelation(companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getEmployeeRepo(cid);
    return await repo.find({
      where: { isActive: true },
      order: { code: 'ASC' }
    });
  }

  async getSeniorityMap(companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getEmployeeRepo(cid);
    return await repo.find({
      where: { isActive: true },
      order: { hireDate: 'ASC' }
    });
  }

  async getVacationPlan(year: number, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getAbsenceRepo(cid);
    return await repo.find({
      where: {
        type: 'VACATION' as any,
        status: 'APPROVED' as any
      },
      relations: ['employee'],
      order: { startDate: 'ASC' }
    });
  }
}
