import { Injectable } from '@angular/core';
import { Account, JournalEntry, JournalLine, SalesDocument, Article, AuditLog, Journal, FinancialReportConfig } from './models';
import { DEFAULT_ACCOUNTS, DEFAULT_JOURNALS } from './sample-data';
import { DataService } from '../services/data.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AccountingService {
    private allAccounts: Account[] = [];
    private accounts: Account[] = [];

    private allJournalEntries: JournalEntry[] = [];
    private journalEntries: JournalEntry[] = [];

    private allJournals: Journal[] = [];
    private journals: Journal[] = [];

    private allAuditLogs: AuditLog[] = [];
    private auditLogs: AuditLog[] = [];

    private allReportConfigs: FinancialReportConfig[] = [];
    private reportConfigs: FinancialReportConfig[] = [];

    private nextJournalId = 1;
    private activeCompanyId: string | null = null;

    constructor(private dataService: DataService) {
        const storedCompany = localStorage.getItem('erp_company_info');
        if (storedCompany) {
            this.activeCompanyId = JSON.parse(storedCompany).id;
        }
        this.loadData();
    }

    public async loadData() {
        await this.loadAccounts();
        await this.loadJournals();
        await this.loadJournalEntries();
        this.loadAuditLogs();
        this.loadReportConfigs();
    }

    private async loadAccounts() {
        try {
            this.allAccounts = await lastValueFrom(this.dataService.getAccounts());
            if (this.allAccounts.length === 0) {
                // this.saveAccounts(); // Don't save default accounts immediately to backend? Or iterate.
                // Assuming defaults are fine or will be saved on demand.
            }
        } catch (e) {
            this.allAccounts = [...DEFAULT_ACCOUNTS];
        }
        this.accounts = this.filterByCompany(this.allAccounts);
    }

    private async loadJournals() {
        try {
            this.allJournals = await lastValueFrom(this.dataService.getJournals());
            if (this.allJournals.length === 0) {
                this.allJournals = [...DEFAULT_JOURNALS];
                // this.saveJournals();
            }
        } catch (e) {
            this.allJournals = [...DEFAULT_JOURNALS];
        }
        this.journals = this.filterByCompany(this.allJournals);
    }

    private async loadJournalEntries() {
        try {
            this.allJournalEntries = await lastValueFrom(this.dataService.getJournalEntries());
            const maxId = Math.max(...this.allJournalEntries.map(e => parseInt(e.id.replace('JE', '')) || 0), 0);
            this.nextJournalId = maxId + 1;
        } catch (e) {
            this.allJournalEntries = [];
        }
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
    }

    private loadAuditLogs() {
        const stored = localStorage.getItem('erp_audit_logs');
        if (stored) {
            this.allAuditLogs = JSON.parse(stored);
        }
        this.auditLogs = this.filterByCompany(this.allAuditLogs);
    }

    private loadReportConfigs() {
        const stored = localStorage.getItem('erp_report_configs');
        if (stored) {
            this.allReportConfigs = JSON.parse(stored);
        } else {
            this.initializeDefaultReports();
        }
        // Report configs might be global or company specific? 
        // Let's assume they can be company specific but default to global.
        // For now, filter them too.
        this.reportConfigs = this.filterByCompany(this.allReportConfigs);
        if (this.reportConfigs.length === 0 && this.allReportConfigs.length > 0) {
            // If no configs for this company, maybe copy defaults?
            // Or just show nothing. Let's stick to strict isolation.
        }
    }

    private filterByCompany<T extends { companyId?: string }>(list: T[]): T[] {
        if (!this.activeCompanyId) return list;
        return list.filter(item => !item.companyId || item.companyId === this.activeCompanyId);
    }

    private initializeDefaultReports() {
        const defaults: FinancialReportConfig[] = [
            {
                id: `BS_DEFAULT_${this.activeCompanyId || 'GLOBAL'}`,
                companyId: this.activeCompanyId || undefined,
                code: 'BALANCE_SHEET',
                name: 'Balanço',
                isSystem: true,
                sections: [
                    {
                        id: 'SEC_ASSETS',
                        name: 'Ativo',
                        order: 1,
                        type: 'ASSET',
                        totalLabel: 'Total do Ativo',
                        lines: [
                            { id: 'L1', name: 'Ativos Fixos Tangíveis', order: 1, accountRanges: ['43'], visible: true },
                            { id: 'L2', name: 'Ativos Intangíveis', order: 2, accountRanges: ['44'], visible: true },
                            { id: 'L3', name: 'Inventários', order: 3, accountRanges: ['3'], visible: true },
                            { id: 'L4', name: 'Clientes', order: 4, accountRanges: ['21'], visible: true },
                            { id: 'L5', name: 'Estado e Outros Entes Públicos', order: 5, accountRanges: ['24'], visible: true },
                            { id: 'L6', name: 'Caixa e Depósitos Bancários', order: 6, accountRanges: ['1'], visible: true },
                            { id: 'L7', name: 'Outros Ativos', order: 7, accountRanges: [], visible: true } // Catch-all logic needed? Or explicit ranges
                        ]
                    },
                    {
                        id: 'SEC_EQUITY',
                        name: 'Capital Próprio',
                        order: 2,
                        type: 'EQUITY',
                        totalLabel: 'Total do Capital Próprio',
                        lines: [
                            { id: 'L8', name: 'Capital Subscrito', order: 1, accountRanges: ['51'], visible: true },
                            { id: 'L9', name: 'Reservas', order: 2, accountRanges: ['55', '56'], visible: true },
                            { id: 'L10', name: 'Resultados Transitados', order: 3, accountRanges: ['56'], visible: true },
                            { id: 'L11', name: 'Resultado Líquido do Período', order: 4, accountRanges: ['818'], visible: true } // Usually calculated or specific account
                        ]
                    },
                    {
                        id: 'SEC_LIABILITIES',
                        name: 'Passivo',
                        order: 3,
                        type: 'LIABILITY',
                        totalLabel: 'Total do Passivo',
                        lines: [
                            { id: 'L12', name: 'Fornecedores', order: 1, accountRanges: ['22'], visible: true },
                            { id: 'L13', name: 'Estado e Outros Entes Públicos', order: 2, accountRanges: ['24'], visible: true },
                            { id: 'L14', name: 'Financiamentos Obtidos', order: 3, accountRanges: ['25'], visible: true },
                            { id: 'L15', name: 'Outros Passivos', order: 4, accountRanges: ['26', '27'], visible: true }
                        ]
                    }
                ]
            },
            {
                id: `IS_DEFAULT_${this.activeCompanyId || 'GLOBAL'}`,
                companyId: this.activeCompanyId || undefined,
                code: 'INCOME_STATEMENT',
                name: 'Demonstração de Resultados',
                isSystem: true,
                sections: [
                    {
                        id: 'SEC_REVENUE',
                        name: 'Rendimentos',
                        order: 1,
                        type: 'REVENUE',
                        totalLabel: 'Total de Rendimentos',
                        lines: [
                            { id: 'L16', name: 'Vendas e Serviços Prestados', order: 1, accountRanges: ['71', '72'], visible: true },
                            { id: 'L17', name: 'Subsídios à Exploração', order: 2, accountRanges: ['75'], visible: true },
                            { id: 'L18', name: 'Outros Rendimentos', order: 3, accountRanges: ['78'], visible: true }
                        ]
                    },
                    {
                        id: 'SEC_EXPENSES',
                        name: 'Gastos',
                        order: 2,
                        type: 'EXPENSE',
                        totalLabel: 'Total de Gastos',
                        lines: [
                            { id: 'L19', name: 'Custo das Mercadorias Vendidas e Matérias Consumidas', order: 1, accountRanges: ['61'], visible: true },
                            { id: 'L20', name: 'Fornecimentos e Serviços Externos', order: 2, accountRanges: ['62'], visible: true },
                            { id: 'L21', name: 'Gastos com o Pessoal', order: 3, accountRanges: ['63'], visible: true },
                            { id: 'L22', name: 'Gastos de Depreciação e Amortização', order: 4, accountRanges: ['64'], visible: true },
                            { id: 'L23', name: 'Outros Gastos', order: 5, accountRanges: ['68'], visible: true }
                        ]
                    }
                ]
            }
        ];

        this.allReportConfigs.push(...defaults);
        this.reportConfigs = this.filterByCompany(this.allReportConfigs);
        this.saveReportConfigs();
    }

    private saveReportConfigs() {
        localStorage.setItem('erp_report_configs', JSON.stringify(this.allReportConfigs));
    }

    private saveAuditLogs() {
        localStorage.setItem('erp_audit_logs', JSON.stringify(this.allAuditLogs));
    }

    // Audit Helper
    private logAudit(
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'REVERSE' | 'CORRECT',
        entityType: 'JOURNAL_ENTRY' | 'SALES_DOCUMENT' | 'ACCOUNT' | 'JOURNAL',
        entityId: string,
        details: string,
        userId: string = 'SYSTEM',
        reason?: string,
        previousState?: any,
        newState?: any
    ) {
        const log: AuditLog = {
            id: `LOG${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            companyId: this.activeCompanyId || undefined,
            entityType: entityType as any,
            entityId,
            action,
            userId,
            timestamp: new Date(),
            details,
            reason,
            previousState,
            newState
        };
        this.allAuditLogs.push(log);
        this.auditLogs = this.filterByCompany(this.allAuditLogs);
        this.saveAuditLogs();
    }

    getAccounts(): Account[] {
        return this.accounts;
    }

    getAccount(id: string): Account | undefined {
        return this.accounts.find(a => a.id === id);
    }

    addAccount(account: Account): void {
        if (this.activeCompanyId) {
            account.companyId = this.activeCompanyId;
        }
        this.allAccounts.push(account);
        this.accounts = this.filterByCompany(this.allAccounts);
        this.dataService.saveAccount(account).subscribe();
        this.logAudit('CREATE', 'ACCOUNT', account.id, `Account ${account.code} created`);
    }

    updateAccount(account: Account): void {
        const index = this.accounts.findIndex(a => a.id === account.id);
        if (index !== -1) {
            const oldAccount = this.accounts[index];
            this.accounts[index] = account;
            this.dataService.saveAccount(account).subscribe();
            this.logAudit('UPDATE', 'ACCOUNT', account.id, `Account ${account.code} updated`, 'SYSTEM', undefined, oldAccount, account);
        }
    }

    getJournals(): Journal[] {
        return this.journals;
    }

    getJournal(id: string): Journal | undefined {
        return this.journals.find(j => j.id === id);
    }

    addJournal(journal: Journal): void {
        if (!journal.id) {
            journal.id = `JNL-${journal.code.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(8)}`;
        }
        if (this.activeCompanyId) {
            journal.companyId = this.activeCompanyId;
        }
        this.allJournals.push(journal);
        this.journals = this.filterByCompany(this.allJournals);
        this.dataService.saveJournal(journal).subscribe();
        this.logAudit('CREATE', 'JOURNAL', journal.id, `Journal ${journal.code} created`);
    }

    updateJournal(journal: Journal): void {
        const index = this.journals.findIndex(j => j.id === journal.id);
        if (index !== -1) {
            this.journals[index] = journal;
            this.dataService.saveJournal(journal).subscribe();
            this.logAudit('UPDATE', 'JOURNAL', journal.id, `Journal ${journal.code} updated`);
        }
    }

    createSalesJournalEntry(salesDoc: SalesDocument, customer: any, articles: Article[], paymentCondition: 'PRONTO' | 'PRAZO' = 'PRONTO', paymentAccountId?: string): JournalEntry {
        const lines: JournalLine[] = [];
        const entryId = `JE${this.nextJournalId++}`;
        const salesJournal = this.journals.find(j => j.type === 'SALES') || this.journals[0];

        // 1. Débito no Cliente ou Conta de Disponibilidade
        let customerAccountId = '';
        let customerAccountName = '';
        let customerAccountCode = '';

        if (paymentAccountId) {
            // Se uma conta de pagamento específica foi fornecida (ex: Caixa, Banco), usa ela diretamente
            customerAccountId = paymentAccountId;
            const acc = this.accounts.find(a => a.id === customerAccountId);
            customerAccountCode = acc?.code || '';
            customerAccountName = acc?.name || '';
        } else {
            // Lógica padrão baseada no cliente
            customerAccountId = customer?.receivableAccountId || '17'; // Default: 17 (A Dinheiro)

            if (paymentCondition === 'PRONTO') {
                customerAccountId = '17';
            } else {
                if (customerAccountId === '17') {
                    customerAccountId = '18'; // 21.1.2 - Clientes a Crédito
                }
            }
            const acc = this.accounts.find(a => a.id === customerAccountId);
            customerAccountCode = acc?.code || '21.1.1';
            customerAccountName = acc?.name || 'Clientes a Dinheiro';
        }

        lines.push({
            id: `${entryId}-1`,
            accountId: customerAccountId,
            accountCode: customerAccountCode,
            accountName: customerAccountName,
            debit: salesDoc.total,
            credit: 0,
            description: `Venda a ${salesDoc.customerName} - ${salesDoc.documentNumber}`
        });

        // 2. Crédito nas Vendas (agrupado por conta de receita dos artigos)
        const revenueMap = new Map<string, number>(); // AccountID -> Amount

        salesDoc.lines.forEach(line => {
            const article = articles.find(a => a.id === line.articleId);
            const revenueAccountId = article?.revenueAccountId || '58'; // 58 = Vendas de Mercadorias (Default)

            const currentAmount = revenueMap.get(revenueAccountId) || 0;
            revenueMap.set(revenueAccountId, currentAmount + line.subtotal);
        });

        let lineIndex = 2;
        revenueMap.forEach((amount, accountId) => {
            const account = this.accounts.find(a => a.id === accountId);
            lines.push({
                id: `${entryId}-${lineIndex++}`,
                accountId: accountId,
                accountCode: account?.code || '71.1',
                accountName: account?.name || 'Vendas de Mercadorias',
                debit: 0,
                credit: amount,
                description: `Venda - ${salesDoc.documentNumber}`
            });
        });

        // 3. Crédito no IVA (se houver)
        if (salesDoc.totalIva > 0) {
            lines.push({
                id: `${entryId}-${lineIndex++}`,
                accountId: '52', // IVA a Pagar (Geralmente fixo, mas poderia ser configurável)
                accountCode: '32.1',
                accountName: 'IVA a Pagar',
                debit: 0,
                credit: salesDoc.totalIva,
                description: `IVA - ${salesDoc.documentNumber}`
            });
        }

        const entry: JournalEntry = {
            id: entryId,
            companyId: this.activeCompanyId || undefined,
            journalId: salesJournal.id,
            date: salesDoc.date,
            description: `Venda ${salesDoc.documentNumber} - ${salesDoc.customerName}`,
            reference: salesDoc.documentNumber,
            sourceDocument: salesDoc.id,
            sourceType: 'SALE',
            lines: lines,
            status: 'DRAFT',
            createdBy: 'Sistema',
            createdAt: new Date()
        };

        this.allJournalEntries.push(entry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.dataService.saveJournalEntry(entry).subscribe();
        this.logAudit('CREATE', 'JOURNAL_ENTRY', entry.id, 'Automatic sales journal entry created in DRAFT status');

        return entry;
    }

    createCOGSEntry(salesDoc: SalesDocument, articles: Article[]): void {
        const lines: JournalLine[] = [];
        const entryId = `JE${this.nextJournalId++}`;
        const generalJournal = this.journals.find(j => j.type === 'GENERAL') || this.journals[0];

        // Agrupar CMV por par de contas (Custo / Inventário)
        // Ex: Pode haver produtos de "Alimentação" e "Limpeza" com contas diferentes
        interface COGSGroup {
            cogsAccountId: string;
            inventoryAccountId: string;
            amount: number;
        }

        const cogsGroups: COGSGroup[] = [];

        salesDoc.lines.forEach(line => {
            const article = articles.find(a => a.id === line.articleId);
            if (article && article.stockControl) {
                const cogs = article.purchasePrice * line.quantity;
                const cogsAccountId = article.cogsAccountId || '61'; // 61 = CMV (Default)
                const inventoryAccountId = article.inventoryAccountId || '22'; // 22 = Produtos Alimentares (Default)

                const existingGroup = cogsGroups.find(g => g.cogsAccountId === cogsAccountId && g.inventoryAccountId === inventoryAccountId);
                if (existingGroup) {
                    existingGroup.amount += cogs;
                } else {
                    cogsGroups.push({ cogsAccountId, inventoryAccountId, amount: cogs });
                }
            }
        });

        if (cogsGroups.length === 0) return;

        let lineIndex = 1;
        cogsGroups.forEach(group => {
            const cogsAccount = this.accounts.find(a => a.id === group.cogsAccountId);
            const inventoryAccount = this.accounts.find(a => a.id === group.inventoryAccountId);

            // Débito no Custo (CMV)
            lines.push({
                id: `${entryId}-${lineIndex++}`,
                accountId: group.cogsAccountId,
                accountCode: cogsAccount?.code || '62.1',
                accountName: cogsAccount?.name || 'Custo das Mercadorias Vendidas',
                debit: group.amount,
                credit: 0,
                description: `CMV - ${salesDoc.documentNumber}`
            });

            // Crédito no Inventário (Baixa de Stock)
            lines.push({
                id: `${entryId}-${lineIndex++}`,
                accountId: group.inventoryAccountId,
                accountCode: inventoryAccount?.code || '31.1.1',
                accountName: inventoryAccount?.name || 'Mercadorias',
                debit: 0,
                credit: group.amount,
                description: `Saída Stock - ${salesDoc.documentNumber}`
            });
        });

        const entry: JournalEntry = {
            id: entryId,
            companyId: this.activeCompanyId || undefined,
            journalId: generalJournal.id,
            date: salesDoc.date,
            description: `CMV ${salesDoc.documentNumber}`,
            reference: salesDoc.documentNumber,
            sourceDocument: salesDoc.id,
            sourceType: 'SALE',
            lines: lines,
            status: 'DRAFT',
            createdBy: 'Sistema',
            createdAt: new Date()
        };

        this.allJournalEntries.push(entry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.dataService.saveJournalEntry(entry).subscribe();
        this.logAudit('CREATE', 'JOURNAL_ENTRY', entry.id, 'Automatic COGS entry created in DRAFT status');
    }

    createManualJournalEntry(entry: JournalEntry): void {
        // Ensure ID is unique if not provided or conflict
        if (!entry.id || this.journalEntries.find(e => e.id === entry.id)) {
            entry.id = `JE${this.nextJournalId++}`;
        }

        // Ensure Journal ID
        if (!entry.journalId) {
            const generalJournal = this.journals.find(j => j.type === 'GENERAL');
            entry.journalId = generalJournal ? generalJournal.id : this.journals[0].id;
        }

        // VALIDATION: Check if accounts allow posting (Rule: No posting to synthetic accounts)
        for (const line of entry.lines) {
            const account = this.accounts.find(a => a.id === line.accountId);
            if (account && !account.allowPosting) {
                throw new Error(`Conta ${account.code} - ${account.name} é uma conta sintética e não permite lançamentos diretos.`);
            }
        }

        if (this.activeCompanyId) {
            entry.companyId = this.activeCompanyId;
        }
        this.allJournalEntries.push(entry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);

        // Only update balances if POSTED
        if (entry.status === 'POSTED') {
            this.updateAccountBalances(entry.lines);
        }

        this.dataService.saveJournalEntry(entry).subscribe();
        this.logAudit('CREATE', 'JOURNAL_ENTRY', entry.id, 'Manual journal entry created', entry.createdBy);
    }

    createJournalEntry(entry: JournalEntry): void {
        this.createManualJournalEntry(entry);
    }

    // Reverse a journal entry (Estorno)
    reverseJournalEntry(entryId: string, reason: string, userId: string): void {
        const originalEntry = this.journalEntries.find(e => e.id === entryId);
        if (!originalEntry) throw new Error('Lançamento original não encontrado');
        if (originalEntry.status !== 'POSTED') throw new Error('Apenas lançamentos lançados podem ser estornados');

        // Create Reversal Entry
        const reversalId = `JE${this.nextJournalId++}`;
        const reversalLines = originalEntry.lines.map(line => ({
            ...line,
            id: `${reversalId}-${line.id.split('-')[1]}`,
            debit: line.credit, // Swap debit/credit
            credit: line.debit
        }));

        const reversalEntry: JournalEntry = {
            id: reversalId,
            journalId: originalEntry.journalId,
            date: new Date(),
            description: `Estorno de ${originalEntry.id} - ${originalEntry.description}`,
            reference: originalEntry.reference,
            sourceDocument: originalEntry.sourceDocument,
            sourceType: 'REVERSAL',
            lines: reversalLines,
            status: 'DRAFT', // Created as DRAFT
            createdBy: userId,
            createdAt: new Date(),
            correctionReason: reason,
            relatedEntryId: originalEntry.id
        };

        // Save Reversal (Original status remains POSTED until Reversal is POSTED)
        if (this.activeCompanyId) {
            reversalEntry.companyId = this.activeCompanyId;
        }
        this.allJournalEntries.push(reversalEntry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.dataService.saveJournalEntry(reversalEntry).subscribe();

        // Audit
        this.logAudit('CREATE', 'JOURNAL_ENTRY', reversalEntry.id, `Reversal draft created for ${originalEntry.id}`, userId, reason);
    }

    // Correct a journal entry
    correctJournalEntry(originalEntryId: string, correctedEntryData: Partial<JournalEntry>, reason: string, userId: string): void {
        const originalEntry = this.journalEntries.find(e => e.id === originalEntryId);
        if (!originalEntry) throw new Error('Lançamento original não encontrado');
        if (originalEntry.status !== 'POSTED') throw new Error('Apenas lançamentos lançados podem ser corrigidos');

        // 1. Create Reversal Entry (POSTED immediately for Correction flow, or should it be draft too? 
        // For now, keeping correction flow atomic/automatic as it creates BOTH reversal and new entry)
        // However, to be consistent, maybe we should use the new reverse logic? 
        // But correction is usually an atomic operation. Let's keep it as is for now unless requested.

        const reversalId = `JE${this.nextJournalId++}`;
        const reversalLines = originalEntry.lines.map(line => ({
            ...line,
            id: `${reversalId}-${line.id.split('-')[1]}`,
            debit: line.credit, // Swap debit/credit
            credit: line.debit
        }));

        const reversalEntry: JournalEntry = {
            id: reversalId,
            journalId: originalEntry.journalId, // Keep same journal
            date: new Date(),
            description: `Estorno de ${originalEntry.id} - ${originalEntry.description}`,
            reference: originalEntry.reference,
            sourceDocument: originalEntry.sourceDocument,
            sourceType: 'REVERSAL',
            lines: reversalLines,
            status: 'POSTED',
            createdBy: userId,
            createdAt: new Date(),
            correctionReason: reason,
            relatedEntryId: originalEntry.id
        };

        // 2. Create Corrected Entry
        const correctedId = `JE${this.nextJournalId++}`;
        const correctedEntry: JournalEntry = {
            ...originalEntry,
            ...correctedEntryData,
            id: correctedId,
            journalId: originalEntry.journalId, // Keep same journal
            date: new Date(), // Correction date is now
            description: `Correção de ${originalEntry.id} - ${correctedEntryData.description || originalEntry.description}`,
            sourceType: 'CORRECTION',
            status: 'POSTED',
            createdBy: userId,
            createdAt: new Date(),
            correctionReason: reason,
            relatedEntryId: originalEntry.id,
            lines: correctedEntryData.lines || [] // Must provide lines
        };

        // 3. Update Original Entry Status
        const oldStatus = originalEntry.status;
        originalEntry.status = 'CORRECTED';
        originalEntry.updatedBy = userId;
        originalEntry.updatedAt = new Date();
        originalEntry.correctionReason = reason;

        // 4. Save Everything
        if (this.activeCompanyId) {
            reversalEntry.companyId = this.activeCompanyId;
            correctedEntry.companyId = this.activeCompanyId;
        }
        this.allJournalEntries.push(reversalEntry);
        this.allJournalEntries.push(correctedEntry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);

        // Update balances: Reversal (undo original impact) + New Entry (apply new impact)
        this.updateAccountBalances(reversalLines);
        this.updateAccountBalances(correctedEntry.lines);

        this.dataService.saveJournalEntry(reversalEntry).subscribe();
        this.dataService.saveJournalEntry(correctedEntry).subscribe();
        this.dataService.saveJournalEntry(originalEntry).subscribe();

        // 5. Audit
        this.logAudit('CORRECT', 'JOURNAL_ENTRY', originalEntry.id, `Entry corrected. Reversal: ${reversalId}, New: ${correctedId}`, userId, reason, { status: oldStatus }, { status: 'CORRECTED' });
    }

    // Safe cleanup of zero-value entries
    cleanupZeroValueEntries(userId: string): { deleted: number; voided: number } {
        let deletedCount = 0;
        let voidedCount = 0;
        const entriesToRemove: string[] = [];

        this.journalEntries.forEach(entry => {
            const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
            const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

            // Check if entry has effectively zero value
            if (Math.abs(totalDebit) < 0.01 && Math.abs(totalCredit) < 0.01) {
                if (entry.status === 'DRAFT') {
                    // Safe to delete DRAFT
                    entriesToRemove.push(entry.id);
                    deletedCount++;
                    this.logAudit('DELETE', 'JOURNAL_ENTRY', entry.id, 'Zero-value draft entry deleted during cleanup', userId);
                } else if (entry.status === 'POSTED') {
                    // Mark POSTED as VOIDED
                    const oldStatus = entry.status;
                    entry.status = 'VOIDED';
                    entry.updatedBy = userId;
                    entry.updatedAt = new Date();
                    entry.correctionReason = 'Limpeza automática: Lançamento com valor zero';
                    voidedCount++;
                    this.logAudit('UPDATE', 'JOURNAL_ENTRY', entry.id, 'Zero-value posted entry marked as VOIDED', userId, undefined, { status: oldStatus }, { status: 'VOIDED' });
                }
            }
        });

        // Remove deleted entries
        if (entriesToRemove.length > 0) {
            this.allJournalEntries = this.allJournalEntries.filter(e => !entriesToRemove.includes(e.id));
            this.journalEntries = this.filterByCompany(this.allJournalEntries);
        }

        if (deletedCount > 0 || voidedCount > 0) {
            // This logic is tricky with individual saves. 
            // We need to save modified entries (VOIDED) and delete removed ones.
            // Assuming we only VOID for now or user doesn't call this often.
            // Ideally should iterate.
            this.allJournalEntries.forEach(e => {
                if (e.status === 'VOIDED' && e.updatedAt && e.updatedAt.getTime() > (Date.now() - 10000)) {
                    this.dataService.saveJournalEntry(e).subscribe();
                }
            });
        }

        return { deleted: deletedCount, voided: voidedCount };
    }

    private updateAccountBalances(lines: JournalLine[]): void {
        const modifiedAccounts = new Set<Account>();

        lines.forEach(line => {
            let account = this.accounts.find(a => a.id === line.accountId);

            if (account) {
                const amount = (account.type === 'ASSET' || account.type === 'EXPENSE')
                    ? (line.debit - line.credit)
                    : (line.credit - line.debit);

                // Update this account and walk up the tree
                while (account) {
                    account.balance += amount;
                    modifiedAccounts.add(account);

                    if (account.parentId) {
                        account = this.accounts.find(a => a.id === account!.parentId);
                    } else {
                        account = undefined;
                    }
                }
            }
        });

        modifiedAccounts.forEach(acc => {
            this.dataService.saveAccount(acc).subscribe();
        });
    }

    getSubAccounts(parentId: string): Account[] {
        return this.accounts.filter(a => a.parentId === parentId);
    }

    getJournalEntries(): JournalEntry[] {
        return this.journalEntries;
    }

    getAuditLogs(): AuditLog[] {
        return this.auditLogs;
    }

    // Report Configurations
    getReportConfigs(): FinancialReportConfig[] {
        return this.reportConfigs;
    }

    getReportConfig(code: string): FinancialReportConfig | undefined {
        return this.reportConfigs.find(c => c.code === code);
    }

    updateReportConfig(config: FinancialReportConfig): void {
        const index = this.reportConfigs.findIndex(c => c.id === config.id);
        if (index !== -1) {
            this.reportConfigs[index] = config;
            this.saveReportConfigs();
        }
    }

    // ========== VALIDAÇÃO E POSTAGEM DE LANÇAMENTOS ==========

    /**
     * Valida e posta um lançamento em DRAFT
     * Apenas o contabilista deve ter permissão para executar esta ação
     */
    postJournalEntry(entryId: string, userId: string): void {
        const entry = this.journalEntries.find(e => e.id === entryId);
        if (!entry) throw new Error('Lançamento não encontrado');
        if (entry.status !== 'DRAFT') throw new Error('Apenas lançamentos em RASCUNHO podem ser validados');

        // Validar que débitos = créditos
        const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`Lançamento desbalanceado: Débito (${totalDebit.toFixed(2)}) ≠ Crédito (${totalCredit.toFixed(2)})`);
        }

        // Validar que todas as contas existem
        for (const line of entry.lines) {
            const account = this.accounts.find(a => a.id === line.accountId);
            if (!account) {
                throw new Error(`Conta ${line.accountCode} não encontrada`);
            }
            if (!account.allowPosting) {
                throw new Error(`Conta ${line.accountCode} - ${line.accountName} não permite lançamentos diretos`);
            }
        }

        // Atualizar status
        const oldStatus = entry.status;
        entry.status = 'POSTED';
        entry.updatedBy = userId;
        entry.updatedAt = new Date();

        // Se for um ESTORNO (REVERSAL), atualizar o status do lançamento original
        if (entry.sourceType === 'REVERSAL' && entry.relatedEntryId) {
            const originalEntry = this.journalEntries.find(e => e.id === entry.relatedEntryId);
            if (originalEntry && originalEntry.status === 'POSTED') {
                originalEntry.status = 'REVERSED';
                originalEntry.updatedBy = userId;
                originalEntry.updatedAt = new Date();
                // We don't overwrite correctionReason if it exists, or maybe append?
                // originalEntry.correctionReason = entry.correctionReason; 
            }
        }

        // Agora sim, atualizar os saldos das contas
        this.updateAccountBalances(entry.lines);
        this.dataService.saveJournalEntry(entry).subscribe();
        this.logAudit('POST', 'JOURNAL_ENTRY', entry.id,
            `Lançamento validado e postado por ${userId}`,
            userId,
            undefined,
            { status: oldStatus },
            { status: 'POSTED' }
        );
    }

    /**
     * Valida e posta múltiplos lançamentos em lote
     */
    postMultipleEntries(entryIds: string[], userId: string): { success: string[]; failed: { id: string; error: string }[] } {
        const success: string[] = [];
        const failed: { id: string; error: string }[] = [];

        for (const id of entryIds) {
            try {
                this.postJournalEntry(id, userId);
                success.push(id);
            } catch (error: any) {
                failed.push({ id, error: error.message });
            }
        }

        return { success, failed };
    }

    /**
     * Checks if adding a new movement to an account would cause its balance to go negative at any point in time.
     * Useful for retroactive validation of Treasury accounts.
     * @param accountId Account ID to check
     * @param date Date of the new movement
     * @param amountChange Change in balance (positive for debit/increase, negative for credit/decrease for Asset accounts)
     * @returns { valid: boolean, minBalance: number, dateOfMinBalance: Date }
     */
    checkBalanceFeasibility(accountId: string, date: Date | string, amountChange: number): { valid: boolean, minBalance: number, dateOfMinBalance: Date | null } {
        const account = this.getAccount(accountId);
        if (!account) return { valid: true, minBalance: 0, dateOfMinBalance: null }; // Should not happen

        // Only relevant for Asset/Liability accounts where balance matters (usually Treasury)
        // For now, assume we check it if called.

        // Get all POSTED entries affecting this account
        const entries = this.journalEntries
            .filter(e => e.status === 'POSTED')
            .flatMap(e => e.lines.filter(l => l.accountId === accountId).map(l => ({
                date: new Date(e.date),
                // For Assets: Debit (+), Credit (-)
                // For Liabilities: Credit (+), Debit (-)
                // But usually Treasury is Asset (Class 1).
                // Let's assume standard Asset logic for Treasury: Balance = Debit - Credit.
                amount: (l.debit || 0) - (l.credit || 0)
            })));

        // Add the proposed entry
        entries.push({
            date: new Date(date),
            amount: amountChange
        });

        // Sort by date
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());

        let runningBalance = 0; // Assuming initial balance 0 or we should fetch opening balance?
        // In this system, opening balance is likely a JE too.

        let minBalance = Infinity;
        let dateOfMinBalance = null;

        for (const entry of entries) {
            runningBalance += entry.amount;
            if (runningBalance < minBalance) {
                minBalance = runningBalance;
                dateOfMinBalance = entry.date;
            }
        }

        // Allow small floating point error
        return {
            valid: minBalance >= -0.01,
            minBalance,
            dateOfMinBalance
        };
    }

    /**
     * Atualiza um lançamento em DRAFT
     * Permite ao contabilista corrigir antes de validar
     */
    updateJournalEntry(entryId: string, updates: Partial<JournalEntry>, userId: string): void {
        const entry = this.journalEntries.find(e => e.id === entryId);
        if (!entry) throw new Error('Lançamento não encontrado');
        if (entry.status !== 'DRAFT') {
            throw new Error('Apenas lançamentos em RASCUNHO podem ser editados. Use a função de correção para lançamentos postados.');
        }

        const oldEntry = { ...entry };

        // Atualizar campos permitidos
        if (updates.description) entry.description = updates.description;
        if (updates.reference) entry.reference = updates.reference;
        if (updates.date) entry.date = updates.date;
        if (updates.lines) entry.lines = updates.lines;

        entry.updatedBy = userId;
        entry.updatedAt = new Date();

        this.dataService.saveJournalEntry(entry).subscribe();
        this.logAudit('UPDATE', 'JOURNAL_ENTRY', entry.id,
            'Lançamento em rascunho atualizado',
            userId,
            undefined,
            oldEntry,
            entry
        );
    }

    /**
     * Retorna apenas lançamentos em DRAFT para revisão
     */
    getDraftEntries(): JournalEntry[] {
        return this.journalEntries.filter(e => e.status === 'DRAFT');
    }

    /**
     * Cancela um lançamento em DRAFT (não afeta saldos pois nunca foi postado)
     */
    cancelDraftEntry(entryId: string, userId: string, reason: string): void {
        const entry = this.journalEntries.find(e => e.id === entryId);
        if (!entry) throw new Error('Lançamento não encontrado');
        if (entry.status !== 'DRAFT') throw new Error('Apenas lançamentos em RASCUNHO podem ser cancelados diretamente');

        const oldStatus = entry.status;
        entry.status = 'CANCELLED';
        entry.updatedBy = userId;
        entry.updatedAt = new Date();
        entry.correctionReason = reason;

        this.dataService.saveJournalEntry(entry).subscribe();
        this.logAudit('UPDATE', 'JOURNAL_ENTRY', entry.id,
            'Lançamento em rascunho cancelado',
            userId,
            reason,
            { status: oldStatus },
            { status: 'CANCELLED' }
        );
    }


    getTrialBalance(): { account: Account; debit: number; credit: number }[] {
        return this.accounts.map(account => {
            const balance = account.balance;
            let debit = 0;
            let credit = 0;

            if (account.type === 'ASSET' || account.type === 'EXPENSE') {
                if (balance >= 0) {
                    debit = balance;
                } else {
                    credit = Math.abs(balance);
                }
            } else if (account.type === 'LIABILITY' || account.type === 'EQUITY' || account.type === 'REVENUE') {
                if (balance >= 0) {
                    credit = balance;
                } else {
                    debit = Math.abs(balance);
                }
            }

            return { account, debit, credit };
        });
    }
}
