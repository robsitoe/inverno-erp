import { Injectable, NotFoundException } from '@nestjs/common';
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
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>): Promise<Repository<T>> {
    const companyId = TenancyContext.getCompanyId();
    if (!companyId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(companyId);
    return ds.getRepository(entity);
  }

  private async getArticleRepo() { return this.getRepo(Article, this.defaultArticleRepo); }
  private async getStockMovementRepo() { return this.getRepo(StockMovement, this.defaultStockMovementRepo); }

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
        order: { code: 'ASC' }
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
    const smRepo = await this.getStockMovementRepo();

    // Check if article exists
    const article = await this.findOne(articleId);

    // Create movement
    const movement = smRepo.create(createStockMovementDto);
    await smRepo.save(movement);

    // Update article stock
    if (movementType === ('IN' as any) || movementType === ('ADJUSTMENT' as any) && Number(quantity) > 0) {
      article.currentStock = Number(article.currentStock) + Number(quantity);
    } else {
      article.currentStock = Number(article.currentStock) - Number(quantity);
    }
    await artRepo.save(article);

    return movement;
  }

  async findAllStockMovements() {
    const repo = await this.getStockMovementRepo();
    return repo.find({
      order: { date: 'DESC', createdAt: 'DESC' }
    });
  }

  async findOneStockMovement(id: string) {
    const repo = await this.getStockMovementRepo();
    const movement = await repo.findOne({
      where: { id }
    });
    if (!movement) {
      throw new NotFoundException(`Stock Movement with ID ${id} not found`);
    }
    return movement;
  }
}
