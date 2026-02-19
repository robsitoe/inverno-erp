import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { License } from './license.entity';

@Entity('license_renewals')
export class LicenseRenewal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column()
    companyId: string;

    @Index()
    @Column()
    licenseId: string;

    @ManyToOne(() => License, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'licenseId' })
    license: License;

    @Column({ type: 'timestamp' })
    paidAt: Date;

    @Column({ type: 'int' })
    durationDays: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    amount?: number;

    @Column({ type: 'timestamp', nullable: true })
    previousExpiresAt?: Date;

    @Column({ type: 'timestamp' })
    newExpiresAt: Date;

    @Column()
    issuedBy: string;

    @CreateDateColumn()
    createdAt: Date;
}
