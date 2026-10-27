import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { MaintenanceService } from './maintenance.service';

/** Planos de manutenção (cópias automáticas, integridade, limpeza). Apenas administradores. */
@Controller('admin/maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService, private readonly tenancy: TenancyService) { }

  private admin(req: any, companyId?: string): string {
    const u = req?.user || {};
    if (!(u.isAdmin || u.isSuperAdmin || u.isTechnical)) throw new ForbiddenException('Apenas administradores podem aceder a esta área.');
    const id = companyId || TenancyContext.getCompanyId();
    if (!id) throw new BadRequestException('Empresa não especificada.');
    return id;
  }

  @Get('plans')
  plans(@Req() req: any, @Query('companyId') c?: string) { return this.svc.listPlans(this.admin(req, c)); }

  @Post('plans/defaults')
  defaults(@Req() req: any, @Query('companyId') c?: string) { return this.svc.createDefaults(this.admin(req, c)); }

  @Put('plans')
  save(@Req() req: any, @Body() body: any, @Query('companyId') c?: string) {
    return this.svc.savePlan(this.admin(req, c), body || {}).catch(e => { throw new BadRequestException(e.message); });
  }

  @Delete('plans/:id')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Query('companyId') c?: string) {
    await this.svc.deletePlan(this.admin(req, c), id);
    return { ok: true };
  }

  @Post('plans/:id/run')
  run(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Query('companyId') c?: string) {
    return this.svc.runPlan(id, 'MANUAL', this.admin(req, c)).catch(e => { throw new BadRequestException(e.message); });
  }

  @Get('runs')
  runs(@Req() req: any, @Query('companyId') c?: string) { return this.svc.listRuns(this.admin(req, c)); }

  @Post('integrity/run')
  async integrity(@Req() req: any, @Query('companyId') c?: string) {
    const id = this.admin(req, c);
    return this.svc.checkIntegrity(await this.tenancy.getTenantDataSource(id));
  }

  @Post('integrity/repair-orphans')
  async repair(@Req() req: any, @Query('companyId') c?: string) {
    const id = this.admin(req, c);
    return this.svc.repairOrphans(await this.tenancy.getTenantDataSource(id), id, req.user?.username || null);
  }

  @Get('files')
  files(@Req() req: any, @Query('companyId') c?: string) { return this.svc.listBackupFiles(this.admin(req, c)); }

  @Get('files/download')
  async download(@Req() req: any, @Res() res: Response, @Query('name') name: string, @Query('companyId') c?: string) {
    const id = this.admin(req, c);
    try {
      const f = await this.svc.readBackupFile(id, name || '');
      res.download(f.path, f.filename);
    } catch { throw new BadRequestException('Ficheiro não encontrado.'); }
  }
}
