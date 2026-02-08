import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { DataService } from './services/data.service';
import { ToasterService } from './services/toaster.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
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
          
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="mode">
              Aplicação
            </label>
            <select 
              class="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 bg-white" 
              id="mode" 
              [(ngModel)]="selectedMode"
              name="mode"
            >
              <option value="ERP">Inverno ERP (Gestão)</option>
              <option value="ADMIN">Administrador</option>
            </select>
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

        <!-- Step 2: Company Selection -->
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
                (click)="selectedMode = 'ADMIN'; finishLogin()"
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
  @Output() onLogin = new EventEmitter<string>();

  step: 'LOGIN' | 'COMPANY_SELECT' = 'LOGIN';
  username = '';
  password = '';
  selectedMode = 'ERP';

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
    private toasterService: ToasterService
  ) { }

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

  onCredentialsSubmit() {
    this.authService.login({ username: this.username, password: this.password })
      .subscribe({
        next: (user) => {
          this.currentUser = user;

          // Permission Check for ADMIN mode
          if (this.selectedMode === 'ADMIN') {
            if (!user.isAdmin && !user.isSuperAdmin) {
              this.toasterService.showError('Acesso Negado', 'Não tem permissões de administrador para aceder a este painel.');
              return;
            }
            this.finishLogin();
            return;
          }

          // ERP Mode - Proceed to Company Selection
          this.loadAvailableCompanies();
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
      // For now, simple logic: if admin, see all. If not, see none (unless we implement user-company relation in backend)
      if (this.currentUser.isAdmin || this.currentUser.isSuperAdmin) {
        this.availableCompanies = companies;
      } else {
        // Filter companies based on user permissions
        const allowedIds = (this.currentUser.permissions || []).map((p: any) => p.companyId);
        if (allowedIds.includes('ALL')) {
          this.availableCompanies = companies;
        } else {
          this.availableCompanies = companies.filter(c => allowedIds.includes(c.id));
        }
      }

      if (this.availableCompanies.length === 0) {
        // If no companies found, maybe mock one for testing if local?
        // Or just leave empty.
        if (this.systemConfig.deploymentMode === 'LOCAL' && this.systemConfig.localStorageType === 'BROWSER') {
          // Optional: Auto-create a demo company if none exists in browser mode?
          // For now, let's just leave it.
        }
      }

      if (this.availableCompanies.length === 1) {
        this.selectCompany(this.availableCompanies[0]);
      } else {
        this.step = 'COMPANY_SELECT';
      }
    });
  }

  selectCompany(company: any) {
    this.dataService.setActiveCompany(company);
    this.finishLogin();
  }

  finishLogin() {
    this.onLogin.emit(this.selectedMode);
  }
}
