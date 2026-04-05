import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';

@Entity('vehicles')
@Unique(['companyId', 'plate'])
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  companyId: string;

  @Column()
  plate: string;

  @Column()
  brand: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  type: string; // e.g., 'Truck', 'Van'

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  capacity: number;

  @Column({ nullable: true })
  capacityUnit: string; // e.g., 'Kg', 'Units'

  @Column({ default: 'AVAILABLE' })
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE';

  @Column({ nullable: true })
  warehouseId: string;

  @OneToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
