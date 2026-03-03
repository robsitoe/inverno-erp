import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

export enum PayrollStatus {
    DRAFT = 'DRAFT',
    POSTED = 'POSTED',
    PAID = 'PAID',
    CANCELED = 'CANCELED',
}

@Entity('payroll_records')
@Unique(['companyId', 'employeeId', 'year', 'month'])
export class Payroll {
    @PrimaryColumn()
    id: string;

    @Column()
    companyId: string;

    @Column()
    employeeId: string;

    @Column()
    employeeName: string;

    @Column()
    employeeCode: string;

    @Column()
    year: number;

    @Column()
    month: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    grossSalary: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    inssEmployee: number; // 4%

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    inssEmployer: number; // 3%

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    irps: number; // Mozambican Income Tax (IRPS)

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    transportSubsidy: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    foodSubsidy: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    overtimeAmount: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    bonusAmount: number;

    @Column({ type: 'integer', default: 30 })
    daysWorked: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    netSalary: number;

    @Column({
        type: 'simple-enum',
        enum: ['DRAFT', 'POSTED', 'PAID', 'CANCELED'],
        default: 'DRAFT',
    })
    status: string;

    @Column({ nullable: true })
    journalEntryId: string;

    @Column({ type: 'date', nullable: true })
    paymentDate: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
