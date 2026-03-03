import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('hr_tax_brackets')
export class TaxBracket {
    @PrimaryGeneratedColumn('uuid')
    id: string; // e.g., "IRPS-2024-1"

    @Column()
    companyId: string;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    minAmount: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
    maxAmount: number | null;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    rate: number; // e.g., 20

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    deduction0: number; // Parcela a abater para 0 dependentes

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    deduction1: number; // 1 dependente

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    deduction2: number; // 2 dependentes

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    deduction3: number; // 3 dependentes

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    deduction4Plus: number; // 4 ou mais dependentes

    @Column({ default: true })
    isActive: boolean;
}

@Entity('hr_settings')
export class HRSettings {
    @PrimaryColumn()
    companyId: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 3 })
    inssEmployeeRate: number; // Percentage

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 4 })
    inssEmployerRate: number; // Percentage

    @Column({ default: 'MT' })
    currency: string;
}
