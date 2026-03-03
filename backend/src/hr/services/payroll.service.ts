import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Payroll, PayrollStatus } from '../entities/payroll.entity';
import { Absence, AbsenceStatus } from '../entities/absence.entity';
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

  // ── IRM / INSS Calculations ────────────────────────────────────────────────

  /**
   * Mozambique IRPS (Imposto sobre o Rendimento de Pessoas Singulares) calculation — dynamic table
   */
  calculateIRPS(taxableAmount: number, brackets: TaxBracket[], dependents: number = 0): number {
    if (taxableAmount <= 0 || !brackets || !brackets.length) return 0;

    // Brackets are sorted by minAmount ASC
    for (const b of brackets) {
      if (taxableAmount >= Number(b.minAmount) && (!b.maxAmount || taxableAmount <= Number(b.maxAmount))) {
        let deduction = Number(b.deduction0 || 0);
        if (dependents === 1) deduction = Number(b.deduction1 || 0);
        else if (dependents === 2) deduction = Number(b.deduction2 || 0);
        else if (dependents === 3) deduction = Number(b.deduction3 || 0);
        else if (dependents >= 4) deduction = Number(b.deduction4Plus || 0);

        const rate = Number(b.rate || 0);
        const tax = (taxableAmount * (rate / 100)) - deduction;
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

      // Professional Logic: In Mozambique, SalaryBase + Housing + Bonuses are Taxable. 
      // Transport and Food are often exempt within limits.
      const taxableGross = grossSalary + housing;

      const inss = this.calculateINSS(taxableGross, settings);

      // IRPS base: taxableGross minus INSS employee contribution
      const irpsBase = taxableGross - inss.employee;
      const irps = this.calculateIRPS(irpsBase, brackets, emp.dependents || 0);

      // Net = grossTotal - INSS - IRPS
      // Gross Total includes everything (Salary + All Subsidies)
      const net = (grossSalary + transport + food + housing) - inss.employee - irps;

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
        daysWorked: 30, // Default for now
        netSalary: net,
        status: PayrollStatus.DRAFT,
      });

      results.push(await payRepo.save(record));
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

    const lines: any[] = [
      { accountId: '6.2.2', debit: totalGross, credit: 0, description: `Salários Base - ${month}/${year}` },
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
