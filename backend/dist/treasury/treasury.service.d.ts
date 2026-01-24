import { Repository } from 'typeorm';
import { CreateTreasuryDto } from './dto/create-treasury.dto';
import { UpdateTreasuryDto } from './dto/update-treasury.dto';
import { TreasuryDocument } from './entities/treasury.entity';
export declare class TreasuryService {
    private treasuryRepository;
    constructor(treasuryRepository: Repository<TreasuryDocument>);
    create(createTreasuryDto: CreateTreasuryDto): Promise<TreasuryDocument>;
    findAll(): Promise<TreasuryDocument[]>;
    findOne(id: string): Promise<TreasuryDocument | null>;
    update(id: string, updateTreasuryDto: UpdateTreasuryDto): Promise<import("typeorm").UpdateResult>;
    remove(id: string): Promise<import("typeorm").DeleteResult>;
    findAllReceipts(): Promise<TreasuryDocument[]>;
    createReceipt(data: any): Promise<TreasuryDocument[]>;
    findAllPayments(): Promise<TreasuryDocument[]>;
    createPayment(data: any): Promise<TreasuryDocument[]>;
}
