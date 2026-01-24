import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { Article } from './entities/article.entity';
import { StockMovement } from './entities/stock-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
  ) { }

  // Articles

  async create(createArticleDto: CreateArticleDto | CreateArticleDto[]) {
    if (Array.isArray(createArticleDto)) {
      const articles = this.articleRepository.create(createArticleDto);
      return this.articleRepository.save(articles);
    }
    const article = this.articleRepository.create(createArticleDto);
    return this.articleRepository.save(article);
  }

  findAll() {
    return this.articleRepository.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string) {
    const article = await this.articleRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    return article;
  }

  async update(id: string, updateArticleDto: UpdateArticleDto) {
    const article = await this.findOne(id);
    this.articleRepository.merge(article, updateArticleDto);
    return this.articleRepository.save(article);
  }

  async remove(id: string) {
    const article = await this.findOne(id);
    return this.articleRepository.remove(article);
  }

  // Stock Movements

  async createStockMovement(createStockMovementDto: CreateStockMovementDto) {
    const { articleId, quantity, movementType } = createStockMovementDto;

    // Check if article exists
    const article = await this.findOne(articleId);

    // Create movement
    const movement = this.stockMovementRepository.create(createStockMovementDto);
    await this.stockMovementRepository.save(movement);

    // Update article stock
    if (movementType === ('IN' as any) || movementType === ('ADJUSTMENT' as any) && Number(quantity) > 0) {
      article.currentStock = Number(article.currentStock) + Number(quantity);
    } else {
      article.currentStock = Number(article.currentStock) - Number(quantity);
    }
    await this.articleRepository.save(article);

    return movement;
  }

  findAllStockMovements() {
    return this.stockMovementRepository.find({
      order: { date: 'DESC', createdAt: 'DESC' }
    });
  }

  async findOneStockMovement(id: string) {
    const movement = await this.stockMovementRepository.findOne({
      where: { id }
    });
    if (!movement) {
      throw new NotFoundException(`Stock Movement with ID ${id} not found`);
    }
    return movement;
  }
}
