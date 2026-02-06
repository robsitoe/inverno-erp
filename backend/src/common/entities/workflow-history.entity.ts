import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { WorkflowStatus } from '../enums/workflow-status.enum';

@Entity('workflow_history')
export class WorkflowHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    documentId: string;

    @Column()
    documentType: string; // 'SALES', 'PURCHASES', 'TREASURY'

    @Column({
        type: 'varchar'
    })
    fromStatus: WorkflowStatus;

    @Column({
        type: 'varchar'
    })
    toStatus: WorkflowStatus;

    @Column({ nullable: true })
    userId: string;

    @Column({ nullable: true })
    userName: string;

    @Column({ nullable: true })
    notes: string;

    @Column({ nullable: true })
    companyId: string;

    @CreateDateColumn()
    createdAt: Date;
}
