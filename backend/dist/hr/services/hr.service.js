"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HRService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const employee_entity_1 = require("../entities/employee.entity");
const absence_entity_1 = require("../entities/absence.entity");
const salary_history_entity_1 = require("../entities/salary-history.entity");
const hr_settings_entity_1 = require("../entities/hr-settings.entity");
const tenancy_service_1 = require("../../tenancy/tenancy.service");
const tenancy_context_1 = require("../../tenancy/tenancy.context");
let HRService = class HRService {
    tenancyService;
    defaultEmployeeRepo;
    defaultAbsenceRepo;
    defaultTaxBracketRepo;
    defaultHRSettingsRepo;
    defaultSalaryHistoryRepo;
    constructor(tenancyService, defaultEmployeeRepo, defaultAbsenceRepo, defaultTaxBracketRepo, defaultHRSettingsRepo, defaultSalaryHistoryRepo) {
        this.tenancyService = tenancyService;
        this.defaultEmployeeRepo = defaultEmployeeRepo;
        this.defaultAbsenceRepo = defaultAbsenceRepo;
        this.defaultTaxBracketRepo = defaultTaxBracketRepo;
        this.defaultHRSettingsRepo = defaultHRSettingsRepo;
        this.defaultSalaryHistoryRepo = defaultSalaryHistoryRepo;
    }
    async getRepo(entity, defaultRepo, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }
    async getEmployeeRepo(companyId) {
        return this.getRepo(employee_entity_1.Employee, this.defaultEmployeeRepo, companyId);
    }
    async getAbsenceRepo(companyId) {
        return this.getRepo(absence_entity_1.Absence, this.defaultAbsenceRepo, companyId);
    }
    async getTaxBracketRepo(companyId) {
        return this.getRepo(hr_settings_entity_1.TaxBracket, this.defaultTaxBracketRepo, companyId);
    }
    async getHRSettingsRepo(companyId) {
        return this.getRepo(hr_settings_entity_1.HRSettings, this.defaultHRSettingsRepo, companyId);
    }
    async getSalaryHistoryRepo(companyId) {
        return this.getRepo(salary_history_entity_1.EmployeeSalaryHistory, this.defaultSalaryHistoryRepo, companyId);
    }
    async getNextCode(companyId) {
        const repo = await this.getEmployeeRepo(companyId);
        const all = await repo.find({ where: { companyId }, order: { code: 'DESC' }, take: 1 });
        if (all.length === 0)
            return { code: '001' };
        const last = parseInt(all[0].code, 10);
        const next = isNaN(last) ? 1 : last + 1;
        return { code: String(next).padStart(3, '0') };
    }
    async checkCodeAvailability(code, companyId, excludeId) {
        const repo = await this.getEmployeeRepo(companyId);
        const where = { companyId, code };
        if (excludeId)
            where.id = (0, typeorm_2.Not)(excludeId);
        const existing = await repo.findOne({ where });
        return { available: !existing };
    }
    async checkNibAvailability(nib, companyId, excludeId) {
        if (!nib || nib.trim() === '')
            return { available: true };
        const repo = await this.getEmployeeRepo(companyId);
        const where = { companyId, nib: nib.trim() };
        if (excludeId)
            where.id = (0, typeorm_2.Not)(excludeId);
        const existing = await repo.findOne({ where });
        if (!existing)
            return { available: true };
        return { available: false, usedBy: existing.name };
    }
    async create(createEmployeeDto) {
        const companyId = createEmployeeDto.companyId || tenancy_context_1.TenancyContext.getCompanyId() || '0';
        const repo = await this.getEmployeeRepo(companyId);
        const codeCheck = await this.checkCodeAvailability(createEmployeeDto.code, companyId);
        if (!codeCheck.available) {
            throw new common_1.ConflictException(`Já existe um funcionário com o código "${createEmployeeDto.code}".`);
        }
        if (createEmployeeDto.nib) {
            const nibCheck = await this.checkNibAvailability(createEmployeeDto.nib, companyId);
            if (!nibCheck.available) {
                throw new common_1.ConflictException(`O NIB "${createEmployeeDto.nib}" já está registado em nome de "${nibCheck.usedBy}".`);
            }
        }
        const employee = repo.create({
            ...createEmployeeDto,
            id: `EMP-${createEmployeeDto.code}-${companyId}`
        });
        return await repo.save(employee);
    }
    async findAll(companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getEmployeeRepo(targetId);
        return await repo.find({ where: { companyId: targetId }, order: { code: 'ASC' } });
    }
    async findOne(id, companyId) {
        const repo = await this.getEmployeeRepo(companyId);
        const employee = await repo.findOne({ where: { id } });
        if (!employee)
            throw new common_1.NotFoundException(`Funcionário com ID ${id} não encontrado.`);
        return employee;
    }
    async update(id, updateEmployeeDto, user) {
        const companyId = updateEmployeeDto.companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getEmployeeRepo(companyId);
        const employee = await this.findOne(id, companyId);
        const hasFinancialChanges = (updateEmployeeDto.salaryBase !== undefined && Number(updateEmployeeDto.salaryBase) !== Number(employee.salaryBase)) ||
            (updateEmployeeDto.subsidyTransport !== undefined && Number(updateEmployeeDto.subsidyTransport) !== Number(employee.subsidyTransport)) ||
            (updateEmployeeDto.subsidyFood !== undefined && Number(updateEmployeeDto.subsidyFood) !== Number(employee.subsidyFood)) ||
            (updateEmployeeDto.dependents !== undefined && Number(updateEmployeeDto.dependents) !== Number(employee.dependents));
        if (hasFinancialChanges) {
            const historyRepo = await this.getSalaryHistoryRepo(companyId);
            const historyId = `SH-${Date.now()}-${id}`;
            await historyRepo.save({
                id: historyId,
                employeeId: id,
                companyId,
                changeDate: new Date().toISOString().split('T')[0],
                oldSalary: employee.salaryBase,
                newSalary: updateEmployeeDto.salaryBase ?? employee.salaryBase,
                oldTransport: employee.subsidyTransport,
                newTransport: updateEmployeeDto.subsidyTransport ?? employee.subsidyTransport,
                oldFood: employee.subsidyFood,
                newFood: updateEmployeeDto.subsidyFood ?? employee.subsidyFood,
                oldDependents: employee.dependents,
                newDependents: updateEmployeeDto.dependents ?? employee.dependents,
                reason: updateEmployeeDto.changeReason || 'Alteração administrativa',
                updatedBy: user?.name || user?.username || 'Sistema'
            });
        }
        if (updateEmployeeDto.nib && updateEmployeeDto.nib !== employee.nib) {
            const nibCheck = await this.checkNibAvailability(updateEmployeeDto.nib, companyId || employee.companyId, id);
            if (!nibCheck.available) {
                throw new common_1.ConflictException(`O NIB "${updateEmployeeDto.nib}" já está registado em nome de "${nibCheck.usedBy}".`);
            }
        }
        repo.merge(employee, updateEmployeeDto);
        return await repo.save(employee);
    }
    async getSalaryHistory(employeeId, companyId) {
        const repo = await this.getSalaryHistoryRepo(companyId);
        return await repo.find({
            where: { employeeId, companyId: companyId || tenancy_context_1.TenancyContext.getCompanyId() },
            order: { changeDate: 'DESC', createdAt: 'DESC' }
        });
    }
    async remove(id, companyId) {
        const repo = await this.getEmployeeRepo(companyId);
        const employee = await this.findOne(id, companyId);
        return await repo.remove(employee);
    }
    async createAbsence(data) {
        const repo = await this.getAbsenceRepo(data.companyId);
        const id = `ABS-${Date.now()}-${data.companyId || '0'}`;
        const absence = repo.create({ ...data, id });
        return await repo.save(absence);
    }
    async findAllAbsences(companyId, employeeId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getAbsenceRepo(targetId);
        const where = { companyId: targetId };
        if (employeeId)
            where.employeeId = employeeId;
        return await repo.find({ where, order: { startDate: 'DESC' }, relations: ['employee'] });
    }
    async updateAbsenceStatus(id, status) {
        const repo = await this.getAbsenceRepo();
        const absence = await repo.findOne({ where: { id } });
        if (!absence)
            throw new common_1.NotFoundException('Registo de ausência não encontrado.');
        absence.status = status;
        return await repo.save(absence);
    }
    async updatePhoto(id, photoUrl, companyId) {
        const repo = await this.getEmployeeRepo(companyId);
        const employee = await this.findOne(id, companyId);
        employee.photoUrl = photoUrl;
        return await repo.save(employee);
    }
    async addDocument(id, doc, companyId) {
        const repo = await this.getEmployeeRepo(companyId);
        const employee = await this.findOne(id, companyId);
        if (!employee.documents)
            employee.documents = [];
        const newDoc = {
            ...doc,
            id: `DOC-${Date.now()}-${Math.round(Math.random() * 1000)}`,
            uploadedAt: new Date().toISOString()
        };
        employee.documents.push(newDoc);
        return await repo.save(employee);
    }
    async removeDocument(id, docId, companyId) {
        const repo = await this.getEmployeeRepo(companyId);
        const employee = await this.findOne(id, companyId);
        if (!employee.documents)
            return employee;
        employee.documents = employee.documents.filter(d => d.id !== docId);
        return await repo.save(employee);
    }
    async findAllTaxBrackets(companyId) {
        const repo = await this.getTaxBracketRepo(companyId);
        return await repo.find({ where: { companyId: companyId || tenancy_context_1.TenancyContext.getCompanyId() }, order: { minAmount: 'ASC' } });
    }
    async saveTaxBracket(data, companyId) {
        const cid = companyId || data.companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getTaxBracketRepo(cid);
        return await repo.save({ ...data, companyId: cid });
    }
    async deleteTaxBracket(id, companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getTaxBracketRepo(cid);
        return await repo.delete({ id, companyId: cid });
    }
    async getSettings(companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getHRSettingsRepo(cid);
        let settings = await repo.findOne({ where: { companyId: cid } });
        if (!settings) {
            settings = repo.create({ companyId: cid, inssEmployeeRate: 3, inssEmployerRate: 4, currency: 'MT' });
            await repo.save(settings);
        }
        return settings;
    }
    async updateSettings(data, companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getHRSettingsRepo(cid);
        return await repo.save({ ...data, companyId: cid });
    }
    async getNominalRelation(companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getEmployeeRepo(cid);
        return await repo.find({
            where: { isActive: true },
            order: { code: 'ASC' }
        });
    }
    async getSeniorityMap(companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getEmployeeRepo(cid);
        return await repo.find({
            where: { isActive: true },
            order: { hireDate: 'ASC' }
        });
    }
    async getVacationPlan(year, companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getAbsenceRepo(cid);
        return await repo.find({
            where: {
                type: 'VACATION',
                status: 'APPROVED'
            },
            relations: ['employee'],
            order: { startDate: 'ASC' }
        });
    }
};
exports.HRService = HRService;
exports.HRService = HRService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(2, (0, typeorm_1.InjectRepository)(absence_entity_1.Absence)),
    __param(3, (0, typeorm_1.InjectRepository)(hr_settings_entity_1.TaxBracket)),
    __param(4, (0, typeorm_1.InjectRepository)(hr_settings_entity_1.HRSettings)),
    __param(5, (0, typeorm_1.InjectRepository)(salary_history_entity_1.EmployeeSalaryHistory)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], HRService);
//# sourceMappingURL=hr.service.js.map