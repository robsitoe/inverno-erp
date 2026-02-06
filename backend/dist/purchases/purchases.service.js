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
exports.PurchasesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const purchase_entity_1 = require("./entities/purchase.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
const workflow_service_1 = require("../common/workflow.service");
let PurchasesService = class PurchasesService {
    tenancyService;
    defaultPurchaseRepo;
    workflowService;
    constructor(tenancyService, defaultPurchaseRepo, workflowService) {
        this.tenancyService = tenancyService;
        this.defaultPurchaseRepo = defaultPurchaseRepo;
        this.workflowService = workflowService;
    }
    async getRepo(entity, defaultRepo) {
        const companyId = tenancy_context_1.TenancyContext.getCompanyId();
        if (!companyId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(companyId);
        return ds.getRepository(entity);
    }
    async getPurchaseRepo() { return this.getRepo(purchase_entity_1.PurchaseDocument, this.defaultPurchaseRepo); }
    async create(createPurchaseDto) {
        const { lines, ...documentData } = createPurchaseDto;
        const repo = await this.getPurchaseRepo();
        const entityData = {
            ...documentData,
            type: documentData.documentType,
            number: documentData.seriesNumber,
            merchandiseTotal: documentData.subtotal || 0,
            discountValue: documentData.discounts || 0,
            taxTotal: documentData.totalIva || 0,
            totalValue: documentData.total || 0,
            lines: lines.map(line => ({
                ...line,
                id: line.id || `LINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                totalLiquid: line.subtotal || (line.quantity * line.unitPrice),
                totalValue: line.total || (line.quantity * line.unitPrice * (1 + (line.ivaRate || 0) / 100)),
                taxRate: line.ivaRate || 0,
                taxCode: line.ivaCode || 'IVA'
            }))
        };
        delete entityData.documentType;
        delete entityData.seriesNumber;
        delete entityData.subtotal;
        delete entityData.discounts;
        delete entityData.totalIva;
        delete entityData.total;
        if (!entityData.id) {
            entityData.id = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            if (!entityData.number) {
                const lastDoc = await repo.findOne({
                    where: {
                        type: entityData.type,
                        series: entityData.series,
                        companyId: entityData.companyId
                    },
                    order: { number: 'DESC' },
                });
                entityData.number = (lastDoc?.number || 0) + 1;
            }
            if (!entityData.documentNumber || entityData.documentNumber.includes('undefined')) {
                entityData.documentNumber = `${entityData.type} ${entityData.series}/${entityData.number}`;
            }
        }
        const purchase = repo.create(entityData);
        return repo.save(purchase);
    }
    async findAll(companyId) {
        const repo = await this.getPurchaseRepo();
        const where = {};
        if (companyId) {
            where.companyId = companyId;
        }
        return repo.find({ where, relations: ['lines'] });
    }
    async findOne(id) {
        const repo = await this.getPurchaseRepo();
        const doc = await repo.findOne({ where: { id }, relations: ['lines'] });
        if (!doc)
            throw new common_1.NotFoundException(`Purchase document ${id} not found`);
        return doc;
    }
    async update(id, updatePurchaseDto, user) {
        const repo = await this.getPurchaseRepo();
        const document = await this.findOne(id);
        if (user) {
            this.workflowService.checkEditLock(document.status, user);
        }
        repo.merge(document, updatePurchaseDto);
        return repo.save(document);
    }
    async findByNumber(companyId, type, series, number) {
        const repo = await this.getPurchaseRepo();
        return repo.findOne({
            where: {
                companyId,
                type,
                series,
                number
            },
            relations: ['lines']
        });
    }
    async remove(id, user) {
        const repo = await this.getPurchaseRepo();
        const document = await this.findOne(id);
        if (user) {
            this.workflowService.checkEditLock(document.status, user);
        }
        return repo.remove(document);
    }
    async processWorkflow(id, action, user, notes) {
        const document = await this.findOne(id);
        const repo = await this.getPurchaseRepo();
        return this.workflowService.transition(document, action, user, repo, 'PURCHASES', notes);
    }
    async getWorkflowHistory(id) {
        return this.workflowService.getHistory(id);
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(purchase_entity_1.PurchaseDocument)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        typeorm_2.Repository,
        workflow_service_1.WorkflowService])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map