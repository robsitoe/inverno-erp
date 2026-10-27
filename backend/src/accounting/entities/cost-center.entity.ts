import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cost_centers')
export class CostCenter {
  @PrimaryColumn()
  id: string;

  @Column()
  companyId: string;

  @Column({ unique: false })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'OPERATIONAL' })
  type: string; // OPERATIONAL | INVESTMENT | ADMINISTRATIVE | COMMERCIAL

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
