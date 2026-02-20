import { Injectable } from '@angular/core';
import { Account, JournalEntry, JournalLine, SalesDocument, Article, AuditLog, Journal, FinancialReportConfig } from './models';

export interface AccountingIssue {
    type: 'IMBALANCE' | 'MISSING_ACCOUNT' | 'SYNTHETIC_POSTING' | 'INVALID_TRANSACTION' | 'DATA_CORRUPTION' | 'MISSING_POSTING' | 'UNKNOWN';
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    description: string;
    relatedId?: string;
    details?: any;
}
import { DEFAULT_ACCOUNTS, DEFAULT_JOURNALS } from './sample-data';
import { DataService } from '../services/data.service';
import { lastValueFrom, Observable, BehaviorSubject } from 'rxjs';
import { ToasterService } from '../services/toaster.service';

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

    // Reactive Data Streams
    private accounts$ = new BehaviorSubject<Account[]>([]);
    private journalEntries$ = new BehaviorSubject<JournalEntry[]>([]);
    private journals$ = new BehaviorSubject<Journal[]>([]);
    public accountsChanged$ = this.accounts$.asObservable();
    public entriesChanged$ = this.journalEntries$.asObservable();
    public journalsChanged$ = this.journals$.asObservable();

    private activeCompanyId: string | null = null;
    private nextJournalId = 1;

    constructor(
        private dataService: DataService,
        private toasterService: ToasterService
    ) {
        this.dataService.activeCompany$.subscribe(company => {
            if (company) {
                this.activeCompanyId = company.id;
                this.clearState();

                // Only load data if logged in or in local browser mode
                const token = localStorage.getItem('access_token');
                const isLocal = localStorage.getItem('erp_system_config')?.includes('BROWSER');

                if (token || isLocal) {
                    this.loadData();
                }
            } else {
                this.activeCompanyId = null;
                this.clearState();
            }
        });
    }

    private clearState() {
        this.allAccounts = [];
        this.accounts = [];
        this.allJournalEntries = [];
        this.journalEntries = [];
        this.allJournals = [];
        this.journals = [];
        this.allAuditLogs = [];
        this.auditLogs = [];
        this.allReportConfigs = [];
        this.reportConfigs = [];
        this.nextJournalId = 1;
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
            const rawAccounts = await lastValueFrom(this.dataService.getAccounts(this.activeCompanyId || undefined));

            // Cast balances to numbers to prevent numeric pipe errors and concatenation issues
            this.allAccounts = rawAccounts.map(acc => ({
                ...acc,
                balance: Number(acc.balance) || 0
            }));

            // If no accounts exist for this company, initialize with defaults
            if (this.allAccounts.length === 0 && this.activeCompanyId) {
                await this.initializeCompanyAccounts();
            }
        } catch (e) {
            console.error('Failed to load accounts from backend:', e);
            this.allAccounts = [];
            throw e; // Propagate error so UI can handle it
        }
        this.accounts = this.filterByCompany(this.allAccounts);
        this.accounts$.next(this.accounts);
    }

    async loadAccountsPreset(presetName: string) {
        if (!this.activeCompanyId) return;
        try {
            await lastValueFrom(this.dataService.loadAccountsPreset(presetName, this.activeCompanyId || undefined));
            await this.loadAccounts(); // Refresh
            await this.loadJournals(); // Refresh journals as well just in case
        } catch (e) {
            console.error('Failed to load accounts preset:', e);
            throw e;
        }
    }

    private async initializeCompanyAccounts() {
        console.log(`Initializing default accounts for company: ${this.activeCompanyId}`);
        // If we are in real backend mode, let the backend handle it via its own preset logic
        // if supported, or use the loop if LOCAL.

        // Actually, the previous implementation was doing a loop. 
        // Let's try to use the backend preset "PGC-NIR" by default if it's the first time.
        try {
            await lastValueFrom(this.dataService.loadAccountsPreset('PGC-NIR', this.activeCompanyId || undefined));
            await this.loadAccounts(); // Final refresh to ensure all variables are in sync
        } catch (e: any) {
            // If it's a conflict (already initialized), just reload and ignore error
            if (e.status === 400 || (e.error && e.error.message && e.error.message.includes('inicializado'))) {
                console.log('Accounts already initialized on server. Syncing...');
                await this.loadAccounts();
                return;
            }

            console.warn('Backend preset failed, attempting manual local initialization...', e);

            const newAccounts: Account[] = DEFAULT_ACCOUNTS.map(acc => ({
                ...acc,
                id: `ACC${this.activeCompanyId}${acc.code.replace(/\./g, '')}`, // Unique ID per company
                companyId: this.activeCompanyId!,
                balance: 0
            }));

            // Fix parentId references for the new unique IDs
            newAccounts.forEach(acc => {
                if (acc.parentId) {
                    const parent = DEFAULT_ACCOUNTS.find(p => p.id === acc.parentId);
                    if (parent) {
                        acc.parentId = `ACC${this.activeCompanyId}${parent.code.replace(/\./g, '')}`;
                    }
                }
            });

            // Save to backend
            for (const acc of newAccounts) {
                try {
                    await lastValueFrom(this.dataService.saveAccount(acc));
                } catch (saveErr) {
                    console.error(`Failed to save account ${acc.code} during manual init:`, saveErr);
                }
            }
            await this.loadAccounts(); // Refresh after manual init
        }
    }

    private async initializeCompanyJournals() {
        console.log(`Initializing default journals for company: ${this.activeCompanyId}`);
        const newJournals: Journal[] = DEFAULT_JOURNALS.map(j => ({
            ...j,
            id: `JNL-${j.code}-${this.activeCompanyId}`,
            companyId: this.activeCompanyId!
        }));

        for (const j of newJournals) {
            await lastValueFrom(this.dataService.saveJournal(j));
        }

        this.allJournals = newJournals;
    }

    private async loadJournals() {
        try {
            this.allJournals = await lastValueFrom(this.dataService.getJournals(this.activeCompanyId || undefined));
            if (this.allJournals.length === 0 && this.activeCompanyId) {
                await this.initializeCompanyJournals();
            }
        } catch (e) {
            console.error('Failed to load journals from backend:', e);
            this.allJournals = [];
            throw e;
        }
        this.journals = this.allJournals;
        this.journals$.next(this.journals);
    }

    private async loadJournalEntries() {
        try {
            this.allJournalEntries = await lastValueFrom(this.dataService.getJournalEntries(this.activeCompanyId || undefined));

            // Sanitize data: Ensure all numeric fields are actual numbers to avoid string concatenation errors in templates
            this.allJournalEntries = this.allJournalEntries.map(entry => ({
                ...entry,
                lines: (entry.lines || []).map(line => ({
                    ...line,
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0
                }))
            }));

            // Safer ID parsing for the next ID generator
            const ids = this.allJournalEntries
                .map(e => {
                    const match = e.id.match(/\d+/);
                    return match ? parseInt(match[0]) : 0;
                })
                .filter(id => !isNaN(id));

            const maxId = ids.length > 0 ? Math.max(...ids) : 0;
            this.nextJournalId = maxId + 1;
        } catch (e) {
            console.error('Failed to load journal entries:', e);
            this.allJournalEntries = [];
        }
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.journalEntries$.next(this.journalEntries);
    }

    private loadAuditLogs() {
        const stored = localStorage.getItem('erp_audit_logs');
        if (stored) {
            this.allAuditLogs = JSON.parse(stored);
        }
        // Audit logs might be mixed in local storage, so we might need keeping filter here IF DataService doesn't handle it.
        // DataService doesn't seem to have getAuditLogs. This is strictly local/custom here.
        // Let's keep it for AuditLogs as they seem bypassing DataService for read?
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

    private filterByCompany<T extends { companyId?: string | null }>(list: T[]): T[] {
        if (!this.activeCompanyId) return [];
        // Strict isolation: only return items belonging specifically to this company
        return list.filter(item => item.companyId === this.activeCompanyId);
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
        // Prevent duplicate entries for the same document
        const existing = this.allJournalEntries.find(e => e.sourceDocument === salesDoc.id && e.sourceType === 'SALE' && !e.description?.includes('CMV'));

        if (existing) {
            const shouldBePosted = salesDoc.status === 'POSTED' || salesDoc.status === 'APPROVED' || paymentCondition === 'PRONTO' || salesDoc.documentType === 'VD';
            if (existing.status === 'DRAFT' && shouldBePosted) {
                existing.status = 'POSTED';
                this.updateAccountBalances(existing.lines);
                this.saveEntryResiliently(existing);
                this.logAudit('UPDATE', 'JOURNAL_ENTRY', existing.id, `Status updated to POSTED for sales doc ${salesDoc.documentNumber}`);
            }
            return existing;
        }

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
            description: `Venda a ${salesDoc.customerName} (${customer?.code || ''}) - ${salesDoc.documentNumber}`
        });

        // 2. Crédito nas Vendas (agrupado por conta de receita dos artigos)
        const revenueMap = new Map<string, number>(); // AccountID -> Amount

        salesDoc.lines.forEach(line => {
            const article = articles.find(a => a.id === line.articleId || a.code === line.articleCode);
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
            status: (salesDoc.documentType === 'VD' || paymentCondition === 'PRONTO' || salesDoc.status === 'APPROVED' || salesDoc.status === 'POSTED') ? 'POSTED' : 'DRAFT',
            createdBy: 'Sistema',
            createdAt: new Date()
        };

        this.allJournalEntries.push(entry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.saveEntryResiliently(entry);

        const statusMsg = entry.status === 'POSTED' ? 'lançado' : 'como rascunho';
        this.toasterService.showSuccess('Integração Contabilística', `Lançamento ${entry.id} criado ${statusMsg} para ${salesDoc.documentNumber}.`);
        this.logAudit('CREATE', 'JOURNAL_ENTRY', entry.id, `Automatic sales journal entry created in ${statusMsg}`);


        if (entry.status === 'POSTED') {
            this.updateAccountBalances(entry.lines);
        }

        return entry;
    }

    /**
     * Creates journal entries for Purchase Documents
     */
    createPurchaseJournalEntry(purchaseDoc: any, supplier: any): JournalEntry {
        const lines: JournalLine[] = [];
        const entryId = `JE${this.nextJournalId++}`;
        const journal = this.journals.find(j => j.type === 'PURCHASES') || this.journals.find(j => j.code === 'PUR') || this.journals[0];

        // 1. Débito no Inventário / Gastos
        lines.push({
            id: `${entryId}-1`,
            accountId: '22', // Default Inventory
            accountCode: '31.1.1',
            accountName: 'Mercadorias',
            debit: Number(purchaseDoc.merchandiseTotal) || 0,
            credit: 0,
            description: 'Compra de mercadorias'
        });

        // 2. Débito no IVA
        if (Number(purchaseDoc.taxTotal) > 0) {
            lines.push({
                id: `${entryId}-2`,
                accountId: '53', // IVA Recuperável
                accountCode: '32.2',
                accountName: 'IVA a Recuperar',
                debit: Number(purchaseDoc.taxTotal),
                credit: 0,
                description: 'IVA dedutível'
            });
        }

        // 3. Crédito no Fornecedor
        const supplierAccountId = purchaseDoc.supplierAccountId || supplier?.payableAccountId || '49';
        const supplierAcc = this.accounts.find(a => a.id === supplierAccountId || a.code === '44.1.1');

        lines.push({
            id: `${entryId}-3`,
            accountId: supplierAcc?.id || supplierAccountId,
            accountCode: supplierAcc?.code || '44.1.1',
            accountName: supplierAcc?.name || 'Fornecedores Nacionais',
            debit: 0,
            credit: Number(purchaseDoc.totalValue) || 0,
            description: `Fornecedor: ${purchaseDoc.supplierName}`
        });

        const entry: JournalEntry = {
            id: entryId,
            companyId: this.activeCompanyId || undefined,
            journalId: journal.id,
            date: purchaseDoc.date,
            description: `Compra ${purchaseDoc.series}/${purchaseDoc.number} - ${purchaseDoc.supplierName}`,
            reference: purchaseDoc.reference || `${purchaseDoc.series}/${purchaseDoc.number}`,
            sourceDocument: purchaseDoc.id,
            sourceType: 'PURCHASE',
            lines: lines,
            status: (purchaseDoc.status === 'APPROVED' || purchaseDoc.status === 'POSTED') ? 'POSTED' : 'DRAFT',
            createdBy: 'Sistema',
            createdAt: new Date()
        };

        this.allJournalEntries.push(entry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.saveEntryResiliently(entry);

        if (entry.status === 'POSTED') {
            this.updateAccountBalances(entry.lines);
            this.toasterService.showSuccess('Integração Compras', `Lançamento ${entry.id} criado para ${purchaseDoc.series}/${purchaseDoc.number}.`);
        }

        return entry;
    }

    createCOGSEntry(salesDoc: SalesDocument, articles: Article[]): void {
        // Prevent duplicate entries
        const existing = this.allJournalEntries.find(e => e.sourceDocument === salesDoc.id && e.sourceType === 'SALE' && e.description?.includes('CMV'));
        if (existing) {
            if (existing.status === 'DRAFT' && (salesDoc.status === 'POSTED' || salesDoc.status === 'APPROVED')) {
                existing.status = 'POSTED';
                this.updateAccountBalances(existing.lines);
                this.saveEntryResiliently(existing);
            }
            return;
        }

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
            const article = articles.find(a => a.id === line.articleId || a.code === line.articleCode);
            if (article && article.stockControl) {
                const cogs = (article.purchasePrice || 0) * line.quantity;
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
            status: (salesDoc.status === 'POSTED' || salesDoc.status === 'APPROVED') ? 'POSTED' : 'DRAFT',
            createdBy: 'Sistema',
            createdAt: new Date()
        };

        this.allJournalEntries.push(entry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.dataService.saveJournalEntry(entry).subscribe();

        if (entry.status === 'POSTED') {
            this.updateAccountBalances(entry.lines);
            this.toasterService.showSuccess('Integração CMV', `Lançamento de CMV ${entry.id} criado para ${salesDoc.documentNumber}.`);
        }

        this.logAudit('CREATE', 'JOURNAL_ENTRY', entry.id, 'Automatic COGS entry created');
    }

    createManualJournalEntry(entry: JournalEntry): void {
        // Prevent duplicate entries for automated integrations
        if (entry.sourceDocument) {
            const existing = this.allJournalEntries.find(e => e.sourceDocument === entry.sourceDocument && e.sourceType === entry.sourceType);
            if (existing) {
                if (existing.status === 'DRAFT' && entry.status === 'POSTED') {
                    existing.status = 'POSTED';
                    this.updateAccountBalances(existing.lines);
                    this.saveEntryResiliently(existing);
                    this.journalEntries$.next(this.journalEntries);
                }
                return;
            }
        }

        // Ensure ID is unique
        if (!entry.id || this.journalEntries.find(e => e.id === entry.id)) {
            entry.id = `JE${this.nextJournalId++}`;
        }

        // Ensure Journal ID
        if (!entry.journalId) {
            const generalJournal = this.journals.find(j => j.type === 'GENERAL');
            entry.journalId = generalJournal ? generalJournal.id : (this.journals[0]?.id || 'GENERAL');
        }

        // VALIDATION: No synthetic accounts
        for (const line of entry.lines) {
            const account = this.accounts.find(a => a.id === line.accountId);
            if (account && !account.allowPosting) {
                this.toasterService.showError('Erro de Validação', `Conta ${account.code} é sintética e não permite lançamentos.`);
                return;
            }
        }

        if (this.activeCompanyId) {
            entry.companyId = this.activeCompanyId;
        }

        this.allJournalEntries.push(entry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.journalEntries$.next(this.journalEntries);

        if (entry.status === 'POSTED') {
            this.updateAccountBalances(entry.lines);
        }

        this.saveEntryResiliently(entry);
    }

    createJournalEntry(entry: JournalEntry): void {
        this.createManualJournalEntry(entry);
    }

    reverseJournalEntry(entryId: string, reason: string, userId: string): void {
        const originalEntry = this.journalEntries.find(e => e.id === entryId);
        if (!originalEntry) throw new Error('Lançamento original não encontrado');

        const reversalId = `JE${this.nextJournalId++}`;
        const reversalLines = originalEntry.lines.map(line => ({
            ...line,
            id: `${reversalId}-${line.id.split('-')[1] || Math.random().toString(36).substr(2, 4)}`,
            debit: line.credit,
            credit: line.debit
        }));

        const reversalEntry: JournalEntry = {
            id: reversalId,
            companyId: this.activeCompanyId || originalEntry.companyId,
            journalId: originalEntry.journalId,
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

        this.allJournalEntries.push(reversalEntry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.updateAccountBalances(reversalLines);
        this.saveEntryResiliently(reversalEntry);

        this.logAudit('CREATE', 'JOURNAL_ENTRY', reversalEntry.id, `Estorno criado para ${originalEntry.id}`, userId, reason);
    }

    correctJournalEntry(originalEntryId: string, correctedEntryData: Partial<JournalEntry>, reason: string, userId: string): void {
        this.reverseJournalEntry(originalEntryId, reason, userId);

        const originalEntryId_copy = originalEntryId;
        const correctedId = `JE${this.nextJournalId++}`;
        const originalEntry = this.journalEntries.find(e => e.id === originalEntryId_copy);

        const correctedEntry: JournalEntry = {
            ...originalEntry!,
            ...correctedEntryData,
            id: correctedId,
            date: new Date(),
            description: `Correção: ${correctedEntryData.description || originalEntry?.description}`,
            sourceType: 'CORRECTION',
            status: 'POSTED',
            createdBy: userId,
            createdAt: new Date(),
            correctionReason: reason,
            relatedEntryId: originalEntryId_copy,
            lines: correctedEntryData.lines || []
        };

        this.allJournalEntries.push(correctedEntry);
        this.journalEntries = this.filterByCompany(this.allJournalEntries);
        this.updateAccountBalances(correctedEntry.lines);
        this.saveEntryResiliently(correctedEntry);

        // Mark original as corrected
        if (originalEntry) {
            originalEntry.status = 'CORRECTED';
            this.saveEntryResiliently(originalEntry);
        }
    }

    private saveEntryResiliently(entry: JournalEntry): void {
        const dto: any = {
            id: entry.id,
            companyId: entry.companyId || null,
            journalId: entry.journalId,
            description: entry.description,
            date: this.ensureIsoDate(entry.date),
            status: entry.status,
            reference: entry.reference || '',
            sourceDocument: entry.sourceDocument,
            sourceType: entry.sourceType,
            lines: (entry.lines || []).map(l => ({
                id: l.id,
                accountId: l.accountId,
                accountCode: l.accountCode,
                accountName: l.accountName,
                description: l.description || entry.description,
                debit: Number(l.debit) || 0,
                credit: Number(l.credit) || 0
            }))
        };

        this.dataService.saveJournalEntry(dto).subscribe({
            next: (saved) => {
                if (saved && saved.id) {
                    const local = this.allJournalEntries.find(e => e.id === entry.id);
                    if (local) Object.assign(local, saved);
                    this.journalEntries$.next(this.journalEntries);
                }
            },
            error: (err) => {
                console.error(`[AccountingService] Failed to save entry ${entry.id}:`, err);
                const apiError = err.error?.message || err.message || 'Error';
                this.toasterService.showError('Erro de Integração', `Falha ao gravar ${entry.id}: ${apiError}`);
            }
        });
    }

    private ensureIsoDate(date: any): string {
        try {
            if (!date) return new Date().toISOString().split('T')[0];
            const d = new Date(date);
            return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
        } catch (e) {
            return new Date().toISOString().split('T')[0];
        }
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
            // ONLY send fields defined in CreateAccountDto/UpdateAccountDto
            // This prevents "Bad Request" errors due to unexpected frontend-only fields like 'children'
            const dtoFields = {
                id: acc.id,
                companyId: acc.companyId || null,
                code: acc.code,
                name: acc.name,
                description: acc.description || '',
                type: acc.type,
                level: acc.level,
                parentId: acc.parentId || null,
                allowPosting: acc.allowPosting,
                balance: isNaN(Number(acc.balance)) ? 0 : Number(acc.balance),
                isActive: acc.isActive
            };

            this.dataService.saveAccount(dtoFields).subscribe({
                error: (err) => {
                    console.error(`Failed to update balance for account ${acc.code}:`, err);
                }
            });
        });


    }

    getSubAccounts(parentId: string): Account[] {
        return this.accounts.filter(a => a.parentId === parentId);
    }

    getJournalEntries(): JournalEntry[] {
        return this.journalEntries;
    }

    getAccountStatement(accountId: string, fromDate?: string, toDate?: string, companyId?: string, includeDrafts: boolean = false): Observable<any> {
        return this.dataService.getAccountStatement(accountId, fromDate, toDate, companyId, includeDrafts);
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

    /**
     * Smart Diagnostics: Analyzes the accounting data to find possible causes of imbalances
     */
    /**
     * Smart Diagnostics: Analyzes the accounting data to find possible causes of imbalances
     */
    runAccountingDiagnostics(salesDocs: any[] = [], purchaseDocs: any[] = []): AccountingIssue[] {
        const issues: AccountingIssue[] = [];

        // 1. Check for unbalanced Journal Entries (POSTED only)
        const postedEntries = this.journalEntries.filter(e => e.status === 'POSTED');
        postedEntries.forEach(entry => {
            const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
            const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                issues.push({
                    type: 'IMBALANCE',
                    severity: 'CRITICAL',
                    description: `Lançamento ${entry.id} está desequilibrado: Débito (${totalDebit.toFixed(2)}) ≠ Crédito (${totalCredit.toFixed(2)})`,
                    relatedId: entry.id,
                    details: { diff: Math.abs(totalDebit - totalCredit) }
                });
            }
        });

        // 2. Check for postings to synthetic accounts (POSTED only)
        postedEntries.forEach(entry => {
            entry.lines.forEach(line => {
                const account = this.accounts.find(a => a.id === line.accountId);
                if (account && !account.allowPosting) {
                    issues.push({
                        type: 'SYNTHETIC_POSTING',
                        severity: 'WARNING',
                        description: `Lançamento ${entry.id} contém movimentação na conta sintética ${account.code} - ${account.name}`,
                        relatedId: entry.id
                    });
                }
                if (!account) {
                    issues.push({
                        type: 'MISSING_ACCOUNT',
                        severity: 'CRITICAL',
                        description: `Lançamento ${entry.id} refere-se a uma conta inexistente (ID: ${line.accountId})`,
                        relatedId: entry.id
                    });
                }
            });
        });

        // 3. Document Integration Check (MISSING_POSTING)
        // Check Sales Documents
        salesDocs.forEach(doc => {
            const isFinalState = doc.status === 'APPROVED' || doc.status === 'POSTED';
            if (isFinalState) {
                const hasPosting = postedEntries.some(e => e.sourceDocument === doc.id);
                if (!hasPosting) {
                    issues.push({
                        type: 'MISSING_POSTING',
                        severity: 'WARNING',
                        description: `Fatura de Venda ${doc.series}/${doc.seriesNumber} está ${doc.status === 'POSTED' ? 'Lançada' : 'Aprovada'}, mas não possui registo na contabilidade.`,
                        relatedId: doc.id,
                        details: { docType: 'SALES', docRef: `${doc.series}/${doc.seriesNumber}`, docId: doc.id }
                    });
                }
            }
        });

        // Check Purchase Documents
        purchaseDocs.forEach(doc => {
            const isFinalState = doc.status === 'APPROVED' || doc.status === 'POSTED';
            if (isFinalState) {
                const hasPosting = postedEntries.some(e => e.sourceDocument === doc.id);
                if (!hasPosting) {
                    issues.push({
                        type: 'MISSING_POSTING',
                        severity: 'WARNING',
                        description: `Fatura de Compra ${doc.series}/${doc.number} está ${doc.status === 'POSTED' ? 'Lançada' : 'Aprovada'}, mas não possui registo na contabilidade.`,
                        relatedId: doc.id,
                        details: { docType: 'PURCHASES', docRef: `${doc.series}/${doc.number}`, docId: doc.id }
                    });
                }
            }
        });

        // 4. Data Integrity: Sum of all root account balances (those without parents in the list)
        let globalDebitSum = 0;
        const currentAccountIds = new Set(this.accounts.map(a => a.id));

        this.accounts.filter(a => !a.parentId || !currentAccountIds.has(a.parentId)).forEach(account => {
            const balance = Number(account.balance) || 0;
            if (account.type === 'ASSET' || account.type === 'EXPENSE') {
                globalDebitSum += balance;
            } else {
                globalDebitSum -= balance;
            }
        });

        if (Math.abs(globalDebitSum) > 0.01) {
            // Smart Diff Analysis: Look for entries matching the difference
            const diffValue = Math.abs(globalDebitSum);
            const suspiciousEntries = postedEntries.filter(e => {
                const entrySum = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
                return Math.abs(entrySum - diffValue) < 0.01;
            });

            issues.push({
                type: 'DATA_CORRUPTION',
                severity: 'CRITICAL',
                description: `O Somatório Global do Balanço não é zero (Diferencial: ${globalDebitSum.toFixed(2)} MT). Isto indica que alguns lançamentos foram registados sem atualizar corretamente os saldos.`,
                details: {
                    diff: globalDebitSum,
                    suspiciousEntryIds: suspiciousEntries.map(e => e.id)
                }
            });

            if (suspiciousEntries.length > 0) {
                issues.push({
                    type: 'UNKNOWN',
                    severity: 'INFO',
                    description: `Análise Inteligente: Detetámos ${suspiciousEntries.length} lançamentos que coincidem com o valor da diferença. Estes são os candidatos mais prováveis para o desequilíbrio.`,
                    details: { entries: suspiciousEntries }
                });
            }
        }

        // 5. Check for Drafts that should be posted (Just INFO/WARNING)
        const drafts = this.journalEntries.filter(e => e.status === 'DRAFT');
        if (drafts.length > 0) {
            issues.push({
                type: 'INVALID_TRANSACTION',
                severity: 'INFO',
                description: `Existem ${drafts.length} lançamentos em RASCUNHO que não estão refletidos nos saldos atuais.`,
                details: { count: drafts.length }
            });
        }

        // 7. Hierarchy Integrity Check (Orphan detection)
        this.accounts.forEach(acc => {
            if (acc.parentId && !currentAccountIds.has(acc.parentId)) {
                issues.push({
                    type: 'DATA_CORRUPTION',
                    severity: 'CRITICAL',
                    description: `Divergência de Hierarquia: A conta ${acc.code} é órfã (Pai ID: ${acc.parentId}). Isso impede a consolidação correta dos saldos no Balancete.`,
                    relatedId: acc.id,
                    details: { id: acc.id, code: acc.code, parentId: acc.parentId }
                });
            }
        });

        return issues;
    }

    /**
     * Recalculates all account balances from scratch based on POSTED journal entries
     * This is the extreme "Repair" function
     */
    /**
     * Recalculates all account balances from scratch based on POSTED journal entries
     * This is the extreme "Repair" function
     */
    recalculateAllBalances(): Observable<void> {
        return new Observable(observer => {
            try {
                // 1. DEDUPLICATE FIRST (Safety measure)
                this.repairAccountDuplication().then(async () => {

                    // 1b. REPAIR ORPHAN HIERARCHY (Fix stale parentIds)
                    await this.repairOrphanHierarchy();

                    // 2. Reset all account balances to 0
                    this.accounts.forEach(acc => acc.balance = 0);

                    // 3. Identify all posted entries (use allJournalEntries, NOT filtered)
                    const postedEntries = this.allJournalEntries.filter(e => e.status === 'POSTED');

                    // 4. Process each line of each entry
                    postedEntries.forEach(entry => {
                        entry.lines.forEach(line => {
                            let account = this.accounts.find(a => a.id === line.accountId);
                            if (account) {
                                const amount = (account.type === 'ASSET' || account.type === 'EXPENSE')
                                    ? (Number(line.debit) - Number(line.credit))
                                    : (Number(line.credit) - Number(line.debit));

                                // Walk up the tree
                                let currentAcc: Account | undefined = account;
                                let depthIdx = 0;
                                const maxDepth = 10; // Safety against circular refs

                                while (currentAcc && depthIdx < maxDepth) {
                                    currentAcc.balance = Number((currentAcc.balance || 0).toFixed(2)) + Number(amount.toFixed(2));

                                    if (currentAcc.parentId) {
                                        const parent = this.accounts.find(a => a.id === currentAcc!.parentId);
                                        if (!parent) {
                                            console.warn(`[AccountingService] Orphan detected! Account ${currentAcc.code} has parentId ${currentAcc.parentId} but it was not found.`);
                                        }
                                        currentAcc = parent;
                                    } else {
                                        currentAcc = undefined;
                                    }
                                    depthIdx++;
                                }
                            }
                        });
                    });

                    // 5. Save all accounts to backend
                    this.persistAllAccountBalances().then(() => {
                        observer.next();
                        observer.complete();
                    });
                });

            } catch (err) {
                observer.error(err);
            }
        });
    }

    /**
     * Repairs orphaned accounts by rebuilding parentId links from account codes.
     * An account like '11.2.1' should have a parent with code '11.2'.
     * This handles the case where parentIds are stale (numeric old IDs that no longer exist).
     */
    async repairOrphanHierarchy(): Promise<number> {
        const currentIds = new Set(this.accounts.map(a => a.id));
        const repaired: Account[] = [];

        for (const acc of this.accounts) {
            const isOrphan = acc.parentId && !currentIds.has(acc.parentId);
            if (!isOrphan) continue;

            // Derive parent code from account code (e.g., '11.2.1' → '11.2', '21.1' → '21')
            const codeParts = acc.code.split('.');
            if (codeParts.length <= 1) {
                // Top-level account, should have no parent
                console.log(`[HierarchyRepair] Account ${acc.code} is top-level, clearing stale parentId.`);
                acc.parentId = undefined;
                repaired.push(acc);
                continue;
            }

            codeParts.pop(); // Remove last segment
            const expectedParentCode = codeParts.join('.');
            const correctParent = this.accounts.find(a => a.code === expectedParentCode);

            if (correctParent) {
                console.log(`[HierarchyRepair] Repaired ${acc.code}: parentId ${acc.parentId} → ${correctParent.id} (${correctParent.code})`);
                acc.parentId = correctParent.id;
                repaired.push(acc);
            } else {
                // Parent code doesn't exist either - clear the stale link to avoid blocking
                console.warn(`[HierarchyRepair] Cannot find parent '${expectedParentCode}' for account ${acc.code}. Clearing stale parentId.`);
                acc.parentId = undefined;
                repaired.push(acc);
            }
        }

        if (repaired.length > 0) {
            console.log(`[HierarchyRepair] Repaired ${repaired.length} orphaned account(s). Persisting...`);
            for (const acc of repaired) {
                try {
                    await lastValueFrom(this.dataService.saveAccount({
                        id: acc.id,
                        companyId: acc.companyId || null,
                        code: acc.code,
                        name: acc.name,
                        description: acc.description || '',
                        type: acc.type,
                        level: acc.level,
                        parentId: acc.parentId || null,
                        allowPosting: acc.allowPosting,
                        balance: isNaN(Number(acc.balance)) ? 0 : Number(acc.balance),
                        isActive: acc.isActive
                    }));
                } catch (e) {
                    console.error(`[HierarchyRepair] Failed to save account ${acc.code}:`, e);
                }
            }
        }

        return repaired.length;
    }

    async repairAccountDuplication(): Promise<void> {
        console.log('[AccountingService] Starting Account Deduplication...');
        const codeGroups = new Map<string, Account[]>();

        this.allAccounts.forEach(acc => {
            const list = codeGroups.get(acc.code) || [];
            list.push(acc);
            codeGroups.set(acc.code, list);
        });

        for (const [code, group] of codeGroups.entries()) {
            if (group.length > 1) {
                console.warn(`[AccountingService] Found ${group.length} accounts for code ${code}. Cleaning up...`);

                // Keep the first one (usually the oldest or preset one)
                const keep = group[0];
                const toDelete = group.slice(1);

                for (const dupe of toDelete) {
                    // 1. Link entries to the kept ID
                    this.allJournalEntries.forEach(entry => {
                        entry.lines.forEach(line => {
                            if (line.accountId === dupe.id) {
                                line.accountId = keep.id;
                            }
                        });
                    });
                    // 2. Re-link children accounts to the kept ID
                    this.allAccounts.forEach(acc => {
                        if (acc.parentId === dupe.id) {
                            acc.parentId = keep.id;
                            console.log(`[AccountingService] Re-linked child account ${acc.code} to new parent ${keep.code}`);
                        }
                    });

                    // 3. Delete from server
                    try {
                        await lastValueFrom(this.dataService.deleteAccount(dupe.id));
                        console.log(`[AccountingService] Deleted duplicate account: ${dupe.id} (${code})`);
                    } catch (e) {
                        console.error(`[AccountingService] Failed to delete account ${dupe.id}`, e);
                    }
                }
            }
        }

        await this.loadAccounts(); // Refresh global list
    }

    /**
     * Automatically attempts to post journal entries for documents that are missing them
     */
    autoFixMissingPostings(salesDocs: any[], purchaseDocs: any[]): Observable<number> {
        return new Observable(observer => {
            let fixedCount = 0;
            // Always check against ALL entries to avoid matching against filtered subset
            const postedEntries = this.allJournalEntries.filter(e => e.status === 'POSTED');

            // Fix Sales
            salesDocs.forEach(doc => {
                if ((doc.status === 'POSTED' || doc.status === 'APPROVED') && !postedEntries.some(e => e.sourceDocument === doc.id)) {
                    try {
                        this.createSalesJournalEntry(doc, null, []);
                        fixedCount++;
                    } catch (e) { console.warn('[AutoFix] Sales entry failed:', e); }
                }
            });

            // Fix Purchases
            purchaseDocs.forEach(doc => {
                if ((doc.status === 'POSTED' || doc.status === 'APPROVED') && !postedEntries.some(e => e.sourceDocument === doc.id)) {
                    try {
                        this.createPurchaseJournalEntry(doc, null);
                        fixedCount++;
                    } catch (e) { console.warn('[AutoFix] Purchase entry failed:', e); }
                }
            });

            console.log(`[AutoFix] Created ${fixedCount} missing entries. Triggering balance recalculation...`);

            if (fixedCount > 0) {
                // Give the async saves a moment to start, then recalculate balances from scratch
                setTimeout(() => {
                    this.recalculateAllBalances().subscribe({
                        next: () => {
                            console.log('[AutoFix] Balance recalculation complete.');
                            observer.next(fixedCount);
                            observer.complete();
                        },
                        error: (err) => {
                            console.error('[AutoFix] Balance recalculation failed:', err);
                            observer.next(fixedCount); // Still report success
                            observer.complete();
                        }
                    });
                }, 1500);
            } else {
                observer.next(0);
                observer.complete();
            }
        });
    }

    private async persistAllAccountBalances() {
        // Save to backend
        for (const acc of this.accounts) {
            const dtoFields = {
                id: acc.id,
                companyId: acc.companyId || null,
                code: acc.code,
                name: acc.name,
                description: acc.description || '',
                type: acc.type,
                level: acc.level,
                parentId: acc.parentId || null,
                allowPosting: acc.allowPosting,
                balance: isNaN(Number(acc.balance)) ? 0 : Number(acc.balance),
                isActive: acc.isActive
            };
            await lastValueFrom(this.dataService.saveAccount(dtoFields));
        }
    }
}
