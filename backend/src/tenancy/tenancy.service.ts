import { Injectable, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { Account } from '../accounting/entities/account.entity';
import { JournalEntry, JournalLine } from '../accounting/entities/journal-entry.entity';
import { Article } from '../inventory/entities/article.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { StockDocument, StockDocumentLine } from '../inventory/entities/stock-document.entity';
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
import { PeriodAuditLog } from '../companies/entities/period-audit-log.entity';
import { TaxRate } from '../taxes/entities/tax-rate.entity';
import { WorkflowHistory } from '../common/entities/workflow-history.entity';
import { Employee } from '../hr/entities/employee.entity';
import { Payroll } from '../hr/entities/payroll.entity';
import { Absence } from '../hr/entities/absence.entity';
import { TaxBracket, HRSettings } from '../hr/entities/hr-settings.entity';
import { GasCylinderType, GasDailyControl, GasDailyEntry } from '../gas-control/gas-control.entity';
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
                    StockDocument, StockDocumentLine,
                    SalesDocument, SalesDocumentLine, PurchaseDocument,
                    PurchaseDocumentLine, TreasuryDocument, TreasuryDocumentLine,
                    FiscalYear, Journal, Customer, Supplier, Series, GenericEntity,
                    DocumentType, PaymentMethod, PeriodAuditLog, TaxRate, WorkflowHistory,
                    Employee, Payroll, Absence, TaxBracket, HRSettings,
                    GasCylinderType, GasDailyControl, GasDailyEntry
                ],
                synchronize: true,
                logging: ['error', 'warn'],
            };

            const tenantDS = new DataSource(tenantOptions);

            try {
                await tenantDS.initialize();

                // Manual Patch: Ensure ivaCode column exists in articles table
                try {
                    const queryRunner = tenantDS.createQueryRunner();
                    const table = await queryRunner.getTable('articles');
                    if (table && !table.findColumnByName('ivaCode')) {
                        console.log(`[Tenancy] Patching 'articles' table in ${targetDbName}: Adding 'ivaCode' column`);
                        await queryRunner.query('ALTER TABLE "articles" ADD COLUMN "ivaCode" character varying');
                    }
                    await queryRunner.release();
                } catch (patchErr) {
                    console.warn(`[Tenancy] Failed to patch articles table in ${targetDbName}`, patchErr);
                }

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
        console.log(`[Tenancy] Seeding data for company ${companyId}...`);
        try {
            // Fetch company from MAIN database to see its config
            const company = await this.mainDataSource.getRepository(Company).findOne({ where: { id: companyId } });
            console.log(`[Tenancy] Company found for seeding: ${company?.name}`);

            // 1. Ensure Fiscal Year and Series exist
            const currentYear = new Date().getFullYear();
            let yearToUse = currentYear;
            let seriesCode = `${currentYear}`;
            let seriesDesc = `Série ${currentYear}`;
            let startDate = `${currentYear}-01-01`;
            let endDate = `${currentYear}-12-31`;

            if (company?.seriesConfig) {
                const sc = company.seriesConfig;
                seriesCode = sc.code || seriesCode;
                seriesDesc = sc.description || seriesDesc;
                startDate = sc.startDate || startDate;
                endDate = sc.endDate || endDate;
                if (startDate) yearToUse = new Date(startDate).getFullYear();
            } else if (company?.currentYear) {
                yearToUse = company.currentYear;
                seriesCode = yearToUse.toString();
                seriesDesc = `Série ${yearToUse}`;
                startDate = `${yearToUse}-01-01`;
                endDate = `${yearToUse}-12-31`;
            }

            console.log(`[Tenancy] Using year ${yearToUse}, series ${seriesCode}`);

            // Fiscal Year
            const fiscalYearRepo = ds.getRepository(FiscalYear);
            let fiscalYear = await fiscalYearRepo.findOne({ where: { companyId, year: yearToUse } });

            if (!fiscalYear) {
                console.log(`[Tenancy] Creating Fiscal Year ${yearToUse}`);
                fiscalYear = new FiscalYear();
                fiscalYear.id = `${yearToUse}-${companyId}`;
                fiscalYear.year = yearToUse;
                fiscalYear.companyId = companyId;
                fiscalYear.isCurrent = true;
                fiscalYear.status = 'OPEN';
                fiscalYear.startDate = startDate;
                fiscalYear.endDate = endDate;
                await fiscalYearRepo.save(fiscalYear);
            }

            // Series
            const seriesRepo = ds.getRepository(Series);
            let series = await seriesRepo.findOne({ where: { companyId, code: seriesCode } });

            if (!series) {
                console.log(`[Tenancy] Creating Series ${seriesCode}`);
                series = new Series();
                series.id = company?.seriesConfig ? `SERIES-${seriesCode}-${companyId}` : `${yearToUse}-${companyId}`;
                series.companyId = companyId;
                series.code = seriesCode;
                series.description = seriesDesc;
                series.startDate = startDate;
                series.endDate = endDate;
                series.active = true;
                series.module = 'GLOBAL';
                await seriesRepo.save(series);
            }

            // 2. Document Types
            console.log(`[Tenancy] Checking Document Types...`);
            const docTypeRepo = ds.getRepository(DocumentType);
            const count = await docTypeRepo.count();

            if (count === 0) {
                console.log(`[Tenancy] Seeding standard document types...`);

                const initialSeriesConfig = {
                    code: seriesCode,
                    description: seriesDesc,
                    startDate: startDate,
                    endDate: endDate,
                    active: true,
                    isDefault: true,
                    companyId: companyId,
                    currentNumber: 1
                };

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
                    series: [initialSeriesConfig],
                    isActive: true
                }));

                await docTypeRepo.save(entities);
                console.log(`[Tenancy] ✅ Created ${entities.length} document types.`);
            }

            // 3. Payment Methods
            console.log(`[Tenancy] Checking Payment Methods...`);
            const pmRepo = ds.getRepository(PaymentMethod);
            const pmCount = await pmRepo.count();
            if (pmCount === 0) {
                console.log(`[Tenancy] Seeding standard payment methods...`);
                const pmDefaults = [
                    { id: `PM-NUM-${companyId}`, code: 'NUM', description: 'Numerário', companyId, sortOrder: 1, isActive: true },
                    { id: `PM-TRF-${companyId}`, code: 'TRF', description: 'Transferência Bancária', companyId, sortOrder: 2, isActive: true },
                    { id: `PM-CHQ-${companyId}`, code: 'CHQ', description: 'Cheque', companyId, sortOrder: 3, isActive: true },
                    { id: `PM-CRD-${companyId}`, code: 'CRD', description: 'Cartão de Crédito/Débito', companyId, sortOrder: 4, isActive: true }
                ];
                await pmRepo.save(pmDefaults);
                console.log(`[Tenancy] ✅ Created ${pmDefaults.length} payment methods.`);
            }

            // 4. Tax Rates
            console.log(`[Tenancy] Checking Tax Rates...`);
            const taxRepo = ds.getRepository(TaxRate);
            const taxCount = await taxRepo.count();
            if (taxCount === 0) {
                console.log(`[Tenancy] Seeding standard tax rates...`);
                const taxDefaults = [
                    { code: '00', description: 'Regime de isenção', rate: 0, type: 'IVA', companyId, isActive: true },
                    { code: '01', description: 'Isento (artº18)', rate: 0, type: 'IVA', companyId, isActive: true },
                    { code: '16', description: 'IVA Taxa Normal (16%)', rate: 16, type: 'IVA', companyId, isActive: true },
                    { code: '17', description: 'IVA Taxa Anterior (17%)', rate: 17, type: 'IVA', companyId, isActive: true },
                    { code: 'BS', description: 'Bens em segunda mão', rate: 17, type: 'IVA', companyId, isActive: true },
                    { code: 'OA', description: 'Objectos de arte', rate: 17, type: 'IVA', companyId, isActive: true }
                ];
                await taxRepo.save(taxRepo.create(taxDefaults));
                console.log(`[Tenancy] ✅ Created ${taxDefaults.length} tax rates.`);
            }

            // 5. HR Tax Brackets (IRPS Mozambique)
            console.log(`[Tenancy] Checking HR Tax Brackets...`);
            const hrBracketRepo = ds.getRepository(TaxBracket);
            const bracketCount = await hrBracketRepo.count();
            if (bracketCount === 0) {
                console.log(`[Tenancy] Seeding IRPS brackets...`);
                const brackets = [
                    { id: `IRPS-${companyId}-1`, companyId, minAmount: 0, maxAmount: 20250, rate: 0, deduction0: 0, deduction1: 0, deduction2: 0, deduction3: 0, deduction4Plus: 0 },
                    {
                        id: `IRPS-${companyId}-2`, companyId, minAmount: 20250.01, maxAmount: 33750, rate: 10,
                        deduction0: 2025, deduction1: 2125, deduction2: 2225, deduction3: 2325, deduction4Plus: 2425
                    },
                    {
                        id: `IRPS-${companyId}-3`, companyId, minAmount: 33750.01, maxAmount: 60750, rate: 15,
                        deduction0: 3712.50, deduction1: 3812.50, deduction2: 3912.50, deduction3: 4012.50, deduction4Plus: 4112.50
                    },
                    {
                        id: `IRPS-${companyId}-4`, companyId, minAmount: 60750.01, maxAmount: 148500, rate: 20,
                        deduction0: 6750.00, deduction1: 6850.00, deduction2: 6950.00, deduction3: 7050.00, deduction4Plus: 7150.00
                    },
                    {
                        id: `IRPS-${companyId}-5`, companyId, minAmount: 148500.01, maxAmount: 432000, rate: 25,
                        deduction0: 14175.00, deduction1: 14275.00, deduction2: 14375.00, deduction3: 14475.00, deduction4Plus: 14575.00
                    },
                    {
                        id: `IRPS-${companyId}-6`, companyId, minAmount: 432000.01, maxAmount: null, rate: 32,
                        deduction0: 44415.00, deduction1: 44515.00, deduction2: 44615.00, deduction3: 44715.00, deduction4Plus: 44815.00
                    },
                ];
                await hrBracketRepo.save(hrBracketRepo.create(brackets));
            }

            // 6. HR Settings
            const hrSettingsRepo = ds.getRepository(HRSettings);
            const settingsCount = await hrSettingsRepo.count();
            if (settingsCount === 0) {
                await hrSettingsRepo.save({
                    companyId,
                    inssEmployeeRate: 3,
                    inssEmployerRate: 4,
                    currency: 'MT'
                });
            }

            console.log(`[Tenancy] Seeding completed for ${companyId}`);

        } catch (err: any) {
            console.error(`[Tenancy] Error in seedTenantData for ${companyId}:`, err);
            // Re-throw if it's a structural error that should stop initialization
            throw err;
        }
    }
}
