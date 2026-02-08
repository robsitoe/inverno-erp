import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { Company } from './companies/entities/company.entity';
import { Series } from './companies/entities/series.entity';
import { FiscalYear } from './companies/entities/fiscal-year.entity';
import { Journal } from './accounting/entities/journal.entity';
import { Customer } from './customers/entities/customer.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { GenericEntity } from './common-entities/generic-entity.entity';
import { DocumentType } from './common-entities/entities/document-type.entity';
import { PaymentMethod } from './treasury/entities/payment-method.entity';
import { CreateJournalDto } from './accounting/dto/create-journal.dto';
import { CreateCustomerDto } from './customers/dto/create-customer.dto';
import { CreateSupplierDto } from './suppliers/dto/create-supplier.dto';
import { TenancyService } from './tenancy/tenancy.service';
import { PeriodControlService } from './periods/period-control.service';
import { PeriodAuditLog } from './companies/entities/period-audit-log.entity';
export declare class AppController {
    private readonly appService;
    private readonly dataSource;
    private readonly tenancyService;
    private readonly periodControlService;
    constructor(appService: AppService, dataSource: DataSource, tenancyService: TenancyService, periodControlService: PeriodControlService);
    private getRepo;
    testRoute(): {
        status: string;
        message: string;
    };
    getHello(): string;
    getCompanies(): Promise<Company[]>;
    getCompanyInfo(): Promise<Company | null>;
    saveCompany(company: any): Promise<any>;
    deleteCompany(id: string): Promise<{
        success: boolean;
        message: string;
        result: import("typeorm").DeleteResult;
    }>;
    getFiscalYears(companyId: string): Promise<FiscalYear[]>;
    saveFiscalYear(year: any): Promise<any>;
    setCurrentYear(data: {
        year: number;
        companyId: string;
    }): Promise<{
        success: boolean;
    }>;
    getFiscalYearChecklist(id: string, companyId?: string): Promise<{
        fiscalYear: FiscalYear;
        checklist: {
            trialBalance: {
                ok: boolean;
                debit: number;
                credit: number;
                difference: number;
            };
            pendingDocuments: {
                ok: boolean;
                salesDraft: number;
                purchaseDraft: number;
                total: number;
            };
            reconciliations: {
                ok: boolean;
                pending: number;
            };
        };
    }>;
    closeFiscalYear(id: string, body: {
        reason: string;
        userId?: string;
        username?: string;
        companyId?: string;
    }): Promise<{
        success: boolean;
        fiscalYear: FiscalYear;
        checklist: {
            trialBalance: {
                ok: boolean;
                debit: number;
                credit: number;
                difference: number;
            };
            pendingDocuments: {
                ok: boolean;
                salesDraft: number;
                purchaseDraft: number;
                total: number;
            };
            reconciliations: {
                ok: boolean;
                pending: number;
            };
        };
    }>;
    reopenFiscalYear(id: string, body: {
        reason: string;
        userId: string;
        username?: string;
        companyId?: string;
    }): Promise<{
        success: boolean;
        fiscalYear: FiscalYear;
    }>;
    getFiscalYearAuditLogs(id: string, companyId?: string): Promise<PeriodAuditLog[]>;
    getSeries(companyId: string): Promise<Series[]>;
    saveSeries(series: any): Promise<any>;
    deleteSeries(id: string): Promise<import("typeorm").DeleteResult>;
    getJournals(companyId?: string): Promise<Journal[]>;
    saveJournal(journal: CreateJournalDto | CreateJournalDto[]): Promise<any>;
    getCustomers(companyId?: string): Promise<Customer[]>;
    saveCustomer(customer: CreateCustomerDto | CreateCustomerDto[]): Promise<({
        id: string;
        companyId?: string;
        code: string;
        name: string;
        nif?: string;
        address?: string;
        city?: string;
        postalCode?: string;
        country?: string;
        phone?: string;
        email?: string;
        paymentTerms?: number;
        creditLimit?: number;
        currentBalance?: number;
        receivableAccountId?: string;
        isActive?: boolean;
    } & Customer)[] | ({
        id: any;
        companyId?: string;
        code: string;
        name: string;
        nif?: string;
        address?: string;
        city?: string;
        postalCode?: string;
        country?: string;
        phone?: string;
        email?: string;
        paymentTerms?: number;
        creditLimit?: number;
        currentBalance?: number;
        receivableAccountId?: string;
        isActive?: boolean;
    } & Customer)>;
    getSuppliers(companyId?: string): Promise<Supplier[]>;
    saveSupplier(supplier: CreateSupplierDto | CreateSupplierDto[]): Promise<({
        id: string;
        companyId?: string;
        code: string;
        name: string;
        nif?: string;
        address?: string;
        city?: string;
        postalCode?: string;
        country?: string;
        phone?: string;
        email?: string;
        paymentTerms?: number;
        creditLimit?: number;
        currentBalance?: number;
        payableAccountId?: string;
        isActive?: boolean;
    } & Supplier)[] | ({
        id: any;
        companyId?: string;
        code: string;
        name: string;
        nif?: string;
        address?: string;
        city?: string;
        postalCode?: string;
        country?: string;
        phone?: string;
        email?: string;
        paymentTerms?: number;
        creditLimit?: number;
        currentBalance?: number;
        payableAccountId?: string;
        isActive?: boolean;
    } & Supplier)>;
    getGenericEntities(type: string, companyId?: string): Promise<GenericEntity[]>;
    saveGenericEntity(entity: any): Promise<any>;
    testDbConnection(config: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getDocumentTypes(module: string, companyId?: string): Promise<DocumentType[]>;
    saveDocumentTypes(data: {
        module: string;
        types: any[];
    }): Promise<any[]>;
    getPaymentMethods(companyId?: string): Promise<PaymentMethod[]>;
    savePaymentMethod(method: any): Promise<any>;
    syncPush(data: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
