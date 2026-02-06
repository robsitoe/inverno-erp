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
import { TreasuryService } from './treasury.service';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('treasury')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Post('documents')
  @Roles('treasury:create')
  create(@Body() createTreasuryDto: CreateTreasuryDto) {
    return this.treasuryService.create(createTreasuryDto);
  }

  @Get('documents')
  findAll(@Query('companyId') companyId?: string) {
    return this.treasuryService.findAll(companyId);
  }

  @Get('documents/:id')
  findOne(@Param('id') id: string) {
    return this.treasuryService.findOne(id);
  }

  @Patch('documents/:id')
  @Roles('treasury:update')
  update(
    @Param('id') id: string,
    @Body() updateTreasuryDto: UpdateTreasuryDto,
  ) {
    return this.treasuryService.update(id, updateTreasuryDto);
  }

  @Delete('documents/:id')
  @Roles('treasury:delete')
  remove(@Param('id') id: string) {
    return this.treasuryService.remove(id);
  }

  @Get('receipts')
  findAllReceipts(@Query('companyId') companyId?: string) {
    return this.treasuryService.findAllReceipts(companyId);
  }

  @Post('receipts')
  @Roles('treasury:create')
  createReceipt(@Body() data: any) {
    return this.treasuryService.createReceipt(data);
  }

  @Get('payments')
  findAllPayments(@Query('companyId') companyId?: string) {
    return this.treasuryService.findAllPayments(companyId);
  }

  @Post('payments')
  @Roles('treasury:create')
  createPayment(@Body() data: any) {
    return this.treasuryService.createPayment(data);
  }
}
