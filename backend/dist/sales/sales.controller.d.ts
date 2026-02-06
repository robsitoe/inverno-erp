import { SalesService } from './sales.service';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    create(createSalesDocumentDto: CreateSalesDocumentDto): Promise<import("./entities/sales-document.entity").SalesDocument>;
    findAll(companyId?: string, documentType?: string, series?: string): Promise<import("./entities/sales-document.entity").SalesDocument[]>;
    findByNumber(companyId: string, type: string, series: string, number: number): Promise<import("./entities/sales-document.entity").SalesDocument | null>;
    findOne(id: string): Promise<import("./entities/sales-document.entity").SalesDocument>;
    update(id: string, updateSalesDocumentDto: UpdateSalesDocumentDto): Promise<import("./entities/sales-document.entity").SalesDocument>;
    remove(id: string): Promise<import("./entities/sales-document.entity").SalesDocument>;
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
