import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyContext } from '../tenancy/tenancy.context';
import { StockAccountingService } from './stock-accounting.service';

/** Integração stock–contabilidade: leitura para qualquer utilizador da empresa, alteração só por administradores. */
@Controller('stock-accounting')
@UseGuards(JwtAuthGuard)
export class StockAccountingController {
  constructor(private readonly svc: StockAccountingService) { }

  private company(c?: string): string {
    const id = c || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return id;
  }

  private admin(req: any, c?: string): string {
    const u = req?.user || {};
    if (!(u.isAdmin || u.isSuperAdmin || u.isTechnical)) throw new ForbiddenException('Apenas administradores podem alterar a integração com a contabilidade.');
    return this.company(c);
  }

  @Get('settings')
  settings(@Query('companyId') c?: string) { return this.svc.getSettings(this.company(c)); }

  @Get('defaults')
  defaults() { return this.svc.defaultRules(); }

  @Put('settings')
  save(@Req() req: any, @Body() body: any, @Query('companyId') c?: string) {
    return this.svc.saveSettings(this.admin(req, c), body || {}, req?.user?.username || null);
  }

  @Post('post-pending')
  postPending(@Req() req: any, @Query('companyId') c?: string) { return this.svc.postPending(this.admin(req, c)); }
}
