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
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sales_service_1 = require("./sales.service");
const create_sales_document_dto_1 = require("./dto/create-sales-document.dto");
const update_sales_document_dto_1 = require("./dto/update-sales-document.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const license_guard_1 = require("../auth/guards/license.guard");
let SalesController = class SalesController {
    salesService;
    constructor(salesService) {
        this.salesService = salesService;
    }
    create(createSalesDocumentDto) {
        return this.salesService.create(createSalesDocumentDto);
    }
    findAll(companyId, documentType, series) {
        return this.salesService.findAll(companyId);
    }
    findByNumber(companyId, type, series, number) {
        return this.salesService.findByNumber(companyId, type, series, Number(number));
    }
    findOne(id) {
        return this.salesService.findOne(id);
    }
    update(id, updateSalesDocumentDto) {
        return this.salesService.update(id, updateSalesDocumentDto);
    }
    remove(id) {
        return this.salesService.remove(id);
    }
    processWorkflow(id, data, req) {
        return this.salesService.processWorkflow(id, data.action, req.user, data.notes);
    }
    getHistory(id) {
        return this.salesService.getWorkflowHistory(id);
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Post)('documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new sales document' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The sales document has been successfully created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_sales_document_dto_1.CreateSalesDocumentDto]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all sales documents' }),
    __param(0, (0, common_1.Query)('companyId')),
    __param(1, (0, common_1.Query)('documentType')),
    __param(2, (0, common_1.Query)('series')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('documents/find'),
    (0, swagger_1.ApiOperation)({ summary: 'Find a sales document by number' }),
    __param(0, (0, common_1.Query)('companyId')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('series')),
    __param(3, (0, common_1.Query)('number')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findByNumber", null);
__decorate([
    (0, common_1.Get)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a sales document by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a sales document' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_sales_document_dto_1.UpdateSalesDocumentDto]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a sales document' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)('documents/:id/workflow'),
    (0, swagger_1.ApiOperation)({ summary: 'Process document workflow transition' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "processWorkflow", null);
__decorate([
    (0, common_1.Get)('documents/:id/history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get document workflow history' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "getHistory", null);
exports.SalesController = SalesController = __decorate([
    (0, swagger_1.ApiTags)('sales'),
    (0, common_1.Controller)('sales'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, license_guard_1.LicenseGuard),
    __metadata("design:paramtypes", [sales_service_1.SalesService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map