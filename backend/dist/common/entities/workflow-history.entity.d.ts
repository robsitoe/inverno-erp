import { WorkflowStatus } from '../enums/workflow-status.enum';
export declare class WorkflowHistory {
    id: string;
    documentId: string;
    documentType: string;
    fromStatus: WorkflowStatus;
    toStatus: WorkflowStatus;
    userId: string;
    userName: string;
    notes: string;
    companyId: string;
    createdAt: Date;
}
