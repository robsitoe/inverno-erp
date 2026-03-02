import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Absence, AbsenceStatus } from '../entities/absence.entity';
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
  ) {}

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

  async create(createEmployeeDto: CreateEmployeeDto) {
    const repo = await this.getEmployeeRepo(createEmployeeDto.companyId);
    const employee = repo.create({
      ...createEmployeeDto,
      id: `EMP-${createEmployeeDto.code}-${TenancyContext.getCompanyId() || '0'}`
    });
    return await repo.save(employee);
  }

  async findAll(companyId?: string) {
    const targetId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getEmployeeRepo(targetId);
    return await repo.find({ where: { companyId: targetId }, order: { code: 'ASC' } });
  }

  async findOne(id: string) {
    const repo = await this.getEmployeeRepo();
    const employee = await repo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException(`Employee with ID ${id} not found`);
    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const repo = await this.getEmployeeRepo();
    const employee = await this.findOne(id);
    repo.merge(employee, updateEmployeeDto);
    return await repo.save(employee);
  }

  async remove(id: string) {
    const repo = await this.getEmployeeRepo();
    const employee = await this.findOne(id);
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
    if (!absence) throw new NotFoundException('Absence record not found');
    absence.status = status;
    return await repo.save(absence);
  }
}
