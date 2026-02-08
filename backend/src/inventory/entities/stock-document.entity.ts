import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

export enum StockDocumentStatus {
    DRAFT = 'DRAFT',
    POSTED = 'POSTED',
    CANCELED = 'CANCELED',
}

@Entity('stock_documents')
export class StockDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column()
    type: string;  // e.g., 'SI', 'FI'

    @Column()
    series: string;

    @Column()
    number: number;

    @Column({ type: 'date' })
    date: string;

    @Column({ nullable: true })
    time: string;

    @Column({ nullable: true })
    warehouse: string;

    @Column({ nullable: true })
    originAccount: string;

    @Column({ nullable: true })
    originCostCenter: string;

    @Column({ nullable: true })
    originProject: string;

    @Column({ nullable: true })
    originAnalytic: string;

    @Column({ nullable: true })
    originFunctional: string;

    @Column({ nullable: true })
    originPep: string;

    @OneToMany(() => StockDocumentLine, (line) => line.document, { cascade: true })
    lines: StockDocumentLine[];

    @Column({
        type: 'varchar',
        default: StockDocumentStatus.DRAFT,
    })
    status: StockDocumentStatus;

    @Column({ nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('stock_document_lines')
export class StockDocumentLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => StockDocument, (document) => document.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'documentId' })
    document: StockDocument;

    @Column({ nullable: true })
    articleId: string;

    @Column()
    articleCode: string;

    @Column({ nullable: true })
    articleName: string;

    @Column({ nullable: true })
    warehouse: string;

    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    batch: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    unit: string;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    quantity: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    unitPrice: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total: number;

    // Analytic accounting fields per line
    @Column({ nullable: true })
    generalAccount: string;

    @Column({ nullable: true })
    costCenter: string;

    @Column({ nullable: true })
    analytic: string;

    @Column({ nullable: true })
    functional: string;

    @Column({ nullable: true })
    project: string;

    @Column({ nullable: true })
    pepElement: string;

    @Column({ nullable: true })
    item: string;
}
