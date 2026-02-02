import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_methods')
export class PaymentMethod {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true, type: 'varchar' })
    companyId: string;

    @Column()
    code: string;

    @Column()
    description: string;

    @Column({ nullable: true })
    category: string; // CASH, BANK, MOBILE

    @Column({ nullable: true })
    treasuryAccountId: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
