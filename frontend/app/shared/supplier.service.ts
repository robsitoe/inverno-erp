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
    private readonly STORAGE_KEY = 'erp_suppliers';

    constructor(private dataService: DataService) {
        this.loadSuppliers();
    }

    public async loadSuppliers() {
        try {
            this.suppliers = await lastValueFrom(this.dataService.getSuppliers());
            if (this.suppliers.length === 0) {
                // Convert sample data to match Supplier interface if needed
                this.suppliers = SUPPLIERS.map(s => ({
                    id: s.code,
                    code: s.code,
                    name: s.name,
                    nif: s.nif,
                    address: s.address,
                    city: 'Lisboa', // Default
                    postalCode: '1000-000', // Default
                    country: 'PT',
                    phone: '',
                    email: '',
                    paymentTerms: 30,
                    creditLimit: 0,
                    currentBalance: 0,
                    payableAccountId: '', // To be filled
                    isActive: true
                }));
                this.saveSuppliers();
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
        this.suppliers.push(supplier);
        this.saveSuppliers();
    }
}
