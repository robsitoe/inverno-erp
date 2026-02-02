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
exports.TreasuryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const treasury_entity_1 = require("./entities/treasury.entity");
const payment_method_entity_1 = require("./entities/payment-method.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
let TreasuryService = class TreasuryService {
    tenancyService;
    defaultTreasuryRepo;
    defaultPaymentMethodRepo;
    constructor(tenancyService, defaultTreasuryRepo, defaultPaymentMethodRepo) {
        this.tenancyService = tenancyService;
        this.defaultTreasuryRepo = defaultTreasuryRepo;
        this.defaultPaymentMethodRepo = defaultPaymentMethodRepo;
    }
    async getRepo(entity, defaultRepo) {
        const companyId = tenancy_context_1.TenancyContext.getCompanyId();
        if (!companyId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(companyId);
        return ds.getRepository(entity);
    }
    async getTreasuryRepo() { return this.getRepo(treasury_entity_1.TreasuryDocument, this.defaultTreasuryRepo); }
    async getPaymentMethodRepo() { return this.getRepo(payment_method_entity_1.PaymentMethod, this.defaultPaymentMethodRepo); }
    async create(createTreasuryDto) {
        const repo = await this.getTreasuryRepo();
        const treasury = repo.create(createTreasuryDto);
        return repo.save(treasury);
    }
    async findAll(companyId) {
        const repo = await this.getTreasuryRepo();
        if (companyId) {
            return repo.find({
                where: { companyId },
                relations: ['lines']
            });
        }
        return repo.find({ relations: ['lines'] });
    }
    async findOne(id) {
        const repo = await this.getTreasuryRepo();
        const doc = await repo.findOne({ where: { id }, relations: ['lines'] });
        if (!doc)
            throw new common_1.NotFoundException('Documento de tesouraria não encontrado');
        return doc;
    }
    async update(id, updateTreasuryDto) {
        const repo = await this.getTreasuryRepo();
        return repo.update(id, updateTreasuryDto);
    }
    async remove(id) {
        const repo = await this.getTreasuryRepo();
        return repo.delete(id);
    }
    async findAllReceipts(companyId) {
        const repo = await this.getTreasuryRepo();
        const where = { type: treasury_entity_1.TreasuryDocumentType.RECEIPT };
        if (companyId) {
            where.companyId = companyId;
        }
        return repo.find({
            where,
            relations: ['lines']
        });
    }
    async createReceipt(data) {
        const repo = await this.getTreasuryRepo();
        const receipt = repo.create({ ...data, type: treasury_entity_1.TreasuryDocumentType.RECEIPT });
        return repo.save(receipt);
    }
    async findAllPayments(companyId) {
        const repo = await this.getTreasuryRepo();
        const where = { type: treasury_entity_1.TreasuryDocumentType.PAYMENT };
        if (companyId) {
            where.companyId = companyId;
        }
        return repo.find({
            where,
            relations: ['lines']
        });
    }
    async createPayment(data) {
        const repo = await this.getTreasuryRepo();
        const payment = repo.create({ ...data, type: treasury_entity_1.TreasuryDocumentType.PAYMENT });
        return repo.save(payment);
    }
    async savePaymentMethod(data) {
        const repo = await this.getPaymentMethodRepo();
        return repo.save(data);
    }
    async findAllPaymentMethods(companyId) {
        const repo = await this.getPaymentMethodRepo();
        if (companyId) {
            return repo.find({
                where: { companyId },
                order: { sortOrder: 'ASC' }
            });
        }
        return repo.find({ order: { sortOrder: 'ASC' } });
    }
    async removePaymentMethod(id) {
        const repo = await this.getPaymentMethodRepo();
        return repo.delete(id);
    }
};
exports.TreasuryService = TreasuryService;
exports.TreasuryService = TreasuryService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(treasury_entity_1.TreasuryDocument)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_method_entity_1.PaymentMethod)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TreasuryService);
//# sourceMappingURL=treasury.service.js.map