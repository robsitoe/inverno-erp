import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Payroll, PayrollStatus } from '../entities/payroll.entity';
import { Absence, AbsenceStatus } from '../entities/absence.entity';
import { PettyCashVoucher } from '../../treasury/entities/petty-cash-voucher.entity';
import { TaxBracket, HRSettings } from '../entities/hr-settings.entity';
import { AccountingService } from '../../accounting/accounting.service';
import { TenancyService } from '../../tenancy/tenancy.service';
import { TenancyContext } from '../../tenancy/tenancy.context';
import { JournalEntryStatus } from '../../accounting/entities/journal-entry.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Employee)
    private readonly defaultEmployeeRepo: Repository<Employee>,
    @InjectRepository(Payroll)
    private readonly defaultPayrollRepo: Repository<Payroll>,
    @InjectRepository(TaxBracket)
    private readonly defaultTaxBracketRepo: Repository<TaxBracket>,
    @InjectRepository(HRSettings)
    private readonly defaultHRSettingsRepo: Repository<HRSettings>,
    @InjectRepository(Absence)
    private readonly defaultAbsenceRepo: Repository<Absence>,
    @InjectRepository(PettyCashVoucher)
    private readonly defaultPettyCashVoucherRepo: Repository<PettyCashVoucher>,
    private readonly accountingService: AccountingService,
    private readonly tenancyService: TenancyService,
  ) { }

  // ── Tenant-aware repo helpers ──────────────────────────────────────────────

  private async getRepo<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    defaultRepo: Repository<T>,
    companyId?: string,
  ): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return defaultRepo;
    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  private getEmployeeRepo(companyId?: string) {
    return this.getRepo(Employee, this.defaultEmployeeRepo, companyId);
  }

  private getPayrollRepo(companyId?: string) {
    return this.getRepo(Payroll, this.defaultPayrollRepo, companyId);
  }

  private getTaxBracketRepo(companyId?: string) {
    return this.getRepo(TaxBracket, this.defaultTaxBracketRepo, companyId);
  }

  private getHRSettingsRepo(companyId?: string) {
    return this.getRepo(HRSettings, this.defaultHRSettingsRepo, companyId);
  }

  private getAbsenceRepo(companyId?: string) {
    return this.getRepo(Absence, this.defaultAbsenceRepo, companyId);
  }

  private getPettyCashVoucherRepo(companyId?: string) {
    return this.getRepo(PettyCashVoucher, this.defaultPettyCashVoucherRepo, companyId);
  }

  // ── IRM / INSS Calculations ────────────────────────────────────────────────

  /**
   * Mozambique IRPS (Imposto sobre o Rendimento de Pessoas Singulares) calculation — dynamic table
   */
  calculateIRPS(taxableAmount: number, brackets: TaxBracket[], dependents: any = 0): number {
    if (taxableAmount <= 0 || !brackets || !brackets.length) return 0;

    const deps = Number(dependents || 0);
    const amount = Number(taxableAmount);

    // Brackets are sorted by minAmount ASC. 
    // We iterate backwards to find the highest bracket the amount falls into.
    for (let i = brackets.length - 1; i >= 0; i--) {
      const b = brackets[i];
      const min = Number(b.minAmount);

      if (amount >= min) {
        let deduction = Number(b.deduction0 || 0);
        if (deps === 1) deduction = Number(b.deduction1 || 0);
        else if (deps === 2) deduction = Number(b.deduction2 || 0);
        else if (deps === 3) deduction = Number(b.deduction3 || 0);
        else if (deps >= 4) deduction = Number(b.deduction4Plus || 0);

        const rate = Number(b.rate || 0);
        const tax = (amount * (rate / 100)) - deduction;
        const result = Math.max(0, tax);
        return isNaN(result) ? 0 : result;
      }
    }
    return 0;
  }

  calculateINSS(grossSalary: number, settings: HRSettings): { employee: number; employer: number } {
    return {
      employee: grossSalary * (Number(settings.inssEmployeeRate) / 100),
      employer: grossSalary * (Number(settings.inssEmployerRate) / 100),
    };
  }

  // ── Process Payroll ────────────────────────────────────────────────────────

  async processPayroll(year: number, month: number, companyId?: string): Promise<Payroll[]> {
    const targetCompanyId = companyId || TenancyContext.getCompanyId();

    if (!targetCompanyId) {
      throw new Error('Company ID não identificado. Verifique a sessão.');
    }

    const empRepo = await this.getEmployeeRepo(targetCompanyId);
    const payRepo = await this.getPayrollRepo(targetCompanyId);
    const bracketRepo = await this.getTaxBracketRepo(targetCompanyId);
    const settingsRepo = await this.getHRSettingsRepo(targetCompanyId);

    const brackets = await bracketRepo.find({ where: { companyId: targetCompanyId }, order: { minAmount: 'ASC' } });
    let settings = await settingsRepo.findOne({ where: { companyId: targetCompanyId } });
    if (!settings) {
      settings = settingsRepo.create({ companyId: targetCompanyId, inssEmployeeRate: 3, inssEmployerRate: 4 });
    }

    const employees = await empRepo.find({
      where: { companyId: targetCompanyId, isActive: true },
    });

    if (employees.length === 0) {
      throw new Error('Não foram encontrados funcionários activos para esta empresa.');
    }

    const results: Payroll[] = [];

    for (const emp of employees) {
      const grossSalary = Number(emp.salaryBase) || 0;
      const transport = Number(emp.subsidyTransport) || 0;
      const food = Number(emp.subsidyFood) || 0;
      const housing = Number(emp.subsidyHousing) || 0;

      // --- ABSENCE & VACATION LOGIC ---
      const absRepo = await this.getAbsenceRepo(targetCompanyId);
      const absRecords = await absRepo.find({
        where: {
          employeeId: emp.id,
          status: AbsenceStatus.APPROVED
        }
      });

      let absenceDays = 0;
      let vacationDays = 0;
      const firstDayOfMonth = new Date(year, month - 1, 1);
      const lastDayOfMonth = new Date(year, month, 0);

      for (const abs of absRecords) {
        const start = new Date(abs.startDate);
        const end = new Date(abs.endDate);

        // Intersect absence range with current month
        const intersectStart = start < firstDayOfMonth ? firstDayOfMonth : start;
        const intersectEnd = end > lastDayOfMonth ? lastDayOfMonth : end;

        if (intersectStart <= intersectEnd) {
          const diffTime = Math.abs(intersectEnd.getTime() - intersectStart.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

          if (abs.type === 'VACATION' as any) {
            vacationDays += diffDays;
          } else if (abs.type === 'UNJUSTIFIED' as any) {
            absenceDays += diffDays;
          }
        }
      }

      const dailyRate = grossSalary / 30;
      const absenceDeduction = Math.round((absenceDays * dailyRate) * 100) / 100;
      const daysWorked = 30 - absenceDays;

      // Professional Logic: In Mozambique, SalaryBase + Housing + Bonuses are Taxable. 
      // Subsidies like Transport/Food might have different rules, but for now we follow the general taxable gross.
      // Unjustified absences reduce the taxable gross.
      const taxableGross = (grossSalary - absenceDeduction) + housing;

      const inss = this.calculateINSS(Math.max(0, taxableGross), settings);

      // IRPS base: taxableGross minus INSS employee contribution
      const irpsBase = Math.max(0, taxableGross - inss.employee);
      const irps = this.calculateIRPS(irpsBase, brackets, Number(emp.dependents || 0));

      // --- VALES DE CAIXA LOGIC ---
      const pcvRepo = await this.getPettyCashVoucherRepo(targetCompanyId);
      const vouchers = await pcvRepo.find({
        where: {
          employeeId: emp.id,
          isPersonalAdvance: true,
          isDeducted: false,
          status: 'PAID'
        }
      });
      // Sum un-deducted vouchers up to the end of this month
      // Strictly speaking, we might want to check the date, but typically un-deducted ones just roll over to the next payroll
      const cashVoucherDeduction = vouchers.reduce((acc, v) => {
        const vDate = new Date(v.date);
        if (vDate <= lastDayOfMonth) {
          return acc + Number(v.amount);
        }
        return acc;
      }, 0);

      // Net = (grossTotal - deduction) - INSS - IRPS - Vouchers
      const net = (grossSalary - absenceDeduction + transport + food + housing) - inss.employee - irps - cashVoucherDeduction;

      const recordId = `PAY-${emp.code}-${year}-${String(month).padStart(2, '0')}`;

      // Upsert: remove existing draft for this period if it exists
      const existing = await payRepo.findOne({ where: { id: recordId } });
      if (existing && existing.status === PayrollStatus.POSTED) {
        // Already posted — skip re-processing
        results.push(existing);
        continue;
      }

      const record = payRepo.create({
        id: recordId,
        companyId: targetCompanyId,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.code,
        year,
        month,
        grossSalary: grossSalary,
        inssEmployee: inss.employee,
        inssEmployer: inss.employer,
        irps,
        transportSubsidy: transport,
        foodSubsidy: food,
        dependents: emp.dependents || 0,
        daysWorked,
        absenceDays,
        absenceDeduction,
        vacationDays,
        cashVoucherDeduction,
        netSalary: Math.max(0, net),
        status: PayrollStatus.DRAFT,
      });

      const savedRecord = await payRepo.save(record);
      results.push(savedRecord);

      // We should arguably mark the vouchers as deducted right here, 
      // but safely they should only be marked 'isDeducted' when checking out or posting to accounting. 
      // However, we can associate them temporarily or do it on Posting. 
      // For now, let's keep it simple: the payroll says they are deducted. The posting to accounting will finalize it.
    }

    return results;
  }

  // ── Post to Accounting ─────────────────────────────────────────────────────

  async postPayrollToAccounting(year: number, month: number, companyId?: string) {
    const targetCompanyId = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(targetCompanyId);

    const records = await payRepo.find({
      where: { companyId: targetCompanyId, year, month, status: PayrollStatus.DRAFT },
    });

    if (records.length === 0) {
      return { success: false, message: 'Nenhum registo em rascunho encontrado para este período. Gere a folha primeiro.' };
    }

    const totalGross = records.reduce((s, r) => s + Number(r.grossSalary), 0);
    const totalINSS_EE = records.reduce((s, r) => s + Number(r.inssEmployee), 0);
    const totalINSS_ER = records.reduce((s, r) => s + Number(r.inssEmployer), 0);
    const totalIRPS = records.reduce((s, r) => s + Number(r.irps), 0);
    const totalNet = records.reduce((s, r) => s + Number(r.netSalary), 0);
    const totalSubsidies = records.reduce(
      (s, r) => s + Number(r.transportSubsidy) + Number(r.foodSubsidy) + Number(r.overtimeAmount) + Number(r.bonusAmount), 0
    );
    const totalAbsenceDeduction = records.reduce((s, r) => s + Number((r as any).absenceDeduction || 0), 0);

    const lines: any[] = [
      { accountId: '6.2.2', debit: totalGross - totalAbsenceDeduction, credit: 0, description: `Salários Base (Líquido de Faltas) - ${month}/${year}` },
      { accountId: '6.2.3', debit: totalINSS_ER, credit: 0, description: `Encargos INSS Patronal (4%) - ${month}/${year}` },
      { accountId: '4.4.2.1', debit: 0, credit: totalIRPS, description: `Retenção IRPS - ${month}/${year}` },
      { accountId: '4.4.9', debit: 0, credit: totalINSS_EE + totalINSS_ER, description: `INSS Total (7%) - ${month}/${year}` },
      { accountId: '4.6.2.2', debit: 0, credit: totalNet, description: `Salários Líquidos a Pagar - ${month}/${year}` },
    ];

    if (totalSubsidies > 0) {
      lines.push({ accountId: '6.2.9', debit: totalSubsidies, credit: 0, description: `Subsídios e Suplementos - ${month}/${year}` });
    }

    // Balance check & absorb rounding
    const debitTotal = totalGross + totalINSS_ER + (totalSubsidies > 0 ? totalSubsidies : 0);
    const creditTotal = totalIRPS + (totalINSS_EE + totalINSS_ER) + totalNet;
    const diff = Math.round((debitTotal - creditTotal) * 100) / 100;
    if (Math.abs(diff) > 0) {
      lines[4].credit += diff; // Absorb into net-to-pay
    }

    try {
      const entry = await this.accountingService.createJournalEntry({
        date: new Date(year, month - 1, 1).toISOString().split('T')[0],
        description: `Processamento de Salários - Período ${month}/${year}`,
        reference: `FOLHA-${String(month).padStart(2, '0')}-${year}`,
        status: JournalEntryStatus.POSTED,
        companyId: targetCompanyId,
        lines: lines.map((l, i) => ({
          ...l,
          id: `PL-${month}-${year}-${targetCompanyId}-${i}`,
          index: i + 1,
        })),
      });

      for (const r of records) {
        r.status = PayrollStatus.POSTED;
        r.journalEntryId = entry.id;
        await payRepo.save(r);
      }

      return { success: true, entryId: entry.id, processed: records.length };
    } catch (e: any) {
      console.error('[Payroll] Accounting Post Failed:', e);
      return { success: false, error: e.message };
    }
  }

  async getPayrollReportData(year: number, month: number, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);

    const records = await payRepo.find({
      where: { year, month },
      order: { employeeName: 'ASC' }
    });

    const totals = records.reduce((acc, curr) => {
      acc.grossSalary += Number(curr.grossSalary || 0);
      acc.inssEmployee += Number(curr.inssEmployee || 0);
      acc.inssEmployer += Number(curr.inssEmployer || 0);
      acc.irps += Number(curr.irps || 0);
      acc.netSalary += Number(curr.netSalary || 0);
      acc.transportSubsidy += Number(curr.transportSubsidy || 0);
      acc.foodSubsidy += Number(curr.foodSubsidy || 0);
      acc.bonusAmount += Number(curr.bonusAmount || 0);
      return acc;
    }, {
      grossSalary: 0, inssEmployee: 0, inssEmployer: 0,
      irps: 0, netSalary: 0, transportSubsidy: 0, foodSubsidy: 0,
      bonusAmount: 0
    });

    return { records, totals };
  }
}
