import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LicenseService, LicenseInfo, LicensePlanDefinition, LicenseRenewalInfo } from '../../services/license.service';
import { MobilePaymentFormComponent } from './mobile-payment-form.component';
import { PaymentStatus } from '../../services/payment.service';

@Component({
  selector: 'app-license-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, MobilePaymentFormComponent],
  template: `
    <div class="space-y-6 p-2 h-full overflow-y-auto">

      <!-- Tabs Navigation -->
      <div class="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
        <button (click)="activeTab = 'status'" 
                [class]="'px-4 py-1.5 rounded-md text-xs font-bold transition-all ' + (activeTab === 'status' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700')">
          STATUS ATUAL
        </button>
        <button (click)="activeTab = 'buy'" 
                [class]="'px-4 py-1.5 rounded-md text-xs font-bold transition-all ' + (activeTab === 'buy' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700')">
          COMPRAR / RENOVAR
        </button>
        <button (click)="activeTab = 'activate'" 
                [class]="'px-4 py-1.5 rounded-md text-xs font-bold transition-all ' + (activeTab === 'activate' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700')">
          ATIVAR MANUAL
        </button>
      </div>

      <!-- STATUS TAB -->
      <div *ngIf="activeTab === 'status'" class="animate-fade-in space-y-4">
          <!-- Status Card -->
          <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
                 [ngClass]="{
                   'bg-green-50': license?.valid && (license?.plan !== 'DEMO') && !license?.offline,
                   'bg-blue-50': license?.plan === 'DEMO',
                   'bg-amber-50': license?.inGracePeriod,
                   'bg-red-50': !license?.valid
                 }">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-2xl"
                      [ngClass]="{
                        'text-green-600': license?.valid && (license?.plan !== 'DEMO') && !license?.offline,
                        'text-blue-600': license?.plan === 'DEMO',
                        'text-amber-600': license?.inGracePeriod,
                        'text-red-600': !license?.valid
                      }">
                  {{ license?.valid ? 'verified' : 'gpp_bad' }}
                </span>
                <div>
                  <h2 class="text-base font-bold text-gray-800">Estado da Licença</h2>
                  <p class="text-xs text-gray-500">Versão {{ license?.plan }} instalada</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                      [ngClass]="{
                        'bg-green-100 text-green-700': license?.status === 'ACTIVE',
                        'bg-amber-100 text-amber-700': license?.status === 'GRACE',
                        'bg-red-100 text-red-700': license?.status === 'EXPIRED' || license?.status === 'REVOKED',
                        'bg-gray-100 text-gray-600': license?.status === 'INVALID'
                      }">
                  {{ statusLabel }}
                </span>

                <span *ngIf="license?.offline" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                  Offline
                </span>

                <button (click)="refresh()" title="Atualizar" class="text-gray-400 hover:text-blue-600 transition-colors ml-1">
                  <span class="material-symbols-outlined text-[18px]" [class.animate-spin]="refreshing">refresh</span>
                </button>
              </div>
            </div>

            <div class="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Plano</p>
                <p class="text-lg font-bold" [ngClass]="{
                  'text-blue-600': license?.plan === 'PRO',
                  'text-amber-600': license?.plan === 'ENTERPRISE',
                  'text-gray-600': license?.plan === 'DEMO'
                }">{{ license?.plan || '---' }}</p>
              </div>
              <div class="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Empresa</p>
                <p class="text-sm font-semibold text-gray-800 truncate">{{ license?.companyName || '---' }}</p>
              </div>
              <div class="text-center p-3 rounded-lg border"
                   [ngClass]="{
                     'bg-green-50 border-green-100': (license?.daysRemaining || 0) > 30,
                     'bg-amber-50 border-amber-100': (license?.daysRemaining || 0) <= 30 && (license?.daysRemaining || 0) > 0,
                     'bg-red-50 border-red-100': (license?.daysRemaining || 0) <= 0
                   }">
                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Dias Restantes</p>
                <p class="text-2xl font-bold" [ngClass]="{
                  'text-green-600': (license?.daysRemaining || 0) > 30,
                  'text-amber-600': (license?.daysRemaining || 0) <= 30 && (license?.daysRemaining || 0) > 0,
                  'text-red-600': (license?.daysRemaining || 0) <= 0
                }">{{ license?.daysRemaining ?? '---' }}</p>
              </div>
              <div class="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Expira em</p>
                <p class="text-sm font-semibold text-gray-800">{{ license?.expiresAt | date:'dd/MM/yyyy' }}</p>
              </div>
            </div>

            <!-- Features -->
            <div *ngIf="license?.features?.length" class="px-6 pb-4">
              <p class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Módulos Incluídos</p>
              <div class="flex flex-wrap gap-2">
                <span *ngFor="let f of license?.features"
                      class="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium tracking-wide">
                  {{ f }}
                </span>
              </div>
            </div>

            <!-- Offline Notice -->
            <div *ngIf="license?.offline" class="mx-6 mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-700 flex items-center gap-2 font-medium">
              <span class="material-symbols-outlined text-[16px]">cloud_off</span>
              Sem conexão ao servidor. Última validação: {{ license?.lastServerCheckAt | date:'dd/MM/yyyy HH:mm' }}.
            </div>
            <div class="px-6 pb-6 grid md:grid-cols-2 gap-4">
              <div class="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p class="text-[10px] text-blue-500 uppercase font-bold tracking-wider mb-1">Próximo Vencimento</p>
                <p class="text-base font-bold text-blue-700">{{ nextExpiration | date:'dd/MM/yyyy HH:mm' }}</p>
                <p class="text-xs text-blue-600 mt-1">Baseado na vigência acumulada de renovações.</p>
              </div>

              <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Últimas Renovações</p>
                  <button (click)="loadRenewals()" class="text-[10px] font-bold text-blue-600 hover:text-blue-700">Atualizar</button>
                </div>
                <div *ngIf="loadingRenewals" class="text-xs text-gray-500">A carregar histórico...</div>
                <div *ngIf="!loadingRenewals && !renewals.length" class="text-xs text-gray-500">Sem renovações registadas.</div>
                <div *ngIf="!loadingRenewals && renewals.length" class="space-y-2">
                  <div *ngFor="let renewal of renewals | slice:0:3" class="text-xs bg-white rounded border border-gray-200 px-3 py-2">
                    <div class="flex justify-between gap-2">
                      <span class="font-semibold text-gray-700">{{ renewal.paidAt | date:'dd/MM/yyyy' }}</span>
                      <span class="text-gray-500">+{{ renewal.durationDays }} dias</span>
                    </div>
                    <div class="text-gray-600 mt-1">
                      Novo vencimento: <span class="font-semibold">{{ renewal.newExpiresAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <div *ngIf="renewal.amount !== null && renewal.amount !== undefined" class="text-gray-500">Valor: {{ renewal.amount | number:'1.2-2' }} MZN</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

      <!-- BUY / RENEW TAB -->
      <div *ngIf="activeTab === 'buy'" class="animate-fade-in space-y-6">
          <div *ngIf="loadingPlans" class="flex items-center justify-center py-20">
            <span class="material-symbols-outlined animate-spin text-blue-600 text-4xl">refresh</span>
          </div>

          <div *ngIf="!loadingPlans" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Dynamic Plans -->
            <div *ngFor="let plan of availablePlans" 
                 class="bg-white border-2 rounded-2xl p-4 transition-all hover:shadow-lg cursor-pointer flex flex-col h-full relative overflow-hidden"
                 [class.border-blue-600]="selectedPlan === plan.id"
                 [class.border-gray-200]="selectedPlan !== plan.id"
                 (click)="selectedPlan = plan.id">
              
              <div *ngIf="plan.isPopular" class="absolute top-0 right-0 bg-blue-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">POPULAR</div>
              
              <div class="flex items-center justify-between mb-3">
                <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded"
                      [ngClass]="{
                        'text-green-600 bg-green-50': plan.color === 'green',
                        'text-blue-600 bg-blue-50': plan.color === 'blue',
                        'text-purple-600 bg-purple-50': plan.color === 'purple',
                        'text-amber-600 bg-amber-50': plan.color === 'amber'
                      }">{{ plan.name }}</span>
                <span *ngIf="selectedPlan === plan.id" class="material-symbols-outlined text-blue-600 scale-75">check_circle</span>
                <span *ngIf="selectedPlan !== plan.id" class="material-symbols-outlined text-gray-300 scale-75">{{ plan.icon }}</span>
              </div>
              
              <h3 class="text-xl font-bold text-gray-900 mb-1">{{ plan.price | number:'1.0-0' }} MT</h3>
              <p class="text-[10px] text-gray-500 mb-4 font-medium italic">{{ plan.description }}</p>
              
              <ul class="space-y-2 mb-6 flex-1 text-[11px]">
                <li *ngFor="let benefit of plan.benefitSummary" class="flex items-start gap-2 text-gray-600">
                  <span class="material-symbols-outlined text-green-500 text-[14px] mt-0.5">done</span>
                  {{ benefit }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Promo Code Section -->
          <div *ngIf="selectedPlan && !paymentMethod" class="animate-slide-up max-w-2xl mx-auto bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
            <div class="flex items-center gap-3">
              <div class="flex-1 relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[20px]">sell</span>
                <input type="text" [(ngModel)]="promoInput" placeholder="Tem um código promocional?" 
                       class="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold tracking-wider">
              </div>
              <button (click)="applyPromo()" class="bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all">APLICAR</button>
            </div>
            <p *ngIf="promoError" class="text-[10px] text-red-600 mt-2 font-medium">{{ promoError }}</p>
            <div *ngIf="appliedPromo" class="mt-2 flex items-center justify-between text-[11px] text-green-700 bg-green-50 p-2 rounded-md border border-green-100">
              <span class="flex items-center gap-1 font-bold">
                <span class="material-symbols-outlined text-[14px]">check_circle</span>
                CÓDIGO APLICADO: {{ appliedPromo.code }}
              </span>
              <span class="font-bold">- {{ appliedPromo.discountPercent ? appliedPromo.discountPercent + '%' : appliedPromo.discountFixed + ' MT' }}</span>
            </div>
          </div>

          <!-- Payment Options -->
          <div *ngIf="selectedPlan" class="animate-slide-up space-y-4 max-w-2xl mx-auto">
            
            <div *ngIf="appliedPromo" class="text-center mb-2">
               <span class="text-xs text-gray-400 line-through">{{ getPlanPrice(selectedPlan) | number }} MT</span>
               <span class="text-lg font-bold text-blue-800 ml-2">{{ getFinalPrice() | number }} MT</span>
            </div>

            <h4 class="text-sm font-bold text-gray-700 uppercase tracking-wide text-center">Escolha o Método de Pagamento</h4>
            <div class="grid grid-cols-2 gap-4">
                <button (click)="paymentMethod = 'MPESA'" 
                        [class]="'p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ' + 
                           (paymentMethod === 'MPESA' ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300')">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/M-Pesa_logo.png" class="h-8 object-contain" alt="M-Pesa">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-gray-600">Carteira M-Pesa</span>
                </button>
                <button (click)="paymentMethod = 'EMOLA'" 
                        [class]="'p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ' + 
                           (paymentMethod === 'EMOLA' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300')">
                  <img src="https://yt3.googleusercontent.com/I2vW848n1XmQ8m_JOfp0FkE-7k1X_wE_w-QW-_t0X6_8E8_B7E-7k1X_wE_w-QW-_t0X6_8E8_B7E-7k1X_wE_w-QW-_t0X6_8E8_B7E-7k1X_wE_w-QW-_t0X6_8E8_B7E" class="h-8 object-contain" alt="e-Mola">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-gray-600">Carteira e-Mola</span>
                </button>
            </div>

            <!-- Mobile Payment Form (Integrated) -->
            <div *ngIf="paymentMethod" class="mt-6 animate-fade-in">
              <app-mobile-payment-form 
                [wallet]="paymentMethod" 
                [amount]="getFinalPrice()"
                [companyId]="license?.companyName || ''"
                (onPaymentSuccess)="handlePaymentDone($event)"
              >
              </app-mobile-payment-form>
            </div>
          </div>
      </div>

      <!-- ACTIVATE TAB -->
      <div *ngIf="activeTab === 'activate'" class="animate-fade-in">
          <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h2 class="text-base font-bold text-gray-800 flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-600">key</span>
                Ativar Manualmente
              </h2>
              <p class="text-xs text-gray-500 mt-1">Se já possui um token de licença, introduza-o aqui.</p>
            </div>
            
            <textarea
              [(ngModel)]="activationToken"
              rows="5"
              placeholder="Cole aqui o token de licença..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none shadow-inner bg-gray-50"
            ></textarea>

            <div *ngIf="activationError" class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <span class="material-symbols-outlined text-red-600 text-[18px]">error</span>
              <p class="text-sm text-red-700">{{ activationError }}</p>
            </div>

            <button
              (click)="activate()"
              [disabled]="!activationToken.trim() || activating"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
              <span class="material-symbols-outlined text-[20px]">verified</span>
              {{ activating ? 'VERIFICANDO...' : 'ATIVAR AGORA' }}
            </button>
          </div>
      </div>

      <!-- Info Box -->
      <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <span class="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">help</span>
        <div class="text-[10px] text-blue-700 leading-normal">
          <p class="font-bold mb-1 uppercase tracking-wider">Centro de Assistência MozPay</p>
          <p>Os pagamentos via Carteira Móvel são processados de imediato de forma segura. Após a confirmação no seu telemóvel, a licença é automaticamente atualizada no servidor.</p>
          <p class="mt-1 opacity-70">Linha de Apoio (Pós-Venda): +258 84 000 0000 | Email: suporte&#64;inverno.co.mz</p>
        </div>
      </div>

    </div>
  `
})
export class LicenseManagerComponent implements OnInit {
  license: LicenseInfo | null = null;
  activationToken = '';
  activating = false;
  refreshing = false;
  activationError = '';
  activationSuccess = '';

  // UI Tabs
  activeTab: 'status' | 'buy' | 'activate' = 'status';
  selectedPlan: string | null = null;
  paymentMethod: 'MPESA' | 'EMOLA' | null = null;
  availablePlans: LicensePlanDefinition[] = [];
  loadingPlans = false;
  renewals: LicenseRenewalInfo[] = [];
  loadingRenewals = false;

  constructor(
    public licenseService: LicenseService,
  ) { }

  ngOnInit() {
    this.licenseService.license$.subscribe(l => {
      this.license = l;
    });
    this.loadPlans();
    this.refresh();
    this.loadRenewals();
  }

  loadPlans() {
    this.loadingPlans = true;
    this.licenseService.getAvailablePlans().subscribe({
      next: (plans) => {
        this.availablePlans = plans;
        this.loadingPlans = false;
      },
      error: () => {
        this.loadingPlans = false;
        // Fallback or error handling
      }
    });
  }

  get statusLabel(): string {
    switch (this.license?.status) {
      case 'ACTIVE': return 'Ativa';
      case 'GRACE': return 'Período de Graça';
      case 'EXPIRED': return 'Expirada';
      case 'REVOKED': return 'Revogada';
      default: return 'Inválida';
    }
  }

  refresh() {
    this.refreshing = true;
    this.licenseService.refreshFromServer();
    setTimeout(() => this.refreshing = false, 1500);
  }

  get nextExpiration(): Date | null {
    if (this.renewals.length) {
      return new Date(this.renewals[0].newExpiresAt);
    }
    return this.license?.expiresAt ? new Date(this.license.expiresAt) : null;
  }

  loadRenewals() {
    const companyId = this.getCompanyId();
    if (!companyId || companyId === 'undefined' || companyId === 'null') {
      console.warn('LicenseManager: No valid companyId found for renewals history.');
      this.loadingRenewals = false;
      this.renewals = [];
      return;
    }

    this.loadingRenewals = true;
    this.licenseService.getRenewalsByCompany(companyId).pipe(
      finalize(() => this.loadingRenewals = false)
    ).subscribe({
      next: (renewals) => {
        this.renewals = Array.isArray(renewals) ? renewals : [];
      },
      error: (err) => {
        console.error('LicenseManager: Error loading renewals history', err);
        this.renewals = [];
        // The interceptor will show the toast, we just reset the UI state here
      }
    });
  }

  private getCompanyId(): string | null {
    try {
      const info = localStorage.getItem('erp_company_info');
      if (!info) return null;
      return JSON.parse(info).id || null;
    } catch {
      return null;
    }
  }

  getPlanPrice(planId: string): number {
    const plan = this.availablePlans.find(p => p.id === planId);
    return plan ? plan.price : 0;
  }

  // Promo Code Support
  promoInput = '';
  promoError = '';
  appliedPromo: any = null;

  applyPromo() {
    if (!this.promoInput.trim()) return;
    this.promoError = '';

    this.licenseService.validatePromoCode(this.promoInput.trim()).subscribe({
      next: (res) => {
        if (res.valid) {
          this.appliedPromo = res.promo;
          this.promoInput = '';
        } else {
          this.promoError = res.message;
          this.appliedPromo = null;
        }
      },
      error: () => {
        this.promoError = 'Servidor de promoções indisponível.';
      }
    });
  }

  getFinalPrice(): number {
    const basePrice = this.getPlanPrice(this.selectedPlan || '');
    if (!basePrice) return 0;
    if (!this.appliedPromo) return basePrice;

    if (this.appliedPromo.discountPercent) {
      return basePrice * (1 - this.appliedPromo.discountPercent / 100);
    }
    if (this.appliedPromo.discountFixed) {
      return Math.max(0, basePrice - this.appliedPromo.discountFixed);
    }
    return basePrice;
  }

  activate() {
    if (!this.activationToken.trim()) return;
    this.activating = true;
    this.activationError = '';
    this.activationSuccess = '';

    this.licenseService.activateLicense(this.activationToken.trim()).subscribe({
      next: (result) => {
        this.activating = false;
        this.activationSuccess = `Licença ativada com sucesso! Plano: ${result.plan}.`;
        this.activationToken = '';
        this.activeTab = 'status';
      },
      error: (err) => {
        this.activating = false;
        this.activationError = err?.error?.message || 'Erro ao ativar licença.';
      }
    });
  }

  handlePaymentDone(status: PaymentStatus) {
    // Aqui simularíamos que o backend gera um token novo após o pagamento
    // Por agora, vamos apenas mostrar sucesso e refrescar
    console.log('Pagamento recebido:', status);
    this.activationSuccess = 'Pagamento confirmado! A sua licença foi renovada.';
    this.activeTab = 'status';
    this.refresh();
  }
}