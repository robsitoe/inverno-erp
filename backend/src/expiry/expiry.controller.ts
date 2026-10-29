import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyContext } from '../tenancy/tenancy.context';
import { ExpiryService } from './expiry.service';

/** Controlo de validades e prazos. */
@Controller('expiry-control')
@UseGuards(JwtAuthGuard)
export class ExpiryController {
  constructor(private readonly svc: ExpiryService) { }

  private company(c?: string): string {
    const id = c || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return id;
  }
  private user(req: any) { return req?.user?.username || null; }

  @Get('categories') categories() { return this.svc.categories(); }
  @Get('summary') summary(@Query('companyId') c?: string) { return this.svc.summary(this.company(c)); }
  @Get() list(@Query() q: any) { return this.svc.list(this.company(q?.companyId), q || {}); }
  @Get(':id') get(@Param('id') id: string, @Query('companyId') c?: string) { return this.svc.get(this.company(c), id); }
  @Post() save(@Req() req: any, @Body() b: any, @Query('companyId') c?: string) { return this.svc.save(this.company(c), b || {}, this.user(req)); }
  @Post(':id/renew') renew(@Req() req: any, @Param('id') id: string, @Body() b: any, @Query('companyId') c?: string) { return this.svc.renew(this.company(c), id, b || {}, this.user(req)); }
  @Post(':id/retire') retire(@Req() req: any, @Param('id') id: string, @Body() b: any, @Query('companyId') c?: string) { return this.svc.retire(this.company(c), id, b?.reason, this.user(req)); }
}
