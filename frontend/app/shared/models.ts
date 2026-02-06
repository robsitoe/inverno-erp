// Core Data Models for the ERP System

export interface SystemConfig {
    deploymentMode: 'LOCAL' | 'WEB';
    localStorageType: 'BROWSER' | 'POSTGRES';
    apiUrl: string;
}

export interface CompanyInfo {
    id?: string;
    name: string;
    nif: string;
    address: string;
    email: string;
    phone: string;
    website: string;
}

export interface FiscalYear {
    companyId: string;
    year: number;
    isCurrent?: boolean;
}

export interface Account {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    description?: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    parentId?: string;
    level: number;
    balance: number;
    allowPosting: boolean;
    isActive: boolean;
}


export interface Journal {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    type: 'SALES' | 'PURCHASES' | 'CASH' | 'BANK' | 'GENERAL' | 'OPERATIONS';
    isActive: boolean;
}

export interface JournalEntry {
    id: string;
    companyId?: string;
    journalId: string; // The journal this entry belongs to
    date: Date;
    description: string;
    reference: string;
    sourceDocument?: string;
    sourceType?: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'RECEIPT' | 'MANUAL' | 'REVERSAL' | 'CORRECTION';
    lines: JournalLine[];
    status: 'DRAFT' | 'POSTED' | 'CANCELLED' | 'REVERSED' | 'CORRECTED' | 'VOIDED';
    createdBy: string;
    createdAt: Date;
    updatedBy?: string;
    updatedAt?: Date;
    correctionReason?: string;
    relatedEntryId?: string; // ID of the original entry if this is a correction/reversal, or ID of the reversal/correction if this is the original
}

export interface AuditLog {
    id: string;
    companyId?: string;
    entityType: 'JOURNAL_ENTRY' | 'SALES_DOCUMENT' | 'ACCOUNT';
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'REVERSE' | 'CORRECT';
    userId: string;
    timestamp: Date;
    details: string;
    previousState?: any;
    newState?: any;
    reason?: string;
}

export interface JournalLine {
    id: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description: string;
}

export interface Article {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    description: string;
    familyId?: string;
    unit: string;
    purchasePrice: number;
    salePrice: number;
    ivaRate: number;
    ivaCode: string;
    stockControl: boolean;
    currentStock: number;
    minStock: number;
    maxStock: number;
    revenueAccountId: string;
    cogsAccountId: string;
    inventoryAccountId: string;
    isActive: boolean;
}

export interface SalesDocument {
    id: string;
    companyId?: string;
    documentType: string;
    documentNumber: string;
    series?: string;
    seriesNumber?: number;
    date: Date;
    dueDate: Date;
    customerId: string;
    customerName: string;
    customerNif: string;
    customerAddress?: string;
    lines: SalesDocumentLine[];
    subtotal: number;
    discounts: number;
    totalIva: number;
    total: number;
    status: 'DRAFT' | 'CONFIRMED' | 'INVOICED' | 'CANCELLED';
    journalEntryId?: string;
    notes: string;
}

export interface SalesDocumentLine {
    id: string;
    articleId: string;
    articleCode: string;
    articleName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    ivaRate: number;
    ivaCode: string;
    subtotal: number;
    ivaAmount: number;
    total: number;
}

export interface Customer {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    nif: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    paymentTerms: number;
    creditLimit: number;
    currentBalance: number;
    receivableAccountId: string;
    isActive: boolean;
}

export interface Supplier {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    nif: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    paymentTerms: number;
    creditLimit: number;
    currentBalance: number;
    payableAccountId: string;
    isActive: boolean;
}

export interface GenericEntity {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    nif: string;
    address: string;
    type: string; // Refers to EntityTypeCode (e.g., 'SOCIO', 'FUNC')
    accountId: string; // Dedicated accounting account
    isActive: boolean;
}

export interface PaymentMethod {
    id: string;
    companyId?: string;
    code: string;              // 'NUM', 'TRF', 'CHQ', 'MB', 'MBWAY', 'MPESA'
    description: string;       // 'Numerário', 'Transferência Bancária', etc.
    treasuryAccountId: string; // ID da conta de tesouraria (ex: '3' = 11.1.1 Caixa)
    isActive: boolean;
    sortOrder: number;         // Order for display in dropdowns
}

export interface StockMovement {
    id: string;
    companyId?: string;
    date: Date;
    articleId: string;
    articleCode: string;
    articleName: string;
    warehouseId: string;
    locationId?: string;
    batchId?: string;
    movementType: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
    quantity: number;
    unitCost: number;
    totalCost: number;
    reference: string;
    sourceDocument?: string;
    notes: string;
}

export interface Warehouse {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    address: string;
    isDefault: boolean;
    isActive: boolean;
}

export interface StockDocumentType {
    id: string;
    companyId?: string;
    code: string; // Código do tipo (ex: FI, FS, SI, AIP, AIN, etc.)
    name: string; // Nome do tipo (ex: "Entrada de Stock", "Saída de Stock")
    description: string; // Descrição detalhada
    category: 'ENTRY' | 'EXIT' | 'TRANSFER' | 'ADJUSTMENT' | 'TRANSFORMATION'; // Categoria
    movementType: 'IN' | 'OUT' | 'NEUTRAL'; // Tipo de movimento (entrada, saída ou neutro)
    affectsStock: boolean; // Se afeta o stock
    requiresWarehouse: boolean; // Se requer armazém
    requiresLocation: boolean; // Se requer localização
    requiresBatch: boolean; // Se requer lote
    allowsNegativeStock: boolean; // Se permite stock negativo
    requiresApproval: boolean; // Se requer aprovação
    defaultSeries: string; // Série padrão
    numberingSequence: string; // Sequência de numeração
    accountingIntegration: boolean; // Se integra com contabilidade
    defaultDebitAccount?: string; // Conta débito padrão
    defaultCreditAccount?: string; // Conta crédito padrão
    icon: string; // Ícone Material Symbols
    color: string; // Cor para identificação visual
    isActive: boolean; // Se está ativo
    sortOrder: number; // Ordem de exibição
    createdAt: Date;
    updatedAt?: Date;
}

export interface Batch {
    id: string;
    companyId?: string;
    code: string;
    description: string;
    articleCode: string;
    expiryDate?: string;
    manufactureDate?: string;
    quantity?: number;
    isActive: boolean;
}

// Financial Report Configuration Models
export interface FinancialReportConfig {
    id: string;
    companyId?: string;
    code: string; // e.g., 'BALANCE_SHEET', 'INCOME_STATEMENT'
    name: string; // e.g., 'Balanço', 'Demonstração de Resultados'
    sections: FinancialReportSection[];
    isSystem: boolean; // If true, cannot be deleted (but maybe edited)
}

export interface FinancialReportSection {
    id: string;
    name: string; // e.g., 'Ativo', 'Passivo'
    order: number;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'CALCULATED';
    lines: FinancialReportLine[];
    totalLabel?: string; // e.g., 'Total do Ativo'
}

export interface FinancialReportLine {
    id: string;
    name: string; // e.g., 'Ativos Fixos Tangíveis'
    order: number;
    accountRanges: string[]; // e.g., ['43', '44'] - startsWith logic
    excludedAccounts?: string[]; // e.g., ['43.9']
    formula?: string; // For calculated lines, e.g., 'TOTAL_REVENUE - TOTAL_EXPENSE'
    isTotal?: boolean; // If true, it sums up the lines above in the section
    visible: boolean;
}

export interface Series {
    id: string; // Unique ID (e.g., 'SERIES_2025_COMPANY_1')
    companyId: string;
    code: string; // e.g., '2025', 'A'
    description: string; // e.g., 'Série 2025'
    startDate: string;
    endDate: string;
    active: boolean;
    isDefault?: boolean;
    module?: 'GLOBAL' | 'SALES' | 'PURCHASES' | 'STOCK'; // Optional, if we want to scope series
}
