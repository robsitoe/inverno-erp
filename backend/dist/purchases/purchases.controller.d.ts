import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
export declare class PurchasesController {
    private readonly purchasesService;
    constructor(purchasesService: PurchasesService);
    create(createPurchaseDto: CreatePurchaseDto): Promise<import("./entities/purchase.entity").PurchaseDocument>;
    findAll(companyId?: string): Promise<import("./entities/purchase.entity").PurchaseDocument[]>;
    findByNumber(companyId: string, type: string, series: string, number: number): Promise<import("./entities/purchase.entity").PurchaseDocument | null>;
    findOne(id: string): Promise<import("./entities/purchase.entity").PurchaseDocument>;
    update(id: string, updatePurchaseDto: UpdatePurchaseDto): Promise<import("./entities/purchase.entity").PurchaseDocument>;
    remove(id: string): Promise<import("./entities/purchase.entity").PurchaseDocument>;
    processWorkflow(id: string, data: {
        action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST';
        notes?: string;
    }, req: any): Promise<{
        success: boolean;
        status: import("../common/enums/workflow-status.enum").WorkflowStatus.SUBMITTED | import("../common/enums/workflow-status.enum").WorkflowStatus.APPROVED | import("../common/enums/workflow-status.enum").WorkflowStatus.REJECTED | import("../common/enums/workflow-status.enum").WorkflowStatus.POSTED;
        history: import("../common/entities/workflow-history.entity").WorkflowHistory;
    }>;
    getHistory(id: string): Promise<import("../common/entities/workflow-history.entity").WorkflowHistory[]>;
}
