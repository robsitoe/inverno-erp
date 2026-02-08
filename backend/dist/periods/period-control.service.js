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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodControlService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const fiscal_year_entity_1 = require("../companies/entities/fiscal-year.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
const journal_entry_entity_1 = require("../accounting/entities/journal-entry.entity");
const sales_document_entity_1 = require("../sales/entities/sales-document.entity");
const purchase_entity_1 = require("../purchases/entities/purchase.entity");
const treasury_entity_1 = require("../treasury/entities/treasury.entity");
const user_entity_1 = require("../users/entities/user.entity");
const period_audit_log_entity_1 = require("../companies/entities/period-audit-log.entity");
let PeriodControlService = class PeriodControlService {
    mainDataSource;
    tenancyService;
    constructor(mainDataSource, tenancyService) {
        this.mainDataSource = mainDataSource;
        this.tenancyService = tenancyService;
    }
    async getDataSource(companyId) {
        const resolvedCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!resolvedCompanyId) {
            return this.mainDataSource;
        }
        return this.tenancyService.getTenantDataSource(resolvedCompanyId);
    }
    normalizeDate(date) {
        return new Date(date).toISOString().slice(0, 10);
    }
    async ensureDateInOpenPeriod(date, companyId) {
        const resolvedCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const ds = await this.getDataSource(resolvedCompanyId);
        const fyRepo = ds.getRepository(fiscal_year_entity_1.FiscalYear);
        const targetDate = this.normalizeDate(date);
        if (!resolvedCompanyId) {
            throw new common_1.BadRequestException('companyId é obrigatório para validação de período fiscal.');
        }
        const year = await fyRepo
            .createQueryBuilder('fy')
            .where('fy.companyId = :companyId', { companyId: resolvedCompanyId })
            .andWhere('fy.startDate <= :targetDate', { targetDate })
            .andWhere('fy.endDate >= :targetDate', { targetDate })
            .orderBy('fy.year', 'DESC')
            .getOne();
        if (!year) {
            throw new common_1.BadRequestException(`Não existe período fiscal configurado para a data ${targetDate}.`);
        }
        if ((year.status || '').toUpperCase() !== 'OPEN') {
            throw new common_1.BadRequestException(`O período fiscal ${year.year} está fechado. Não é possível lançar documentos nesta data.`);
        }
        return year;
    }
    async getClosureChecklist(fiscalYearId, companyId) {
        const resolvedCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const ds = await this.getDataSource(resolvedCompanyId);
        const fyRepo = ds.getRepository(fiscal_year_entity_1.FiscalYear);
        const fiscalYear = await fyRepo.findOne({ where: { id: fiscalYearId, companyId: resolvedCompanyId } });
        if (!fiscalYear)
            throw new common_1.NotFoundException('Exercício fiscal não encontrado');
        const jlRepo = ds.getRepository(journal_entry_entity_1.JournalLine);
        const balance = await jlRepo
            .createQueryBuilder('line')
            .leftJoin('line.journalEntry', 'entry')
            .select('COALESCE(SUM(CAST(line.debit AS decimal)), 0)', 'debit')
            .addSelect('COALESCE(SUM(CAST(line.credit AS decimal)), 0)', 'credit')
            .where('entry.companyId = :companyId', { companyId: resolvedCompanyId })
            .andWhere('entry.date >= :startDate AND entry.date <= :endDate', { startDate: fiscalYear.startDate, endDate: fiscalYear.endDate })
            .andWhere("entry.status IN ('POSTED','PAID')")
            .getRawOne();
        const debit = Number(balance?.debit || 0);
        const credit = Number(balance?.credit || 0);
        const difference = Number((debit - credit).toFixed(2));
        const salesPending = await ds
            .getRepository(sales_document_entity_1.SalesDocument)
            .createQueryBuilder('sd')
            .where('sd.companyId = :companyId', { companyId: resolvedCompanyId })
            .andWhere('sd.status = :status', { status: 'DRAFT' })
            .andWhere('sd.date >= :startDate AND sd.date <= :endDate', { startDate: fiscalYear.startDate, endDate: fiscalYear.endDate })
            .getCount();
        const purchasesPending = await ds
            .getRepository(purchase_entity_1.PurchaseDocument)
            .createQueryBuilder('pd')
            .where('pd.companyId = :companyId', { companyId: resolvedCompanyId })
            .andWhere('pd.status = :status', { status: 'DRAFT' })
            .andWhere('pd.date >= :startDate AND pd.date <= :endDate', { startDate: fiscalYear.startDate, endDate: fiscalYear.endDate })
            .getCount();
        const pendingReconciliations = await ds
            .getRepository(treasury_entity_1.TreasuryDocument)
            .createQueryBuilder('td')
            .where('td.companyId = :companyId', { companyId: resolvedCompanyId })
            .andWhere('td.date >= :startDate AND td.date <= :endDate', { startDate: fiscalYear.startDate, endDate: fiscalYear.endDate })
            .andWhere('(td.relatedDocument IS NULL OR td.relatedDocument = \'\')')
            .getCount();
        return {
            fiscalYear,
            checklist: {
                trialBalance: {
                    ok: Math.abs(difference) <= 0.01,
                    debit,
                    credit,
                    difference,
                },
                pendingDocuments: {
                    ok: salesPending + purchasesPending === 0,
                    salesDraft: salesPending,
                    purchaseDraft: purchasesPending,
                    total: salesPending + purchasesPending,
                },
                reconciliations: {
                    ok: pendingReconciliations === 0,
                    pending: pendingReconciliations,
                },
            },
        };
    }
    async closeFiscalYear(fiscalYearId, reason, performedBy, companyId) {
        const resolvedCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const ds = await this.getDataSource(resolvedCompanyId);
        const fyRepo = ds.getRepository(fiscal_year_entity_1.FiscalYear);
        const target = await fyRepo.findOne({ where: { id: fiscalYearId, companyId: resolvedCompanyId } });
        if (!target)
            throw new common_1.NotFoundException('Exercício fiscal não encontrado');
        const checklist = await this.getClosureChecklist(fiscalYearId, resolvedCompanyId);
        const allChecksOk = Object.values(checklist.checklist).every((c) => c.ok);
        if (!allChecksOk) {
            throw new common_1.BadRequestException({ message: 'Checklist de fecho inválida', checklist: checklist.checklist });
        }
        target.status = 'CLOSED';
        await fyRepo.save(target);
        await ds.getRepository(period_audit_log_entity_1.PeriodAuditLog).save({
            companyId: resolvedCompanyId,
            fiscalYearId,
            action: 'CLOSE',
            reason: reason || 'Fecho de período',
            performedByUserId: performedBy?.id,
            performedByUsername: performedBy?.username,
            metadata: checklist.checklist,
        });
        return { success: true, fiscalYear: target, checklist: checklist.checklist };
    }
    async reopenFiscalYear(fiscalYearId, reason, requestedBy, companyId) {
        if (!reason || !reason.trim()) {
            throw new common_1.BadRequestException('A reabertura exige motivo obrigatório para auditoria.');
        }
        const resolvedCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const ds = await this.getDataSource(resolvedCompanyId);
        const fyRepo = ds.getRepository(fiscal_year_entity_1.FiscalYear);
        const target = await fyRepo.findOne({ where: { id: fiscalYearId, companyId: resolvedCompanyId } });
        if (!target)
            throw new common_1.NotFoundException('Exercício fiscal não encontrado');
        const userRepo = this.mainDataSource.getRepository(user_entity_1.User);
        const actor = requestedBy?.userId ? await userRepo.findOne({ where: { id: requestedBy.userId } }) : null;
        const hasElevatedPermissions = !!actor && actor.isActive && (actor.isSuperAdmin || actor.isAdmin);
        if (requestedBy?.requireElevatedPermission !== false && !hasElevatedPermissions) {
            throw new common_1.ForbiddenException('Reabertura permitida apenas para utilizadores com permissão elevada.');
        }
        target.status = 'OPEN';
        await fyRepo.save(target);
        await ds.getRepository(period_audit_log_entity_1.PeriodAuditLog).save({
            companyId: resolvedCompanyId,
            fiscalYearId,
            action: 'REOPEN',
            reason: reason.trim(),
            performedByUserId: actor?.id || requestedBy?.userId,
            performedByUsername: actor?.username || requestedBy?.username,
            metadata: {
                elevatedPermissionChecked: requestedBy?.requireElevatedPermission !== false,
            },
        });
        return { success: true, fiscalYear: target };
    }
};
exports.PeriodControlService = PeriodControlService;
exports.PeriodControlService = PeriodControlService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        tenancy_service_1.TenancyService])
], PeriodControlService);
//# sourceMappingURL=period-control.service.js.map