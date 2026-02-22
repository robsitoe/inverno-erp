"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const typeorm_1 = require("typeorm");
const account_entity_1 = require("./accounting/entities/account.entity");
const journal_entry_entity_1 = require("./accounting/entities/journal-entry.entity");
const article_entity_1 = require("./inventory/entities/article.entity");
const stock_movement_entity_1 = require("./inventory/entities/stock-movement.entity");
const sales_document_entity_1 = require("./sales/entities/sales-document.entity");
const purchase_entity_1 = require("./purchases/entities/purchase.entity");
const treasury_entity_1 = require("./treasury/entities/treasury.entity");
const company_entity_1 = require("./companies/entities/company.entity");
const series_entity_1 = require("./companies/entities/series.entity");
const fiscal_year_entity_1 = require("./companies/entities/fiscal-year.entity");
const journal_entity_1 = require("./accounting/entities/journal.entity");
const customer_entity_1 = require("./customers/entities/customer.entity");
const supplier_entity_1 = require("./suppliers/entities/supplier.entity");
const user_entity_1 = require("./users/entities/user.entity");
const generic_entity_entity_1 = require("./common-entities/generic-entity.entity");
const document_type_entity_1 = require("./common-entities/entities/document-type.entity");
const payment_method_entity_1 = require("./treasury/entities/payment-method.entity");
const bcrypt = __importStar(require("bcrypt"));
const tenancy_service_1 = require("./tenancy/tenancy.service");
const tenancy_context_1 = require("./tenancy/tenancy.context");
const period_control_service_1 = require("./periods/period-control.service");
const period_audit_log_entity_1 = require("./companies/entities/period-audit-log.entity");
let AppController = class AppController {
    appService;
    dataSource;
    tenancyService;
    periodControlService;
    constructor(appService, dataSource, tenancyService, periodControlService) {
        this.appService = appService;
        this.dataSource = dataSource;
        this.tenancyService = tenancyService;
        this.periodControlService = periodControlService;
    }
    async getRepo(entity, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId)
            return this.dataSource.getRepository(entity);
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }
    testRoute() {
        return { status: 'ok', message: 'Backend is reachable' };
    }
    getHello() {
        return this.appService.getHello();
    }
    async getCompanies() {
        return await this.dataSource.getRepository(company_entity_1.Company).find({ order: { name: 'ASC' } });
    }
    async getCompanyInfo() {
        const companyId = tenancy_context_1.TenancyContext.getCompanyId();
        if (!companyId) {
            return this.dataSource.getRepository(company_entity_1.Company).findOne({ where: {} });
        }
        return await this.dataSource.getRepository(company_entity_1.Company).findOne({ where: { id: companyId } });
    }
    async saveCompany(company) {
        try {
            const repo = this.dataSource.getRepository(company_entity_1.Company);
            const isNew = !company.id || !(await repo.findOne({ where: { id: company.id } }));
            if (isNew) {
                const existingName = await repo.findOne({ where: { name: company.name } });
                if (existingName) {
                    throw new common_1.BadRequestException(`Já existe uma empresa registrada com o nome "${company.name}".`);
                }
                if (company.nif) {
                    const existingNif = await repo.findOne({ where: { nif: company.nif } });
                    if (existingNif) {
                        throw new common_1.BadRequestException(`O NIF "${company.nif}" já está associado a outra empresa.`);
                    }
                }
            }
            const savedCompany = await repo.save(company);
            try {
                await this.tenancyService.getTenantDataSource(savedCompany.id);
            }
            catch (tenancyError) {
                console.error(`[Tenancy Error] Failed to initialize DB for ${savedCompany.name}:`, tenancyError.message);
            }
            return savedCompany;
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            console.error('Error saving company:', err);
            throw new common_1.BadRequestException(err.message || 'Erro interno ao gravar empresa.');
        }
    }
    async deleteCompany(id) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            console.log(`🗑️ Starting full cleanup for company ID: ${id}`);
            const users = await queryRunner.manager.find(user_entity_1.User);
            for (const user of users) {
                if (user.permissions && Array.isArray(user.permissions)) {
                    const originalCount = user.permissions.length;
                    user.permissions = user.permissions.filter((p) => p.companyId !== id);
                    if (user.permissions.length !== originalCount) {
                        await queryRunner.manager.save(user_entity_1.User, user);
                    }
                }
            }
            await queryRunner.manager.delete(fiscal_year_entity_1.FiscalYear, { companyId: id });
            await queryRunner.manager.delete(period_audit_log_entity_1.PeriodAuditLog, { companyId: id });
            await queryRunner.manager.delete(series_entity_1.Series, { companyId: id });
            await queryRunner.manager.delete(journal_entity_1.Journal, { companyId: id });
            await queryRunner.manager.delete(customer_entity_1.Customer, { companyId: id });
            await queryRunner.manager.delete(supplier_entity_1.Supplier, { companyId: id });
            const deleteResult = await queryRunner.manager.delete(company_entity_1.Company, id);
            await queryRunner.commitTransaction();
            console.log(`✅ Company ${id} and all related data removed.`);
            return { success: true, message: 'Empresa removida com sucesso!', result: deleteResult };
        }
        catch (err) {
            console.error(`❌ Error deleting company ${id}:`, err);
            await queryRunner.rollbackTransaction();
            throw new common_1.BadRequestException('Erro ao remover empresa: ' + err.message);
        }
        finally {
            await queryRunner.release();
        }
    }
    async getFiscalYears(companyId) {
        const filterCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(fiscal_year_entity_1.FiscalYear, filterCompanyId);
        return await repo.find({ order: { year: 'DESC' } });
    }
    async saveFiscalYear(year) {
        const repo = await this.getRepo(fiscal_year_entity_1.FiscalYear);
        if (!year.id) {
            year.id = `${year.year}-${year.companyId}`;
        }
        return await repo.save(year);
    }
    async setCurrentYear(data) {
        const repo = await this.getRepo(fiscal_year_entity_1.FiscalYear);
        await repo.update({ companyId: data.companyId }, { isCurrent: false });
        await repo.update({ companyId: data.companyId, year: data.year }, { isCurrent: true });
        return { success: true };
    }
    async getFiscalYearChecklist(id, companyId) {
        return this.periodControlService.getClosureChecklist(id, companyId);
    }
    async closeFiscalYear(id, body) {
        return this.periodControlService.closeFiscalYear(id, body?.reason, { id: body?.userId, username: body?.username }, body?.companyId);
    }
    async reopenFiscalYear(id, body) {
        return this.periodControlService.reopenFiscalYear(id, body?.reason, { userId: body?.userId, username: body?.username, requireElevatedPermission: true }, body?.companyId);
    }
    async getFiscalYearAuditLogs(id, companyId) {
        const repo = await this.getRepo(period_audit_log_entity_1.PeriodAuditLog);
        const resolvedCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        return repo.find({
            where: { fiscalYearId: id, companyId: resolvedCompanyId },
            order: { createdAt: 'DESC' },
        });
    }
    async getSeries(companyId) {
        const filterCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(series_entity_1.Series, filterCompanyId);
        return await repo.find({ order: { code: 'DESC' } });
    }
    async saveSeries(series) {
        const repo = await this.getRepo(series_entity_1.Series);
        return await repo.save(series);
    }
    async deleteSeries(id) {
        const repo = await this.getRepo(series_entity_1.Series);
        return await repo.delete(id);
    }
    async getJournals(companyId) {
        const filterCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(journal_entity_1.Journal, filterCompanyId);
        return await repo.find({ order: { code: 'ASC' } });
    }
    async saveJournal(journal) {
        const repo = await this.getRepo(journal_entity_1.Journal);
        return await repo.save(journal);
    }
    async getCustomers(companyId) {
        const filterCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(customer_entity_1.Customer, filterCompanyId);
        return await repo.find({ order: { name: 'ASC' } });
    }
    async saveCustomer(customer) {
        try {
            let companyId;
            const first = Array.isArray(customer) ? customer[0] : customer;
            if (first && first.companyId) {
                companyId = first.companyId;
            }
            const repo = await this.getRepo(customer_entity_1.Customer, companyId);
            const sanitizeId = (id) => {
                if (typeof id === 'string' && (id.startsWith('NEW_') || id.length < 30)) {
                    return undefined;
                }
                return id;
            };
            if (Array.isArray(customer)) {
                const processed = customer.map(c => ({
                    ...c,
                    id: sanitizeId(c.id)
                }));
                return await repo.save(processed);
            }
            const toSave = {
                ...customer,
                id: sanitizeId(customer.id)
            };
            return await repo.save(toSave);
        }
        catch (error) {
            console.error('Error in saveCustomer:', error);
            throw new common_1.BadRequestException(`Erro ao guardar cliente: ${error.message}`);
        }
    }
    async getSuppliers(companyId) {
        const repo = await this.getRepo(supplier_entity_1.Supplier);
        const filterCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const properRepo = await this.getRepo(supplier_entity_1.Supplier, filterCompanyId);
        return await properRepo.find({ order: { name: 'ASC' } });
    }
    async saveSupplier(supplier) {
        try {
            let companyId;
            const first = Array.isArray(supplier) ? supplier[0] : supplier;
            if (first && first.companyId) {
                companyId = first.companyId;
            }
            const repo = await this.getRepo(supplier_entity_1.Supplier, companyId);
            const sanitizeId = (id) => {
                if (typeof id === 'string' && (id.startsWith('NEW_') || id.length < 30)) {
                    return undefined;
                }
                return id;
            };
            if (Array.isArray(supplier)) {
                const processed = supplier.map(s => ({
                    ...s,
                    id: sanitizeId(s.id)
                }));
                return await repo.save(processed);
            }
            const toSave = {
                ...supplier,
                id: sanitizeId(supplier.id)
            };
            return await repo.save(toSave);
        }
        catch (error) {
            console.error('Error in saveSupplier:', error);
            throw new common_1.BadRequestException(`Erro ao guardar fornecedor: ${error.message}`);
        }
    }
    async getGenericEntities(type, companyId) {
        const filterCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(generic_entity_entity_1.GenericEntity, filterCompanyId);
        if (type) {
            return await repo.find({ where: { type }, order: { name: 'ASC' } });
        }
        return await repo.find({ order: { name: 'ASC' } });
    }
    async saveGenericEntity(entity) {
        return await this.dataSource.getRepository(generic_entity_entity_1.GenericEntity).save(entity);
    }
    async testDbConnection(config) {
        if (!config || !config.host || !config.username || !config.database) {
            throw new common_1.BadRequestException('Configuração de base de dados incompleta.');
        }
        const tempDataSource = new typeorm_1.DataSource({
            type: 'postgres',
            host: config.host,
            port: parseInt(config.port) || 5432,
            username: config.username,
            password: config.password,
            database: config.database,
            synchronize: false,
        });
        try {
            await tempDataSource.initialize();
            await tempDataSource.destroy();
            return { success: true, message: 'Conexão estabelecida com sucesso!' };
        }
        catch (error) {
            if (error.code === '3D000') {
                try {
                    const adminDataSource = new typeorm_1.DataSource({
                        type: 'postgres',
                        host: config.host,
                        port: parseInt(config.port) || 5432,
                        username: config.username,
                        password: config.password,
                        database: 'postgres',
                        synchronize: false,
                    });
                    await adminDataSource.initialize();
                    const dbName = config.database.replace(/[^a-zA-Z0-9_-]/g, '');
                    await adminDataSource.query(`CREATE DATABASE "${dbName}"`);
                    await adminDataSource.destroy();
                    const newDbDataSource = new typeorm_1.DataSource({
                        type: 'postgres',
                        host: config.host,
                        port: parseInt(config.port) || 5432,
                        username: config.username,
                        password: config.password,
                        database: dbName,
                        entities: [account_entity_1.Account, journal_entry_entity_1.JournalEntry, article_entity_1.Article, stock_movement_entity_1.StockMovement, sales_document_entity_1.SalesDocument, purchase_entity_1.PurchaseDocument, treasury_entity_1.TreasuryDocument, company_entity_1.Company, fiscal_year_entity_1.FiscalYear, journal_entity_1.Journal, customer_entity_1.Customer, supplier_entity_1.Supplier, user_entity_1.User, generic_entity_entity_1.GenericEntity, period_audit_log_entity_1.PeriodAuditLog],
                        synchronize: true,
                    });
                    await newDbDataSource.initialize();
                    await newDbDataSource.destroy();
                    return {
                        success: true,
                        message: `Base de dados "${dbName}" não existia e foi criada com sucesso! Conexão estabelecida.`
                    };
                }
                catch (creationError) {
                    return {
                        success: false,
                        message: 'A base de dados não existia e falhou ao tentar criar: ' + (creationError.message || 'Erro desconhecido')
                    };
                }
            }
            return {
                success: false,
                message: 'Falha na conexão: ' + (error.message || 'Erro desconhecido')
            };
        }
    }
    async getDocumentTypes(module, companyId) {
        let filterCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        try {
            const repo = await this.getRepo(document_type_entity_1.DocumentType, filterCompanyId);
            const normalized = module ? module.toUpperCase() : '';
            const moduleQueries = [normalized];
            if (normalized === 'PURCHASE')
                moduleQueries.push('PURCHASES');
            if (normalized === 'PURCHASES')
                moduleQueries.push('PURCHASE');
            if (normalized === 'SALE')
                moduleQueries.push('SALES');
            if (normalized === 'SALES')
                moduleQueries.push('SALE');
            if (normalized === 'STOCK')
                moduleQueries.push('INVENTORY');
            if (normalized === 'INVENTORY')
                moduleQueries.push('STOCK');
            const records = await repo.find({
                where: moduleQueries.map(m => ({ module: m })),
                order: { code: 'ASC' }
            });
            return records.map((r) => {
                const { settings, ...core } = r;
                return {
                    ...core,
                    ...(settings || {})
                };
            });
        }
        catch (error) {
            console.error(`[AppController] Error in getDocumentTypes:`, error.message);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async saveDocumentTypes(data) {
        const repo = await this.getRepo(document_type_entity_1.DocumentType);
        const companyId = tenancy_context_1.TenancyContext.getCompanyId();
        const processed = data.types.map(t => {
            const { id, companyId: cid, module: mod, code, name, description, nature, series, isActive, createdAt, updatedAt, ...settings } = t;
            return {
                id: id || `${data.module}-${code}-${cid || companyId || 'GLOBAL'}`,
                companyId: cid || companyId,
                module: data.module,
                code,
                name: name || description || code,
                description,
                nature,
                series: series || [],
                isActive: isActive !== false,
                settings
            };
        });
        return await repo.save(processed);
    }
    async getPaymentMethods(companyId) {
        const filterCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getRepo(payment_method_entity_1.PaymentMethod, filterCompanyId);
        return await repo.find({ order: { sortOrder: 'ASC' } });
    }
    async savePaymentMethod(method) {
        const repo = await this.getRepo(payment_method_entity_1.PaymentMethod);
        if (!method.id) {
            method.id = `PM-${Date.now()}`;
        }
        return await repo.save(method);
    }
    async syncPush(data) {
        const mainQueryRunner = this.dataSource.createQueryRunner();
        await mainQueryRunner.connect();
        await mainQueryRunner.startTransaction();
        try {
            if (data.companies && data.companies.length > 0)
                await mainQueryRunner.manager.save(company_entity_1.Company, data.companies);
            else if (data.companyInfo)
                await mainQueryRunner.manager.save(company_entity_1.Company, data.companyInfo);
            if (data.users && data.users.length > 0) {
                for (const user of data.users) {
                    if (user.password && !user.password.startsWith('$2b$')) {
                        user.password = await bcrypt.hash(user.password, 10);
                    }
                }
                await mainQueryRunner.manager.save(user_entity_1.User, data.users);
            }
            await mainQueryRunner.commitTransaction();
        }
        catch (err) {
            await mainQueryRunner.rollbackTransaction();
            console.error('Global sync error:', err);
            throw new common_1.BadRequestException('Erro ao sincronizar dados globais: ' + err.message);
        }
        finally {
            await mainQueryRunner.release();
        }
        const tenantData = new Map();
        const addToTenant = (items, key) => {
            if (!items || !Array.isArray(items))
                return;
            items.forEach(item => {
                const cid = item.companyId;
                if (!cid)
                    return;
                if (!tenantData.has(cid))
                    tenantData.set(cid, {});
                const group = tenantData.get(cid);
                if (!group[key])
                    group[key] = [];
                group[key].push(item);
            });
        };
        addToTenant(data.fiscalYears, 'fiscalYears');
        addToTenant(data.periodAuditLogs, 'periodAuditLogs');
        addToTenant(data.articles, 'articles');
        addToTenant(data.accounts, 'accounts');
        addToTenant(data.journals, 'journals');
        addToTenant(data.journalEntries, 'journalEntries');
        addToTenant(data.salesDocuments, 'salesDocuments');
        addToTenant(data.purchaseDocuments, 'purchaseDocuments');
        addToTenant(data.stockMovements, 'stockMovements');
        addToTenant(data.receipts, 'receipts');
        addToTenant(data.payments, 'payments');
        addToTenant(data.customers, 'customers');
        addToTenant(data.suppliers, 'suppliers');
        addToTenant(data.genericEntities, 'genericEntities');
        const errors = [];
        for (const [companyId, group] of tenantData.entries()) {
            try {
                const tenantDS = await this.tenancyService.getTenantDataSource(companyId);
                const qr = tenantDS.createQueryRunner();
                await qr.connect();
                await qr.startTransaction();
                try {
                    if (group.fiscalYears)
                        await qr.manager.getRepository(fiscal_year_entity_1.FiscalYear).save(group.fiscalYears);
                    if (group.periodAuditLogs)
                        await qr.manager.getRepository(period_audit_log_entity_1.PeriodAuditLog).save(group.periodAuditLogs);
                    if (group.articles)
                        await qr.manager.getRepository(article_entity_1.Article).save(group.articles);
                    if (group.accounts)
                        await qr.manager.getRepository(account_entity_1.Account).save(group.accounts);
                    if (group.journals)
                        await qr.manager.getRepository(journal_entity_1.Journal).save(group.journals);
                    if (group.salesDocuments)
                        await qr.manager.getRepository(sales_document_entity_1.SalesDocument).save(group.salesDocuments);
                    if (group.purchaseDocuments)
                        await qr.manager.getRepository(purchase_entity_1.PurchaseDocument).save(group.purchaseDocuments);
                    if (group.journalEntries)
                        await qr.manager.getRepository(journal_entry_entity_1.JournalEntry).save(group.journalEntries);
                    if (group.stockMovements)
                        await qr.manager.getRepository(stock_movement_entity_1.StockMovement).save(group.stockMovements);
                    if (group.receipts)
                        await qr.manager.getRepository(treasury_entity_1.TreasuryDocument).save(group.receipts);
                    if (group.payments)
                        await qr.manager.getRepository(treasury_entity_1.TreasuryDocument).save(group.payments);
                    if (group.customers)
                        await qr.manager.getRepository(customer_entity_1.Customer).save(group.customers);
                    if (group.suppliers)
                        await qr.manager.getRepository(supplier_entity_1.Supplier).save(group.suppliers);
                    if (group.genericEntities)
                        await qr.manager.getRepository(generic_entity_entity_1.GenericEntity).save(group.genericEntities);
                    await qr.commitTransaction();
                    console.log(`Synced data for company ${companyId}`);
                }
                catch (e) {
                    await qr.rollbackTransaction();
                    throw e;
                }
                finally {
                    await qr.release();
                }
            }
            catch (err) {
                console.error(`Failed to sync for company ${companyId}`, err);
                errors.push(`Empresa ${companyId}: ${err.message}`);
            }
        }
        if (errors.length > 0) {
            return { success: false, message: 'Sincronização parcial (erros em: ' + errors.join('; ') + ')' };
        }
        return { success: true, message: 'Dados sincronizados com sucesso!' };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('test-route'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "testRoute", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getCompanies", null);
__decorate([
    (0, common_1.Get)('company'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getCompanyInfo", null);
__decorate([
    (0, common_1.Post)('company'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "saveCompany", null);
__decorate([
    (0, common_1.Delete)('companies/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteCompany", null);
__decorate([
    (0, common_1.Get)('fiscal-years'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getFiscalYears", null);
__decorate([
    (0, common_1.Post)('fiscal-years'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "saveFiscalYear", null);
__decorate([
    (0, common_1.Post)('fiscal-years/set-current'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "setCurrentYear", null);
__decorate([
    (0, common_1.Get)('fiscal-years/:id/checklist'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getFiscalYearChecklist", null);
__decorate([
    (0, common_1.Post)('fiscal-years/:id/close'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "closeFiscalYear", null);
__decorate([
    (0, common_1.Post)('fiscal-years/:id/reopen'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "reopenFiscalYear", null);
__decorate([
    (0, common_1.Get)('fiscal-years/:id/audit-logs'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getFiscalYearAuditLogs", null);
__decorate([
    (0, common_1.Get)('series'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSeries", null);
__decorate([
    (0, common_1.Post)('series'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "saveSeries", null);
__decorate([
    (0, common_1.Delete)('series/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteSeries", null);
__decorate([
    (0, common_1.Get)('accounting/journals'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getJournals", null);
__decorate([
    (0, common_1.Post)('accounting/journals'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "saveJournal", null);
__decorate([
    (0, common_1.Get)('customers'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Post)('customers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "saveCustomer", null);
__decorate([
    (0, common_1.Get)('suppliers'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSuppliers", null);
__decorate([
    (0, common_1.Post)('suppliers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "saveSupplier", null);
__decorate([
    (0, common_1.Get)('entities'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getGenericEntities", null);
__decorate([
    (0, common_1.Post)('entities'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "saveGenericEntity", null);
__decorate([
    (0, common_1.Post)('test-db-connection'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "testDbConnection", null);
__decorate([
    (0, common_1.Get)('document-types'),
    __param(0, (0, common_1.Query)('module')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getDocumentTypes", null);
__decorate([
    (0, common_1.Post)('document-types'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "saveDocumentTypes", null);
__decorate([
    (0, common_1.Get)('payment-methods'),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Post)('payment-methods'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "savePaymentMethod", null);
__decorate([
    (0, common_1.Post)('sync/push'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "syncPush", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        typeorm_1.DataSource,
        tenancy_service_1.TenancyService,
        period_control_service_1.PeriodControlService])
], AppController);
//# sourceMappingURL=app.controller.js.map