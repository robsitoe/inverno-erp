import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, PaymentRequest, PaymentStatus } from '../../services/payment.service';

@Component({
    selector: 'app-mobile-payment-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="bg-gray-50 border border-gray-200 rounded-xl p-6">
      <div class="flex items-center gap-4 mb-6">
        <div class="size-12 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm overflow-hidden p-1">
          <img [src]="wallet === 'MPESA' ? 'https://upload.wikimedia.org/wikipedia/commons/b/b8/M-Pesa_logo.png' : 'https://yt3.googleusercontent.com/I2vW848n1XmQ8m_JOfp0FkE-7k1X_wE_w-QW-_t0X6_8E8_B7E-7k1X_wE_w-QW-_t0X6_8E8_B7E-7k1X_wE_w-QW-_t0X6_8E8_B7E-7k1X_wE_w-QW-_t0X6_8E8_B7E' " 
               class="w-full h-auto object-contain" alt="Logo">
        </div>
        <div>
          <h3 class="font-bold text-gray-800">{{ wallet }} Payment</h3>
          <p class="text-xs text-gray-500">Introduza o seu número registado acima.</p>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase text-gray-400 mb-1 tracking-wider">Número de Telefone</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+258</span>
            <input type="text" [(ngModel)]="phoneNumber" 
                   maxlength="9"
                   placeholder="84/85/82/86/87..."
                   class="w-full pl-14 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono tracking-widest">
          </div>
        </div>

        <div class="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div class="flex items-center justify-between text-sm">
            <span class="text-blue-700">Total a Pagar:</span>
            <span class="font-bold text-blue-900">{{ amount | number:'1.2-2' }} MT</span>
          </div>
        </div>

        <div *ngIf="status === 'PENDING'" class="flex flex-col items-center justify-center py-4 space-y-3">
          <div class="flex gap-1">
            <div class="size-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0s"></div>
            <div class="size-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            <div class="size-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
          </div>
          <p class="text-sm font-medium text-blue-800 animate-pulse">Aguardando confirmação no seu telemóvel...</p>
          <p class="text-[10px] text-gray-400">Verifique o pedido USSD agora.</p>
        </div>

        <div *ngIf="status === 'SUCCESS'" class="flex flex-col items-center justify-center py-4 space-y-2 bg-green-50 rounded-lg border border-green-100">
          <span class="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
          <p class="text-sm font-bold text-green-800">Pagamento Confirmado!</p>
          <p class="text-[10px] text-green-600">ID Transação: {{ lastTransactionId }}</p>
        </div>

        <button *ngIf="status === 'IDLE'"
                (click)="pay()"
                [disabled]="!isValidNumber()"
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
           SUBMETER PAGAMENTO
        </button>
      </div>
    </div>
  `
})
export class MobilePaymentFormComponent {
    @Input() wallet: 'MPESA' | 'EMOLA' | 'M-KESH' = 'MPESA';
    @Input() amount: number = 0;
    @Input() companyId: string = '';
    @Output() onPaymentSuccess = new EventEmitter<PaymentStatus>();

    phoneNumber: string = '';
    status: 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED' = 'IDLE';
    lastTransactionId: string = '';

    constructor(private paymentService: PaymentService) { }

    isValidNumber(): boolean {
        return this.phoneNumber.length === 9 && /^[8][2-7]/.test(this.phoneNumber);
    }

    pay() {
        this.status = 'PENDING';

        const request: PaymentRequest = {
            phoneNumber: '258' + this.phoneNumber,
            amount: this.amount,
            wallet: this.wallet,
            reference: 'LICENSE-' + this.companyId,
            companyId: this.companyId
        };

        this.paymentService.processMobilePayment(request).subscribe(res => {
            this.status = 'SUCCESS';
            this.lastTransactionId = res.transactionId;
            setTimeout(() => {
                this.onPaymentSuccess.emit(res);
            }, 2000);
        });
    }
}
