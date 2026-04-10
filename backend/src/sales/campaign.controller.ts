import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Controller('sales/campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.campaignService.findAll(companyId);
  }

  @Get('best-discount')
  getBestDiscount(
    @Query('articleId') articleId: string,
    @Query('familyId') familyId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.campaignService.getBestDiscount(articleId, familyId, companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.campaignService.findOne(id, companyId);
  }

  @Post()
  create(
    @Body() createCampaignDto: CreateCampaignDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.campaignService.create(createCampaignDto, companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCampaignDto: Partial<CreateCampaignDto>,
    @Query('companyId') companyId?: string,
  ) {
    return this.campaignService.update(id, updateCampaignDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.campaignService.remove(id, companyId);
  }
}
