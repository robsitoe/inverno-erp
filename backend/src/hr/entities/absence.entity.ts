import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';

export enum AbsenceType {
    VACATION = 'VACATION',
    SICKNESS = 'SICKNESS',
    JUSTIFIED = 'JUSTIFIED',
    UNJUSTIFIED = 'UNJUSTIFIED',
    MATERNITY = 'MATERNITY',
    OTHER = 'OTHER'
}

export enum AbsenceStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

@Entity('hr_absences')
export class Absence {
    @PrimaryColumn()
    id: string;

    @Column()
    companyId: string;

    @Column()
    employeeId: string;

    @ManyToOne(() => Employee)
    @JoinColumn({ name: 'employeeId' })
    employee: Employee;

    @Column({
        type: 'simple-enum',
        enum: AbsenceType,
        default: AbsenceType.VACATION,
    })
    type: AbsenceType;

    @Column({ type: 'date' })
    startDate: string;

    @Column({ type: 'date' })
    endDate: string;

    @Column({ type: 'int', default: 0 })
    days: number;

    @Column({ nullable: true })
    reason: string;

    @Column({
        type: 'simple-enum',
        enum: AbsenceStatus,
        default: AbsenceStatus.PENDING,
    })
    status: AbsenceStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
