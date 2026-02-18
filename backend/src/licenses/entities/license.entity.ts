import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum LicensePlan {
    DEMO = 'DEMO',
    LITE = 'LITE',
    STANDARD = 'STANDARD',
    PRO = 'PRO',
    ENTERPRISE = 'ENTERPRISE',
}

export enum LicenseStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    REVOKED = 'REVOKED',
    GRACE = 'GRACE', // Within grace period after expiration
}

@Entity('licenses')
export class License {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ unique: true })
    companyId: string;

    @Column()
    companyName: string;

    @Column({ type: 'enum', enum: LicensePlan, default: LicensePlan.DEMO })
    plan: LicensePlan;

    @Column({ type: 'enum', enum: LicenseStatus, default: LicenseStatus.ACTIVE })
    status: LicenseStatus;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({ nullable: true })
    activatedBy?: string; // userId who activated

    @Column({ nullable: true })
    activatedIp?: string;

    @Column({ type: 'jsonb', nullable: true })
    features?: string[]; // e.g. ['ACCOUNTING', 'INVENTORY', 'TREASURY']

    @Column({ nullable: true })
    maxUsers?: number;

    @Column({ nullable: true })
    maxCompanies?: number;

    @Column({ default: false })
    isRevoked: boolean;

    @Column({ nullable: true })
    revokedAt?: Date;

    @Column({ nullable: true })
    revokedBy?: string;

    @Column({ nullable: true })
    revokedReason?: string;

    // Grace period: 72h after expiration before hard block
    @Column({ default: 72 })
    gracePeriodHours: number;

    // The signed JWT token stored for reference
    @Column({ type: 'text', nullable: true })
    licenseToken?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
