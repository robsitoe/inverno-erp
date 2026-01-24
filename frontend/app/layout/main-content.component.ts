import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { SalesDocumentForm } from '../features/sales/sales-document-form.component';
import { ChartOfAccountsComponent } from '../features/accounting/chart-of-accounts.component';
import { JournalEntriesComponent } from '../features/accounting/journal-entries.component';
import { TrialBalanceComponent } from '../features/accounting/trial-balance.component';
import { AccountingPlaceholderComponent } from '../features/accounting/accounting-placeholder.component';
import { JournalsComponent } from '../features/accounting/journals.component';
import { FinancialStatementsComponent } from '../features/accounting/financial-statements.component';
import { JournalEntriesReviewComponent } from '../features/accounting/journal-entries-review.component';
import { AdminToolsComponent } from '../features/admin/admin-tools.component';
import { ArticleManagementComponent } from '../features/inventory/article-management.component';
import { StockMovementsComponent } from '../features/inventory/stock-movements.component';
import { TreasuryManagementComponent } from '../features/treasury/treasury-management.component';
import { WarehouseManagementComponent } from '../features/inventory/warehouse-management.component';
import { UnitManagementComponent } from '../features/inventory/unit-management.component';
import { InventoryCountComponent } from '../features/inventory/inventory-count.component';
import { StockExplorationComponent } from '../features/inventory/stock-exploration.component';
import { BatchManagementComponent } from '../features/inventory/batch-management.component';
import { InventoryReportComponent } from '../features/inventory/inventory-report.component';
import { ArticleStatementComponent } from '../features/inventory/article-statement.component';
import { StockMovementsReportComponent } from '../features/inventory/stock-movements-report.component';
import { ConsumptionReportComponent } from '../features/inventory/consumption-report.component';
import { StockControlReportComponent } from '../features/inventory/stock-control-report.component';
import { StockDocumentTypesComponent } from '../features/inventory/stock-document-types.component';
import { PurchaseDocumentFormComponent } from '../features/purchases/purchase-document-form.component';
import { DocumentTypesComponent } from '../features/admin/document-types.component';
import { AdminPageComponent } from '../features/admin/admin-page.component';
import { AdminCompaniesComponent } from '../features/admin/admin-companies.component';
import { AdminFiscalYearsComponent } from '../features/admin/admin-fiscal-years.component';
import { AdminUsersComponent } from '../features/admin/admin-users.component';
import { AdminSeriesComponent } from '../features/admin/admin-series.component';
import { EntityManagementComponent } from '../features/admin/entity-management.component';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [
    CommonModule,
    SalesDocumentForm,
    ChartOfAccountsComponent,
    JournalEntriesComponent,
    TrialBalanceComponent,
    AccountingPlaceholderComponent,
    JournalsComponent,
    FinancialStatementsComponent,
    JournalEntriesReviewComponent,
    AdminToolsComponent,
    ArticleManagementComponent,
    StockMovementsComponent,
    TreasuryManagementComponent,
    WarehouseManagementComponent,
    UnitManagementComponent,
    InventoryCountComponent,
    StockExplorationComponent,
    BatchManagementComponent,
    InventoryReportComponent,
    ArticleStatementComponent,
    StockMovementsReportComponent,
    ConsumptionReportComponent,
    StockControlReportComponent,
    StockDocumentTypesComponent,
    PurchaseDocumentFormComponent,
    DocumentTypesComponent,
    AdminPageComponent,
    AdminCompaniesComponent,
    AdminFiscalYearsComponent,
    AdminUsersComponent,
    AdminSeriesComponent,
    EntityManagementComponent
  ],
  template: `
    <!-- Sales Forms -->
    <ng-container *ngIf="activeView === 'sales-form' || activeView === 'internal-docs'">
      <app-sales-document-form [viewMode]="activeView" class="w-full h-full block"></app-sales-document-form>
    </ng-container>

    <!-- Entity Management (Customers) -->
    <ng-container *ngIf="activeView === 'customer-management'">
      <app-entity-management viewMode="customer-management" class="w-full h-full block"></app-entity-management>
    </ng-container>

    <!-- Entity Management (Suppliers) -->
    <ng-container *ngIf="activeView === 'supplier-management'">
      <app-entity-management viewMode="supplier-management" class="w-full h-full block"></app-entity-management>
    </ng-container>

    <!-- Admin Pages -->
    <ng-container *ngIf="activeView === 'admin-page'">
      <app-admin-page class="w-full h-full block"></app-admin-page>
    </ng-container>
    
    <ng-container *ngIf="activeView === 'admin-companies'">
      <app-admin-companies class="w-full h-full block"></app-admin-companies>
    </ng-container>

    <ng-container *ngIf="activeView === 'admin-fiscal-years'">
      <app-admin-fiscal-years class="w-full h-full block"></app-admin-fiscal-years>
    </ng-container>

    <ng-container *ngIf="activeView === 'admin-users'">
      <app-admin-users class="w-full h-full block"></app-admin-users>
    </ng-container>

    <ng-container *ngIf="activeView === 'admin-series'">
      <app-admin-series class="w-full h-full block"></app-admin-series>
    </ng-container>

    <!-- Purchase Forms -->
    <ng-container *ngIf="activeView === 'purchase-form'">
      <app-purchase-document-form class="w-full h-full block"></app-purchase-document-form>
    </ng-container>

    <!-- Accounting: Chart of Accounts -->
    <ng-container *ngIf="activeView === 'chart-of-accounts'">
      <app-chart-of-accounts class="w-full h-full block"></app-chart-of-accounts>
    </ng-container>

    <!-- Accounting: Journal Entries -->
    <ng-container *ngIf="activeView === 'journal-entries'">
      <app-journal-entries class="w-full h-full block"></app-journal-entries>
    </ng-container>

    <!-- Accounting: Journal Entries Review -->
    <ng-container *ngIf="activeView === 'journal-entries-review'">
      <app-journal-entries-review class="w-full h-full block"></app-journal-entries-review>
    </ng-container>

    <!-- Accounting: Journals (Diários) -->
    <ng-container *ngIf="activeView === 'diaries'">
      <app-journals class="w-full h-full block"></app-journals>
    </ng-container>

    <!-- Accounting: Trial Balance -->
    <ng-container *ngIf="activeView === 'trial-balance'">
      <app-trial-balance class="w-full h-full block"></app-trial-balance>
    </ng-container>

    <!-- Accounting: Financial Statements -->
    <ng-container *ngIf="activeView === 'financial-statements'">
      <app-financial-statements class="w-full h-full block"></app-financial-statements>
    </ng-container>

    <!-- Accounting: Other features (placeholder) -->
    <ng-container *ngIf="['cost-centers', 'vat', 'period-close', 'exploration', 'utilities'].includes(activeView)">
      <app-accounting-placeholder class="w-full h-full block"></app-accounting-placeholder>
    </ng-container>

    <!-- Inventory: Article Management -->
    <ng-container *ngIf="activeView === 'article-management'">
      <app-article-management class="w-full h-full block"></app-article-management>
    </ng-container>

    <!-- Inventory: Stock Movements -->
    <ng-container *ngIf="activeView === 'stock-movements'">
      <app-stock-movements class="w-full h-full block"></app-stock-movements>
    </ng-container>

    <!-- Treasury: Management -->
    <ng-container *ngIf="activeView === 'treasury-management'">
      <app-treasury-management class="w-full h-full block"></app-treasury-management>
    </ng-container>

    <!-- Inventory: Warehouse Management -->
    <ng-container *ngIf="activeView === 'warehouse-management'">
      <app-warehouse-management class="w-full h-full block"></app-warehouse-management>
    </ng-container>

    <!-- Inventory: Unit Management -->
    <ng-container *ngIf="activeView === 'unit-management'">
      <app-unit-management class="w-full h-full block"></app-unit-management>
    </ng-container>

    <!-- Inventory: Inventory Count -->
    <ng-container *ngIf="activeView === 'inventory-count'">
      <app-inventory-count class="w-full h-full block"></app-inventory-count>
    </ng-container>

    <!-- Inventory: Stock Exploration -->
    <ng-container *ngIf="activeView === 'stock-exploration'">
      <app-stock-exploration class="w-full h-full block"></app-stock-exploration>
    </ng-container>

    <!-- Inventory: Batch Management -->
    <ng-container *ngIf="activeView === 'batch-management'">
      <app-batch-management class="w-full h-full block"></app-batch-management>
    </ng-container>

    <!-- Inventory: Inventory Report -->
    <ng-container *ngIf="activeView === 'inventory-report'">
      <app-inventory-report class="w-full h-full block"></app-inventory-report>
    </ng-container>

    <!-- Inventory: Article Statement -->
    <ng-container *ngIf="activeView === 'article-statement'">
      <app-article-statement class="w-full h-full block"></app-article-statement>
    </ng-container>

    <!-- Inventory: Stock Movements Report -->
    <ng-container *ngIf="activeView === 'stock-movements-report'">
      <app-stock-movements-report class="w-full h-full block"></app-stock-movements-report>
    </ng-container>

    <!-- Inventory: Consumption Report -->
    <ng-container *ngIf="activeView === 'consumption-report'">
      <app-consumption-report class="w-full h-full block"></app-consumption-report>
    </ng-container>

    <!-- Inventory: Stock Control Report -->
    <ng-container *ngIf="activeView === 'stock-control-report'">
      <app-stock-control-report class="w-full h-full block"></app-stock-control-report>
    </ng-container>

    <!-- Inventory: Stock Document Types -->
    <ng-container *ngIf="activeView === 'stock-document-types'">
      <app-stock-document-types class="w-full h-full block"></app-stock-document-types>
    </ng-container>

    <!-- Document Types (Sales/Purchases) -->
    <ng-container *ngIf="activeView === 'document-types'">
      <app-document-types class="w-full h-full block"></app-document-types>
    </ng-container>

    <!-- Admin Tools -->
    <ng-container *ngIf="activeView === 'admin-tools'">
      <app-admin-tools class="w-full h-full block"></app-admin-tools>
    </ng-container>

    <!-- Default Dashboard -->
    <ng-container *ngIf="!isKnownView()">
      <main 
          class="flex-1 bg-[#F0F0F0] relative overflow-hidden"
          [style.background-image]="getBackgroundImage()"
          style="background-size: cover; background-position: center; background-repeat: no-repeat;"
      >
        <div class="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
        
        <div class="relative z-10 flex flex-col items-center justify-center h-full text-gray-800 p-8">
          <div class="bg-white/80 p-8 rounded-2xl shadow-xl backdrop-blur-md max-w-2xl w-full text-center border border-white/50">
            <div class="mb-6">
              <span class="material-symbols-outlined text-[64px] text-blue-600">dashboard</span>
            </div>
            <h1 class="text-3xl font-bold mb-2 text-gray-900">Bem-vindo ao Inverno ERP</h1>
            <p class="text-lg text-gray-600 mb-8">Selecione uma opção no menu lateral para começar.</p>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div class="p-4 bg-blue-50 rounded-xl border border-blue-100 hover:shadow-md transition-shadow cursor-pointer group" (click)="activeView = 'sales-form'">
                <div class="flex items-center gap-3 mb-2">
                  <span class="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-outlined">point_of_sale</span>
                  </span>
                  <h3 class="font-semibold text-gray-800">Vendas</h3>
                </div>
                <p class="text-sm text-gray-600">Criar faturas e encomendas</p>
              </div>

              <div class="p-4 bg-green-50 rounded-xl border border-green-100 hover:shadow-md transition-shadow cursor-pointer group" (click)="activeView = 'chart-of-accounts'">
                <div class="flex items-center gap-3 mb-2">
                  <span class="p-2 bg-green-100 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-outlined">account_balance</span>
                  </span>
                  <h3 class="font-semibold text-gray-800">Contabilidade</h3>
                </div>
                <p class="text-sm text-gray-600">Gerir plano de contas</p>
              </div>

              <div class="p-4 bg-purple-50 rounded-xl border border-purple-100 hover:shadow-md transition-shadow cursor-pointer group">
                <div class="flex items-center gap-3 mb-2">
                  <span class="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-outlined">inventory_2</span>
                  </span>
                  <h3 class="font-semibold text-gray-800">Inventário</h3>
                </div>
                <p class="text-sm text-gray-600">Gestão de stocks (Brevemente)</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </ng-container>
  `
})
export class MainContentComponent {
  @Input() activeView: string = 'dashboard';

  constructor(private sanitizer: DomSanitizer) { }

  isKnownView(): boolean {
    const knownViews = [
      'sales-form',
      'internal-docs',
      'purchase-form',
      'chart-of-accounts',
      'journal-entries',
      'journal-entries-review',
      'diaries',
      'trial-balance',
      'financial-statements',
      'cost-centers',
      'vat',
      'period-close',
      'exploration',
      'utilities',
      'admin-tools',
      'article-management',
      'stock-movements',
      'treasury-management',
      'warehouse-management',
      'unit-management',
      'inventory-count',
      'stock-exploration',
      'batch-management',
      'inventory-report',
      'article-statement',
      'stock-movements-report',
      'consumption-report',
      'stock-control-report',
      'stock-control-report',
      'stock-document-types',
      'document-types',
      'admin-page',
      'admin-companies',
      'admin-fiscal-years',
      'admin-users',
      'admin-users',
      'admin-series',
      'customer-management',
      'supplier-management'
    ];
    return knownViews.includes(this.activeView);
  }

  getBackgroundImage(): SafeStyle {
    // Using a high-quality abstract background from Unsplash
    const imageUrl = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920';
    return this.sanitizer.bypassSecurityTrustStyle(`url('${imageUrl}')`);
  }
}
