import { TaxesService } from './taxes.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
export declare class TaxesController {
    private readonly taxesService;
    constructor(taxesService: TaxesService);
    create(createDto: CreateTaxRateDto): Promise<import("./entities/tax-rate.entity").TaxRate>;
    findAll(companyId?: string): Promise<import("./entities/tax-rate.entity").TaxRate[]>;
    findOne(id: string, companyId?: string): Promise<import("./entities/tax-rate.entity").TaxRate>;
    update(id: string, updateDto: UpdateTaxRateDto): Promise<import("./entities/tax-rate.entity").TaxRate>;
    remove(id: string, companyId?: string): Promise<import("./entities/tax-rate.entity").TaxRate>;
    seed(companyId: string): Promise<void>;
}
