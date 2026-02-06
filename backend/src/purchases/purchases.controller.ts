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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('purchases')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('documents')
  @Roles('purchases:create')
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
    return this.purchasesService.findByNumber(
      companyId,
      type,
      series,
      Number(number),
    );
  }

  @Get('documents/:id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Patch('documents/:id')
  @Roles('purchases:update')
  update(
    @Param('id') id: string,
    @Body() updatePurchaseDto: UpdatePurchaseDto,
  ) {
    return this.purchasesService.update(id, updatePurchaseDto);
  }

  @Delete('documents/:id')
  @Roles('purchases:delete')
  remove(@Param('id') id: string) {
    return this.purchasesService.remove(id);
  }
}
