import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = this.authService.getToken();
        const companyInfoStr = localStorage.getItem('erp_company_info');
        let companyId = null;
        if (companyInfoStr && companyInfoStr !== 'undefined' && companyInfoStr !== 'null') {
            try {
                const company = JSON.parse(companyInfoStr);
                if (company && typeof company === 'object') {
                    companyId = company.id || null;
                }
            } catch (e) {
                console.warn('Error parsing erp_company_info from localStorage', e);
            }
        }

        let headers: any = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (companyId) {
            headers['X-Company-Id'] = companyId;
        }

        if (Object.keys(headers).length > 0) {
            request = request.clone({
                setHeaders: headers
            });
        }
        return next.handle(request);
    }
}
