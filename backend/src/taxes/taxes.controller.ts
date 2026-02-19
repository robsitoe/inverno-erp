import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaxesService } from './taxes.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { LicenseGuard } from '../auth/guards/license.guard';

@ApiTags('taxes')
@Controller('taxes')
@UseGuards(LicenseGuard)
export class TaxesController {
    constructor(private readonly taxesService: TaxesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new tax rate' })
    create(@Body() createDto: CreateTaxRateDto) {
        return this.taxesService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tax rates' })
    findAll(@Query('companyId') companyId?: string) {
        return this.taxesService.findAll(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a tax rate by ID' })
    findOne(@Param('id') id: string, @Query('companyId') companyId?: string) {
        return this.taxesService.findOne(id, companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a tax rate' })
    update(@Param('id') id: string, @Body() updateDto: UpdateTaxRateDto) {
        return this.taxesService.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a tax rate' })
    remove(@Param('id') id: string, @Query('companyId') companyId?: string) {
        return this.taxesService.remove(id, companyId);
    }

    @Post('seed')
    @ApiOperation({ summary: 'Seed default tax rates for a company' })
    seed(@Query('companyId') companyId: string) {
        return this.taxesService.seedDefaults(companyId);
    }
}
