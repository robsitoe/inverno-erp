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
let PurchasesService = class PurchasesService {
    purchaseRepository;
    constructor(purchaseRepository) {
        this.purchaseRepository = purchaseRepository;
    }
    async create(createPurchaseDto) {
        const { lines, ...documentData } = createPurchaseDto;
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
                const lastDoc = await this.purchaseRepository.findOne({
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
        const purchase = this.purchaseRepository.create(entityData);
        return this.purchaseRepository.save(purchase);
    }
    findAll(companyId) {
        const where = {};
        if (companyId) {
            where.companyId = companyId;
        }
        return this.purchaseRepository.find({ where, relations: ['lines'] });
    }
    findOne(id) {
        return this.purchaseRepository.findOne({ where: { id }, relations: ['lines'] });
    }
    update(id, updatePurchaseDto) {
        return this.purchaseRepository.update(id, updatePurchaseDto);
    }
    async findByNumber(companyId, type, series, number) {
        return this.purchaseRepository.findOne({
            where: {
                companyId,
                type,
                series,
                number
            },
            relations: ['lines']
        });
    }
    remove(id) {
        return this.purchaseRepository.delete(id);
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(purchase_entity_1.PurchaseDocument)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map