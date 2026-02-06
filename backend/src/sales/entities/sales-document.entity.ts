import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowStatus } from '../../common/enums/workflow-status.enum';

export enum SalesDocumentType {
    INVOICE = 'INVOICE',
    RECEIPT = 'RECEIPT',
    CREDIT_NOTE = 'CREDIT_NOTE',
    DEBIT_NOTE = 'DEBIT_NOTE',
    QUOTE = 'QUOTE',
    ORDER = 'ORDER',
}


@Entity('sales_documents')
export class SalesDocument {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true, type: 'varchar' })
    companyId: string;

    @Column()
    documentType: string;

    @Column()
    documentNumber: string;

    @Column({ nullable: true })
    series: string;

    @Column({ nullable: true })
    seriesNumber: number;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'date' })
    dueDate: string;

    @Column({ nullable: true })
    customerId: string;

    @Column({ nullable: true })
    customerName: string;

    @Column({ nullable: true })
    customerNif: string;

    @Column({ nullable: true })
    customerAddress: string;

    @OneToMany(() => SalesDocumentLine, (line) => line.document, { cascade: true })
    lines: SalesDocumentLine[];

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    discounts: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    totalIva: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total: number;

    @Column({
        type: 'varchar',
        default: WorkflowStatus.DRAFT,
    })
    status: WorkflowStatus;

    @Column({ nullable: true })
    statusNotes: string;

    @Column({ nullable: true })
    journalEntryId: string;

    @Column({ nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('sales_document_lines')
export class SalesDocumentLine {
    @PrimaryColumn()
    id: string;

    @ManyToOne(() => SalesDocument, (document) => document.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'documentId' })
    document: SalesDocument;

    @Column()
    articleId: string;

    @Column()
    articleCode: string;

    @Column()
    articleName: string;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    quantity: number;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    unitPrice: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    discount: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    ivaRate: number;

    @Column({ nullable: true })
    ivaCode: string;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    ivaAmount: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total: number;
}
