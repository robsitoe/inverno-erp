import { Module } from '@nestjs/common';
import { FiscalExportController } from './fiscal-export.controller';
import { FiscalExportService } from './fiscal-export.service';
import { CurrentAccountsService } from '../treasury/current-accounts.service';

@Module({
  controllers: [FiscalExportController],
  providers: [FiscalExportService, CurrentAccountsService],
})
export class FiscalExportModule { }
