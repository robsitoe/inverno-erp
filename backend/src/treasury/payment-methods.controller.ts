import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { PaymentMethod } from './entities/payment-method.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payment-methods')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PaymentMethodsController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Post()
  @Roles('treasury:create')
  create(@Body() data: Partial<PaymentMethod>) {
    return this.treasuryService.savePaymentMethod(data);
  }

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.treasuryService.findAllPaymentMethods(companyId);
  }

  @Delete(':id')
  @Roles('treasury:delete')
  remove(@Param('id') id: string) {
    return this.treasuryService.removePaymentMethod(id);
  }
}
