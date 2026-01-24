import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from './account.entity';

export enum JournalEntryStatus {
    DRAFT = 'DRAFT',
    POSTED = 'POSTED',
    CANCELED = 'CANCELED',
}

@Entity('journal_entries')
export class JournalEntry {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column({ nullable: true })
    journalId: string;

    @Column({ type: 'date' })
    date: string;

    @Column()
    description: string;

    @Column({ nullable: true })
    reference: string;

    @Column({ nullable: true })
    sourceDocument: string;

    @Column({
        type: 'simple-enum',
        enum: ['SALE', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'MANUAL', 'REVERSAL', 'CORRECTION'],
        nullable: true
    })
    sourceType: string;

    @OneToMany(() => JournalLine, (line) => line.journalEntry, { cascade: true })
    lines: JournalLine[];

    @Column({
        type: 'simple-enum',
        enum: ['DRAFT', 'POSTED', 'CANCELLED', 'REVERSED', 'CORRECTED', 'VOIDED'],
        default: 'DRAFT',
    })
    status: string;

    @Column({ nullable: true })
    createdBy: string;

    @Column({ nullable: true })
    updatedBy: string;

    @Column({ nullable: true })
    correctionReason: string;

    @Column({ nullable: true })
    relatedEntryId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('journal_lines')
export class JournalLine {
    @PrimaryColumn()
    id: string;

    @ManyToOne(() => JournalEntry, (journalEntry) => journalEntry.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'journalEntryId' })
    journalEntry: JournalEntry;

    @Column()
    accountId: string;

    @Column({ nullable: true })
    accountCode: string;

    @Column({ nullable: true })
    accountName: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    debit: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    credit: number;
}
