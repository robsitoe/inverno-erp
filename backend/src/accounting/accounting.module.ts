import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { AccountingToolsController } from './accounting-tools.controller';
import { AccountingToolsService } from './accounting-tools.service';
import { Account } from './entities/account.entity';
import { JournalEntry, JournalLine } from './entities/journal-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, JournalEntry, JournalLine])],
  controllers: [AccountingToolsController, AccountingController],
  providers: [AccountingService, AccountingToolsService],
  exports: [AccountingService],
})
export class AccountingModule { }
