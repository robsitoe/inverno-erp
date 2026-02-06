import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowStatus } from '../../common/enums/workflow-status.enum';

export enum TreasuryDocumentType {
    RECEIPT = 'RECEIPT',
    PAYMENT = 'PAYMENT',
}

@Entity('treasury_documents')
export class TreasuryDocument {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true, type: 'varchar' })
    companyId: string;

    @Column({
        type: 'simple-enum',
        enum: ['RECEIPT', 'PAYMENT'],
    })
    type: string;

    @Column({ nullable: true })
    docType: string; // e.g., 'RE', 'PAG'

    @Column({ nullable: true })
    series: string;

    @Column({ nullable: true })
    seriesNumber: number;

    @Column()
    number: string; // Full formatted number e.g. 'RE 2024/1'

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    amount: number;

    @Column({ nullable: true })
    treasuryAccountId: string;

    @Column({ nullable: true })
    entityCode: string;

    @Column({ nullable: true })
    entityName: string;

    // Specific fields for receipts
    @Column({ nullable: true })
    customerCode: string;

    @Column({ nullable: true })
    customerName: string;

    // Specific fields for payments
    @Column({ nullable: true })
    beneficiaryCode: string;

    @Column({ nullable: true })
    beneficiaryName: string;

    @Column({ nullable: true })
    paymentMethod: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    observations: string;

    @Column({ nullable: true })
    relatedDocument: string;

    @Column({
        type: 'varchar',
        default: WorkflowStatus.DRAFT,
    })
    status: WorkflowStatus;

    @Column({ nullable: true })
    statusNotes: string;

    @OneToMany(() => TreasuryDocumentLine, (line) => line.document, { cascade: true })
    lines: TreasuryDocumentLine[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('treasury_document_lines')
export class TreasuryDocumentLine {
    @PrimaryColumn()
    id: string;

    @ManyToOne(() => TreasuryDocument, (document) => document.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'documentId' })
    document: TreasuryDocument;

    @Column()
    docNumber: string; // The document being paid/received

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    amount: number;

    @Column({ nullable: true })
    paymentMode: string;
}
