import { Repository } from 'typeorm';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { WorkflowService } from '../common/workflow.service';
export declare class SalesService {
    private readonly tenancyService;
    private readonly defaultSalesDocumentRepo;
    private readonly defaultSalesLineRepo;
    private readonly workflowService;
    constructor(tenancyService: TenancyService, defaultSalesDocumentRepo: Repository<SalesDocument>, defaultSalesLineRepo: Repository<SalesDocumentLine>, workflowService: WorkflowService);
    private getRepo;
    private getSalesDocRepo;
    private getSalesLineRepo;
    create(createSalesDocumentDto: CreateSalesDocumentDto): Promise<SalesDocument>;
    findAll(companyId?: string): Promise<SalesDocument[]>;
    findOne(id: string): Promise<SalesDocument>;
    update(id: string, updateSalesDocumentDto: UpdateSalesDocumentDto, user?: any): Promise<SalesDocument>;
    findByNumber(companyId: string, type: string, series: string, number: number): Promise<SalesDocument | null>;
    remove(id: string, user?: any): Promise<SalesDocument>;
    processWorkflow(id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, notes?: string): Promise<{
        success: boolean;
        status: import("../common/enums/workflow-status.enum").WorkflowStatus.SUBMITTED | import("../common/enums/workflow-status.enum").WorkflowStatus.APPROVED | import("../common/enums/workflow-status.enum").WorkflowStatus.REJECTED | import("../common/enums/workflow-status.enum").WorkflowStatus.POSTED;
        history: import("../common/entities/workflow-history.entity").WorkflowHistory;
    }>;
    getWorkflowHistory(id: string): Promise<import("../common/entities/workflow-history.entity").WorkflowHistory[]>;
}
