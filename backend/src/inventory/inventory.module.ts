import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Article } from './entities/article.entity';
import { StockMovement } from './entities/stock-movement.entity';

import { StockDocument, StockDocumentLine } from './entities/stock-document.entity';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleTrip } from './entities/vehicle-trip.entity';
import { Warehouse } from './entities/warehouse.entity';
import { StockAccountingModule } from '../stock-accounting/stock-accounting.module';

@Module({
  imports: [TypeOrmModule.forFeature([Article, StockMovement, StockDocument, StockDocumentLine, Vehicle, VehicleTrip, Warehouse]), StockAccountingModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule { }
