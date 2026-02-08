import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToasterService } from '../services/toaster.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(
        private toasterService: ToasterService,
        private authService: AuthService
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                let errorMessage = 'Ocorreu um erro desconhecido.';

                if (error.status === 401) {
                    // Auto logout if 401 response returned from api
                    this.authService.logout();
                    this.toasterService.showError('Sessão Expirada', 'A sua sessão expirou. Por favor, entre novamente.');

                    // Since we are not using Angular Router, we force a reload to return to login state
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);

                    return throwError(() => error);
                }

                if (error.status === 0) {
                    errorMessage = 'Não foi possível ligar ao servidor (Connection Refused). Verifique se o backend está a correr.';
                } else if (error.error instanceof ErrorEvent) {
                    // Client-side error
                    errorMessage = `Erro: ${error.error.message}`;
                } else {
                    // Server-side error
                    const msg = error.error?.message || error.message;
                    errorMessage = Array.isArray(msg) ? msg.join(', ') : msg;
                }

                this.toasterService.showError('Erro na Operação', errorMessage);
                return throwError(() => error);
            })
        );
    }
}
