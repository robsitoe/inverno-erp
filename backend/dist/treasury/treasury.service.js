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
const petty_cash_voucher_entity_1 = require("./entities/petty-cash-voucher.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
const workflow_service_1 = require("../common/workflow.service");
const period_control_service_1 = require("../periods/period-control.service");
let TreasuryService = class TreasuryService {
    tenancyService;
    periodControlService;
    defaultTreasuryRepo;
    defaultPaymentMethodRepo;
    defaultPettyCashVoucherRepo;
    workflowService;
    constructor(tenancyService, periodControlService, defaultTreasuryRepo, defaultPaymentMethodRepo, defaultPettyCashVoucherRepo, workflowService) {
        this.tenancyService = tenancyService;
        this.periodControlService = periodControlService;
        this.defaultTreasuryRepo = defaultTreasuryRepo;
        this.defaultPaymentMethodRepo = defaultPaymentMethodRepo;
        this.defaultPettyCashVoucherRepo = defaultPettyCashVoucherRepo;
        this.workflowService = workflowService;
    }
    async getRepo(entity, defaultRepo, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }
    async getTreasuryRepo(companyId) { return this.getRepo(treasury_entity_1.TreasuryDocument, this.defaultTreasuryRepo, companyId); }
    async getPaymentMethodRepo(companyId) { return this.getRepo(payment_method_entity_1.PaymentMethod, this.defaultPaymentMethodRepo, companyId); }
    async getPettyCashVoucherRepo(companyId) { return this.getRepo(petty_cash_voucher_entity_1.PettyCashVoucher, this.defaultPettyCashVoucherRepo, companyId); }
    async create(createTreasuryDto) {
        await this.periodControlService.ensureDateInOpenPeriod(createTreasuryDto.date, createTreasuryDto.companyId);
        const repo = await this.getTreasuryRepo();
        const treasury = repo.create(createTreasuryDto);
        return repo.save(treasury);
    }
    async findAll(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getTreasuryRepo(listCompanyId);
        return repo.find({ relations: ['lines'] });
    }
    async findOne(id) {
        const repo = await this.getTreasuryRepo();
        const doc = await repo.findOne({ where: { id }, relations: ['lines'] });
        if (!doc)
            throw new common_1.NotFoundException('Documento de tesouraria não encontrado');
        return doc;
    }
    async update(id, updateTreasuryDto, user) {
        if (updateTreasuryDto.date) {
            await this.periodControlService.ensureDateInOpenPeriod(updateTreasuryDto.date, updateTreasuryDto.companyId);
        }
        const repo = await this.getTreasuryRepo();
        const document = await this.findOne(id);
        if (user) {
            this.workflowService.checkEditLock(document.status, user);
        }
        repo.merge(document, updateTreasuryDto);
        return repo.save(document);
    }
    async remove(id, user) {
        const repo = await this.getTreasuryRepo();
        const document = await this.findOne(id);
        if (user) {
            this.workflowService.checkEditLock(document.status, user);
        }
        return repo.remove(document);
    }
    async processWorkflow(id, action, user, notes) {
        const document = await this.findOne(id);
        const repo = await this.getTreasuryRepo();
        return this.workflowService.transition(document, action, user, repo, 'TREASURY', notes);
    }
    async getWorkflowHistory(id) {
        return this.workflowService.getHistory(id);
    }
    async findAllReceipts(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getTreasuryRepo(listCompanyId);
        return repo.find({
            where: { type: treasury_entity_1.TreasuryDocumentType.RECEIPT },
            relations: ['lines']
        });
    }
    async createReceipt(data) {
        await this.periodControlService.ensureDateInOpenPeriod(data.date, data.companyId);
        const repo = await this.getTreasuryRepo();
        const receipt = repo.create({ ...data, type: treasury_entity_1.TreasuryDocumentType.RECEIPT });
        return repo.save(receipt);
    }
    async findAllPayments(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getTreasuryRepo(listCompanyId);
        return repo.find({
            where: { type: treasury_entity_1.TreasuryDocumentType.PAYMENT },
            relations: ['lines']
        });
    }
    async createPayment(data) {
        await this.periodControlService.ensureDateInOpenPeriod(data.date, data.companyId);
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
    async getNextVoucherNumber(companyId) {
        const repo = await this.getPettyCashVoucherRepo(companyId);
        const year = new Date().getFullYear();
        const all = await repo.find({
            where: { companyId },
            order: { createdAt: 'DESC' },
            take: 20
        });
        let nextSeq = 1;
        const lastWithYear = all.find(v => v.number && typeof v.number === 'string' && v.number.startsWith(`${year}/`));
        if (lastWithYear) {
            const parts = lastWithYear.number.split('/');
            const lastSeq = parseInt(parts[1]);
            if (!isNaN(lastSeq)) {
                nextSeq = lastSeq + 1;
            }
        }
        return { number: `${year}/${nextSeq.toString().padStart(3, '0')}` };
    }
    async createVoucher(data, user) {
        try {
            const cid = data.companyId || tenancy_context_1.TenancyContext.getCompanyId();
            await this.periodControlService.ensureDateInOpenPeriod(data.date, cid);
            const res = await this.getNextVoucherNumber(cid);
            const repo = await this.getPettyCashVoucherRepo(cid);
            const vId = `PCV-${Date.now()}-${cid}`;
            const voucher = repo.create({
                ...data,
                id: vId,
                number: res.number,
                companyId: cid,
                issuedBy: user?.name || user?.username || 'Sistema'
            });
            return await repo.save(voucher);
        }
        catch (error) {
            console.error('[TreasuryService] Error creating voucher:', error);
            throw error;
        }
    }
    async findAllVouchers(companyId) {
        try {
            const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
            if (!cid)
                return [];
            const repo = await this.getPettyCashVoucherRepo(cid);
            return await repo.find({ where: { companyId: cid }, order: { number: 'DESC' } });
        }
        catch (error) {
            console.error('[TreasuryService] Error listing vouchers:', error);
            throw error;
        }
    }
    async findOneVoucher(id) {
        const cid = id.split('-')[2] || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getPettyCashVoucherRepo(cid);
        return repo.findOne({ where: { id } });
    }
    async updateVoucher(id, data) {
        const cid = data.companyId || id.split('-')[2] || tenancy_context_1.TenancyContext.getCompanyId();
        if (data.date) {
            await this.periodControlService.ensureDateInOpenPeriod(data.date, cid);
        }
        const repo = await this.getPettyCashVoucherRepo(cid);
        const doc = await repo.findOne({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException('Vale não encontrado');
        repo.merge(doc, data);
        return repo.save(doc);
    }
    async removeVoucher(id) {
        const repo = await this.getPettyCashVoucherRepo();
        return repo.delete(id);
    }
};
exports.TreasuryService = TreasuryService;
exports.TreasuryService = TreasuryService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(treasury_entity_1.TreasuryDocument)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_method_entity_1.PaymentMethod)),
    __param(4, (0, typeorm_1.InjectRepository)(petty_cash_voucher_entity_1.PettyCashVoucher)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        period_control_service_1.PeriodControlService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        workflow_service_1.WorkflowService])
], TreasuryService);
//# sourceMappingURL=treasury.service.js.map