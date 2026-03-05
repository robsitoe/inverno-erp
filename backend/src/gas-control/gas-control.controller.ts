import { Controller, Get, Post, Body, Query, Param, Delete, Patch } from '@nestjs/common';
import { GasControlService } from './gas-control.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Gas Control')
@Controller('gas-control')
export class GasControlController {
    constructor(private readonly gasService: GasControlService) { }

    @Get('cylinder-types')
    @ApiOperation({ summary: 'Get all gas cylinder types' })
    getCylinderTypes(@Query('companyId') companyId?: string) {
        return this.gasService.getCylinderTypes(companyId);
    }

    @Post('cylinder-types')
    @ApiOperation({ summary: 'Save gas cylinder type' })
    saveCylinderType(@Body() data: any, @Query('companyId') companyId?: string) {
        return this.gasService.saveCylinderType(data, companyId);
    }

    @Get('daily')
    @ApiOperation({ summary: 'Get daily control and entries' })
    getDaily(@Query('date') date: string, @Query('companyId') companyId?: string) {
        return this.gasService.getDailyControl(date, companyId);
    }

    @Post('entries')
    @ApiOperation({ summary: 'Save daily entry' })
    saveEntry(@Body() data: any, @Query('companyId') companyId?: string) {
        return this.gasService.saveEntry(data, companyId);
    }

    @Delete('entries/:id')
    @ApiOperation({ summary: 'Delete daily entry' })
    deleteEntry(@Param('id') id: string, @Query('companyId') companyId?: string) {
        return this.gasService.deleteEntry(id, companyId);
    }

    @Post('daily/open')
    @ApiOperation({ summary: 'Open daily control' })
    openDaily(@Body() body: { date: string, user: string }, @Query('companyId') companyId?: string) {
        return this.gasService.openDaily(body.date, body.user, companyId);
    }

    @Post('daily/:id/close')
    @ApiOperation({ summary: 'Close daily control' })
    closeDaily(@Param('id') id: string, @Body() body: { user: string }, @Query('companyId') companyId?: string) {
        return this.gasService.closeDaily(id, body.user, companyId);
    }

    @Patch('daily/:id/stocks')
    @ApiOperation({ summary: 'Update initial and final stocks' })
    updateStocks(
        @Param('id') id: string,
        @Body() body: { initialStock: any; finalStock: any; user: string },
        @Query('companyId') companyId?: string,
    ) {
        return this.gasService.updateStocks(id, body.initialStock, body.finalStock, body.user, companyId);
    }
}
