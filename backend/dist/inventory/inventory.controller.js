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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const inventory_service_1 = require("./inventory.service");
const update_article_dto_1 = require("./dto/update-article.dto");
const create_stock_movement_dto_1 = require("./dto/create-stock-movement.dto");
const create_stock_document_dto_1 = require("./dto/create-stock-document.dto");
let InventoryController = class InventoryController {
    inventoryService;
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    create(createArticleDto) {
        return this.inventoryService.create(createArticleDto);
    }
    findAll(companyId) {
        return this.inventoryService.findAll(companyId);
    }
    findOne(id) {
        return this.inventoryService.findOne(id);
    }
    update(id, updateArticleDto) {
        return this.inventoryService.update(id, updateArticleDto);
    }
    remove(id) {
        return this.inventoryService.remove(id);
    }
    createStockDocument(createStockDocumentDto) {
        return this.inventoryService.createStockDocument(createStockDocumentDto);
    }
    findAllStockDocuments(companyId) {
        return this.inventoryService.findAllStockDocuments(companyId);
    }
    findOneStockDocument(id) {
        return this.inventoryService.findOneStockDocument(id);
    }
    createStockMovement(createStockMovementDto) {
        return this.inventoryService.createStockMovement(createStockMovementDto);
    }
    findAllStockMovements(companyId) {
        return this.inventoryService.findAllStockMovements(companyId);
    }
    findOneStockMovement(id) {
        return this.inventoryService.findOneStockMovement(id);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)('articles'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new article' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The article has been successfully created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('articles'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all articles' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('articles/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an article by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('articles/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an article' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_article_dto_1.UpdateArticleDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('articles/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an article' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('stock-documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new stock document' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The stock document has been successfully created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_stock_document_dto_1.CreateStockDocumentDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createStockDocument", null);
__decorate([
    (0, common_1.Get)('stock-documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all stock documents' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findAllStockDocuments", null);
__decorate([
    (0, common_1.Get)('stock-documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a stock document by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findOneStockDocument", null);
__decorate([
    (0, common_1.Post)('stock-movements'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new stock movement' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The stock movement has been successfully created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_stock_movement_dto_1.CreateStockMovementDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createStockMovement", null);
__decorate([
    (0, common_1.Get)('stock-movements'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all stock movements' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findAllStockMovements", null);
__decorate([
    (0, common_1.Get)('stock-movements/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a stock movement by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findOneStockMovement", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('inventory'),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map