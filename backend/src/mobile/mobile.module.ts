import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileService } from './mobile.service';
import { MobileController } from './mobile.controller';
import { MpesaService } from './mpesa.service';
import { GasControlModule } from '../gas-control/gas-control.module';
import { SalesModule } from '../sales/sales.module';
import { Customer } from '../customers/entities/customer.entity';
import { DeliveryPoint } from '../customers/entities/delivery-point.entity';
import { TruckInventory } from './truck-inventory.entity';
import { User } from '../users/entities/user.entity';
import { Employee } from '../hr/entities/employee.entity';
import { Account } from '../accounting/entities/account.entity';

import { GasCylinderType } from '../gas-control/gas-control.entity';
import { Article } from '../inventory/entities/article.entity';
import { Company } from '../companies/entities/company.entity';
import { License } from '../licenses/entities/license.entity';

import { NotificationService } from './notification.service';
import { TenancyModule } from '../tenancy/tenancy.module';
import { TreasuryModule } from '../treasury/treasury.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      DeliveryPoint,
      TruckInventory,
      User,
      Employee,
      GasCylinderType,
      Article,
      Company,
      License,
      Account,
    ]),
    GasControlModule,
    SalesModule,
    TenancyModule,
    TreasuryModule,
  ],
  controllers: [MobileController],
  providers: [MobileService, MpesaService, NotificationService],
  exports: [MobileService, MpesaService, NotificationService],
})
export class MobileModule { }
