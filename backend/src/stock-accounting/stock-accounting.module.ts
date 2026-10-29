import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { StockAccountingController } from './stock-accounting.controller';
import { StockAccountingService } from './stock-accounting.service';

@Module({
  imports: [AccountingModule],
  controllers: [StockAccountingController],
  providers: [StockAccountingService],
  exports: [StockAccountingService],
})
export class StockAccountingModule { }
