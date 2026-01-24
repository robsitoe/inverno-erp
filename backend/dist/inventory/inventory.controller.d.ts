import { InventoryService } from './inventory.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    create(createArticleDto: CreateArticleDto | CreateArticleDto[]): Promise<import("./entities/article.entity").Article | import("./entities/article.entity").Article[]>;
    findAll(): Promise<import("./entities/article.entity").Article[]>;
    findOne(id: string): Promise<import("./entities/article.entity").Article>;
    update(id: string, updateArticleDto: UpdateArticleDto): Promise<import("./entities/article.entity").Article>;
    remove(id: string): Promise<import("./entities/article.entity").Article>;
    createStockMovement(createStockMovementDto: CreateStockMovementDto): Promise<import("./entities/stock-movement.entity").StockMovement>;
    findAllStockMovements(): Promise<import("./entities/stock-movement.entity").StockMovement[]>;
    findOneStockMovement(id: string): Promise<import("./entities/stock-movement.entity").StockMovement>;
}
