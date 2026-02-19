import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';
import { Article } from '../../shared/models';
import { Subscription } from 'rxjs';
import { DataService } from '../../services/data.service';

import { AppIconComponent } from '../../shared/components/app-icon.component';
import { IVA_RATES } from '../../shared/constants';

@Component({
  selector: 'app-article-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="newArticle()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <app-icon name="add_circle" [size]="18"></app-icon>
          <span>Novo</span>
        </button>
        <button (click)="saveArticle()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <app-icon name="save" [size]="18"></app-icon>
          <span>Gravar</span>
        </button>
        <button (click)="deleteArticle()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs text-red-600">
          <app-icon name="delete" [size]="18"></app-icon>
          <span>Eliminar</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <app-icon name="search" [size]="18"></app-icon>
          <span>Procurar</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <app-icon name="print" [size]="18"></app-icon>
          <span>Imprimir</span>
        </button>
      </div>

      <!-- Main Content -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Article List (Left Panel) -->
        <div class="w-80 border-r border-gray-300 bg-white flex flex-col">
          <!-- Search -->
          <div class="p-2 border-b border-gray-200">
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              (ngModelChange)="filterArticles()"
              placeholder="Procurar artigo..."
              class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <!-- List -->
          <div class="flex-1 overflow-auto">
            <div 
              *ngFor="let article of filteredArticles"
              (click)="selectArticle(article)"
              [class.bg-blue-50]="selectedArticle?.id === article.id"
              [class.border-l-4]="selectedArticle?.id === article.id"
              [class.border-l-blue-600]="selectedArticle?.id === article.id"
              class="p-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div class="font-medium text-xs text-gray-800">{{ article.code }}</div>
              <div class="text-xs text-gray-600 truncate">{{ article.name }}</div>
              <div class="text-xs text-gray-500 mt-1">Stock: {{ article.currentStock }} {{ article.unit }}</div>
            </div>
          </div>
        </div>

        <!-- Article Details (Right Panel) -->
        <div class="flex-1 overflow-auto p-4 bg-[#F0F0F0]">
          <div *ngIf="selectedArticle" class="max-w-4xl">
            <!-- Tabs -->
            <div class="flex border-b border-gray-300 mb-4">
              <button 
                *ngFor="let tab of tabs; let i = index"
                (click)="activeTab = i"
                [class.bg-white]="activeTab === i"
                [class.border-t-2]="activeTab === i"
                [class.border-t-blue-600]="activeTab === i"
                [class.bg-gray-100]="activeTab !== i"
                class="px-4 py-2 text-xs font-medium border-r border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {{ tab }}
              </button>
            </div>

            <!-- Tab Content: Geral -->
            <div *ngIf="activeTab === 0" class="bg-white p-4 rounded shadow-sm space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <!-- Código -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Código *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedArticle.code"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Nome -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedArticle.name"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Descrição -->
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea 
                    [(ngModel)]="selectedArticle.description"
                    rows="2"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  ></textarea>
                </div>

                <!-- Unidade -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Unidade</label>
                  <select 
                    [(ngModel)]="selectedArticle.unit"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="UN">Unidade</option>
                    <option value="KG">Quilograma</option>
                    <option value="L">Litro</option>
                    <option value="M">Metro</option>
                    <option value="M2">Metro Quadrado</option>
                    <option value="M3">Metro Cúbico</option>
                  </select>
                </div>

                <!-- Família -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Família</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedArticle.familyId"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Preço de Compra -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Preço de Compra</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedArticle.purchasePrice"
                    step="0.01"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Preço de Venda -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Preço de Venda</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedArticle.salePrice"
                    step="0.01"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Taxa IVA -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Taxa IVA (%)</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedArticle.ivaRate"
                    step="0.1"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Código IVA -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Código IVA</label>
                  <select 
                    [(ngModel)]="selectedArticle.ivaCode"
                    (ngModelChange)="onVatCodeChange($event)"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option *ngFor="let vat of vatRates" [value]="vat.code">
                      {{ vat.code }} - {{ vat.description }} ({{ vat.rate }}%)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Tab Content: Stock -->
            <div *ngIf="activeTab === 1" class="bg-white p-4 rounded shadow-sm space-y-4">
              <div class="grid grid-cols-3 gap-4">
                <!-- Controlo de Stock -->
                <div class="col-span-3">
                  <label class="flex items-center gap-2 text-xs">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="selectedArticle.stockControl"
                      class="rounded"
                    />
                    <span class="font-medium text-gray-700">Controlo de Stock Ativo</span>
                  </label>
                </div>

                <!-- Stock Atual -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Stock Atual</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedArticle.currentStock"
                    [disabled]="true"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right bg-gray-50"
                  />
                </div>

                <!-- Stock Mínimo -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedArticle.minStock"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Stock Máximo -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Stock Máximo</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedArticle.maxStock"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <!-- Stock Alert -->
              <div *ngIf="selectedArticle.currentStock < selectedArticle.minStock" class="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <div class="flex items-center">
                  <app-icon name="warning" [size]="20" color="#ca8a04" class="mr-2"></app-icon>
                  <span class="text-xs text-yellow-700">
                    <strong>Atenção:</strong> Stock abaixo do mínimo! (Atual: {{ selectedArticle.currentStock }}, Mínimo: {{ selectedArticle.minStock }})
                  </span>
                </div>
              </div>
            </div>

            <!-- Tab Content: Contabilidade -->
            <div *ngIf="activeTab === 2" class="bg-white p-4 rounded shadow-sm space-y-4">
              <div class="grid grid-cols-1 gap-4">
                <!-- Conta de Receita -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Conta de Receita (Vendas)</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedArticle.revenueAccountId"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Conta de COGS -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Conta de Custo (COGS)</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedArticle.cogsAccountId"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Conta de Inventário -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Conta de Inventário (Stock)</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedArticle.inventoryAccountId"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!selectedArticle" class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <app-icon name="inventory_2" [size]="64" class="mb-2 opacity-20"></app-icon>
              <p class="text-sm">Selecione um artigo para ver os detalhes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ArticleManagementComponent implements OnInit, OnDestroy {
  articles: Article[] = [];
  filteredArticles: Article[] = [];
  selectedArticle: Article | null = null;
  searchTerm = '';
  activeTab = 0;
  tabs = ['Geral', 'Stock', 'Contabilidade'];
  vatRates: any[] = [];

  private subscription = new Subscription();

  constructor(
    private inventoryService: InventoryService,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.loadArticles();
    this.loadVatRates();
    this.subscription.add(
      this.inventoryService.articlesUpdated$.subscribe(() => {
        this.loadArticles();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadArticles() {
    this.articles = this.inventoryService.getArticles();
    this.filterArticles();
  }

  loadVatRates() {
    const activeCompany = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    this.dataService.getTaxes(activeCompany.id).subscribe({
      next: (taxes) => {
        this.vatRates = taxes;
        // If no taxes found, maybe offer to seed? 
        // For now, if empty, we might still want to see the constants as fallback or just empty.
        if (this.vatRates.length === 0) {
          this.vatRates = IVA_RATES;
        }
      },
      error: (err) => console.error('Error loading VAT rates:', err)
    });
  }

  filterArticles() {
    if (!this.searchTerm) {
      this.filteredArticles = [...this.articles];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredArticles = this.articles.filter(a =>
      (a.code || '').toLowerCase().includes(term) ||
      (a.name || '').toLowerCase().includes(term) ||
      (a.description || '').toLowerCase().includes(term)
    );
  }

  selectArticle(article: Article) {
    this.selectedArticle = { ...article };
    this.activeTab = 0;
  }

  onVatCodeChange(code: string) {
    if (!this.selectedArticle) return;
    const vat = this.vatRates.find(v => v.code === code);
    if (vat) {
      this.selectedArticle.ivaRate = vat.rate;
    }
  }

  newArticle() {
    const activeCompany = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    this.selectedArticle = {
      id: `ART${Date.now()}`,
      companyId: activeCompany.id,
      code: '',
      name: '',
      description: '',
      familyId: '',
      unit: 'UN',
      purchasePrice: 0,
      salePrice: 0,
      ivaRate: 16,
      ivaCode: '16',
      stockControl: true,
      currentStock: 0,
      minStock: 0,
      maxStock: 100,
      revenueAccountId: '71',
      cogsAccountId: '61',
      inventoryAccountId: '31',
      isActive: true
    };
    this.activeTab = 0;
  }

  saveArticle() {
    if (!this.selectedArticle) return;

    // Ensure companyId is set
    if (!this.selectedArticle.companyId) {
      const activeCompany = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
      this.selectedArticle.companyId = activeCompany.id;
    }

    if (!this.selectedArticle.code || !this.selectedArticle.name) {
      alert('Por favor preencha o código e nome do artigo');
      return;
    }

    this.dataService.saveArticle(this.selectedArticle).subscribe({
      next: (savedArticle) => {
        alert(`Artigo ${savedArticle.code} gravado com sucesso!`);

        // Update selected article with server response
        this.selectedArticle = { ...savedArticle };

        // Find if it's a new or existing article
        const index = this.articles.findIndex(a => a.id === savedArticle.id || (a.id.startsWith('ART') && a.code === savedArticle.code));

        if (index === -1) {
          this.inventoryService.addArticle(savedArticle);
        } else {
          this.inventoryService.updateArticle(savedArticle);
        }

        this.loadArticles();
      },
      error: (err) => {
        console.error('Error saving article:', err);
        alert('Erro ao gravar artigo: ' + (err.error?.message || err.message || 'Verifique a consola.'));
      }
    });
  }

  deleteArticle() {
    if (!this.selectedArticle) return;

    if (confirm(`Tem certeza que deseja eliminar o artigo ${this.selectedArticle.code}?`)) {
      const code = this.selectedArticle.code;
      this.inventoryService.deleteArticle(this.selectedArticle.id);
      this.selectedArticle = null;
      alert(`Artigo ${code} eliminado com sucesso!`);
    }
  }
}
