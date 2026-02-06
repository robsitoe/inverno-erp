import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('sales')
@Controller('sales')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('documents')
  @Roles('sales:create')
  @ApiOperation({ summary: 'Create a new sales document' })
  @ApiResponse({
    status: 201,
    description: 'The sales document has been successfully created.',
  })
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
    return this.salesService.findByNumber(
      companyId,
      type,
      series,
      Number(number),
    );
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get a sales document by ID' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch('documents/:id')
  @Roles('sales:update')
  @ApiOperation({ summary: 'Update a sales document' })
  update(
    @Param('id') id: string,
    @Body() updateSalesDocumentDto: UpdateSalesDocumentDto,
  ) {
    return this.salesService.update(id, updateSalesDocumentDto);
  }

  @Delete('documents/:id')
  @Roles('sales:delete')
  @ApiOperation({ summary: 'Delete a sales document' })
  remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}
