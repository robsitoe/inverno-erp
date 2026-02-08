import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Article } from './article.entity';

export enum StockMovementType {
    IN = 'IN',
    OUT = 'OUT',
}

export enum StockDocumentType {
    FI = 'FI', // Fornecedor Inventario (Entrada)
    FS = 'FS', // Fatura Simplificada (Saida)
    SI = 'SI', // Stock Inicial
    GT = 'GT', // Guia de Transporte
    GR = 'GR', // Guia de Remessa
    NC = 'NC', // Nota de Credito
    ND = 'ND', // Nota de Debito
}

@Entity('stock_movements')
export class StockMovement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column({ type: 'date' })
    date: string;

    @Column()
    articleId: string;

    @Column()
    articleCode: string;

    @Column()
    articleName: string;

    @Column({ nullable: true })
    warehouseId: string;

    @Column({ nullable: true })
    locationId: string;

    @Column({ nullable: true })
    batchId: string;

    @Column({
        type: 'simple-enum',
        enum: ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'],
    })
    movementType: string;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    quantity: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    unitCost: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    totalCost: number;

    @Column({ nullable: true })
    reference: string;

    @Column({ nullable: true })
    sourceDocument: string;

    @Column({ nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;
}
