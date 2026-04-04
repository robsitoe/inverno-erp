import { Injectable } from '@angular/core';


import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';


import { Observable, of, BehaviorSubject, map, catchError, throwError, tap } from 'rxjs';


import { SALES_DOCUMENT_TYPES, PURCHASE_DOCUMENT_TYPES, TREASURY_DOCUMENT_TYPES, STOCK_DOCUMENT_TYPES } from '../shared/constants';

import { environment } from '../shared/config';








@Injectable({


    providedIn: 'root'


})


export class DataService {


    private config: any;


    private activeCompanySubject = new BehaviorSubject<any>(this.getStoredCompany());


    public activeCompany$ = this.activeCompanySubject.asObservable();





    public getCurrentCompany() {


        return this.activeCompanySubject.value;


    }








    constructor(private http: HttpClient) {


        this.loadConfig();


    }





    private loadConfig() {


        const stored = localStorage.getItem('erp_system_config');


        if (stored) {


            this.config = JSON.parse(stored);


        } else {


            // Point 1: Definir política por ambiente


            // Default to LOCAL with POSTGRES (Development)


            this.config = {


                deploymentMode: 'LOCAL',


                localStorageType: 'POSTGRES',


                apiUrl: environment.apiUrl


            };


            localStorage.setItem('erp_system_config', JSON.stringify(this.config));


        }


    }





    public getSystemConfig() {


        if (!this.config) this.loadConfig();


        return this.config;


    }





    private get baseUrl() {


        if (!this.config) this.loadConfig();


        return this.config.deploymentMode === 'WEB' ? this.config.apiUrl : environment.apiUrl;


    }





    public isLocalBrowser(): boolean {


        // Point 1: policy check


        if (!this.config) this.loadConfig();


        return this.config.localStorageType === 'BROWSER';


    }





    public getDataSourceLabel(): string {


        if (this.isLocalBrowser()) return 'OFFLINE / LOCAL';


        return this.config.deploymentMode === 'WEB' ? 'BACKEND (NUVEM)' : 'BACKEND (LOCAL)';


    }





    public checkBackendConnectivity(): Observable<boolean> {


        return this.http.get(`${this.baseUrl}/test-route`).pipe(


            map(() => true),


            catchError(() => of(false))


        );


    }





    // Point 6 & 7: Autenticação e contexto consistentes


    // Se faltar empresa ativa, não deveria permitir certas escritas no modo backend


    public checkActiveCompanyContext(): boolean {


        const company = this.activeCompanySubject.value;


        if (!company || !company.id) {


            console.error('[Security] Operação bloqueada: Nenhuma empresa ativa selecionada.');


            return false;


        }


        return true;


    }





    // --- Workflow Methods ---


    processWorkflow(module: 'sales' | 'purchases' | 'treasury', id: string, action: string, notes?: string): Observable<any> {


        if (this.isLocalBrowser()) {


            // Local fallback logic (minimal)


            const key = `erp_${module}_documents`;


            const stored = localStorage.getItem(key);


            if (stored) {


                const docs = JSON.parse(stored);


                const doc = docs.find((d: any) => d.id === id);


                if (doc) {


                    const fromStatus = doc.status || 'DRAFT';


                    doc.status = action === 'SUBMIT' ? 'SUBMITTED' : action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : action === 'POST' ? 'POSTED' : doc.status;


                    doc.statusNotes = notes;


                    localStorage.setItem(key, JSON.stringify(docs));


                    return of({ success: true, status: doc.status });


                }


            }


            return throwError(() => new Error('Document not found locally'));


        }





        const url = `/${module}/documents/${id}/workflow`;


        return this.http.patch(`${this.baseUrl}${url}`, { action, notes });


    }





    getWorkflowHistory(module: 'sales' | 'purchases' | 'treasury', id: string): Observable<any[]> {


        if (this.isLocalBrowser()) return of([]);


        const url = `/${module}/documents/${id}/history`;


        return this.http.get<any[]>(`${this.baseUrl}${url}`);


    }





    private getStoredCompany(): any {


        const stored = localStorage.getItem('erp_company_info');


        return stored ? JSON.parse(stored) : null;


    }





    public setActiveCompany(company: any) {


        if (company) {


            localStorage.setItem('erp_company_info', JSON.stringify(company));


        } else {


            localStorage.removeItem('erp_company_info');


        }


        this.activeCompanySubject.next(company);


    }





    public getCompanyId(): string | null {


        const company = this.activeCompanySubject.value;


        return company ? company.id : null;


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


            return this.http.get(`${this.baseUrl}/company`).pipe(


                tap((info: any) => {


                    if (info && info.id) {


                        this.setActiveCompany(info);


                    }


                })


            );


        }


    }





    saveCompanyInfo(data: any): Observable<any> {


        if (this.isLocalBrowser()) {


            localStorage.setItem('erp_company_info', JSON.stringify(data));


            this.activeCompanySubject.next(data);








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


            const companyId = this.activeCompanySubject.value?.id || '001';


            const stored = localStorage.getItem(`erp_articles_${companyId}`);


            return of(stored ? JSON.parse(stored) : []);


        } else {


            const companyId = this.activeCompanySubject.value?.id || '';


            return this.http.get<any[]>(`${this.baseUrl}/inventory/articles?companyId=${companyId}`);


        }


    }








    saveArticle(article: any): Observable<any> {


        if (this.isLocalBrowser()) {


            const companyId = this.activeCompanySubject.value?.id || '001';


            const stored = localStorage.getItem(`erp_articles_${companyId}`);


            const articles = stored ? JSON.parse(stored) : [];


            const dataToSave = Array.isArray(article) ? article : [article];





            // If data is whole array, replace. If single, update.


            let finalArticles = articles;


            if (Array.isArray(article)) {


                finalArticles = article;


            } else {


                const index = articles.findIndex((a: any) => a.id === article.id);


                if (index !== -1) {


                    articles[index] = article;


                } else {


                    articles.push(article);


                }


            }


            localStorage.setItem(`erp_articles_${companyId}`, JSON.stringify(finalArticles));


            return of(article);


        } else {


            const data = Array.isArray(article) ? article : [article];


            return this.http.post(`${this.baseUrl}/inventory/articles`, data);


        }


    }





    deleteArticle(id: string): Observable<any> {


        if (this.isLocalBrowser()) {


            const companyId = this.activeCompanySubject.value?.id || '001';


            const stored = localStorage.getItem(`erp_articles_${companyId}`);


            if (stored) {


                const articles = JSON.parse(stored).filter((a: any) => a.id !== id);


                localStorage.setItem(`erp_articles_${companyId}`, JSON.stringify(articles));


            }


            return of(true);


        } else {


            return this.http.delete(`${this.baseUrl}/inventory/articles/${id}`);


        }


    }





    // --- Stock Movements ---


    getStockMovements(companyId?: string): Observable<any[]> {


        if (this.isLocalBrowser()) {


            const stored = localStorage.getItem('erp_stock_movements');


            const all = stored ? JSON.parse(stored) : [];


            const targetCompany = companyId || this.activeCompanySubject.value?.id;


            if (targetCompany) {


                return of(all.filter((m: any) => m.companyId === targetCompany));


            }


            return of(all);


        } else {


            const cId = companyId || this.activeCompanySubject.value?.id || '';


            return this.http.get<any[]>(`${this.baseUrl}/inventory/stock-movements?companyId=${cId}`);


        }


    }





    saveStockMovement(movement: any): Observable<any> {


        if (this.isLocalBrowser()) {


            const stored = localStorage.getItem('erp_stock_movements');


            const movements = stored ? JSON.parse(stored) : [];


            movements.push(movement);


            localStorage.setItem('erp_stock_movements', JSON.stringify(movements));


            return of(movement);


        } else {


            return this.http.post(`${this.baseUrl}/inventory/stock-movements`, movement);


        }


    }








    // --- Accounting ---


    getAccounts(companyId?: string): Observable<any[]> {


        if (this.isLocalBrowser()) {


            const stored = localStorage.getItem('erp_accounts_v2');


            const all = stored ? JSON.parse(stored) : [];


            if (companyId) {


                return of(all.filter((a: any) => a.companyId === companyId));


            }


            return of(all);


        } else {


            return this.http.get<any[]>(`${this.baseUrl}/accounting/accounts?companyId=${companyId || ''}`);


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


            // Use POST for both create and update as backend repo.save() handles both


            return this.http.post(`${this.baseUrl}/accounting/accounts`, account);


        }


    }





    deleteAccount(id: string): Observable<any> {


        if (this.isLocalBrowser()) {


            const stored = localStorage.getItem('erp_accounts_v2');


            if (stored) {


                const accounts = JSON.parse(stored).filter((a: any) => a.id !== id);


                localStorage.setItem('erp_accounts_v2', JSON.stringify(accounts));


            }


            return of(true);


        } else {


            return this.http.delete(`${this.baseUrl}/accounting/accounts/${id}`);


        }


    }








    loadAccountsPreset(presetName: string, companyId?: string): Observable<any> {


        if (this.isLocalBrowser()) {


            // No local preset logic yet, usually just returns error or does nothing


            return throwError(() => new Error('Presets not supported in BROWSER mode yet.'));


        } else {


            return this.http.post(`${this.baseUrl}/accounting/accounts/presets/${presetName}?companyId=${companyId || ''}`, {});


        }


    }





    clearAccounts(companyId?: string): Observable<any> {


        if (this.isLocalBrowser()) {


            localStorage.setItem('erp_accounts_v2', JSON.stringify([]));


            return of(true);


        } else {


            return this.http.delete(`${this.baseUrl}/accounting/accounts?companyId=${companyId || ''}`);


        }


    }





    recalculateAccountBalances(companyId?: string): Observable<any> {


        if (this.isLocalBrowser()) {


            return of(true);


        } else {


            return this.http.post(`${this.baseUrl}/accounting/accounts/recalculate?companyId=${companyId || ''}`, {});


        }


    }








    getAccountStatement(accountId: string, fromDate?: string, toDate?: string, companyId?: string, includeDrafts: boolean = false): Observable<any> {


        if (this.isLocalBrowser()) {


            // Local fallback logic is already handled in AccountStatementComponent 


            // but for consistency with "aligned with backend" we return empty or just throw


            // Actually, I'll return empty observable and let component handle local


            return of({ initialBalance: 0, movements: [] });


        } else {


            let params = new HttpParams();


            if (fromDate) params = params.set('fromDate', fromDate);


            if (toDate) params = params.set('toDate', toDate);


            if (companyId) params = params.set('companyId', companyId);


            if (includeDrafts) params = params.set('includeDrafts', 'true');


            return this.http.get(`${this.baseUrl}/accounting/statements/${accountId}`, { params });


        }


    }





    getBalanceSheet(companyId?: string): Observable<any> {


        if (this.isLocalBrowser()) return of({ assets: {}, equityAndLiabilities: {} });


        return this.http.get(`${this.baseUrl}/accounting/reports/balance-sheet?companyId=${companyId || ''}`);


    }





    getIncomeStatement(companyId?: string): Observable<any> {


        if (this.isLocalBrowser()) return of({});


        return this.http.get(`${this.baseUrl}/accounting/reports/income-statement?companyId=${companyId || ''}`);


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





    getJournalEntries(companyId?: string): Observable<any[]> {


        if (this.isLocalBrowser()) {


            const stored = localStorage.getItem('erp_journal_entries');


            const all = stored ? JSON.parse(stored) : [];


            if (companyId) {


                return of(all.filter((e: any) => e.companyId === companyId));


            }


            return of(all);


        } else {


            return this.http.get<any[]>(`${this.baseUrl}/accounting/journal-entries?companyId=${companyId || ''}`);


        }


    }





    getJournals(companyId?: string): Observable<any[]> {


        if (this.isLocalBrowser()) {


            const stored = localStorage.getItem('erp_journals');


            const all = stored ? JSON.parse(stored) : [];


            if (companyId) {


                return of(all.filter((j: any) => j.companyId === companyId));


            }


            return of(all);


        } else {


            return this.http.get<any[]>(`${this.baseUrl}/accounting/journals?companyId=${companyId || ''}`);


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





    getSalesDocument(id: string): Observable<any> {


        if (this.isLocalBrowser()) {


            const stored = localStorage.getItem('erp_sales_documents');


            const docs = stored ? JSON.parse(stored) : [];


            return of(docs.find((d: any) => d.id === id) || null);


        } else {


            return this.http.get<any>(`${this.baseUrl}/sales/documents/${id}`);


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





    getPurchaseDocument(id: string): Observable<any> {


        if (this.isLocalBrowser()) {


            const stored = localStorage.getItem('erp_purchase_documents');


            const docs = stored ? JSON.parse(stored) : [];


            return of(docs.find((d: any) => d.id === id) || null);


        } else {


            return this.http.get<any>(`${this.baseUrl}/purchases/documents/${id}`);


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





    getStockDocuments(companyId?: string): Observable<any[]> {


        if (this.isLocalBrowser()) {


            const cId = companyId || this.activeCompanySubject.value?.id;


            const key = cId ? `erp_stock_documents_${cId}` : 'erp_stock_documents';


            const stored = localStorage.getItem(key);


            const docs = stored ? JSON.parse(stored) : [];


            return of(docs);


        } else {


            return this.http.get<any[]>(`${this.baseUrl}/inventory/stock-documents?companyId=${companyId || ''}`);


        }


    }





    saveStockDocument(doc: any): Observable<any> {


        if (this.isLocalBrowser()) {


            const companyId = this.activeCompanySubject.value?.id;


            const key = companyId ? `erp_stock_documents_${companyId}` : 'erp_stock_documents';


            const stored = localStorage.getItem(key);


            const docs = stored ? JSON.parse(stored) : [];


            const index = docs.findIndex((d: any) => d.id === doc.id);


            if (index !== -1) {


                docs[index] = doc;


            } else {


                docs.push(doc);


            }


            localStorage.setItem(key, JSON.stringify(docs));


            return of(doc);


        } else {


            return this.http.post(`${this.baseUrl}/inventory/stock-documents`, doc);


        }


    }





    // Taxes


    getTaxes(companyId?: string): Observable<any[]> {


        const url = companyId ? `${this.baseUrl}/taxes?companyId=${companyId}` : `${this.baseUrl}/taxes`;


        return this.http.get<any[]>(url);


    }





    saveTax(tax: any): Observable<any> {


        if (tax.id && !tax.id.startsWith('new_')) {


            return this.http.patch(`${this.baseUrl}/taxes/${tax.id}`, tax);


        } else {


            const { id, ...data } = tax;


            return this.http.post(`${this.baseUrl}/taxes`, data);


        }


    }





    deleteTax(id: string): Observable<any> {


        return this.http.delete(`${this.baseUrl}/taxes/${id}`);


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


            const companyId = this.activeCompanySubject.value?.id || '001';


            const stored = localStorage.getItem(`erp_customers_${companyId}`);


            return of(stored ? JSON.parse(stored) : []);


        } else {


            const companyId = this.activeCompanySubject.value?.id || '';


            return this.http.get<any[]>(`${this.baseUrl}/customers?companyId=${companyId}`);


        }


    }








    saveCustomer(customer: any): Observable<any> {


        if (this.isLocalBrowser()) {


            const companyId = this.activeCompanySubject.value?.id || '001';


            localStorage.setItem(`erp_customers_${companyId}`, JSON.stringify(customer));


            return of(customer);


        } else {


            return this.http.post(`${this.baseUrl}/customers`, customer);


        }


    }


    getDeliveryPoints(customerId: string): Observable<any[]> {
        if (this.isLocalBrowser()) return of([]);
        return this.http.get<any[]>(`${this.baseUrl}/delivery-points?customerId=${customerId}`);
    }

    saveDeliveryPoint(point: any): Observable<any> {
        if (this.isLocalBrowser()) return of(point);
        const pid = this.getCompanyId();
        return this.http.post(`${this.baseUrl}/delivery-points`, { ...point, companyId: point.companyId || pid });
    }

    deleteDeliveryPoint(id: string): Observable<any> {
        if (this.isLocalBrowser()) return of(true);
        return this.http.delete(`${this.baseUrl}/delivery-points/${id}`);
    }








    // --- Suppliers ---


    getSuppliers(): Observable<any[]> {


        if (this.isLocalBrowser()) {


            const companyId = this.activeCompanySubject.value?.id || '001';


            const stored = localStorage.getItem(`erp_suppliers_${companyId}`);


            return of(stored ? JSON.parse(stored) : []);


        } else {


            const companyId = this.activeCompanySubject.value?.id || '';


            return this.http.get<any[]>(`${this.baseUrl}/suppliers?companyId=${companyId}`);


        }


    }








    saveSupplier(supplier: any): Observable<any> {


        if (this.isLocalBrowser()) {


            const companyId = this.activeCompanySubject.value?.id || '001';


            localStorage.setItem(`erp_suppliers_${companyId}`, JSON.stringify(supplier));


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





    // --- Document Types ---


    getDocumentTypes(module: string): Observable<any[]> {


        // Normalize module name


        let normalizedModule = module.toUpperCase();


        if (normalizedModule === 'INVENTORY') normalizedModule = 'STOCK';





        if (this.isLocalBrowser()) {


            const companyId = this.activeCompanySubject.value?.id || '001';


            let key = `erp_${normalizedModule.toLowerCase()}_document_types_${companyId}`;


            let stored = localStorage.getItem(key);





            // Handle transition from 'inventory' to 'stock' key


            if (!stored && normalizedModule === 'STOCK') {


                const oldKey = `erp_inventory_document_types_${companyId}`;


                stored = localStorage.getItem(oldKey);


                if (stored) localStorage.setItem(key, stored);


            }





            if (stored) {


                let types = JSON.parse(stored);





                // Self-healing: Merge missing standard types for Treasury


                if (normalizedModule === 'TREASURY') {


                    const missingStandard = TREASURY_DOCUMENT_TYPES.filter(std => !types.some((t: any) => t.code === std.code));


                    if (missingStandard.length > 0) {


                        const extraTypes = missingStandard.map(t => ({


                            ...t,


                            name: t.description,


                            module: 'TREASURY',


                            series: [],


                            isActive: true,


                            companyId


                        }));


                        types = [...types, ...extraTypes];


                    }


                }





                // Ensure uniqueness by code


                const unique = [];


                const codes = new Set();


                for (const t of types) {


                    if (!codes.has(t.code)) {


                        unique.push(t);


                        codes.add(t.code);


                    }


                }


                return of(unique);


            }





            // Migration/Fallback: check if there's a global one to clone for this specific company


            const globalKey = `erp_${normalizedModule.toLowerCase()}_document_types`;


            let globalStored = localStorage.getItem(globalKey);





            if (!globalStored && normalizedModule === 'STOCK') {


                globalStored = localStorage.getItem('erp_inventory_document_types');


            }





            if (globalStored) {


                const types = JSON.parse(globalStored);


                localStorage.setItem(key, globalStored);


                return of(types);


            }





            // Default from constants if absolutely nothing found


            let defaults: any[] = [];


            switch (normalizedModule) {


                case 'SALES': defaults = SALES_DOCUMENT_TYPES.map(t => ({ ...t, name: t.description, module: 'SALES', series: [], isActive: true })); break;


                case 'PURCHASES': defaults = PURCHASE_DOCUMENT_TYPES.map(t => ({ ...t, name: t.description, module: 'PURCHASES', series: [], isActive: true })); break;


                case 'TREASURY': defaults = TREASURY_DOCUMENT_TYPES.map(t => ({ ...t, name: t.description, module: 'TREASURY', series: [], isActive: true })); break;


                case 'STOCK': defaults = STOCK_DOCUMENT_TYPES.map(t => ({ ...t, name: t.description, module: 'STOCK', series: [], isActive: true })); break;


            }





            localStorage.setItem(key, JSON.stringify(defaults));


            return of(defaults);


        } else {


            let companyId = this.activeCompanySubject.value?.id;


            if (!companyId) {


                const stored = this.getStoredCompany();


                companyId = stored?.id;


            }





            return this.http.get<any[]>(`${this.baseUrl}/document-types?module=${normalizedModule}&companyId=${companyId || ''}`).pipe(


                map(types => {


                    if (Array.isArray(types) && types.length > 0) {


                        // Self-healing: Merge missing standard types for Treasury


                        if (normalizedModule === 'TREASURY') {


                            const missingStandard = TREASURY_DOCUMENT_TYPES.filter(std => !types.some((t: any) => t.code === std.code));


                            if (missingStandard.length > 0) {


                                const companyId = this.activeCompanySubject.value?.id;


                                const extraTypes = missingStandard.map(t => ({


                                    ...t,


                                    name: t.description,


                                    module: 'TREASURY',


                                    series: [],


                                    isActive: true,


                                    companyId


                                }));


                                return [...types, ...extraTypes];


                            }


                        }


                        return types;


                    }





                    // If it's an error object or empty, types might not be an array


                    if (!Array.isArray(types)) {


                        console.warn(`[DataService] Document types response for ${normalizedModule} is not an array:`, types);


                        return [];


                    }





                    console.log(`[DataService] No document types found for ${normalizedModule}. Generating defaults...`);





                    // If no types in backend, generate defaults and send to backend


                    let defaults: any[] = [];


                    switch (normalizedModule) {


                        case 'SALES': defaults = SALES_DOCUMENT_TYPES.map(t => ({ ...t, name: t.description, module: 'SALES', series: [], isActive: true })); break;


                        case 'PURCHASES': defaults = PURCHASE_DOCUMENT_TYPES.map(t => ({ ...t, name: t.description, module: 'PURCHASES', series: [], isActive: true })); break;


                        case 'TREASURY': defaults = TREASURY_DOCUMENT_TYPES.map(t => ({ ...t, name: t.description, module: 'TREASURY', series: [], isActive: true })); break;


                        case 'STOCK': defaults = STOCK_DOCUMENT_TYPES.map(t => ({ ...t, name: t.description, module: 'STOCK', series: [], isActive: true })); break;


                    }





                    // Assign companyId


                    const currentCompanyId = this.activeCompanySubject.value?.id;


                    defaults = defaults.map(d => ({ ...d, companyId: currentCompanyId }));





                    this.saveDocumentTypes(normalizedModule as any, defaults).subscribe({


                        next: () => console.log('Defaults saved successfully'),


                        error: (err) => console.error('Failed to save defaults:', err)


                    });





                    return defaults;


                }),


                catchError(err => {


                    console.error('Error fetching document types:', err);


                    return of([]);


                })


            );


        }


    }





    saveDocumentTypes(module: string, types: any[]): Observable<any> {


        let normalizedModule = module.toUpperCase();


        if (normalizedModule === 'INVENTORY') normalizedModule = 'STOCK';





        if (this.isLocalBrowser()) {


            const companyId = this.activeCompanySubject.value?.id || '001';


            const key = `erp_${normalizedModule.toLowerCase()}_document_types_${companyId}`;


            localStorage.setItem(key, JSON.stringify(types));


            return of(true);


        } else {


            const companyId = this.activeCompanySubject.value?.id || '';


            // Pass companyId in query so middleware picks it up


            return this.http.post(`${this.baseUrl}/document-types?companyId=${companyId}`, { module: normalizedModule, types });


        }


    }





    // --- Backup & Mode Switch (Points 4, 5) ---


    public exportData(): string {


        const data: any = {};


        for (let i = 0; i < localStorage.length; i++) {


            const key = localStorage.key(i);


            if (key && key.startsWith('erp_')) {


                data[key] = localStorage.getItem(key);


            }


        }


        return JSON.stringify({


            timestamp: new Date().toISOString(),


            user: localStorage.getItem('erp_current_user'),


            config: this.config,


            data: data


        }, null, 2);


    }





    public downloadBackup() {


        const backupData = this.exportData();


        const blob = new Blob([backupData], { type: 'application/json' });


        const url = window.URL.createObjectURL(blob);


        const a = document.createElement('a');


        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');


        a.href = url;


        a.download = `inverno_erp_backup_${timestamp}.json`;


        a.click();


        window.URL.revokeObjectURL(url);


    }





    public switchMode(type: 'BROWSER' | 'POSTGRES', deployment: 'LOCAL' | 'WEB' = 'LOCAL') {
        // Point 4: Ritual de troca
        const modeLabel = type === 'BROWSER' ? 'Modo Local (Browser)' : 'Modo Backend';

        if (confirm(`Atenção: A aplicação será reiniciada para mudar para ${modeLabel}. Deseja fazer um backup dos dados locais antes de mudar?`)) {
            this.downloadBackup();
        }

        if (confirm(`Confirmar mudança para ${modeLabel}?`)) {
            const newConfig = {
                ...this.config,
                deploymentMode: deployment,
                localStorageType: type
            };
            localStorage.setItem('erp_system_config', JSON.stringify(newConfig));
            window.location.reload();
        }
    }

    // --- Mobile User Approvals ---
    getPendingMobileUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/mobile/admin/pending`);
    }

    getApprovedMobileUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/mobile/admin/approved`);
    }

    approveMobileUser(userId: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/mobile/admin/approve/${userId}`, {});
    }

    // --- Fleet Management ---
    getVehicles(companyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/fleet/vehicles?companyId=${companyId}`);
    }

    saveVehicle(vehicle: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/fleet/vehicles`, vehicle);
    }

    getActiveTrips(companyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/fleet/trips/active?companyId=${companyId}`);
    }

    startTrip(tripData: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/fleet/trips/start`, tripData);
    }

    updateTripLocation(tripId: string, latitude: number, longitude: number, companyId?: string): Observable<any> {
        return this.http.patch(`${this.baseUrl}/fleet/trips/${tripId}/location`, { latitude, longitude, companyId });
    }

    // --- Sales Campaigns ---
    getSalesCampaigns(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/sales/campaigns`);
    }

    createSalesCampaign(campaign: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/sales/campaigns`, campaign);
    }

    updateSalesCampaign(id: string, data: any): Observable<any> {
        return this.http.patch(`${this.baseUrl}/sales/campaigns/${id}`, data);
    }

    deleteSalesCampaign(id: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/sales/campaigns/${id}`);
    }

    // --- Discounts & Pricing ---
    getBestDiscount(articleId: string, familyId: string, quantity: number, companyId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/sales/discounts/best?articleId=${articleId}&familyId=${familyId}&quantity=${quantity}&companyId=${companyId}`);
    }

    // --- Route Optimization ---
    getOptimizedSequence(docIds: string[], companyId: string): Observable<any[]> {
        return this.http.post<any[]>(`${this.baseUrl}/mobile/admin/optimize-route`, { docIds, companyId });
    }

    assignRoute(employeeId: string, docIds: string[], companyId: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/mobile/admin/assign-route`, { employeeId, docIds, companyId });
    }

    getDrivers(companyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/mobile/admin/drivers?companyId=${companyId}`);
    }
}
