import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

export enum ContractType {
    FULL_TIME = 'FULL_TIME',
    PART_TIME = 'PART_TIME',
    CONTRACTOR = 'CONTRACTOR',
    INTERN = 'INTERN',
}

@Entity('employees')
@Unique(['companyId', 'code'])
export class Employee {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column()
    code: string; // Ex: 001

    @Column()
    name: string;

    @Column({ nullable: true })
    nif: string;

    @Column({ nullable: true })
    inss: string;

    @Column({ nullable: true })
    nib: string;

    @Column({ nullable: true })
    bankName: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    department: string;

    @Column({ nullable: true })
    position: string;

    @Column({
        type: 'simple-enum',
        enum: ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'],
        default: 'FULL_TIME',
    })
    contractType: string;

    @Column({ type: 'date', nullable: true })
    hireDate: string;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    salaryBase: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    subsidyTransport: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    subsidyFood: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    subsidyHousing: number;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
