"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HRController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const express = __importStar(require("express"));
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const hr_service_1 = require("../services/hr.service");
const payroll_service_1 = require("../services/payroll.service");
const create_employee_dto_1 = require("../dto/create-employee.dto");
const update_employee_dto_1 = require("../dto/update-employee.dto");
const absence_entity_1 = require("../entities/absence.entity");
const license_guard_1 = require("../../auth/guards/license.guard");
const UPLOADS_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'hr');
function ensureUploadsDir() {
    if (!(0, fs_1.existsSync)(UPLOADS_DIR))
        (0, fs_1.mkdirSync)(UPLOADS_DIR, { recursive: true });
}
function multerStorage(subfolder) {
    return (0, multer_1.diskStorage)({
        destination: (_req, _file, cb) => {
            const dir = (0, path_1.join)(UPLOADS_DIR, subfolder);
            if (!(0, fs_1.existsSync)(dir))
                (0, fs_1.mkdirSync)(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
            cb(null, `${unique}${(0, path_1.extname)(file.originalname)}`);
        },
    });
}
let HRController = class HRController {
    hrService;
    payrollService;
    constructor(hrService, payrollService) {
        this.hrService = hrService;
        this.payrollService = payrollService;
        ensureUploadsDir();
    }
    createEmployee(createEmployeeDto) {
        return this.hrService.create(createEmployeeDto);
    }
    findAllEmployees(companyId) {
        return this.hrService.findAll(companyId);
    }
    getNextCode(companyId) {
        return this.hrService.getNextCode(companyId);
    }
    checkCode(code, companyId, excludeId) {
        return this.hrService.checkCodeAvailability(code, companyId, excludeId);
    }
    checkNib(nib, companyId, excludeId) {
        return this.hrService.checkNibAvailability(nib, companyId, excludeId);
    }
    findOneEmployee(id, companyId) {
        return this.hrService.findOne(id, companyId);
    }
    updateEmployee(id, updateEmployeeDto) {
        return this.hrService.update(id, updateEmployeeDto);
    }
    getSalaryHistory(id, companyId) {
        return this.hrService.getSalaryHistory(id, companyId);
    }
    removeEmployee(id, companyId) {
        return this.hrService.remove(id, companyId);
    }
    uploadPhoto(id, companyId, file) {
        if (!file)
            throw new common_1.BadRequestException('Nenhum ficheiro enviado.');
        const url = `/hr/files/photos/${file.filename}`;
        return this.hrService.updatePhoto(id, url, companyId);
    }
    uploadDocument(id, companyId, docType, label, file) {
        if (!file)
            throw new common_1.BadRequestException('Nenhum ficheiro enviado.');
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
    removeDocument(id, docId, companyId) {
        return this.hrService.removeDocument(id, docId, companyId);
    }
    servePhoto(filename, res) {
        const filePath = (0, path_1.join)(UPLOADS_DIR, 'photos', filename);
        if (!(0, fs_1.existsSync)(filePath))
            throw new common_1.NotFoundException('Ficheiro não encontrado.');
        res.sendFile(filePath);
    }
    serveDocument(filename, res) {
        const filePath = (0, path_1.join)(UPLOADS_DIR, 'docs', filename);
        if (!(0, fs_1.existsSync)(filePath))
            throw new common_1.NotFoundException('Ficheiro não encontrado.');
        res.sendFile(filePath);
    }
    processMonthlyPayroll(payload, companyId) {
        return this.payrollService.processPayroll(payload.year, payload.month, companyId);
    }
    postPayrollToAccounting(payload, companyId) {
        return this.payrollService.postPayrollToAccounting(payload.year, payload.month, companyId);
    }
    findAllPayroll(companyId) {
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
    findAllTaxBrackets(companyId) {
        return this.hrService.findAllTaxBrackets(companyId);
    }
    saveTaxBracket(data, companyId) {
        return this.hrService.saveTaxBracket(data, companyId);
    }
    deleteTaxBracket(id, companyId) {
        return this.hrService.deleteTaxBracket(id, companyId);
    }
    getSettings(companyId) {
        return this.hrService.getSettings(companyId);
    }
    updateSettings(data, companyId) {
        return this.hrService.updateSettings(data, companyId);
    }
    getPayrollSheet(year, month, companyId) {
        return this.payrollService.getPayrollReportData(Number(year), Number(month), companyId);
    }
    getNominalRelation(companyId) {
        return this.hrService.getNominalRelation(companyId);
    }
    getSeniorityMap(companyId) {
        return this.hrService.getSeniorityMap(companyId);
    }
    getVacationPlan(year, companyId) {
        return this.hrService.getVacationPlan(Number(year), companyId);
    }
};
exports.HRController = HRController;
__decorate([
    (0, common_1.Post)('employees'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new employee' }),
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
    (0, common_1.Get)('employees/next-code'),
    (0, swagger_1.ApiOperation)({ summary: 'Get next available employee code' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "getNextCode", null);
__decorate([
    (0, common_1.Get)('employees/check-code'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if employee code is available' }),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, common_1.Query)('excludeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "checkCode", null);
__decorate([
    (0, common_1.Get)('employees/check-nib'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if NIB is already registered' }),
    __param(0, (0, common_1.Query)('nib')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, common_1.Query)('excludeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "checkNib", null);
__decorate([
    (0, common_1.Get)('employees/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an employee by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
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
    (0, common_1.Get)('employees/:id/salary-history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get salary history for an employee' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "getSalaryHistory", null);
__decorate([
    (0, common_1.Delete)('employees/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an employee' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "removeEmployee", null);
__decorate([
    (0, common_1.Post)('employees/:id/photo'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload employee profile photo' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', {
        storage: multerStorage('photos'),
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new common_1.BadRequestException('Apenas imagens são permitidas (JPG, PNG, etc.)'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Post)('employees/:id/documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload employee document (BI, contract, etc.)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: multerStorage('docs'),
        fileFilter: (_req, file, cb) => {
            const allowed = [
                'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];
            if (!allowed.includes(file.mimetype)) {
                return cb(new common_1.BadRequestException('Tipo de ficheiro não suportado. Use PDF, imagem ou Word.'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 20 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('label')),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Delete)('employees/:id/documents/:docId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove an employee document' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('docId')),
    __param(2, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "removeDocument", null);
__decorate([
    (0, common_1.Get)('files/photos/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve employee photo' }),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "servePhoto", null);
__decorate([
    (0, common_1.Get)('files/docs/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve employee document' }),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "serveDocument", null);
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
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
__decorate([
    (0, common_1.Get)('tax-brackets'),
    (0, swagger_1.ApiOperation)({ summary: 'List all tax brackets' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "findAllTaxBrackets", null);
__decorate([
    (0, common_1.Post)('tax-brackets'),
    (0, swagger_1.ApiOperation)({ summary: 'Save/Update a tax bracket' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "saveTaxBracket", null);
__decorate([
    (0, common_1.Delete)('tax-brackets/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a tax bracket' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "deleteTaxBracket", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get HR settings' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update HR settings' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('reports/payroll-sheet'),
    (0, swagger_1.ApiOperation)({ summary: 'Get payroll sheet data' }),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "getPayrollSheet", null);
__decorate([
    (0, common_1.Get)('reports/nominal-relation'),
    (0, swagger_1.ApiOperation)({ summary: 'Get nominal relation data' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "getNominalRelation", null);
__decorate([
    (0, common_1.Get)('reports/seniority'),
    (0, swagger_1.ApiOperation)({ summary: 'Get seniority map data' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "getSeniorityMap", null);
__decorate([
    (0, common_1.Get)('reports/vacation-plan'),
    (0, swagger_1.ApiOperation)({ summary: 'Get vacation plan data' }),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], HRController.prototype, "getVacationPlan", null);
exports.HRController = HRController = __decorate([
    (0, swagger_1.ApiTags)('hr'),
    (0, common_1.Controller)('hr'),
    (0, common_1.UseGuards)(license_guard_1.LicenseGuard),
    __metadata("design:paramtypes", [hr_service_1.HRService,
        payroll_service_1.PayrollService])
], HRController);
//# sourceMappingURL=hr.controller.js.map