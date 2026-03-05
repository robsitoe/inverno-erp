import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { Payroll } from './entities/payroll.entity';
import { Absence } from './entities/absence.entity';
import { EmployeeSalaryHistory } from './entities/salary-history.entity';
import { TaxBracket, HRSettings } from './entities/hr-settings.entity';
import { PettyCashVoucher } from '../treasury/entities/petty-cash-voucher.entity';
import { HRService } from './services/hr.service';
import { HRController } from './controllers/hr.controller';
import { PayrollService } from './services/payroll.service';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Payroll, Absence, TaxBracket, HRSettings, PettyCashVoucher, EmployeeSalaryHistory]),
    TenancyModule,
    AccountingModule,
  ],
  controllers: [HRController],
  providers: [HRService, PayrollService],
  exports: [HRService],
})
export class HRModule { }
