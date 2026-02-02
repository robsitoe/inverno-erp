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
let SalesService = class SalesService {
    tenancyService;
    defaultSalesDocumentRepo;
    defaultSalesLineRepo;
    constructor(tenancyService, defaultSalesDocumentRepo, defaultSalesLineRepo) {
        this.tenancyService = tenancyService;
        this.defaultSalesDocumentRepo = defaultSalesDocumentRepo;
        this.defaultSalesLineRepo = defaultSalesLineRepo;
    }
    async getRepo(entity, defaultRepo) {
        const companyId = tenancy_context_1.TenancyContext.getCompanyId();
        if (!companyId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(companyId);
        return ds.getRepository(entity);
    }
    async getSalesDocRepo() { return this.getRepo(sales_document_entity_1.SalesDocument, this.defaultSalesDocumentRepo); }
    async getSalesLineRepo() { return this.getRepo(sales_document_entity_1.SalesDocumentLine, this.defaultSalesLineRepo); }
    async create(createSalesDocumentDto) {
        const { lines, ...documentData } = createSalesDocumentDto;
        const sdRepo = await this.getSalesDocRepo();
        const slRepo = await this.getSalesLineRepo();
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
        return sdRepo.save(document);
    }
    async findAll(companyId) {
        const sdRepo = await this.getSalesDocRepo();
        if (companyId) {
            return sdRepo.find({
                where: { companyId },
                order: { date: 'DESC', createdAt: 'DESC' },
                relations: ['lines']
            });
        }
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
    async update(id, updateSalesDocumentDto) {
        const sdRepo = await this.getSalesDocRepo();
        const document = await this.findOne(id);
        sdRepo.merge(document, updateSalesDocumentDto);
        return sdRepo.save(document);
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
    async remove(id) {
        const sdRepo = await this.getSalesDocRepo();
        const document = await this.findOne(id);
        return sdRepo.remove(document);
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(sales_document_entity_1.SalesDocument)),
    __param(2, (0, typeorm_1.InjectRepository)(sales_document_entity_1.SalesDocumentLine)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SalesService);
//# sourceMappingURL=sales.service.js.map