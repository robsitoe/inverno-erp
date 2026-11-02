import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyContext } from '../tenancy/tenancy.context';
import { FiscalExportFormat, FiscalExportKind, FiscalExportService } from './fiscal-export.service';

/** Ficheiro mensal de faturas emitidas/recebidas para entregar à AT e mapa de documentos fiscais. */
@Controller('accounting/fiscal-export')
@UseGuards(JwtAuthGuard)
export class FiscalExportController {
  constructor(private readonly svc: FiscalExportService) { }

  private company(companyId?: string): string {
    const id = companyId || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return id;
  }

  private kind(kind?: string) { return String(kind || 'SALES').toUpperCase() as FiscalExportKind; }

  @Get('invoices')
  invoices(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('kind') kind?: string,
    @Query('format') format?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.export(this.company(companyId), this.kind(kind), Number(year), Number(month),
      (String(format || 'xml').toLowerCase() as FiscalExportFormat));
  }

  /** Faturas emitidas, pagas e anuladas e notas de crédito e de débito do período. */
  @Get('listing')
  listing(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('kind') kind?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.listing(this.company(companyId), this.kind(kind), String(from || ''), String(to || ''));
  }
}
