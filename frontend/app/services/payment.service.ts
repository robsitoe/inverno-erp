import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';

export interface PaymentRequest {
    phoneNumber: string;
    amount: number;
    wallet: 'MPESA' | 'EMOLA' | 'M-KESH';
    reference: string;
    companyId: string;
}

export interface PaymentStatus {
    transactionId: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    message: string;
    licenseToken?: string; // If auto-activating after payment
}

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private readonly apiBase = 'http://localhost:3000/payments'; // Placeholder

    constructor(private http: HttpClient) { }

    /**
     * Procesa um pagamento via carteira móvel.
     * Simula o envio de um USSD Push para o telemóvel do utilizador.
     */
    processMobilePayment(request: PaymentRequest): Observable<PaymentStatus> {
        console.log(`[PaymentService] Iniciando pagamento via ${request.wallet} para ${request.phoneNumber} no valor de ${request.amount} MT`);

        // Simulação de delay de rede e confirmação do utilizador (5 segundos)
        return of({
            transactionId: 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            status: 'SUCCESS',
            message: 'Pagamento confirmado com sucesso!'
        } as PaymentStatus).pipe(
            delay(5000)
        );
    }
}
