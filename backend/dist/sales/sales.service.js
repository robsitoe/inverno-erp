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
let SalesService = class SalesService {
    salesDocumentRepository;
    salesDocumentLineRepository;
    constructor(salesDocumentRepository, salesDocumentLineRepository) {
        this.salesDocumentRepository = salesDocumentRepository;
        this.salesDocumentLineRepository = salesDocumentLineRepository;
    }
    async create(createSalesDocumentDto) {
        const { lines, ...documentData } = createSalesDocumentDto;
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
            return this.salesDocumentLineRepository.create({
                ...line,
                total,
            });
        });
        const total = subtotal + totalIva;
        const lastDoc = await this.salesDocumentRepository.findOne({
            where: { documentType: documentData.documentType, series: documentData.series },
            order: { documentNumber: 'DESC' },
        });
        const nextNumber = (Number(lastDoc?.documentNumber) || 0) + 1;
        const documentNumber = `${documentData.documentType} ${documentData.series}/${nextNumber}`;
        const document = this.salesDocumentRepository.create({
            ...documentData,
            documentNumber,
            seriesNumber: nextNumber,
            subtotal,
            totalIva,
            discounts,
            total,
            lines: documentLines,
        });
        return this.salesDocumentRepository.save(document);
    }
    findAll() {
        return this.salesDocumentRepository.find({
            order: { date: 'DESC', createdAt: 'DESC' },
            relations: ['lines']
        });
    }
    async findOne(id) {
        const document = await this.salesDocumentRepository.findOne({
            where: { id },
            relations: ['lines']
        });
        if (!document) {
            throw new common_1.NotFoundException(`Sales Document with ID ${id} not found`);
        }
        return document;
    }
    async update(id, updateSalesDocumentDto) {
        const document = await this.findOne(id);
        this.salesDocumentRepository.merge(document, updateSalesDocumentDto);
        return this.salesDocumentRepository.save(document);
    }
    async remove(id) {
        const document = await this.findOne(id);
        return this.salesDocumentRepository.remove(document);
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sales_document_entity_1.SalesDocument)),
    __param(1, (0, typeorm_1.InjectRepository)(sales_document_entity_1.SalesDocumentLine)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SalesService);
//# sourceMappingURL=sales.service.js.map