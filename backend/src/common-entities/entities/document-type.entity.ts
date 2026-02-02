import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('document_types')
export class DocumentType {
    @PrimaryColumn()
    id: string;

    @Column()
    companyId: string;

    @Column()
    module: string; // SALES, PURCHASES, TREASURY, STOCK

    @Column()
    code: string; // FA, VD, RE, FI, etc.

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    nature: string; // INVENTORY (IN/OUT), TREASURY (RECEIVE/PAY)

    @Column({ type: 'jsonb', nullable: true })
    series: any[]; // Array of series configurations

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
