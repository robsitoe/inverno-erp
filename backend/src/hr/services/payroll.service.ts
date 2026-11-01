import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { WorkflowService } from '../../common/workflow.service';

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
    private readonly workflowService: WorkflowService,
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

  /** Dia de calendário em UTC: as contas de dias não sofrem com o fuso horário. */
  private dayUTC(d: string | Date): number {
    if (d instanceof Date) return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, dd);
  }

  private round2(v: number): number {
    return Math.round((Number(v) || 0) * 100) / 100;
  }

  /** Folhas que já saíram do RH (submetidas, aprovadas, lançadas ou pagas) não se recalculam. */
  private isLocked(status?: string): boolean {
    return !!status && status !== PayrollStatus.DRAFT && status !== PayrollStatus.REJECTED;
  }

  async getPayroll(year: number, month: number, companyId?: string): Promise<Payroll[]> {
    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);
    return payRepo.find({ where: { companyId: cid, year, month }, order: { employeeCode: 'ASC' } });
  }

  /** Folhas de um funcionário (pelo id ou pelo código), da mais recente para a mais antiga. */
  async getEmployeePayrolls(employee: string, companyId?: string): Promise<Payroll[]> {
    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);
    return payRepo.find({
      where: [{ companyId: cid, employeeId: employee }, { companyId: cid, employeeCode: employee }],
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  private static readonly MONTHS =['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  /**
   * Ordem dos meses: com histórico de folhas, não se salta um mês.
   * missing  = primeiro mês anterior que nunca foi processado (bloqueia);
   * previousOpen = o mês imediatamente anterior existe mas ainda não foi lançado/pago (só aviso).
   */
  async getSequenceStatus(year: number, month: number, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);
    const target = year * 12 + (month - 1);
    const rows: { year: number; month: number; status: string }[] = await payRepo.createQueryBuilder('p')
      .select('p.year', 'year').addSelect('p.month', 'month').addSelect('p.status', 'status')
      .where('p.companyId = :cid', { cid })
      .andWhere('(p.year * 12 + p.month - 1) < :target', { target })
      .getRawMany();
    const label = (k: number) => ({ year: Math.floor(k / 12), month: (k % 12) + 1, label: `${PayrollService.MONTHS[k % 12]}/${Math.floor(k / 12)}` });
    if (!rows.length) return { ok: true, missing: null, previousOpen: null };

    const done = new Set(rows.map(r => Number(r.year) * 12 + Number(r.month) - 1));
    const first = Math.min(...done);
    let missing: any = null;
    for (let k = first; k < target; k++) {
      if (!done.has(k)) { missing = label(k); break; }
    }
    let previousOpen: any = null;
    const prev = target - 1;
    if (!missing && done.has(prev)) {
      const open = rows.filter(r => Number(r.year) * 12 + Number(r.month) - 1 === prev && r.status !== PayrollStatus.POSTED && r.status !== PayrollStatus.PAID);
      if (open.length) previousOpen = { ...label(prev), status: open[0].status };
    }
    return { ok: !missing, missing, previousOpen };
  }

  /**
   * Gera (ou recalcula) a folha do mês. Só mexe em registos em rascunho ou rejeitados;
   * horas extra e bónus lançados à mão são mantidos ao recalcular.
   */
  async processPayroll(year: number, month: number, companyId?: string, onlyEmployeeId?: string): Promise<Payroll[]> {
    const targetCompanyId = companyId || TenancyContext.getCompanyId();

    if (!targetCompanyId) {
      throw new Error('Company ID não identificado. Verifique a sessão.');
    }

    // Não se salta meses: o mês em falta tem de ser processado primeiro
    if (!onlyEmployeeId) {
      const seq = await this.getSequenceStatus(year, month, targetCompanyId);
      if (seq.missing) {
        throw new BadRequestException(`Ainda não foi processada a folha de ${seq.missing.label}. Processe primeiro esse mês: os salários são processados por ordem, sem saltar meses.`);
      }
    }

    const empRepo = await this.getEmployeeRepo(targetCompanyId);
    const payRepo = await this.getPayrollRepo(targetCompanyId);
    const bracketRepo = await this.getTaxBracketRepo(targetCompanyId);
    const settingsRepo = await this.getHRSettingsRepo(targetCompanyId);
    const absRepo = await this.getAbsenceRepo(targetCompanyId);
    const pcvRepo = await this.getPettyCashVoucherRepo(targetCompanyId);

    const brackets = await bracketRepo.find({ where: { companyId: targetCompanyId }, order: { minAmount: 'ASC' } });
    let settings = await settingsRepo.findOne({ where: { companyId: targetCompanyId } });
    if (!settings) {
      settings = settingsRepo.create({ companyId: targetCompanyId, inssEmployeeRate: 3, inssEmployerRate: 4 });
    }

    const DAY = 86400000;
    const monthStart = Date.UTC(year, month - 1, 1);
    const monthEnd = Date.UTC(year, month, 0);
    const daysInMonth = (monthEnd - monthStart) / DAY + 1;
    const overlap = (from: number, to: number) => Math.max(0, (Math.min(to, monthEnd) - Math.max(from, monthStart)) / DAY + 1);

    // Quem entra na folha do mês: activos já admitidos; e quem saiu durante o mês (recebe os dias até à saída).
    const all = await empRepo.find({ where: { companyId: targetCompanyId } });
    const employees = all.filter(emp => {
      if (onlyEmployeeId && emp.id !== onlyEmployeeId) return false;
      const hire = emp.hireDate ? this.dayUTC(emp.hireDate) : null;
      if (hire !== null && hire > monthEnd) return false;
      if (emp.isActive) return true;
      return !!emp.endDate && this.dayUTC(emp.endDate) >= monthStart;
    });

    if (employees.length === 0) {
      throw new Error('Não foram encontrados funcionários activos para esta empresa neste período.');
    }

    const results: Payroll[] = [];

    for (const emp of employees) {
      const recordId = `PAY-${emp.code}-${year}-${String(month).padStart(2, '0')}`;
      const existing = await payRepo.findOne({ where: { id: recordId } });
      if (existing && this.isLocked(existing.status)) {
        results.push(existing);
        continue;
      }

      // --- Dias ao serviço no mês (admissão / saída a meio do mês) ---
      const hire = emp.hireDate ? this.dayUTC(emp.hireDate) : monthStart;
      const exit = !emp.isActive && emp.endDate ? this.dayUTC(emp.endDate) : monthEnd;
      const employedDays = overlap(hire, exit);
      const fullMonth = employedDays >= daysInMonth;
      const factor = fullMonth ? 1 : employedDays / daysInMonth;

      const baseSalary = Number(emp.salaryBase) || 0;
      const grossSalary = this.round2(baseSalary * factor);
      const transport = this.round2((Number(emp.subsidyTransport) || 0) * factor);
      const food = this.round2((Number(emp.subsidyFood) || 0) * factor);
      const housing = this.round2((Number(emp.subsidyHousing) || 0) * factor);

      // --- Faltas e férias (só os dias dentro do mês) ---
      const absRecords = await absRepo.find({ where: { employeeId: emp.id, status: AbsenceStatus.APPROVED } });
      let absenceDays = 0;
      let vacationDays = 0;
      for (const abs of absRecords) {
        if (!abs.startDate || !abs.endDate) continue;
        const start = this.dayUTC(abs.startDate);
        const end = this.dayUTC(abs.endDate);
        const days = overlap(start, end);
        if (!days) continue;
        if (abs.type === 'VACATION' as any) {
          vacationDays += days;
          // Dias de férias a mais que o gestor decidiu descontar no salário:
          // marcador [EXCESSO:N|SALARIO] no motivo, descontado no mês em que as férias acabam.
          const exMatch = /\[EXCESSO:(\d+)\|SALARIO\]/.exec(abs.reason || '');
          if (exMatch && end >= monthStart && end <= monthEnd) {
            absenceDays += Math.min(parseInt(exMatch[1], 10) || 0, days);
          }
        } else if (abs.type === 'UNJUSTIFIED' as any) {
          absenceDays += days;
        }
      }

      const dailyRate = baseSalary / 30;
      const absenceDeduction = Math.min(grossSalary, this.round2(absenceDays * dailyRate));
      const daysWorked = Math.max(0, Math.round(30 * factor) - absenceDays);

      // --- Remunerações variáveis do mês (lançadas na folha; mantidas ao recalcular) ---
      const overtime = this.round2(Number(existing?.overtimeAmount) || 0);
      const bonus = this.round2(Number(existing?.bonusAmount) || 0);

      // Matéria colectável: salário ganho - faltas + habitação + horas extra + bónus.
      // Transporte e alimentação são pagos à parte (não entram na base, como até aqui).
      const taxableGross = Math.max(0, grossSalary - absenceDeduction + housing + overtime + bonus);
      const inss = this.calculateINSS(taxableGross, settings);
      const inssEmployee = this.round2(inss.employee);
      const inssEmployer = this.round2(inss.employer);
      const irps = this.round2(this.calculateIRPS(Math.max(0, taxableGross - inssEmployee), brackets, Number(emp.dependents || 0)));

      const netBeforeVouchers = this.round2(taxableGross + transport + food - inssEmployee - irps);

      // --- Vales de caixa (adiantamentos ao pessoal) ---
      // Reservados para este registo; só ficam "descontados" quando a folha é lançada.
      // Um vale que não caiba no líquido do mês fica para a folha seguinte.
      const vouchers = (await pcvRepo.find({
        where: { employeeId: emp.id, isPersonalAdvance: true, isDeducted: false, status: 'PAID' },
        order: { date: 'ASC' },
      })).filter(v => (!v.deductedInPayrollId || v.deductedInPayrollId === recordId) && this.dayUTC(v.date) <= monthEnd);
      let cashVoucherDeduction = 0;
      for (const v of vouchers) {
        const amount = this.round2(Number(v.amount));
        const fits = cashVoucherDeduction + amount <= netBeforeVouchers;
        const reservedTo = fits ? recordId : (null as any);
        if (fits) cashVoucherDeduction = this.round2(cashVoucherDeduction + amount);
        if (v.deductedInPayrollId !== reservedTo) {
          v.deductedInPayrollId = reservedTo;
          await pcvRepo.save(v);
        }
      }

      const record = payRepo.create({
        id: recordId,
        companyId: targetCompanyId,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.code,
        year,
        month,
        grossSalary,
        inssEmployee,
        inssEmployer,
        irps,
        transportSubsidy: transport,
        foodSubsidy: food,
        housingSubsidy: housing,
        overtimeAmount: overtime,
        bonusAmount: bonus,
        dependents: emp.dependents || 0,
        daysWorked,
        absenceDays,
        absenceDeduction,
        vacationDays,
        cashVoucherDeduction,
        netSalary: this.round2(netBeforeVouchers - cashVoucherDeduction),
        status: PayrollStatus.DRAFT,
        approvalNotes: existing?.status === PayrollStatus.REJECTED ? existing.approvalNotes : (null as any),
      });

      results.push(await payRepo.save(record));
    }

    // Rascunhos de quem já não entra neste mês (ex.: desactivado) saem da folha
    if (!onlyEmployeeId) {
      const keep = new Set(results.map(r => r.id));
      const stale = (await payRepo.find({ where: { companyId: targetCompanyId, year, month } }))
        .filter(r => !keep.has(r.id) && !this.isLocked(r.status));
      for (const r of stale) {
        const reserved = await pcvRepo.find({ where: { deductedInPayrollId: r.id, isDeducted: false } });
        for (const v of reserved) { v.deductedInPayrollId = null as any; await pcvRepo.save(v); }
        await payRepo.remove(r);
      }
    }

    return results.sort((a, b) => String(a.employeeCode).localeCompare(String(b.employeeCode)));
  }

  /** Horas extra e bónus do mês de um funcionário (só em rascunho); recalcula o registo. */
  async updatePayrollVariables(id: string, data: { overtimeAmount?: number; bonusAmount?: number }, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);
    const record = await payRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Registo da folha não encontrado.');
    if (this.isLocked(record.status)) {
      throw new BadRequestException('A folha já foi submetida. Só se alteram valores em rascunho ou depois de rejeitada.');
    }
    for (const k of ['overtimeAmount', 'bonusAmount'] as const) {
      if (data[k] === undefined) continue;
      const v = Number(data[k]);
      if (!isFinite(v) || v < 0) throw new BadRequestException('Os valores têm de ser números positivos.');
      (record as any)[k] = this.round2(v);
    }
    await payRepo.save(record);
    const [updated] = await this.processPayroll(record.year, record.month, cid, record.employeeId);
    return updated;
  }

  // ── Post to Accounting ─────────────────────────────────────────────────────

  async postPayrollToAccounting(year: number, month: number, companyId?: string, user?: any) {
    const targetCompanyId = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(targetCompanyId);

    // Segregação de funções: só folhas APROVADAS podem ser lançadas.
    const records = await payRepo.find({
      where: { companyId: targetCompanyId, year, month, status: PayrollStatus.APPROVED },
    });

    if (records.length === 0) {
      const pending = await payRepo.count({ where: { companyId: targetCompanyId, year, month } });
      if (pending === 0) {
        return { success: false, message: 'Nenhum registo encontrado para este período. Gere a folha primeiro.' };
      }
      return { success: false, message: 'Folha não aprovada. Submeta para aprovação e aguarde a decisão antes de lançar.' };
    }

    const totalGross = records.reduce((s, r) => s + Number(r.grossSalary), 0);
    const totalINSS_EE = records.reduce((s, r) => s + Number(r.inssEmployee), 0);
    const totalINSS_ER = records.reduce((s, r) => s + Number(r.inssEmployer), 0);
    const totalIRPS = records.reduce((s, r) => s + Number(r.irps), 0);
    const totalNet = records.reduce((s, r) => s + Number(r.netSalary), 0);
    const totalSubsidies = records.reduce(
      (s, r) => s + Number(r.transportSubsidy || 0) + Number(r.foodSubsidy || 0) + Number(r.housingSubsidy || 0)
        + Number(r.overtimeAmount || 0) + Number(r.bonusAmount || 0), 0
    );
    const totalAbsenceDeduction = records.reduce((s, r) => s + Number((r as any).absenceDeduction || 0), 0);

    const lines: any[] = [
      { accountId: '6.2.2', debit: totalGross - totalAbsenceDeduction, credit: 0, description: `Salários Base (Líquido de Faltas) - ${month}/${year}` },
      { accountId: '6.2.3', debit: totalINSS_ER, credit: 0, description: `Encargos INSS Patronal - ${month}/${year}` },
      { accountId: '4.4.2.1', debit: 0, credit: totalIRPS, description: `Retenção IRPS - ${month}/${year}` },
      { accountId: '4.4.9', debit: 0, credit: totalINSS_EE + totalINSS_ER, description: `INSS Total (trabalhador + entidade) - ${month}/${year}` },
      { accountId: '4.6.2.2', debit: 0, credit: totalNet, description: `Salários Líquidos a Pagar - ${month}/${year}` },
    ];

    if (totalSubsidies > 0) {
      lines.push({ accountId: '6.2.9', debit: totalSubsidies, credit: 0, description: `Subsídios, horas extra e bónus - ${month}/${year}` });
    }

    // Vales de caixa descontados: saldam o adiantamento ao pessoal (a conta debitada quando o vale foi pago)
    const pcvRepo = await this.getPettyCashVoucherRepo(targetCompanyId);
    const recordIds = records.map(r => r.id);
    const deducted = recordIds.length
      ? (await pcvRepo.find({ where: { isDeducted: false } })).filter(v => v.deductedInPayrollId && recordIds.includes(v.deductedInPayrollId))
      : [];
    const byAccount = new Map<string, number>();
    for (const v of deducted) {
      const acc = v.debitAccount || '4.5.1.2';
      byAccount.set(acc, (byAccount.get(acc) || 0) + Number(v.amount || 0));
    }
    for (const [acc, amount] of byAccount) {
      lines.push({ accountId: acc, debit: 0, credit: this.round2(amount), description: `Vales/adiantamentos descontados nos salários - ${month}/${year}` });
    }

    // Os lançamentos têm de bater; só a diferença de arredondamento (cêntimos) vai para o líquido a pagar.
    const debitTotal = lines.reduce((s2, l) => s2 + (Number(l.debit) || 0), 0);
    const creditTotal = lines.reduce((s2, l) => s2 + (Number(l.credit) || 0), 0);
    const diff = Math.round((debitTotal - creditTotal) * 100) / 100;
    if (Math.abs(diff) >= 1) {
      return { success: false, message: `A folha não bate certo com a contabilidade (diferença de ${diff.toFixed(2)} MT). Volte a gerar a folha antes de lançar.` };
    }
    if (Math.abs(diff) > 0) {
      lines[4].credit = Math.round((lines[4].credit + diff) * 100) / 100;
    }

    try {
      const entry = await this.accountingService.createJournalEntry({
        // Last day of the payroll month, built as a plain string to avoid the
        // UTC rollback bug (local midnight Jan 1 UTC+2 -> "2025-12-31" in ISO).
        date: `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`,
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
      for (const v of deducted) {
        v.isDeducted = true;
        await pcvRepo.save(v);
      }

      await this.workflowService.recordHistory({
        documentId: `FOLHA-${String(month).padStart(2, '0')}-${year}-${targetCompanyId}`,
        documentType: 'PAYROLL', fromStatus: 'APPROVED', toStatus: 'POSTED',
        user: user || { id: 'system', name: 'Sistema' }, companyId: targetCompanyId,
      });

      return { success: true, entryId: entry.id, processed: records.length };
    } catch (e: any) {
      console.error('[Payroll] Accounting Post Failed:', e);
      return { success: false, error: e.message };
    }
  }


  // ── Workflow da folha (segregação de funções) ──────────────────────────────

  private payrollDocId(year: number, month: number, companyId: string) {
    return `FOLHA-${String(month).padStart(2, '0')}-${year}-${companyId}`;
  }

  /** RH submete a folha gerada para aprovação. */
  async submitPayroll(year: number, month: number, companyId: string | undefined, user: any) {
    const cid = companyId || TenancyContext.getCompanyId();
    const seq = await this.getSequenceStatus(year, month, cid);
    if (seq.missing) {
      return { success: false, message: `Ainda não foi processada a folha de ${seq.missing.label}. Processe e submeta primeiro esse mês.` };
    }
    const payRepo = await this.getPayrollRepo(cid);
    const records = await payRepo.find({
      where: [
        { companyId: cid, year, month, status: PayrollStatus.DRAFT },
        { companyId: cid, year, month, status: PayrollStatus.REJECTED },
      ],
    });
    if (records.length === 0) {
      return { success: false, message: 'Nenhum registo em rascunho/rejeitado para submeter. Gere a folha primeiro.' };
    }
    for (const r of records) {
      r.status = PayrollStatus.SUBMITTED;
      await payRepo.save(r);
    }
    await this.workflowService.recordHistory({
      documentId: this.payrollDocId(year, month, cid!), documentType: 'PAYROLL',
      fromStatus: 'DRAFT', toStatus: 'SUBMITTED', user, companyId: cid,
    });
    return { success: true, submitted: records.length };
  }

  /** Aprovador (ex.: diretor) aprova a folha submetida. */
  async approvePayroll(year: number, month: number, companyId: string | undefined, user: any, notes?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);
    const records = await payRepo.find({ where: { companyId: cid, year, month, status: PayrollStatus.SUBMITTED } });
    if (records.length === 0) {
      return { success: false, message: 'Nenhuma folha submetida para aprovar neste período.' };
    }
    const approver = user?.name || user?.username || user?.userId || 'desconhecido';
    for (const r of records) {
      r.status = PayrollStatus.APPROVED;
      r.approvedBy = approver;
      r.approvedAt = new Date();
      if (notes) r.approvalNotes = notes;
      await payRepo.save(r);
    }
    await this.workflowService.recordHistory({
      documentId: this.payrollDocId(year, month, cid!), documentType: 'PAYROLL',
      fromStatus: 'SUBMITTED', toStatus: 'APPROVED', user, notes, companyId: cid,
    });
    return { success: true, approved: records.length };
  }

  /** Aprovador rejeita a folha (volta a editável pelo RH). Notas obrigatórias. */
  async rejectPayroll(year: number, month: number, companyId: string | undefined, user: any, notes: string) {
    if (!notes || !notes.trim()) {
      return { success: false, message: 'Indique o motivo da rejeição.' };
    }
    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);
    const records = await payRepo.find({ where: { companyId: cid, year, month, status: PayrollStatus.SUBMITTED } });
    if (records.length === 0) {
      return { success: false, message: 'Nenhuma folha submetida para rejeitar neste período.' };
    }
    for (const r of records) {
      r.status = PayrollStatus.REJECTED;
      r.approvalNotes = notes;
      await payRepo.save(r);
    }
    await this.workflowService.recordHistory({
      documentId: this.payrollDocId(year, month, cid!), documentType: 'PAYROLL',
      fromStatus: 'SUBMITTED', toStatus: 'REJECTED', user, notes, companyId: cid,
    });
    return { success: true, rejected: records.length };
  }

  /**
   * Tesoureiro paga os salários líquidos: lança 4.6.2.2 (débito) contra a
   * conta de tesouraria escolhida (crédito) e marca os registos como PAID.
   * Referência FOLHA-PAG-MM-YYYY (formato estável usado pelo frontend).
   */
  async payPayroll(year: number, month: number, paymentAccountCode: string, companyId: string | undefined, user: any) {
    // Conta de caixa (1.1...) ou de banco de movimento (1.2.x); a contabilidade recusa contas de soma.
    const accCode = String(paymentAccountCode || '').trim();
    if (!/^1\.[12](\.|$)/.test(accCode)) {
      return { success: false, message: 'Escolha uma conta de caixa ou de banco (classe 1.1 / 1.2) para pagar os salários.' };
    }

    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);
    const records = await payRepo.find({ where: { companyId: cid, year, month, status: PayrollStatus.POSTED } });
    if (records.length === 0) {
      const paid = await payRepo.count({ where: { companyId: cid, year, month, status: PayrollStatus.PAID } });
      if (paid > 0) return { success: false, message: 'Os salários deste período já foram pagos.' };
      return { success: false, message: 'A folha tem de estar LANÇADA na contabilidade antes do pagamento.' };
    }

    const totalNet = records.reduce((s2, r) => s2 + Number(r.netSalary || 0), 0);
    const ref = `FOLHA-PAG-${String(month).padStart(2, '0')}-${year}`;

    try {
      const entry = await this.accountingService.createJournalEntry({
        date: new Date().toISOString().split('T')[0],
        description: `Pagamento de Salários - ${month}/${year}`,
        reference: ref,
        status: JournalEntryStatus.POSTED,
        companyId: cid,
        lines: [
          { id: `${ref}-${cid}-1`, accountId: '4.6.2.2', debit: totalNet, credit: 0, description: `Liquidação salários ${month}/${year}` },
          { id: `${ref}-${cid}-2`, accountId: accCode, debit: 0, credit: totalNet, description: `Pagamento salários ${month}/${year}` },
        ],
      } as any);

      for (const r of records) {
        r.status = PayrollStatus.PAID;
        r.paymentDate = new Date().toISOString().split('T')[0] as any;
        await payRepo.save(r);
      }

      await this.workflowService.recordHistory({
        documentId: this.payrollDocId(year, month, cid!), documentType: 'PAYROLL',
        fromStatus: 'POSTED', toStatus: 'PAID', user, companyId: cid,
        notes: `Pago pela conta ${accCode} — ${totalNet.toFixed(2)} MT`,
      });

      return { success: true, entryId: entry.id, paid: records.length, total: totalNet };
    } catch (e: any) {
      console.error('[Payroll] Payment posting failed:', e);
      return { success: false, error: e.message };
    }
  }

  async getPayrollWorkflowHistory(year: number, month: number, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    return this.workflowService.getHistory(this.payrollDocId(year, month, cid!));
  }

  async getPayrollReportData(year: number, month: number, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const payRepo = await this.getPayrollRepo(cid);

    const records = await payRepo.find({
      where: { companyId: cid, year, month },
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
      acc.housingSubsidy += Number(curr.housingSubsidy || 0);
      acc.overtimeAmount += Number(curr.overtimeAmount || 0);
      acc.cashVoucherDeduction += Number(curr.cashVoucherDeduction || 0);
      acc.absenceDeduction += Number(curr.absenceDeduction || 0);
      return acc;
    }, {
      grossSalary: 0, inssEmployee: 0, inssEmployer: 0,
      irps: 0, netSalary: 0, transportSubsidy: 0, foodSubsidy: 0,
      bonusAmount: 0, housingSubsidy: 0, overtimeAmount: 0, cashVoucherDeduction: 0, absenceDeduction: 0
    });

    return { records, totals };
  }
}
