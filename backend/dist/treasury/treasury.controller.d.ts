import { TreasuryService } from './treasury.service';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
export declare class TreasuryController {
    private readonly treasuryService;
    constructor(treasuryService: TreasuryService);
    create(createTreasuryDto: CreateTreasuryDto): Promise<import("./entities/treasury.entity").TreasuryDocument>;
    findAll(companyId?: string): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    findOne(id: string): Promise<import("./entities/treasury.entity").TreasuryDocument>;
    update(id: string, updateTreasuryDto: UpdateTreasuryDto): Promise<import("./entities/treasury.entity").TreasuryDocument>;
    remove(id: string): Promise<import("./entities/treasury.entity").TreasuryDocument>;
    processWorkflow(id: string, data: {
        action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST';
        notes?: string;
    }, req: any): Promise<{
        success: boolean;
        status: import("../common/enums/workflow-status.enum").WorkflowStatus.SUBMITTED | import("../common/enums/workflow-status.enum").WorkflowStatus.APPROVED | import("../common/enums/workflow-status.enum").WorkflowStatus.REJECTED | import("../common/enums/workflow-status.enum").WorkflowStatus.POSTED;
        history: import("../common/entities/workflow-history.entity").WorkflowHistory;
    }>;
    getHistory(id: string): Promise<import("../common/entities/workflow-history.entity").WorkflowHistory[]>;
    findAllReceipts(companyId?: string): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    createReceipt(data: any): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    findAllPayments(companyId?: string): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    createPayment(data: any): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    createVoucher(data: any, req: any): Promise<import("./entities/petty-cash-voucher.entity").PettyCashVoucher[]>;
    getNextNumber(companyId: string): Promise<{
        number: string;
    }>;
    findAllVouchers(companyId?: string): Promise<import("./entities/petty-cash-voucher.entity").PettyCashVoucher[]>;
    findOneVoucher(id: string): Promise<import("./entities/petty-cash-voucher.entity").PettyCashVoucher | null>;
    updateVoucher(id: string, data: any): Promise<import("./entities/petty-cash-voucher.entity").PettyCashVoucher>;
    removeVoucher(id: string): Promise<import("typeorm").DeleteResult>;
}
