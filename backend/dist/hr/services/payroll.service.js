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
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const employee_entity_1 = require("../entities/employee.entity");
const payroll_entity_1 = require("../entities/payroll.entity");
const hr_settings_entity_1 = require("../entities/hr-settings.entity");
const accounting_service_1 = require("../../accounting/accounting.service");
const tenancy_service_1 = require("../../tenancy/tenancy.service");
const tenancy_context_1 = require("../../tenancy/tenancy.context");
const journal_entry_entity_1 = require("../../accounting/entities/journal-entry.entity");
let PayrollService = class PayrollService {
    defaultEmployeeRepo;
    defaultPayrollRepo;
    defaultTaxBracketRepo;
    defaultHRSettingsRepo;
    accountingService;
    tenancyService;
    constructor(defaultEmployeeRepo, defaultPayrollRepo, defaultTaxBracketRepo, defaultHRSettingsRepo, accountingService, tenancyService) {
        this.defaultEmployeeRepo = defaultEmployeeRepo;
        this.defaultPayrollRepo = defaultPayrollRepo;
        this.defaultTaxBracketRepo = defaultTaxBracketRepo;
        this.defaultHRSettingsRepo = defaultHRSettingsRepo;
        this.accountingService = accountingService;
        this.tenancyService = tenancyService;
    }
    async getRepo(entity, defaultRepo, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }
    getEmployeeRepo(companyId) {
        return this.getRepo(employee_entity_1.Employee, this.defaultEmployeeRepo, companyId);
    }
    getPayrollRepo(companyId) {
        return this.getRepo(payroll_entity_1.Payroll, this.defaultPayrollRepo, companyId);
    }
    getTaxBracketRepo(companyId) {
        return this.getRepo(hr_settings_entity_1.TaxBracket, this.defaultTaxBracketRepo, companyId);
    }
    getHRSettingsRepo(companyId) {
        return this.getRepo(hr_settings_entity_1.HRSettings, this.defaultHRSettingsRepo, companyId);
    }
    calculateIRPS(taxableAmount, brackets, dependents = 0) {
        if (taxableAmount <= 0 || !brackets || !brackets.length)
            return 0;
        for (const b of brackets) {
            if (taxableAmount >= Number(b.minAmount) && (!b.maxAmount || taxableAmount <= Number(b.maxAmount))) {
                let deduction = Number(b.deduction0 || 0);
                if (dependents === 1)
                    deduction = Number(b.deduction1 || 0);
                else if (dependents === 2)
                    deduction = Number(b.deduction2 || 0);
                else if (dependents === 3)
                    deduction = Number(b.deduction3 || 0);
                else if (dependents >= 4)
                    deduction = Number(b.deduction4Plus || 0);
                const rate = Number(b.rate || 0);
                const tax = (taxableAmount * (rate / 100)) - deduction;
                const result = Math.max(0, tax);
                return isNaN(result) ? 0 : result;
            }
        }
        return 0;
    }
    calculateINSS(grossSalary, settings) {
        return {
            employee: grossSalary * (Number(settings.inssEmployeeRate) / 100),
            employer: grossSalary * (Number(settings.inssEmployerRate) / 100),
        };
    }
    async processPayroll(year, month, companyId) {
        const targetCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
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
        const results = [];
        for (const emp of employees) {
            const grossSalary = Number(emp.salaryBase) || 0;
            const transport = Number(emp.subsidyTransport) || 0;
            const food = Number(emp.subsidyFood) || 0;
            const housing = Number(emp.subsidyHousing) || 0;
            const taxableGross = grossSalary + housing;
            const inss = this.calculateINSS(taxableGross, settings);
            const irpsBase = taxableGross - inss.employee;
            const irps = this.calculateIRPS(irpsBase, brackets, emp.dependents || 0);
            const net = (grossSalary + transport + food + housing) - inss.employee - irps;
            const recordId = `PAY-${emp.code}-${year}-${String(month).padStart(2, '0')}`;
            const existing = await payRepo.findOne({ where: { id: recordId } });
            if (existing && existing.status === payroll_entity_1.PayrollStatus.POSTED) {
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
                daysWorked: 30,
                netSalary: net,
                status: payroll_entity_1.PayrollStatus.DRAFT,
            });
            results.push(await payRepo.save(record));
        }
        return results;
    }
    async postPayrollToAccounting(year, month, companyId) {
        const targetCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const payRepo = await this.getPayrollRepo(targetCompanyId);
        const records = await payRepo.find({
            where: { companyId: targetCompanyId, year, month, status: payroll_entity_1.PayrollStatus.DRAFT },
        });
        if (records.length === 0) {
            return { success: false, message: 'Nenhum registo em rascunho encontrado para este período. Gere a folha primeiro.' };
        }
        const totalGross = records.reduce((s, r) => s + Number(r.grossSalary), 0);
        const totalINSS_EE = records.reduce((s, r) => s + Number(r.inssEmployee), 0);
        const totalINSS_ER = records.reduce((s, r) => s + Number(r.inssEmployer), 0);
        const totalIRPS = records.reduce((s, r) => s + Number(r.irps), 0);
        const totalNet = records.reduce((s, r) => s + Number(r.netSalary), 0);
        const totalSubsidies = records.reduce((s, r) => s + Number(r.transportSubsidy) + Number(r.foodSubsidy) + Number(r.overtimeAmount) + Number(r.bonusAmount), 0);
        const lines = [
            { accountId: '6.2.2', debit: totalGross, credit: 0, description: `Salários Base - ${month}/${year}` },
            { accountId: '6.2.3', debit: totalINSS_ER, credit: 0, description: `Encargos INSS Patronal (4%) - ${month}/${year}` },
            { accountId: '4.4.2.1', debit: 0, credit: totalIRPS, description: `Retenção IRPS - ${month}/${year}` },
            { accountId: '4.4.9', debit: 0, credit: totalINSS_EE + totalINSS_ER, description: `INSS Total (7%) - ${month}/${year}` },
            { accountId: '4.6.2.2', debit: 0, credit: totalNet, description: `Salários Líquidos a Pagar - ${month}/${year}` },
        ];
        if (totalSubsidies > 0) {
            lines.push({ accountId: '6.2.9', debit: totalSubsidies, credit: 0, description: `Subsídios e Suplementos - ${month}/${year}` });
        }
        const debitTotal = totalGross + totalINSS_ER + (totalSubsidies > 0 ? totalSubsidies : 0);
        const creditTotal = totalIRPS + (totalINSS_EE + totalINSS_ER) + totalNet;
        const diff = Math.round((debitTotal - creditTotal) * 100) / 100;
        if (Math.abs(diff) > 0) {
            lines[4].credit += diff;
        }
        try {
            const entry = await this.accountingService.createJournalEntry({
                date: new Date(year, month - 1, 1).toISOString().split('T')[0],
                description: `Processamento de Salários - Período ${month}/${year}`,
                reference: `FOLHA-${String(month).padStart(2, '0')}-${year}`,
                status: journal_entry_entity_1.JournalEntryStatus.POSTED,
                companyId: targetCompanyId,
                lines: lines.map((l, i) => ({
                    ...l,
                    id: `PL-${month}-${year}-${targetCompanyId}-${i}`,
                    index: i + 1,
                })),
            });
            for (const r of records) {
                r.status = payroll_entity_1.PayrollStatus.POSTED;
                r.journalEntryId = entry.id;
                await payRepo.save(r);
            }
            return { success: true, entryId: entry.id, processed: records.length };
        }
        catch (e) {
            console.error('[Payroll] Accounting Post Failed:', e);
            return { success: false, error: e.message };
        }
    }
    async getPayrollReportData(year, month, companyId) {
        const cid = companyId || tenancy_context_1.TenancyContext.getCompanyId();
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
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(1, (0, typeorm_1.InjectRepository)(payroll_entity_1.Payroll)),
    __param(2, (0, typeorm_1.InjectRepository)(hr_settings_entity_1.TaxBracket)),
    __param(3, (0, typeorm_1.InjectRepository)(hr_settings_entity_1.HRSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        accounting_service_1.AccountingService,
        tenancy_service_1.TenancyService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map