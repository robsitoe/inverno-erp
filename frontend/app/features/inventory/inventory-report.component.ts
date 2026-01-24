import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';
import { ArticleListModalComponent } from '../../shared/components/article-list-modal.component';

interface InventoryReportFilters {
  articleFrom: string;
  articleTo: string;
  warehouse: string;
  includeZeroStock: boolean;
  includeNegativeStock: boolean;
  date: string;
  orderBy: 'CODE' | 'DESCRIPTION' | 'STOCK';
}

interface InventoryReportLine {
  articleCode: string;
  description: string;
  warehouse: string;
  location: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalValue: number;
}

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ArticleListModalComponent],
  template: `
    <div class="flex h-full bg-[#F0F0F0]">
      <!-- Left Panel - Filters -->
      <div class="w-80 bg-white border-r border-gray-300 flex flex-col shrink-0">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 flex items-center gap-2 shrink-0">
          <span class="material-symbols-outlined text-[20px]">inventory</span>
          <h2 class="font-semibold text-sm">Inventário</h2>
        </div>

        <!-- Filters Form -->
        <div class="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <!-- Artigos -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Artigos</div>
            <div class="p-2 space-y-2">
              <div>
                <label class="block text-gray-700 mb-1">De Artigo:</label>
                <div class="flex gap-1">
                  <input [(ngModel)]="filters.articleFrom" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
                  <button (click)="openArticleModal('from')" class="px-2 py-1 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded text-gray-600">
                    <span class="material-symbols-outlined text-[16px]">search</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-gray-700 mb-1">Até Artigo:</label>
                <div class="flex gap-1">
                  <input [(ngModel)]="filters.articleTo" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
                  <button (click)="openArticleModal('to')" class="px-2 py-1 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded text-gray-600">
                    <span class="material-symbols-outlined text-[16px]">search</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Armazéns -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Armazéns</div>
            <div class="p-2">
              <select [(ngModel)]="filters.warehouse" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500">
                <option value="">Todos</option>
                <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }} - {{ wh.name }}</option>
              </select>
            </div>
          </div>

          <!-- Opções -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Opções</div>
            <div class="p-2 space-y-1">
              <label class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="filters.includeZeroStock" class="rounded" />
                <span>Incluir Stock a Zero</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="filters.includeNegativeStock" class="rounded" />
                <span>Incluir Stock Negativo</span>
              </label>
            </div>
          </div>

          <!-- Data -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Data</div>
            <div class="p-2">
              <input type="date" [(ngModel)]="filters.date" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="border-t border-gray-300 p-2 space-y-2 shrink-0">
          <button (click)="generateReport()" class="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded flex items-center justify-center gap-2 transition-colors">
            <span class="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>Gerar Relatório</span>
          </button>
          <button (click)="clearFilters()" class="w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded flex items-center justify-center gap-2 transition-colors">
            <span class="material-symbols-outlined text-[18px]">refresh</span>
            <span>Limpar</span>
          </button>
        </div>
      </div>

      <!-- Right Panel - Report -->
      <div class="flex-1 flex flex-col bg-white">
        <!-- Toolbar -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-300 bg-[#F0F0F0] shrink-0">
          <div class="flex items-center gap-1">
            <button (click)="exportToPDF()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
              <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>PDF</span>
            </button>
            <button (click)="exportToExcel()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
              <span class="material-symbols-outlined text-[16px]">table_view</span>
              <span>Excel</span>
            </button>
            <div class="w-px h-4 bg-gray-300 mx-1"></div>
            <button (click)="print()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
              <span class="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimir</span>
            </button>
          </div>
          <div class="text-xs text-gray-600">
            {{ reportLines.length }} registos | Valor Total: {{ getTotalValue() | number:'1.2-2' }} MT
          </div>
        </div>

        <!-- Report Header -->
        <div *ngIf="reportGenerated" class="p-4 border-b border-gray-300 bg-gray-50 shrink-0">
          <h1 class="text-lg font-bold text-center text-gray-800">Inventário [Preço Custo Médio]</h1>
          <div class="flex justify-between text-xs text-gray-600 mt-2">
            <span>Data: {{ filters.date | date:'dd/MM/yyyy' }}</span>
            <span>Página 1 de 1</span>
          </div>
        </div>

        <!-- Report Table -->
        <div class="flex-1 overflow-auto">
          <table *ngIf="reportGenerated" class="w-full text-xs border-collapse">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="border border-gray-300 px-2 py-1 text-left font-semibold">Artigo</th>
                <th class="border border-gray-300 px-2 py-1 text-left font-semibold">Descrição</th>
                <th class="border border-gray-300 px-2 py-1 text-center font-semibold">Qtd. Stock (Un)</th>
                <th class="border border-gray-300 px-2 py-1 text-right font-semibold">Stock Atual (Un)</th>
                <th class="border border-gray-300 px-2 py-1 text-right font-semibold">Preço</th>
                <th class="border border-gray-300 px-2 py-1 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of reportLines" class="hover:bg-blue-50">
                <td class="border border-gray-300 px-2 py-1">{{ line.articleCode }}</td>
                <td class="border border-gray-300 px-2 py-1">{{ line.description }}</td>
                <td class="border border-gray-300 px-2 py-1 text-center">{{ line.unit }}</td>
                <td class="border border-gray-300 px-2 py-1 text-right">{{ line.quantity | number:'1.2-2' }}</td>
                <td class="border border-gray-300 px-2 py-1 text-right">{{ line.unitCost | number:'1.2-2' }}</td>
                <td class="border border-gray-300 px-2 py-1 text-right font-medium">{{ line.totalValue | number:'1.2-2' }}</td>
              </tr>
              <tr *ngIf="reportLines.length === 0">
                <td colspan="6" class="border border-gray-300 px-2 py-8 text-center text-gray-400 italic">
                  Nenhum dado disponível. Configure os filtros e clique em "Gerar Relatório".
                </td>
              </tr>
            </tbody>
            <tfoot *ngIf="reportLines.length > 0" class="bg-gray-100 font-semibold">
              <tr>
                <td colspan="5" class="border border-gray-300 px-2 py-1 text-right">Total Geral:</td>
                <td class="border border-gray-300 px-2 py-1 text-right">{{ getTotalValue() | number:'1.2-2' }}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Empty State -->
          <div *ngIf="!reportGenerated" class="flex flex-col items-center justify-center h-full text-gray-400">
            <span class="material-symbols-outlined text-[64px] mb-4">description</span>
            <p class="text-sm">Configure os filtros e clique em "Gerar Relatório"</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-3 py-1.5 bg-[#DCE4F2] border-t border-gray-300 shrink-0 text-xs text-gray-600">
          Total de Páginas: 1
        </div>
      </div>
    </div>

    <!-- Article Modal -->
    <app-article-list-modal
      *ngIf="showArticleModal"
      (close)="showArticleModal = false"
      (select)="onArticleSelect($event)">
    </app-article-list-modal>
  `
})
export class InventoryReportComponent implements OnInit {
  filters: InventoryReportFilters = {
    articleFrom: '',
    articleTo: '',
    warehouse: '',
    includeZeroStock: false,
    includeNegativeStock: false,
    date: new Date().toISOString().split('T')[0],
    orderBy: 'CODE'
  };

  warehouses: any[] = [];
  reportLines: InventoryReportLine[] = [];
  reportGenerated = false;

  showArticleModal = false;
  activeArticleField: 'from' | 'to' = 'from';

  constructor(private inventoryService: InventoryService) { }

  ngOnInit() {
    this.loadWarehouses();
  }

  loadWarehouses() {
    const stored = localStorage.getItem('erp_warehouses');
    if (stored) {
      this.warehouses = JSON.parse(stored);
    }
  }

  openArticleModal(field: 'from' | 'to') {
    this.activeArticleField = field;
    this.showArticleModal = true;
  }

  onArticleSelect(article: any) {
    if (this.activeArticleField === 'from') {
      this.filters.articleFrom = article.code;
    } else {
      this.filters.articleTo = article.code;
    }
    this.showArticleModal = false;
  }

  generateReport() {
    console.log('Generating report...');
    const articles = this.inventoryService.getArticles();
    console.log('Articles found:', articles.length);
    console.log('Filters:', this.filters);

    const reportDate = this.filters.date;

    this.reportLines = articles
      // .filter(a => a.stockControl) // Removed strict filter to ensure data shows up if user expects it
      .map(article => {
        const realStock = this.inventoryService.getStockBalanceAtDate(
          article.code,
          reportDate,
          this.filters.warehouse
        );

        // console.log(`Stock for ${article.code}: ${realStock}`); // Optional: detailed log

        return {
          articleCode: article.code,
          description: article.description,
          warehouse: this.filters.warehouse || 'Todos',
          location: '',
          quantity: realStock,
          unit: article.unit,
          unitCost: article.purchasePrice || 0,
          totalValue: realStock * (article.purchasePrice || 0)
        };
      })
      .filter(line => {
        // Filter by article range
        if (this.filters.articleFrom && line.articleCode < this.filters.articleFrom) return false;
        if (this.filters.articleTo && line.articleCode > this.filters.articleTo) return false;

        // Filter by stock options
        if (!this.filters.includeZeroStock && line.quantity === 0) return false;
        if (!this.filters.includeNegativeStock && line.quantity < 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (this.filters.orderBy === 'CODE') return a.articleCode.localeCompare(b.articleCode);
        if (this.filters.orderBy === 'DESCRIPTION') return a.description.localeCompare(b.description);
        return b.quantity - a.quantity;
      });

    console.log('Report lines generated:', this.reportLines.length);
    this.reportGenerated = true;
  }



  clearFilters() {
    this.filters = {
      articleFrom: '',
      articleTo: '',
      warehouse: '',
      includeZeroStock: false,
      includeNegativeStock: false,
      date: new Date().toISOString().split('T')[0],
      orderBy: 'CODE'
    };
    this.reportLines = [];
    this.reportGenerated = false;
  }

  getTotalValue(): number {
    return this.reportLines.reduce((sum, line) => sum + line.totalValue, 0);
  }

  exportToPDF() {
    alert('Exportação para PDF será implementada em breve.');
  }

  exportToExcel() {
    const headers = ['Artigo', 'Descrição', 'Qtd. Stock (Un)', 'Stock Atual (Un)', 'Preço', 'Valor'];
    const csvContent = [
      headers.join(';'),
      ...this.reportLines.map(line =>
        [
          line.articleCode,
          line.description,
          line.unit,
          line.quantity.toFixed(2),
          line.unitCost.toFixed(2),
          line.totalValue.toFixed(2)
        ].join(';')
      ),
      '',
      `Total Geral;;;;${this.getTotalValue().toFixed(2)}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_${this.filters.date}.csv`;
    link.click();
  }

  print() {
    window.print();
  }
}
