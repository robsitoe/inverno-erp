import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';
import { SalesCampaign } from './entities/sales-campaign.entity';
import { SalesCampaignItem } from './entities/sales-campaign-item.entity';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';

import { InventoryModule } from '../inventory/inventory.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesDocument, SalesDocumentLine, SalesCampaign, SalesCampaignItem]),
    InventoryModule,
    AccountingModule,
  ],
  controllers: [SalesController, CampaignController],
  providers: [SalesService, CampaignService],
  exports: [SalesService, CampaignService],
})
export class SalesModule { }
