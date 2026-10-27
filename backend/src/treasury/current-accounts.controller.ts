import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LicenseGuard } from '../auth/guards/license.guard';
import { CurrentAccountsService, AccountSide } from './current-accounts.service';

function parseSide(side?: string): AccountSide {
  const s = String(side || 'CUSTOMER').toUpperCase();
  if (s !== 'CUSTOMER' && s !== 'SUPPLIER') {
    throw new BadRequestException("side deve ser 'CUSTOMER' ou 'SUPPLIER'.");
  }
  return s;
}

function parseDate(d?: string): string | undefined {
  if (!d) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new BadRequestException('asOf deve ter o formato YYYY-MM-DD.');
  return d;
}

@Controller('treasury')
@UseGuards(JwtAuthGuard, LicenseGuard)
export class CurrentAccountsController {
  constructor(private readonly service: CurrentAccountsService) { }

  /** Pendentes de clientes (side=CUSTOMER) ou fornecedores (side=SUPPLIER). */
  @Get('open-items')
  openItems(
    @Query('side') side?: string,
    @Query('entity') entity?: string,
    @Query('companyId') companyId?: string,
    @Query('asOf') asOf?: string,
  ) {
    return this.service.getOpenItems(parseSide(side), { companyId, entity, asOf: parseDate(asOf) });
  }

  /** Mapa de antiguidade de saldos. */
  @Get('aging')
  aging(
    @Query('side') side?: string,
    @Query('companyId') companyId?: string,
    @Query('asOf') asOf?: string,
  ) {
    return this.service.getAging(parseSide(side), { companyId, asOf: parseDate(asOf) });
  }

  /** Extracto de conta corrente de um cliente/fornecedor. */
  @Get('statement')
  statement(
    @Query('side') side?: string,
    @Query('entity') entity?: string,
    @Query('name') name?: string,
    @Query('id') id?: string,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeDrafts') includeDrafts?: string,
  ) {
    return this.service.getStatement(parseSide(side), {
      companyId, entity: entity || '', name, id, from: parseDate(from), to: parseDate(to),
      includeDrafts: includeDrafts === 'true' || includeDrafts === '1',
    });
  }
}
