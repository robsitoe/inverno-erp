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
     * Simula o envio de um USSD Push e, se bem sucedido, cria/renova a licença no servidor.
     */
    processMobilePayment(request: PaymentRequest): Observable<PaymentStatus> {
        console.log(`[PaymentService] Iniciando pagamento via ${request.wallet} para ${request.phoneNumber} no valor de ${request.amount} MT`);

        // Simulação de delay de rede e confirmação do utilizador (3 segundos)
        return of({
            transactionId: 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            status: 'SUCCESS',
            message: 'Pagamento confirmado com sucesso!'
        } as PaymentStatus).pipe(
            delay(3000),
            // APÓS O PAGAMENTO, vamos avisar o backend para gerar a licença real
            // Assumimos que o plano é deduzido do montante ou passado no contexto
            // Como temos o companyId, o backend pode gerar o plano correto
            map(status => {
                // Aqui fazemos uma chamada interna (ou retornamos o status para o componente fazer)
                // Para manter simples, vamos apenas retornar o status e o componente tratará
                return status;
            })
        );
    }

    /**
     * Efetiva a subscrição no servidor após o pagamento ser confirmado.
     * Isto garante que o registo da licença seja criado na base de dados principal.
     */
    confirmSubscription(companyId: string, plan: string): Observable<any> {
        return this.http.post(`${this.apiBase.replace('/payments', '/licenses')}/subscribe`, {
            companyId,
            plan
        });
    }
}
