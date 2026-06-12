import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountingModule } from './accounting/accounting.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { Account } from './accounting/entities/account.entity';
import {
  JournalEntry,
  JournalLine,
} from './accounting/entities/journal-entry.entity';
import { Article } from './inventory/entities/article.entity';
import { StockMovement } from './inventory/entities/stock-movement.entity';
import {
  SalesDocument,
  SalesDocumentLine,
} from './sales/entities/sales-document.entity';
import { User } from './users/entities/user.entity';
import { Profile } from './users/entities/profile.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PurchasesModule } from './purchases/purchases.module';
import { TreasuryModule } from './treasury/treasury.module';
import {
  PurchaseDocument,
  PurchaseDocumentLine,
} from './purchases/entities/purchase.entity';
import {
  TreasuryDocument,
  TreasuryDocumentLine,
} from './treasury/entities/treasury.entity';
import { Company } from './companies/entities/company.entity';
import { FiscalYear } from './companies/entities/fiscal-year.entity';
import { Journal } from './accounting/entities/journal.entity';
import { Customer } from './customers/entities/customer.entity';
import { DeliveryPoint } from './customers/entities/delivery-point.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { Series } from './companies/entities/series.entity';
import { GenericEntity } from './common-entities/generic-entity.entity';
import { DocumentType } from './common-entities/entities/document-type.entity';
import { PaymentMethod } from './treasury/entities/payment-method.entity';
import { PettyCashVoucher } from './treasury/entities/petty-cash-voucher.entity';
import { TenancyModule } from './tenancy/tenancy.module';
import { PeriodAuditLog } from './companies/entities/period-audit-log.entity';
import { PeriodsModule } from './periods/periods.module';
import { TenancyMiddleware } from './tenancy/tenancy.middleware';
import { WorkflowHistory } from './common/entities/workflow-history.entity';
import { WorkflowModule } from './common/workflow.module';
import { LicensesModule } from './licenses/licenses.module';
import { License } from './licenses/entities/license.entity';
import { LicenseRenewal } from './licenses/entities/license-renewal.entity';
import { TaxRate } from './taxes/entities/tax-rate.entity';
import { TaxesModule } from './taxes/taxes.module';
import { Employee } from './hr/entities/employee.entity';
import { Payroll } from './hr/entities/payroll.entity';
import { Absence } from './hr/entities/absence.entity';
import { TaxBracket, HRSettings } from './hr/entities/hr-settings.entity';
import { HRModule } from './hr/hr.module';
import {
  GasCylinderType,
  GasDailyControl,
  GasDailyEntry,
} from './gas-control/gas-control.entity';
import { SalesCampaign } from './sales/entities/sales-campaign.entity';
import { SalesCampaignItem } from './sales/entities/sales-campaign-item.entity';
import { GasControlModule } from './gas-control/gas-control.module';
import { MobileModule } from './mobile/mobile.module';
import { TruckInventory } from './mobile/truck-inventory.entity';
import { Trip } from './mobile/trip.entity';
import { RoutePoint } from './mobile/route-point.entity';
import { PaymentGatewayConfig } from './payment-gateways/entities/payment-gateway-config.entity';
import { PaymentGatewaysModule } from './payment-gateways/payment-gateways.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'postgres');

        if (dbType === 'sqlite') {
          return {
            type: 'sqlite',
            database: configService.get<string>(
              'DB_DATABASE',
              'inverno.sqlite',
            ),
            entities: [
              Account,
              JournalEntry,
              JournalLine,
              Article,
              StockMovement,
              SalesDocument,
              SalesDocumentLine,
              User,
        Profile,
              PurchaseDocument,
              PurchaseDocumentLine,
              TreasuryDocument,
              TreasuryDocumentLine,
              Company,
              FiscalYear,
              Journal,
              Customer,
              DeliveryPoint,
              Supplier,
              Series,
              GenericEntity,
              DocumentType,
              PaymentMethod,
              PettyCashVoucher,
              WorkflowHistory,
              PeriodAuditLog,
              License,
              LicenseRenewal,
              TaxRate,
              Employee,
              Payroll,
              Absence,
              TaxBracket,
              HRSettings,
              GasCylinderType,
              GasDailyControl,
              GasDailyEntry,
              SalesCampaign,
              SalesCampaignItem,
              TruckInventory,
              Trip,
              RoutePoint,
            ],
            synchronize: true,
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE', 'inverno_erp'),
          entities: [
            Account,
            JournalEntry,
            JournalLine,
            Article,
            StockMovement,
            SalesDocument,
            SalesDocumentLine,
            User,
            Profile,
            PurchaseDocument,
            PurchaseDocumentLine,
            TreasuryDocument,
            TreasuryDocumentLine,
            Company,
            FiscalYear,
            Journal,
            Customer,
            DeliveryPoint,
            Supplier,
            Series,
            GenericEntity,
            DocumentType,
            PaymentMethod,
            PettyCashVoucher,
            WorkflowHistory,
            PeriodAuditLog,
            License,
            LicenseRenewal,
            TaxRate,
            Employee,
            Payroll,
            Absence,
            TaxBracket,
            HRSettings,
            GasCylinderType,
            GasDailyControl,
            GasDailyEntry,
            SalesCampaign,
            SalesCampaignItem,
            TruckInventory,
            Trip,
            RoutePoint,
          ],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    AccountingModule,
    InventoryModule,
    SalesModule,
    UsersModule,
    AuthModule,
    PurchasesModule,
    TreasuryModule,
    TenancyModule,
    WorkflowModule,
    PeriodsModule,
    LicensesModule,
    TaxesModule,
    HRModule,
    GasControlModule,
    MobileModule,
    PaymentGatewaysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenancyMiddleware).forRoutes('*');
  }
}
