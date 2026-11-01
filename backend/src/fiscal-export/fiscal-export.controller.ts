import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyContext } from '../tenancy/tenancy.context';
import { FiscalExportFormat, FiscalExportKind, FiscalExportService } from './fiscal-export.service';

/** Ficheiro mensal de faturas emitidas/recebidas para entregar à AT. */
@Controller('accounting/fiscal-export')
@UseGuards(JwtAuthGuard)
export class FiscalExportController {
  constructor(private readonly svc: FiscalExportService) { }

  @Get('invoices')
  invoices(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('kind') kind?: string,
    @Query('format') format?: string,
    @Query('companyId') companyId?: string,
  ) {
    const id = companyId || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return this.svc.export(id, (String(kind || 'SALES').toUpperCase() as FiscalExportKind), Number(year), Number(month),
      (String(format || 'xml').toLowerCase() as FiscalExportFormat));
  }
}
