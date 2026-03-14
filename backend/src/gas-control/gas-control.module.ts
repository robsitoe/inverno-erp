import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasCylinderType, GasDailyControl, GasDailyEntry } from './gas-control.entity';
import { GasControlService } from './gas-control.service';
import { GasControlController } from './gas-control.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { InventoryModule } from '../inventory/inventory.module';

import { Article } from '../inventory/entities/article.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([GasCylinderType, GasDailyControl, GasDailyEntry, Article, StockMovement]),
        TenancyModule,
        InventoryModule,
    ],
    controllers: [GasControlController],
    providers: [GasControlService],
    exports: [GasControlService],
})
export class GasControlModule { }
