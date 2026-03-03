"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GasControlModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const gas_control_entity_1 = require("./gas-control.entity");
const gas_control_service_1 = require("./gas-control.service");
const gas_control_controller_1 = require("./gas-control.controller");
const tenancy_module_1 = require("../tenancy/tenancy.module");
let GasControlModule = class GasControlModule {
};
exports.GasControlModule = GasControlModule;
exports.GasControlModule = GasControlModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([gas_control_entity_1.GasCylinderType, gas_control_entity_1.GasDailyControl, gas_control_entity_1.GasDailyEntry]),
            tenancy_module_1.TenancyModule,
        ],
        controllers: [gas_control_controller_1.GasControlController],
        providers: [gas_control_service_1.GasControlService],
        exports: [gas_control_service_1.GasControlService],
    })
], GasControlModule);
//# sourceMappingURL=gas-control.module.js.map