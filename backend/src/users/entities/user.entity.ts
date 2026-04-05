import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum UserRole {
    ADMIN = 'ADMIN',
    USER = 'USER',
}

@Entity('users')
export class User {
    @PrimaryColumn()
    id: string;

    @Column({ unique: true })
    username: string;

    @Column()
    password: string;

    @Column({ nullable: true })
    name?: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ default: false })
    isAdmin: boolean;

    @Column({ default: false })
    isSuperAdmin: boolean;

    @Column({ default: false })
    isTechnical: boolean;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    profile?: string;

    @Column({ default: 'pt' })
    language: string;

    @Column({ type: 'jsonb', nullable: true })
    permissions?: any[];

    @Column({ nullable: true })
    companyId?: string;

    @Column({ nullable: true })
    status?: string;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company?: Company;

    @Column({ nullable: true })
    customerId?: string;

    @Column({ nullable: true })
    employeeId?: string;

    @Column({ nullable: true })
    userType?: string; // 'STAFF', 'MOBILE'

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
