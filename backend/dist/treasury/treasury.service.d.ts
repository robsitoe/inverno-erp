import { Repository } from 'typeorm';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
import { TreasuryDocument } from './entities/treasury.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class TreasuryService {
    private readonly tenancyService;
    private readonly defaultTreasuryRepo;
    private readonly defaultPaymentMethodRepo;
    constructor(tenancyService: TenancyService, defaultTreasuryRepo: Repository<TreasuryDocument>, defaultPaymentMethodRepo: Repository<PaymentMethod>);
    private getRepo;
    private getTreasuryRepo;
    private getPaymentMethodRepo;
    create(createTreasuryDto: CreateTreasuryDto): Promise<TreasuryDocument>;
    findAll(companyId?: string): Promise<TreasuryDocument[]>;
    findOne(id: string): Promise<TreasuryDocument>;
    update(id: string, updateTreasuryDto: UpdateTreasuryDto): Promise<import("typeorm").UpdateResult>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    findAllReceipts(companyId?: string): Promise<TreasuryDocument[]>;
    createReceipt(data: any): Promise<TreasuryDocument[]>;
    findAllPayments(companyId?: string): Promise<TreasuryDocument[]>;
    createPayment(data: any): Promise<TreasuryDocument[]>;
    savePaymentMethod(data: Partial<PaymentMethod>): Promise<Partial<PaymentMethod> & PaymentMethod>;
    findAllPaymentMethods(companyId?: string): Promise<PaymentMethod[]>;
    removePaymentMethod(id: string): Promise<import("typeorm").DeleteResult>;
}
