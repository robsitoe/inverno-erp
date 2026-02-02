import { Injectable } from '@angular/core';
import { Customer } from './models';
import { SAMPLE_CUSTOMERS } from './sample-data';
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
            const allCustomers = await lastValueFrom(this.dataService.getCustomers());
            // Filter: 
            // 1. If it matches current company ID
            // 2. OR if it has NO company ID and we are in the main company (001)
            this.customers = allCustomers.filter(c => {
                if (c.companyId === this.activeCompanyId) return true;
                if (!c.companyId && this.activeCompanyId === '001') return true;
                return false;
            });

            // Only load local samples if truly empty for the DEFAULT company 001
            if (this.customers.length === 0 && this.activeCompanyId === '001') {
                this.customers = [...SAMPLE_CUSTOMERS].map(c => ({ ...c, companyId: '001' }));
            }
        } catch (e) {
            this.customers = [];
        }
    }


    private saveCustomers() {
        this.dataService.saveCustomer(this.customers).subscribe();
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
            this.saveCustomers();
        }
    }

    createCustomer(customer: Customer): void {
        if (this.activeCompanyId) {
            customer.companyId = this.activeCompanyId;
        }
        this.customers.push(customer);
        this.saveCustomers();
    }
}
