import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesCampaign } from './sales-campaign.entity';

export enum CampaignTargetType {
  ARTICLE = 'ARTICLE',
  FAMILY = 'FAMILY',
  CUSTOMER_GROUP = 'CUSTOMER_GROUP',
  ALL = 'ALL',
}

@Entity('sales_campaign_items')
export class SalesCampaignItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SalesCampaign, (campaign) => campaign.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: SalesCampaign;

  @Column()
  campaignId: string;

  @Column({
    type: 'varchar',
    default: CampaignTargetType.ARTICLE,
  })
  targetType: CampaignTargetType;

  @Column({ nullable: true })
  targetId: string; // Article ID, Family ID, or Group ID

  @Column({ nullable: true })
  targetCode: string; // For readability/caching
}
