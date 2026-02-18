import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { PaymentMethod } from './entities/payment-method.entity';
import { LicenseGuard } from '../auth/guards/license.guard';

@Controller('payment-methods')
@UseGuards(LicenseGuard)
export class PaymentMethodsController {
    constructor(private readonly treasuryService: TreasuryService) { }

    @Post()
    create(@Body() data: Partial<PaymentMethod>) {
        return this.treasuryService.savePaymentMethod(data);
    }

    @Get()
    findAll(@Query('companyId') companyId?: string) {
        return this.treasuryService.findAllPaymentMethods(companyId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.treasuryService.removePaymentMethod(id);
    }
}
