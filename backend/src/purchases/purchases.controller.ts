import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LicenseGuard } from '../auth/guards/license.guard';

@Controller('purchases')
@UseGuards(JwtAuthGuard, LicenseGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) { }

  @Post('documents')
  create(@Body() createPurchaseDto: CreatePurchaseDto, @Req() req: any) {
    return this.purchasesService.create(createPurchaseDto, req.user);
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
    if (!type || !series || !Number.isInteger(Number(number))) throw new BadRequestException('Indique o tipo, a série e o número do documento.');
    return this.purchasesService.findByNumber(companyId, type, series, Number(number));
  }

  @Get('documents/:id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Patch('documents/:id')
  update(@Param('id') id: string, @Body() updatePurchaseDto: UpdatePurchaseDto, @Req() req: any) {
    return this.purchasesService.update(id, updatePurchaseDto, req.user);
  }

  @Delete('documents/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.purchasesService.remove(id, req.user);
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
