import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { TaxRate } from './entities/tax-rate.entity';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';

@Injectable()
export class TaxesService {
    constructor(
        private readonly tenancyService: TenancyService,
        @InjectRepository(TaxRate)
        private readonly defaultRepo: Repository<TaxRate>,
    ) { }

    private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>, companyId?: string): Promise<Repository<T>> {
        const targetId = companyId || TenancyContext.getCompanyId();
        if (!targetId) return defaultRepo;

        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }

    private async getTaxRepo(companyId?: string) {
        return this.getRepo(TaxRate, this.defaultRepo, companyId);
    }

    async create(dto: CreateTaxRateDto) {
        const repo = await this.getTaxRepo(dto.companyId);
        const tax = repo.create(dto);
        return repo.save(tax);
    }

    async findAll(companyId?: string) {
        const targetId = companyId || TenancyContext.getCompanyId();
        const repo = await this.getTaxRepo(targetId);
        return repo.find({
            order: { code: 'ASC' }
        });
    }

    async findOne(id: string, companyId?: string) {
        const repo = await this.getTaxRepo(companyId);
        const tax = await repo.findOne({ where: { id } });
        if (!tax) throw new NotFoundException(`Tax rate with ID ${id} not found`);
        return tax;
    }

    async update(id: string, dto: UpdateTaxRateDto) {
        const repo = await this.getTaxRepo(dto.companyId);
        const tax = await this.findOne(id, dto.companyId);
        repo.merge(tax, dto);
        return repo.save(tax);
    }

    async remove(id: string, companyId?: string) {
        const repo = await this.getTaxRepo(companyId);
        const tax = await this.findOne(id, companyId);
        return repo.remove(tax);
    }

    async seedDefaults(companyId: string) {
        const repo = await this.getTaxRepo(companyId);
        const defaults = [
            { code: '00', description: 'Regime de isenção', rate: 0, type: 'IVA' },
            { code: '01', description: 'Isento (artº18)', rate: 0, type: 'IVA' },
            { code: '16', description: 'IVA Taxa Normal (16%)', rate: 16, type: 'IVA' },
            { code: '17', description: 'IVA Taxa Anterior (17%)', rate: 17, type: 'IVA' },
            { code: 'BS', description: 'Bens em segunda mão', rate: 17, type: 'IVA' },
            { code: 'OA', description: 'Objectos de arte', rate: 17, type: 'IVA' }
        ];

        for (const d of defaults) {
            const existing = await repo.findOne({ where: { code: d.code, companyId } });
            if (!existing) {
                await repo.save(repo.create({ ...d, companyId }));
            }
        }
    }
}
