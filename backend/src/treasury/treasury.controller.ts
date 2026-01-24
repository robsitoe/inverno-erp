import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';

@Controller('treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) { }

  @Post('documents')
  create(@Body() createTreasuryDto: CreateTreasuryDto) {
    return this.treasuryService.create(createTreasuryDto);
  }

  @Get('documents')
  findAll() {
    return this.treasuryService.findAll();
  }

  @Get('documents/:id')
  findOne(@Param('id') id: string) {
    return this.treasuryService.findOne(id);
  }

  @Patch('documents/:id')
  update(@Param('id') id: string, @Body() updateTreasuryDto: UpdateTreasuryDto) {
    return this.treasuryService.update(id, updateTreasuryDto);
  }

  @Delete('documents/:id')
  remove(@Param('id') id: string) {
    return this.treasuryService.remove(id);
  }

  @Get('receipts')
  findAllReceipts() {
    return this.treasuryService.findAllReceipts();
  }

  @Post('receipts')
  createReceipt(@Body() data: any) {
    return this.treasuryService.createReceipt(data);
  }

  @Get('payments')
  findAllPayments() {
    return this.treasuryService.findAllPayments();
  }

  @Post('payments')
  createPayment(@Body() data: any) {
    return this.treasuryService.createPayment(data);
  }
}
