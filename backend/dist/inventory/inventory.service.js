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
let InventoryService = class InventoryService {
    tenancyService;
    defaultArticleRepo;
    defaultStockMovementRepo;
    constructor(tenancyService, defaultArticleRepo, defaultStockMovementRepo) {
        this.tenancyService = tenancyService;
        this.defaultArticleRepo = defaultArticleRepo;
        this.defaultStockMovementRepo = defaultStockMovementRepo;
    }
    async getRepo(entity, defaultRepo) {
        const companyId = tenancy_context_1.TenancyContext.getCompanyId();
        if (!companyId)
            return defaultRepo;
        const ds = await this.tenancyService.getTenantDataSource(companyId);
        return ds.getRepository(entity);
    }
    async getArticleRepo() { return this.getRepo(article_entity_1.Article, this.defaultArticleRepo); }
    async getStockMovementRepo() { return this.getRepo(stock_movement_entity_1.StockMovement, this.defaultStockMovementRepo); }
    async create(createArticleDto) {
        const repo = await this.getArticleRepo();
        if (Array.isArray(createArticleDto)) {
            const articles = repo.create(createArticleDto);
            return repo.save(articles);
        }
        const article = repo.create(createArticleDto);
        return repo.save(article);
    }
    async findAll(companyId) {
        const repo = await this.getArticleRepo();
        if (companyId) {
            return repo.find({
                where: { companyId },
                order: { code: 'ASC' }
            });
        }
        return repo.find({ order: { code: 'ASC' } });
    }
    async findOne(id) {
        const repo = await this.getArticleRepo();
        const article = await repo.findOne({ where: { id } });
        if (!article) {
            throw new common_1.NotFoundException(`Article with ID ${id} not found`);
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
    async createStockMovement(createStockMovementDto) {
        const { articleId, quantity, movementType } = createStockMovementDto;
        const artRepo = await this.getArticleRepo();
        const smRepo = await this.getStockMovementRepo();
        const article = await this.findOne(articleId);
        const movement = smRepo.create(createStockMovementDto);
        await smRepo.save(movement);
        if (movementType === 'IN' || movementType === 'ADJUSTMENT' && Number(quantity) > 0) {
            article.currentStock = Number(article.currentStock) + Number(quantity);
        }
        else {
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
    __metadata("design:paramtypes", [tenancy_service_1.TenancyService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map