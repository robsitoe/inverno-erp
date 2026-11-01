import { Module } from '@nestjs/common';
import { FiscalExportController } from './fiscal-export.controller';
import { FiscalExportService } from './fiscal-export.service';

@Module({
  controllers: [FiscalExportController],
  providers: [FiscalExportService],
})
export class FiscalExportModule { }
