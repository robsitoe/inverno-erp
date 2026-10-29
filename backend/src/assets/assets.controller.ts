import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyContext } from '../tenancy/tenancy.context';
import { AssetsService } from './assets.service';

/** Equipamentos e ativos fixos. Consulta para utilizadores da empresa; lançamentos e abates só por administradores. */
@Controller('fixed-assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly svc: AssetsService) { }

  private company(c?: string): string {
    const id = c || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return id;
  }
  private admin(req: any, c?: string): string {
    const u = req?.user || {};
    if (!(u.isAdmin || u.isSuperAdmin || u.isTechnical)) throw new ForbiddenException('Apenas administradores podem fazer lançamentos de ativos.');
    return this.company(c);
  }
  private user(req: any) { return req?.user?.username || null; }

  @Get('defaults') defaults() { return this.svc.defaults(); }
  @Get('report') report(@Query('companyId') c?: string) { return this.svc.report(this.company(c)); }
  @Get('events/:type') events(@Param('type') t: string, @Query('companyId') c?: string) { return this.svc.events(this.company(c), t); }
  @Get() list(@Query('companyId') c?: string) { return this.svc.list(this.company(c)); }
  @Get(':id') get(@Param('id') id: string, @Query('companyId') c?: string) { return this.svc.get(this.company(c), id); }

  @Post() save(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) { return this.svc.save(this.admin(req, c), b || {}, this.user(req)); }
  @Delete(':id') remove(@Req() req: any, @Param('id') id: string, @Query('companyId') c?: string) { return this.svc.remove(this.admin(req, c), id); }

  @Post('depreciation/run')
  depreciation(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) {
    return b?.post ? this.svc.runDepreciation(this.admin(req, c), b?.period, true, this.user(req))
      : this.svc.runDepreciation(this.company(c), b?.period, false, this.user(req));
  }

  @Post(':id/dispose') dispose(@Req() req: any, @Param('id') id: string, @Body() b: any, @Query('companyId') c?: string) { return this.svc.dispose(this.admin(req, c), id, b || {}, this.user(req)); }
  @Post(':id/revalue') revalue(@Req() req: any, @Param('id') id: string, @Body() b: any, @Query('companyId') c?: string) { return this.svc.revalue(this.admin(req, c), id, b || {}, this.user(req)); }
  @Post(':id/transfer') transfer(@Req() req: any, @Param('id') id: string, @Body() b: any, @Query('companyId') c?: string) { return this.svc.transfer(this.company(c), id, b || {}, this.user(req)); }
  @Post(':id/maintenance') maintenance(@Req() req: any, @Param('id') id: string, @Body() b: any, @Query('companyId') c?: string) { return this.svc.addMaintenance(this.company(c), id, b || {}, this.user(req)); }
  @Post(':id/insurance') insurance(@Req() req: any, @Param('id') id: string, @Body() b: any, @Query('companyId') c?: string) { return this.svc.addInsurance(this.company(c), id, b || {}, this.user(req)); }
}
