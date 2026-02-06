import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) { }

  @Post('documents')
  create(@Body() createPurchaseDto: CreatePurchaseDto) {
    return this.purchasesService.create(createPurchaseDto);
  }

  @Get('documents')
  findAll(@Query('companyId') companyId?: string) {
    return this.purchasesService.findAll(companyId);
  }

  @Get('documents/find')
  findByNumber(
    @Query('companyId') companyId: string,
    @Query('type') type: string,
    @Query('series') series: string,
    @Query('number') number: number,
  ) {
    return this.purchasesService.findByNumber(companyId, type, series, Number(number));
  }

  @Get('documents/:id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Patch('documents/:id')
  update(@Param('id') id: string, @Body() updatePurchaseDto: UpdatePurchaseDto) {
    return this.purchasesService.update(id, updatePurchaseDto);
  }

  @Delete('documents/:id')
  remove(@Param('id') id: string) {
    return this.purchasesService.remove(id);
  }

  @Patch('documents/:id/workflow')
  processWorkflow(
    @Param('id') id: string,
    @Body() data: { action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', notes?: string },
    @Req() req: any
  ) {
    return this.purchasesService.processWorkflow(id, data.action, req.user, data.notes);
  }

  @Get('documents/:id/history')
  getHistory(@Param('id') id: string) {
    return this.purchasesService.getWorkflowHistory(id);
  }
}
