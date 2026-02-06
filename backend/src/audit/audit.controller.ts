import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import type { Request } from 'express';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query() filters: AuditQueryDto, @Req() req: Request) {
    const companyId = (req.headers['x-company-id'] as string) || (req.query.companyId as string | undefined);
    return this.auditService.findAll(filters, companyId);
  }
}
