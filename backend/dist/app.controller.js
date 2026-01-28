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
const bcrypt = __importStar(require("bcrypt"));
let AppController = class AppController {
    appService;
    dataSource;
    constructor(appService, dataSource) {
        this.appService = appService;
        this.dataSource = dataSource;
    }
    getHello() {
        return this.appService.getHello();
    }
    async getCompanies() {
        return await this.dataSource.getRepository(company_entity_1.Company).find();
    }
    async getCompanyInfo() {
        const companies = await this.dataSource.getRepository(company_entity_1.Company).find();
        return companies[0] || {
            name: 'Minha Empresa, Lda.',
            nif: '123456789',
            address: 'Maputo, Moçambique',
            email: 'info@empresa.com',
            phone: '+258 84 000 0000',
            website: ''
        };
    }
    async saveCompanyInfo(data) {
        return await this.dataSource.getRepository(company_entity_1.Company).save(data);
    }
    async deleteCompany(id) {
        return await this.dataSource.getRepository(company_entity_1.Company).delete(id);
    }
    async getFiscalYears(companyId) {
        const repo = this.dataSource.getRepository(fiscal_year_entity_1.FiscalYear);
        if (companyId) {
            return await repo.find({ where: { companyId }, order: { year: 'DESC' } });
        }
        return await repo.find({ order: { year: 'DESC' } });
    }
    async saveFiscalYear(year) {
        if (!year.id) {
            year.id = `${year.year}-${year.companyId}`;
        }
        return await this.dataSource.getRepository(fiscal_year_entity_1.FiscalYear).save(year);
    }
    async setCurrentYear(data) {
        const repo = this.dataSource.getRepository(fiscal_year_entity_1.FiscalYear);
        await repo.update({ companyId: data.companyId }, { isCurrent: false });
        await repo.update({ companyId: data.companyId, year: data.year }, { isCurrent: true });
        return { success: true };
    }
    async getSeries(companyId) {
        const repo = this.dataSource.getRepository(series_entity_1.Series);
        if (companyId) {
            return await repo.find({ where: { companyId }, order: { code: 'DESC' } });
        }
        return await repo.find({ order: { code: 'DESC' } });
    }
    async saveSeries(series) {
        return await this.dataSource.getRepository(series_entity_1.Series).save(series);
    }
    async deleteSeries(id) {
        return await this.dataSource.getRepository(series_entity_1.Series).delete(id);
    }
    async getJournals() {
        return await this.dataSource.getRepository(journal_entity_1.Journal).find();
    }
    async saveJournal(journal) {
        const repo = this.dataSource.getRepository(journal_entity_1.Journal);
        if (Array.isArray(journal)) {
            return await repo.save(journal);
        }
        return await repo.save(journal);
    }
    async getCustomers() {
        return await this.dataSource.getRepository(customer_entity_1.Customer).find();
    }
    async saveCustomer(customer) {
        const repo = this.dataSource.getRepository(customer_entity_1.Customer);
        if (Array.isArray(customer)) {
            return await repo.save(customer);
        }
        return await repo.save(customer);
    }
    async getSuppliers() {
        return await this.dataSource.getRepository(supplier_entity_1.Supplier).find();
    }
    async saveSupplier(supplier) {
        const repo = this.dataSource.getRepository(supplier_entity_1.Supplier);
        if (Array.isArray(supplier)) {
            return await repo.save(supplier);
        }
        return await repo.save(supplier);
    }
    async getGenericEntities(type) {
        const repo = this.dataSource.getRepository(generic_entity_entity_1.GenericEntity);
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
                        entities: [account_entity_1.Account, journal_entry_entity_1.JournalEntry, article_entity_1.Article, stock_movement_entity_1.StockMovement, sales_document_entity_1.SalesDocument, purchase_entity_1.PurchaseDocument, treasury_entity_1.TreasuryDocument, company_entity_1.Company, fiscal_year_entity_1.FiscalYear, journal_entity_1.Journal, customer_entity_1.Customer, supplier_entity_1.Supplier, user_entity_1.User, generic_entity_entity_1.GenericEntity],
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
    async syncPush(data) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            if (data.companies && data.companies.length > 0)
                await queryRunner.manager.save(company_entity_1.Company, data.companies);
            else if (data.companyInfo)
                await queryRunner.manager.save(company_entity_1.Company, data.companyInfo);
            if (data.fiscalYears && data.fiscalYears.length > 0)
                await queryRunner.manager.save(fiscal_year_entity_1.FiscalYear, data.fiscalYears);
            if (data.articles && data.articles.length > 0)
                await queryRunner.manager.save(article_entity_1.Article, data.articles);
            if (data.accounts && data.accounts.length > 0)
                await queryRunner.manager.save(account_entity_1.Account, data.accounts);
            if (data.journals && data.journals.length > 0)
                await queryRunner.manager.save(journal_entity_1.Journal, data.journals);
            if (data.salesDocuments && data.salesDocuments.length > 0)
                await queryRunner.manager.save(sales_document_entity_1.SalesDocument, data.salesDocuments);
            if (data.purchaseDocuments && data.purchaseDocuments.length > 0)
                await queryRunner.manager.save(purchase_entity_1.PurchaseDocument, data.purchaseDocuments);
            if (data.journalEntries && data.journalEntries.length > 0)
                await queryRunner.manager.save(journal_entry_entity_1.JournalEntry, data.journalEntries);
            if (data.stockMovements && data.stockMovements.length > 0)
                await queryRunner.manager.save(stock_movement_entity_1.StockMovement, data.stockMovements);
            if (data.receipts && data.receipts.length > 0)
                await queryRunner.manager.save(treasury_entity_1.TreasuryDocument, data.receipts);
            if (data.payments && data.payments.length > 0)
                await queryRunner.manager.save(treasury_entity_1.TreasuryDocument, data.payments);
            if (data.customers && data.customers.length > 0)
                await queryRunner.manager.save(customer_entity_1.Customer, data.customers);
            if (data.suppliers && data.suppliers.length > 0)
                await queryRunner.manager.save(supplier_entity_1.Supplier, data.suppliers);
            if (data.genericEntities && data.genericEntities.length > 0)
                await queryRunner.manager.save(generic_entity_entity_1.GenericEntity, data.genericEntities);
            if (data.users && data.users.length > 0) {
                for (const user of data.users) {
                    if (user.password && !user.password.startsWith('$2b$')) {
                        user.password = await bcrypt.hash(user.password, 10);
                    }
                }
                await queryRunner.manager.save(user_entity_1.User, data.users);
            }
            await queryRunner.commitTransaction();
            return { success: true, message: 'Dados sincronizados com sucesso!' };
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            console.error('Sync error:', err);
            throw new common_1.BadRequestException('Erro ao sincronizar dados: ' + err.message);
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.AppController = AppController;
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
], AppController.prototype, "saveCompanyInfo", null);
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
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
    (0, common_1.Post)('sync/push'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "syncPush", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        typeorm_1.DataSource])
], AppController);
//# sourceMappingURL=app.controller.js.map