
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

  constructor(
    private startupService: StartupService,
    private inventoryService: InventoryService,
    private accountingService: AccountingService,
    private customerService: CustomerService,
    private supplierService: SupplierService
  ) { }

  ngOnInit() {
    this.startupService.init();
    const currentUser = localStorage.getItem('erp_current_user');
    const savedMode = localStorage.getItem('erp_login_mode');

    if (currentUser) {
      if (savedMode === 'ADMIN') {
        this.isLoggedIn = true;
        this.currentMode = 'ADMIN';
        this.activeView = 'admin-page';
      } else if (savedMode === 'ERP') {
        const companyInfo = localStorage.getItem('erp_company_info');
        if (companyInfo) {
          this.isLoggedIn = true;
          this.currentMode = 'ERP';
          this.activeView = 'dashboard';
        } else {
          // If in ERP mode but no company selected, force login
          this.handleLogout();
        }
      } else {
        this.handleLogout();
      }
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
  }
}
