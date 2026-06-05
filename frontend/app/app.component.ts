


import { Component, ChangeDetectorRef } from '@angular/core';


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


import { LicenseService, LicenseInfo } from './services/license.service';


import { NavigationService } from './services/navigation.service';





import { ToasterComponent } from './shared/toaster.component';





@Component({


  selector: 'app-root',


  standalone: true,


  imports: [CommonModule, HeaderComponent, SidebarComponent, FooterComponent, MainContentComponent, LoginComponent, ToasterComponent],


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


        <div *ngIf="backendError" class="fixed inset-0 z-[9999] flex"
         style="background: linear-gradient(135deg, #0042a8 0%, #0078D7 60%, #00aaee 100%);">
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white opacity-5"></div>
        <div class="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white opacity-5"></div>
      </div>
      <div class="relative z-10 w-full flex flex-col items-center justify-center p-6 text-center">
        <div class="bg-white rounded-3xl p-10 shadow-2xl max-w-md w-full">
          <div class="flex items-center justify-center gap-2 mb-6">
            <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow">
              <svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="11" y="2" width="4" height="26" rx="2" fill="white"/>
                <rect x="5" y="2" width="20" height="5" rx="2" fill="white"/>
                <rect x="5" y="23" width="20" height="5" rx="2" fill="white"/>
              </svg>
            </div>
            <span class="font-black text-gray-900 text-lg tracking-tight">Inverno ERP</span>
          </div>
          <div class="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <span class="material-symbols-outlined text-red-500 text-[36px]">cloud_off</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Servidor Inacessível</h2>
          <p class="text-gray-500 text-sm mb-6 leading-relaxed">
            Não foi possível estabelecer ligação com o servidor backend.<br>
            Verifique se o serviço está em execução em <code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">localhost:3000</code>
          </p>
          <div class="space-y-2">
            <button (click)="retryConnection()"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              <span class="material-symbols-outlined text-[18px]">refresh</span>
              Tentar Novamente
            </button>
            <button (click)="switchToOfflineMode()"
                    class="w-full text-gray-500 hover:text-gray-800 text-sm py-2 flex items-center justify-center gap-1 transition-colors">
              <span class="material-symbols-outlined text-[16px]">wifi_off</span>
              Continuar em modo offline (Demo)
            </button>
          </div>
        </div>
      </div>
    </div>





    <ng-container *ngIf="isLoggedIn; else loginTpl">


      <div @fadeSlideIn class="flex flex-col h-screen w-screen overflow-hidden bg-[#F0F0F0]">


        


        <!-- Global License Banner -->


        <div *ngIf="license?.valid && (license?.inGracePeriod || (license?.daysRemaining || 0) <= 7)" 


             class="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-amber-800 animate-pulse-subtle">


          <div class="flex items-center gap-2 text-xs font-semibold">


            <span class="material-symbols-outlined text-[18px]">warning</span>


            <span *ngIf="license?.inGracePeriod">


              A sua licença expirou. Encontra-se em período de graça até {{ license?.gracePeriodEndsAt | date:'dd/MM/yyyy HH:mm' }}.


            </span>


            <span *ngIf="!license?.inGracePeriod">


              A sua licença expira em {{ license?.daysRemaining }} dias ({{ license?.expiresAt | date:'dd/MM/yyyy' }}).


            </span>


          </div>


          <button (click)="activeView = 'license-manager'" class="text-[10px] uppercase font-bold bg-amber-200 hover:bg-amber-300 px-2 py-1 rounded transition-colors">


            Renovar Agora


          </button>


        </div>








        <div *ngIf="license?.offline" 


             class="bg-blue-600 border-b border-blue-700 px-4 py-2 flex items-center justify-between text-white">


          <div class="flex items-center gap-2 text-xs font-bold">


            <span class="material-symbols-outlined text-[18px]">cloud_off</span>


            <span>MODO OFFLINE: exibindo último estado de licença validado em {{ license?.lastServerCheckAt | date:'dd/MM/yyyy HH:mm' }}.</span>


          </div>


          <button (click)="licenseService.refreshFromServer()" class="text-[10px] uppercase font-bold bg-white text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">


            Tentar Sincronizar


          </button>


        </div>





        <div *ngIf="!license?.valid" 


             class="bg-red-600 border-b border-red-700 px-4 py-2 flex items-center justify-between text-white">


          <div class="flex items-center gap-2 text-xs font-bold">


            <span class="material-symbols-outlined text-[18px]">gpp_bad</span>


            <span>{{ license?.offline ? 'LICENÇA INVÁLIDA/EXPIRADA NO ÚLTIMO CHECK. Funcionalidades bloqueadas até nova validação.' : 'LICENÇA INVÁLIDA OU EXPIRADA. O acesso aos módulos foi bloqueado pelo servidor.' }}</span>


          </div>


          <button (click)="activeView = 'license-manager'" class="text-[10px] uppercase font-bold bg-white text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">


            Ativar Licença


          </button>


        </div>





        <app-header [activeView]="activeView" (onLogout)="handleLogout()" (onNavigate)="setActiveView($event)"></app-header>


        <div class="flex flex-1 overflow-hidden relative">


          <app-sidebar (onNavigate)="setActiveView($event)" [currentView]="activeView" [mode]="currentMode" [productionMode]="isProductionMode"></app-sidebar>


          <app-main-content [activeView]="activeView" class="flex-1 w-full h-full overflow-hidden"></app-main-content>


        </div>


        <app-footer (onLicenseClick)="activeView = 'license-manager'"></app-footer>


      </div>


    </ng-container>


    


    <ng-template #loginTpl>


      <app-login @fadeOut (onLogin)="handleLogin($event)"></app-login>


    </ng-template>





    <app-toaster></app-toaster>


  `


})


export class AppComponent {


  activeView: string = 'dashboard';


  isLoggedIn: boolean = false;


  currentMode: string = 'ERP';


  backendError: boolean = false;


  isProductionMode: boolean = false;


  license: LicenseInfo | null = null;





  constructor(


    private startupService: StartupService,


    private inventoryService: InventoryService,


    private accountingService: AccountingService,


    private customerService: CustomerService,


    private supplierService: SupplierService,


    private dataService: DataService,


    private authService: AuthService,


    public licenseService: LicenseService,


    private navigationService: NavigationService,


    private cdr: ChangeDetectorRef


  ) { }





  ngOnInit() {
    localStorage.removeItem('erp_initial_view');


    this.validateStoredSession();


    this.checkConnectionAndInit();





    // Subscribe to license updates


    this.licenseService.license$.subscribe(l => {


      this.license = l;


    });





    // Subscribe to navigation events


    this.navigationService.navigation$.subscribe(nav => {


      if (nav.view && nav.view !== this.activeView) {


        this.activeView = nav.view;


      }


    });





    // Record initial view


    this.navigationService.recordNavigation(this.activeView);


  }





  async checkConnectionAndInit() {


    const config = this.dataService.getSystemConfig();


    this.isProductionMode = config.deploymentMode === 'WEB';


    console.log(`[Startup] Modo de Depuração: ${config.deploymentMode} | Tipo Storage: ${config.localStorageType}`);





    this.dataService.checkBackendConnectivity().subscribe(connected => {


      // Point 3: "Pre-flight check" no arranque


      if (!connected && !this.dataService.isLocalBrowser()) {


        console.error('[Startup] Falha crítica: Backend inacessível em modo operacional.');


        this.backendError = true;


        this.cdr.markForCheck();


      } else {


        if (!connected && this.dataService.isLocalBrowser()) {


          console.warn('[Startup] Backend inacessível, mas operando em MODO OFFLINE/LOCAL.');


        } else {


          console.info('[Startup] Conexão estável com o Backend.');


        }





        this.backendError = false;


        this.cdr.markForCheck();


        this.startupService.init();


        this.validateStoredSession();


      }


    });


  }








  retryConnection() {


    this.checkConnectionAndInit();


  }





  switchToOfflineMode() {


    this.dataService.switchMode('BROWSER', 'LOCAL');


  }





  validateStoredSession() {


    const currentUser = localStorage.getItem('erp_current_user');


    const savedMode = localStorage.getItem('erp_login_mode');


    const savedInitialView = localStorage.getItem('erp_initial_view');





    if (currentUser && currentUser !== 'undefined' && currentUser !== 'null') {


      try {


        if (savedMode === 'ADMIN') {


          this.isLoggedIn = true;


          this.currentMode = 'ADMIN';


          this.activeView = 'admin-page'; // Always home on session restore
          localStorage.removeItem('erp_initial_view');


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


    this.navigationService.recordNavigation(view);


  }





  handleLogin(event: string | { mode: string; initialView?: string }) {


    const mode = typeof event === 'string' ? event : event.mode;


    const initialView = typeof event === 'string' ? undefined : event.initialView;





    this.isLoggedIn = true;


    this.currentMode = mode;


    localStorage.setItem('erp_login_mode', mode);


    if (initialView) {


      localStorage.setItem('erp_initial_view', initialView);


    } else {


      localStorage.removeItem('erp_initial_view');


    }





    if (mode === 'ADMIN') {


      this.activeView = initialView || 'admin-page';


    } else {


      this.activeView = 'dashboard';


    }


  }





  handleLogout() {


    this.isLoggedIn = false;


    this.activeView = 'dashboard';


    this.currentMode = 'ERP';


    localStorage.removeItem('erp_current_user');


    localStorage.removeItem('erp_login_mode');


    localStorage.removeItem('erp_initial_view');


    localStorage.removeItem('erp_company_info');


    localStorage.removeItem('access_token');


    this.authService.logout();





    // Reset DataService active company


    this.dataService.setActiveCompany(null);


  }


}


