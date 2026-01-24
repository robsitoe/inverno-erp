import { Injectable } from '@angular/core';
import { Subject, lastValueFrom } from 'rxjs';
import { Article, StockMovement, Warehouse, Batch } from './models';
import { SAMPLE_ARTICLES, SAMPLE_WAREHOUSES } from './sample-data';
import { DataService } from '../services/data.service';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    public articlesUpdated$ = new Subject<void>();
    private allArticles: Article[] = [];
    private articles: Article[] = [];

    private allWarehouses: Warehouse[] = [];
    private warehouses: Warehouse[] = [];

    private allBatches: Batch[] = [];
    private batches: Batch[] = [];

    private allStockMovements: StockMovement[] = [];
    private stockMovements: StockMovement[] = [];

    private nextMovementId = 1;
    private activeCompanyId: string | null = null;

    constructor(private dataService: DataService) {
        const storedCompany = localStorage.getItem('erp_company_info');
        if (storedCompany) {
            this.activeCompanyId = JSON.parse(storedCompany).id;
        }
        this.loadData();
    }

    public async loadData() {
        // Load articles
        try {
            this.allArticles = await lastValueFrom(this.dataService.getArticles());
            if (this.allArticles.length === 0) {
                this.allArticles = [...SAMPLE_ARTICLES];
                this.saveArticles();
            }
        } catch (e) {
            this.allArticles = [...SAMPLE_ARTICLES];
        }
        this.articles = this.filterByCompany(this.allArticles);

        // Load warehouses (Still from localStorage for now as no backend yet)
        const storedWarehouses = localStorage.getItem('erp_warehouses');
        if (storedWarehouses) {
            this.allWarehouses = JSON.parse(storedWarehouses);
        } else {
            this.allWarehouses = [...SAMPLE_WAREHOUSES];
            this.saveWarehouses();
        }
        this.warehouses = this.filterByCompany(this.allWarehouses);

        // Load batches
        const storedBatches = localStorage.getItem('erp_batches');
        if (storedBatches) {
            this.allBatches = JSON.parse(storedBatches);
        }
        this.batches = this.filterByCompany(this.allBatches);

        // Load stock movements (Still from localStorage for now)
        const storedMovements = localStorage.getItem('erp_stock_movements');
        if (storedMovements) {
            this.allStockMovements = JSON.parse(storedMovements);
        }
        this.stockMovements = this.filterByCompany(this.allStockMovements);

        // Recalculate stock from documents to ensure consistency
        this.recalculateStockFromDocuments();
    }

    private filterByCompany<T extends { companyId?: string }>(list: T[]): T[] {
        if (!this.activeCompanyId) return list;
        return list.filter(item => !item.companyId || item.companyId === this.activeCompanyId);
    }

    private recalculateStockFromDocuments() {
        const calculatedStocks = new Map<string, number>();
        const today = new Date().toISOString().split('T')[0];

        // 1. Stock Documents (Inventory)
        const storedDocuments = localStorage.getItem('erp_stock_documents');
        if (storedDocuments) {
            const allDocuments = JSON.parse(storedDocuments);
            const documents = this.filterByCompany(allDocuments);

            const storedTypes = localStorage.getItem('erp_stock_document_types');
            let docTypesMap = new Map<string, any>();

            if (storedTypes) {
                const docTypes = JSON.parse(storedTypes);
                docTypes.forEach((t: any) => docTypesMap.set(t.code, t));
            }

            documents.forEach((doc: any) => {
                if (doc.date > today) return;

                doc.lines.forEach((line: any) => {
                    const current = calculatedStocks.get(line.articleCode) || 0;
                    let isEntry = false;
                    let isExit = false;

                    const docType = docTypesMap.get(doc.type);
                    if (docType) {
                        // Use configuration if available
                        isEntry = docType.nature === 'IN' || docType.nature === 'ADJUSTMENT_IN';
                        isExit = docType.nature === 'OUT' || docType.nature === 'ADJUSTMENT_OUT';
                    } else {
                        // Fallback only if config missing
                        isEntry = ['FI', 'SI', 'LE', 'AIP', 'ENT'].includes(doc.type);
                        isExit = ['FS', 'AIN', 'LD', 'SAI'].includes(doc.type);
                    }

                    if (isEntry) {
                        calculatedStocks.set(line.articleCode, current + line.quantity);
                    } else if (isExit) {
                        calculatedStocks.set(line.articleCode, current - line.quantity);
                    }
                });
            });
        }

        // 2. Purchase Documents
        const storedPurchases = localStorage.getItem('erp_purchase_documents');
        if (storedPurchases) {
            const allPurchases = JSON.parse(storedPurchases);
            const purchases = this.filterByCompany(allPurchases);
            // Load Purchase Types Config
            const purchaseTypes = JSON.parse(localStorage.getItem('erp_purchase_document_types') || '[]');
            const purchaseTypesMap = new Map(purchaseTypes.map((t: any) => [t.code, t]));

            purchases.forEach((doc: any) => {
                if (doc.status !== 'POSTED') return;
                if (doc.date > today) return;

                const docType = purchaseTypesMap.get(doc.type) as any;
                let isEntry = false;
                let isExit = false;

                if (docType) {
                    if (docType.stockMovement) {
                        isEntry = docType.stockMovement === 'IN';
                        isExit = docType.stockMovement === 'OUT';
                    } else if (docType.nature) {
                        isEntry = docType.nature === 'IN';
                        isExit = docType.nature === 'OUT';
                    } else {
                        // Legacy Fallback
                        isEntry = ['FC', 'GR', 'ND', 'FCOMP'].includes(doc.type);
                        isExit = ['NC', 'DC'].includes(doc.type);
                    }
                } else {
                    isEntry = ['FC', 'GR', 'ND'].includes(doc.type);
                    isExit = ['NC', 'DC'].includes(doc.type);
                }

                if (!isEntry && !isExit) return;

                doc.lines.forEach((line: any) => {
                    if (!line.articleCode) return;
                    const current = calculatedStocks.get(line.articleCode) || 0;

                    if (isEntry) {
                        calculatedStocks.set(line.articleCode, current + line.quantity);
                    } else if (isExit) {
                        calculatedStocks.set(line.articleCode, current - line.quantity);
                    }
                });
            });
        }

        // 3. Sales Documents
        const storedSales = localStorage.getItem('erp_sales_documents');
        if (storedSales) {
            const allSales = JSON.parse(storedSales);
            const sales = this.filterByCompany(allSales);
            // Load Sales Types Config
            const salesTypes = JSON.parse(localStorage.getItem('erp_sales_document_types') || '[]');
            const salesTypesMap = new Map(salesTypes.map((t: any) => [t.code, t]));

            sales.forEach((doc: any) => {
                if (doc.status !== 'POSTED' && doc.status !== 'CONFIRMED') return;
                if (doc.date > today) return;

                const docType = salesTypesMap.get(doc.documentType || doc.type) as any; // Handle both field names
                let isEntry = false;
                let isExit = false;

                if (docType) {
                    if (docType.stockMovement) {
                        isEntry = docType.stockMovement === 'IN';
                        isExit = docType.stockMovement === 'OUT';
                    } else if (docType.nature) {
                        isEntry = docType.nature === 'IN';
                        isExit = docType.nature === 'OUT';
                    } else {
                        // Legacy Fallback
                        isExit = ['FA', 'FR', 'FS', 'GT', 'VD', 'GR'].includes(doc.documentType || doc.type);
                        isEntry = ['NC', 'DC', 'ND'].includes(doc.documentType || doc.type);
                    }
                } else {
                    isExit = ['FA', 'FR', 'FS', 'GT', 'VD', 'GR'].includes(doc.documentType || doc.type);
                    isEntry = ['NC', 'DC', 'ND'].includes(doc.documentType || doc.type);
                }

                if (!isEntry && !isExit) return;

                doc.lines.forEach((line: any) => {
                    if (!line.articleCode) return;
                    const current = calculatedStocks.get(line.articleCode) || 0;

                    if (isExit) {
                        calculatedStocks.set(line.articleCode, current - line.quantity);
                    } else if (isEntry) {
                        calculatedStocks.set(line.articleCode, current + line.quantity);
                    }
                });
            });
        }

        // Update articles with calculated stock
        let updated = false;
        this.articles.forEach(article => {
            if (article.stockControl) {
                const newStock = calculatedStocks.get(article.code) || 0;

                if (article.currentStock !== newStock) {
                    article.currentStock = newStock;
                    updated = true;
                }
            }
        });

        if (updated) {
            this.saveArticles();
        }
    }

    recalculateArticleStock(articleCode: string): number {
        const movements = this.calculateStockMovements(articleCode);
        const stock = movements.reduce((acc, mov) => acc + (mov.quantityIn - mov.quantityOut), 0);

        // Update article
        const article = this.articles.find(a => a.code === articleCode);
        if (article && article.currentStock !== stock) {
            article.currentStock = stock;
            this.saveArticles();
        }

        return stock;
    }

    private saveArticles() {
        this.dataService.saveArticle(this.allArticles).subscribe(() => {
            this.articlesUpdated$.next();
        });
    }

    private saveWarehouses() {
        localStorage.setItem('erp_warehouses', JSON.stringify(this.allWarehouses));
    }

    private saveBatches() {
        localStorage.setItem('erp_batches', JSON.stringify(this.allBatches));
    }

    private saveStockMovements() {
        localStorage.setItem('erp_stock_movements', JSON.stringify(this.allStockMovements));
    }

    // Articles
    getArticles(): Article[] {
        return this.articles;
    }

    getArticle(id: string): Article | undefined {
        return this.articles.find(a => a.id === id);
    }

    getArticleByCode(code: string): Article | undefined {
        return this.articles.find(a => a.code === code);
    }

    addArticle(article: Article): void {
        if (this.activeCompanyId) {
            article.companyId = this.activeCompanyId;
        }
        this.allArticles.push(article);
        this.articles = this.filterByCompany(this.allArticles);
        this.saveArticles();
    }

    updateArticle(article: Article): void {
        const index = this.allArticles.findIndex(a => a.id === article.id);
        if (index !== -1) {
            // Preserve calculated fields
            const currentStock = this.allArticles[index].currentStock;

            this.allArticles[index] = {
                ...article,
                currentStock: currentStock
            };

            // Update filtered list
            this.articles = this.filterByCompany(this.allArticles);
            this.saveArticles();
        }
    }

    // Warehouses
    getWarehouses(): Warehouse[] {
        return this.warehouses;
    }

    getDefaultWarehouse(): Warehouse | undefined {
        return this.warehouses.find(w => w.isDefault);
    }

    // Batches
    getBatches(articleCode?: string): Batch[] {
        if (articleCode) {
            return this.batches.filter(b => b.articleCode === articleCode && b.isActive);
        }
        return this.batches.filter(b => b.isActive);
    }

    // Stock Movements
    createStockMovement(movement: Omit<StockMovement, 'id'>): StockMovement {
        const newMovement: StockMovement = {
            ...movement,
            id: `SM${this.nextMovementId++}`,
            companyId: this.activeCompanyId || undefined
        };

        this.allStockMovements.push(newMovement);
        this.stockMovements = this.filterByCompany(this.allStockMovements);

        // Update article stock
        const article = this.articles.find(a => a.id === movement.articleId);
        if (article && article.stockControl) {
            if (movement.movementType === 'IN') {
                article.currentStock += movement.quantity;
            } else if (movement.movementType === 'OUT') {
                article.currentStock -= movement.quantity;
            }
            // Update in allArticles as well
            const allIndex = this.allArticles.findIndex(a => a.id === article.id);
            if (allIndex !== -1) {
                this.allArticles[allIndex].currentStock = article.currentStock;
            }
            this.saveArticles();
        }

        this.saveStockMovements();
        return newMovement;
    }

    // Process sales document stock movements
    processSalesStockMovements(salesDocId: string, salesLines: any[], documentNumber: string): void {
        const defaultWarehouse = this.getDefaultWarehouse();
        if (!defaultWarehouse) return;

        salesLines.forEach(line => {
            // Try to find by ID first, then by Code
            let article = this.getArticle(line.articleId);
            if (!article && line.articleCode) {
                article = this.getArticleByCode(line.articleCode);
            }

            if (article && article.stockControl) {
                this.createStockMovement({
                    date: new Date(),
                    articleId: article.id,
                    articleCode: article.code,
                    articleName: article.name,
                    warehouseId: defaultWarehouse.id,
                    movementType: 'OUT',
                    quantity: line.quantity,
                    unitCost: article.purchasePrice,
                    totalCost: article.purchasePrice * line.quantity,
                    reference: documentNumber,
                    sourceDocument: salesDocId,
                    notes: `Venda - ${documentNumber}`
                });
            }
        });
    }

    getStockMovements(articleId?: string): StockMovement[] {
        if (articleId) {
            return this.stockMovements.filter(m => m.articleId === articleId);
        }
        return this.stockMovements;
    }

    // Get current stock for an article
    getCurrentStock(articleId: string): number {
        const article = this.getArticle(articleId);
        return article?.currentStock || 0;
    }

    // Centralized Stock Calculation Logic
    calculateStockMovements(articleCode: string, warehouseFilter?: string, documentTypeFilter?: string): any[] {
        const movements: any[] = [];

        // Helper to check warehouse filter
        const matchesWarehouse = (wh: string) => !warehouseFilter || wh === warehouseFilter;

        // Load Document Type Configurations
        const stockDocTypes = JSON.parse(localStorage.getItem('erp_stock_document_types') || '[]');
        const salesDocTypes = JSON.parse(localStorage.getItem('erp_sales_document_types') || '[]');
        const purchaseDocTypes = JSON.parse(localStorage.getItem('erp_purchase_document_types') || '[]');

        const getDocConfig = (code: string, source: 'STOCK' | 'SALES' | 'PURCHASE') => {
            if (source === 'STOCK') return stockDocTypes.find((t: any) => t.code === code);
            if (source === 'SALES') return salesDocTypes.find((t: any) => t.code === code);
            if (source === 'PURCHASE') return purchaseDocTypes.find((t: any) => t.code === code);
            return null;
        };

        // 1. Process Stock Documents
        const storedStockDocs = localStorage.getItem('erp_stock_documents');
        if (storedStockDocs) {
            const documents = JSON.parse(storedStockDocs);
            documents.forEach((doc: any) => {
                if (documentTypeFilter && doc.type !== documentTypeFilter) return;

                doc.lines.forEach((line: any) => {
                    if (line.articleCode !== articleCode) return;

                    const lineWarehouse = line.warehouse || doc.warehouse || '';
                    if (!matchesWarehouse(lineWarehouse)) return;

                    let isEntry = false;
                    let isExit = false;

                    const config = getDocConfig(doc.type, 'STOCK');
                    if (config) {
                        if (config.nature) {
                            isEntry = config.nature === 'IN' || config.nature === 'ADJUSTMENT_IN';
                            isExit = config.nature === 'OUT' || config.nature === 'ADJUSTMENT_OUT';
                        } else if (config.stocks) {
                            isEntry = config.stockMovementPositiveType === 'Entrada';
                            isExit = config.stockMovementPositiveType === 'Saída';
                        } else {
                            isEntry = ['FI', 'SI', 'LE', 'AIP', 'ENT'].includes(doc.type);
                            isExit = ['FS', 'AIN', 'LD', 'SAI'].includes(doc.type);
                        }
                    } else {
                        // Fallback
                        isEntry = ['FI', 'SI', 'LE', 'AIP', 'ENT'].includes(doc.type);
                        isExit = ['FS', 'AIN', 'LD', 'SAI'].includes(doc.type);
                    }

                    if (!isEntry && !isExit) return;

                    movements.push({
                        date: doc.date,
                        documentType: doc.type,
                        documentNumber: `${doc.type} ${doc.series}/${doc.number}`,
                        documentId: doc.id,
                        description: line.description || doc.type,
                        warehouse: lineWarehouse,
                        quantityIn: isEntry ? line.quantity : 0,
                        quantityOut: isExit ? line.quantity : 0,
                        unitCost: line.unitPrice || 0
                    });
                });
            });
        }

        // 2. Process Sales Documents
        const storedSales = localStorage.getItem('erp_sales_documents');
        if (storedSales) {
            const salesDocs = JSON.parse(storedSales);
            salesDocs.forEach((doc: any) => {
                const type = doc.documentType || doc.type;
                if (doc.status !== 'POSTED' && doc.status !== 'CONFIRMED') return;
                if (documentTypeFilter && type !== documentTypeFilter) return;

                doc.lines.forEach((line: any) => {
                    if (line.articleCode !== articleCode) return;

                    const lineWarehouse = line.warehouse || '';
                    if (!matchesWarehouse(lineWarehouse)) return;

                    let isEntry = false;
                    let isExit = false;

                    const config = getDocConfig(type, 'SALES');
                    const docType = config as any;

                    if (docType) {
                        if (docType.stockMovement) {
                            isEntry = docType.stockMovement === 'IN';
                            isExit = docType.stockMovement === 'OUT';
                        } else if (docType.nature) {
                            isEntry = docType.nature === 'IN';
                            isExit = docType.nature === 'OUT';
                        } else {
                            // Legacy Fallback
                            isExit = ['FA', 'FR', 'FS', 'GT', 'VD', 'GR'].includes(type);
                            isEntry = ['NC', 'DC', 'ND'].includes(type);
                        }
                    } else {
                        // Fallback
                        isExit = ['FA', 'FR', 'FS', 'GT', 'VD', 'GR'].includes(type);
                        isEntry = ['NC', 'DC', 'ND'].includes(type);
                    }

                    if (!isEntry && !isExit) return;

                    movements.push({
                        date: doc.date,
                        documentType: type,
                        documentNumber: doc.documentNumber,
                        documentId: doc.id,
                        description: line.articleName || 'Venda',
                        warehouse: lineWarehouse,
                        quantityIn: isEntry ? line.quantity : 0,
                        quantityOut: isExit ? line.quantity : 0,
                        unitCost: line.unitPrice || 0
                    });
                });
            });
        }

        // 3. Process Purchase Documents
        const storedPurchases = localStorage.getItem('erp_purchase_documents');
        if (storedPurchases) {
            const purchaseDocs = JSON.parse(storedPurchases);
            purchaseDocs.forEach((doc: any) => {
                if (doc.status !== 'POSTED') return;
                if (documentTypeFilter && doc.type !== documentTypeFilter) return;

                doc.lines.forEach((line: any) => {
                    if (line.articleCode !== articleCode) return;

                    const lineWarehouse = line.warehouse || '';
                    if (!matchesWarehouse(lineWarehouse)) return;

                    let isEntry = false;
                    let isExit = false;

                    const config = getDocConfig(doc.type, 'PURCHASE');
                    const docType = config as any;

                    if (docType) {
                        if (docType.stockMovement) {
                            isEntry = docType.stockMovement === 'IN';
                            isExit = docType.stockMovement === 'OUT';
                        } else if (docType.nature) {
                            isEntry = docType.nature === 'IN';
                            isExit = docType.nature === 'OUT';
                        } else {
                            isEntry = ['FC', 'GR', 'ND'].includes(doc.type);
                            isExit = ['NC', 'DC'].includes(doc.type);
                        }
                    } else {
                        // Fallback
                        isEntry = ['FC', 'GR', 'ND'].includes(doc.type);
                        isExit = ['NC', 'DC'].includes(doc.type);
                    }

                    if (!isEntry && !isExit) return;

                    movements.push({
                        date: doc.date,
                        documentType: doc.type,
                        documentNumber: `${doc.type} ${doc.series}/${doc.number}`,
                        documentId: doc.id,
                        description: line.articleName || 'Compra',
                        warehouse: lineWarehouse,
                        quantityIn: isEntry ? line.quantity : 0,
                        quantityOut: isExit ? line.quantity : 0,
                        unitCost: line.unitPrice || 0
                    });
                });
            });
        }

        return movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    getStockBalanceAtDate(articleCode: string, date: string, warehouseFilter?: string): number {
        const movements = this.calculateStockMovements(articleCode, warehouseFilter);
        const targetDate = new Date(date);

        return movements.reduce((balance, mov) => {
            if (new Date(mov.date) <= targetDate) {
                return balance + (mov.quantityIn - mov.quantityOut);
            }
            return balance;
        }, 0);
    }

    hasStock(articleId: string, quantity: number): boolean {
        const article = this.getArticle(articleId);
        if (!article || !article.stockControl) return true;
        return article.currentStock >= quantity;
    }
}
