import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyContext } from '../tenancy/tenancy.context';
import { AccountingToolsService } from './accounting-tools.service';

/** IVA, fecho de período, apuramento de resultados, integridade e auditoria. Lançamentos e fechos só por administradores. */
@Controller('accounting/tools')
@UseGuards(JwtAuthGuard)
export class AccountingToolsController {
  constructor(private readonly svc: AccountingToolsService) { }

  private company(c?: string): string {
    const id = c || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return id;
  }
  private admin(req: any, c?: string): string {
    const u = req?.user || {};
    if (!(u.isAdmin || u.isSuperAdmin || u.isTechnical)) throw new ForbiddenException('Apenas administradores podem fazer esta operação.');
    return this.company(c);
  }
  private user(req: any) { return req?.user?.username || null; }

  @Get('vat') vat(@Query('from') f: string, @Query('to') t: string, @Query('companyId') c?: string) { return this.svc.vatSummary(this.company(c), f, t); }
  @Post('vat/settle') settle(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) { return this.svc.postVatSettlement(this.admin(req, c), b?.from, b?.to, this.user(req)); }

  @Get('months') months(@Query('year') y: string, @Query('companyId') c?: string) { return this.svc.months(this.company(c), Number(y) || new Date().getFullYear()); }
  @Post('months/close') close(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) {
    return this.svc.closeMonth(this.admin(req, c), Number(b?.year), Number(b?.month), String(b?.reason || ''), !!b?.force, this.user(req));
  }
  @Post('months/reopen') reopen(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) {
    return this.svc.reopenMonth(this.admin(req, c), Number(b?.year), Number(b?.month), String(b?.reason || ''), this.user(req));
  }

  @Get('results') results(@Query('year') y: string, @Query('companyId') c?: string) { return this.svc.resultsPreview(this.company(c), Number(y)); }
  @Post('results/post') postResults(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) { return this.svc.postResults(this.admin(req, c), Number(b?.year), this.user(req)); }

  @Get('integrity') integrity(@Query('companyId') c?: string) { return this.svc.integrity(this.company(c)); }
  @Get('audit') audit(@Query('page') p: string, @Query('limit') l: string, @Query('from') f: string, @Query('to') t: string, @Query('companyId') c?: string) {
    return this.svc.auditLog(this.company(c), Number(p) || 1, Number(l) || 50, f, t);
  }
}
