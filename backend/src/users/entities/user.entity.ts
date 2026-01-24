import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
    name: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ default: false })
    isAdmin: boolean;

    @Column({ default: false })
    isSuperAdmin: boolean;

    @Column({ default: false })
    isTechnical: boolean;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    profile: string;

    @Column({ default: 'pt' })
    language: string;

    @Column({ type: 'jsonb', nullable: true })
    permissions: any[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
