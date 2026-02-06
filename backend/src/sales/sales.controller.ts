import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sales')
@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) { }

  @Post('documents')
  @ApiOperation({ summary: 'Create a new sales document' })
  @ApiResponse({ status: 201, description: 'The sales document has been successfully created.' })
  create(@Body() createSalesDocumentDto: CreateSalesDocumentDto) {
    return this.salesService.create(createSalesDocumentDto);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Get all sales documents' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('documentType') documentType?: string,
    @Query('series') series?: string,
  ) {
    // If we have specific filters, they can be handled in a more refined findAll or specific search
    return this.salesService.findAll(companyId);
  }

  @Get('documents/find')
  @ApiOperation({ summary: 'Find a sales document by number' })
  findByNumber(
    @Query('companyId') companyId: string,
    @Query('type') type: string,
    @Query('series') series: string,
    @Query('number') number: number,
  ) {
    return this.salesService.findByNumber(companyId, type, series, Number(number));
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get a sales document by ID' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch('documents/:id')
  @ApiOperation({ summary: 'Update a sales document' })
  update(@Param('id') id: string, @Body() updateSalesDocumentDto: UpdateSalesDocumentDto) {
    return this.salesService.update(id, updateSalesDocumentDto);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a sales document' })
  remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }

  @Patch('documents/:id/workflow')
  @ApiOperation({ summary: 'Process document workflow transition' })
  processWorkflow(
    @Param('id') id: string,
    @Body() data: { action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', notes?: string },
    @Req() req: any
  ) {
    return this.salesService.processWorkflow(id, data.action, req.user, data.notes);
  }

  @Get('documents/:id/history')
  @ApiOperation({ summary: 'Get document workflow history' })
  getHistory(@Param('id') id: string) {
    return this.salesService.getWorkflowHistory(id);
  }
}
