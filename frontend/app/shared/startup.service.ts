import { Injectable } from '@angular/core';
import { SALES_DOCUMENT_TYPES, PURCHASE_DOCUMENT_TYPES, TREASURY_DOCUMENT_TYPES, STOCK_DOCUMENT_TYPES } from './constants';

@Injectable({
    providedIn: 'root'
})
export class StartupService {

    constructor() { }

    init() {
        this.initializeDocumentTypes();
        // Add other initialization logic here (e.g. tax rates, units, etc if needed)
    }

    private initializeDocumentTypes() {
        // Sales
        if (!localStorage.getItem('erp_sales_document_types')) {
            const types = SALES_DOCUMENT_TYPES.map(t => ({ ...t, module: 'SALES', series: [], isActive: true }));
            localStorage.setItem('erp_sales_document_types', JSON.stringify(types));
            console.log('Initialized Sales Document Types');
        }

        // Purchases
        if (!localStorage.getItem('erp_purchase_document_types')) {
            const types = PURCHASE_DOCUMENT_TYPES.map(t => ({ ...t, module: 'PURCHASES', series: [], isActive: true }));
            localStorage.setItem('erp_purchase_document_types', JSON.stringify(types));
            console.log('Initialized Purchase Document Types');
        }

        // Treasury
        if (!localStorage.getItem('erp_treasury_document_types')) {
            const types = TREASURY_DOCUMENT_TYPES.map(t => ({ ...t, module: 'TREASURY', series: [], isActive: true }));
            localStorage.setItem('erp_treasury_document_types', JSON.stringify(types));
            console.log('Initialized Treasury Document Types');
        }

        // Stock
        if (!localStorage.getItem('erp_stock_document_types')) {
            const types = STOCK_DOCUMENT_TYPES.map(t => ({ ...t, module: 'STOCK', series: [], isActive: true }));
            localStorage.setItem('erp_stock_document_types', JSON.stringify(types));
            console.log('Initialized Stock Document Types');
        }
    }
}
