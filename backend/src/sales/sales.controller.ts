import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';

@ApiTags('sales')
@Controller('sales')
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
  findAll() {
    return this.salesService.findAll();
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
}
