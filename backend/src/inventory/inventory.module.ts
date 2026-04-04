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

@Module({
  imports: [TypeOrmModule.forFeature([Article, StockMovement, StockDocument, StockDocumentLine, Vehicle, VehicleTrip, Warehouse])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule { }
