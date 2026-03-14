import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { GasCylinderType, GasDailyControl, GasDailyEntry } from './gas-control.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';
import { InventoryService } from '../inventory/inventory.service';
import { Article } from '../inventory/entities/article.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';

@Injectable()
export class GasControlService {
    constructor(
        @InjectRepository(GasCylinderType)
        private readonly defaultTypeRepo: Repository<GasCylinderType>,
        @InjectRepository(GasDailyControl)
        private readonly defaultControlRepo: Repository<GasDailyControl>,
        @InjectRepository(GasDailyEntry)
        private readonly defaultEntryRepo: Repository<GasDailyEntry>,
        @InjectRepository(Article)
        private readonly defaultArticleRepo: Repository<Article>,
        @InjectRepository(StockMovement)
        private readonly defaultStockMovementRepo: Repository<StockMovement>,
        private readonly tenancyService: TenancyService,
        private readonly inventoryService: InventoryService,
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
        const cid = companyId || TenancyContext.getCompanyId();
        return repo.find({ where: { companyId: cid, isActive: true } });
    }

    async getDailyControl(date: string, companyId?: string) {
        const cid = companyId || TenancyContext.getCompanyId();
        const controlRepo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);
        const entryRepo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, cid);

        let control = await controlRepo.findOne({ where: { date, companyId: cid } });
        if (!control) {
            // Day not registered. Look for rollover from last closed day
            const lastControl = await controlRepo.createQueryBuilder('c')
                .where('c.date < :date AND c.companyId = :cid', { date, cid })
                .orderBy('c.date', 'DESC')
                .getOne();

            let initialStock = {};
            if (lastControl && lastControl.finalStock) {
                initialStock = lastControl.finalStock;
            }

            return {
                control: {
                    date,
                    companyId: cid,
                    status: 'NOT_STARTED',
                    initialStock
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

    async reopenDaily(id: string, user: string, companyId?: string) {
        const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
        const control = await repo.findOne({ where: { id } });
        if (!control) throw new NotFoundException('Control not found');

        control.status = 'OPENED';
        if (!control.auditLog) control.auditLog = [];
        control.auditLog.push({
            type: 'REOPEN',
            user,
            timestamp: new Date(),
            summary: 'O documento foi reaberto para edição.'
        });

        return repo.save(control);
    }

    async updateStocks(controlId: string, initialStock: any, finalStock: any, user: string, companyId?: string) {
        const repo = await this.getRepo(GasDailyControl, this.defaultControlRepo, companyId);
        const cid = companyId || TenancyContext.getCompanyId();
        const control = await repo.findOne({ where: { id: controlId, companyId: cid } });
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

        // PROPAGATE TO FOLLOWING DAYS recursively
        await this.propagateStockToFollowingDays(control.date, finalStock, cid as string, repo);

        // SYNC TO GENERAL INVENTORY
        await this.syncGasInventoryToArticles(finalStock, control.date, cid as string);

        return saved;
    }

    async syncGasInventoryToArticles(finalStock: any, date: string, companyId: string) {
        console.log(`[GasSync] Starting sync for ${date} (Company: ${companyId})`);
        
        // 1. Get all gas cylindertypes FOR THIS COMPANY
        const cylinderTypes = await this.getCylinderTypes(companyId);
        console.log(`[GasSync] Found ${cylinderTypes.length} cylinder types`);

        if (cylinderTypes.length === 0) {
            console.warn(`[GasSync] No cylinder types found for company ${companyId}. Sync aborted.`);
            return;
        }

        const smRepo = await this.getRepo(StockMovement, this.defaultStockMovementRepo, companyId);
        const artRepo = await this.getRepo(Article, this.defaultArticleRepo, companyId);

        for (const type of cylinderTypes) {
            // Support both direct keys and physicalManeio fallback
            let stockData = finalStock[type.name];
            if (!stockData && finalStock.footers?.physicalManeio) {
                stockData = {
                    gpl: finalStock.footers.physicalManeio[type.name] || 0
                };
            }

            if (!stockData) {
                console.log(`[GasSync] No stock data for type ${type.name} in finalStock. Skipping.`);
                continue;
            }

            const states = [
                { suffix: 'CHEIA', name: 'CHEIA', key: 'gpl', customCode: type.fullArticleCode },
                { suffix: 'VAZIA', name: 'VAZIA', key: 'empty', customCode: type.emptyArticleCode },
                { suffix: 'AVARIADA', name: 'AVARIADA', key: 'damaged', customCode: type.damagedArticleCode }
            ];

            for (const state of states) {
                const articleCode = state.customCode || `GAS-${type.name}-${state.suffix}`;
                const articleName = `GÁS ${type.name} (${state.name})`;
                const targetQty = Number(stockData[state.key]) || 0;

                try {
                    let article = await artRepo.findOne({ where: { code: articleCode, companyId } });
                    
                    if (!article) {
                        console.log(`[GasSync] Creating article ${articleCode}`);
                        article = artRepo.create({
                            companyId,
                            code: articleCode,
                            name: articleName,
                            description: `Cilindro de Gás ${type.name} - Estado: ${state.name}`,
                            familyId: 'GAS',
                            type: 'PRODUCT',
                            unit: 'UN',
                            salePrice: type.priceConsumidor || 0,
                            purchasePrice: type.priceRevendedor || 0,
                            stockControl: true,
                            currentStock: 0,
                            isActive: true
                        });
                        await artRepo.save(article);
                    }

                    // 1. Get current balance up to this date
                    const currentBalance = await this.inventoryService.getStockBalanceAtDate(articleCode, date, 'ARM01', companyId);

                    // 2. Find existing sync movement for this day
                    const syncRef = `GAS-INV-SYNC`;
                    const existingSync = await smRepo.findOne({ 
                        where: { articleCode, date, reference: syncRef, companyId } 
                    });

                    const currentSyncQty = existingSync ? Number(existingSync.quantity) : 0;
                    const balanceWithoutThisSync = currentBalance - currentSyncQty;
                    const neededAdjustment = targetQty - balanceWithoutThisSync;

                    console.log(`[GasSync] ${articleCode} | Target: ${targetQty} | Balance: ${currentBalance} | SyncQty: ${currentSyncQty} | Needed: ${neededAdjustment}`);

                    if (neededAdjustment !== 0 || !existingSync) {
                        if (existingSync) {
                            console.log(`[GasSync] Updating existing sync ${existingSync.id}`);
                            existingSync.quantity = neededAdjustment;
                            existingSync.unitCost = type.priceRevendedor || 0;
                            existingSync.totalCost = neededAdjustment * (type.priceRevendedor || 0);
                            await smRepo.save(existingSync);
                        } else if (neededAdjustment !== 0) {
                            console.log(`[GasSync] Creating new sync movement`);
                            await this.inventoryService.createStockMovement({
                                companyId,
                                date,
                                articleId: article.id,
                                articleCode: article.code,
                                articleName: article.name,
                                warehouseId: 'ARM01',
                                movementType: 'ADJUSTMENT' as any,
                                quantity: neededAdjustment,
                                unitCost: type.priceRevendedor || 0,
                                totalCost: neededAdjustment * (type.priceRevendedor || 0),
                                reference: syncRef,
                                notes: 'Sincronização Automática via Controlo de Gás'
                            });
                        }
                    }
                    
                    // Sync Article.currentStock property just to be sure
                    const currentActualArticleStock = await this.inventoryService.getStockBalanceAtDate(articleCode, '2099-12-31', 'ARM01', companyId);
                    if (Number(article.currentStock) !== currentActualArticleStock) {
                        article.currentStock = currentActualArticleStock;
                        await artRepo.save(article);
                    }

                    // Ensure article prices and category are always updated
                    if (Number(article.purchasePrice) !== Number(type.priceRevendedor) || article.familyId !== 'GAS') {
                        await artRepo.update(article.id, {
                            purchasePrice: type.priceRevendedor || 0,
                            salePrice: type.priceConsumidor || 0,
                            familyId: 'GAS'
                        });
                    }

                } catch (err) {
                    console.error(`[GasSync] Error syncing ${articleCode}:`, err);
                }
            }
        }
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

    async getStatistics(from: string, to: string, companyId?: string) {
        const cid = companyId || TenancyContext.getCompanyId();
        const controlRepo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);
        const entryRepo = await this.getRepo(GasDailyEntry, this.defaultEntryRepo, cid);

        const controls = await controlRepo.createQueryBuilder('c')
            .where('c.date >= :from AND c.date <= :to AND c.companyId = :cid', { from, to, cid })
            .orderBy('c.date', 'ASC')
            .getMany();

        if (controls.length === 0) return { salesByType: {}, dailyAverages: {}, totals: { vds: 0, invoices: 0 } };

        const controlIds = controls.map(c => c.id);
        const entries = await entryRepo.createQueryBuilder('e')
            .where('e.controlId IN (:...controlIds) AND e.companyId = :cid', { controlIds, cid })
            .getMany();

        const stats = {
            period: { from, to, days: controls.length },
            salesByType: {} as any,
            dailyAverages: {} as any,
            vdsTotal: 0,
            invoicesTotal: 0,
            stockTrend: controls.map(c => ({ date: c.date, stock: c.finalStock }))
        };

        const cylinderTypes = await this.getCylinderTypes(cid as string);
        
        cylinderTypes.forEach(t => {
            const typeEntries = entries.filter(e => e.cylinderTypeId === t.id);
            const qtySold = typeEntries.reduce((acc, e) => acc + (Number(e.s_gpl) || 0) + (Number(e.vz_vend) || 0), 0);
            const valVds = typeEntries.reduce((acc, e) => acc + ((!e.invoice && !e.gr) ? Number(e.totalAmount) || 0 : 0), 0);
            const valInv = typeEntries.reduce((acc, e) => acc + (e.invoice ? Number(e.totalAmount) || 0 : 0), 0);

            stats.salesByType[t.name] = {
                quantity: qtySold,
                vds: valVds,
                invoices: valInv,
                total: valVds + valInv
            };

            stats.dailyAverages[t.name] = (qtySold / controls.length).toFixed(2);
            stats.vdsTotal += valVds;
            stats.invoicesTotal += valInv;
        });

        return stats;
    }

    private async propagateStockToFollowingDays(date: string, finalStock: any, companyId: string, repo: any) {
        let currentDate = new Date(date);
        currentDate.setUTCHours(12, 0, 0, 0);
        
        // Propagate to the next 15 days if they exist. Sequential updates.
        for (let i = 0; i < 15; i++) {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            const nextControl = await repo.findOne({ where: { date: dateStr, companyId } });
            if (!nextControl) break; 
            
            // Only update if actually different
            if (JSON.stringify(nextControl.initialStock) !== JSON.stringify(finalStock)) {
                nextControl.initialStock = finalStock;
                await repo.save(nextControl);
            }
            
            // If the next day is CLOSED, we usually don't want to mess with its finalStock 
            // unless we had a specific requirement to cascade balances. 
            // However, the standard behavior is that the user must re-open and re-save 
            // the next day if they change something in the past that affects the future.
            
            // Since the user is complaining about Carry-overs, we stop at CLOSED days 
            // as they represent a "snapshot" taken by the user.
            if (nextControl.status === 'CLOSED') break;
        }
    }

    async reSyncAllDays(companyId?: string) {
        const cid = companyId || TenancyContext.getCompanyId();
        console.log(`[GasSync] Starting BATCH re-sync for company ${cid}`);
        
        const controlRepo = await this.getRepo(GasDailyControl, this.defaultControlRepo, cid);

        const controls = await controlRepo.find({
            where: { companyId: cid },
            order: { date: 'ASC' }
        });

        console.log(`[GasSync] Found ${controls.length} controls to process`);

        let count = 0;
        for (const control of controls) {
            // We sync even if finalStock is sparse, because of our new fallback logic
            if (control.finalStock) {
                await this.syncGasInventoryToArticles(control.finalStock, control.date, cid as string);
                count++;
            }
        }
        return { message: `${count} dias sincronizados com sucesso`, count };
    }
}
