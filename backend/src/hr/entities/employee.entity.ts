import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

export enum ContractType {
    INDETERMINADO = 'INDETERMINADO',
    DETERMINADO_CERTO = 'DETERMINADO_CERTO',
    DETERMINADO_INCERTO = 'DETERMINADO_INCERTO',
    EVENTUAL = 'EVENTUAL',
    SAZONAL = 'SAZONAL',
    INTERMITENTE = 'INTERMITENTE',
    TELETRABALHO = 'TELETRABALHO',
    DOMICILIO = 'DOMICILIO',
    ESTAGIO = 'ESTAGIO',
}

export interface EmployeeDocument {
    id: string;
    type: 'BI' | 'CONTRATO' | 'NUIT' | 'INSS' | 'OUTRO';
    label: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    url: string;
}

@Entity('employees')
@Unique(['companyId', 'code'])
export class Employee {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column()
    code: string;

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
        enum: ['INDETERMINADO', 'DETERMINADO_CERTO', 'DETERMINADO_INCERTO', 'EVENTUAL', 'SAZONAL', 'INTERMITENTE', 'TELETRABALHO', 'DOMICILIO', 'ESTAGIO'],
        default: 'INDETERMINADO',
    })
    contractType: string;

    @Column({ type: 'date', nullable: true })
    trialPeriodEnd: string;

    @Column({ type: 'int', default: 44 })
    weeklyHours: number;

    @Column({ type: 'date', nullable: true })
    hireDate: string;

    @Column({ type: 'date', nullable: true })
    endDate: string;

    @Column({ nullable: true })
    terminationReason: string;

    @Column({ type: 'int', default: 0 })
    vacationBalance: number;

    @Column({ type: 'int', default: 0 })
    dependents: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    salaryBase: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    subsidyTransport: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    subsidyFood: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    subsidyHousing: number;

    /** URL/path to the employee's profile photo */
    @Column({ nullable: true })
    photoUrl: string;

    /** JSON array of EmployeeDocument objects */
    @Column({ type: 'simple-json', nullable: true })
    documents: EmployeeDocument[];

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
