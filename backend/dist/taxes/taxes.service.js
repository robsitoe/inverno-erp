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
exports.TaxesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tax_rate_entity_1 = require("./entities/tax-rate.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
let TaxesService = class TaxesService {
    tenancyService;
    defaultRepo;
    constructor(tenancyService, defaultRepo) {
        this.tenancyService = tenancyService;
        this.defaultRepo = defaultRepo;
    }
    async getRepo(entity, defaultRepo, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }
    async getTaxRepo(companyId) {
        return this.getRepo(tax_rate_entity_1.TaxRate, this.defaultRepo, companyId);
    }
    async create(dto) {
        const repo = await this.getTaxRepo(dto.companyId);
        const tax = repo.create(dto);
        return repo.save(tax);
    }
    async findAll(companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getTaxRepo(targetId);
        return repo.find({
            order: { code: 'ASC' }
        });
    }
    async findOne(id, companyId) {
        const repo = await this.getTaxRepo(companyId);
        const tax = await repo.findOne({ where: { id } });
        if (!tax)
            throw new common_1.NotFoundException(`Tax rate with ID ${id} not found`);
        return tax;
    }
    async update(id, dto) {
        const repo = await this.getTaxRepo(dto.companyId);
        const tax = await this.findOne(id, dto.companyId);
        repo.merge(tax, dto);
        return repo.save(tax);
    }
    async remove(id, companyId) {
        const repo = await this.getTaxRepo(companyId);
        const tax = await this.findOne(id, companyId);
        return repo.remove(tax);
    }
    async seedDefaults(companyId) {
        const repo = await this.getTaxRepo(companyId);
        const defaults = [
            { code: '00', description: 'Regime de isenção', rate: 0, type: 'IVA' },
            { code: '01', description: 'Isento (artº18)', rate: 0, type: 'IVA' },
            { code: '16', description: 'IVA Taxa Normal (16%)', rate: 16, type: 'IVA' },
            { code: '17', description: 'IVA Taxa Anterior (17%)', rate: 17, type: 'IVA' },
            { code: 'BS', description: 'Bens em segunda mão', rate: 17, type: 'IVA' },
            { code: 'OA', description: 'Objectos de arte', rate: 17, type: 'IVA' }
        ];
        for (const d of defaults) {
            const existing = await repo.findOne({ where: { code: d.code, companyId } });
            if (!existing) {
                await repo.save(repo.create({ ...d, companyId }));
            }
        }
    }
};
exports.TaxesService = TaxesService;
exports.TaxesService = TaxesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(tax_rate_entity_1.TaxRate)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        typeorm_2.Repository])
], TaxesService);
//# sourceMappingURL=taxes.service.js.map