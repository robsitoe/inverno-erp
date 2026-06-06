import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { LicenseGuard } from '../auth/guards/license.guard';

/**
 * Web-facing (ERP back-office) controller for vehicle trip reconciliation.
 * Used by the warehouse keeper (fiel), cashier and deposits team.
 * Guarded with LicenseGuard and scoped by companyId query param — same
 * pattern as accounting/treasury controllers.
 */
@ApiTags('trips')
@Controller('trips')
@UseGuards(LicenseGuard)
export class TripsWebController {
    constructor(private readonly tripsService: TripsService) {}

    @Get()
    @ApiOperation({ summary: 'List vehicle trips (optionally by status)' })
    list(@Query('companyId') companyId: string, @Query('status') status?: any) {
        return this.tripsService.listTrips(companyId, status);
    }

    @Get('fleet/live')
    @ApiOperation({ summary: 'Live GPS positions of all truck phones for the company' })
    liveFleet(@Query('companyId') companyId: string) {
        return this.tripsService.getLiveFleet(companyId);
    }

    @Get('fleet/route-days')
    @ApiOperation({ summary: 'Days that have recorded route data for a truck' })
    routeDays(@Query('companyId') companyId: string, @Query('truckPlate') truckPlate: string) {
        return this.tripsService.getRouteDays(companyId, truckPlate);
    }

    @Get('fleet/route')
    @ApiOperation({ summary: 'Historical route trail for a truck (with distance/duration)' })
    routeHistory(
        @Query('companyId') companyId: string,
        @Query('truckPlate') truckPlate: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.tripsService.getRouteHistory(companyId, truckPlate, from, to);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a trip with its reconciliation' })
    get(@Param('id') id: string, @Query('companyId') companyId: string) {
        return this.tripsService.getTrip(companyId, id);
    }

    @Post('open')
    @ApiOperation({ summary: 'Warehouse keeper loads the truck and opens a trip' })
    open(@Query('companyId') companyId: string, @Body() body: any) {
        return this.tripsService.openTrip(companyId, {
            truckPlate: body.truckPlate,
            driverId: body.driverId,
            driverName: body.driverName,
            loadedOut: body.loadedOut,
            openedBy: body.openedBy,
            notes: body.notes,
        });
    }

    @Post(':id/return')
    @ApiOperation({ summary: 'Register returned stock (cylinder reconciliation)' })
    return(@Param('id') id: string, @Query('companyId') companyId: string, @Body() body: any) {
        return this.tripsService.closeTripReturn(companyId, id, {
            returnedStock: body.returnedStock,
            declaredCash: body.declaredCash,
            closedBy: body.closedBy,
            notes: body.notes,
        });
    }

    @Post(':id/reconcile-cash')
    @ApiOperation({ summary: 'Cashier confirms cash received' })
    reconcileCash(@Param('id') id: string, @Query('companyId') companyId: string, @Body() body: any) {
        return this.tripsService.reconcileCash(companyId, id, {
            declaredCash: body.declaredCash,
            cashReceivedBy: body.cashReceivedBy,
        });
    }

    @Post(':id/deposit')
    @ApiOperation({ summary: 'Register a bank deposit against the trip' })
    deposit(@Param('id') id: string, @Query('companyId') companyId: string, @Body() body: any) {
        return this.tripsService.registerDeposit(companyId, id, Number(body.amount) || 0);
    }
}
