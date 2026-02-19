import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';
import { TaxRate } from './entities/tax-rate.entity';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TaxRate]),
        TenancyModule
    ],
    controllers: [TaxesController],
    providers: [TaxesService],
    exports: [TaxesService]
})
export class TaxesModule { }
