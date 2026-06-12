import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

/**
 * Permission profile (segregação de funções). Lives in the MAIN database,
 * alongside users; scoped per company. permissions holds catalog keys
 * (see common/permissions.catalog.ts).
 */
@Entity('profiles')
@Unique(['companyId', 'name'])
export class Profile {
    @PrimaryColumn()
    id: string;

    @Column()
    companyId: string;

    @Column()
    name: string;

    @Column({ type: 'jsonb', default: () => "'[]'" })
    permissions: string[];

    /** Seeded default profiles can be edited but not deleted. */
    @Column({ default: false })
    isSystem: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
