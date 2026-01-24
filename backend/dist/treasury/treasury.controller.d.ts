import { TreasuryService } from './treasury.service';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
export declare class TreasuryController {
    private readonly treasuryService;
    constructor(treasuryService: TreasuryService);
    create(createTreasuryDto: CreateTreasuryDto): Promise<import("./entities/treasury.entity").TreasuryDocument>;
    findAll(): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    findOne(id: string): Promise<import("./entities/treasury.entity").TreasuryDocument | null>;
    update(id: string, updateTreasuryDto: UpdateTreasuryDto): Promise<import("typeorm").UpdateResult>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    findAllReceipts(): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    createReceipt(data: any): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    findAllPayments(): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
    createPayment(data: any): Promise<import("./entities/treasury.entity").TreasuryDocument[]>;
}
