import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

export enum AccountType {
    ASSET = 'ASSET',
    LIABILITY = 'LIABILITY',
    EQUITY = 'EQUITY',
    REVENUE = 'REVENUE',
    EXPENSE = 'EXPENSE',
}

@Entity('accounts')
@Unique(['companyId', 'code'])
export class Account {

    @PrimaryColumn()
    id: string;

    @Column({ nullable: true, type: 'varchar' })
    companyId: string | null;

    @Column()
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
