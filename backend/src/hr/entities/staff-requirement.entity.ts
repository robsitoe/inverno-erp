import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('hr_staff_requirements')
export class StaffRequirement {
  @PrimaryColumn()
  id: string;

  @Column()
  companyId: string;

  @Column()
  label: string; // e.g. "Frota Gás - Distribuição"

  @Column()
  department: string; // matches Employee.department

  /**
   * Requirement details in JSON:
   * [ { position: 'Motorista', minCount: 4 }, { position: 'Ajudante', minCount: 8 } ]
   */
  @Column({ type: 'simple-json' })
  requirements: Array<{ position: string; minCount: number }>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
