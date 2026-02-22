import { Injectable } from '@angular/core';
import { Supplier } from './models';
import { DataService } from '../services/data.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SupplierService {
    private suppliers: Supplier[] = [];
    private activeCompanyId: string | null = null;

    constructor(private dataService: DataService) {
        this.dataService.activeCompany$.subscribe(company => {
            if (company) {
                this.activeCompanyId = company.id;
                const token = localStorage.getItem('access_token');
                const isLocal = localStorage.getItem('erp_system_config')?.includes('BROWSER');
                if (token || isLocal) {
                    this.loadSuppliers();
                }
            } else {
                this.activeCompanyId = null;
                this.suppliers = [];
            }
        });
    }

    public async loadSuppliers() {
        try {
            this.suppliers = await lastValueFrom(this.dataService.getSuppliers());
        } catch (e) {
            console.error('Failed to load suppliers:', e);
            this.suppliers = [];
        }
    }

    getSuppliers(): Supplier[] {
        return this.suppliers;
    }

    getSupplier(id: string): Supplier | undefined {
        return this.suppliers.find(s => s.id === id || s.code === id);
    }

    updateSupplier(supplier: Supplier): void {
        const index = this.suppliers.findIndex(s => s.id === supplier.id);
        if (index !== -1) {
            this.suppliers[index] = supplier;
        }
        this.dataService.saveSupplier(supplier).subscribe({
            next: (saved) => {
                if (saved?.id && index !== -1) this.suppliers[index] = saved;
            },
            error: (err) => console.error('Error saving supplier:', err)
        });
    }

    createSupplier(supplier: Supplier): void {
        if (this.activeCompanyId) {
            supplier.companyId = this.activeCompanyId;
        }
        this.dataService.saveSupplier(supplier).subscribe({
            next: (saved) => {
                if (saved) this.suppliers.push(saved);
            },
            error: (err) => console.error('Error creating supplier:', err)
        });
    }
}
