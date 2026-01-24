import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AccountType {
    ASSET = 'ASSET',
    LIABILITY = 'LIABILITY',
    EQUITY = 'EQUITY',
    REVENUE = 'REVENUE',
    EXPENSE = 'EXPENSE',
}

@Entity('accounts')
export class Account {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({
        type: 'simple-enum',
        enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
    })
    type: string;

    @Column({ default: 1 })
    level: number;

    @Column({ nullable: true })
    parentId: string;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    balance: number;

    @Column({ default: true })
    allowPosting: boolean;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
