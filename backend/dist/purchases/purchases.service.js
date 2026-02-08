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
const period_control_service_1 = require("../periods/period-control.service");
const inventory_service_1 = require("../inventory/inventory.service");
let PurchasesService = class PurchasesService {
    tenancyService;
    periodControlService;
    defaultPurchaseRepo;
    workflowService;
    inventoryService;
    constructor(tenancyService, periodControlService, defaultPurchaseRepo, workflowService, inventoryService) {
        this.tenancyService = tenancyService;
        this.periodControlService = periodControlService;
        this.defaultPurchaseRepo = defaultPurchaseRepo;
        this.workflowService = workflowService;
        this.inventoryService = inventoryService;
    }
    async getRepo(entity, defaultRepo, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }
    async getPurchaseRepo(companyId) { return this.getRepo(purchase_entity_1.PurchaseDocument, this.defaultPurchaseRepo, companyId); }
    async create(createPurchaseDto) {
        await this.periodControlService.ensureDateInOpenPeriod(createPurchaseDto.date, createPurchaseDto.companyId);
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
        const savedDoc = await repo.save(purchase);
        if (savedDoc.status === 'APPROVED' || savedDoc.status === 'POSTED') {
            console.log(`[PurchasesService] Direct create trigger for ${savedDoc.type} ${savedDoc.series}/${savedDoc.number} (${savedDoc.status})`);
            const fullDoc = await this.findOne(savedDoc.id);
            await this.createStockMovementsForPurchases(fullDoc);
        }
        return savedDoc;
    }
    async findAll(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getPurchaseRepo(listCompanyId);
        return repo.find({ relations: ['lines'] });
    }
    async findOne(id) {
        const repo = await this.getPurchaseRepo();
        const doc = await repo.findOne({ where: { id }, relations: ['lines'] });
        if (!doc)
            throw new common_1.NotFoundException(`Purchase document ${id} not found`);
        return doc;
    }
    async update(id, updatePurchaseDto, user) {
        if (updatePurchaseDto.date) {
            await this.periodControlService.ensureDateInOpenPeriod(updatePurchaseDto.date, updatePurchaseDto.companyId);
        }
        const repo = await this.getPurchaseRepo();
        const document = await this.findOne(id);
        if (user) {
            this.workflowService.checkEditLock(document.status, user);
        }
        const oldStatus = document.status;
        repo.merge(document, updatePurchaseDto);
        const savedDoc = await repo.save(document);
        if ((savedDoc.status === 'APPROVED' || savedDoc.status === 'POSTED') && oldStatus !== savedDoc.status) {
            console.log(`[PurchasesService] Direct update trigger for ${savedDoc.type} ${savedDoc.series}/${savedDoc.number} (${savedDoc.status})`);
            const fullDoc = await this.findOne(savedDoc.id);
            await this.createStockMovementsForPurchases(fullDoc);
        }
        return savedDoc;
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
        const result = await this.workflowService.transition(document, action, user, repo, 'PURCHASES', notes);
        const updatedDoc = await this.findOne(id);
        if (updatedDoc.status === 'POSTED' || updatedDoc.status === 'APPROVED') {
            await this.createStockMovementsForPurchases(updatedDoc);
        }
        return result;
    }
    async createStockMovementsForPurchases(document) {
        const existing = await this.inventoryService.findAllStockMovements(document.companyId);
        const alreadyProcessed = existing.some(m => m.sourceDocument === document.id);
        if (alreadyProcessed) {
            console.log(`[PurchasesService] Stock movements for doc ${document.type} ${document.series}/${document.number} already exist. Skipping.`);
            return;
        }
        const type = document.type;
        const isIn = ['FC', 'GR', 'ND', 'FCOMP'].includes(type);
        const isOut = ['NC', 'DC'].includes(type);
        console.log(`[PurchasesService] Processing movements for ${document.type} ${document.series}/${document.number}. Type: ${type}, Lines: ${document.lines?.length || 0}`);
        if (!isIn && !isOut)
            return;
        if (!document.lines || document.lines.length === 0) {
            console.warn(`[PurchasesService] Document ${document.type} ${document.series}/${document.number} has NO lines to process movements.`);
            return;
        }
        for (const line of document.lines) {
            const movementDto = {
                date: document.date,
                articleId: line.articleId,
                companyId: document.companyId,
                articleCode: line.articleCode,
                articleName: line.articleName,
                movementType: isIn ? 'IN' : 'OUT',
                quantity: Number(line.quantity),
                unitCost: Number(line.unitPrice),
                totalCost: Number(line.totalValue),
                reference: `${document.type} ${document.series}/${document.number}`,
                sourceDocument: document.id,
                notes: `Gerado via ${type}`
            };
            await this.inventoryService.createStockMovement(movementDto);
        }
    }
    async getWorkflowHistory(id) {
        return this.workflowService.getHistory(id);
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(purchase_entity_1.PurchaseDocument)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        period_control_service_1.PeriodControlService,
        typeorm_2.Repository,
        workflow_service_1.WorkflowService,
        inventory_service_1.InventoryService])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map