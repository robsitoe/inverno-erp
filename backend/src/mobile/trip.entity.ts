import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type TripStatus = 'LOADED' | 'OUT' | 'RETURNED' | 'RECONCILED' | 'DEPOSITED';

/** Per-cylinder-type snapshot, e.g. { "9KG": { full: 10, empty: 0 } } */
export type StockSnapshot = Record<string, { full?: number; empty?: number; damaged?: number }>;

@Entity('truck_trips')
export class Trip {
    @PrimaryColumn()
    id: string;

    @Index()
    @Column({ nullable: true, type: 'varchar' })
    companyId: string;

    @Column({ type: 'int', default: 0 })
    tripNumber: number;

    @Column()
    truckPlate: string;

    @Column({ nullable: true })
    driverId?: string;

    @Column({ nullable: true })
    driverName?: string;

    /** LOADED → OUT → RETURNED → RECONCILED → DEPOSITED */
    @Column({ default: 'LOADED' })
    status: TripStatus;

    // ── Cylinder reconciliation ──────────────────────────────────────────────
    /** What the warehouse keeper (fiel) loaded onto the truck at departure */
    @Column({ type: 'simple-json', nullable: true })
    loadedOut: StockSnapshot;

    /** What the warehouse keeper registered as returned */
    @Column({ type: 'simple-json', nullable: true })
    returnedStock: StockSnapshot;

    // ── Cash reconciliation ──────────────────────────────────────────────────
    /** Sum of sales totals registered by the driver during this trip (computed) */
    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    expectedCash: number;

    /** Cash the driver actually hands over at return */
    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    declaredCash: number;

    /** Total already deposited to the bank by the deposits team */
    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    depositedCash: number;

    /** Number of sales documents in this trip (computed) */
    @Column({ type: 'int', default: 0 })
    salesCount: number;

    /** Total cylinders sold in this trip (computed) */
    @Column({ type: 'int', default: 0 })
    cylindersSold: number;

    // ── People & audit ───────────────────────────────────────────────────────
    @Column({ nullable: true })
    openedBy?: string;      // fiel who loaded

    @Column({ nullable: true })
    closedBy?: string;      // fiel who received return

    @Column({ nullable: true })
    cashReceivedBy?: string; // cashier who reconciled cash

    @Column({ type: 'datetime', nullable: true })
    openedAt: Date;

    @Column({ type: 'datetime', nullable: true })
    returnedAt: Date;

    @Column({ nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
