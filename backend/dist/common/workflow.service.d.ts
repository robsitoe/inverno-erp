import { Repository } from 'typeorm';
import { WorkflowHistory } from './entities/workflow-history.entity';
import { WorkflowStatus } from './enums/workflow-status.enum';
export interface WorkflowTarget {
    id: string;
    companyId: string;
    status: WorkflowStatus;
    statusNotes?: string;
    documentNumber?: string;
}
export declare class WorkflowService {
    private readonly historyRepo;
    constructor(historyRepo: Repository<WorkflowHistory>);
    transition(target: WorkflowTarget, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, repo: Repository<any>, documentType: 'SALES' | 'PURCHASES' | 'TREASURY', notes?: string): Promise<{
        success: boolean;
        status: WorkflowStatus.SUBMITTED | WorkflowStatus.APPROVED | WorkflowStatus.REJECTED | WorkflowStatus.POSTED;
        history: WorkflowHistory;
    }>;
    private checkPermission;
    getHistory(documentId: string): Promise<WorkflowHistory[]>;
    checkEditLock(status: WorkflowStatus, user: any): void;
}
