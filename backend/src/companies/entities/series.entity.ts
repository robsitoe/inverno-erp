import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('series')
export class Series {
    @PrimaryColumn()
    id: string;

    @Column()
    companyId: string;

    @Column()
    code: string;

    @Column()
    description: string;

    @Column({ type: 'date' })
    startDate: string;

    @Column({ type: 'date' })
    endDate: string;

    @Column({ default: true })
    active: boolean;

    @Column({ nullable: true })
    module: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
