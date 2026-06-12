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

export const MAKER_CHECKER_WARNING = '[AVISO] Mesmo utilizador executou passos consecutivos';

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
        documentType: 'SALES' | 'PURCHASES' | 'TREASURY' | 'PAYROLL',
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
                this.checkPermission(user, 'APPROVE', documentType);
                if (fromStatus !== WorkflowStatus.SUBMITTED) {
                    throw new BadRequestException(`Only submitted documents can be approved. Current: ${fromStatus}`);
                }
                toStatus = WorkflowStatus.APPROVED;
                break;

            case 'REJECT':
                this.checkPermission(user, 'REJECT', documentType);
                if (fromStatus !== WorkflowStatus.SUBMITTED) {
                    throw new BadRequestException(`Only submitted documents can be rejected. Current: ${fromStatus}`);
                }
                toStatus = WorkflowStatus.REJECTED;
                break;

            case 'POST':
                this.checkPermission(user, 'POST', documentType);
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

        // Record history (with maker-checker warning when the same user
        // performs consecutive workflow steps on the same document).
        const finalNotes = await this.appendMakerCheckerWarning(target.id, user, notes);
        const history = this.historyRepo.create({
            documentId: target.id,
            documentType,
            fromStatus,
            toStatus,
            userId: user.userId || user.id,
            userName: user.username || user.name,
            notes: finalNotes,
            companyId: target.companyId
        });
        await this.historyRepo.save(history);

        return {
            success: true,
            status: toStatus,
            history
        };
    }

    /**
     * Segregação de funções: APPROVE/REJECT require {module}.approve and POST
     * requires {module}.post (treasury POST = treasury.pay). Admin-class users
     * bypass so existing single-user installs keep working unconfigured.
     */
    private checkPermission(user: any, action: string, documentType?: string) {
        if (user.isAdmin || user.isSuperAdmin || user.isTechnical) return;

        const module = (documentType || '').toLowerCase();
        let requiredKey = '';
        if (action === 'APPROVE' || action === 'REJECT') {
            requiredKey = module === 'payroll' ? 'hr.payroll.approve' : `${module}.approve`;
        } else if (action === 'POST') {
            if (module === 'payroll') requiredKey = 'hr.payroll.post';
            else if (module === 'treasury') requiredKey = 'treasury.pay';
            else requiredKey = `${module}.post`;
        }

        const keys: string[] = Array.isArray(user.permissionKeys) ? user.permissionKeys : [];
        if (requiredKey && keys.includes(requiredKey)) return;

        // Legacy fallback: explicit action rights stored on the user object
        const hasLegacy = user.permissions?.some?.((p: any) =>
            p.action === action || p.action === 'WORKFLOW_ALL'
        );
        if (hasLegacy) return;

        throw new ForbiddenException(
            `Sem permissão para ${action} (${requiredKey || documentType}). Contacte o administrador.`,
        );
    }

    /** Maker-checker: allowed, but leaves an audit warning in the history. */
    async appendMakerCheckerWarning(documentId: string, user: any, notes?: string): Promise<string | undefined> {
        try {
            const last = await this.historyRepo.findOne({
                where: { documentId },
                order: { createdAt: 'DESC' },
            });
            const currentUserId = user.userId || user.id;
            if (last && last.userId && currentUserId && last.userId === currentUserId) {
                return notes ? `${notes} ${MAKER_CHECKER_WARNING}` : MAKER_CHECKER_WARNING;
            }
        } catch { /* history lookup must never block the transition */ }
        return notes;
    }

    /** Writes a history row directly (used by flows outside transition(), e.g. payroll). */
    async recordHistory(entry: {
        documentId: string; documentType: string; fromStatus: string; toStatus: string;
        user: any; notes?: string; companyId?: string;
    }) {
        const finalNotes = await this.appendMakerCheckerWarning(entry.documentId, entry.user, entry.notes);
        const history = this.historyRepo.create({
            documentId: entry.documentId,
            documentType: entry.documentType as any,
            fromStatus: entry.fromStatus as any,
            toStatus: entry.toStatus as any,
            userId: entry.user.userId || entry.user.id,
            userName: entry.user.username || entry.user.name,
            notes: finalNotes,
            companyId: entry.companyId,
        });
        return this.historyRepo.save(history);
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
