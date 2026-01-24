"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTreasuryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_treasury_dto_1 = require("./create-treasury.dto");
class UpdateTreasuryDto extends (0, swagger_1.PartialType)(create_treasury_dto_1.CreateTreasuryDto) {
}
exports.UpdateTreasuryDto = UpdateTreasuryDto;
//# sourceMappingURL=update-treasury.dto.js.map