import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3000/auth';
    private currentUserSubject: BehaviorSubject<any>;
    public currentUser: Observable<any>;

    constructor(private http: HttpClient) {
        const storedUser = localStorage.getItem('erp_current_user');
        this.currentUserSubject = new BehaviorSubject<any>(storedUser ? JSON.parse(storedUser) : null);
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): any {
        return this.currentUserSubject.value;
    }

    login(credentials: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/login`, credentials)
            .pipe(
                tap(response => {
                    if (response.access_token && response.user) {
                        localStorage.setItem('access_token', response.access_token);
                        localStorage.setItem('erp_current_user', JSON.stringify(response.user));
                        this.currentUserSubject.next(response.user);
                    }
                }),
                map(response => response.user)
            );
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('erp_current_user');
        this.currentUserSubject.next(null);
    }

    getToken(): string | null {
        return localStorage.getItem('access_token');
    }
}
