import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenancyService } from '../tenancy/tenancy.service';
import { Trip, TripStatus, StockSnapshot } from './trip.entity';
import { TruckInventory } from './truck-inventory.entity';
import { RoutePoint } from './route-point.entity';
import { SalesDocument } from '../sales/entities/sales-document.entity';
import { Between } from 'typeorm';

@Injectable()
export class TripsService {
    constructor(
        private readonly tenancyService: TenancyService,
        @InjectRepository(Trip)
        private readonly tripRepo: Repository<Trip>,
        @InjectRepository(TruckInventory)
        private readonly truckRepo: Repository<TruckInventory>,
        @InjectRepository(RoutePoint)
        private readonly routeRepo: Repository<RoutePoint>,
    ) {}

    // ── Route history (breadcrumb trail for analysis / investigations) ────────

    /** Distinct days that have route data for a truck (for the date picker) */
    async getRouteDays(companyId: string, truckPlate: string): Promise<string[]> {
        const rows = await this.routeRepo.find({
            where: { companyId, truckPlate },
            select: ['timestamp'],
            order: { timestamp: 'DESC' },
            take: 5000,
        });
        const days = new Set<string>();
        for (const r of rows) {
            days.add(new Date(r.timestamp).toISOString().slice(0, 10));
        }
        return Array.from(days);
    }

    /** Full breadcrumb trail for a truck within a day (or date range) + metrics */
    async getRouteHistory(companyId: string, truckPlate: string, from?: string, to?: string) {
        const start = from ? new Date(from + 'T00:00:00') : new Date(Date.now() - 24 * 3600 * 1000);
        const end = to ? new Date(to + 'T23:59:59') : new Date();

        const points = await this.routeRepo.find({
            where: { companyId, truckPlate, timestamp: Between(start, end) },
            order: { timestamp: 'ASC' },
            take: 10000,
        });

        const trail = points.map(p => ({
            lat: Number(p.lat),
            lng: Number(p.lng),
            timestamp: p.timestamp,
            speed: p.speed != null ? Number(p.speed) : null,
            driverId: p.driverId,
            tripId: p.tripId,
        }));

        // Metrics: distance (Haversine), duration, point count
        let distanceKm = 0;
        for (let i = 1; i < trail.length; i++) {
            distanceKm += this.haversine(trail[i - 1].lat, trail[i - 1].lng, trail[i].lat, trail[i].lng);
        }
        const durationMin = trail.length > 1
            ? Math.round((new Date(trail[trail.length - 1].timestamp).getTime() - new Date(trail[0].timestamp).getTime()) / 60000)
            : 0;

        return {
            truckPlate,
            from: start,
            to: end,
            pointCount: trail.length,
            distanceKm: +distanceKm.toFixed(2),
            durationMinutes: durationMin,
            firstSeen: trail[0]?.timestamp || null,
            lastSeen: trail[trail.length - 1]?.timestamp || null,
            trail,
        };
    }

    private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Tenant-scoped sales repository (sales live in the per-company datasource) */
    private async salesRepo(companyId: string): Promise<Repository<SalesDocument>> {
        const ds = await this.tenancyService.getTenantDataSource(companyId);
        return ds.getRepository(SalesDocument);
    }

    /**
     * Live fleet view: every truck phone that has reported GPS for this company.
     * Each truck = one phone reporting via POST /mobile/driver/status.
     */
    async getLiveFleet(companyId: string) {
        const trucks = await this.truckRepo.find({ where: { companyId } });
        const now = Date.now();

        const openTrips = (await this.tripRepo.find({ where: { companyId } }))
            .filter(t => t.status === 'OUT' || t.status === 'LOADED');
        const tripByPlate: Record<string, Trip> = {};
        for (const t of openTrips) tripByPlate[t.truckPlate] = t;

        // Deduplicate: one marker per driver (keep most recently updated).
        // Trucks without a driver are keyed by plate.
        const byKey = new Map<string, TruckInventory>();
        for (const t of trucks) {
            if (t.lastLat == null || t.lastLng == null) continue;
            const key = t.driverId ? `D:${t.driverId}` : `P:${t.truckPlate}`;
            const prev = byKey.get(key);
            if (!prev || new Date(t.lastUpdate || 0) > new Date(prev.lastUpdate || 0)) {
                byKey.set(key, t);
            }
        }

        return Array.from(byKey.values())
            .map(t => {
                const last = t.lastUpdate ? new Date(t.lastUpdate).getTime() : 0;
                const ageMin = last ? Math.round((now - last) / 60000) : null;
                const trip = tripByPlate[t.truckPlate];
                const inv = (t.inventory || {}) as Record<string, any>;
                const totalFull = Object.values(inv).reduce((s: number, v: any) => s + (v?.full || 0), 0);
                return {
                    truckPlate: t.truckPlate,
                    driverId: t.driverId,
                    lat: Number(t.lastLat),
                    lng: Number(t.lastLng),
                    lastUpdate: t.lastUpdate,
                    ageMinutes: ageMin,
                    online: ageMin != null && ageMin <= 5,
                    onTrip: !!trip,
                    tripId: trip?.id || null,
                    driverName: trip?.driverName || null,
                    cylindersOnBoard: totalFull,
                    inventory: inv,
                };
            });
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
