import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { TreasuryDocument, TreasuryDocumentLine } from './entities/treasury.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TreasuryDocument, TreasuryDocumentLine])],
  controllers: [TreasuryController],
  providers: [TreasuryService],
})
export class TreasuryModule { }
