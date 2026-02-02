import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('suppliers')
@Unique(['companyId', 'code'])
export class Supplier {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true, type: 'varchar' })
    companyId: string | null;

    @Column()
    code: string;


    @Column()
    name: string;

    @Column({ nullable: true })
    nif: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    postalCode: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ default: 30 })
    paymentTerms: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    creditLimit: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    currentBalance: number;

    @Column({ nullable: true })
    payableAccountId: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
