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
    private readonly STORAGE_KEY = 'erp_customers';

    constructor(private dataService: DataService) {
        this.loadCustomers();
    }

    public async loadCustomers() {
        try {
            this.customers = await lastValueFrom(this.dataService.getCustomers());
            if (this.customers.length === 0) {
                this.customers = [...SAMPLE_CUSTOMERS];
                this.saveCustomers();
            }
        } catch (e) {
            this.customers = [...SAMPLE_CUSTOMERS];
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
        this.customers.push(customer);
        this.saveCustomers();
    }
}
