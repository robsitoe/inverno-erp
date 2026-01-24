import { Repository } from 'typeorm';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';
export declare class SalesService {
    private readonly salesDocumentRepository;
    private readonly salesDocumentLineRepository;
    constructor(salesDocumentRepository: Repository<SalesDocument>, salesDocumentLineRepository: Repository<SalesDocumentLine>);
    create(createSalesDocumentDto: CreateSalesDocumentDto): Promise<SalesDocument>;
    findAll(): Promise<SalesDocument[]>;
    findOne(id: string): Promise<SalesDocument>;
    update(id: string, updateSalesDocumentDto: UpdateSalesDocumentDto): Promise<SalesDocument>;
    remove(id: string): Promise<SalesDocument>;
}
