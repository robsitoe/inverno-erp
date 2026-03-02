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
exports.HRController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const hr_service_1 = require("../services/hr.service");
const payroll_service_1 = require("../services/payroll.service");
const create_employee_dto_1 = require("../dto/create-employee.dto");
const update_employee_dto_1 = require("../dto/update-employee.dto");
const absence_entity_1 = require("../entities/absence.entity");
const license_guard_1 = require("../../auth/guards/license.guard");
let HRController = class HRController {
    hrService;
    payrollService;
    constructor(hrService, payrollService) {
        this.hrService = hrService;
        this.payrollService = payrollService;
    }
    createEmployee(createEmployeeDto) {
        return this.hrService.create(createEmployeeDto);
    }
    findAllEmployees(companyId) {
        return this.hrService.findAll(companyId);
    }
    findOneEmployee(id) {
        return this.hrService.findOne(id);
    }
    updateEmployee(id, updateEmployeeDto) {
        return this.hrService.update(id, updateEmployeeDto);
    }
    removeEmployee(id) {
        return this.hrService.remove(id);
    }
    processMonthlyPayroll(payload, companyId) {
        return this.payrollService.processPayroll(payload.year, payload.month, companyId);
    }
    postPayrollToAccounting(payload, companyId) {
        return this.payrollService.postPayrollToAccounting(payload.year, payload.month, companyId);
    }
    findAllPayroll(companyId, year, month) {
        return [];
    }
    createAbsence(data) {
        return this.hrService.createAbsence(data);
    }
    findAllAbsences(companyId, employeeId) {
        return this.hrService.findAllAbsences(companyId, employeeId);
    }
    updateAbsenceStatus(id, status) {
        return this.hrService.updateAbsenceStatus(id, status);
    }
};
exports.HRController = HRController;
__decorate([
    (0, common_1.Post)('employees'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new employee' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The employee has been successfully created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_dto_1.CreateEmployeeDto]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Get)('employees'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all employees' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "findAllEmployees", null);
__decorate([
    (0, common_1.Get)('employees/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an employee by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "findOneEmployee", null);
__decorate([
    (0, common_1.Patch)('employees/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an employee' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_employee_dto_1.UpdateEmployeeDto]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Delete)('employees/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an employee' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "removeEmployee", null);
__decorate([
    (0, common_1.Post)('payroll/process'),
    (0, swagger_1.ApiOperation)({ summary: 'Process payroll for a specific month' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "processMonthlyPayroll", null);
__decorate([
    (0, common_1.Post)('payroll/post-to-accounting'),
    (0, swagger_1.ApiOperation)({ summary: 'Post processed payroll to accounting module' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "postPayrollToAccounting", null);
__decorate([
    (0, common_1.Get)('payroll'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all payroll records' }),
    __param(0, (0, common_1.Query)('companyId')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "findAllPayroll", null);
__decorate([
    (0, common_1.Post)('absences'),
    (0, swagger_1.ApiOperation)({ summary: 'Request an absence/vacation' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "createAbsence", null);
__decorate([
    (0, common_1.Get)('absences'),
    (0, swagger_1.ApiOperation)({ summary: 'List absences' }),
    __param(0, (0, common_1.Query)('companyId')),
    __param(1, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "findAllAbsences", null);
__decorate([
    (0, common_1.Patch)('absences/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update absence status' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "updateAbsenceStatus", null);
exports.HRController = HRController = __decorate([
    (0, swagger_1.ApiTags)('hr'),
    (0, common_1.Controller)('hr'),
    (0, common_1.UseGuards)(license_guard_1.LicenseGuard),
    __metadata("design:paramtypes", [hr_service_1.HRService,
        payroll_service_1.PayrollService])
], HRController);
//# sourceMappingURL=hr.controller.js.map