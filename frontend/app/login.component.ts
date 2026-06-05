import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { DataService } from './services/data.service';
import { ToasterService } from './services/toaster.service';
import { LicenseService } from './services/license.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="min-h-screen flex bg-white">

      <!-- LEFT PANEL — Branding -->
      <div class="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
           style="background: linear-gradient(135deg, #0042a8 0%, #0078D7 45%, #00aaee 100%);">
        <div class="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 bg-white"></div>
        <div class="absolute top-1/3 -right-20 w-64 h-64 rounded-full opacity-10 bg-white"></div>
        <div class="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full opacity-10 bg-white"></div>

        <!-- Logo + Brand -->
        <div class="relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="30" height="30" rx="7" fill="#0078D7"/>
                <rect x="11" y="6" width="4" height="18" rx="2" fill="white"/>
                <rect x="7" y="6" width="16" height="4" rx="2" fill="white"/>
                <rect x="7" y="20" width="16" height="4" rx="2" fill="white"/>
              </svg>
            </div>
            <div>
              <h1 class="text-white text-2xl font-black tracking-tight leading-none">Inverno ERP</h1>
              <p class="text-blue-200 text-[10px] font-bold tracking-widest uppercase mt-0.5">Sistema de Gestão Empresarial</p>
            </div>
          </div>
        </div>

        <!-- Center Content -->
        <div class="relative z-10 flex-1 flex flex-col justify-center py-10">
          <h2 class="text-white text-4xl font-bold leading-tight mb-5">
            Toda a gestão da<br>sua empresa,<br>
            <span class="text-blue-200">num único sistema.</span>
          </h2>
          <p class="text-blue-100 text-base mb-10 max-w-sm leading-relaxed">
            Vendas, Compras, Inventário, Contabilidade, Tesouraria e Recursos Humanos — integrados, rápidos e prontos a usar.
          </p>

          <div class="space-y-3.5">
            <div *ngFor="let feature of features" class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-white text-[18px]">{{ feature.icon }}</span>
              </div>
              <span class="text-white text-sm font-medium">{{ feature.label }}</span>
            </div>
          </div>
        </div>

        <!-- Bottom -->
        <div class="relative z-10 text-blue-200 text-xs">
          &copy; {{ currentYear }} Inverno ERP &mdash; Todos os direitos reservados.
        </div>
      </div>

      <!-- RIGHT PANEL — Form -->
      <div class="flex-1 flex flex-col justify-center items-center p-8 lg:p-14 bg-gray-50 relative">

        <!-- Mobile Logo -->
        <div class="flex items-center gap-2 mb-8 lg:hidden">
          <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow">
            <svg width="22" height="22" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="11" y="2" width="4" height="26" rx="2" fill="white"/>
              <rect x="5" y="2" width="20" height="5" rx="2" fill="white"/>
              <rect x="5" y="23" width="20" height="5" rx="2" fill="white"/>
            </svg>
          </div>
          <span class="font-black text-xl text-gray-800 tracking-tight">Inverno ERP</span>
        </div>

        <!-- Management shortcut -->
        <div class="absolute top-5 right-5">
          <button (click)="step = 'ACCESS_GATE'"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all">
            <span class="material-symbols-outlined text-[14px]">settings</span>
            Administração
          </button>
        </div>

        <div class="w-full max-w-sm animate-fade-in">

          <!-- CONNECTION BADGE -->
          <div class="flex items-center gap-1.5 mb-7 text-[11px] font-medium px-3 py-1.5 rounded-full border w-fit"
               [ngClass]="{
                 'bg-green-50 text-green-700 border-green-200': systemConfig.deploymentMode === 'LOCAL',
                 'bg-blue-50 text-blue-700 border-blue-200': systemConfig.deploymentMode === 'WEB'
               }">
            <span class="w-1.5 h-1.5 rounded-full animate-pulse"
                  [ngClass]="systemConfig.deploymentMode === 'LOCAL' ? 'bg-green-500' : 'bg-blue-500'"></span>
            <span>{{ getConnectionLabel() }}</span>
            <span class="opacity-50 font-mono text-[10px]">&mdash; {{ getConnectionDetails() }}</span>
          </div>

          <!-- ===== STEP: LOGIN ===== -->
          <div *ngIf="step === 'LOGIN'">
            <h2 class="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h2>
            <p class="text-gray-500 text-sm mb-7">Entre com as suas credenciais para continuar.</p>

            <form (ngSubmit)="onCredentialsSubmit()" class="space-y-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">Utilizador</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">person</span>
                  <input
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-300"
                    type="text" placeholder="Nome de utilizador"
                    [(ngModel)]="username" name="username" autofocus>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">Palavra-passe</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">lock</span>
                  <input
                    class="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-300"
                    [type]="showPassword ? 'text' : 'password'"
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    [(ngModel)]="password" name="password">
                  <button type="button" (click)="showPassword = !showPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <span class="material-symbols-outlined text-[18px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>
              <button type="submit"
                      class="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm mt-2 flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-[18px]">login</span>
                Entrar no Sistema
              </button>
            </form>
          </div>

          <!-- ===== STEP: ACCESS GATE ===== -->
          <div *ngIf="step === 'ACCESS_GATE'" class="animate-slide-in">
            <h2 class="text-2xl font-bold text-gray-900 mb-1">Acesso Administrativo</h2>
            <p class="text-gray-500 text-sm mb-6">
              Bem-vindo, <strong class="text-gray-700">{{ currentUser?.name || currentUser?.username || 'Utilizador' }}</strong>.
              Introduza o código de administração.
            </p>

            <div class="mb-5">
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Código de Administração</label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-[20px] pointer-events-none">admin_panel_settings</span>
                <input type="password"
                       [(ngModel)]="adminAccessCode"
                       (keyup.enter)="onAdminCodeSubmit()"
                       class="w-full pl-10 pr-4 py-2.5 border border-amber-300 rounded-lg text-sm bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                       placeholder="Código de administração">
              </div>
            </div>

            <div class="space-y-2" *ngIf="adminAccessCode === defaultAdminAccessCode">
              <ng-container *ngIf="!licenseService.current?.valid">
                <button (click)="enterViaAdministration('buy')"
                        class="w-full text-left p-3.5 border border-blue-200 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-3 group">
                  <span class="material-symbols-outlined text-blue-600 text-[22px]">credit_card</span>
                  <div>
                    <p class="text-sm font-bold text-blue-700">Pagar Licença</p>
                    <p class="text-xs text-blue-500">Renovar ou adquirir uma nova licença</p>
                  </div>
                  <span class="material-symbols-outlined text-blue-200 group-hover:text-blue-400 ml-auto text-[18px]">chevron_right</span>
                </button>
                <button (click)="enterViaAdministration('key')"
                        class="w-full text-left p-3.5 border border-indigo-200 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-3 group">
                  <span class="material-symbols-outlined text-indigo-600 text-[22px]">key</span>
                  <div>
                    <p class="text-sm font-bold text-indigo-700">Inserir Chave de Licença</p>
                    <p class="text-xs text-indigo-500">Ativar com uma chave existente</p>
                  </div>
                  <span class="material-symbols-outlined text-indigo-200 group-hover:text-indigo-400 ml-auto text-[18px]">chevron_right</span>
                </button>
                <button (click)="enterViaAdministration('demo')"
                        class="w-full text-left p-3.5 border border-green-200 rounded-xl bg-green-50 hover:bg-green-100 transition-colors flex items-center gap-3 group">
                  <span class="material-symbols-outlined text-green-600 text-[22px]">play_circle</span>
                  <div>
                    <p class="text-sm font-bold text-green-700">Modo Demonstração</p>
                    <p class="text-xs text-green-500">Explorar o sistema sem licença activa</p>
                  </div>
                  <span class="material-symbols-outlined text-green-200 group-hover:text-green-400 ml-auto text-[18px]">chevron_right</span>
                </button>
              </ng-container>
              <button *ngIf="licenseService.current?.valid"
                      (click)="enterViaAdministration('demo')"
                      class="w-full text-left p-3.5 border border-indigo-200 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-3 group">
                <span class="material-symbols-outlined text-indigo-600 text-[22px]">manage_accounts</span>
                <div>
                  <p class="text-sm font-bold text-indigo-700">Painel de Administração</p>
                  <p class="text-xs text-indigo-500">Gerir utilizadores, empresas e configurações</p>
                </div>
                <span class="material-symbols-outlined text-indigo-200 group-hover:text-indigo-400 ml-auto text-[18px]">chevron_right</span>
              </button>
              <button (click)="enterViaAdministration('erp')"
                      class="w-full text-left p-3.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors flex items-center gap-3 group">
                <span class="material-symbols-outlined text-gray-500 text-[22px]">storefront</span>
                <div>
                  <p class="text-sm font-bold text-gray-700">Ir Directo para o ERP</p>
                  <p class="text-xs text-gray-400">Modo operacional — Vendas, Stock e mais</p>
                </div>
                <span class="material-symbols-outlined text-gray-200 group-hover:text-gray-400 ml-auto text-[18px]">chevron_right</span>
              </button>
            </div>

            <button (click)="step = 'LOGIN'; password = ''; adminAccessCode = ''"
                    class="w-full mt-5 text-sm text-gray-400 hover:text-gray-700 py-2 flex items-center justify-center gap-1 transition-colors">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              Voltar ao Login
            </button>
          </div>

          <!-- ===== STEP: COMPANY SELECT ===== -->
          <div *ngIf="step === 'COMPANY_SELECT'" class="animate-slide-in">
            <h2 class="text-2xl font-bold text-gray-900 mb-1">Selecionar Empresa</h2>
            <p class="text-gray-500 text-sm mb-5">
              Bem-vindo, <strong class="text-gray-700">{{ currentUser?.name || currentUser?.username }}</strong>.
              Escolha a empresa para entrar.
            </p>

            <div class="space-y-2 mb-4 max-h-72 overflow-y-auto pr-0.5">
              <button *ngFor="let company of availableCompanies; let i = index"
                      (click)="selectCompany(company)"
                      class="w-full text-left p-3.5 rounded-xl bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 text-white shadow-sm"
                     [style.background]="getCompanyColor(i)">
                  {{ company.name.substring(0, 2).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-gray-800 truncate group-hover:text-blue-700 text-sm">{{ company.name }}</div>
                  <div class="text-xs text-gray-400">{{ company.location || 'Sede Principal' }}</div>
                </div>
                <span class="material-symbols-outlined text-gray-300 group-hover:text-blue-500 text-[20px]">chevron_right</span>
              </button>

              <div *ngIf="availableCompanies.length === 0" class="text-center py-8 text-gray-500">
                <span class="material-symbols-outlined text-5xl text-gray-300 mb-2 block">business_center</span>
                <p class="text-sm mb-4">Não tem acesso a nenhuma empresa.</p>
                <button *ngIf="currentUser?.role === 'ADMIN'"
                        (click)="selectedMode = 'ADMIN'; finishLogin('admin-page')"
                        class="bg-blue-600 text-white text-xs font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition-colors">
                  Ir para Administração
                </button>
              </div>
            </div>

            <button (click)="step = 'LOGIN'; password = ''"
                    class="w-full text-sm text-gray-400 hover:text-gray-700 py-2 flex items-center justify-center gap-1 transition-colors">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              Voltar ao Login
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(14px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in { animation: slideIn 0.25s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fadeIn 0.35s ease-out forwards; }
    .material-symbols-outlined.filled {
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    input::placeholder { color: #cbd5e1; }
  `]
})
export class LoginComponent implements OnInit {
  @Output() onLogin = new EventEmitter<{ mode: string; initialView?: string }>();

  step: 'LOGIN' | 'ACCESS_GATE' | 'COMPANY_SELECT' = 'LOGIN';
  username = '';
  password = '';
  showPassword = false;
  selectedMode = 'ERP';
  adminAccessCode = '';
  readonly defaultAdminAccessCode = 'admin';
  readonly currentYear = new Date().getFullYear();

  currentUser: any = null;
  availableCompanies: any[] = [];

  features = [
    { icon: 'point_of_sale', label: 'Vendas e Faturação Electrónica' },
    { icon: 'inventory_2', label: 'Inventário e Controlo de Stock' },
    { icon: 'account_balance', label: 'Contabilidade e Relatórios Fiscais' },
    { icon: 'account_balance_wallet', label: 'Tesouraria e Bancos' },
    { icon: 'people', label: 'Recursos Humanos e Folha de Pagamento' },
  ];

  systemConfig: any = {
    deploymentMode: 'LOCAL',
    localStorageType: 'BROWSER',
    postgresConfig: { host: 'localhost', port: 5432, database: 'inverno_erp' },
    apiUrl: ''
  };

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private toasterService: ToasterService,
    public licenseService: LicenseService
  ) { }

  selectCompany(company: any) {
    this.dataService.setActiveCompany(company);
    this.finishLogin();
  }

  ngOnInit() {
    const storedConfig = localStorage.getItem('erp_system_config');
    if (storedConfig) {
      this.systemConfig = { ...this.systemConfig, ...JSON.parse(storedConfig) };
    }

    const currentUser = localStorage.getItem('erp_current_user');
    if (currentUser) {
      this.currentUser = JSON.parse(currentUser);
      this.loadAvailableCompanies();
    }
  }

  getCompanyColor(index: number): string {
    const colors = ['#0078D7', '#107C10', '#C50F1F', '#7719AA', '#CA5010', '#038387'];
    return colors[index % colors.length];
  }

  getConnectionLabel(): string {
    if (this.systemConfig.deploymentMode === 'WEB') return 'Cloud / Web';
    return this.systemConfig.localStorageType === 'POSTGRES' ? 'Local (PostgreSQL)' : 'Local (Browser)';
  }

  getConnectionDetails(): string {
    if (this.systemConfig.deploymentMode === 'WEB') {
      return this.systemConfig.apiUrl || 'api.inverno-erp.com';
    }
    if (this.systemConfig.localStorageType === 'POSTGRES') {
      const { host, port, database } = this.systemConfig.postgresConfig;
      return `${host}:${port}/${database}`;
    }
    return 'Armazenamento Local';
  }

  onAdminCodeSubmit() {
    if (this.adminAccessCode === this.defaultAdminAccessCode) {
      const license = this.licenseService.current;
      if (license?.valid) {
        this.enterViaAdministration('demo');
      } else {
        this.enterViaAdministration('buy');
      }
    } else {
      this.toasterService.showError('Código inválido', 'Código especial do administrador incorrecto.');
    }
  }

  enterViaAdministration(option: 'buy' | 'key' | 'demo' | 'erp') {
    if (option !== 'erp' && this.adminAccessCode !== this.defaultAdminAccessCode) {
      this.toasterService.showError('Código inválido', 'Código especial do administrador incorrecto.');
      return;
    }
    if (option === 'erp') {
      this.selectedMode = 'ERP';
      this.loadAvailableCompanies();
      return;
    }
    localStorage.setItem('erp_license_entry_mode', option === 'buy' ? 'BUY' : option === 'key' ? 'KEY' : 'DEMO');
    this.selectedMode = 'ADMIN';
    this.finishLogin('admin-page');
  }

  finishLogin(initialView?: string) {
    this.onLogin.emit({ mode: this.selectedMode, initialView });
  }

  onCredentialsSubmit() {
    this.authService.login({ username: this.username, password: this.password })
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          const license = this.licenseService.current;
          const isLicenseValid = license && license.valid;

          if (!user.isAdmin && !user.isSuperAdmin) {
            if (!isLicenseValid) {
              this.toasterService.showError('Acesso Negado', 'O sistema encontra-se sem licença activa. Por favor, contacte o administrador.');
              return;
            }
            this.selectedMode = 'ERP';
            this.loadAvailableCompanies();
            return;
          }

          if (isLicenseValid) {
            this.selectedMode = 'ERP';
            this.loadAvailableCompanies();
          } else {
            this.step = 'ACCESS_GATE';
          }
        },
        error: (err) => {
          console.error('Login failed', err);
          const errorMsg = err.error?.message || 'Utilizador ou palavra-passe incorrectos.';
          this.toasterService.showError('Falha no Login', errorMsg);
        }
      });
  }

  loadAvailableCompanies() {
    this.dataService.getCompanies().subscribe(companies => {
      this.availableCompanies = companies;
      if (this.availableCompanies.length === 1) {
        this.selectCompany(this.availableCompanies[0]);
      } else {
        this.step = 'COMPANY_SELECT';
      }
    });
  }
}
