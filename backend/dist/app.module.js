"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const accounting_module_1 = require("./accounting/accounting.module");
const inventory_module_1 = require("./inventory/inventory.module");
const sales_module_1 = require("./sales/sales.module");
const account_entity_1 = require("./accounting/entities/account.entity");
const journal_entry_entity_1 = require("./accounting/entities/journal-entry.entity");
const article_entity_1 = require("./inventory/entities/article.entity");
const stock_movement_entity_1 = require("./inventory/entities/stock-movement.entity");
const sales_document_entity_1 = require("./sales/entities/sales-document.entity");
const user_entity_1 = require("./users/entities/user.entity");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const purchases_module_1 = require("./purchases/purchases.module");
const treasury_module_1 = require("./treasury/treasury.module");
const purchase_entity_1 = require("./purchases/entities/purchase.entity");
const treasury_entity_1 = require("./treasury/entities/treasury.entity");
const company_entity_1 = require("./companies/entities/company.entity");
const fiscal_year_entity_1 = require("./companies/entities/fiscal-year.entity");
const journal_entity_1 = require("./accounting/entities/journal.entity");
const customer_entity_1 = require("./customers/entities/customer.entity");
const supplier_entity_1 = require("./suppliers/entities/supplier.entity");
const series_entity_1 = require("./companies/entities/series.entity");
const generic_entity_entity_1 = require("./common-entities/generic-entity.entity");
const document_type_entity_1 = require("./common-entities/entities/document-type.entity");
const payment_method_entity_1 = require("./treasury/entities/payment-method.entity");
const tenancy_module_1 = require("./tenancy/tenancy.module");
const period_audit_log_entity_1 = require("./companies/entities/period-audit-log.entity");
const periods_module_1 = require("./periods/periods.module");
const tenancy_middleware_1 = require("./tenancy/tenancy.middleware");
const workflow_history_entity_1 = require("./common/entities/workflow-history.entity");
const workflow_module_1 = require("./common/workflow.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(tenancy_middleware_1.TenancyMiddleware)
            .forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const dbType = configService.get('DB_TYPE', 'postgres');
                    if (dbType === 'sqlite') {
                        return {
                            type: 'sqlite',
                            database: configService.get('DB_DATABASE', 'inverno.sqlite'),
                            entities: [
                                account_entity_1.Account, journal_entry_entity_1.JournalEntry, journal_entry_entity_1.JournalLine, article_entity_1.Article, stock_movement_entity_1.StockMovement,
                                sales_document_entity_1.SalesDocument, sales_document_entity_1.SalesDocumentLine, user_entity_1.User, purchase_entity_1.PurchaseDocument,
                                purchase_entity_1.PurchaseDocumentLine, treasury_entity_1.TreasuryDocument, treasury_entity_1.TreasuryDocumentLine,
                                company_entity_1.Company, fiscal_year_entity_1.FiscalYear, journal_entity_1.Journal, customer_entity_1.Customer, supplier_entity_1.Supplier, series_entity_1.Series, generic_entity_entity_1.GenericEntity, document_type_entity_1.DocumentType, payment_method_entity_1.PaymentMethod, workflow_history_entity_1.WorkflowHistory, period_audit_log_entity_1.PeriodAuditLog
                            ],
                            synchronize: true,
                        };
                    }
                    return {
                        type: 'postgres',
                        host: configService.get('DB_HOST', 'localhost'),
                        port: configService.get('DB_PORT', 5432),
                        username: configService.get('DB_USERNAME', 'postgres'),
                        password: configService.get('DB_PASSWORD', 'postgres'),
                        database: configService.get('DB_DATABASE', 'inverno_erp'),
                        entities: [
                            account_entity_1.Account, journal_entry_entity_1.JournalEntry, journal_entry_entity_1.JournalLine, article_entity_1.Article, stock_movement_entity_1.StockMovement,
                            sales_document_entity_1.SalesDocument, sales_document_entity_1.SalesDocumentLine, user_entity_1.User, purchase_entity_1.PurchaseDocument,
                            purchase_entity_1.PurchaseDocumentLine, treasury_entity_1.TreasuryDocument, treasury_entity_1.TreasuryDocumentLine,
                            company_entity_1.Company, fiscal_year_entity_1.FiscalYear, journal_entity_1.Journal, customer_entity_1.Customer, supplier_entity_1.Supplier, series_entity_1.Series, generic_entity_entity_1.GenericEntity,
                            document_type_entity_1.DocumentType, payment_method_entity_1.PaymentMethod, workflow_history_entity_1.WorkflowHistory, period_audit_log_entity_1.PeriodAuditLog
                        ],
                        synchronize: true,
                    };
                },
                inject: [config_1.ConfigService],
            }),
            accounting_module_1.AccountingModule,
            inventory_module_1.InventoryModule,
            sales_module_1.SalesModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            purchases_module_1.PurchasesModule,
            treasury_module_1.TreasuryModule,
            tenancy_module_1.TenancyModule,
            workflow_module_1.WorkflowModule,
            periods_module_1.PeriodsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map