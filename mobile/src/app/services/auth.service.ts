import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = environment.apiUrl + '/mobile';
    private currentUserSubject = new BehaviorSubject<any>(null);

    constructor(private http: HttpClient, private router: Router) {
        try {
            const savedUser = localStorage.getItem('mobile_user');
            if (savedUser) this.currentUserSubject.next(JSON.parse(savedUser));
        } catch (e) {
            console.error('Erro ao ler utilizador do storage:', e);
            localStorage.removeItem('mobile_user');
        }
    }

    register(userData: any) {
        return this.http.post(`${this.apiUrl}/register`, userData);
    }

    getGasTypes() {
        const companyId = this.user?.companyId;
        return this.http.get(`${this.apiUrl}/gas-types`, { params: companyId ? { companyId } : {} });
    }

    login(credentials: any) {
        return this.http.post(`${environment.apiUrl}/auth/login`, credentials).pipe(
            tap((response: any) => {
                const user = response.user;
                user.token = response.access_token;
                localStorage.setItem('mobile_user', JSON.stringify(user));
                this.currentUserSubject.next(user);

                this.router.navigate(['/tabs/home']);
            })
        );
    }

    refreshProfile() {
        return this.http.get(`${environment.apiUrl}/auth/profile`).pipe(
            tap((user: any) => {
                // Keep the existing token from the stored user
                const currentUser = this.user;
                if (currentUser && currentUser.token) {
                    user.token = currentUser.token;
                }
                localStorage.setItem('mobile_user', JSON.stringify(user));
                this.currentUserSubject.next(user);
            })
        );
    }

    submitOrder(orderData: any) {
        return this.http.post(`${this.apiUrl}/reseller/order`, orderData);
    }

    getPendingDeliveries() {
        return this.http.get(`${this.apiUrl}/driver/pending-deliveries`);
    }

    getAssignedRoute() {
        return this.http.get(`${this.apiUrl}/driver/assigned-route`);
    }

    claimDelivery(documentId: string) {
        return this.http.post(`${this.apiUrl}/driver/claim-delivery/${documentId}`, {});
    }

    cancelDelivery(documentId: string, justification: string) {
        return this.http.post(`${this.apiUrl}/driver/cancel-delivery/${documentId}`, { justification });
    }

    getPaymentMethods() {
        const companyId = this.user?.companyId;
        return this.http.get(`${this.apiUrl}/payment-methods`, { params: companyId ? { companyId } : {} });
    }

    // --- Delivery Point Methods ---

    getDeliveryPoints() {
        return this.http.get(`${this.apiUrl}/reseller/delivery-points`);
    }

    createDeliveryPoint(data: any) {
        return this.http.post(`${this.apiUrl}/reseller/delivery-points`, data);
    }

    updateDeliveryPoint(id: string, data: any) {
        return this.http.patch(`${this.apiUrl}/reseller/delivery-points/${id}`, data);
    }

    deleteDeliveryPoint(id: string) {
        return this.http.delete(`${this.apiUrl}/reseller/delivery-points/${id}`);
    }

    logout() {
        localStorage.removeItem('mobile_user');
        sessionStorage.removeItem('truck_plate_confirmed');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    get user$() {
        return this.currentUserSubject.asObservable();
    }

    get user() {
        return this.currentUserSubject.value;
    }
}
