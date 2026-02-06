import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('articles')
  @Roles('inventory:create')
  @ApiOperation({ summary: 'Create a new article' })
  @ApiResponse({
    status: 201,
    description: 'The article has been successfully created.',
  })
  create(@Body() createArticleDto: CreateArticleDto | CreateArticleDto[]) {
    return this.inventoryService.create(createArticleDto);
  }

  @Get('articles')
  @ApiOperation({ summary: 'Get all articles' })
  findAll(@Query('companyId') companyId?: string) {
    return this.inventoryService.findAll(companyId);
  }

  @Get('articles/:id')
  @ApiOperation({ summary: 'Get an article by ID' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch('articles/:id')
  @Roles('inventory:update')
  @ApiOperation({ summary: 'Update an article' })
  update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.inventoryService.update(id, updateArticleDto);
  }

  @Delete('articles/:id')
  @Roles('inventory:delete')
  @ApiOperation({ summary: 'Delete an article' })
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }

  // Stock Movements

  @Post('stock-movements')
  @Roles('inventory:create')
  @ApiOperation({ summary: 'Create a new stock movement' })
  @ApiResponse({
    status: 201,
    description: 'The stock movement has been successfully created.',
  })
  createStockMovement(@Body() createStockMovementDto: CreateStockMovementDto) {
    return this.inventoryService.createStockMovement(createStockMovementDto);
  }

  @Get('stock-movements')
  @ApiOperation({ summary: 'Get all stock movements' })
  findAllStockMovements() {
    return this.inventoryService.findAllStockMovements();
  }

  @Get('stock-movements/:id')
  @ApiOperation({ summary: 'Get a stock movement by ID' })
  findOneStockMovement(@Param('id') id: string) {
    return this.inventoryService.findOneStockMovement(id);
  }
}
