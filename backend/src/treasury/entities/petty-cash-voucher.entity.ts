import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('petty_cash_vouchers')
export class PettyCashVoucher {
    @PrimaryColumn()
    id: string;

    @Column()
    companyId: string;

    @Column({ type: 'varchar', nullable: true })
    number: string;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    amount: number;

    @Column({ nullable: true })
    amountInWords: string;

    @Column()
    titularName: string;

    @Column({ nullable: true })
    employeeId: string;

    @Column({ type: 'text' })
    reason: string;

    @Column({ default: false })
    isPersonalAdvance: boolean;

    @Column({ default: false })
    isDeducted: boolean;

    @Column({ nullable: true })
    deductedInPayrollId: string;

    @Column({
        type: 'varchar',
        default: 'PAID'
    })
    status: string;

    @Column({ nullable: true })
    issuedBy: string;

    @Column({ nullable: true })
    observations: string;

    /** Conta a débito (despesa, ou 4.5.1.2 nos adiantamentos ao pessoal). */
    @Column({ nullable: true })
    debitAccount: string;

    /** Conta de caixa a crédito (por omissão 1.1). */
    @Column({ nullable: true })
    cashAccount: string;

    /** Lançamento contabilístico do vale (e do estorno, quando anulado). */
    @Column({ nullable: true })
    journalEntryId: string;

    @Column({ nullable: true })
    reversalEntryId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
