import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { License } from './entities/license.entity';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { LicenseGuard } from '../auth/guards/license.guard';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([License]),
        ConfigModule,
        // Use JwtModule without a fixed secret — service will pass secret per-call
        JwtModule.register({}),
    ],
    controllers: [LicensesController],
    providers: [LicensesService, LicenseGuard],
    exports: [LicensesService, LicenseGuard],
})
export class LicensesModule { }
