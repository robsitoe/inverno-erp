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
  styles: [`
    @media print {
      /* Hide all UI elements except the report */
      .no-print, .no-print * { display: none !important; }
      
      #report-area { 
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        overflow: visible !important;
        display: block !important;
      }

      /* Paper formatting for A4 */
      .Paper { 
        max-width: none !important; 
        width: 210mm !important; /* A4 width */
        margin: 0 auto !important;
        padding: 15mm !important; 
        border: none !important; 
        box-shadow: none !important;
        min-height: 0 !important;
        height: auto !important;
        display: block !important;
        border-radius: 0 !important;
      }

      /* Force background colors to print */
      body { 
        background: white !important;
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
      
      .bg-winter-blue { background-color: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; }
      .bg-gray-100 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
      .bg-blue-50 { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; }
      
      /* Force Text Colors */
      .text-green-700 { color: #15803d !important; -webkit-print-color-adjust: exact; }
      .text-red-700 { color: #b91c1c !important; -webkit-print-color-adjust: exact; }
      .text-blue-700 { color: #1d4ed8 !important; -webkit-print-color-adjust: exact; }
      .text-blue-900 { color: #1e3a8a !important; -webkit-print-color-adjust: exact; }
      
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

      /* Ensure table borders appear */
      table { border-collapse: collapse !important; width: 100% !important; }
      th, td { border-bottom: 1px solid #e5e7eb !important; }
    }

    /* Screen Preview Styling (Paper simulation) */
    .Paper {
      background: white;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      position: relative;
    }
  `],
  template: `
    <div class="flex h-full bg-[#f3f4f6]">
      <!-- Left Panel - Filters -->
      <div class="w-80 bg-white border-r border-gray-300 flex flex-col shrink-0 no-print">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-3 py-2.5 flex items-center gap-2 shrink-0 shadow">
          <span class="material-symbols-outlined text-[20px]">inventory</span>
          <h2 class="font-semibold text-sm">Controle de Inventário</h2>
        </div>

        <!-- Filters Form -->
        <div class="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          <!-- Artigos -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1 font-sans">Intervalo de Artigos</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2.5">
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">De:</label>
                <div class="flex gap-1">
                  <input [(ngModel)]="filters.articleFrom" class="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Início..." />
                  <button (click)="openArticleModal('from')" class="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all flex items-center shadow-sm">
                    <span class="material-symbols-outlined text-[16px]">search</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">Até:</label>
                <div class="flex gap-1">
                  <input [(ngModel)]="filters.articleTo" class="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Fim..." />
                  <button (click)="openArticleModal('to')" class="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all flex items-center shadow-sm">
                    <span class="material-symbols-outlined text-[16px]">search</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Filtros de Localização -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1 font-sans">Localização</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2.5">
                <div>
                    <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium font-sans">Armazém:</label>
                    <select [(ngModel)]="filters.warehouse" class="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm">
                        <option value="">Todos os Armazéns</option>
                        <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }} - {{ wh.name }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium font-sans">Data de Referência:</label>
                    <input type="date" [(ngModel)]="filters.date" class="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" />
                </div>
            </div>
          </div>

          <!-- Opções -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1 font-sans">Opções de Listagem</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2">
              <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" [(ngModel)]="filters.includeZeroStock" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span class="group-hover:text-blue-700 transition-colors">Incluir Stock a Zero</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" [(ngModel)]="filters.includeNegativeStock" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span class="group-hover:text-blue-700 transition-colors">Incluir Stock Negativo</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="border-t border-gray-300 p-2.5 space-y-2 shrink-0 bg-white no-print shadow-inner">
          <button (click)="generateReport()" class="w-full px-3 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
            <span class="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>GERAR INVENTÁRIO</span>
          </button>
          <button (click)="clearFilters()" class="w-full px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium rounded flex items-center justify-center gap-2 transition-all">
            <span class="material-symbols-outlined text-[16px]">refresh</span>
            <span>REPOR FILTROS</span>
          </button>
        </div>
      </div>

      <!-- Right Panel - Report Area -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Toolbar -->
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-300 bg-[#f3f4f6] shrink-0 no-print">
          <div class="flex items-center gap-1.5">
            <button (click)="print()" class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded shadow-sm transition-all active:scale-95">
              <span class="material-symbols-outlined text-[18px]">print</span>
              <span>IMPRIMIR</span>
            </button>
            <div class="w-px h-5 bg-gray-300 mx-2"></div>
            <button (click)="exportToExcel()" class="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white border border-gray-300 rounded transition-all text-gray-700 text-xs">
              <span class="material-symbols-outlined text-[18px] text-green-700">table_view</span>
              <span>Excel</span>
            </button>
          </div>
          <div class="text-[10px] font-bold text-blue-800 uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
             Relatório de Inventário Físico
          </div>
        </div>

        <div id="report-area" class="flex-1 overflow-auto bg-[#F0F0F0] p-8 scroll-smooth no-print-padding">

          <div *ngIf="reportGenerated" class="max-w-4xl mx-auto Paper p-10 min-h-[1120px] flex flex-col mb-10">
            <!-- Document Header -->
            <div class="border-b-2 border-WinterBlue pb-4 mb-6 flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-12 h-12 bg-WinterBlue rounded shrink-0 flex items-center justify-center text-white">
                            <span class="material-symbols-outlined text-[32px]">inventory</span>
                        </div>
                        <h1 class="text-2xl font-black text-WinterBlue uppercase tracking-tighter">{{ companyInfo?.name || 'INVERNO ERP' }}</h1>
                    </div>
                    <div class="text-[10px] text-gray-600 space-y-0.5 uppercase font-medium">
                        <p>{{ companyInfo?.address || '---' }}</p>
                        <p>{{ companyInfo?.city || '---' }} | NUIT: {{ companyInfo?.nif || '---' }}</p>
                        <p>TEL: {{ companyInfo?.phone || '---' }} | EMAIL: {{ companyInfo?.email || '---' }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <h2 class="text-xl font-black text-gray-900 uppercase">Inventário de Stocks</h2>
                    <p class="text-[10px] font-bold text-blue-700 uppercase tracking-widest mt-1">Reporte de Posicionamento</p>
                    <div class="mt-4 bg-gray-50 border border-gray-200 rounded p-2 text-right">
                        <p class="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Referência:</p>
                        <p class="text-xs font-black">{{ filters.date | date:'dd/MM/yyyy' }}</p>
                    </div>
                </div>
            </div>

            <!-- Report Body -->
            <div class="flex-1">
                <table class="w-full text-[10px] border-collapse">
                    <thead class="bg-gray-100 uppercase text-gray-700 font-bold tracking-tighter">
                      <tr>
                        <th class="px-3 py-2 text-left border-b-2 border-WinterBlue w-24">Artigo</th>
                        <th class="px-3 py-2 text-left border-b-2 border-WinterBlue">Descrição</th>
                        <th class="px-3 py-2 text-center border-b-2 border-WinterBlue w-16">UN</th>
                        <th class="px-3 py-2 text-right border-b-2 border-WinterBlue w-24">Qtd. Stock</th>
                        <th class="px-3 py-2 text-right border-b-2 border-WinterBlue w-24">P. Médio</th>
                        <th class="px-3 py-2 text-right border-b-2 border-WinterBlue w-28 bg-blue-50/50">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr *ngFor="let line of reportLines" class="hover:bg-blue-50/50 transition-colors">
                        <td class="px-3 py-2.5 font-bold text-WinterBlue">{{ line.articleCode }}</td>
                        <td class="px-3 py-2.5 text-gray-600 uppercase text-[9px] font-medium">{{ line.description }}</td>
                        <td class="px-3 py-2.5 text-center text-gray-500">{{ line.unit }}</td>
                        <td class="px-3 py-2.5 text-right font-black" [class.text-red-600]="line.quantity < 0">{{ line.quantity | number:'1.2-2' }}</td>
                        <td class="px-3 py-2.5 text-right text-gray-500">{{ line.unitCost | number:'1.2-2' }}</td>
                        <td class="px-3 py-2.5 text-right font-black text-blue-900 bg-blue-50/20">{{ line.totalValue | number:'1.2-2' }}</td>
                      </tr>
                      <tr *ngIf="reportLines.length === 0">
                        <td colspan="6" class="px-3 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                          Nenhum dado encontrado para os filtros selecionados
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="bg-gray-50 font-black border-t-2 border-gray-200">
                      <tr>
                        <td colspan="5" class="px-3 py-3 text-right uppercase tracking-tighter text-gray-500">Valor Total de Inventário:</td>
                        <td class="px-3 py-3 text-right text-blue-900 bg-blue-50 text-[11px]">{{ getTotalValue() | number:'1.2-2' }} MT</td>
                      </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Document Footer -->
            <div class="mt-auto pt-10 border-t-2 border-gray-900">
                <div class="flex justify-between items-end text-[9px] text-gray-500 font-bold uppercase tracking-tight">
                    <div>
                        <p>Processado por Computador © Inverno ERP</p>
                        <p class="mt-1">Emitido por: {{ currentUser }} | Data: {{ currentDate | date:'dd/MM/yyyy HH:mm:ss' }}</p>
                    </div>
                    <div class="text-right">
                        <p>Página 01 / 01</p>
                        <div class="mt-2 text-[8px] bg-gray-900 text-white px-2 py-0.5 rounded italic">Software de Gestão Certificado</div>
                    </div>
                </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!reportGenerated" class="flex flex-col items-center justify-center h-full text-gray-400">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
               <span class="material-symbols-outlined text-[32px] text-blue-500">description</span>
            </div>
            <p class="text-sm font-medium">Configure os filtros e clique em "Gerar Relatório"</p>
          </div>
        </div>

        <!-- App Footer (Status Bar) -->
        <div class="px-4 py-1.5 bg-[#1e3a8a] text-white shrink-0 text-[10px] flex justify-between items-center no-print">
          <div class="flex gap-4">
            <span class="opacity-80">Empresa: <span class="font-bold">{{ companyInfo?.name || 'INVERNO ERP' }}</span></span>
            <span class="opacity-80">Operador: <span class="font-bold">{{ currentUser }}</span></span>
          </div>
          <div class="font-bold">
            {{ reportLines.length }} Registos | Valor Total: {{ getTotalValue() | number:'1.2-2' }} MT
          </div>
        </div>
        </div> <!-- Right Panel -->

      <!-- Article Modal -->
      <app-article-list-modal
        *ngIf="showArticleModal"
        (close)="showArticleModal = false"
        (select)="onArticleSelect($event)">
      </app-article-list-modal>
    </div> <!-- Root div -->
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
  currentDate = new Date();
  companyInfo: any = null;
  currentUser: string = 'Utilizador';

  showArticleModal = false;
  activeArticleField: 'from' | 'to' = 'from';

  constructor(private inventoryService: InventoryService) { }

  ngOnInit() {
    // Load current user for footer
    const storedUser = localStorage.getItem('erp_current_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUser = user.username || user.name || 'Utilizador';
    }

    // Load company info for footer
    const storedCompany = localStorage.getItem('erp_company_info');
    if (storedCompany) {
      this.companyInfo = JSON.parse(storedCompany);
    }

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
          Number(line.quantity).toFixed(2),
          Number(line.unitCost).toFixed(2),
          Number(line.totalValue).toFixed(2)
        ].join(';')
      ),
      '',
      `Total Geral;;;;${Number(this.getTotalValue()).toFixed(2)}`
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
