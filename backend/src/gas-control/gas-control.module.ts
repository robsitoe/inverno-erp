import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GasCylinderType, GasDailyControl, GasDailyEntry } from './gas-control.entity';
import { GasControlService } from './gas-control.service';
import { GasControlController } from './gas-control.controller';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([GasCylinderType, GasDailyControl, GasDailyEntry]),
        TenancyModule,
    ],
    controllers: [GasControlController],
    providers: [GasControlService],
    exports: [GasControlService],
})
export class GasControlModule { }
