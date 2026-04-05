import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class MobileApiService {
    private apiUrl = environment.apiUrl + '/mobile';

    constructor(private http: HttpClient) { }

    // Reseller
    getProjections() {
        return this.http.get(`${this.apiUrl}/reseller/projections`);
    }

    createOrder(orderData: any) {
        return this.http.post(`${this.apiUrl}/reseller/order`, orderData);
    }

    // Driver
    updateStatus(statusData: any) {
        return this.http.post(`${this.apiUrl}/driver/status`, statusData);
    }

    getTruckInventory(plate: string) {
        return this.http.get(`${this.apiUrl}/driver/inventory/${plate}`);
    }

    createDirectSale(saleData: any) {
        return this.http.post(`${this.apiUrl}/driver/direct-sale`, saleData);
    }

    getPendingDeliveries() {
        return this.http.get<any[]>(`${this.apiUrl}/driver/pending-deliveries`);
    }

    claimDelivery(id: string) {
        return this.http.post(`${this.apiUrl}/driver/claim-delivery/${id}`, {});
    }

    getAssignedRoute() {
        return this.http.get<any[]>(`${this.apiUrl}/driver/assigned-route`);
    }

    completeDelivery(data: any) {
        return this.http.post(`${this.apiUrl}/driver/complete-delivery`, data);
    }

    cancelDelivery(id: string, reason: string) {
        return this.http.post(`${this.apiUrl}/driver/cancel-delivery/${id}`, { reason });
    }

    // Payments
    getPaymentMethods() {
        return this.http.get<any[]>(`${this.apiUrl}/payment-methods`);
    }

    initiateMpesa(paymentData: any) {
        return this.http.post(`${this.apiUrl}/mpesa/pay`, paymentData);
    }

    getCompanies() {
        return this.http.get<any[]>(`${this.apiUrl}/companies`);
    }

    getGasTypes() {
        return this.http.get<any[]>(`${this.apiUrl}/gas-types`);
    }

    register(data: any) {
        return this.http.post(`${this.apiUrl}/register`, data);
    }

    getHistory() {
        return this.http.get<any>(`${this.apiUrl}/history`);
    }
}
