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
    <div class="min-h-screen flex items-center justify-center bg-gray-100 relative">
      <!-- Top Right Management Shortcut -->
      <div class="absolute top-6 right-6">
        <button (click)="step = 'ACCESS_GATE'" 
                class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all group">
          <span class="material-symbols-outlined text-[16px] group-hover:rotate-90 transition-transform">settings_suggest</span>
          Gestão do Sistema
        </button>
      </div>

      <div class="bg-white p-8 rounded-lg shadow-md w-96 animate-fade-in relative overflow-hidden">
        <!-- Connection Status Badge -->
        <div class="absolute top-0 right-0 p-2">
           <div class="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border"
                [ngClass]="{
                  'bg-green-50 text-green-700 border-green-200': systemConfig.deploymentMode === 'LOCAL',
                  'bg-blue-50 text-blue-700 border-blue-200': systemConfig.deploymentMode === 'WEB'
                }">
             <span class="material-symbols-outlined text-[12px] filled">
               {{ systemConfig.deploymentMode === 'LOCAL' ? 'dns' : 'cloud' }}
             </span>
             <span>{{ getConnectionLabel() }}</span>
           </div>
        </div>

        <div class="flex justify-center mb-6 mt-2">
          <div
            class="bg-center bg-no-repeat bg-cover size-16 rounded-md border border-gray-200"
            style='background-image: url("https://picsum.photos/128/128")'
          ></div>
        </div>
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Inverno ERP</h2>

        <!-- Step 1: Credentials -->
        <form *ngIf="step === 'LOGIN'" (ngSubmit)="onCredentialsSubmit()">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="username">
              Utilizador
            </label>
            <input
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              id="username"
              type="text"
              placeholder="Utilizador"
              [(ngModel)]="username"
              name="username"
              autofocus
            >
          </div>
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="password">
              Palavra-passe
            </label>
            <input
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              id="password"
              type="password"
              placeholder="******************"
              [(ngModel)]="password"
              name="password"
            >
          </div>

          <div class="flex items-center justify-between">
            <button
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors"
              type="submit"
            >
              Entrar
            </button>
          </div>
        </form>

        <!-- Step 2: Access Gate -->
        <div *ngIf="step === 'ACCESS_GATE'" class="animate-slide-in space-y-4">
          <div class="text-center">
            <p class="text-gray-700 text-sm font-semibold">Bem-vindo, {{ currentUser?.name || currentUser?.username || 'Administrador' }}</p>
            <p class="text-gray-500 text-xs mt-1">Antes de usar o ERP, escolha como entrar na Administração</p>
          </div>

          <div class="p-3 border border-amber-200 bg-amber-50 rounded-lg">
            <label class="block text-xs font-bold text-amber-800 mb-1">Código especial do Administrador</label>
            <input
              type="password"
              [(ngModel)]="adminAccessCode"
              (keyup.enter)="onAdminCodeSubmit()"
              class="w-full border border-amber-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              placeholder="Por agora use: admin"
            >
            <p class="text-[10px] text-amber-700 mt-1">Este código poderá ser alterado futuramente para um valor privado.</p>
          </div>

          <!-- Buttons: Only visible if code is correct -->
          <div class="space-y-2" *ngIf="adminAccessCode === defaultAdminAccessCode">
            
            <!-- PAYMENT PART (Only shows if License is EXPIRED/INVALID) -->
            <ng-container *ngIf="!licenseService.current?.valid">
              <button
                (click)="enterViaAdministration('buy')"
                class="w-full text-left p-3 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <p class="text-sm font-bold text-blue-700">Pagar Licença</p>
                <p class="text-xs text-blue-600">Abre Administração > Gestão de Licenças para pagamento/renovação.</p>
              </button>

              <button
                (click)="enterViaAdministration('key')"
                class="w-full text-left p-3 border border-indigo-200 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <p class="text-sm font-bold text-indigo-700">Inserir Chave</p>
                <p class="text-xs text-indigo-600">Abre Administração > Gestão de Licenças para ativação manual.</p>
              </button>

              <button
                (click)="enterViaAdministration('demo')"
                class="w-full text-left p-3 border border-green-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
              >
                <p class="text-sm font-bold text-green-700">Entrar em Demonstração</p>
                <p class="text-xs text-green-600">Continua em modo de demonstração e segue para o painel de administração.</p>
              </button>
            </ng-container>

            <!-- MANAGEMENT PART (Only shows if License is VALID) -->
            <button
              *ngIf="licenseService.current?.valid"
              (click)="enterViaAdministration('demo')"
              class="w-full text-left p-3 border border-indigo-200 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <p class="text-sm font-bold text-indigo-700">Painel de Administração</p>
              <p class="text-xs text-indigo-600">Gerir utilizadores, empresas e configurações do sistema.</p>
            </button>

            <!-- ALWAYS AVOID ADMIN PANEL AND GO TO ERP -->
            <button
              (click)="enterViaAdministration('erp')"
              class="w-full text-left p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <p class="text-sm font-bold text-gray-700">Ir para o ERP (Modo Operacional)</p>
              <p class="text-xs text-gray-400">Pula a administração e vai direto para as Vendas e Stock.</p>
            </button>
          </div>

          <button
            (click)="step = 'LOGIN'; password = ''; adminAccessCode = ''"
            class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none transition-colors text-sm"
          >
            Voltar ao Login
          </button>
        </div>

        <!-- Step 3: Company Selection -->
        <div *ngIf="step === 'COMPANY_SELECT'" class="animate-slide-in">
          <div class="mb-4 text-center">
            <p class="text-gray-600 text-sm">Bem-vindo, <span class="font-bold text-gray-800">{{ currentUser?.name || currentUser?.username }}</span></p>
            <p class="text-gray-500 text-xs mt-1">Selecione a empresa para iniciar sessão</p>
          </div>

          <div class="space-y-2 mb-6 max-h-60 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
            <button
              *ngFor="let company of availableCompanies"
              (click)="selectCompany(company)"
              class="w-full text-left p-3 rounded bg-white border border-gray-200 hover:border-blue-500 hover:shadow-sm transition-all flex items-center gap-3 group"
            >
              <div class="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                 {{ company.name.substring(0, 2).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-800 truncate group-hover:text-blue-700">{{ company.name }}</div>
                <div class="text-xs text-gray-500">{{ company.location || 'Sede' }}</div>
              </div>
              <span class="material-symbols-outlined text-gray-300 group-hover:text-blue-500">chevron_right</span>
            </button>

            <div *ngIf="availableCompanies.length === 0" class="text-center py-4 text-gray-500 text-sm">
              <p class="mb-4">Não tem acesso a nenhuma empresa.</p>
              <button
                *ngIf="currentUser?.role === 'ADMIN'"
                (click)="selectedMode = 'ADMIN'; finishLogin('admin-page')"
                class="w-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 py-2 px-4 rounded transition-colors text-xs font-semibold"
              >
                IR PARA PAINEL DE ADMINISTRAÇÃO
              </button>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              (click)="step = 'LOGIN'; password = ''"
              class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none transition-colors text-sm"
            >
              Voltar
            </button>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-gray-100">
           <div class="flex flex-col items-center gap-1">
             <p class="text-gray-400 text-[10px] uppercase tracking-wider font-medium">Servidor Conectado</p>
             <p class="text-gray-600 text-xs font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
               {{ getConnectionDetails() }}
             </p>
           </div>
        </div>

        <p class="text-center text-gray-400 text-[10px] mt-4">
          &copy; 2024 Inverno ERP. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in {
      animation: slideIn 0.2s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    .material-symbols-outlined.filled {
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
  `]
})
export class LoginComponent implements OnInit {
  @Output() onLogin = new EventEmitter<{ mode: string; initialView?: string }>();

  step: 'LOGIN' | 'ACCESS_GATE' | 'COMPANY_SELECT' = 'LOGIN';
  username = '';
  password = '';
  selectedMode = 'ERP';
  adminAccessCode = '';
  readonly defaultAdminAccessCode = 'admin';

  currentUser: any = null;
  availableCompanies: any[] = [];

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
    private licenseService: LicenseService
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

  getConnectionLabel(): string {
    if (this.systemConfig.deploymentMode === 'WEB') {
      return 'Cloud / Web';
    }
    return this.systemConfig.localStorageType === 'POSTGRES' ? 'Local (DB)' : 'Local (Browser)';
  }

  getConnectionDetails(): string {
    if (this.systemConfig.deploymentMode === 'WEB') {
      return this.systemConfig.apiUrl || 'https://api.inverno-erp.com';
    }
    if (this.systemConfig.localStorageType === 'POSTGRES') {
      const { host, port, database } = this.systemConfig.postgresConfig;
      return `${host}:${port}/${database}`;
    }
    return 'Armazenamento Local (Navegador)';
  }

  onAdminCodeSubmit() {
    if (this.adminAccessCode === this.defaultAdminAccessCode) {
      // If code is correct, choose the best path automatically on "Enter"
      const license = this.licenseService.current;
      if (license?.valid) {
        this.enterViaAdministration('demo'); // Goes to Admin Panel if valid
      } else {
        this.enterViaAdministration('buy');  // Goes to Payments if invalid
      }
    } else {
      this.toasterService.showError('Código inválido', 'Código especial do administrador incorreto.');
    }
  }

  enterViaAdministration(option: 'buy' | 'key' | 'demo' | 'erp') {
    if (option !== 'erp' && this.adminAccessCode !== this.defaultAdminAccessCode) {
      this.toasterService.showError('Código inválido', 'Código especial do administrador incorreto.');
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
          // Rule: If license is valid (not expired/revoked), skip the gate.
          const isLicenseValid = license && license.valid;

          // Normal users: only allow if system has a valid license
          if (!user.isAdmin && !user.isSuperAdmin) {
            if (!isLicenseValid) {
              this.toasterService.showError('Acesso Negado', 'O sistema encontra-se sem licença ativa. Por favor, contacte o administrador.');
              return;
            }
            this.selectedMode = 'ERP';
            this.loadAvailableCompanies();
            return;
          }

          // Admins/SuperAdmins: 
          // 1. If license is VALID (ACTIVE or GRACE) -> skip directly to Company Selection/ERP
          // 2. If license is NOT VALID (EXPIRED or REVOKED) -> show ACCESS_GATE to force payment
          if (isLicenseValid) {
            this.selectedMode = 'ERP';
            this.loadAvailableCompanies();
          } else {
            // Expired or No License: show the Gate
            this.step = 'ACCESS_GATE';
          }
        },
        error: (err) => {
          console.error('Login failed', err);
          const errorMsg = err.error?.message || 'Utilizador ou palavra-passe incorretos.';
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
