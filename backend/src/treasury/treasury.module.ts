import { AccountingModule } from '../accounting/accounting.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { PaymentMethodsController } from './payment-methods.controller';
import { CurrentAccountsController } from './current-accounts.controller';
import { CurrentAccountsService } from './current-accounts.service';
import { TreasuryRegistryController } from './treasury-registry.controller';
import { TreasuryRegistryService } from './treasury-registry.service';
import { TreasuryDocument, TreasuryDocumentLine } from './entities/treasury.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PettyCashVoucher } from './entities/petty-cash-voucher.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TreasuryDocument, TreasuryDocumentLine, PaymentMethod, PettyCashVoucher]), AccountingModule],
  controllers: [TreasuryRegistryController, TreasuryController, PaymentMethodsController, CurrentAccountsController],
  providers: [TreasuryService, CurrentAccountsService, TreasuryRegistryService],
})
export class TreasuryModule { }
