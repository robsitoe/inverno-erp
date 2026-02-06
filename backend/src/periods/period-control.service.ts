import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiscalYear } from '../companies/entities/fiscal-year.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { JournalLine } from '../accounting/entities/journal-entry.entity';
import { SalesDocument } from '../sales/entities/sales-document.entity';
import { PurchaseDocument } from '../purchases/entities/purchase.entity';
import { TreasuryDocument } from '../treasury/entities/treasury.entity';
import { User } from '../users/entities/user.entity';
import { PeriodAuditLog } from '../companies/entities/period-audit-log.entity';

@Injectable()
export class PeriodControlService {
  constructor(
    private readonly mainDataSource: DataSource,
    private readonly tenancyService: TenancyService,
  ) {}

  private async getDataSource(companyId?: string): Promise<DataSource> {
    const resolvedCompanyId = companyId || TenancyContext.getCompanyId();
    if (!resolvedCompanyId) {
      return this.mainDataSource;
    }
    return this.tenancyService.getTenantDataSource(resolvedCompanyId);
  }

  private normalizeDate(date: string): string {
    return new Date(date).toISOString().slice(0, 10);
  }

  async ensureDateInOpenPeriod(date: string, companyId?: string) {
    const resolvedCompanyId = companyId || TenancyContext.getCompanyId();
    const ds = await this.getDataSource(resolvedCompanyId);
    const fyRepo = ds.getRepository(FiscalYear);
    const targetDate = this.normalizeDate(date);

    if (!resolvedCompanyId) {
      throw new BadRequestException('companyId é obrigatório para validação de período fiscal.');
    }

    const year = await fyRepo
      .createQueryBuilder('fy')
      .where('fy.companyId = :companyId', { companyId: resolvedCompanyId })
      .andWhere('fy.startDate <= :targetDate', { targetDate })
      .andWhere('fy.endDate >= :targetDate', { targetDate })
      .orderBy('fy.year', 'DESC')
      .getOne();

    if (!year) {
      throw new BadRequestException(`Não existe período fiscal configurado para a data ${targetDate}.`);
    }

    if ((year.status || '').toUpperCase() !== 'OPEN') {
      throw new BadRequestException(`O período fiscal ${year.year} está fechado. Não é possível lançar documentos nesta data.`);
    }

    return year;
  }

  async getClosureChecklist(fiscalYearId: string, companyId?: string) {
    const resolvedCompanyId = companyId || TenancyContext.getCompanyId();
    const ds = await this.getDataSource(resolvedCompanyId);

    const fyRepo = ds.getRepository(FiscalYear);
    const fiscalYear = await fyRepo.findOne({ where: { id: fiscalYearId, companyId: resolvedCompanyId } });
    if (!fiscalYear) throw new NotFoundException('Exercício fiscal não encontrado');

    const jlRepo = ds.getRepository(JournalLine);
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
      .getRepository(SalesDocument)
      .createQueryBuilder('sd')
      .where('sd.companyId = :companyId', { companyId: resolvedCompanyId })
      .andWhere('sd.status = :status', { status: 'DRAFT' })
      .andWhere('sd.date >= :startDate AND sd.date <= :endDate', { startDate: fiscalYear.startDate, endDate: fiscalYear.endDate })
      .getCount();

    const purchasesPending = await ds
      .getRepository(PurchaseDocument)
      .createQueryBuilder('pd')
      .where('pd.companyId = :companyId', { companyId: resolvedCompanyId })
      .andWhere('pd.status = :status', { status: 'DRAFT' })
      .andWhere('pd.date >= :startDate AND pd.date <= :endDate', { startDate: fiscalYear.startDate, endDate: fiscalYear.endDate })
      .getCount();

    const pendingReconciliations = await ds
      .getRepository(TreasuryDocument)
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

  async closeFiscalYear(fiscalYearId: string, reason: string, performedBy?: { id?: string; username?: string }, companyId?: string) {
    const resolvedCompanyId = companyId || TenancyContext.getCompanyId();
    const ds = await this.getDataSource(resolvedCompanyId);
    const fyRepo = ds.getRepository(FiscalYear);

    const target = await fyRepo.findOne({ where: { id: fiscalYearId, companyId: resolvedCompanyId } });
    if (!target) throw new NotFoundException('Exercício fiscal não encontrado');

    const checklist = await this.getClosureChecklist(fiscalYearId, resolvedCompanyId);
    const allChecksOk = Object.values(checklist.checklist).every((c: any) => c.ok);

    if (!allChecksOk) {
      throw new BadRequestException({ message: 'Checklist de fecho inválida', checklist: checklist.checklist });
    }

    target.status = 'CLOSED';
    await fyRepo.save(target);

    await ds.getRepository(PeriodAuditLog).save({
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

  async reopenFiscalYear(
    fiscalYearId: string,
    reason: string,
    requestedBy: { userId: string; username?: string; requireElevatedPermission?: boolean },
    companyId?: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reabertura exige motivo obrigatório para auditoria.');
    }

    const resolvedCompanyId = companyId || TenancyContext.getCompanyId();
    const ds = await this.getDataSource(resolvedCompanyId);
    const fyRepo = ds.getRepository(FiscalYear);

    const target = await fyRepo.findOne({ where: { id: fiscalYearId, companyId: resolvedCompanyId } });
    if (!target) throw new NotFoundException('Exercício fiscal não encontrado');

    const userRepo = this.mainDataSource.getRepository(User);
    const actor = requestedBy?.userId ? await userRepo.findOne({ where: { id: requestedBy.userId } }) : null;

    const hasElevatedPermissions = !!actor && actor.isActive && (actor.isSuperAdmin || actor.isAdmin);
    if (requestedBy?.requireElevatedPermission !== false && !hasElevatedPermissions) {
      throw new ForbiddenException('Reabertura permitida apenas para utilizadores com permissão elevada.');
    }

    target.status = 'OPEN';
    await fyRepo.save(target);

    await ds.getRepository(PeriodAuditLog).save({
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
}
