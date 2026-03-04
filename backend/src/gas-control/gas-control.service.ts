import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { GasCylinderType, GasDailyControl, GasDailyEntry } from './gas-control.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';

@Injectable()
export class GasControlService {
    constructor(
        @InjectRepository(GasCylinderType)
        private readonly defaultTypeRepo: Repository<GasCylinderType>,
        @InjectRepository(GasDailyControl)
        private readonly defaultControlRepo: Repository<GasDailyControl>,
        @InjectRepository(GasDailyEntry)
        private readonly defaultEntryRepo: Repository<GasDailyEntry>,
        private readonly tenancyService: TenancyService,
    ) { }

    private async getRepo<T extends ObjectLiteral>(
        entity: EntityTarget<T>,
        defaultRepo: Repository<T>,
        companyId?: string,
    ): Promise<Repository<T>> {
        const targetId = companyId || TenancyContext.getCompanyId();
        if (!targetId) return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }

    async getCylinderTypes(companyId?: string) {
        const repo = await this.getRepo(GasCylinderType, this.defaultTypeRepo, companyId);
        return repo.find({ where: { companyId: companyId || TenancyContext.getCompanyId(), isActive: true } });
    }

    async getDailyControl(date: string, companyId?: string) {
        const cid = companyId || TenancyContext.getCompanyId();
        const controlRepo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);
        const entryRepo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, cid);

        let control = await controlRepo.findOne({ where: { date, companyId: cid } });
        if (!control) {
            // New day! Let's find the closing of the last registered day
            const lastControl = await controlRepo.createQueryBuilder('c')
                .where('c.date < :date AND c.companyId = :cid', { date, cid })
                .orderBy('c.date', 'DESC')
                .getOne();

            let initialStock = {};
            if (lastControl && lastControl.finalStock) {
                // The closing of yesterday (or the last day) is the opening of today
                initialStock = lastControl.finalStock;
            }

            control = controlRepo.create({
                id: `GAS-${date}-${cid}`,
                date,
                companyId: cid,
                initialStock,
                finalStock: {}
            });
            await controlRepo.save(control);
        }

        const entries = await entryRepo.find({ where: { controlId: control.id, companyId: cid } });
        return { control, entries };
    }

    async saveEntry(data: any, companyId?: string) {
        const cid = companyId || TenancyContext.getCompanyId();
        const repo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, cid);
        if (!data.id) {
            data.id = `GDE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        data.companyId = cid;
        return repo.save(data);
    }

    async deleteEntry(id: string, companyId?: string) {
        const repo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, companyId);
        return repo.delete(id);
    }

    async updateStocks(controlId: string, initialStock: any, finalStock: any, companyId?: string) {
        const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
        const control = await repo.findOne({ where: { id: controlId } });
        if (!control) throw new NotFoundException('Control not found');

        control.initialStock = initialStock;
        control.finalStock = finalStock;
        const saved = await repo.save(control);

        // PROPAGATE TO NEXT DAY AUTOMATICALLY
        const cid = companyId || control.companyId;
        const nextDate = new Date(control.date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        const nextControl = await repo.findOne({ where: { date: nextDateStr, companyId: cid } });
        if (nextControl) {
            nextControl.initialStock = finalStock;
            await repo.save(nextControl);
        }

        return saved;
    }

    async saveCylinderType(data: any, companyId?: string) {
        const cid = companyId || TenancyContext.getCompanyId();
        const repo = await this.getRepo(GasCylinderType, this.defaultTypeRepo, cid);
        if (!data.id) {
            data.id = `${data.name}-${cid}`;
        }
        data.companyId = cid;
        return repo.save(data);
    }
}
