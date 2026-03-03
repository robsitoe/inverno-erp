import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('gas_cylinder_types')
export class GasCylinderType {
    @PrimaryColumn()
    id: string; // e.g., "9KG-COMPANYID"

    @Column()
    companyId: string;

    @Column()
    name: string; // "9KG", "14KG", etc.

    @Column({ default: 'PETROGAS' })
    brand: string; // 'PETROGAS' or 'GALP'

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    priceRevendedor: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    priceBomba: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    priceConsumidor: number;

    @Column({ default: true })
    isActive: boolean;
}

@Entity('gas_daily_controls')
export class GasDailyControl {
    @PrimaryColumn()
    id: string; // e.g., "GAS-2026-03-02-COMPANYID"

    @Column()
    companyId: string;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'simple-json', nullable: true })
    initialStock: any; // { "9KG": { kit: 0, damaged: 20, empty: 387, gpl: 285 }, ... }

    @Column({ type: 'simple-json', nullable: true })
    finalStock: any; // { "9KG": { kit: 0, damaged: 20, empty: 468, gpl: 83 }, ... }

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('gas_daily_entries')
export class GasDailyEntry {
    @PrimaryColumn()
    id: string;

    @Column()
    controlId: string;

    @Column()
    companyId: string;

    @Column()
    cylinderTypeId: string;

    @Column()
    customerName: string;

    @Column({ default: 'CUSTOMER' })
    entryType: string; // 'CUSTOMER', 'SUPPLIER'

    @Column({ default: 'REVENDEDOR' })
    priceType: string; // 'REVENDEDOR', 'BOMBA', 'CONSUMIDOR'

    // Outgoing
    @Column({ type: 'int', default: 0 })
    s_gpl: number;

    @Column({ type: 'int', default: 0 })
    s_vaz: number;

    @Column({ type: 'int', default: 0 })
    s_av: number;

    // Others
    @Column({ type: 'int', default: 0 })
    vz_vend: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    adc_caucao: number;

    // Incoming
    @Column({ type: 'int', default: 0 })
    e_gpl: number;

    @Column({ type: 'int', default: 0 })
    e_vaz: number;

    @Column({ type: 'int', default: 0 })
    e_av: number;

    // Financials
    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    p_divida: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    totalAmount: number; // VD,s in spreadsheet
}
