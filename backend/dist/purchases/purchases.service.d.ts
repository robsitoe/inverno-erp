import { Repository } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseDocument } from './entities/purchase.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { WorkflowService } from '../common/workflow.service';
import { PeriodControlService } from '../periods/period-control.service';
import { InventoryService } from '../inventory/inventory.service';
export declare class PurchasesService {
    private readonly tenancyService;
    private readonly periodControlService;
    private readonly defaultPurchaseRepo;
    private readonly workflowService;
    private readonly inventoryService;
    constructor(tenancyService: TenancyService, periodControlService: PeriodControlService, defaultPurchaseRepo: Repository<PurchaseDocument>, workflowService: WorkflowService, inventoryService: InventoryService);
    private getRepo;
    private getPurchaseRepo;
    create(createPurchaseDto: CreatePurchaseDto): Promise<PurchaseDocument>;
    findAll(companyId?: string): Promise<PurchaseDocument[]>;
    findOne(id: string): Promise<PurchaseDocument>;
    update(id: string, updatePurchaseDto: UpdatePurchaseDto, user?: any): Promise<PurchaseDocument>;
    findByNumber(companyId: string, type: string, series: string, number: number): Promise<PurchaseDocument | null>;
    remove(id: string, user?: any): Promise<PurchaseDocument>;
    processWorkflow(id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, notes?: string): Promise<{
        success: boolean;
        status: import("../common/enums/workflow-status.enum").WorkflowStatus.SUBMITTED | import("../common/enums/workflow-status.enum").WorkflowStatus.APPROVED | import("../common/enums/workflow-status.enum").WorkflowStatus.REJECTED | import("../common/enums/workflow-status.enum").WorkflowStatus.POSTED;
        history: import("../common/entities/workflow-history.entity").WorkflowHistory;
    }>;
    private createStockMovementsForPurchases;
    getWorkflowHistory(id: string): Promise<import("../common/entities/workflow-history.entity").WorkflowHistory[]>;
}
