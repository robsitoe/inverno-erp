"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const workflow_history_entity_1 = require("./entities/workflow-history.entity");
const workflow_status_enum_1 = require("./enums/workflow-status.enum");
let WorkflowService = class WorkflowService {
    historyRepo;
    constructor(historyRepo) {
        this.historyRepo = historyRepo;
    }
    async transition(target, action, user, repo, documentType, notes) {
        const fromStatus = target.status;
        let toStatus;
        switch (action) {
            case 'SUBMIT':
                if (fromStatus !== workflow_status_enum_1.WorkflowStatus.DRAFT && fromStatus !== workflow_status_enum_1.WorkflowStatus.REJECTED) {
                    throw new common_1.BadRequestException(`Cannot submit document in status ${fromStatus}`);
                }
                toStatus = workflow_status_enum_1.WorkflowStatus.SUBMITTED;
                break;
            case 'APPROVE':
                this.checkPermission(user, 'APPROVE');
                if (fromStatus !== workflow_status_enum_1.WorkflowStatus.SUBMITTED) {
                    throw new common_1.BadRequestException(`Only submitted documents can be approved. Current: ${fromStatus}`);
                }
                toStatus = workflow_status_enum_1.WorkflowStatus.APPROVED;
                break;
            case 'REJECT':
                this.checkPermission(user, 'REJECT');
                if (fromStatus !== workflow_status_enum_1.WorkflowStatus.SUBMITTED) {
                    throw new common_1.BadRequestException(`Only submitted documents can be rejected. Current: ${fromStatus}`);
                }
                toStatus = workflow_status_enum_1.WorkflowStatus.REJECTED;
                break;
            case 'POST':
                this.checkPermission(user, 'POST');
                if (fromStatus !== workflow_status_enum_1.WorkflowStatus.APPROVED) {
                    throw new common_1.BadRequestException(`Only approved documents can be posted. Current: ${fromStatus}`);
                }
                toStatus = workflow_status_enum_1.WorkflowStatus.POSTED;
                break;
            default:
                throw new common_1.BadRequestException(`Unknown action: ${action}`);
        }
        target.status = toStatus;
        if (notes)
            target.statusNotes = notes;
        await repo.save(target);
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
    checkPermission(user, action) {
        if (user.isAdmin || user.isSuperAdmin)
            return;
        const hasPermission = user.permissions?.some((p) => p.action === action || p.action === 'WORKFLOW_ALL');
        if (!hasPermission) {
            throw new common_1.ForbiddenException(`User does not have permission to ${action} documents.`);
        }
    }
    async getHistory(documentId) {
        return this.historyRepo.find({
            where: { documentId },
            order: { createdAt: 'DESC' }
        });
    }
    checkEditLock(status, user) {
        if (status === workflow_status_enum_1.WorkflowStatus.APPROVED || status === workflow_status_enum_1.WorkflowStatus.POSTED) {
            if (!user.isSuperAdmin && !user.isTechnical) {
                throw new common_1.BadRequestException(`Documento bloqueado para edição (Estado: ${status}).`);
            }
        }
    }
};
exports.WorkflowService = WorkflowService;
exports.WorkflowService = WorkflowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(workflow_history_entity_1.WorkflowHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WorkflowService);
//# sourceMappingURL=workflow.service.js.map