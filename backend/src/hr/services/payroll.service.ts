import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Payroll, PayrollStatus } from '../entities/payroll.entity';
import { AccountingService } from '../../accounting/accounting.service';
import { TenancyContext } from '../../tenancy/tenancy.context';
import { JournalEntryStatus } from '../../accounting/entities/journal-entry.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Payroll)
    private readonly payrollRepo: Repository<Payroll>,
    private readonly accountingService: AccountingService,
  ) {}

  /**
   * Mozambique IRM Calculation (Retenção na Fonte) 2024
   * Escalões de rendimento mensal
   */
  calculateIRM(taxableAmount: number): number {
    if (taxableAmount <= 0) return 0;

    // Isento até 225,000 MT anual -> 18,750 MT mensal (Verify latest law)
    // Se isenção for aplicada: if (taxableAmount <= 18750) return 0;
    
    // Tabela progressiva anual / 12
    if (taxableAmount <= 3500) {
      return taxableAmount * 0.10;
    } else if (taxableAmount <= 14000) {
      return (taxableAmount * 0.15) - 175;
    } else if (taxableAmount <= 42000) {
      return (taxableAmount * 0.20) - 875;
    } else if (taxableAmount <= 126000) {
      return (taxableAmount * 0.25) - 2975;
    } else {
      return (taxableAmount * 0.32) - 11795;
    }
  }

  calculateINSS(grossSalary: number): { employee: number; employer: number } {
    return {
      employee: grossSalary * 0.04,
      employer: grossSalary * 0.03,
    };
  }

  async processPayroll(year: number, month: number, companyId?: string): Promise<Payroll[]> {
    const targetCompanyId = companyId || TenancyContext.getCompanyId();
    const employees = await this.employeeRepo.find({ where: { companyId: targetCompanyId, isActive: true } });
    
    const results: Payroll[] = [];

    for (const emp of employees) {
      const gross = Number(emp.salaryBase) || 0;
      const inss = this.calculateINSS(gross);
      
      // IRM is calculated on Gross minus INSS (base tributável)
      const taxableAmount = gross - inss.employee;
      const irm = this.calculateIRM(taxableAmount);
      
      const net = gross - inss.employee - irm + Number(emp.subsidyTransport || 0) + Number(emp.subsidyFood || 0);

      const record = this.payrollRepo.create({
        id: `PAY-${emp.code}-${year}-${month}`,
        companyId: targetCompanyId,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.code,
        year,
        month,
        grossSalary: gross,
        inssEmployee: inss.employee,
        inssEmployer: inss.employer,
        irm,
        transportSubsidy: emp.subsidyTransport,
        foodSubsidy: emp.subsidyFood,
        netSalary: net,
        status: PayrollStatus.DRAFT,
      });

      results.push(await this.payrollRepo.save(record));
    }

    return results;
  }

  async postPayrollToAccounting(year: number, month: number, companyId?: string) {
    const targetCompanyId = companyId || TenancyContext.getCompanyId();
    const records = await this.payrollRepo.find({ 
      where: { companyId: targetCompanyId, year, month, status: PayrollStatus.DRAFT } 
    });

    if (records.length === 0) return { success: false, message: 'No draft payroll records found for this period' };

    const totalGross = records.reduce((sum, r) => sum + Number(r.grossSalary), 0);
    const totalINSS_EE = records.reduce((sum, r) => sum + Number(r.inssEmployee), 0);
    const totalINSS_ER = records.reduce((sum, r) => sum + Number(r.inssEmployer), 0);
    const totalIRM = records.reduce((sum, r) => sum + Number(r.irm), 0);
    const totalNet = records.reduce((sum, r) => sum + Number(r.netSalary), 0);
    const totalAdditions = records.reduce((sum, r) => sum + Number(r.transportSubsidy) + Number(r.foodSubsidy) + Number(r.overtimeAmount) + Number(r.bonusAmount), 0);

    const lines: any[] = [
      { accountId: '6.2.2', debit: totalGross, credit: 0, description: `Salários Base - ${month}/${year}` },
      { accountId: '6.2.3', debit: totalINSS_ER, credit: 0, description: `Encargos INSS (3%) - ${month}/${year}` },
      { accountId: '4.4.2.1', debit: 0, credit: totalIRM, description: `Retenção IRPS - ${month}/${year}` },
      { accountId: '4.4.9', debit: 0, credit: totalINSS_EE + totalINSS_ER, description: `Contribuição INSS (7%) - ${month}/${year}` },
      { accountId: '4.6.2.2', debit: 0, credit: totalNet, description: `Salários Líquidos a Pagar - ${month}/${year}` },
    ];

    // Handle subsidies if they exist
    if (totalAdditions > 0) {
      lines.push({ accountId: '6.2.9', debit: totalAdditions, credit: 0, description: `Subsídios e Suplementos - ${month}/${year}` });
    }

    try {
      // Debit side:  6.2.2 (Gross)  +  6.2.3 (INSS_ER)  [+6.2.9 if subsidies]
      // Credit side: 4.4.2.1 (IRPS) + 4.4.9 (INSS total) + 4.6.2.2 (Net)
      const debitTotal = totalGross + totalINSS_ER + (totalAdditions > 0 ? totalAdditions : 0);
      const creditTotal = totalIRM + (totalINSS_EE + totalINSS_ER) + totalNet;
      const diff = Math.round((debitTotal - creditTotal) * 100) / 100;
      // Absorb rounding into net-to-pay line if needed
      if (Math.abs(diff) > 0) {
        lines[4].credit += diff;
      }

      const entry = await this.accountingService.createJournalEntry({
        date: new Date(year, month, 0).toISOString().split('T')[0],
        description: `Processamento de Salários - Período ${month}/${year}`,
        reference: `FOLHA-${month}-${year}`,
        status: JournalEntryStatus.POSTED,
        companyId: targetCompanyId,
        lines: lines.map((l, i) => ({
          ...l,
          id: `PL-${month}-${year}-${targetCompanyId}-${i}`,
          index: i + 1
        }))
      });

      // Update records
      for (const r of records) {
        r.status = PayrollStatus.POSTED;
        r.journalEntryId = entry.id;
        await this.payrollRepo.save(r);
      }

      return { success: true, entryId: entry.id };
    } catch (e) {
      console.error('[Payroll] Accounting Post Failed:', e);
      return { success: false, error: e.message };
    }
  }
}
