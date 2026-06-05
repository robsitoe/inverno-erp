import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenancyService } from '../tenancy/tenancy.service';
import { Trip, TripStatus, StockSnapshot } from './trip.entity';
import { TruckInventory } from './truck-inventory.entity';
import { SalesDocument } from '../sales/entities/sales-document.entity';

@Injectable()
export class TripsService {
    constructor(
        private readonly tenancyService: TenancyService,
        @InjectRepository(Trip)
        private readonly tripRepo: Repository<Trip>,
        @InjectRepository(TruckInventory)
        private readonly truckRepo: Repository<TruckInventory>,
    ) {}

    /** Tenant-scoped sales repository (sales live in the per-company datasource) */
    private async salesRepo(companyId: string): Promise<Repository<SalesDocument>> {
        const ds = await this.tenancyService.getTenantDataSource(companyId);
        return ds.getRepository(SalesDocument);
    }

    /** The driver's currently active (non-closed) trip, if any */
    async getActiveTrip(driverId: string, companyId: string): Promise<Trip | null> {
        const open = await this.tripRepo.find({
            where: { driverId, companyId },
            order: { createdAt: 'DESC' },
            take: 5,
        });
        return open.find(t => t.status === 'LOADED' || t.status === 'OUT') || null;
    }

    /**
     * Warehouse keeper loads the truck → opens a trip.
     * Also sets the truck inventory (SET mode) to the loaded amounts.
     */
    async openTrip(
        companyId: string,
        data: {
            truckPlate: string;
            driverId?: string;
            driverName?: string;
            loadedOut: StockSnapshot;
            openedBy?: string;
            notes?: string;
        },
    ): Promise<Trip> {
        if (!data.truckPlate) throw new BadRequestException('Matrícula da viatura é obrigatória.');

        const existingOpen = (await this.tripRepo.find({ where: { truckPlate: data.truckPlate, companyId } }))
            .find(t => t.status === 'LOADED' || t.status === 'OUT');
        if (existingOpen) {
            throw new BadRequestException(`A viatura ${data.truckPlate} já tem uma viagem em curso (${existingOpen.id}).`);
        }

        const count = await this.tripRepo.count({ where: { companyId } });
        const trip = this.tripRepo.create({
            id: `TRIP-${Date.now()}`,
            companyId,
            tripNumber: count + 1,
            truckPlate: data.truckPlate,
            driverId: data.driverId,
            driverName: data.driverName,
            status: 'OUT',
            loadedOut: data.loadedOut || {},
            openedBy: data.openedBy,
            openedAt: new Date(),
            notes: data.notes,
            expectedCash: 0,
            declaredCash: 0,
            depositedCash: 0,
            salesCount: 0,
            cylindersSold: 0,
        });
        await this.tripRepo.save(trip);

        // Sync truck inventory to the loaded amounts (root store, same as mobile.service)
        let truck = await this.truckRepo.findOne({ where: { truckPlate: data.truckPlate, companyId } });
        if (!truck) {
            truck = this.truckRepo.create({
                id: `TRUCK-${data.truckPlate}-${companyId}`,
                truckPlate: data.truckPlate,
                companyId,
            });
        }
        truck.inventory = data.loadedOut || {};
        if (data.driverId) truck.driverId = data.driverId;
        truck.lastUpdate = new Date();
        await this.truckRepo.save(truck);

        return trip;
    }

    /** Recompute sales aggregates for a trip from posted sales documents */
    async refreshTripSales(tripId: string, companyId: string): Promise<Trip> {
        const trip = await this.tripRepo.findOne({ where: { id: tripId, companyId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada.');

        const sales = await this.salesRepo(companyId);
        const docs = await sales.find({ where: { tripId, companyId }, relations: ['lines'] });
        let totalCash = 0;
        let cylinders = 0;
        for (const d of docs) {
            totalCash += parseFloat(String(d.total)) || 0;
            for (const l of (d.lines || [])) cylinders += Number(l.quantity) || 0;
        }
        trip.salesCount = docs.length;
        trip.expectedCash = totalCash;
        trip.cylindersSold = cylinders;
        return this.tripRepo.save(trip);
    }

    /**
     * Warehouse keeper registers what came back → reconciles cylinders.
     */
    async closeTripReturn(
        companyId: string,
        tripId: string,
        data: { returnedStock: StockSnapshot; declaredCash?: number; closedBy?: string; notes?: string },
    ) {
        const trip = await this.tripRepo.findOne({ where: { id: tripId, companyId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada.');

        await this.refreshTripSales(tripId, companyId);
        const fresh = await this.tripRepo.findOne({ where: { id: tripId, companyId } });

        fresh!.returnedStock = data.returnedStock || {};
        if (data.declaredCash !== undefined) fresh!.declaredCash = data.declaredCash;
        fresh!.closedBy = data.closedBy;
        fresh!.returnedAt = new Date();
        fresh!.status = 'RETURNED';
        if (data.notes) fresh!.notes = data.notes;
        await this.tripRepo.save(fresh!);

        const truck = await this.truckRepo.findOne({ where: { truckPlate: fresh!.truckPlate, companyId } });
        if (truck) {
            truck.inventory = data.returnedStock || {};
            truck.lastUpdate = new Date();
            await this.truckRepo.save(truck);
        }

        return this.buildReconciliation(fresh!);
    }

    /** Cashier confirms cash received → marks RECONCILED */
    async reconcileCash(
        companyId: string,
        tripId: string,
        data: { declaredCash: number; cashReceivedBy?: string },
    ) {
        const trip = await this.tripRepo.findOne({ where: { id: tripId, companyId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada.');
        trip.declaredCash = data.declaredCash;
        trip.cashReceivedBy = data.cashReceivedBy;
        trip.status = 'RECONCILED';
        await this.tripRepo.save(trip);
        return this.buildReconciliation(trip);
    }

    /** Deposits team registers a bank deposit against the trip cash */
    async registerDeposit(companyId: string, tripId: string, amount: number) {
        const trip = await this.tripRepo.findOne({ where: { id: tripId, companyId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada.');
        trip.depositedCash = (parseFloat(String(trip.depositedCash)) || 0) + (amount || 0);
        if (trip.depositedCash >= (parseFloat(String(trip.declaredCash)) || 0) && trip.declaredCash > 0) {
            trip.status = 'DEPOSITED';
        }
        await this.tripRepo.save(trip);
        return this.buildReconciliation(trip);
    }

    async listTrips(companyId: string, status?: TripStatus) {
        const all = await this.tripRepo.find({
            where: status ? { companyId, status } : { companyId },
            order: { createdAt: 'DESC' },
            take: 100,
        });
        return all.map(t => this.buildReconciliation(t));
    }

    async getTrip(companyId: string, tripId: string) {
        const trip = await this.tripRepo.findOne({ where: { id: tripId, companyId } });
        if (!trip) throw new NotFoundException('Viagem não encontrada.');
        await this.refreshTripSales(tripId, companyId);
        const fresh = await this.tripRepo.findOne({ where: { id: tripId, companyId } });
        return this.buildReconciliation(fresh!);
    }

    /**
     * Computes the dual reconciliation (cylinders + cash).
     */
    private buildReconciliation(trip: Trip) {
        const loaded = trip.loadedOut || {};
        const returned = trip.returnedStock || {};

        const types = new Set([...Object.keys(loaded), ...Object.keys(returned)]);
        const cylinderLines = Array.from(types).map(type => {
            const lFull = loaded[type]?.full || 0;
            const rFull = returned[type]?.full || 0;
            const rEmpty = returned[type]?.empty || 0;
            const soldFull = Math.max(0, lFull - rFull);
            const emptyGap = soldFull - rEmpty; // >0 means empties missing
            return { type, loadedFull: lFull, returnedFull: rFull, returnedEmpty: rEmpty, soldFull, emptyGap };
        });

        const expectedCash = parseFloat(String(trip.expectedCash)) || 0;
        const declaredCash = parseFloat(String(trip.declaredCash)) || 0;
        const depositedCash = parseFloat(String(trip.depositedCash)) || 0;

        return {
            ...trip,
            reconciliation: {
                cylinders: cylinderLines,
                cash: {
                    expected: expectedCash,
                    declared: declaredCash,
                    deposited: depositedCash,
                    cashDifference: +(declaredCash - expectedCash).toFixed(2),
                    pendingDeposit: +(declaredCash - depositedCash).toFixed(2),
                },
                balanced:
                    Math.abs(declaredCash - expectedCash) < 1 &&
                    cylinderLines.every(c => c.emptyGap === 0),
            },
        };
    }
}
