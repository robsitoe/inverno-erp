import { TreasuryService } from './treasury.service';
import { PaymentMethod } from './entities/payment-method.entity';
export declare class PaymentMethodsController {
    private readonly treasuryService;
    constructor(treasuryService: TreasuryService);
    create(data: Partial<PaymentMethod>): Promise<Partial<PaymentMethod> & PaymentMethod>;
    findAll(companyId?: string): Promise<PaymentMethod[]>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
