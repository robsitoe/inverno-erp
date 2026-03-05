import { Repository } from 'typeorm';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
import { TreasuryDocument } from './entities/treasury.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PettyCashVoucher } from './entities/petty-cash-voucher.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { WorkflowService } from '../common/workflow.service';
import { PeriodControlService } from '../periods/period-control.service';
export declare class TreasuryService {
    private readonly tenancyService;
    private readonly periodControlService;
    private readonly defaultTreasuryRepo;
    private readonly defaultPaymentMethodRepo;
    private readonly defaultPettyCashVoucherRepo;
    private readonly workflowService;
    constructor(tenancyService: TenancyService, periodControlService: PeriodControlService, defaultTreasuryRepo: Repository<TreasuryDocument>, defaultPaymentMethodRepo: Repository<PaymentMethod>, defaultPettyCashVoucherRepo: Repository<PettyCashVoucher>, workflowService: WorkflowService);
    private getRepo;
    private getTreasuryRepo;
    private getPaymentMethodRepo;
    private getPettyCashVoucherRepo;
    create(createTreasuryDto: CreateTreasuryDto): Promise<TreasuryDocument>;
    findAll(companyId?: string): Promise<TreasuryDocument[]>;
    findOne(id: string): Promise<TreasuryDocument>;
    update(id: string, updateTreasuryDto: UpdateTreasuryDto, user?: any): Promise<TreasuryDocument>;
    remove(id: string, user?: any): Promise<TreasuryDocument>;
    processWorkflow(id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST', user: any, notes?: string): Promise<{
        success: boolean;
        status: import("../common/enums/workflow-status.enum").WorkflowStatus.SUBMITTED | import("../common/enums/workflow-status.enum").WorkflowStatus.APPROVED | import("../common/enums/workflow-status.enum").WorkflowStatus.REJECTED | import("../common/enums/workflow-status.enum").WorkflowStatus.POSTED;
        history: import("../common/entities/workflow-history.entity").WorkflowHistory;
    }>;
    getWorkflowHistory(id: string): Promise<import("../common/entities/workflow-history.entity").WorkflowHistory[]>;
    findAllReceipts(companyId?: string): Promise<TreasuryDocument[]>;
    createReceipt(data: any): Promise<TreasuryDocument[]>;
    findAllPayments(companyId?: string): Promise<TreasuryDocument[]>;
    createPayment(data: any): Promise<TreasuryDocument[]>;
    savePaymentMethod(data: Partial<PaymentMethod>): Promise<Partial<PaymentMethod> & PaymentMethod>;
    findAllPaymentMethods(companyId?: string): Promise<PaymentMethod[]>;
    removePaymentMethod(id: string): Promise<import("typeorm").DeleteResult>;
    getNextVoucherNumber(companyId: string): Promise<{
        number: string;
    }>;
    createVoucher(data: any, user?: any): Promise<PettyCashVoucher[]>;
    findAllVouchers(companyId?: string): Promise<PettyCashVoucher[]>;
    findOneVoucher(id: string): Promise<PettyCashVoucher | null>;
    updateVoucher(id: string, data: any): Promise<PettyCashVoucher>;
    removeVoucher(id: string): Promise<import("typeorm").DeleteResult>;
}
