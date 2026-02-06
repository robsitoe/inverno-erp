import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { Article } from './entities/article.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { TenancyService } from '../tenancy/tenancy.service';
import { TenancyContext } from '../tenancy/tenancy.context';

@Injectable()
export class InventoryService {
  constructor(
    private readonly tenancyService: TenancyService,
    @InjectRepository(Article)
    private readonly defaultArticleRepo: Repository<Article>,
    @InjectRepository(StockMovement)
    private readonly defaultStockMovementRepo: Repository<StockMovement>,
  ) {}

  private async getRepo<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    defaultRepo: Repository<T>,
  ): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(companyId);
    return ds.getRepository(entity);
  }

  private async getArticleRepo() {
    return this.getRepo(Article, this.defaultArticleRepo);
  }
  private async getStockMovementRepo() {
    return this.getRepo(StockMovement, this.defaultStockMovementRepo);
  }

  // Articles

  async create(createArticleDto: CreateArticleDto | CreateArticleDto[]) {
    const repo = await this.getArticleRepo();
    if (Array.isArray(createArticleDto)) {
      const articles = repo.create(createArticleDto);
      return repo.save(articles);
    }
    const article = repo.create(createArticleDto);
    return repo.save(article);
  }

  async findAll(companyId?: string) {
    const repo = await this.getArticleRepo();
    if (companyId) {
      return repo.find({
        where: { companyId },
        order: { code: 'ASC' },
      });
    }
    // If no companyId specified in query, we still use the context one for the repo
    return repo.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string) {
    const repo = await this.getArticleRepo();
    const article = await repo.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    return article;
  }

  async update(id: string, updateArticleDto: UpdateArticleDto) {
    const repo = await this.getArticleRepo();
    const article = await this.findOne(id);
    repo.merge(article, updateArticleDto);
    return repo.save(article);
  }

  async remove(id: string) {
    const repo = await this.getArticleRepo();
    const article = await this.findOne(id);
    return repo.remove(article);
  }

  // Stock Movements

  async createStockMovement(createStockMovementDto: CreateStockMovementDto) {
    const { articleId, quantity, movementType } = createStockMovementDto;

    const artRepo = await this.getArticleRepo();
    return artRepo.manager.transaction(async (manager) => {
      const transactionalArtRepo = manager.getRepository(Article);
      const transactionalSmRepo = manager.getRepository(StockMovement);

      const article = await transactionalArtRepo.findOne({
        where: { id: articleId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!article) {
        throw new NotFoundException(`Article with ID ${articleId} not found`);
      }

      const numericQuantity = Number(quantity);
      if (!Number.isFinite(numericQuantity) || numericQuantity === 0) {
        throw new BadRequestException('Quantity must be a non-zero number');
      }

      const normalizedMovementType = String(movementType || '').toUpperCase();
      let stockDelta = 0;

      switch (normalizedMovementType) {
        case 'IN':
          stockDelta = Math.abs(numericQuantity);
          break;
        case 'OUT':
        case 'TRANSFER':
          stockDelta = -Math.abs(numericQuantity);
          break;
        case 'ADJUSTMENT':
          stockDelta = numericQuantity;
          break;
        default:
          throw new BadRequestException(
            `Invalid movementType: ${movementType}`,
          );
      }

      const nextStock = Number(article.currentStock) + stockDelta;
      if (nextStock < 0) {
        throw new BadRequestException(
          'Stock movement would result in negative stock',
        );
      }

      const movement = transactionalSmRepo.create({
        ...createStockMovementDto,
        articleCode: createStockMovementDto.articleCode || article.code,
        articleName: createStockMovementDto.articleName || article.name,
      });
      await transactionalSmRepo.save(movement);

      article.currentStock = nextStock;
      await transactionalArtRepo.save(article);

      return movement;
    });
  }

  async findAllStockMovements() {
    const repo = await this.getStockMovementRepo();
    return repo.find({
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOneStockMovement(id: string) {
    const repo = await this.getStockMovementRepo();
    const movement = await repo.findOne({
      where: { id },
    });
    if (!movement) {
      throw new NotFoundException(`Stock Movement with ID ${id} not found`);
    }
    return movement;
  }
}
