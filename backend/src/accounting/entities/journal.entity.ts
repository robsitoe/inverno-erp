import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('journals')
export class Journal {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column()
    code: string; // e.g., 'GEN', 'SAL', 'PUR'

    @Column()
    name: string;

    @Column({
        type: 'simple-enum',
        enum: ['SALES', 'PURCHASES', 'CASH', 'BANK', 'GENERAL', 'OPERATIONS'],
        default: 'GENERAL'
    })
    type: string;

    @Column({ default: true })
    isActive: boolean;
}
