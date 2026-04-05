import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  EntityTarget,
  ObjectLiteral,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { SalesCampaign } from './entities/sales-campaign.entity';
import {
  SalesCampaignItem,
  CampaignTargetType,
} from './entities/sales-campaign-item.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { WorkflowStatus } from '../common/enums/workflow-status.enum';

@Injectable()
export class CampaignService {
  constructor(
    private readonly tenancyService: TenancyService,
    @InjectRepository(SalesCampaign)
    private readonly defaultCampaignRepo: Repository<SalesCampaign>,
    @InjectRepository(SalesCampaignItem)
    private readonly defaultItemRepo: Repository<SalesCampaignItem>,
  ) {}

  private async getRepo<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    defaultRepo: Repository<T>,
    companyId?: string,
  ): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return defaultRepo;
    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  private async getCampaignRepo(companyId?: string) {
    return this.getRepo(SalesCampaign, this.defaultCampaignRepo, companyId);
  }
  private async getItemRepo(companyId?: string) {
    return this.getRepo(SalesCampaignItem, this.defaultItemRepo, companyId);
  }

  async findAll(companyId?: string) {
    const repo = await this.getCampaignRepo(companyId);
    return repo.find({ relations: ['items'], order: { priority: 'DESC' } });
  }

  async findOne(id: string, companyId?: string) {
    const repo = await this.getCampaignRepo(companyId);
    const campaign = await repo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!campaign) throw new NotFoundException(`Campanha ${id} não encontrada`);
    return campaign;
  }

  async create(dto: CreateCampaignDto, companyId?: string) {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getCampaignRepo(cid);

    const campaign = repo.create({
      ...dto,
      companyId: cid,
    });

    return repo.save(campaign);
  }

  async update(
    id: string,
    dto: Partial<CreateCampaignDto>,
    companyId?: string,
  ) {
    const repo = await this.getCampaignRepo(companyId);
    const campaign = await this.findOne(id, companyId);

    repo.merge(campaign, dto);
    return repo.save(campaign);
  }

  async remove(id: string, companyId?: string) {
    const repo = await this.getCampaignRepo(companyId);
    const campaign = await this.findOne(id, companyId);
    return repo.remove(campaign);
  }

  /**
   * Calculates the best discount for a given article and quantity based on active campaigns.
   */
  async getBestDiscount(
    articleId: string,
    familyId: string,
    companyId?: string,
  ): Promise<{ discount: number; campaignId?: string; name?: string }> {
    const cid = companyId || TenancyContext.getCompanyId();
    const repo = await this.getCampaignRepo(cid);
    const today = new Date().toISOString().split('T')[0];

    // Find all active and approved campaigns for today
    const activeCampaigns = await repo.find({
      where: {
        isActive: true,
        status: WorkflowStatus.APPROVED,
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      relations: ['items'],
      order: { priority: 'DESC' },
    });

    let bestDiscount = 0;
    let selectedCampaign: SalesCampaign | null = null;

    for (const campaign of activeCampaigns) {
      let applies = false;

      // Check if any item in the campaign targets this article or its family
      if (campaign.items && campaign.items.length > 0) {
        applies = campaign.items.some((item) => {
          if (item.targetType === CampaignTargetType.ALL) return true;
          if (
            item.targetType === CampaignTargetType.ARTICLE &&
            item.targetId === articleId
          )
            return true;
          if (
            item.targetType === CampaignTargetType.FAMILY &&
            item.targetId === familyId
          )
            return true;
          return false;
        });
      } else {
        // If no items are specified, maybe it's a global campaign?
        // Depends on business rule. Let's assume items mandatory for targeting.
        applies = false;
      }

      if (applies) {
        const currentDiscount = Number(campaign.discountPercentage || 0);
        if (currentDiscount > bestDiscount) {
          bestDiscount = currentDiscount;
          selectedCampaign = campaign;
        }
      }
    }

    return {
      discount: bestDiscount,
      campaignId: selectedCampaign?.id,
      name: selectedCampaign?.name,
    };
  }
}
