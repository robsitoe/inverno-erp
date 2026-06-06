import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * One GPS breadcrumb reported by a truck phone. The full trail of these rows
 * forms the historical route, kept permanently for analysis & investigations.
 */
@Entity('route_points')
@Index(['companyId', 'truckPlate', 'timestamp'])
export class RoutePoint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ nullable: true, type: 'varchar' })
    companyId: string;

    @Index()
    @Column()
    truckPlate: string;

    @Column({ nullable: true })
    driverId?: string;

    @Column({ nullable: true })
    tripId?: string;

    @Column({ type: 'decimal', precision: 14, scale: 8 })
    lat: number;

    @Column({ type: 'decimal', precision: 14, scale: 8 })
    lng: number;

    /** Optional speed (km/h) and accuracy (m) if the device provides them */
    @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
    speed?: number;

    @CreateDateColumn()
    timestamp: Date;
}
