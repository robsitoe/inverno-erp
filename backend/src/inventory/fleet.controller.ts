import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('fleet')
@Controller('fleet')
export class FleetController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('vehicles')
  @ApiOperation({ summary: 'Get all vehicles' })
  async findAllVehicles(@Query('companyId') companyId: string) {
    return this.inventoryService.findAllVehicles(companyId);
  }

  @Post('vehicles')
  @ApiOperation({ summary: 'Create/Update a vehicle' })
  async saveVehicle(@Body() data: any) {
    return this.inventoryService.saveVehicle(data);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'Get all warehouses' })
  async findAllWarehouses(@Query('companyId') companyId: string) {
    return this.inventoryService.findAllWarehouses(companyId);
  }

  @Post('trips/start')
  @ApiOperation({ summary: 'Start a vehicle trip' })
  async startTrip(@Body() data: any) {
    return this.inventoryService.startTrip(data);
  }

  @Patch('trips/:id/end')
  @ApiOperation({ summary: 'End a vehicle trip' })
  async endTrip(@Param('id') id: string, @Body() data: any) {
    return this.inventoryService.endTrip(id, data);
  }

  @Post('trips/:id/location')
  @ApiOperation({ summary: 'Update vehicle trip location' })
  async updateLocation(
    @Param('id') id: string,
    @Body() data: { latitude: number; longitude: number; companyId?: string },
  ) {
    return this.inventoryService.updateLocation(
      id,
      data.latitude,
      data.longitude,
      data.companyId,
    );
  }

  @Get('trips/active')
  @ApiOperation({ summary: 'Get all active trips' })
  async getActiveTrips(@Query('companyId') companyId: string) {
    return this.inventoryService.getActiveTrips(companyId);
  }

  @Get('trips/:id/history')
  @ApiOperation({ summary: 'Get location history for a trip' })
  async getTripHistory(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.inventoryService.getTripHistory(id, companyId);
  }
}
