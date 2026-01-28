import { Repository } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseDocument } from './entities/purchase.entity';
export declare class PurchasesService {
    private purchaseRepository;
    constructor(purchaseRepository: Repository<PurchaseDocument>);
    create(createPurchaseDto: CreatePurchaseDto): Promise<PurchaseDocument[]>;
    findAll(companyId?: string): Promise<PurchaseDocument[]>;
    findOne(id: string): Promise<PurchaseDocument | null>;
    update(id: string, updatePurchaseDto: UpdatePurchaseDto): Promise<import("typeorm").UpdateResult>;
    findByNumber(companyId: string, type: string, series: string, number: number): Promise<PurchaseDocument | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
