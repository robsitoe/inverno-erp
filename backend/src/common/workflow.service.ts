import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowHistory } from './entities/workflow-history.entity';
import { WorkflowStatus } from './enums/workflow-status.enum';
import { User } from '../users/entities/user.entity';

export interface WorkflowTarget {
    id: string;
    companyId: string;
    status: WorkflowStatus;
    statusNotes?: string;
    documentNumber?: string;
}

@Injectable()
export class WorkflowService {
    constructor(
        @InjectRepository(WorkflowHistory)
        private readonly historyRepo: Repository<WorkflowHistory>,
    ) { }

    async transition(
        target: WorkflowTarget,
        action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST',
        user: any, // JWT User object
        repo: Repository<any>,
        documentType: 'SALES' | 'PURCHASES' | 'TREASURY',
        notes?: string
    ) {
        const fromStatus = target.status;
        let toStatus: WorkflowStatus;

        switch (action) {
            case 'SUBMIT':
                if (fromStatus !== WorkflowStatus.DRAFT && fromStatus !== WorkflowStatus.REJECTED) {
                    throw new BadRequestException(`Cannot submit document in status ${fromStatus}`);
                }
                toStatus = WorkflowStatus.SUBMITTED;
                break;

            case 'APPROVE':
                this.checkPermission(user, 'APPROVE');
                if (fromStatus !== WorkflowStatus.SUBMITTED) {
                    throw new BadRequestException(`Only submitted documents can be approved. Current: ${fromStatus}`);
                }
                toStatus = WorkflowStatus.APPROVED;
                break;

            case 'REJECT':
                this.checkPermission(user, 'REJECT');
                if (fromStatus !== WorkflowStatus.SUBMITTED) {
                    throw new BadRequestException(`Only submitted documents can be rejected. Current: ${fromStatus}`);
                }
                toStatus = WorkflowStatus.REJECTED;
                break;

            case 'POST':
                this.checkPermission(user, 'POST');
                if (fromStatus !== WorkflowStatus.APPROVED) {
                    throw new BadRequestException(`Only approved documents can be posted. Current: ${fromStatus}`);
                }
                toStatus = WorkflowStatus.POSTED;
                break;

            default:
                throw new BadRequestException(`Unknown action: ${action}`);
        }

        // Update target
        target.status = toStatus;
        if (notes) target.statusNotes = notes;

        // Save target using provided repo
        await repo.save(target as any);

        // Record history
        const history = this.historyRepo.create({
            documentId: target.id,
            documentType,
            fromStatus,
            toStatus,
            userId: user.userId || user.id,
            userName: user.username || user.name,
            notes,
            companyId: target.companyId
        });
        await this.historyRepo.save(history);

        return {
            success: true,
            status: toStatus,
            history
        };
    }

    private checkPermission(user: any, action: string) {
        // Simple logic for now: only admins can APPROVE/REJECT/POST
        // or users with specific permission field
        if (user.isAdmin || user.isSuperAdmin) return;

        // In a real app, check permissions array
        const hasPermission = user.permissions?.some((p: any) =>
            p.action === action || p.action === 'WORKFLOW_ALL'
        );

        if (!hasPermission) {
            throw new ForbiddenException(`User does not have permission to ${action} documents.`);
        }
    }

    async getHistory(documentId: string) {
        return this.historyRepo.find({
            where: { documentId },
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Point 4: Bloquear edição de documentos após aprovação/posting
     */
    checkEditLock(status: WorkflowStatus, user: any) {
        if (status === WorkflowStatus.APPROVED || status === WorkflowStatus.POSTED) {
            // Only technical or super admins can edit locked docs (or specified roles)
            if (!user.isSuperAdmin && !user.isTechnical) {
                throw new BadRequestException(`Documento bloqueado para edição (Estado: ${status}).`);
            }
        }
    }
}
