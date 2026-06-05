
import { Component, Output, EventEmitter, OnInit, OnDestroy, Input, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { NavigationService } from '../services/navigation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200 shadow-sm select-none shrink-0 z-20 relative">

      <!-- LEFT: Logo (clicável → home) + Breadcrumb -->
      <div class="flex items-center gap-3">
        <button (click)="goHome()"
                class="flex items-center gap-2 border-r border-gray-200 pr-4 mr-1 hover:opacity-80 transition-opacity cursor-pointer"
                title="Ir para o Painel de Controlo">
          <div class="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="11" y="2" width="4" height="26" rx="2" fill="white"/>
              <rect x="5" y="2" width="20" height="5" rx="2" fill="white"/>
              <rect x="5" y="23" width="20" height="5" rx="2" fill="white"/>
            </svg>
          </div>
          <span class="font-black text-sm text-gray-800 tracking-tight hidden sm:block">Inverno ERP</span>
        </button>

        <!-- Breadcrumb -->
        <div class="flex items-center gap-1.5 text-xs text-gray-500">
          <span class="text-gray-300">/</span>
          <span class="font-semibold text-gray-700">{{ getModuleLabel() }}</span>
        </div>
      </div>

      <!-- RIGHT: Actions -->
      <div class="flex items-center gap-1 text-gray-600">

        <!-- Clock -->
        <div class="hidden md:flex flex-col items-end leading-tight mr-3 border-r border-gray-200 pr-3">
          <span class="text-xs font-bold text-gray-700 tabular-nums">{{ currentTime }}</span>
          <span class="text-[10px] text-gray-400">{{ currentDate }}</span>
        </div>

        <!-- Favorite Toggle -->
        <button *ngIf="showFavoriteButton()"
                (click)="toggleFavorite()"
                class="hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                [title]="isFavorite() ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'">
          <span class="material-symbols-outlined text-[18px] align-middle transition-all"
                [style.font-variation-settings]="'\\'FILL\\' ' + (isFavorite() ? '1' : '0')"
                [class.text-amber-400]="isFavorite()"
                [class.text-gray-400]="!isFavorite()">
            star
          </span>
        </button>

        <!-- Notifications -->
        <button class="hover:bg-gray-100 p-1.5 rounded-lg transition-colors relative" title="Notificações">
          <span class="material-symbols-outlined text-[18px] align-middle text-gray-500">notifications</span>
        </button>

        <!-- Divider -->
        <div class="h-5 w-px bg-gray-200 mx-1"></div>

        <!-- User Dropdown Trigger -->
        <div class="relative">
          <button (click)="toggleUserMenu()"
                  data-user-menu
                  class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Conta">
            <div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
              {{ getUserInitials() }}
            </div>
            <div class="flex flex-col items-start leading-tight hidden sm:flex">
              <span class="text-xs font-semibold text-gray-800">{{ username }}</span>
              <span *ngIf="companyName" class="text-[10px] text-gray-400">{{ companyName }}</span>
            </div>
            <span class="material-symbols-outlined text-[16px] text-gray-400 hidden sm:block transition-transform duration-200"
                  [class.rotate-180]="userMenuOpen">expand_more</span>
          </button>

          <!-- Dropdown Menu -->
          <div *ngIf="userMenuOpen"
               class="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">

            <!-- User Info Header -->
            <div class="px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-sm">
                  {{ getUserInitials() }}
                </div>
                <div class="min-w-0">
                  <p class="text-white font-bold text-sm truncate">{{ username }}</p>
                  <p class="text-blue-200 text-[11px] truncate">{{ companyName }}</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="py-1.5">
              <button (click)="goHome(); userMenuOpen = false"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                <span class="material-symbols-outlined text-[18px] text-blue-500">home</span>
                <span>Painel de Controlo</span>
              </button>

              <button (click)="changeCompany()"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                <span class="material-symbols-outlined text-[18px] text-purple-500">business</span>
                <div class="flex-1 min-w-0">
                  <span>Mudar de Empresa</span>
                  <p class="text-[10px] text-gray-400 truncate">{{ companyName }}</p>
                </div>
                <span class="material-symbols-outlined text-[14px] text-gray-300">chevron_right</span>
              </button>

              <button (click)="changeUser()"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                <span class="material-symbols-outlined text-[18px] text-green-500">manage_accounts</span>
                <span>Mudar de Utilizador</span>
              </button>

              <div class="h-px bg-gray-100 my-1 mx-3"></div>

              <button (click)="logout()"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium">
                <span class="material-symbols-outlined text-[18px]">logout</span>
                <span>Terminar Sessão</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() activeView: string = 'dashboard';
  @Output() onLogout = new EventEmitter<void>();
  @Output() onNavigate = new EventEmitter<string>();

  username = 'Utilizador';
  companyName = '';
  currentTime = '';
  currentDate = '';
  userMenuOpen = false;

  private clockInterval: any;

  private moduleLabels: { [key: string]: string } = {
    'dashboard': 'Painel de Controlo',
    'sales-form': 'Vendas',
    'internal-docs': 'Documentos Internos',
    'purchase-form': 'Compras',
    'customer-management': 'Clientes',
    'supplier-management': 'Fornecedores',
    'article-management': 'Artigos',
    'stock-movements': 'Movimentos de Stock',
    'stock-exploration': 'Exploração de Stock',
    'inventory-count': 'Contagem de Inventário',
    'inventory-report': 'Relatório de Inventário',
    'article-statement': 'Extrato de Artigos',
    'stock-movements-report': 'Relatório de Movimentos',
    'consumption-report': 'Relatório de Consumo',
    'stock-control-report': 'Controlo de Stock',
    'warehouse-management': 'Armazéns',
    'batch-management': 'Lotes',
    'unit-management': 'Unidades',
    'delivery-planning': 'Planeamento de Entregas',
    'vehicle-load': 'Carga de Viaturas',
    'fleet-map': 'Frota de Viaturas',
    'gas-movement': 'Controlo de Gás',
    'gas-inventory': 'Inventário de Gás',
    'gas-control': 'Gestão de Gás',
    'chart-of-accounts': 'Plano de Contas',
    'journal-entries': 'Lançamentos',
    'journal-entries-review': 'Revisão de Lançamentos',
    'diaries': 'Diários Contabilísticos',
    'trial-balance': 'Balancete',
    'financial-statements': 'Demonstrações Financeiras',
    'treasury-management': 'Tesouraria',
    'bank-reconciliation': 'Reconciliação Bancária',
    'account-statement': 'Extrato de Conta',
    'petty-cash-vouchers': 'Caixa Pequeña',
    'employee-list': 'Funcionários',
    'payroll-processing': 'Processamento de Salários',
    'absences-management': 'Gestão de Faltas',
    'tax-tables': 'Tabelas de Impostos',
    'hr-reports': 'Relatórios de RH',
    'admin-page': 'Painel de Administração',
    'admin-companies': 'Empresas',
    'admin-users': 'Utilizadores',
    'admin-series': 'Séries de Documentos',
    'admin-fiscal-years': 'Anos Fiscais',
    'document-types': 'Tipos de Documentos',
    'entity-management': 'Entidades',
    'license-manager': 'Gestão de Licenças',
    'mobile-approvals': 'Aprovações Mobile',
    'payment-gateway-settings': 'Configuração de Pagamentos',
  };

  constructor(
    private dataService: DataService,
    private navService: NavigationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const storedUser = localStorage.getItem('erp_current_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.username = user.name || user.username || 'Utilizador';
    }
    const storedCompany = localStorage.getItem('erp_company_info');
    if (storedCompany) {
      const company = JSON.parse(storedCompany);
      this.companyName = company.name;
    }
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-user-menu]') && this.userMenuOpen) {
      this.userMenuOpen = false;
      this.cdr.markForCheck();
    }
  }

  private updateClock() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.currentDate = now.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' });
    this.cdr.markForCheck();
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  goHome() {
    this.onNavigate.emit('dashboard');
    this.userMenuOpen = false;
  }

  changeCompany() {
    // Clear company info to force company re-selection
    localStorage.removeItem('erp_company_info');
    this.userMenuOpen = false;
    this.onLogout.emit();
  }

  changeUser() {
    // Full logout to go back to login screen
    this.userMenuOpen = false;
    this.onLogout.emit();
  }

  getModuleLabel(): string {
    return this.moduleLabels[this.activeView] || 'Inverno ERP';
  }

  getUserInitials(): string {
    if (!this.username) return '?';
    const parts = this.username.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return this.username.substring(0, 2).toUpperCase();
  }

  showFavoriteButton(): boolean {
    return this.activeView !== 'dashboard' &&
      this.activeView !== 'admin-page' &&
      this.activeView !== 'license-manager';
  }

  isFavorite(): boolean {
    return this.navService.isFavorite(this.activeView);
  }

  toggleFavorite() {
    this.navService.toggleFavorite(this.activeView);
  }

  logout() {
    this.userMenuOpen = false;
    this.onLogout.emit();
  }
}
