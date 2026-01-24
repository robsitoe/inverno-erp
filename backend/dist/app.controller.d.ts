import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { Company } from './companies/entities/company.entity';
import { Series } from './companies/entities/series.entity';
import { FiscalYear } from './companies/entities/fiscal-year.entity';
import { Journal } from './accounting/entities/journal.entity';
import { Customer } from './customers/entities/customer.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { CreateJournalDto } from './accounting/dto/create-journal.dto';
import { CreateCustomerDto } from './customers/dto/create-customer.dto';
import { CreateSupplierDto } from './suppliers/dto/create-supplier.dto';
export declare class AppController {
    private readonly appService;
    private readonly dataSource;
    constructor(appService: AppService, dataSource: DataSource);
    getHello(): string;
    getCompanies(): Promise<Company[]>;
    getCompanyInfo(): Promise<Company>;
    saveCompanyInfo(data: any): Promise<any>;
    deleteCompany(id: string): Promise<import("typeorm").DeleteResult>;
    getFiscalYears(companyId: string): Promise<FiscalYear[]>;
    saveFiscalYear(year: any): Promise<any>;
    setCurrentYear(data: {
        year: number;
        companyId: string;
    }): Promise<{
        success: boolean;
    }>;
    getSeries(companyId: string): Promise<Series[]>;
    saveSeries(series: any): Promise<any>;
    deleteSeries(id: string): Promise<import("typeorm").DeleteResult>;
    getJournals(): Promise<Journal[]>;
    saveJournal(journal: CreateJournalDto | CreateJournalDto[]): Promise<(CreateJournalDto & Journal) | (CreateJournalDto & Journal)[]>;
    getCustomers(): Promise<Customer[]>;
    saveCustomer(customer: CreateCustomerDto | CreateCustomerDto[]): Promise<(CreateCustomerDto & Customer) | (CreateCustomerDto & Customer)[]>;
    getSuppliers(): Promise<Supplier[]>;
    saveSupplier(supplier: CreateSupplierDto | CreateSupplierDto[]): Promise<(CreateSupplierDto & Supplier) | (CreateSupplierDto & Supplier)[]>;
    testDbConnection(config: any): Promise<{
        success: boolean;
        message: string;
    }>;
    syncPush(data: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
