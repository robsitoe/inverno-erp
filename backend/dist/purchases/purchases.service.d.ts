import { Repository } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseDocument } from './entities/purchase.entity';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class PurchasesService {
    private readonly tenancyService;
    private readonly defaultPurchaseRepo;
    constructor(tenancyService: TenancyService, defaultPurchaseRepo: Repository<PurchaseDocument>);
    private getRepo;
    private getPurchaseRepo;
    create(createPurchaseDto: CreatePurchaseDto): Promise<PurchaseDocument[]>;
    findAll(companyId?: string): Promise<PurchaseDocument[]>;
    findOne(id: string): Promise<PurchaseDocument | null>;
    update(id: string, updatePurchaseDto: UpdatePurchaseDto): Promise<import("typeorm").UpdateResult>;
    findByNumber(companyId: string, type: string, series: string, number: number): Promise<PurchaseDocument | null>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
