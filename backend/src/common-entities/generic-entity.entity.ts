import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('generic_entities')
export class GenericEntity {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    companyId: string;

    @Column()
    code: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    nif: string;

    @Column({ nullable: true })
    address: string;

    @Column()
    type: string; // The entity type code (e.g., 'SOCIO', 'FUNC')

    @Column({ nullable: true })
    accountId: string;

    @Column({ default: true })
    isActive: boolean;
}
