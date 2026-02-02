import { Repository } from 'typeorm';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
import { SalesDocument, SalesDocumentLine } from './entities/sales-document.entity';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class SalesService {
    private readonly tenancyService;
    private readonly defaultSalesDocumentRepo;
    private readonly defaultSalesLineRepo;
    constructor(tenancyService: TenancyService, defaultSalesDocumentRepo: Repository<SalesDocument>, defaultSalesLineRepo: Repository<SalesDocumentLine>);
    private getRepo;
    private getSalesDocRepo;
    private getSalesLineRepo;
    create(createSalesDocumentDto: CreateSalesDocumentDto): Promise<SalesDocument>;
    findAll(companyId?: string): Promise<SalesDocument[]>;
    findOne(id: string): Promise<SalesDocument>;
    update(id: string, updateSalesDocumentDto: UpdateSalesDocumentDto): Promise<SalesDocument>;
    findByNumber(companyId: string, type: string, series: string, number: number): Promise<SalesDocument | null>;
    remove(id: string): Promise<SalesDocument>;
}
