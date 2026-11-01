import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UpdateController } from './update.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SystemController } from './system.controller';
import { SystemEventsService } from './system-events.service';
import { AuditInterceptor } from './audit.interceptor';
import { CompanyAccessInterceptor } from './company-access.interceptor';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';

@Module({
    imports: [HttpModule],
    controllers: [UpdateController, SystemController, MaintenanceController],
    providers: [SystemEventsService, MaintenanceService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }, { provide: APP_INTERCEPTOR, useClass: CompanyAccessInterceptor }],
    exports: [SystemEventsService],
})
export class AdminModule { }
