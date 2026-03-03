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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenancyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const company_entity_1 = require("../companies/entities/company.entity");
const account_entity_1 = require("../accounting/entities/account.entity");
const journal_entry_entity_1 = require("../accounting/entities/journal-entry.entity");
const article_entity_1 = require("../inventory/entities/article.entity");
const stock_movement_entity_1 = require("../inventory/entities/stock-movement.entity");
const stock_document_entity_1 = require("../inventory/entities/stock-document.entity");
const sales_document_entity_1 = require("../sales/entities/sales-document.entity");
const purchase_entity_1 = require("../purchases/entities/purchase.entity");
const treasury_entity_1 = require("../treasury/entities/treasury.entity");
const fiscal_year_entity_1 = require("../companies/entities/fiscal-year.entity");
const journal_entity_1 = require("../accounting/entities/journal.entity");
const customer_entity_1 = require("../customers/entities/customer.entity");
const supplier_entity_1 = require("../suppliers/entities/supplier.entity");
const series_entity_1 = require("../companies/entities/series.entity");
const generic_entity_entity_1 = require("../common-entities/generic-entity.entity");
const payment_method_entity_1 = require("../treasury/entities/payment-method.entity");
const document_type_entity_1 = require("../common-entities/entities/document-type.entity");
const period_audit_log_entity_1 = require("../companies/entities/period-audit-log.entity");
const tax_rate_entity_1 = require("../taxes/entities/tax-rate.entity");
const workflow_history_entity_1 = require("../common/entities/workflow-history.entity");
const employee_entity_1 = require("../hr/entities/employee.entity");
const payroll_entity_1 = require("../hr/entities/payroll.entity");
const absence_entity_1 = require("../hr/entities/absence.entity");
const hr_settings_entity_1 = require("../hr/entities/hr-settings.entity");
const gas_control_entity_1 = require("../gas-control/gas-control.entity");
const initial_data_1 = require("../common-entities/initial-data");
let TenancyService = class TenancyService {
    mainDataSource;
    dataSources = new Map();
    pendingConnections = new Map();
    constructor(mainDataSource) {
        this.mainDataSource = mainDataSource;
    }
    async getTenantDataSource(companyId) {
        if (this.dataSources.has(companyId)) {
            const ds = this.dataSources.get(companyId);
            if (ds && ds.isInitialized)
                return ds;
        }
        if (this.pendingConnections.has(companyId)) {
            return this.pendingConnections.get(companyId);
        }
        const connectionPromise = this.initializeTenantConnection(companyId);
        this.pendingConnections.set(companyId, connectionPromise);
        try {
            const ds = await connectionPromise;
            return ds;
        }
        finally {
            this.pendingConnections.delete(companyId);
        }
    }
    async initializeTenantConnection(companyId) {
        try {
            const company = await this.mainDataSource.getRepository(company_entity_1.Company).findOne({ where: { id: companyId } });
            if (!company) {
                throw new Error(`Empresa com ID "${companyId}" não encontrada na base de dados principal.`);
            }
            const sanitizedName = this.sanitizeDatabaseName(company.name);
            const dbConfig = company.dbConfig || {};
            const mainOptions = this.mainDataSource.options;
            const targetDbName = dbConfig.database || `inverno_erp_${sanitizedName}`;
            console.log(`[Tenancy] Initializing for ${company.name} (${companyId}) -> DB: ${targetDbName}`);
            const resolvedPort = Number(dbConfig.port || mainOptions.port || 5432);
            console.log(`[Tenancy] Connection setup for ${targetDbName}: Host=${dbConfig.host || mainOptions.host}, Port=${resolvedPort}, User=${dbConfig.username || mainOptions.username}`);
            const tenantOptions = {
                type: (dbConfig.type || mainOptions.type || 'postgres'),
                host: dbConfig.host || mainOptions.host,
                port: resolvedPort,
                username: dbConfig.username || mainOptions.username,
                password: dbConfig.password || mainOptions.password,
                database: targetDbName,
                entities: [
                    account_entity_1.Account, journal_entry_entity_1.JournalEntry, journal_entry_entity_1.JournalLine, article_entity_1.Article, stock_movement_entity_1.StockMovement,
                    stock_document_entity_1.StockDocument, stock_document_entity_1.StockDocumentLine,
                    sales_document_entity_1.SalesDocument, sales_document_entity_1.SalesDocumentLine, purchase_entity_1.PurchaseDocument,
                    purchase_entity_1.PurchaseDocumentLine, treasury_entity_1.TreasuryDocument, treasury_entity_1.TreasuryDocumentLine,
                    fiscal_year_entity_1.FiscalYear, journal_entity_1.Journal, customer_entity_1.Customer, supplier_entity_1.Supplier, series_entity_1.Series, generic_entity_entity_1.GenericEntity,
                    document_type_entity_1.DocumentType, payment_method_entity_1.PaymentMethod, period_audit_log_entity_1.PeriodAuditLog, tax_rate_entity_1.TaxRate, workflow_history_entity_1.WorkflowHistory,
                    employee_entity_1.Employee, payroll_entity_1.Payroll, absence_entity_1.Absence, hr_settings_entity_1.TaxBracket, hr_settings_entity_1.HRSettings,
                    gas_control_entity_1.GasCylinderType, gas_control_entity_1.GasDailyControl, gas_control_entity_1.GasDailyEntry
                ],
                synchronize: true,
                logging: ['error', 'warn'],
            };
            const tenantDS = new typeorm_1.DataSource(tenantOptions);
            try {
                await tenantDS.initialize();
                try {
                    const queryRunner = tenantDS.createQueryRunner();
                    const table = await queryRunner.getTable('articles');
                    if (table && !table.findColumnByName('ivaCode')) {
                        console.log(`[Tenancy] Patching 'articles' table in ${targetDbName}: Adding 'ivaCode' column`);
                        await queryRunner.query('ALTER TABLE "articles" ADD COLUMN "ivaCode" character varying');
                    }
                    await queryRunner.release();
                }
                catch (patchErr) {
                    console.warn(`[Tenancy] Failed to patch articles table in ${targetDbName}`, patchErr);
                }
                console.log(`[Tenancy] Connection established for ${targetDbName}`);
            }
            catch (error) {
                if (error.code === '3D000' && tenantOptions.type === 'postgres') {
                    console.log(`[Tenancy] Database ${targetDbName} missing. Creating...`);
                    await this.createDatabase(tenantOptions, targetDbName);
                    await tenantDS.initialize();
                    console.log(`[Tenancy] Connection established after creation for ${targetDbName}`);
                }
                else {
                    console.error(`[Tenancy] Fatal error initializing ${targetDbName}:`, error.message);
                    throw error;
                }
            }
            this.dataSources.set(companyId, tenantDS);
            await this.seedTenantData(tenantDS, companyId);
            return tenantDS;
        }
        catch (err) {
            console.error(`[Tenancy] Failed to initialize tenant ${companyId}:`, err.message);
            const errorCode = err.code ? ` (${err.code})` : '';
            throw new common_1.BadRequestException(`Erro de Infraestrutura${errorCode}: ${err.message}`);
        }
    }
    async createDatabase(options, dbName) {
        const mainOptions = this.mainDataSource.options;
        const adminOptions = {
            type: options.type,
            host: options.host,
            port: options.port,
            username: options.username,
            password: options.password,
            synchronize: false,
        };
        const dbCandidates = ['postgres', mainOptions.database];
        let lastError = null;
        for (const adminDb of dbCandidates) {
            const adminDS = new typeorm_1.DataSource({
                ...adminOptions,
                database: adminDb,
            });
            try {
                await adminDS.initialize();
                console.log(`Connected to admin database "${adminDb}" to create "${dbName}"`);
                await adminDS.query(`CREATE DATABASE "${dbName}"`);
                await adminDS.destroy();
                console.log(`✅ Base de dados "${dbName}" criada com sucesso.`);
                return;
            }
            catch (err) {
                lastError = err;
                if (adminDS.isInitialized)
                    await adminDS.destroy();
                if (err.code === '42P04') {
                    console.log(`Database "${dbName}" already exists.`);
                    return;
                }
                console.warn(`Failed to create database via "${adminDb}":`, err.message);
            }
        }
        throw new common_1.BadRequestException(`Falha ao criar base de dados "${dbName}": ${lastError?.message || 'Erro desconhecido'}`);
    }
    sanitizeDatabaseName(name) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    async onModuleDestroy() {
        for (const ds of this.dataSources.values()) {
            if (ds.isInitialized)
                await ds.destroy();
        }
    }
    async seedTenantData(ds, companyId) {
        console.log(`[Tenancy] Seeding data for company ${companyId}...`);
        try {
            const company = await this.mainDataSource.getRepository(company_entity_1.Company).findOne({ where: { id: companyId } });
            console.log(`[Tenancy] Company found for seeding: ${company?.name}`);
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
                if (startDate)
                    yearToUse = new Date(startDate).getFullYear();
            }
            else if (company?.currentYear) {
                yearToUse = company.currentYear;
                seriesCode = yearToUse.toString();
                seriesDesc = `Série ${yearToUse}`;
                startDate = `${yearToUse}-01-01`;
                endDate = `${yearToUse}-12-31`;
            }
            console.log(`[Tenancy] Using year ${yearToUse}, series ${seriesCode}`);
            const fiscalYearRepo = ds.getRepository(fiscal_year_entity_1.FiscalYear);
            let fiscalYear = await fiscalYearRepo.findOne({ where: { companyId, year: yearToUse } });
            if (!fiscalYear) {
                console.log(`[Tenancy] Creating Fiscal Year ${yearToUse}`);
                fiscalYear = new fiscal_year_entity_1.FiscalYear();
                fiscalYear.id = `${yearToUse}-${companyId}`;
                fiscalYear.year = yearToUse;
                fiscalYear.companyId = companyId;
                fiscalYear.isCurrent = true;
                fiscalYear.status = 'OPEN';
                fiscalYear.startDate = startDate;
                fiscalYear.endDate = endDate;
                await fiscalYearRepo.save(fiscalYear);
            }
            const seriesRepo = ds.getRepository(series_entity_1.Series);
            let series = await seriesRepo.findOne({ where: { companyId, code: seriesCode } });
            if (!series) {
                console.log(`[Tenancy] Creating Series ${seriesCode}`);
                series = new series_entity_1.Series();
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
            console.log(`[Tenancy] Checking Document Types...`);
            const docTypeRepo = ds.getRepository(document_type_entity_1.DocumentType);
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
                    ...initial_data_1.SALES_DOCUMENT_TYPES.map(t => ({ ...t, module: t.type || 'SALES' })),
                    ...initial_data_1.PURCHASE_DOCUMENT_TYPES.map(t => ({ ...t, module: t.type || 'PURCHASES' })),
                    ...initial_data_1.TREASURY_DOCUMENT_TYPES.map(t => ({ ...t, module: t.type || 'TREASURY' })),
                    ...initial_data_1.STOCK_DOCUMENT_TYPES.map(t => ({ ...t, module: t.type || 'STOCK' }))
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
            console.log(`[Tenancy] Checking Payment Methods...`);
            const pmRepo = ds.getRepository(payment_method_entity_1.PaymentMethod);
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
            console.log(`[Tenancy] Checking Tax Rates...`);
            const taxRepo = ds.getRepository(tax_rate_entity_1.TaxRate);
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
            console.log(`[Tenancy] Checking HR Tax Brackets...`);
            const hrBracketRepo = ds.getRepository(hr_settings_entity_1.TaxBracket);
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
            const hrSettingsRepo = ds.getRepository(hr_settings_entity_1.HRSettings);
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
        }
        catch (err) {
            console.error(`[Tenancy] Error in seedTenantData for ${companyId}:`, err);
            throw err;
        }
    }
};
exports.TenancyService = TenancyService;
exports.TenancyService = TenancyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], TenancyService);
//# sourceMappingURL=tenancy.service.js.map