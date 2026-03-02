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
const tenancy_service_1 = require("../../tenancy/tenancy.service");
const tenancy_context_1 = require("../../tenancy/tenancy.context");
let HRService = class HRService {
    tenancyService;
    defaultEmployeeRepo;
    defaultAbsenceRepo;
    constructor(tenancyService, defaultEmployeeRepo, defaultAbsenceRepo) {
        this.tenancyService = tenancyService;
        this.defaultEmployeeRepo = defaultEmployeeRepo;
        this.defaultAbsenceRepo = defaultAbsenceRepo;
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
    async create(createEmployeeDto) {
        const repo = await this.getEmployeeRepo(createEmployeeDto.companyId);
        const employee = repo.create({
            ...createEmployeeDto,
            id: `EMP-${createEmployeeDto.code}-${tenancy_context_1.TenancyContext.getCompanyId() || '0'}`
        });
        return await repo.save(employee);
    }
    async findAll(companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getEmployeeRepo(targetId);
        return await repo.find({ where: { companyId: targetId }, order: { code: 'ASC' } });
    }
    async findOne(id) {
        const repo = await this.getEmployeeRepo();
        const employee = await repo.findOne({ where: { id } });
        if (!employee)
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        return employee;
    }
    async update(id, updateEmployeeDto) {
        const repo = await this.getEmployeeRepo();
        const employee = await this.findOne(id);
        repo.merge(employee, updateEmployeeDto);
        return await repo.save(employee);
    }
    async remove(id) {
        const repo = await this.getEmployeeRepo();
        const employee = await this.findOne(id);
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
            throw new common_1.NotFoundException('Absence record not found');
        absence.status = status;
        return await repo.save(absence);
    }
};
exports.HRService = HRService;
exports.HRService = HRService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(2, (0, typeorm_1.InjectRepository)(absence_entity_1.Absence)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], HRService);
//# sourceMappingURL=hr.service.js.map