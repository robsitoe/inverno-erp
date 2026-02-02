import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenancyService } from './tenancy.service';
import { Company } from '../companies/entities/company.entity';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Company])],
    providers: [TenancyService],
    exports: [TenancyService],
})
export class TenancyModule { }
