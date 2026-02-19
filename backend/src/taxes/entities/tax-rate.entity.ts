import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('tax_rates')
@Unique(['companyId', 'code'])
export class TaxRate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column()
    code: string;

    @Column()
    description: string;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    rate: number;

    @Column({
        type: 'simple-enum',
        enum: ['IVA', 'IS', 'IRPC', 'IRPS', 'OTHER'],
        default: 'IVA'
    })
    type: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
