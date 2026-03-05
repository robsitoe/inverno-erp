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
            // Day not registered. We just return a skeleton with NOT_STARTED status
            // We don't save it yet!
            return {
                control: {
                    date,
                    companyId: cid,
                    status: 'NOT_STARTED',
                    initialStock: {}
                } as any,
                entries: []
            };
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

    async openDaily(date: string, user: string, companyId?: string) {
        const cid = companyId || TenancyContext.getCompanyId();
        const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);

        let control = await repo.findOne({ where: { date, companyId: cid } });

        if (control) {
            if (control.status === 'NOT_STARTED' || !control.status) {
                control.status = 'OPENED';
                control.openedBy = user;
                control.openedAt = new Date();
                return repo.save(control);
            }
            return control; // Already OPENED or CLOSED
        }

        // Roll over from last closed day
        const lastControl = await repo.createQueryBuilder('c')
            .where('c.date < :date AND c.companyId = :cid', { date, cid })
            .orderBy('c.date', 'DESC')
            .getOne();

        let initialStock = {};
        if (lastControl && lastControl.finalStock) {
            initialStock = lastControl.finalStock;
        }

        control = repo.create({
            id: `GAS-${date}-${cid}`,
            date,
            companyId: cid,
            status: 'OPENED',
            openedBy: user,
            openedAt: new Date(),
            initialStock,
            finalStock: {},
            auditLog: []
        });

        return repo.save(control);
    }

    async closeDaily(id: string, user: string, companyId?: string) {
        const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
        const control = await repo.findOne({ where: { id } });
        if (!control) throw new NotFoundException('Control not found');

        control.status = 'CLOSED';
        control.closedBy = user;
        control.closedAt = new Date();

        return repo.save(control);
    }

    async updateStocks(controlId: string, initialStock: any, finalStock: any, user: string, companyId?: string) {
        const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
        const control = await repo.findOne({ where: { id: controlId } });
        if (!control) throw new NotFoundException('Control not found');

        const isReopeningLog = control.status === 'CLOSED';

        control.initialStock = initialStock;
        control.finalStock = finalStock;

        if (isReopeningLog) {
            if (!control.auditLog) control.auditLog = [];

            // Generate a more descriptive summary of what changed
            let diffDetails = 'Alteração de: ';
            const changes: string[] = [];

            // Check for stock changes in keys (cylinder types)
            for (const key of Object.keys(finalStock || {})) {
                if (key === 'footers') continue;
                const oldGpl = control.finalStock?.[key]?.gpl || 0;
                const newGpl = finalStock[key]?.gpl || 0;
                if (oldGpl !== newGpl) {
                    changes.push(`${key} (GPL: ${oldGpl}->${newGpl})`);
                }
            }

            // Check for physical cash changes
            const oldCash = control.finalStock?.footers?.closingBalance || 0;
            const newCash = finalStock?.footers?.closingBalance || 0;
            if (oldCash !== newCash) {
                changes.push(`Numerário (${oldCash}->${newCash})`);
            }

            control.auditLog.push({
                type: 'EDIT_AFTER_CLOSURE',
                user,
                timestamp: new Date(),
                summary: changes.length > 0 ? `Alterações: ${changes.join(', ')}` : 'Sincronização de dados (sem alteração de valores críticos)'
            });
        }

        const saved = await repo.save(control);

        // PROPAGATE TO NEXT DAY if it exists
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
