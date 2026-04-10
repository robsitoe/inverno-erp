import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

export enum ArticleType {
    PRODUCT = 'PRODUCT',
    SERVICE = 'SERVICE',
}

@Entity('articles')
@Unique(['companyId', 'code'])
export class Article {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true, type: 'varchar' })
    companyId: string | null;

    @Column()
    code: string;


    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    familyId: string;

    @Column({
        type: 'simple-enum',
        enum: ['PRODUCT', 'SERVICE'],
        default: 'PRODUCT',
    })
    type: string;

    @Column({ nullable: true })
    unit: string;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    purchasePrice: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    salePrice: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, nullable: true })
    priceReseller: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, nullable: true })
    pricePump: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, nullable: true })
    priceFinal: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    ivaRate: number;

    @Column({ nullable: true })
    ivaCode: string;

    @Column({ default: true })
    stockControl: boolean;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    currentStock: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    minStock: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    maxStock: number;

    @Column({ nullable: true })
    revenueAccountId: string;

    @Column({ nullable: true })
    cogsAccountId: string;

    @Column({ nullable: true })
    inventoryAccountId: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
