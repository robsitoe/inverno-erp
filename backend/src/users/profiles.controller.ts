import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('profiles')
@Controller('profiles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) { }

    @Get('catalog')
    @ApiOperation({ summary: 'Permission catalog (modules + keys) for the matrix UI' })
    getCatalog() {
        return this.profilesService.getCatalog();
    }

    @Get()
    @RequirePermission('admin.users')
    @ApiOperation({ summary: 'List company profiles (seeds defaults on first call)' })
    findAll(@Query('companyId') companyId: string) {
        return this.profilesService.findAll(companyId);
    }

    @Post()
    @RequirePermission('admin.users')
    create(@Body() data: any) {
        return this.profilesService.create(data);
    }

    @Patch(':id')
    @RequirePermission('admin.users')
    update(@Param('id') id: string, @Body() data: any) {
        return this.profilesService.update(id, data);
    }

    @Delete(':id')
    @RequirePermission('admin.users')
    remove(@Param('id') id: string) {
        return this.profilesService.remove(id);
    }
}
