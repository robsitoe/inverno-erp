import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowStatus } from '../../common/enums/workflow-status.enum';

export enum PurchaseDocumentType {
    INVOICE = 'INVOICE',
    RECEIPT = 'RECEIPT', // Recibo de compra? Usually 'PAYMENT_RECEIPT' but let's stick to generic
    CREDIT_NOTE = 'CREDIT_NOTE',
    DEBIT_NOTE = 'DEBIT_NOTE',
    ORDER = 'ORDER',
    QUOTE = 'QUOTE', // Cotação de fornecedor
}


@Entity('purchase_documents')
export class PurchaseDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column()
    type: string;

    @Column()
    series: string;

    @Column()
    number: number;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'date' })
    dueDate: string;

    @Column({ nullable: true })
    supplierCode: string;

    @Column({ nullable: true })
    supplierName: string;

    @Column({ nullable: true })
    supplierNif: string;

    @Column({ nullable: true })
    supplierAddress: string;

    @Column({ nullable: true })
    supplierAccountId: string;

    @Column({ nullable: true })
    reference: string;

    @Column({ nullable: true })
    paymentCondition: string;

    @Column({ default: 0 })
    paymentDays: number;

    @Column({ default: 'MZN' })
    currency: string;

    @Column({
        type: 'varchar',
        default: WorkflowStatus.DRAFT,
    })
    status: WorkflowStatus;

    @Column({ nullable: true })
    statusNotes: string;

    @OneToMany(() => PurchaseDocumentLine, (line) => line.document, { cascade: true })
    lines: PurchaseDocumentLine[];

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    merchandiseTotal: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    discountValue: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    taxTotal: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    totalValue: number;

    @Column({ nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('purchase_document_lines')
export class PurchaseDocumentLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => PurchaseDocument, (document) => document.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'documentId' })
    document: PurchaseDocument;

    @Column({ nullable: true })
    articleId: string;

    @Column()
    articleCode: string;

    @Column()
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
    taxCode: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    taxRate: number;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    unitPrice: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    discount: number;

    @Column({ nullable: true })
    unit: string;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    quantity: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    totalLiquid: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    totalValue: number;

    @Column({ nullable: true })
    project: string;

    @Column({ nullable: true })
    costCenter: string;

    @Column({ nullable: true })
    analytic: string;

    @Column({ nullable: true })
    functional: string;
}
