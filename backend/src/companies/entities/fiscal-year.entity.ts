import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('fiscal_years')
export class FiscalYear {
    @PrimaryColumn()
    id: string;

    @Column()
    year: number;

    @Column({ default: false })
    isCurrent: boolean;

    @Column({ default: 'OPEN' })
    status: string; // OPEN, CLOSED

    @Column({ nullable: true })
    startDate: string;

    @Column({ nullable: true })
    endDate: string;

    @Column()
    companyId: string;

    @ManyToOne(() => Company, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'companyId' })
    company: Company;
}
