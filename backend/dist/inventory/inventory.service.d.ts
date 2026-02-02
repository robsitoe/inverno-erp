import { Repository } from 'typeorm';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { Article } from './entities/article.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { TenancyService } from '../tenancy/tenancy.service';
export declare class InventoryService {
    private readonly tenancyService;
    private readonly defaultArticleRepo;
    private readonly defaultStockMovementRepo;
    constructor(tenancyService: TenancyService, defaultArticleRepo: Repository<Article>, defaultStockMovementRepo: Repository<StockMovement>);
    private getRepo;
    private getArticleRepo;
    private getStockMovementRepo;
    create(createArticleDto: CreateArticleDto | CreateArticleDto[]): Promise<Article | Article[]>;
    findAll(companyId?: string): Promise<Article[]>;
    findOne(id: string): Promise<Article>;
    update(id: string, updateArticleDto: UpdateArticleDto): Promise<Article>;
    remove(id: string): Promise<Article>;
    createStockMovement(createStockMovementDto: CreateStockMovementDto): Promise<StockMovement>;
    findAllStockMovements(): Promise<StockMovement[]>;
    findOneStockMovement(id: string): Promise<StockMovement>;
}
