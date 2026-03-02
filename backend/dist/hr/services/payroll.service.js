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
const accounting_service_1 = require("../../accounting/accounting.service");
const tenancy_context_1 = require("../../tenancy/tenancy.context");
const journal_entry_entity_1 = require("../../accounting/entities/journal-entry.entity");
let PayrollService = class PayrollService {
    employeeRepo;
    payrollRepo;
    accountingService;
    constructor(employeeRepo, payrollRepo, accountingService) {
        this.employeeRepo = employeeRepo;
        this.payrollRepo = payrollRepo;
        this.accountingService = accountingService;
    }
    calculateIRM(taxableAmount) {
        if (taxableAmount <= 0)
            return 0;
        if (taxableAmount <= 3500) {
            return taxableAmount * 0.10;
        }
        else if (taxableAmount <= 14000) {
            return (taxableAmount * 0.15) - 175;
        }
        else if (taxableAmount <= 42000) {
            return (taxableAmount * 0.20) - 875;
        }
        else if (taxableAmount <= 126000) {
            return (taxableAmount * 0.25) - 2975;
        }
        else {
            return (taxableAmount * 0.32) - 11795;
        }
    }
    calculateINSS(grossSalary) {
        return {
            employee: grossSalary * 0.04,
            employer: grossSalary * 0.03,
        };
    }
    async processPayroll(year, month, companyId) {
        const targetCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const employees = await this.employeeRepo.find({ where: { companyId: targetCompanyId, isActive: true } });
        const results = [];
        for (const emp of employees) {
            const gross = Number(emp.salaryBase) || 0;
            const inss = this.calculateINSS(gross);
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
                status: payroll_entity_1.PayrollStatus.DRAFT,
            });
            results.push(await this.payrollRepo.save(record));
        }
        return results;
    }
    async postPayrollToAccounting(year, month, companyId) {
        const targetCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const records = await this.payrollRepo.find({
            where: { companyId: targetCompanyId, year, month, status: payroll_entity_1.PayrollStatus.DRAFT }
        });
        if (records.length === 0)
            return { success: false, message: 'No draft payroll records found for this period' };
        const totalGross = records.reduce((sum, r) => sum + Number(r.grossSalary), 0);
        const totalINSS_EE = records.reduce((sum, r) => sum + Number(r.inssEmployee), 0);
        const totalINSS_ER = records.reduce((sum, r) => sum + Number(r.inssEmployer), 0);
        const totalIRM = records.reduce((sum, r) => sum + Number(r.irm), 0);
        const totalNet = records.reduce((sum, r) => sum + Number(r.netSalary), 0);
        const totalAdditions = records.reduce((sum, r) => sum + Number(r.transportSubsidy) + Number(r.foodSubsidy) + Number(r.overtimeAmount) + Number(r.bonusAmount), 0);
        const lines = [
            { accountId: '6.2.2', debit: totalGross, credit: 0, description: `Salários Base - ${month}/${year}` },
            { accountId: '6.2.3', debit: totalINSS_ER, credit: 0, description: `Encargos INSS (3%) - ${month}/${year}` },
            { accountId: '4.4.2.1', debit: 0, credit: totalIRM, description: `Retenção IRPS - ${month}/${year}` },
            { accountId: '4.4.9', debit: 0, credit: totalINSS_EE + totalINSS_ER, description: `Contribuição INSS (7%) - ${month}/${year}` },
            { accountId: '4.6.2.2', debit: 0, credit: totalNet, description: `Salários Líquidos a Pagar - ${month}/${year}` },
        ];
        if (totalAdditions > 0) {
            lines.push({ accountId: '6.2.9', debit: totalAdditions, credit: 0, description: `Subsídios e Suplementos - ${month}/${year}` });
        }
        try {
            const debitTotal = totalGross + totalINSS_ER + (totalAdditions > 0 ? totalAdditions : 0);
            const creditTotal = totalIRM + (totalINSS_EE + totalINSS_ER) + totalNet;
            const diff = Math.round((debitTotal - creditTotal) * 100) / 100;
            if (Math.abs(diff) > 0) {
                lines[4].credit += diff;
            }
            const entry = await this.accountingService.createJournalEntry({
                date: new Date(year, month, 0).toISOString().split('T')[0],
                description: `Processamento de Salários - Período ${month}/${year}`,
                reference: `FOLHA-${month}-${year}`,
                status: journal_entry_entity_1.JournalEntryStatus.POSTED,
                companyId: targetCompanyId,
                lines: lines.map((l, i) => ({
                    ...l,
                    id: `PL-${month}-${year}-${targetCompanyId}-${i}`,
                    index: i + 1
                }))
            });
            for (const r of records) {
                r.status = payroll_entity_1.PayrollStatus.POSTED;
                r.journalEntryId = entry.id;
                await this.payrollRepo.save(r);
            }
            return { success: true, entryId: entry.id };
        }
        catch (e) {
            console.error('[Payroll] Accounting Post Failed:', e);
            return { success: false, error: e.message };
        }
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(1, (0, typeorm_1.InjectRepository)(payroll_entity_1.Payroll)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        accounting_service_1.AccountingService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map