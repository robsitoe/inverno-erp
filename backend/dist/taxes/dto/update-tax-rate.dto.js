"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTaxRateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_tax_rate_dto_1 = require("./create-tax-rate.dto");
class UpdateTaxRateDto extends (0, swagger_1.PartialType)(create_tax_rate_dto_1.CreateTaxRateDto) {
}
exports.UpdateTaxRateDto = UpdateTaxRateDto;
//# sourceMappingURL=update-tax-rate.dto.js.map