import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { License } from './entities/license.entity';
import { LicenseRenewal } from './entities/license-renewal.entity';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { LicenseGuard } from '../auth/guards/license.guard';
import { PhoneHomeService } from './phone-home.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([License, LicenseRenewal]),
        ConfigModule,
        HttpModule,
        ScheduleModule.forRoot(),
        JwtModule.register({}),
    ],
    controllers: [LicensesController],
    providers: [LicensesService, LicenseGuard, PhoneHomeService],
    exports: [LicensesService, LicenseGuard, PhoneHomeService],
})
export class LicensesModule { }
