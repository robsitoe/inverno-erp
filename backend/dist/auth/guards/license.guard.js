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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseGuard = void 0;
const common_1 = require("@nestjs/common");
const licenses_service_1 = require("../../licenses/licenses.service");
let LicenseGuard = class LicenseGuard {
    licensesService;
    constructor(licensesService) {
        this.licensesService = licensesService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const companyId = request.companyId
            || request.headers['x-company-id']
            || request.query?.companyId
            || request.body?.companyId;
        if (!companyId) {
            return true;
        }
        const status = await this.licensesService.getStatus(companyId);
        if (!status.valid) {
            throw new common_1.ForbiddenException(`Licença inválida ou expirada para a empresa ${companyId}. ` +
                `Estado: ${status.status}. Por favor, renove a sua licença.`);
        }
        request.license = status;
        return true;
    }
};
exports.LicenseGuard = LicenseGuard;
exports.LicenseGuard = LicenseGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [licenses_service_1.LicensesService])
], LicenseGuard);
//# sourceMappingURL=license.guard.js.map