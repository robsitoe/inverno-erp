import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyContext } from '../tenancy/tenancy.context';
import { PrintTemplatesService } from './print-templates.service';

/** Modelos de impressão: edição só por administradores; impressão e verificação por qualquer utilizador da empresa. */
@Controller('print-templates')
@UseGuards(JwtAuthGuard)
export class PrintTemplatesController {
  constructor(private readonly svc: PrintTemplatesService) { }

  private company(companyId?: string): string {
    const id = companyId || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return id;
  }

  private admin(req: any, companyId?: string): string {
    const u = req?.user || {};
    if (!(u.isAdmin || u.isSuperAdmin || u.isTechnical)) throw new ForbiddenException('Apenas administradores podem editar modelos de impressão.');
    return this.company(companyId);
  }

  private user(req: any): string | null { return req?.user?.username || null; }

  @Get('fields')
  fields(@Query('module') m: string) { return this.svc.fields(m || 'SALES'); }

  @Get('starter')
  starter(@Query('module') m: string) { return this.svc.starter(m || 'SALES'); }

  @Get()
  list(@Req() req: any, @Query('companyId') c?: string) { return this.svc.list(this.admin(req, c)); }

  @Get('logs')
  logs(@Req() req: any, @Query('companyId') c?: string) { return this.svc.logs(this.admin(req, c)); }

  @Get('verify')
  verify(@Query('numero') numero: string, @Query('codigo') codigo: string, @Query('companyId') c?: string) {
    return this.svc.verify(this.company(c), numero, codigo);
  }

  @Get('for/:module/:docType')
  async forDocType(@Param('module') module: string, @Param('docType') docType: string, @Query('companyId') c?: string) {
    const t = await this.svc.forDocType(this.company(c), module, docType);
    return t ? { id: t.id, name: t.name, version: t.version } : null;
  }

  @Post('validate')
  validate(@Req() req: any, @Body() body: any, @Query('companyId') c?: string) {
    this.admin(req, c);
    return this.svc.validate(body?.html, body?.css, body?.module || 'SALES');
  }

  @Post('preview')
  preview(@Req() req: any, @Body() body: any, @Query('companyId') c?: string) {
    return this.svc.preview(this.admin(req, c), body || {});
  }

  @Post('render')
  render(@Req() req: any, @Body() body: any, @Query('companyId') c?: string) {
    if (!body?.documentId) throw new BadRequestException('documentId é obrigatório.');
    return this.svc.renderDocument(this.company(c), body.module || 'SALES', String(body.documentId), String(body.copia || ''), this.user(req));
  }

  @Post()
  save(@Req() req: any, @Body() body: any, @Query('companyId') c?: string) {
    return this.svc.save(this.admin(req, c), body || {}, this.user(req));
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string, @Query('companyId') c?: string) { return this.svc.get(this.admin(req, c), id); }

  @Get(':id/versions')
  versions(@Req() req: any, @Param('id') id: string, @Query('companyId') c?: string) { return this.svc.versions(this.admin(req, c), id); }

  @Post(':id/restore/:version')
  restore(@Req() req: any, @Param('id') id: string, @Param('version', ParseIntPipe) v: number, @Query('companyId') c?: string) {
    return this.svc.restore(this.admin(req, c), id, v, this.user(req));
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string, @Query('companyId') c?: string) { return this.svc.remove(this.admin(req, c), id); }
}
