import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('period_audit_logs')
export class PeriodAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  fiscalYearId: string;

  @Column()
  action: string; // CLOSE | REOPEN

  @Column({ nullable: true })
  performedByUserId?: string;

  @Column({ nullable: true })
  performedByUsername?: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
