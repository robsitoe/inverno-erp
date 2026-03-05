import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { PaymentMethodsController } from './payment-methods.controller';
import { TreasuryDocument, TreasuryDocumentLine } from './entities/treasury.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PettyCashVoucher } from './entities/petty-cash-voucher.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TreasuryDocument, TreasuryDocumentLine, PaymentMethod, PettyCashVoucher])],
  controllers: [TreasuryController, PaymentMethodsController],
  providers: [TreasuryService],
})
export class TreasuryModule { }
