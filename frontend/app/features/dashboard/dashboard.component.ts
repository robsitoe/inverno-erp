import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { LicenseService } from '../../services/license.service';
import { ChartOfAccountsSetupComponent } from '../accounting/chart-of-accounts-setup.component';

interface KpiCard {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color: string;
  bgColor: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  view?: string;
}

interface QuickAction {
  label: string;
  icon: string;
  view: string;
  color: string;
  description: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ChartOfAccountsSetupComponent],
  template: `
    <div class="h-full overflow-y-auto bg-gray-50">
      <div class="max-w-7xl mx-auto p-6 space-y-6">

        <!-- Welcome Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              {{ getGreeting() }}, <span class="text-blue-600">{{ username }}</span>
            </h1>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ companyName }} &mdash; {{ formatDate(today) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                  [ngClass]="{
                    'bg-green-100 text-green-700': licenseStatus === 'ACTIVE',
                    'bg-amber-100 text-amber-700': licenseStatus === 'GRACE',
                    'bg-red-100 text-red-700': licenseStatus === 'EXPIRED' || licenseStatus === 'REVOKED'
                  }">
              <span class="w-1.5 h-1.5 rounded-full"
                    [ngClass]="{
                      'bg-green-500': licenseStatus === 'ACTIVE',
                      'bg-amber-500': licenseStatus === 'GRACE',
                      'bg-red-500': licenseStatus === 'EXPIRED' || licenseStatus === 'REVOKED'
                    }"></span>
              {{ getLicenseLabel() }}
            </span>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div *ngFor="let kpi of kpiCards"
               class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
               (click)="kpi.view && navigate(kpi.view)">
            <div class="flex items-start justify-between mb-4">
              <div class="p-2.5 rounded-xl" [ngClass]="kpi.bgColor">
                <span class="material-symbols-outlined text-[22px]" [ngClass]="kpi.color">{{ kpi.icon }}</span>
              </div>
              <div *ngIf="kpi.trend" class="flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-1"
                   [ngClass]="{
                     'bg-green-50 text-green-600': kpi.trend === 'up',
                     'bg-red-50 text-red-600': kpi.trend === 'down',
                     'bg-gray-100 text-gray-500': kpi.trend === 'neutral'
                   }">
                <span class="material-symbols-outlined text-[14px]">
                  {{ kpi.trend === 'up' ? 'trending_up' : kpi.trend === 'down' ? 'trending_down' : 'trending_flat' }}
                </span>
                {{ kpi.trendLabel }}
              </div>
            </div>
            <p class="text-2xl font-bold text-gray-900 leading-none mb-1">{{ kpi.value }}</p>
            <p class="text-sm font-medium text-gray-600">{{ kpi.label }}</p>
            <p *ngIf="kpi.sub" class="text-xs text-gray-400 mt-0.5">{{ kpi.sub }}</p>
          </div>
        </div>

        <!-- Main Grid: Quick Actions + Activity -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Quick Actions -->
          <div class="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-blue-600 text-[20px]">bolt</span>
              <h2 class="font-bold text-gray-800 text-sm">Acções Rápidas</h2>
            </div>
            <div class="space-y-2">
              <button *ngFor="let action of quickActions"
                      (click)="navigate(action.view)"
                      class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group border border-transparent hover:border-gray-200">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" [ngClass]="action.color">
                  <span class="material-symbols-outlined text-white text-[18px]">{{ action.icon }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{{ action.label }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ action.description }}</p>
                </div>
                <span class="material-symbols-outlined text-gray-300 group-hover:text-blue-400 ml-auto text-[18px] shrink-0">chevron_right</span>
              </button>
            </div>
          </div>

          <!-- Recent Activity / Modules -->
          <div class="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-600 text-[20px]">grid_view</span>
                <h2 class="font-bold text-gray-800 text-sm">Módulos do Sistema</h2>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button *ngFor="let module of modules"
                      (click)="navigate(module.view)"
                      class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group cursor-pointer">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center" [ngClass]="module.bgColor">
                  <span class="material-symbols-outlined text-[22px]" [ngClass]="module.color">{{ module.icon }}</span>
                </div>
                <span class="text-xs font-semibold text-gray-700 group-hover:text-blue-700 text-center leading-tight">{{ module.label }}</span>
              </button>
            </div>
          </div>
        </div>


        <!-- Setup Alert: Chart of Accounts missing -->
        <div *ngIf="!hasChartOfAccounts && !setupDismissed">
          <app-chart-of-accounts-setup
            [companyName]="companyName"
            [companyId]="companyId"
            [compact]="true"
            (dismiss)="setupDismissed = true"
            (setupComplete)="hasChartOfAccounts = true">
          </app-chart-of-accounts-setup>
        </div>
        <!-- Bottom Info Bar -->
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div class="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-blue-500">info</span>
                <span><strong class="text-gray-700">Inverno ERP</strong> &mdash; Sistema de Gestão Empresarial</span>
              </div>
              <span class="text-gray-300 hidden sm:block">|</span>
              <span class="hidden sm:block">Versão 1.1.0</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Todos os sistemas operacionais
              </span>
              <span>&copy; {{ currentYear }} Inverno ERP</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  @Output() onNavigate = new EventEmitter<string>();

  username = 'Utilizador';
  companyName = 'Empresa';
  today = new Date();
  hasChartOfAccounts = true;  // Assume OK; check in ngOnInit
  setupDismissed = false;
  currentYear = new Date().getFullYear();
  licenseStatus = 'ACTIVE';

  kpiCards: KpiCard[] = [];
  quickActions: QuickAction[] = [];
  modules: any[] = [];

  constructor(
    private dataService: DataService,
    public licenseService: LicenseService
  ) {}

  ngOnInit() {
    const user = localStorage.getItem('erp_current_user');
    if (user) this.username = JSON.parse(user)?.name || JSON.parse(user)?.username || 'Utilizador';
    const company = localStorage.getItem('erp_company_info');
    if (company) this.companyName = JSON.parse(company)?.name || 'Empresa';

    // Check if chart of accounts is loaded
    this.dataService.getAccounts().subscribe({
      next: (accs: any[]) => { this.hasChartOfAccounts = (accs && accs.length > 0); },
      error: () => { this.hasChartOfAccounts = true; } // Assume OK on error
    });

    const lic = this.licenseService.current;
    this.licenseStatus = lic?.status || 'ACTIVE';

    this.loadKpis();
    this.setupQuickActions();
    this.setupModules();
  }

  navigate(view: string) {
    this.onNavigate.emit(view);
  }

  formatDate(date: Date): string {
    const days = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return days[date.getDay()] + ', ' + date.getDate() + ' de ' + months[date.getMonth()] + ' de ' + date.getFullYear();
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 19) return 'Boa tarde';
    return 'Boa noite';
  }

  getLicenseLabel(): string {
    // Check if chart of accounts is loaded
    this.dataService.getAccounts().subscribe({
      next: (accs: any[]) => { this.hasChartOfAccounts = (accs && accs.length > 0); },
      error: () => { this.hasChartOfAccounts = true; } // Assume OK on error
    });

    const lic = this.licenseService.current;
    if (!lic) return 'A verificar...';
    if (lic.status === 'ACTIVE') return `Licença Activa — ${lic.plan || 'Standard'}`;
    if (lic.status === 'GRACE') return `Período de Graça — ${lic.daysRemaining} dias`;
    if (lic.status === 'EXPIRED') return 'Licença Expirada';
    return 'Modo Demo';
  }

  private loadKpis() {
    this.kpiCards = [
      {
        label: 'Vendas do Mês',
        value: '—',
        sub: 'A carregar...',
        icon: 'point_of_sale',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        view: 'sales-form'
      },
      {
        label: 'Faturas em Aberto',
        value: '—',
        sub: 'Pendentes de pagamento',
        icon: 'receipt_long',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        view: 'treasury-management'
      },
      {
        label: 'Artigos em Stock',
        value: '—',
        sub: 'Total em armazém',
        icon: 'inventory_2',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        view: 'article-management'
      },
      {
        label: 'Funcionários Activos',
        value: '—',
        sub: 'Colaboradores',
        icon: 'people',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        view: 'employee-list'
      }
    ];

    // Load real data
    this.dataService.getSalesDocuments().subscribe({
      next: (docs: any[]) => {
        const now = new Date();
        const thisMonth = docs?.filter((d: any) => {
          const docDate = new Date(d.date || d.createdAt);
          return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
        }) || [];
        const total = thisMonth.reduce((sum: number, d: any) => sum + (d.totalAmount || d.total || 0), 0);
        this.kpiCards[0].value = this.formatCurrency(total);
        this.kpiCards[0].sub = `${thisMonth.length} documento(s) este mês`;
      },
      error: () => { this.kpiCards[0].value = 'N/D'; this.kpiCards[0].sub = 'Sem ligação ao servidor'; }
    });
  }

  private formatCurrency(val: any): string {
    const n = parseFloat(String(val)) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M MZN';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K MZN';
    return n.toFixed(0) + ' MZN';
  }

  private setupQuickActions() {
    this.quickActions = [
      { label: 'Nova Fatura de Venda', icon: 'add_circle', view: 'sales-form', color: 'bg-blue-600', description: 'Criar documento de venda' },
      { label: 'Novo Recibo / Pagamento', icon: 'payments', view: 'treasury-management', color: 'bg-green-600', description: 'Registar pagamento recebido' },
      { label: 'Nova Compra', icon: 'shopping_cart', view: 'purchase-form', color: 'bg-orange-500', description: 'Criar ordem de compra' },
      { label: 'Movimento de Stock', icon: 'swap_horiz', view: 'stock-movements', color: 'bg-purple-600', description: 'Registar entrada ou saída' },
      { label: 'Lançamento Contabilístico', icon: 'account_balance', view: 'journal-entries', color: 'bg-slate-600', description: 'Novo lançamento no diário' },
    ];
  }

  private setupModules() {
    this.modules = [
      { label: 'Vendas', icon: 'point_of_sale', view: 'sales-form', color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { label: 'Compras', icon: 'shopping_cart', view: 'purchase-form', color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { label: 'Inventário', icon: 'inventory_2', view: 'article-management', color: 'text-purple-600', bgColor: 'bg-purple-50' },
      { label: 'Contabilidade', icon: 'account_balance', view: 'chart-of-accounts', color: 'text-slate-600', bgColor: 'bg-slate-50' },
      { label: 'Tesouraria', icon: 'account_balance_wallet', view: 'treasury-management', color: 'text-green-600', bgColor: 'bg-green-50' },
      { label: 'Recursos Humanos', icon: 'people', view: 'employee-list', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
      { label: 'Clientes', icon: 'person', view: 'customer-management', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
      { label: 'Fornecedores', icon: 'local_shipping', view: 'supplier-management', color: 'text-amber-600', bgColor: 'bg-amber-50' },
      { label: 'Relatórios', icon: 'bar_chart', view: 'trial-balance', color: 'text-rose-600', bgColor: 'bg-rose-50' },
    ];
  }
}
