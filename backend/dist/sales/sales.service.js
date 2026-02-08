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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sales_document_entity_1 = require("./entities/sales-document.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
const workflow_service_1 = require("../common/workflow.service");
const period_control_service_1 = require("../periods/period-control.service");
const inventory_service_1 = require("../inventory/inventory.service");
let SalesService = class SalesService {
    tenancyService;
    periodControlService;
    defaultSalesDocumentRepo;
    defaultSalesLineRepo;
    workflowService;
    inventoryService;
    constructor(tenancyService, periodControlService, defaultSalesDocumentRepo, defaultSalesLineRepo, workflowService, inventoryService) {
        this.tenancyService = tenancyService;
        this.periodControlService = periodControlService;
        this.defaultSalesDocumentRepo = defaultSalesDocumentRepo;
        this.defaultSalesLineRepo = defaultSalesLineRepo;
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
    async getSalesDocRepo(companyId) { return this.getRepo(sales_document_entity_1.SalesDocument, this.defaultSalesDocumentRepo, companyId); }
    async getSalesLineRepo(companyId) { return this.getRepo(sales_document_entity_1.SalesDocumentLine, this.defaultSalesLineRepo, companyId); }
    async create(createSalesDocumentDto) {
        await this.periodControlService.ensureDateInOpenPeriod(createSalesDocumentDto.date, createSalesDocumentDto.companyId);
        const { lines, ...documentData } = createSalesDocumentDto;
        const companyId = documentData.companyId;
        const sdRepo = await this.getSalesDocRepo(companyId);
        const slRepo = await this.getSalesLineRepo(companyId);
        let subtotal = 0;
        let totalIva = 0;
        let discounts = 0;
        const documentLines = lines.map(line => {
            const quantity = Number(line.quantity);
            const unitPrice = Number(line.unitPrice);
            const discount = Number(line.discount || 0);
            const ivaRate = Number(line.ivaRate || 0);
            const grossAmount = quantity * unitPrice;
            const discountAmount = grossAmount * (discount / 100);
            const netAmount = grossAmount - discountAmount;
            const ivaAmount = netAmount * (ivaRate / 100);
            const total = netAmount + ivaAmount;
            subtotal += netAmount;
            totalIva += ivaAmount;
            discounts += discountAmount;
            return slRepo.create({
                ...line,
                total,
            });
        });
        const total = subtotal + totalIva;
        let seriesNumber = documentData.seriesNumber;
        let documentNumber = documentData.documentNumber;
        if (!documentData.id) {
            if (!seriesNumber) {
                const lastDoc = await sdRepo.findOne({
                    where: {
                        documentType: documentData.documentType,
                        series: documentData.series,
                        companyId: documentData.companyId
                    },
                    order: { seriesNumber: 'DESC' },
                });
                seriesNumber = (lastDoc?.seriesNumber || 0) + 1;
            }
            if (!documentNumber || documentNumber.includes('undefined')) {
                documentNumber = `${documentData.documentType} ${documentData.series}/${seriesNumber}`;
            }
        }
        const document = sdRepo.create({
            ...documentData,
            documentNumber,
            seriesNumber,
            subtotal,
            totalIva,
            discounts,
            total,
            lines: documentLines,
        });
        const savedDoc = await sdRepo.save(document);
        if (savedDoc.status === 'APPROVED' || savedDoc.status === 'POSTED') {
            console.log(`[SalesService] Direct create trigger for ${savedDoc.documentNumber} (${savedDoc.status})`);
            const fullDoc = await this.findOne(savedDoc.id);
            await this.createStockMovementsForSales(fullDoc);
        }
        return savedDoc;
    }
    async findAll(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const sdRepo = await this.getSalesDocRepo(listCompanyId);
        return sdRepo.find({
            order: { date: 'DESC', createdAt: 'DESC' },
            relations: ['lines']
        });
    }
    async findOne(id) {
        const sdRepo = await this.getSalesDocRepo();
        const document = await sdRepo.findOne({
            where: { id },
            relations: ['lines']
        });
        if (!document) {
            throw new common_1.NotFoundException(`Sales Document with ID ${id} not found`);
        }
        return document;
    }
    async update(id, updateSalesDocumentDto, user) {
        if (updateSalesDocumentDto.date) {
            await this.periodControlService.ensureDateInOpenPeriod(updateSalesDocumentDto.date, updateSalesDocumentDto.companyId);
        }
        const sdRepo = await this.getSalesDocRepo();
        const document = await this.findOne(id);
        if (user) {
            this.workflowService.checkEditLock(document.status, user);
        }
        const oldStatus = document.status;
        sdRepo.merge(document, updateSalesDocumentDto);
        const savedDoc = await sdRepo.save(document);
        if ((savedDoc.status === 'APPROVED' || savedDoc.status === 'POSTED') && oldStatus !== savedDoc.status) {
            console.log(`[SalesService] Direct update trigger for ${savedDoc.documentNumber} (${savedDoc.status})`);
            const fullDoc = await this.findOne(savedDoc.id);
            await this.createStockMovementsForSales(fullDoc);
        }
        return savedDoc;
    }
    async findByNumber(companyId, type, series, number) {
        const sdRepo = await this.getSalesDocRepo();
        const document = await sdRepo.findOne({
            where: {
                companyId,
                documentType: type,
                series,
                seriesNumber: number
            },
            relations: ['lines']
        });
        return document;
    }
    async remove(id, user) {
        const sdRepo = await this.getSalesDocRepo();
        const document = await this.findOne(id);
        if (user) {
            this.workflowService.checkEditLock(document.status, user);
        }
        return sdRepo.remove(document);
    }
    async processWorkflow(id, action, user, notes) {
        const document = await this.findOne(id);
        const sdRepo = await this.getSalesDocRepo();
        const result = await this.workflowService.transition(document, action, user, sdRepo, 'SALES', notes);
        const updatedDoc = await this.findOne(id);
        if (updatedDoc.status === 'POSTED' || updatedDoc.status === 'APPROVED') {
            await this.createStockMovementsForSales(updatedDoc);
        }
        return result;
    }
    async createStockMovementsForSales(document) {
        const existing = await this.inventoryService.findAllStockMovements(document.companyId);
        const alreadyProcessed = existing.some(m => m.sourceDocument === document.id);
        if (alreadyProcessed) {
            console.log(`[SalesService] Stock movements for doc ${document.documentNumber} already exist. Skipping.`);
            return;
        }
        const type = document.documentType;
        const isOut = ['FA', 'FR', 'VD', 'FS', 'GT'].includes(type);
        const isIn = ['NC', 'DC'].includes(type);
        console.log(`[SalesService] Processing movements for ${document.documentNumber}. Type: ${type}, Lines: ${document.lines?.length || 0}`);
        if (!isOut && !isIn)
            return;
        if (!document.lines || document.lines.length === 0) {
            console.warn(`[SalesService] Document ${document.documentNumber} has NO lines to process movements.`);
            return;
        }
        for (const line of document.lines) {
            const quantity = Number(line.quantity);
            const unitPrice = Number(line.unitPrice || 0);
            const movementDto = {
                date: document.date,
                articleId: line.articleId,
                companyId: document.companyId,
                articleCode: line.articleCode,
                articleName: line.articleName,
                movementType: isOut ? 'OUT' : 'IN',
                quantity: quantity,
                unitCost: unitPrice,
                totalCost: quantity * unitPrice,
                reference: document.documentNumber,
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
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(sales_document_entity_1.SalesDocument)),
    __param(3, (0, typeorm_1.InjectRepository)(sales_document_entity_1.SalesDocumentLine)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        period_control_service_1.PeriodControlService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        workflow_service_1.WorkflowService,
        inventory_service_1.InventoryService])
], SalesService);
//# sourceMappingURL=sales.service.js.map