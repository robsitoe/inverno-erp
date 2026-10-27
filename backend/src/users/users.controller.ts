import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('admin.users')
  async create(@Body() createUserDto: CreateUserDto) {
    return UsersService.toPublic(await this.usersService.create(createUserDto));
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('admin.users')
  async findAll() {
    return (await this.usersService.findAll()).map(u => UsersService.toPublic(u));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('admin.users')
  async findOne(@Param('id') id: string) {
    return UsersService.toPublic(await this.usersService.findOne(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('admin.users')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return UsersService.toPublic(await this.usersService.update(id, updateUserDto));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('admin.users')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
