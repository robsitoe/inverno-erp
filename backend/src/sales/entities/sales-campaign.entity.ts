import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkflowStatus } from '../../common/enums/workflow-status.enum';
import { SalesCampaignItem } from './sales-campaign-item.entity';

export enum SalesCampaignType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_PRICE = 'FIXED_PRICE',
  VOLUME_DISCOUNT = 'VOLUME_DISCOUNT',
}

@Entity('sales_campaigns')
export class SalesCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, type: 'varchar' })
  companyId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({
    type: 'varchar',
    default: SalesCampaignType.PERCENTAGE,
  })
  type: SalesCampaignType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  fixedPrice: number;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @OneToMany('SalesCampaignItem', (item: any) => item.campaign, {
    cascade: true,
  })
  items: SalesCampaignItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
