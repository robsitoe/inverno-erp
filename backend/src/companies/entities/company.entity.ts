import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('companies')
export class Company {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    nif: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    website: string;

    @Column({ nullable: true })
    currentYear: number;

    @Column({ nullable: true })
    type: string;

    @Column({ nullable: true })
    category: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    chartOfAccounts: string;

    @Column({ nullable: true })
    currency: string;

    @Column({ type: 'text', nullable: true })
    logoUrl: string;

    @Column({ type: 'json', nullable: true })
    seriesConfig: any;

    @Column({ nullable: true })
    documentNameFormat: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
