import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  username?: string;

  @Column()
  module: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  entity?: string;

  @Column({ nullable: true })
  entityId?: string;

  @Column({ type: 'jsonb', nullable: true })
  before?: unknown;

  @Column({ type: 'jsonb', nullable: true })
  after?: unknown;

  @Column({ nullable: true })
  companyId?: string;

  @CreateDateColumn()
  timestamp: Date;
}
