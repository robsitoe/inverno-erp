"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSalesDocumentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_sales_document_dto_1 = require("./create-sales-document.dto");
class UpdateSalesDocumentDto extends (0, swagger_1.PartialType)(create_sales_document_dto_1.CreateSalesDocumentDto) {
}
exports.UpdateSalesDocumentDto = UpdateSalesDocumentDto;
//# sourceMappingURL=update-sales-document.dto.js.map