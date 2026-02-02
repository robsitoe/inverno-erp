"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const treasury_service_1 = require("./treasury.service");
const treasury_controller_1 = require("./treasury.controller");
const payment_methods_controller_1 = require("./payment-methods.controller");
const treasury_entity_1 = require("./entities/treasury.entity");
const payment_method_entity_1 = require("./entities/payment-method.entity");
let TreasuryModule = class TreasuryModule {
};
exports.TreasuryModule = TreasuryModule;
exports.TreasuryModule = TreasuryModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([treasury_entity_1.TreasuryDocument, treasury_entity_1.TreasuryDocumentLine, payment_method_entity_1.PaymentMethod])],
        controllers: [treasury_controller_1.TreasuryController, payment_methods_controller_1.PaymentMethodsController],
        providers: [treasury_service_1.TreasuryService],
    })
], TreasuryModule);
//# sourceMappingURL=treasury.module.js.map