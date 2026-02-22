"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const article_entity_1 = require("./entities/article.entity");
const stock_movement_entity_1 = require("./entities/stock-movement.entity");
const tenancy_service_1 = require("../tenancy/tenancy.service");
const tenancy_context_1 = require("../tenancy/tenancy.context");
const stock_document_entity_1 = require("./entities/stock-document.entity");
let InventoryService = class InventoryService {
    tenancyService;
    defaultArticleRepo;
    defaultStockMovementRepo;
    defaultStockDocumentRepo;
    constructor(tenancyService, defaultArticleRepo, defaultStockMovementRepo, defaultStockDocumentRepo) {
        this.tenancyService = tenancyService;
        this.defaultArticleRepo = defaultArticleRepo;
        this.defaultStockMovementRepo = defaultStockMovementRepo;
        this.defaultStockDocumentRepo = defaultStockDocumentRepo;
    }
    async getRepo(entity, defaultRepo, companyId) {
        const targetId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        if (!targetId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(targetId);
        return ds.getRepository(entity);
    }
    async getArticleRepo(companyId) { return this.getRepo(article_entity_1.Article, this.defaultArticleRepo, companyId); }
    async getStockMovementRepo(companyId) { return this.getRepo(stock_movement_entity_1.StockMovement, this.defaultStockMovementRepo, companyId); }
    async getStockDocumentRepo(companyId) { return this.getRepo(stock_document_entity_1.StockDocument, this.defaultStockDocumentRepo, companyId); }
    async create(createArticleDto) {
        let companyId;
        const first = Array.isArray(createArticleDto) ? createArticleDto[0] : createArticleDto;
        if (first && first.companyId) {
            companyId = first.companyId;
        }
        const repo = await this.getArticleRepo(companyId);
        const sanitize = (dto) => {
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
    async findAll(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getArticleRepo(listCompanyId);
        return repo.find({ order: { code: 'ASC' } });
    }
    async findOne(id, companyId) {
        const repo = await this.getArticleRepo(companyId);
        let article = await repo.findOne({ where: { id } });
        if (!article) {
            article = await repo.findOne({ where: { code: id, companyId: companyId || tenancy_context_1.TenancyContext.getCompanyId() } });
        }
        if (!article) {
            throw new common_1.NotFoundException(`Article with ID or Code ${id} not found`);
        }
        return article;
    }
    async update(id, updateArticleDto) {
        const repo = await this.getArticleRepo();
        const article = await this.findOne(id);
        repo.merge(article, updateArticleDto);
        return repo.save(article);
    }
    async remove(id) {
        const repo = await this.getArticleRepo();
        const article = await this.findOne(id);
        return repo.remove(article);
    }
    async createStockDocument(dto) {
        const repo = await this.getStockDocumentRepo(dto.companyId);
        const doc = repo.create(dto);
        const savedDoc = await repo.save(doc);
        let movementType = 'ADJUSTMENT';
        const type = dto.type;
        const inTypes = ['FI', 'ES', 'SI', 'AIP', 'CP', 'LE'];
        const outTypes = ['FS', 'SS', 'AIN', 'DP', 'LDN', 'LD'];
        if (inTypes.includes(type))
            movementType = 'IN';
        else if (outTypes.includes(type))
            movementType = 'OUT';
        else if (['TA', 'TAV'].includes(type))
            movementType = 'TRANSFER';
        for (const line of dto.lines) {
            if (!line.articleCode || line.quantity <= 0)
                continue;
            let articleId = line.articleId;
            if (!articleId) {
                const artRepo = await this.getArticleRepo(dto.companyId);
                const art = await artRepo.findOne({ where: { code: line.articleCode } });
                if (art)
                    articleId = art.id;
            }
            if (articleId) {
                await this.createStockMovement({
                    companyId: dto.companyId,
                    date: dto.date,
                    articleId: articleId,
                    articleCode: line.articleCode,
                    articleName: line.articleName || '',
                    warehouseId: line.warehouse || dto.warehouse || 'ARM01',
                    movementType: movementType,
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
    async findAllStockDocuments(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getStockDocumentRepo(listCompanyId);
        return repo.find({
            order: { date: 'DESC', createdAt: 'DESC' },
            relations: ['lines']
        });
    }
    async findOneStockDocument(id) {
        const repo = await this.getStockDocumentRepo();
        const doc = await repo.findOne({
            where: { id },
            relations: ['lines']
        });
        if (!doc)
            throw new common_1.NotFoundException(`Stock Document ${id} not found`);
        return doc;
    }
    async createStockMovement(createStockMovementDto) {
        const { articleId, quantity, movementType, companyId } = createStockMovementDto;
        const artRepo = await this.getArticleRepo(companyId);
        const smRepo = await this.getStockMovementRepo(companyId);
        const article = await this.findOne(articleId, companyId);
        const movement = smRepo.create(createStockMovementDto);
        await smRepo.save(movement);
        const qty = Number(quantity);
        const mType = String(movementType);
        if (mType === 'IN' || mType === 'ADJUSTMENT_IN' || (mType === 'ADJUSTMENT' && qty > 0)) {
            article.currentStock = Number(article.currentStock) + qty;
        }
        else if (mType === 'OUT' || mType === 'ADJUSTMENT_OUT' || (mType === 'ADJUSTMENT' && qty < 0)) {
            article.currentStock = Number(article.currentStock) - Math.abs(qty);
        }
        else if (mType === 'TRANSFER') {
            console.log(`[InventoryService] Transfer movement recorded for ${article.code}. Total stock remains same.`);
        }
        await artRepo.save(article);
        return movement;
    }
    async findAllStockMovements(companyId) {
        const listCompanyId = companyId || tenancy_context_1.TenancyContext.getCompanyId();
        const repo = await this.getStockMovementRepo(listCompanyId);
        return repo.find({
            order: { date: 'DESC', createdAt: 'DESC' }
        });
    }
    async findOneStockMovement(id) {
        const repo = await this.getStockMovementRepo();
        const movement = await repo.findOne({
            where: { id }
        });
        if (!movement) {
            throw new common_1.NotFoundException(`Stock Movement with ID ${id} not found`);
        }
        return movement;
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(article_entity_1.Article)),
    __param(2, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __param(3, (0, typeorm_1.InjectRepository)(stock_document_entity_1.StockDocument)),
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map