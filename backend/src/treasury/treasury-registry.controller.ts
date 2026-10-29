import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TreasuryRegistryService } from './treasury-registry.service';

/** Caixas, bancos, transferências, cheques, letras e tesouraria previsional. */
@Controller('treasury')
@UseGuards(JwtAuthGuard)
export class TreasuryRegistryController {
  constructor(private readonly svc: TreasuryRegistryService) { }

  private user(req: any) { return req?.user?.username || null; }

  @Get('accounts') accounts(@Query('type') type?: string, @Query('companyId') c?: string) { return this.svc.listAccounts(c, type); }
  @Get('accounts/chart-candidates') candidates(@Query('companyId') c?: string) { return this.svc.chartCandidates(c); }
  @Post('accounts/import-from-chart') importChart(@Query('companyId') c?: string) { return this.svc.importFromChart(c); }
  @Post('accounts') saveAccount(@Body() b: any, @Query('companyId') c?: string) { return this.svc.saveAccount(c, b || {}); }
  @Get('accounts/:id/movements') movements(@Param('id') id: string, @Query('from') from: string, @Query('to') to: string, @Query('companyId') c?: string) {
    return this.svc.movements(c, id, from, to);
  }

  @Get('transfers') transfers(@Query('companyId') c?: string) { return this.svc.transfers(c); }
  @Post('transfers') transfer(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) { return this.svc.transfer(c, b || {}, this.user(req)); }

  @Get('instruments') instruments(@Query() q: any) { return this.svc.listInstruments(q?.companyId, q || {}); }
  @Post('instruments') saveInstrument(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) { return this.svc.saveInstrument(c, b || {}, this.user(req)); }
  @Post('instruments/:id/status') status(@Req() req: any, @Param('id') id: string, @Body() b: any, @Query('companyId') c?: string) {
    return this.svc.changeStatus(c, id, b || {}, this.user(req));
  }

  @Get('forecast') forecast(@Query('horizon') h?: string, @Query('granularity') g?: string, @Query('companyId') c?: string) {
    return this.svc.forecast(c, Number(h) || 90, g === 'MONTH' ? 'MONTH' : 'WEEK');
  }
  @Get('forecast-items') forecastItems(@Query('companyId') c?: string) { return this.svc.listForecastItems(c); }
  @Post('forecast-items') saveForecastItem(@Body() b: any, @Query('companyId') c?: string) { return this.svc.saveForecastItem(c, b || {}); }
  @Delete('forecast-items/:id') deleteForecastItem(@Param('id') id: string, @Query('companyId') c?: string) { return this.svc.deleteForecastItem(c, id); }
}
