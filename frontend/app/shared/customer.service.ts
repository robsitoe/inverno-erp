import { Injectable } from '@angular/core';
import { Customer } from './models';
import { DataService } from '../services/data.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CustomerService {
    private customers: Customer[] = [];
    private activeCompanyId: string | null = null;

    constructor(private dataService: DataService) {
        this.dataService.activeCompany$.subscribe(company => {
            if (company) {
                this.activeCompanyId = company.id;
                const token = localStorage.getItem('access_token');
                const isLocal = localStorage.getItem('erp_system_config')?.includes('BROWSER');
                if (token || isLocal) {
                    this.loadCustomers();
                }
            } else {
                this.activeCompanyId = null;
                this.customers = [];
            }
        });
    }

    public async loadCustomers() {
        try {
            this.customers = await lastValueFrom(this.dataService.getCustomers());
        } catch (e) {
            console.error('Failed to load customers:', e);
            this.customers = [];
        }
    }

    getCustomers(): Customer[] {
        return this.customers;
    }

    getCustomer(id: string): Customer | undefined {
        return this.customers.find(c => c.id === id || c.code === id);
    }

    updateCustomer(customer: Customer): void {
        const index = this.customers.findIndex(c => c.id === customer.id);
        if (index !== -1) {
            this.customers[index] = customer;
        }
        // Save only the single customer to backend
        this.dataService.saveCustomer(customer).subscribe({
            next: (saved) => {
                if (saved?.id) this.customers[index] = saved;
            },
            error: (err) => console.error('Error saving customer:', err)
        });
    }

    createCustomer(customer: Customer): void {
        if (this.activeCompanyId) {
            customer.companyId = this.activeCompanyId;
        }
        this.dataService.saveCustomer(customer).subscribe({
            next: (saved) => {
                if (saved) this.customers.push(saved);
            },
            error: (err) => console.error('Error creating customer:', err)
        });
    }

    getDeliveryPoints(customerId: string) {
        return this.dataService.getDeliveryPoints(customerId);
    }

    saveDeliveryPoint(point: any) {
        return this.dataService.saveDeliveryPoint(point);
    }

    deleteDeliveryPoint(id: string) {
        return this.dataService.deleteDeliveryPoint(id);
    }
}
