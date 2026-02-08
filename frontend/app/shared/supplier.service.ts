import { Injectable } from '@angular/core';
import { Supplier } from './models';
import { SUPPLIERS } from './constants';
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
            const allSuppliers = await lastValueFrom(this.dataService.getSuppliers());
            // Filter:
            // 1. Matches current company
            // 2. No company ID and we are in company 001
            this.suppliers = allSuppliers;

            if (this.suppliers.length === 0 && this.activeCompanyId === '001') {
                // Convert sample data for company 001 only
                this.suppliers = SUPPLIERS.map(s => ({
                    id: s.code,
                    companyId: '001',
                    code: s.code,
                    name: s.name,
                    nif: s.nif,
                    address: s.address,
                    city: 'Lisboa',
                    postalCode: '1000-000',
                    country: 'PT',
                    phone: '',
                    email: '',
                    paymentTerms: 30,
                    creditLimit: 0,
                    currentBalance: 0,
                    payableAccountId: '',
                    isActive: true
                }));
            }
        } catch (e) {
            this.suppliers = [];
        }
    }


    private saveSuppliers() {
        this.dataService.saveSupplier(this.suppliers).subscribe();
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
            this.saveSuppliers();
        }
    }

    createSupplier(supplier: Supplier): void {
        if (this.activeCompanyId) {
            supplier.companyId = this.activeCompanyId;
        }
        this.suppliers.push(supplier);
        this.saveSuppliers();
    }
}
