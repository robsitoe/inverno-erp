
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { HeaderComponent } from './layout/header.component';
import { SidebarComponent } from './layout/sidebar.component';
import { FooterComponent } from './layout/footer.component';
import { MainContentComponent } from './layout/main-content.component';
import { LoginComponent } from './login.component';
import { StartupService } from './shared/startup.service';
import { InventoryService } from './shared/inventory.service';
import { AccountingService } from './shared/accounting.service';
import { CustomerService } from './shared/customer.service';
import { SupplierService } from './shared/supplier.service';
import { DataService } from './services/data.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SidebarComponent, FooterComponent, MainContentComponent, LoginComponent],
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeOut', [
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div *ngIf="backendError" class="fixed inset-0 z-[9999] bg-white flex items-center justify-center p-6 text-center">
      <div class="max-w-md bg-red-50 border border-red-200 rounded-lg p-8 shadow-xl">
        <span class="material-symbols-outlined text-red-600 text-6xl mb-4">cloud_off</span>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Servidor Inacessível</h2>
        <p class="text-gray-600 mb-6">Não foi possível estabelecer conexão com a base de dados central. Por favor, verifique se o servidor backend está em execução.</p>
        <div class="flex flex-col gap-2">
           <button (click)="retryConnection()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Tentar Novamente
           </button>
           <button (click)="switchToOfflineMode()" class="text-gray-500 hover:text-gray-800 text-sm underline">
            Utilizar modo offline (Demo local)
           </button>
        </div>
      </div>
    </div>

    <ng-container *ngIf="isLoggedIn; else loginTpl">
      <div @fadeSlideIn class="flex flex-col h-screen w-screen overflow-hidden bg-[#F0F0F0]">
        <app-header (onLogout)="handleLogout()"></app-header>
        <div class="flex flex-1 overflow-hidden relative">
          <app-sidebar (onNavigate)="setActiveView($event)" [currentView]="activeView" [mode]="currentMode"></app-sidebar>
          <app-main-content [activeView]="activeView" class="flex-1 w-full h-full overflow-hidden"></app-main-content>
        </div>
        <app-footer></app-footer>
      </div>
    </ng-container>
    <ng-template #loginTpl>
      <app-login @fadeOut (onLogin)="handleLogin($event)"></app-login>
    </ng-template>
  `
})
export class AppComponent {
  activeView: string = 'dashboard';
  isLoggedIn: boolean = false;
  currentMode: string = 'ERP';
  backendError: boolean = false;

  constructor(
    private startupService: StartupService,
    private inventoryService: InventoryService,
    private accountingService: AccountingService,
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private dataService: DataService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.validateStoredSession();
    this.checkConnectionAndInit();
  }

  async checkConnectionAndInit() {
    this.dataService.checkBackendConnectivity().subscribe(connected => {
      if (!connected && !this.isOfflineMode()) {
        this.backendError = true;
      } else {
        this.backendError = false;
        this.startupService.init();
        this.validateStoredSession();
      }
    });
  }

  private isOfflineMode(): boolean {
    const config = localStorage.getItem('erp_system_config');
    if (config) {
      return JSON.parse(config).localStorageType === 'BROWSER';
    }
    return false;
  }

  retryConnection() {
    this.checkConnectionAndInit();
  }

  switchToOfflineMode() {
    const config = { deploymentMode: 'LOCAL', localStorageType: 'BROWSER' };
    localStorage.setItem('erp_system_config', JSON.stringify(config));
    window.location.reload();
  }

  validateStoredSession() {
    const currentUser = localStorage.getItem('erp_current_user');
    const savedMode = localStorage.getItem('erp_login_mode');

    if (currentUser && currentUser !== 'undefined' && currentUser !== 'null') {
      try {
        if (savedMode === 'ADMIN') {
          this.isLoggedIn = true;
          this.currentMode = 'ADMIN';
          this.activeView = 'admin-page';
        } else if (savedMode === 'ERP') {
          const companyInfo = localStorage.getItem('erp_company_info');
          if (companyInfo && companyInfo !== 'undefined' && companyInfo !== 'null') {
            this.isLoggedIn = true;
            this.currentMode = 'ERP';
            this.activeView = 'dashboard';
          } else {
            // No company selected, stay at login (which will show company selection if user is known)
            this.isLoggedIn = false;
          }
        }
      } catch (e) {
        console.error('Error validating stored session:', e);
        this.handleLogout();
      }
    } else {
      this.isLoggedIn = false;
    }
  }

  setActiveView(view: string) {
    this.activeView = view;
  }

  handleLogin(mode: string) {
    this.isLoggedIn = true;
    this.currentMode = mode;
    localStorage.setItem('erp_login_mode', mode);

    if (mode === 'ADMIN') {
      this.activeView = 'admin-page';
    } else {
      this.activeView = 'dashboard';
    }

    // Reload services to ensure they have the latest data for the logged in user/company
    this.inventoryService.loadData();
    this.accountingService.loadData();
    this.customerService.loadCustomers();
    this.supplierService.loadSuppliers();
  }

  handleLogout() {
    this.isLoggedIn = false;
    this.activeView = 'dashboard';
    this.currentMode = 'ERP';
    localStorage.removeItem('erp_current_user');
    localStorage.removeItem('erp_login_mode');
    localStorage.removeItem('erp_company_info');
    localStorage.removeItem('access_token');
    this.authService.logout();

    // Reset DataService active company
    this.dataService.setActiveCompany(null);
  }
}
