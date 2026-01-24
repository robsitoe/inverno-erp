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
let InventoryService = class InventoryService {
    articleRepository;
    stockMovementRepository;
    constructor(articleRepository, stockMovementRepository) {
        this.articleRepository = articleRepository;
        this.stockMovementRepository = stockMovementRepository;
    }
    async create(createArticleDto) {
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
    async findOne(id) {
        const article = await this.articleRepository.findOne({ where: { id } });
        if (!article) {
            throw new common_1.NotFoundException(`Article with ID ${id} not found`);
        }
        return article;
    }
    async update(id, updateArticleDto) {
        const article = await this.findOne(id);
        this.articleRepository.merge(article, updateArticleDto);
        return this.articleRepository.save(article);
    }
    async remove(id) {
        const article = await this.findOne(id);
        return this.articleRepository.remove(article);
    }
    async createStockMovement(createStockMovementDto) {
        const { articleId, quantity, movementType } = createStockMovementDto;
        const article = await this.findOne(articleId);
        const movement = this.stockMovementRepository.create(createStockMovementDto);
        await this.stockMovementRepository.save(movement);
        if (movementType === 'IN' || movementType === 'ADJUSTMENT' && Number(quantity) > 0) {
            article.currentStock = Number(article.currentStock) + Number(quantity);
        }
        else {
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
    async findOneStockMovement(id) {
        const movement = await this.stockMovementRepository.findOne({
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
    __param(0, (0, typeorm_1.InjectRepository)(article_entity_1.Article)),
    __param(1, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map