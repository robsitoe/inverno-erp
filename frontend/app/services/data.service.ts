import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private config: any;

    constructor(private http: HttpClient) {
        this.loadConfig();
    }

    private loadConfig() {
        const stored = localStorage.getItem('erp_system_config');
        this.config = stored ? JSON.parse(stored) : { deploymentMode: 'LOCAL', localStorageType: 'BROWSER' };
    }

    private get baseUrl() {
        this.loadConfig();
        return this.config.deploymentMode === 'WEB' ? this.config.apiUrl : 'http://localhost:3000';
    }

    private isLocalBrowser(): boolean {
        // Reload config to ensure we have the latest
        this.loadConfig();
        return this.config.deploymentMode === 'LOCAL' && this.config.localStorageType === 'BROWSER';
    }

    // --- Company Info ---
    getCompanyInfo(): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_company_info');
            // Return default if not found, matching previous logic
            if (!stored) {
                return of({
                    name: 'Minha Empresa, Lda.',
                    nif: '123456789',
                    address: 'Maputo, Moçambique',
                    email: 'info@empresa.com',
                    phone: '+258 84 000 0000',
                    website: ''
                });
            }
            return of(JSON.parse(stored));
        } else {
            return this.http.get(`${this.baseUrl}/company`);
        }
    }

    saveCompanyInfo(data: any): Observable<any> {
        if (this.isLocalBrowser()) {
            localStorage.setItem('erp_company_info', JSON.stringify(data));

            // Update global list (legacy support)
            // Update global list (legacy support)
            const storedCompanies = localStorage.getItem('erp_companies');
            let companies: any[] = storedCompanies ? JSON.parse(storedCompanies) : [];

            if (data.id) {
                const index = companies.findIndex(c => c.id === data.id);
                if (index !== -1) {
                    companies[index] = { ...companies[index], ...data };
                } else {
                    companies.push(data);
                }
                localStorage.setItem('erp_companies', JSON.stringify(companies));
            }

            return of(data);
        } else {
            return this.http.post(`${this.baseUrl}/company`, data);
        }
    }

    // --- Fiscal Years ---
    getFiscalYears(companyId?: string): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_fiscal_years');
            if (!stored) return of([]);

            const allYears = JSON.parse(stored);
            if (companyId) {
                return of(allYears.filter((y: any) => y.companyId === companyId).sort((a: any, b: any) => b.year - a.year));
            }
            return of(allYears.sort((a: any, b: any) => b.year - a.year));
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/fiscal-years?companyId=${companyId || ''}`);
        }
    }

    saveFiscalYear(year: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_fiscal_years');
            let allYears = stored ? JSON.parse(stored) : [];

            // Remove existing if updating
            allYears = allYears.filter((y: any) => !(y.companyId === year.companyId && y.year === year.year));

            allYears.push(year);
            localStorage.setItem('erp_fiscal_years', JSON.stringify(allYears));
            return of(year);
        } else {
            return this.http.post(`${this.baseUrl}/fiscal-years`, year);
        }
    }

    updateFiscalYearsList(years: any[]): Observable<any> {
        if (this.isLocalBrowser()) {
            // This is a bit tricky for local storage as we store ALL years flat.
            // We'd need to merge. For now, let's assume this is used for bulk updates or reordering which might not be common.
            // Or specifically for setting 'isCurrent' flags.

            // Let's just save the whole list if we are managing a specific company's years?
            // No, safer to update individually or reload.
            // Let's implement a specific method for setting current year which is the main use case.
            return of(true);
        } else {
            return of(true); // Backend logic would differ
        }
    }

    setAsCurrentYear(year: number, companyId: string): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_fiscal_years');
            if (stored) {
                const allYears = JSON.parse(stored);
                allYears.forEach((y: any) => {
                    if (y.companyId === companyId) {
                        y.isCurrent = (y.year === year);
                    }
                });
                localStorage.setItem('erp_fiscal_years', JSON.stringify(allYears));
            }
            return of(true);
        } else {
            return this.http.post(`${this.baseUrl}/fiscal-years/set-current`, { year, companyId });
        }
    }

    getCompanies(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_companies');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/companies`);
        }
    }

    deleteCompany(id: string): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_companies');
            if (stored) {
                const companies = JSON.parse(stored).filter((c: any) => c.id !== id);
                localStorage.setItem('erp_companies', JSON.stringify(companies));
            }
            return of(true);
        } else {
            return this.http.delete(`${this.baseUrl}/companies/${id}`);
        }
    }

    // --- Series ---
    getSeries(companyId?: string): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_series_definitions');
            if (!stored) return of([]);
            const allSeries = JSON.parse(stored);
            if (companyId) {
                return of(allSeries.filter((s: any) => s.companyId === companyId));
            }
            return of(allSeries);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/series?companyId=${companyId || ''}`);
        }
    }

    saveSeries(series: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_series_definitions');
            const allSeries = stored ? JSON.parse(stored) : [];

            if (series.id) {
                const index = allSeries.findIndex((s: any) => s.id === series.id);
                if (index !== -1) {
                    allSeries[index] = series;
                } else {
                    allSeries.push(series);
                }
            } else {
                // Fallback for legacy without ID
                const index = allSeries.findIndex((s: any) => s.code === series.code && s.companyId === series.companyId);
                if (index !== -1) {
                    allSeries[index] = series;
                } else {
                    allSeries.push(series);
                }
            }

            localStorage.setItem('erp_series_definitions', JSON.stringify(allSeries));
            return of(series);
        } else {
            return this.http.post(`${this.baseUrl}/series`, series);
        }
    }

    deleteSeries(id: string): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_series_definitions');
            if (stored) {
                const allSeries = JSON.parse(stored).filter((s: any) => s.id !== id);
                localStorage.setItem('erp_series_definitions', JSON.stringify(allSeries));
            }
            return of(true);
        } else {
            return this.http.delete(`${this.baseUrl}/series/${id}`);
        }
    }

    // --- Articles ---
    getArticles(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_articles');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/inventory/articles`);
        }
    }

    saveArticle(article: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_articles');
            const articles = stored ? JSON.parse(stored) : [];
            const index = articles.findIndex((a: any) => a.id === article.id);
            if (index !== -1) {
                articles[index] = article;
            } else {
                articles.push(article);
            }
            localStorage.setItem('erp_articles', JSON.stringify(articles));
            return of(article);
        } else {
            return this.http.post(`${this.baseUrl}/inventory/articles`, article);
        }
    }

    // --- Accounting ---
    getAccounts(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_accounts_v2');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/accounting/accounts`);
        }
    }

    saveAccount(account: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_accounts_v2');
            const accounts = stored ? JSON.parse(stored) : [];
            const index = accounts.findIndex((a: any) => a.id === account.id);
            if (index !== -1) {
                accounts[index] = account;
            } else {
                accounts.push(account);
            }
            localStorage.setItem('erp_accounts_v2', JSON.stringify(accounts));
            return of(account);
        } else {
            return this.http.post(`${this.baseUrl}/accounting/accounts`, account);
        }
    }

    getJournalEntries(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_journal_entries');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/accounting/journal-entries`);
        }
    }

    saveJournalEntry(entry: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_journal_entries');
            const entries = stored ? JSON.parse(stored) : [];
            const index = entries.findIndex((e: any) => e.id === entry.id);
            if (index !== -1) {
                entries[index] = entry;
            } else {
                entries.push(entry);
            }
            localStorage.setItem('erp_journal_entries', JSON.stringify(entries));
            return of(entry);
        } else {
            return this.http.post(`${this.baseUrl}/accounting/journal-entries`, entry);
        }
    }

    getJournals(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_journals');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/accounting/journals`);
        }
    }

    saveJournal(journal: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_journals');
            const journals = stored ? JSON.parse(stored) : [];
            const index = journals.findIndex((j: any) => j.id === journal.id);
            if (index !== -1) {
                journals[index] = journal;
            } else {
                journals.push(journal);
            }
            localStorage.setItem('erp_journals', JSON.stringify(journals));
            return of(journal);
        } else {
            return this.http.post(`${this.baseUrl}/accounting/journals`, journal);
        }
    }

    // --- Documents (Sales, Purchases, Treasury) ---

    getSalesDocuments(companyId?: string): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_sales_documents');
            const docs = stored ? JSON.parse(stored) : [];
            if (companyId) {
                return of(docs.filter((d: any) => d.companyId === companyId));
            }
            return of(docs);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/sales/documents?companyId=${companyId || ''}`);
        }
    }

    getSalesDocumentByNumber(companyId: string, type: string, series: string, number: number): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_sales_documents');
            const docs = stored ? JSON.parse(stored) : [];
            const doc = docs.find((d: any) =>
                d.companyId === companyId &&
                d.documentType === type &&
                d.series === series &&
                d.seriesNumber === number
            );
            return of(doc || null);
        } else {
            return this.http.get<any>(`${this.baseUrl}/sales/documents/find?companyId=${companyId}&type=${type}&series=${series}&number=${number}`);
        }
    }

    getPurchaseDocuments(companyId?: string): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_purchase_documents');
            const docs = stored ? JSON.parse(stored) : [];
            if (companyId) {
                return of(docs.filter((d: any) => d.companyId === companyId));
            }
            return of(docs);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/purchases/documents?companyId=${companyId || ''}`);
        }
    }

    getPurchaseDocumentByNumber(companyId: string, type: string, series: string, number: number): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_purchase_documents');
            const docs = stored ? JSON.parse(stored) : [];
            const doc = docs.find((d: any) =>
                d.companyId === companyId &&
                d.documentType === type &&
                d.series === series &&
                d.seriesNumber === number
            );
            return of(doc || null);
        } else {
            return this.http.get<any>(`${this.baseUrl}/purchases/documents/find?companyId=${companyId}&type=${type}&series=${series}&number=${number}`);
        }
    }

    saveSalesDocument(doc: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_sales_documents');
            const docs = stored ? JSON.parse(stored) : [];
            const index = docs.findIndex((d: any) => d.id === doc.id);
            if (index !== -1) {
                docs[index] = doc;
            } else {
                docs.push(doc);
            }
            localStorage.setItem('erp_sales_documents', JSON.stringify(docs));
            return of(doc);
        } else {
            return this.http.post(`${this.baseUrl}/sales/documents`, doc);
        }
    }

    savePurchaseDocument(doc: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_purchase_documents');
            const docs = stored ? JSON.parse(stored) : [];
            const index = docs.findIndex((d: any) => d.id === doc.id);
            if (index !== -1) {
                docs[index] = doc;
            } else {
                docs.push(doc);
            }
            localStorage.setItem('erp_purchase_documents', JSON.stringify(docs));
            return of(doc);
        } else {
            return this.http.post(`${this.baseUrl}/purchases/documents`, doc);
        }
    }

    getTreasuryDocuments(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_treasury_documents');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/treasury/documents`);
        }
    }

    getReceipts(companyId?: string): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_receipts');
            const docs = stored ? JSON.parse(stored) : [];
            if (companyId) return of(docs.filter((d: any) => d.companyId === companyId));
            return of(docs);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/treasury/receipts?companyId=${companyId || ''}`);
        }
    }

    saveReceipt(receipt: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_receipts');
            const receipts = stored ? JSON.parse(stored) : [];
            receipts.push(receipt);
            localStorage.setItem('erp_receipts', JSON.stringify(receipts));
            return of(receipt);
        } else {
            return this.http.post(`${this.baseUrl}/treasury/receipts`, receipt);
        }
    }

    getPayments(companyId?: string): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_payments');
            const docs = stored ? JSON.parse(stored) : [];
            if (companyId) return of(docs.filter((d: any) => d.companyId === companyId));
            return of(docs);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/treasury/payments?companyId=${companyId || ''}`);
        }
    }

    savePayment(payment: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_payments');
            const payments = stored ? JSON.parse(stored) : [];
            payments.push(payment);
            localStorage.setItem('erp_payments', JSON.stringify(payments));
            return of(payment);
        } else {
            return this.http.post(`${this.baseUrl}/treasury/payments`, payment);
        }
    }

    // --- Customers ---
    getCustomers(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_customers');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/customers`);
        }
    }

    saveCustomer(customer: any): Observable<any> {
        if (this.isLocalBrowser()) {
            localStorage.setItem('erp_customers', JSON.stringify(customer));
            return of(customer);
        } else {
            return this.http.post(`${this.baseUrl}/customers`, customer);
        }
    }

    // --- Suppliers ---
    getSuppliers(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_suppliers');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/suppliers`);
        }
    }

    saveSupplier(supplier: any): Observable<any> {
        if (this.isLocalBrowser()) {
            localStorage.setItem('erp_suppliers', JSON.stringify(supplier));
            return of(supplier);
        } else {
            return this.http.post(`${this.baseUrl}/suppliers`, supplier);
        }
    }

    // --- Generic Entities ---
    getGenericEntities(type?: string): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_generic_entities');
            const all = stored ? JSON.parse(stored) : [];
            if (type) {
                return of(all.filter((e: any) => e.type === type));
            }
            return of(all);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/entities?type=${type || ''}`);
        }
    }

    saveGenericEntity(entity: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_generic_entities');
            const all = stored ? JSON.parse(stored) : [];
            const index = all.findIndex((e: any) => e.id === entity.id);
            if (index !== -1) {
                all[index] = entity;
            } else {
                all.push(entity);
            }
            localStorage.setItem('erp_generic_entities', JSON.stringify(all));
            return of(entity);
        } else {
            return this.http.post(`${this.baseUrl}/entities`, entity);
        }
    }

    // --- Payment Methods ---
    getPaymentMethods(companyId?: string): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_payment_methods');
            if (!stored) return of([]);

            const all = JSON.parse(stored);
            if (companyId) {
                return of(all.filter((pm: any) => !pm.companyId || pm.companyId === companyId)
                    .sort((a: any, b: any) => a.sortOrder - b.sortOrder));
            }
            return of(all.sort((a: any, b: any) => a.sortOrder - b.sortOrder));
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/payment-methods?companyId=${companyId || ''}`);
        }
    }

    savePaymentMethod(method: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_payment_methods');
            let all = stored ? JSON.parse(stored) : [];
            const index = all.findIndex((pm: any) => pm.id === method.id);
            if (index !== -1) {
                all[index] = method;
            } else {
                all.push(method);
            }
            localStorage.setItem('erp_payment_methods', JSON.stringify(all));
            return of(method);
        } else {
            return this.http.post(`${this.baseUrl}/payment-methods`, method);
        }
    }

    // --- Users ---
    getUsers(): Observable<any[]> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_users');
            return of(stored ? JSON.parse(stored) : []);
        } else {
            return this.http.get<any[]>(`${this.baseUrl}/users`);
        }
    }

    saveUser(user: any): Observable<any> {
        if (this.isLocalBrowser()) {
            const stored = localStorage.getItem('erp_users');
            const users = stored ? JSON.parse(stored) : [];
            const index = users.findIndex((u: any) => u.id === user.id);
            if (index !== -1) {
                users[index] = user;
            } else {
                users.push(user);
            }
            localStorage.setItem('erp_users', JSON.stringify(users));
            return of(user);
        } else {
            // Clean the user object - remove auto-generated fields
            const cleanUser = { ...user };
            delete cleanUser.createdAt;
            delete cleanUser.updatedAt;

            if (cleanUser.id) {
                return this.http.patch(`${this.baseUrl}/users/${cleanUser.id}`, cleanUser);
            } else {
                return this.http.post(`${this.baseUrl}/users`, cleanUser);
            }
        }
    }

    syncAllDataToBackend(): Observable<any> {
        const data = {
            companyInfo: JSON.parse(localStorage.getItem('erp_company_info') || 'null'),
            fiscalYears: JSON.parse(localStorage.getItem('erp_fiscal_years') || '[]'),
            articles: JSON.parse(localStorage.getItem('erp_articles') || '[]'),
            accounts: JSON.parse(localStorage.getItem('erp_accounts_v2') || '[]'),
            journals: JSON.parse(localStorage.getItem('erp_journals') || '[]'),
            journalEntries: JSON.parse(localStorage.getItem('erp_journal_entries') || '[]'),
            salesDocuments: JSON.parse(localStorage.getItem('erp_sales_documents') || '[]'),
            purchaseDocuments: JSON.parse(localStorage.getItem('erp_purchase_documents') || '[]'),
            receipts: JSON.parse(localStorage.getItem('erp_receipts') || '[]'),
            payments: JSON.parse(localStorage.getItem('erp_payments') || '[]'),
            stockMovements: JSON.parse(localStorage.getItem('erp_stock_movements') || '[]'),
            customers: JSON.parse(localStorage.getItem('erp_customers') || '[]'),
            suppliers: JSON.parse(localStorage.getItem('erp_suppliers') || '[]'),
            companies: JSON.parse(localStorage.getItem('erp_companies') || '[]'),
            users: JSON.parse(localStorage.getItem('erp_users') || '[]'),
        };

        return this.http.post(`${this.baseUrl}/sync/push`, data);
    }
}
