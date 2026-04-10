import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('truck_inventories')
export class TruckInventory {
  @PrimaryColumn()
  id: string; // e.g., "TRUCK-PLATE-COMPANYID"

  @Column()
  companyId: string;

  @Column()
  truckPlate: string;

  @Column({ nullable: true })
  driverId: string;

  @Column({ type: 'simple-json', nullable: true })
  inventory: any; // { "9KG": { full: 10, empty: 5, damaged: 0 }, ... }

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lastLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lastLng: number;

  @Column({ nullable: true })
  lastUpdate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
