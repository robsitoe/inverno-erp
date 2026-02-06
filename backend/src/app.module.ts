import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountingModule } from './accounting/accounting.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { Account } from './accounting/entities/account.entity';
import { JournalEntry, JournalLine } from './accounting/entities/journal-entry.entity';
import { Article } from './inventory/entities/article.entity';
import { StockMovement } from './inventory/entities/stock-movement.entity';
import { SalesDocument, SalesDocumentLine } from './sales/entities/sales-document.entity';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PurchasesModule } from './purchases/purchases.module';
import { TreasuryModule } from './treasury/treasury.module';
import { PurchaseDocument, PurchaseDocumentLine } from './purchases/entities/purchase.entity';
import { TreasuryDocument, TreasuryDocumentLine } from './treasury/entities/treasury.entity';
import { Company } from './companies/entities/company.entity';
import { FiscalYear } from './companies/entities/fiscal-year.entity';
import { Journal } from './accounting/entities/journal.entity';
import { Customer } from './customers/entities/customer.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { Series } from './companies/entities/series.entity';
import { GenericEntity } from './common-entities/generic-entity.entity';
import { DocumentType } from './common-entities/entities/document-type.entity';
import { PaymentMethod } from './treasury/entities/payment-method.entity';
import { TenancyModule } from './tenancy/tenancy.module';
import { TenancyMiddleware } from './tenancy/tenancy.middleware';
import { AuditModule } from './audit/audit.module';
import { AuditMiddleware } from './audit/audit.middleware';
import { AuditLog } from './audit/entities/audit-log.entity';

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
            database: configService.get<string>('DB_DATABASE', 'inverno.sqlite'),
            entities: [
              Account, JournalEntry, JournalLine, Article, StockMovement,
              SalesDocument, SalesDocumentLine, User, PurchaseDocument,
              PurchaseDocumentLine, TreasuryDocument, TreasuryDocumentLine,
              Company, FiscalYear, Journal, Customer, Supplier, Series, GenericEntity, DocumentType, PaymentMethod, AuditLog
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
            Account, JournalEntry, JournalLine, Article, StockMovement,
            SalesDocument, SalesDocumentLine, User, PurchaseDocument,
            PurchaseDocumentLine, TreasuryDocument, TreasuryDocumentLine,
            Company, FiscalYear, Journal, Customer, Supplier, Series, GenericEntity,
            DocumentType, PaymentMethod, AuditLog
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
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenancyMiddleware, AuditMiddleware)
      .forRoutes('*');
  }
}
