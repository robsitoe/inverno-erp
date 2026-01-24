import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PurchaseDocument, PurchaseDocumentLine } from './entities/purchase.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseDocument, PurchaseDocumentLine])],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule { }
