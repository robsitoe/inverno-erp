import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vehicle_trips')
export class VehicleTrip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  companyId: string;

  @Column()
  vehicleId: string;

  @Column()
  driverId: string; // Employee ID

  @CreateDateColumn()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lastLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lastLng: number;

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

  @Column({ nullable: true })
  initialLoadId: string; // Reference to a StockDocument

  @Column({ nullable: true })
  finalUnloadId: string; // Reference to a StockDocument

  @UpdateDateColumn()
  updatedAt: Date;
}
