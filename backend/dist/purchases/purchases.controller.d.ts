import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
export declare class PurchasesController {
    private readonly purchasesService;
    constructor(purchasesService: PurchasesService);
    create(createPurchaseDto: CreatePurchaseDto): Promise<import("./entities/purchase.entity").PurchaseDocument>;
    findAll(): Promise<import("./entities/purchase.entity").PurchaseDocument[]>;
    findOne(id: string): Promise<import("./entities/purchase.entity").PurchaseDocument | null>;
    update(id: string, updatePurchaseDto: UpdatePurchaseDto): Promise<import("typeorm").UpdateResult>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
}
