import { SalesService } from './sales.service';
import { CreateSalesDocumentDto } from './dto/create-sales-document.dto';
import { UpdateSalesDocumentDto } from './dto/update-sales-document.dto';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    create(createSalesDocumentDto: CreateSalesDocumentDto): Promise<import("./entities/sales-document.entity").SalesDocument>;
    findAll(): Promise<import("./entities/sales-document.entity").SalesDocument[]>;
    findOne(id: string): Promise<import("./entities/sales-document.entity").SalesDocument>;
    update(id: string, updateSalesDocumentDto: UpdateSalesDocumentDto): Promise<import("./entities/sales-document.entity").SalesDocument>;
    remove(id: string): Promise<import("./entities/sales-document.entity").SalesDocument>;
}
