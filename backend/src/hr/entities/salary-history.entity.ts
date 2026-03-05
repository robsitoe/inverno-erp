import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('employee_salary_history')
export class EmployeeSalaryHistory {
    @PrimaryColumn()
    id: string;

    @Column()
    employeeId: string;

    @Column({ nullable: true })
    companyId: string;

    @Column({ type: 'date' })
    changeDate: string;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    oldSalary: number;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    newSalary: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    oldTransport: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    newTransport: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    oldFood: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    newFood: number;

    @Column({ type: 'int', default: 0 })
    oldDependents: number;

    @Column({ type: 'int', default: 0 })
    newDependents: number;

    @Column({ nullable: true })
    reason: string;

    @Column({ nullable: true })
    updatedBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employeeId' })
    employee: Employee;
}
