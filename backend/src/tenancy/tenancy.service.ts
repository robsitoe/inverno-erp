import { Injectable, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { Account } from '../accounting/entities/account.entity';
import { JournalEntry, JournalLine } from '../accounting/entities/journal-entry.entity';
import { Article } from '../inventory/entities/article.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { SalesDocument, SalesDocumentLine } from '../sales/entities/sales-document.entity';
import { PurchaseDocument, PurchaseDocumentLine } from '../purchases/entities/purchase.entity';
import { TreasuryDocument, TreasuryDocumentLine } from '../treasury/entities/treasury.entity';
import { FiscalYear } from '../companies/entities/fiscal-year.entity';
import { Journal } from '../accounting/entities/journal.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Series } from '../companies/entities/series.entity';
import { GenericEntity } from '../common-entities/generic-entity.entity';
import { PaymentMethod } from '../treasury/entities/payment-method.entity';
import { DocumentType } from '../common-entities/entities/document-type.entity';
import {
    SALES_DOCUMENT_TYPES,
    PURCHASE_DOCUMENT_TYPES,
    TREASURY_DOCUMENT_TYPES,
    STOCK_DOCUMENT_TYPES
} from '../common-entities/initial-data';

@Injectable()
export class TenancyService implements OnModuleDestroy {
    private dataSources: Map<string, DataSource> = new Map();
    private pendingConnections: Map<string, Promise<DataSource>> = new Map();

    constructor(private mainDataSource: DataSource) { }

    async getTenantDataSource(companyId: string): Promise<DataSource> {
        // 1. Check if already initialized and cached
        if (this.dataSources.has(companyId)) {
            const ds = this.dataSources.get(companyId);
            if (ds && ds.isInitialized) return ds;
        }

        // 2. Check if there's a connection already in progress for this company
        if (this.pendingConnections.has(companyId)) {
            return this.pendingConnections.get(companyId)!;
        }

        // 3. Create a new connection promise and cache it
        const connectionPromise = this.initializeTenantConnection(companyId);
        this.pendingConnections.set(companyId, connectionPromise);

        try {
            const ds = await connectionPromise;
            return ds;
        } finally {
            this.pendingConnections.delete(companyId);
        }
    }

    private async initializeTenantConnection(companyId: string): Promise<DataSource> {
        try {
            const company = await this.mainDataSource.getRepository(Company).findOne({ where: { id: companyId } });

            if (!company) {
                throw new Error(`Empresa com ID "${companyId}" não encontrada na base de dados principal.`);
            }

            const sanitizedName = this.sanitizeDatabaseName(company.name);
            const dbConfig = company.dbConfig || {};
            const mainOptions = this.mainDataSource.options as any;

            // Use convention: inverno_erp_company_name
            const targetDbName = dbConfig.database || `inverno_erp_${sanitizedName}`;

            console.log(`[Tenancy] Initializing for ${company.name} (${companyId}) -> DB: ${targetDbName}`);

            const resolvedPort = Number(dbConfig.port || mainOptions.port || 5432);

            console.log(`[Tenancy] Connection setup for ${targetDbName}: Host=${dbConfig.host || mainOptions.host}, Port=${resolvedPort}, User=${dbConfig.username || mainOptions.username}`);

            const tenantOptions: any = {
                type: (dbConfig.type || mainOptions.type || 'postgres'),
                host: dbConfig.host || mainOptions.host,
                port: resolvedPort,
                username: dbConfig.username || mainOptions.username,
                password: dbConfig.password || mainOptions.password,
                database: targetDbName,
                entities: [
                    Account, JournalEntry, JournalLine, Article, StockMovement,
                    SalesDocument, SalesDocumentLine, PurchaseDocument,
                    PurchaseDocumentLine, TreasuryDocument, TreasuryDocumentLine,
                    FiscalYear, Journal, Customer, Supplier, Series, GenericEntity,
                    DocumentType, PaymentMethod
                ],
                synchronize: true,
                logging: ['error', 'warn'],
            };

            const tenantDS = new DataSource(tenantOptions);

            try {
                await tenantDS.initialize();
                console.log(`[Tenancy] Connection established for ${targetDbName}`);
            } catch (error: any) {
                // If DB doesn't exist (Error 3D000 in Postgres), try to create it
                if (error.code === '3D000' && tenantOptions.type === 'postgres') {
                    console.log(`[Tenancy] Database ${targetDbName} missing. Creating...`);
                    await this.createDatabase(tenantOptions, targetDbName);
                    await tenantDS.initialize();
                    console.log(`[Tenancy] Connection established after creation for ${targetDbName}`);
                } else {
                    console.error(`[Tenancy] Fatal error initializing ${targetDbName}:`, error.message);
                    throw error;
                }
            }

            this.dataSources.set(companyId, tenantDS);

            // Seed initial data for new tenant
            await this.seedTenantData(tenantDS, companyId);

            return tenantDS;
        } catch (err: any) {
            console.error(`[Tenancy] Failed to initialize tenant ${companyId}:`, err.message);
            const errorCode = err.code ? ` (${err.code})` : '';
            throw new BadRequestException(`Erro de Infraestrutura${errorCode}: ${err.message}`);
        }
    }

    private async createDatabase(options: any, dbName: string) {
        const mainOptions = this.mainDataSource.options as any;

        const adminOptions = {
            type: options.type,
            host: options.host,
            port: options.port,
            username: options.username,
            password: options.password,
            synchronize: false,
        };

        // Admin candidates: try 'postgres' first, then fallback to the main erp database
        const dbCandidates = ['postgres', mainOptions.database];
        let lastError: any = null;

        for (const adminDb of dbCandidates) {
            const adminDS = new DataSource({
                ...adminOptions,
                database: adminDb,
            } as any);

            try {
                await adminDS.initialize();
                console.log(`Connected to admin database "${adminDb}" to create "${dbName}"`);
                await adminDS.query(`CREATE DATABASE "${dbName}"`);
                await adminDS.destroy();
                console.log(`✅ Base de dados "${dbName}" criada com sucesso.`);
                return; // Success
            } catch (err: any) {
                lastError = err;
                if (adminDS.isInitialized) await adminDS.destroy();

                // If database already exists (42P04 in Postgres), we can proceed
                if (err.code === '42P04') {
                    console.log(`Database "${dbName}" already exists.`);
                    return;
                }
                console.warn(`Failed to create database via "${adminDb}":`, err.message);
                // Continue to next candidate
            }
        }

        throw new BadRequestException(`Falha ao criar base de dados "${dbName}": ${lastError?.message || 'Erro desconhecido'}`);
    }

    private sanitizeDatabaseName(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]/g, '_')     // Replace non-alphanumeric with _
            .replace(/_+/g, '_')             // Replace multiple underscores with single
            .replace(/^_|_$/g, '');          // Remove leading/trailing underscores
    }

    async onModuleDestroy() {
        for (const ds of this.dataSources.values()) {
            if (ds.isInitialized) await ds.destroy();
        }
    }

    private async seedTenantData(ds: DataSource, companyId: string) {
        try {
            // Fetch company from MAIN database to see its config
            const company = await this.mainDataSource.getRepository(Company).findOne({ where: { id: companyId } });

            const docTypeRepo = ds.getRepository(DocumentType);
            const count = await docTypeRepo.count();

            if (count === 0) {
                console.log(`[Tenancy] Seeding standard document types for company ${companyId}...`);

                // Determine initial series from company config or current year
                const initialSeries = company?.seriesConfig ? {
                    code: company.seriesConfig.code,
                    name: company.seriesConfig.description || `Série ${company.seriesConfig.code}`,
                    description: company.seriesConfig.description,
                    startDate: company.seriesConfig.startDate,
                    endDate: company.seriesConfig.endDate,
                    active: true,
                    isDefault: true,
                    companyId: companyId,
                    currentNumber: 1
                } : (company?.currentYear ? {
                    code: company.currentYear.toString(),
                    name: `Série ${company.currentYear}`,
                    description: `Série ${company.currentYear}`,
                    startDate: `${company.currentYear}-01-01`,
                    endDate: `${company.currentYear}-12-31`,
                    active: true,
                    isDefault: true,
                    companyId: companyId,
                    currentNumber: 1
                } : null);

                const allDefaults = [
                    ...SALES_DOCUMENT_TYPES.map(t => ({ ...t, module: t.type || 'SALES' })),
                    ...PURCHASE_DOCUMENT_TYPES.map(t => ({ ...t, module: t.type || 'PURCHASES' })),
                    ...TREASURY_DOCUMENT_TYPES.map(t => ({ ...t, module: t.type || 'TREASURY' })),
                    ...STOCK_DOCUMENT_TYPES.map(t => ({ ...t, module: t.type || 'STOCK' }))
                ];

                const entities = allDefaults.map(t => ({
                    ...t,
                    id: `${t.module}-${t.code}-${companyId}`,
                    companyId: companyId,
                    series: initialSeries ? [initialSeries] : []
                }));

                await docTypeRepo.save(entities);
                console.log(`[Tenancy] ✅ Created ${entities.length} document types with series: ${initialSeries?.code || 'None'}`);
            }

            // Seed Payment Methods
            const pmRepo = ds.getRepository(PaymentMethod);
            const pmCount = await pmRepo.count();
            if (pmCount === 0) {
                console.log(`[Tenancy] Seeding standard payment methods for company ${companyId}...`);
                const pmDefaults = [
                    { id: `PM-NUM-${companyId}`, code: 'NUM', description: 'Numerário', companyId, sortOrder: 1, isActive: true },
                    { id: `PM-TRF-${companyId}`, code: 'TRF', description: 'Transferência Bancária', companyId, sortOrder: 2, isActive: true },
                    { id: `PM-CHQ-${companyId}`, code: 'CHQ', description: 'Cheque', companyId, sortOrder: 3, isActive: true },
                    { id: `PM-CRD-${companyId}`, code: 'CRD', description: 'Cartão de Crédito/Débito', companyId, sortOrder: 4, isActive: true }
                ];
                await pmRepo.save(pmDefaults);
            }

        } catch (err: any) {
            console.error(`[Tenancy] Error seeding data for company ${companyId}:`, err.message);
        }
    }
}
