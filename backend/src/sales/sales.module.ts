import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalesDocument, SalesDocumentLine])],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule { }
