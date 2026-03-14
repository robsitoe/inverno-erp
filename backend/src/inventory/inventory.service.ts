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

import { StockDocument } from './entities/stock-document.entity';
import { CreateStockDocumentDto } from './dto/create-stock-document.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly tenancyService: TenancyService,
    @InjectRepository(Article)
    private readonly defaultArticleRepo: Repository<Article>,
    @InjectRepository(StockMovement)
    private readonly defaultStockMovementRepo: Repository<StockMovement>,
    @InjectRepository(StockDocument)
    private readonly defaultStockDocumentRepo: Repository<StockDocument>,
  ) { }

  private async getRepo<T extends ObjectLiteral>(entity: EntityTarget<T>, defaultRepo: Repository<T>, companyId?: string): Promise<Repository<T>> {
    const targetId = companyId || TenancyContext.getCompanyId();
    if (!targetId) return defaultRepo;

    const ds = await this.tenancyService.getTenantDataSource(targetId);
    return ds.getRepository(entity);
  }

  private async getArticleRepo(companyId?: string) { return this.getRepo(Article, this.defaultArticleRepo, companyId); }
  private async getStockMovementRepo(companyId?: string) { return this.getRepo(StockMovement, this.defaultStockMovementRepo, companyId); }
  private async getStockDocumentRepo(companyId?: string) { return this.getRepo(StockDocument, this.defaultStockDocumentRepo, companyId); }

  // Articles

  async create(createArticleDto: CreateArticleDto | CreateArticleDto[]) {
    // Determine companyId from payload if possible
    let companyId: string | undefined;
    const first = Array.isArray(createArticleDto) ? createArticleDto[0] : createArticleDto;
    if (first && first.companyId) {
      companyId = first.companyId;
    }

    const repo = await this.getArticleRepo(companyId);

    // Auto-healing for UUID: if ID is empty string, remove it so Postgres generates a real UUID
    const sanitize = (dto: any) => {
      if (dto.id === '' || (typeof dto.id === 'string' && !dto.id.includes('-') && dto.id.length < 30)) {
        delete dto.id;
      }
      return dto;
    };

    if (Array.isArray(createArticleDto)) {
      const sanitized = createArticleDto.map(d => sanitize({ ...d }));
      const articles = repo.create(sanitized);
      return repo.save(articles);
    }

    const sanitized = sanitize({ ...createArticleDto });
    const article = repo.create(sanitized);
    return repo.save(article);
  }

  async findAll(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getArticleRepo(listCompanyId);
    return repo.find({ order: { code: 'ASC' } });
  }


  async findOne(id: string, companyId?: string) {
    const repo = await this.getArticleRepo(companyId);

    // Try by ID first (UUID)
    let article = await repo.findOne({ where: { id } });

    // If not found and looks like a code (or just fallback), try by code
    if (!article) {
      article = await repo.findOne({ where: { code: id, companyId: companyId || TenancyContext.getCompanyId() } });
    }

    if (!article) {
      throw new NotFoundException(`Article with ID or Code ${id} not found`);
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

  // Stock Documents (New)

  async createStockDocument(dto: CreateStockDocumentDto) {
    const repo = await this.getStockDocumentRepo(dto.companyId);

    // 1. Create Document
    const doc = repo.create(dto);
    const savedDoc = await repo.save(doc);

    // 2. Generate Movements for each line
    // Determine movement type logic (could be improved to use DocumentType configuration from DB if available)
    // For now, simple fallback mapping
    let movementType = 'ADJUSTMENT';
    const type = dto.type;
    const inTypes = ['FI', 'ES', 'SI', 'AIP', 'CP', 'LE'];
    const outTypes = ['FS', 'SS', 'AIN', 'DP', 'LDN', 'LD'];

    if (inTypes.includes(type)) movementType = 'IN';
    else if (outTypes.includes(type)) movementType = 'OUT';
    else if (['TA', 'TAV'].includes(type)) movementType = 'TRANSFER';

    for (const line of dto.lines) {
      if (!line.articleCode || line.quantity <= 0) continue;

      // Resolve Article ID if missing
      let articleId = line.articleId;
      if (!articleId) {
        const artRepo = await this.getArticleRepo(dto.companyId);
        const art = await artRepo.findOne({ where: { code: line.articleCode } });
        if (art) articleId = art.id;
      }

      if (articleId) {
        await this.createStockMovement({
          companyId: dto.companyId,
          date: dto.date, // Use string date directly
          articleId: articleId,
          articleCode: line.articleCode,
          articleName: line.articleName || '',
          warehouseId: line.warehouse || dto.warehouse || 'ARM01',
          movementType: movementType as any,
          quantity: line.quantity,
          unitCost: line.unitPrice || 0,
          totalCost: line.total || 0,
          reference: `${dto.type} ${dto.series}/${dto.number}`,
          sourceDocument: savedDoc.id,
          notes: line.description || savedDoc.notes
        });
      }
    }

    return savedDoc;
  }

  async findAllStockDocuments(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getStockDocumentRepo(listCompanyId);
    return repo.find({
      order: { date: 'DESC', createdAt: 'DESC' },
      relations: ['lines']
    });
  }

  async findOneStockDocument(id: string) {
    const repo = await this.getStockDocumentRepo();
    const doc = await repo.findOne({
      where: { id },
      relations: ['lines']
    });
    if (!doc) throw new NotFoundException(`Stock Document ${id} not found`);
    return doc;
  }

  // Stock Movements

  async createStockMovement(createStockMovementDto: CreateStockMovementDto) {
    const { articleId, quantity, movementType, companyId } = createStockMovementDto;

    const artRepo = await this.getArticleRepo(companyId);
    const smRepo = await this.getStockMovementRepo(companyId);

    // Check if article exists
    const article = await this.findOne(articleId, companyId);

    // Create movement
    const movement = smRepo.create(createStockMovementDto);
    await smRepo.save(movement);

    // Update article stock
    const qty = Number(quantity);
    const mType = String(movementType);

    if (mType === 'IN' || mType === 'ADJUSTMENT_IN' || (mType === 'ADJUSTMENT' && qty > 0)) {
      article.currentStock = Number(article.currentStock) + qty;
    } else if (mType === 'OUT' || mType === 'ADJUSTMENT_OUT' || (mType === 'ADJUSTMENT' && qty < 0)) {
      article.currentStock = Number(article.currentStock) - Math.abs(qty);
    } else if (mType === 'TRANSFER') {
      // In a multi-warehouse transfer within the same company, total stock doesn't change
      // unless we implement warehouse-specific stock. For now, we do nothing to the total.
      console.log(`[InventoryService] Transfer movement recorded for ${article.code}. Total stock remains same.`);
    }
    await artRepo.save(article);

    return movement;
  }

  async findAllStockMovements(companyId?: string) {
    const listCompanyId = companyId || TenancyContext.getCompanyId();
    const repo = await this.getStockMovementRepo(listCompanyId);
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

  async getStockBalanceAtDate(articleCode: string, date: string, warehouseId?: string, companyId?: string): Promise<number> {
    const repo = await this.getStockMovementRepo(companyId);
    const cid = companyId || TenancyContext.getCompanyId();

    const query = repo.createQueryBuilder('m')
      .where('m.articleCode = :articleCode AND m.date <= :date', { articleCode, date });
    
    if (cid) {
      query.andWhere('m.companyId = :cid', { cid });
    }

    if (warehouseId) {
      query.andWhere('m.warehouseId = :warehouseId', { warehouseId });
    }

    const movements = await query.getMany();

    return movements.reduce((balance, m) => {
      const qty = Number(m.quantity);
      const type = m.movementType;

      if (type === 'IN' || type === 'ADJUSTMENT_IN' || (type === 'ADJUSTMENT' && qty > 0)) {
        return balance + Math.abs(qty);
      } else if (type === 'OUT' || type === 'ADJUSTMENT_OUT' || (type === 'ADJUSTMENT' && qty < 0)) {
        return balance - Math.abs(qty);
      } else if (type === 'TRANSFER') {
        // Simple sign-based logic for transfers
        return balance + qty;
      }
      return balance;
    }, 0);
  }
}
