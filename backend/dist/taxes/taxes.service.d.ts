import { Repository } from 'typeorm';
import { TaxRate } from './entities/tax-rate.entity';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class TaxesService {
    private readonly tenancyService;
    private readonly defaultRepo;
    constructor(tenancyService: TenancyService, defaultRepo: Repository<TaxRate>);
    private getRepo;
    private getTaxRepo;
    create(dto: CreateTaxRateDto): Promise<TaxRate>;
    findAll(companyId?: string): Promise<TaxRate[]>;
    findOne(id: string, companyId?: string): Promise<TaxRate>;
    update(id: string, dto: UpdateTaxRateDto): Promise<TaxRate>;
    remove(id: string, companyId?: string): Promise<TaxRate>;
    seedDefaults(companyId: string): Promise<void>;
}
