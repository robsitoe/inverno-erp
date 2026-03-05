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
exports.GasControlService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const gas_control_entity_1 = require("./gas-control.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
let GasControlService = class GasControlService {
    defaultTypeRepo;
    defaultControlRepo;
    defaultEntryRepo;
    tenancyService;
    constructor(defaultTypeRepo, defaultControlRepo, defaultEntryRepo, tenancyService) {
        this.defaultTypeRepo = defaultTypeRepo;
        this.defaultControlRepo = defaultControlRepo;
        this.defaultEntryRepo = defaultEntryRepo;
        this.tenancyService = tenancyService;
    }
    async getRepo(entity, defaultRepo, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }
    async getCylinderTypes(companyId) {
        const repo = await this.getRepo(gas_control_entity_1.GasCylinderType, this.defaultTypeRepo, companyId);
        return repo.find({ where: { companyId: companyId || tenancy_context_1.TenancyContext.getCompanyId(), isActive: true } });
    }
    async getDailyControl(date, companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const controlRepo = await this.getRepo(gas_control_entity_1.GasDailyControl, this.defaultControlRepo, cid);
        const entryRepo = await this.getRepo(gas_control_entity_1.GasDailyEntry, this.defaultEntryRepo, cid);
        let control = await controlRepo.findOne({ where: { date, companyId: cid } });
        if (!control) {
            return {
                control: {
                    date,
                    companyId: cid,
                    status: 'NOT_STARTED',
                    initialStock: {}
                },
                entries: []
            };
        }
        const entries = await entryRepo.find({ where: { controlId: control.id, companyId: cid } });
        return { control, entries };
    }
    async saveEntry(data, companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(gas_control_entity_1.GasDailyEntry, this.defaultEntryRepo, cid);
        if (!data.id) {
            data.id = `GDE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        data.companyId = cid;
        return repo.save(data);
    }
    async deleteEntry(id, companyId) {
        const repo = await this.getRepo(gas_control_entity_1.GasDailyEntry, this.defaultEntryRepo, companyId);
        return repo.delete(id);
    }
    async openDaily(date, user, companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(gas_control_entity_1.GasDailyControl, this.defaultControlRepo, cid);
        let control = await repo.findOne({ where: { date, companyId: cid } });
        if (control) {
            if (control.status === 'NOT_STARTED' || !control.status) {
                control.status = 'OPENED';
                control.openedBy = user;
                control.openedAt = new Date();
                return repo.save(control);
            }
            return control;
        }
        const lastControl = await repo.createQueryBuilder('c')
            .where('c.date < :date AND c.companyId = :cid', { date, cid })
            .orderBy('c.date', 'DESC')
            .getOne();
        let initialStock = {};
        if (lastControl && lastControl.finalStock) {
            initialStock = lastControl.finalStock;
        }
        control = repo.create({
            id: `GAS-${date}-${cid}`,
            date,
            companyId: cid,
            status: 'OPENED',
            openedBy: user,
            openedAt: new Date(),
            initialStock,
            finalStock: {},
            auditLog: []
        });
        return repo.save(control);
    }
    async closeDaily(id, user, companyId) {
        const repo = await this.getRepo(gas_control_entity_1.GasDailyControl, this.defaultControlRepo, companyId);
        const control = await repo.findOne({ where: { id } });
        if (!control)
            throw new common_1.NotFoundException('Control not found');
        control.status = 'CLOSED';
        control.closedBy = user;
        control.closedAt = new Date();
        return repo.save(control);
    }
    async updateStocks(controlId, initialStock, finalStock, user, companyId) {
        const repo = await this.getRepo(gas_control_entity_1.GasDailyControl, this.defaultControlRepo, companyId);
        const control = await repo.findOne({ where: { id: controlId } });
        if (!control)
            throw new common_1.NotFoundException('Control not found');
        const isReopeningLog = control.status === 'CLOSED';
        control.initialStock = initialStock;
        control.finalStock = finalStock;
        if (isReopeningLog) {
            if (!control.auditLog)
                control.auditLog = [];
            let diffDetails = 'Alteração de: ';
            const changes = [];
            for (const key of Object.keys(finalStock || {})) {
                if (key === 'footers')
                    continue;
                const oldGpl = control.finalStock?.[key]?.gpl || 0;
                const newGpl = finalStock[key]?.gpl || 0;
                if (oldGpl !== newGpl) {
                    changes.push(`${key} (GPL: ${oldGpl}->${newGpl})`);
                }
            }
            const oldCash = control.finalStock?.footers?.closingBalance || 0;
            const newCash = finalStock?.footers?.closingBalance || 0;
            if (oldCash !== newCash) {
                changes.push(`Numerário (${oldCash}->${newCash})`);
            }
            control.auditLog.push({
                type: 'EDIT_AFTER_CLOSURE',
                user,
                timestamp: new Date(),
                summary: changes.length > 0 ? `Alterações: ${changes.join(', ')}` : 'Sincronização de dados (sem alteração de valores críticos)'
            });
        }
        const saved = await repo.save(control);
        const cid = companyId || control.companyId;
        const nextDate = new Date(control.date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];
        const nextControl = await repo.findOne({ where: { date: nextDateStr, companyId: cid } });
        if (nextControl) {
            nextControl.initialStock = finalStock;
            await repo.save(nextControl);
        }
        return saved;
    }
    async saveCylinderType(data, companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(gas_control_entity_1.GasCylinderType, this.defaultTypeRepo, cid);
        if (!data.id) {
            data.id = `${data.name}-${cid}`;
        }
        data.companyId = cid;
        return repo.save(data);
    }
};
exports.GasControlService = GasControlService;
exports.GasControlService = GasControlService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(gas_control_entity_1.GasCylinderType)),
    __param(1, (0, typeorm_1.InjectRepository)(gas_control_entity_1.GasDailyControl)),
    __param(2, (0, typeorm_1.InjectRepository)(gas_control_entity_1.GasDailyEntry)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        tenancy_service_1.TenancyService])
], GasControlService);
//# sourceMappingURL=gas-control.service.js.map