import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountingModule } from './accounting/accounting.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PurchasesModule } from './purchases/purchases.module';
import { TreasuryModule } from './treasury/treasury.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { TenancyMiddleware } from './tenancy/tenancy.middleware';
import { MAIN_ENTITIES, MAIN_MIGRATIONS_GLOB, isEnvEnabled } from './database/typeorm.constants';

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
            entities: MAIN_ENTITIES,
            migrations: [MAIN_MIGRATIONS_GLOB],
            migrationsRun: isEnvEnabled(configService.get<string>('DB_RUN_MIGRATIONS'), false),
            synchronize: isEnvEnabled(configService.get<string>('DB_SYNCHRONIZE'), false),
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE', 'inverno_erp'),
          entities: MAIN_ENTITIES,
          migrations: [MAIN_MIGRATIONS_GLOB],
          migrationsRun: isEnvEnabled(configService.get<string>('DB_RUN_MIGRATIONS'), false),
          synchronize: isEnvEnabled(configService.get<string>('DB_SYNCHRONIZE'), false),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenancyMiddleware)
      .forRoutes('*');
  }
}
