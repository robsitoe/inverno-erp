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
exports.GasControlController = void 0;
const common_1 = require("@nestjs/common");
const gas_control_service_1 = require("./gas-control.service");
const swagger_1 = require("@nestjs/swagger");
let GasControlController = class GasControlController {
    gasService;
    constructor(gasService) {
        this.gasService = gasService;
    }
    getCylinderTypes(companyId) {
        return this.gasService.getCylinderTypes(companyId);
    }
    saveCylinderType(data, companyId) {
        return this.gasService.saveCylinderType(data, companyId);
    }
    getDaily(date, companyId) {
        return this.gasService.getDailyControl(date, companyId);
    }
    saveEntry(data, companyId) {
        return this.gasService.saveEntry(data, companyId);
    }
    deleteEntry(id, companyId) {
        return this.gasService.deleteEntry(id, companyId);
    }
    openDaily(body, companyId) {
        return this.gasService.openDaily(body.date, body.user, companyId);
    }
    closeDaily(id, body, companyId) {
        return this.gasService.closeDaily(id, body.user, companyId);
    }
    updateStocks(id, body, companyId) {
        return this.gasService.updateStocks(id, body.initialStock, body.finalStock, body.user, companyId);
    }
};
exports.GasControlController = GasControlController;
__decorate([
    (0, common_1.Get)('cylinder-types'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all gas cylinder types' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GasControlController.prototype, "getCylinderTypes", null);
__decorate([
    (0, common_1.Post)('cylinder-types'),
    (0, swagger_1.ApiOperation)({ summary: 'Save gas cylinder type' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GasControlController.prototype, "saveCylinderType", null);
__decorate([
    (0, common_1.Get)('daily'),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily control and entries' }),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], GasControlController.prototype, "getDaily", null);
__decorate([
    (0, common_1.Post)('entries'),
    (0, swagger_1.ApiOperation)({ summary: 'Save daily entry' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GasControlController.prototype, "saveEntry", null);
__decorate([
    (0, common_1.Delete)('entries/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete daily entry' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], GasControlController.prototype, "deleteEntry", null);
__decorate([
    (0, common_1.Post)('daily/open'),
    (0, swagger_1.ApiOperation)({ summary: 'Open daily control' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GasControlController.prototype, "openDaily", null);
__decorate([
    (0, common_1.Post)('daily/:id/close'),
    (0, swagger_1.ApiOperation)({ summary: 'Close daily control' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], GasControlController.prototype, "closeDaily", null);
__decorate([
    (0, common_1.Patch)('daily/:id/stocks'),
    (0, swagger_1.ApiOperation)({ summary: 'Update initial and final stocks' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], GasControlController.prototype, "updateStocks", null);
exports.GasControlController = GasControlController = __decorate([
    (0, swagger_1.ApiTags)('Gas Control'),
    (0, common_1.Controller)('gas-control'),
    __metadata("design:paramtypes", [gas_control_service_1.GasControlService])
], GasControlController);
//# sourceMappingURL=gas-control.controller.js.map