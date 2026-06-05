import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ToasterService } from '../../services/toaster.service';
import { environment } from '../../shared/config';

interface GatewayConfig {
  id?: string;
  companyId?: string;
  provider: string;
  displayName: string;
  agentCode: string;
  apiKey: string;
  apiSecret: string;
  serviceProviderCode: string;
  baseUrl: string;
  sandboxMode: boolean;
  timeoutSeconds: number;
  isActive: boolean;
  // UI state
  _showSecret?: boolean;
  _showApiKey?: boolean;
  _dirty?: boolean;
  _saving?: boolean;
  _testing?: boolean;
  _testResult?: 'ok' | 'fail' | null;
}

const PROVIDERS: GatewayConfig[] = [
  {
    provider: 'EMOLA',
    displayName: 'e-Mola',
    agentCode: '', apiKey: '', apiSecret: '', serviceProviderCode: '',
    baseUrl: 'https://api.emola.mz/v1',
    sandboxMode: true, timeoutSeconds: 60, isActive: false,
  },
  {
    provider: 'MPESA',
    displayName: 'M-Pesa',
    agentCode: '', apiKey: '', apiSecret: '', serviceProviderCode: '',
    baseUrl: 'https://api.sandbox.vm.co.mz/ipg/v1x/',
    sandboxMode: true, timeoutSeconds: 60, isActive: false,
  },
  {
    provider: 'MKESH',
    displayName: 'mKesh',
    agentCode: '', apiKey: '', apiSecret: '', serviceProviderCode: '',
    baseUrl: 'https://api.mkesh.mz/v1',
    sandboxMode: true, timeoutSeconds: 60, isActive: false,
  },
];

@Component({
  selector: 'app-payment-gateway-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="h-full overflow-y-auto bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto space-y-6">

        <!-- Header -->
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-xl font-bold text-gray-900">Configuração de Pagamentos</h1>
            <p class="text-sm text-gray-500 mt-0.5">Configure os gateways de pagamento móvel (e-Mola, M-Pesa, mKesh)</p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {{ getActiveCount() }} activo(s)
          </span>
        </div>

        <!-- Info Banner -->
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <span class="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">info</span>
          <div class="text-sm text-amber-800">
            <p class="font-semibold mb-1">Segurança das Credenciais</p>
            <p class="text-xs text-amber-700">As chaves API e códigos de agente são guardados de forma segura na base de dados. Nunca os partilhe. Após guardar, a chave API é mascarada e não pode ser recuperada — guarde-a num local seguro antes de submeter.</p>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="flex items-center justify-center py-12">
          <div class="flex flex-col items-center gap-3 text-gray-400">
            <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-sm">A carregar configurações...</span>
          </div>
        </div>

        <!-- Gateway Cards -->
        <div *ngIf="!loading" class="space-y-4">
          <div *ngFor="let gw of gateways" class="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all"
               [ngClass]="gw.isActive ? 'border-blue-200 shadow-blue-50' : 'border-gray-200'">

            <!-- Card Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b"
                 [ngClass]="gw.isActive ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50'">
              <div class="flex items-center gap-3">
                <!-- Provider Icon -->
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                     [ngClass]="{
                       'bg-orange-500': gw.provider === 'EMOLA',
                       'bg-red-600': gw.provider === 'MPESA',
                       'bg-blue-700': gw.provider === 'MKESH'
                     }">
                  {{ gw.provider === 'EMOLA' ? 'eM' : gw.provider === 'MPESA' ? 'MP' : 'mK' }}
                </div>
                <div>
                  <h3 class="font-bold text-gray-900 text-sm">{{ gw.displayName }}</h3>
                  <p class="text-[11px]" [ngClass]="gw.isActive ? 'text-blue-600 font-semibold' : 'text-gray-400'">
                    {{ gw.isActive ? (gw.sandboxMode ? 'Activo — Modo Teste (Sandbox)' : 'Activo — Modo Produção') : 'Inactivo' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <!-- Test Result -->
                <span *ngIf="gw._testResult === 'ok'" class="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span> Ligação OK
                </span>
                <span *ngIf="gw._testResult === 'fail'" class="flex items-center gap-1 text-xs text-red-500 font-medium">
                  <span class="material-symbols-outlined text-[16px]">error</span> Falhou
                </span>
                <!-- Active Toggle -->
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" [(ngModel)]="gw.isActive" (change)="gw._dirty = true" class="sr-only peer">
                  <div class="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                </label>
              </div>
            </div>

            <!-- Card Body -->
            <div class="px-5 py-4 space-y-4">

              <!-- Row 1: Agent Code + Service Provider Code -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                    Código de Agente
                    <span class="ml-1 text-red-500">*</span>
                  </label>
                  <input type="text"
                         [(ngModel)]="gw.agentCode"
                         (ngModelChange)="gw._dirty = true"
                         [placeholder]="'Ex: ' + (gw.provider === 'EMOLA' ? 'AG123456' : gw.provider === 'MPESA' ? 'SP12345' : 'MK123456')"
                         class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono">
                  <p class="text-[10px] text-gray-400 mt-1">
                    {{ gw.provider === 'EMOLA' ? 'Código fornecido pela Emtel/e-Mola' : gw.provider === 'MPESA' ? 'Service Provider Code da Vodacom' : 'Código do agente mKesh' }}
                  </p>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">Código do Serviço / Merchant</label>
                  <input type="text"
                         [(ngModel)]="gw.serviceProviderCode"
                         (ngModelChange)="gw._dirty = true"
                         placeholder="Ex: 12345"
                         class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono">
                </div>
              </div>

              <!-- Row 2: API Key + API Secret -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                    API Key
                    <span *ngIf="gw.apiKey?.startsWith('••••')" class="ml-1 text-amber-600 text-[10px] font-normal">(mascarada — introduza nova para alterar)</span>
                  </label>
                  <div class="relative">
                    <input [type]="gw._showApiKey ? 'text' : 'password'"
                           [(ngModel)]="gw.apiKey"
                           (ngModelChange)="gw._dirty = true"
                           placeholder="Chave API do gateway"
                           class="w-full h-9 pl-3 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono">
                    <button type="button" (click)="gw._showApiKey = !gw._showApiKey"
                            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <span class="material-symbols-outlined text-[18px]">{{ gw._showApiKey ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                    API Secret / PIN
                    <span *ngIf="gw.apiSecret === '••••••••'" class="ml-1 text-amber-600 text-[10px] font-normal">(guardado — introduza novo para alterar)</span>
                  </label>
                  <div class="relative">
                    <input [type]="gw._showSecret ? 'text' : 'password'"
                           [(ngModel)]="gw.apiSecret"
                           (ngModelChange)="gw._dirty = true"
                           placeholder="Secret / PIN do gateway"
                           class="w-full h-9 pl-3 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono">
                    <button type="button" (click)="gw._showSecret = !gw._showSecret"
                            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <span class="material-symbols-outlined text-[18px]">{{ gw._showSecret ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Row 3: Base URL + Timeout -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">URL Base da API</label>
                  <input type="url"
                         [(ngModel)]="gw.baseUrl"
                         (ngModelChange)="gw._dirty = true"
                         class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-xs">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">Timeout (segundos)</label>
                  <input type="number"
                         [(ngModel)]="gw.timeoutSeconds"
                         (ngModelChange)="gw._dirty = true"
                         min="10" max="300"
                         class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center">
                </div>
              </div>

              <!-- Sandbox Toggle -->
              <div class="flex items-center justify-between p-3 rounded-xl border"
                   [ngClass]="gw.sandboxMode ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-[18px]" [ngClass]="gw.sandboxMode ? 'text-amber-600' : 'text-green-600'">
                    {{ gw.sandboxMode ? 'science' : 'rocket_launch' }}
                  </span>
                  <div>
                    <p class="text-xs font-bold" [ngClass]="gw.sandboxMode ? 'text-amber-800' : 'text-green-800'">
                      {{ gw.sandboxMode ? 'Modo Sandbox (Testes)' : 'Modo Produção (Real)' }}
                    </p>
                    <p class="text-[10px]" [ngClass]="gw.sandboxMode ? 'text-amber-600' : 'text-green-600'">
                      {{ gw.sandboxMode ? 'Transacções não são cobradas. Use para testar a integração.' : 'ATENÇÃO: Transacções reais serão cobradas aos clientes.' }}
                    </p>
                  </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" [(ngModel)]="gw.sandboxMode" (change)="gw._dirty = true" class="sr-only peer">
                  <div class="w-10 h-5 rounded-full peer transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"
                       [ngClass]="gw.sandboxMode ? 'bg-amber-400 peer-checked:bg-amber-400' : 'bg-green-500'"></div>
                </label>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between pt-2 border-t border-gray-100">
                <button *ngIf="gw.agentCode"
                        (click)="testConnection(gw)"
                        [disabled]="gw._testing"
                        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200">
                  <span class="material-symbols-outlined text-[16px]" [class.animate-spin]="gw._testing">
                    {{ gw._testing ? 'refresh' : 'wifi_tethering' }}
                  </span>
                  {{ gw._testing ? 'A testar...' : 'Testar Ligação' }}
                </button>
                <div *ngIf="!gw.agentCode" class="text-xs text-gray-400 italic">Configure o Código de Agente para testar</div>

                <button (click)="save(gw)"
                        [disabled]="!gw._dirty || gw._saving"
                        class="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-all"
                        [ngClass]="gw._dirty ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'">
                  <span class="material-symbols-outlined text-[16px]" [class.animate-spin]="gw._saving">
                    {{ gw._saving ? 'refresh' : 'save' }}
                  </span>
                  {{ gw._saving ? 'A guardar...' : (gw._dirty ? 'Guardar Alterações' : 'Guardado') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Help Section -->
        <div class="bg-white rounded-2xl border border-gray-200 p-5">
          <div class="flex items-center gap-2 mb-4">
            <span class="material-symbols-outlined text-blue-600 text-[20px]">help_outline</span>
            <h3 class="font-bold text-gray-800 text-sm">Como obter as credenciais?</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
            <div class="p-3 bg-orange-50 rounded-xl border border-orange-100">
              <p class="font-bold text-orange-700 mb-1 flex items-center gap-1">
                <span class="w-5 h-5 bg-orange-500 text-white rounded text-[10px] font-black flex items-center justify-center">eM</span>
                e-Mola (Emtel)
              </p>
              <p>Contacte a <strong>Emtel</strong> ou aceda ao portal de merchants em <strong>emola.mz</strong>. O Código de Agente é fornecido após registo como merchant.</p>
            </div>
            <div class="p-3 bg-red-50 rounded-xl border border-red-100">
              <p class="font-bold text-red-700 mb-1 flex items-center gap-1">
                <span class="w-5 h-5 bg-red-600 text-white rounded text-[10px] font-black flex items-center justify-center">MP</span>
                M-Pesa (Vodacom)
              </p>
              <p>Registe-se no portal <strong>developer.vm.co.mz</strong>. O Service Provider Code é obtido após aprovação da conta business.</p>
            </div>
            <div class="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p class="font-bold text-blue-700 mb-1 flex items-center gap-1">
                <span class="w-5 h-5 bg-blue-700 text-white rounded text-[10px] font-black flex items-center justify-center">mK</span>
                mKesh (mCel)
              </p>
              <p>Contacte a <strong>mCel</strong> para integração empresarial. As credenciais são fornecidas após assinatura do contrato de merchant.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class PaymentGatewaySettingsComponent implements OnInit {
  gateways: GatewayConfig[] = JSON.parse(JSON.stringify(PROVIDERS));
  loading = false;
  companyId: string = '';

  private readonly apiBase = `${environment.apiUrl}/payment-gateways`;

  constructor(
    private http: HttpClient,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('erp_company_info');
    if (stored) {
      try {
        const company = JSON.parse(stored);
        this.companyId = company.id || '';
      } catch { }
    }
    this.loadFromLocalStorage();
    this.load();
  }

  /** Load saved configs from localStorage for immediate display */
  loadFromLocalStorage() {
    this.gateways = this.gateways.map(gw => {
      const key = `erp_payment_gateway_${gw.provider.toLowerCase()}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          return { ...gw, ...JSON.parse(saved), _dirty: false };
        } catch { }
      }
      return { ...gw, _dirty: false };
    });
  }

  load() {
    this.loading = true;
    const url = this.companyId
      ? `${this.apiBase}?companyId=${this.companyId}`
      : this.apiBase;

    this.http.get<any[]>(url).subscribe({
      next: (configs) => {
        this.loading = false;
        if (configs && configs.length) {
          this.gateways = this.gateways.map(gw => {
            const serverConfig = configs.find(c => c.provider === gw.provider);
            return serverConfig
              ? { ...gw, ...serverConfig, _dirty: false }
              : { ...gw, _dirty: false };
          });
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  save(gw: GatewayConfig) {
    if (!gw.agentCode && gw.isActive) {
      this.toaster.showWarning('Campo Obrigatório', 'O Código de Agente é obrigatório para activar o gateway.');
      return;
    }

    gw._saving = true;
    const payload = {
      companyId: this.companyId,
      provider: gw.provider,
      displayName: gw.displayName,
      agentCode: gw.agentCode,
      apiKey: gw.apiKey?.startsWith('••••') ? undefined : gw.apiKey,
      apiSecret: gw.apiSecret === '••••••••' ? undefined : gw.apiSecret,
      serviceProviderCode: gw.serviceProviderCode,
      baseUrl: gw.baseUrl,
      sandboxMode: gw.sandboxMode,
      timeoutSeconds: gw.timeoutSeconds,
      isActive: gw.isActive,
    };

    // Remove undefined fields
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    this.http.post(this.apiBase, payload).subscribe({
      next: (saved: any) => {
        gw._saving = false;
        gw._dirty = false;
        if (saved?.id) gw.id = saved.id;
        if (saved?.apiKey) gw.apiKey = saved.apiKey;
        if (saved?.apiSecret) gw.apiSecret = '••••••••';
        this.toaster.showSuccess(
          `${gw.displayName} Guardado`,
          gw.isActive ? `Gateway activo em modo ${gw.sandboxMode ? 'sandbox' : 'produção'}.` : 'Configuração guardada (inactivo).'
        );
        this.cdr.markForCheck();
      },
      error: () => {
        gw._saving = false;
        this.saveLocal(gw);
        this.toaster.showWarning('Guardado Localmente', 'Backend indisponível. Configuração guardada localmente.');
        this.cdr.markForCheck();
      }
    });
  }

  testConnection(gw: GatewayConfig) {
    gw._testing = true;
    gw._testResult = null;

    // Test via backend ping endpoint
    this.http.get(`${this.apiBase}/${gw.provider}/config?companyId=${this.companyId}`)
      .subscribe({
        next: (config: any) => {
          gw._testing = false;
          gw._testResult = config?.agentCode ? 'ok' : 'fail';
          if (gw._testResult === 'ok') {
            this.toaster.showSuccess('Ligação OK', `${gw.displayName}: configuração encontrada no servidor.`);
          } else {
            this.toaster.showWarning('Sem Configuração', `${gw.displayName}: sem configuração activa no servidor.`);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          gw._testing = false;
          gw._testResult = 'fail';
          this.toaster.showError('Falha na Ligação', `Não foi possível verificar a configuração do ${gw.displayName}.`);
          this.cdr.markForCheck();
        }
      });
  }

  getActiveCount(): number {
    return this.gateways.filter(g => g.isActive).length;
  }

  private saveLocal(gw: GatewayConfig) {
    const key = `erp_payment_gateway_${gw.provider.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify({
      provider: gw.provider,
      agentCode: gw.agentCode,
      serviceProviderCode: gw.serviceProviderCode,
      baseUrl: gw.baseUrl,
      sandboxMode: gw.sandboxMode,
      timeoutSeconds: gw.timeoutSeconds,
      isActive: gw.isActive,
    }));
  }
}
