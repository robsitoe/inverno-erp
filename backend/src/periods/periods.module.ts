import { Global, Module } from '@nestjs/common';
import { PeriodControlService } from './period-control.service';

@Global()
@Module({
  providers: [PeriodControlService],
  exports: [PeriodControlService],
})
export class PeriodsModule {}
