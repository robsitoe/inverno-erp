"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STOCK_DOCUMENT_TYPES = exports.TREASURY_DOCUMENT_TYPES = exports.PURCHASE_DOCUMENT_TYPES = exports.SALES_DOCUMENT_TYPES = void 0;
exports.SALES_DOCUMENT_TYPES = [
    { code: 'FA', name: 'Fatura', description: 'Fatura de Venda', isStandard: true, nature: 'OUT', type: 'SALES' },
    { code: 'FR', name: 'Fatura Recibo', description: 'Fatura Recibo', isStandard: true, nature: 'OUT', type: 'SALES' },
    { code: 'VD', name: 'Venda a Dinheiro', description: 'Venda a Dinheiro', isStandard: true, nature: 'OUT', type: 'SALES' },
    { code: 'FT', name: 'Fatura Título', description: 'Fatura Título', isStandard: true, nature: 'OUT', type: 'SALES' },
    { code: 'NC', name: 'Nota de Crédito', description: 'Nota de Crédito', isStandard: true, nature: 'IN', type: 'SALES' },
    { code: 'ND', name: 'Nota de Débito', description: 'Nota de Débito', isStandard: true, nature: 'OUT', type: 'SALES' },
    { code: 'NE', name: 'Nota de Encomenda', description: 'Nota de Encomenda', isStandard: true, nature: 'NONE', type: 'SALES' },
    { code: 'OR', name: 'Orçamento', description: 'Orçamento', isStandard: true, nature: 'NONE', type: 'SALES' },
    { code: 'GT', name: 'Guia de Transporte', description: 'Guia de Transporte', isStandard: true, nature: 'OUT', type: 'SALES' }
];
exports.PURCHASE_DOCUMENT_TYPES = [
    { code: 'FC', name: 'Fatura de Compra', description: 'Fatura de Compra', isStandard: true, nature: 'IN', type: 'PURCHASES' },
    { code: 'VDC', name: 'Venda a Dinheiro (Compra)', description: 'Venda a Dinheiro (Compra)', isStandard: true, nature: 'IN', type: 'PURCHASES' },
    { code: 'NCC', name: 'Nota de Crédito (Compra)', description: 'Nota de Crédito (Compra)', isStandard: true, nature: 'OUT', type: 'PURCHASES' },
    { code: 'NDC', name: 'Nota de Débito (Compra)', description: 'Nota de Débito (Compra)', isStandard: true, nature: 'IN', type: 'PURCHASES' },
    { code: 'NEC', name: 'Nota de Encomenda (Compra)', description: 'Nota de Encomenda (Compra)', isStandard: true, nature: 'NONE', type: 'PURCHASES' },
    { code: 'GRC', name: 'Guia de Remessa (Compra)', description: 'Guia de Remessa (Compra)', isStandard: true, nature: 'IN', type: 'PURCHASES' }
];
exports.TREASURY_DOCUMENT_TYPES = [
    { code: 'RE', name: 'Recibo', description: 'Recibo de Cliente', isStandard: true, nature: 'RECEIVE', type: 'TREASURY' },
    { code: 'PA', name: 'Pagamento', description: 'Pagamento a Fornecedor', isStandard: true, nature: 'PAY', type: 'TREASURY' },
    { code: 'TR', name: 'Transferência', description: 'Transferência entre Contas', isStandard: true, nature: 'TRANSFER', type: 'TREASURY' },
    { code: 'DP', name: 'Depósito', description: 'Depósito Bancário', isStandard: true, nature: 'RECEIVE', type: 'TREASURY' },
    { code: 'LV', name: 'Levantamento', description: 'Levantamento de Fundos', isStandard: true, nature: 'PAY', type: 'TREASURY' }
];
exports.STOCK_DOCUMENT_TYPES = [
    { code: 'ENT', name: 'Entrada de Stock', description: 'Entrada de Stock', isStandard: true, nature: 'IN', type: 'STOCK' },
    { code: 'SAI', name: 'Saída de Stock', description: 'Saída de Stock', isStandard: true, nature: 'OUT', type: 'STOCK' },
    { code: 'TRA', name: 'Transferência Stock', description: 'Transferência entre Armazéns', isStandard: true, nature: 'TRANSFER', type: 'STOCK' },
    { code: 'INV', name: 'Inventário', description: 'Ajuste de Inventário', isStandard: true, nature: 'ADJUSTMENT', type: 'STOCK' }
];
//# sourceMappingURL=initial-data.js.map