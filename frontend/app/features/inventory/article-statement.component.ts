import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';
import { ArticleSearchModalComponent } from './article-search-modal.component';
import { Article } from '../../shared/models';
import { DataService } from '../../services/data.service';

interface ArticleStatementFilters {
  articleCode: string;
  articleName: string;
  dateFrom: string;
  dateTo: string;
  warehouse: string;
  location: string;
  documentType: string;
  showOnlyWithMovements: boolean;
  groupByArticle: boolean;
  includeDetails: boolean;
}

interface ArticleMovement {
  date: string;
  documentType: string;
  documentNumber: string;
  documentId?: string;
  description: string;
  warehouse: string;
  location: string;
  batch: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitCost: number;
  totalValue: number;
}

interface ArticleStatement {
  articleCode: string;
  articleName: string;
  unit: string;
  initialBalance: number;
  initialValue: number;
  movements: ArticleMovement[];
  totalIn: number;
  totalOut: number;
  finalBalance: number;
  finalValue: number;
}

@Component({
  selector: 'app-article-statement',
  standalone: true,
  imports: [CommonModule, FormsModule, ArticleSearchModalComponent],
  styles: [`
    @media print {
      /* Hide all UI elements except the statement */
      .no-print, .no-print * { display: none !important; }
      
      #statement-area { 
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
          <span class="material-symbols-outlined text-[20px]">history</span>
          <h2 class="font-semibold text-sm">Extrato de Artigos</h2>
        </div>

        <!-- Filters Form -->
        <div class="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          <!-- Período -->
          <div class="">
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Período de Análise</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2.5">
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">De:</label>
                <input type="date" [(ngModel)]="filters.dateFrom" class="w-full px-2 py-1.5 border border-gray-300 rounded leading-none focus:outline-none focus:border-blue-500 transition-all shadow-sm" />
              </div>
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">Até:</label>
                <input type="date" [(ngModel)]="filters.dateTo" class="w-full px-2 py-1.5 border border-gray-300 rounded leading-none focus:outline-none focus:border-blue-500 transition-all shadow-sm" />
              </div>
            </div>
          </div>

          <!-- Artigo -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Filtro de Artigo</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2.5">
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">Artigo:</label>
                <div class="flex gap-1">
                  <input [(ngModel)]="filters.articleCode" 
                         (keyup.enter)="generateStatement()"
                         class="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" 
                         placeholder="Ex: ART001" />
                  <button (click)="openArticleSearch()" 
                          class="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all flex items-center shadow-sm"
                          title="Procurar artigo (F4)">
                    <span class="material-symbols-outlined text-[16px]">manage_search</span>
                  </button>
                </div>
              </div>
              <div>
                <input [(ngModel)]="filters.articleName" 
                       readonly
                       class="w-full px-2 py-1.5 border border-gray-300 bg-white text-gray-500 rounded text-[10px]" 
                       placeholder="Selecione um artigo..." />
              </div>
            </div>
          </div>

          <!-- Armazém -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Localização</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
              <select [(ngModel)]="filters.warehouse" class="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm">
                <option value="">Todos os Armazéns</option>
                <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }} - {{ wh.name }}</option>
              </select>
            </div>
          </div>

          <!-- Opções -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Opções de Visualização</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2">
              <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" [(ngModel)]="filters.showOnlyWithMovements" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span class="group-hover:text-blue-700 transition-colors">Omitir sem Movimentos</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="border-t border-gray-300 p-2.5 space-y-2 shrink-0 bg-white no-print">
          <button (click)="generateStatement()" class="w-full px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
            <span class="material-symbols-outlined text-[18px]">analytics</span>
            <span>GERAR EXTRATO</span>
          </button>
          <button (click)="clearFilters()" class="w-full px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium rounded flex items-center justify-center gap-2 transition-all">
            <span class="material-symbols-outlined text-[16px]">history_query</span>
            <span>REPOR FILTROS</span>
          </button>
        </div>
      </div>

      <!-- Right Panel - Statement -->
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
             Relatório de Movimentação de Inventário
          </div>
        </div>

        <!-- Statement Content Area -->
        <div id="statement-area" class="flex-1 overflow-auto bg-[#F0F0F0] p-8 scroll-smooth no-print-padding">
          <div *ngIf="!statementGenerated" class="flex flex-col items-center justify-center h-full text-gray-400">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
               <span class="material-symbols-outlined text-[32px] text-blue-500">list_alt</span>
            </div>
            <p class="text-sm font-medium">Configure os filtros e clique em "Gerar Extrato"</p>
          </div>

          <div *ngIf="statementGenerated" class="max-w-4xl mx-auto Paper p-10 min-h-[1120px] flex flex-col mb-10">
            <!-- Document Header -->
            <div class="border-b-2 border-WinterBlue pb-4 mb-6 flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-12 h-12 bg-WinterBlue rounded shrink-0 flex items-center justify-center text-white">
                            <span class="material-symbols-outlined text-[32px]">inventory_2</span>
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
                    <h2 class="text-xl font-black text-gray-900 uppercase">Extrato de Movimentação</h2>
                    <p class="text-[10px] font-bold text-blue-700 uppercase tracking-widest mt-1">Inventário e Stocks</p>
                    <div class="mt-4 bg-gray-50 border border-gray-200 rounded p-2 text-right">
                        <p class="text-[9px] text-gray-500 font-bold uppercase">Período:</p>
                        <p class="text-xs font-black">{{ filters.dateFrom | date:'dd/MM/yyyy' }} a {{ filters.dateTo | date:'dd/MM/yyyy' }}</p>
                    </div>
                </div>
            </div>

            <!-- Report Body -->
            <div class="flex-1">
                <div *ngFor="let statement of statements" class="mb-10 break-inside-avoid">
                  <!-- Article Section Header -->
                  <div class="bg-winter-blue text-white px-4 py-2 flex justify-between items-center rounded-t shadow-sm">
                    <div>
                      <h3 class="font-black text-sm uppercase tracking-tight">{{ statement.articleCode }} - {{ statement.articleName }}</h3>
                      <p class="text-[9px] opacity-80 font-bold uppercase lucinda">Unidade de Medida: {{ statement.unit }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-[9px] opacity-80 uppercase font-bold">Saldo Inicial:</p>
                      <p class="text-sm font-black">{{ statement.initialBalance | number:'1.2-2' }}</p>
                    </div>
                  </div>

                  <!-- Movements Table -->
                  <table class="w-full text-[10px] border-collapse">
                    <thead class="bg-gray-100 uppercase text-gray-700 font-bold tracking-tighter">
                      <tr>
                        <th class="px-3 py-2 text-left border-b-2 border-gray-300 w-20">Data</th>
                        <th class="px-3 py-2 text-left border-b-2 border-gray-300 w-16">Tipo</th>
                        <th class="px-3 py-2 text-left border-b-2 border-gray-300 w-24">Nº Doc.</th>
                        <th class="px-3 py-2 text-left border-b-2 border-gray-300">Descrição</th>
                        <th class="px-3 py-2 text-right border-b-2 border-gray-300 w-20">Entrada</th>
                        <th class="px-3 py-2 text-right border-b-2 border-gray-300 w-20">Saída</th>
                        <th class="px-3 py-2 text-right border-b-2 border-gray-300 w-20 bg-blue-50">Saldo</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr *ngFor="let mov of statement.movements" class="hover:bg-blue-50/50 transition-colors">
                        <td class="px-3 py-2.5 font-medium whitespace-nowrap">{{ mov.date | date:'dd/MM/yyyy' }}</td>
                        <td class="px-3 py-2.5 uppercase font-bold text-[9px] text-gray-500">{{ mov.documentType }}</td>
                        <td class="px-3 py-2.5 font-black text-blue-700">{{ mov.documentNumber }}</td>
                        <td class="px-3 py-2.5 text-gray-600 lowercase first-letter:uppercase">{{ mov.description }}</td>
                        <td class="px-3 py-2.5 text-right font-bold text-green-700">
                          {{ mov.quantityIn > 0 ? (mov.quantityIn | number:'1.2-2') : '---' }}
                        </td>
                        <td class="px-3 py-2.5 text-right font-bold text-red-700">
                          {{ mov.quantityOut > 0 ? (mov.quantityOut | number:'1.2-2') : '---' }}
                        </td>
                        <td class="px-3 py-2.5 text-right font-black text-blue-900 bg-blue-50/30">
                          {{ mov.balance | number:'1.2-2' }}
                        </td>
                      </tr>
                      <tr *ngIf="statement.movements.length === 0">
                        <td colspan="7" class="px-3 py-8 text-center text-gray-400 italic font-medium uppercase text-[9px] tracking-widest bg-gray-50/50">
                          Sem movimentações registadas no período consultado
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="bg-gray-50 font-black border-t-2 border-gray-200">
                      <tr>
                        <td colspan="4" class="px-3 py-3 text-right uppercase tracking-tighter text-gray-500">Totais do Período:</td>
                        <td class="px-3 py-3 text-right text-green-700 border-r border-gray-200">{{ statement.totalIn | number:'1.2-2' }}</td>
                        <td class="px-3 py-3 text-right text-red-700 border-r border-gray-200">{{ statement.totalOut | number:'1.2-2' }}</td>
                        <td class="px-3 py-3 text-right text-blue-900 bg-blue-50">{{ statement.finalBalance | number:'1.2-2' }}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div *ngIf="statements.length === 0" class="text-center py-20 text-gray-400 uppercase tracking-widest text-xs font-bold bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  Nenhum artigo encontrado com os filtros selecionados
                </div>
            </div>

            <!-- Document Footer -->
            <div class="mt-auto pt-10 border-t-2 border-gray-900">
                <div class="flex justify-between items-end text-[9px] text-gray-500 font-bold uppercase tracking-tight">
                    <div>
                        <p>Processado por Computador © Inverno ERP</p>
                        <p class="mt-1">Emitido por: {{ currentUser || 'Utilizador' }} | Data: {{ currentDate | date:'dd/MM/yyyy HH:mm:ss' }}</p>
                    </div>
                    <div class="text-right">
                        <p>Página 01 / 01</p>
                        <div class="mt-2 text-[8px] bg-gray-900 text-white px-2 py-0.5 rounded italic">Software de Gestão Certificado</div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <!-- App Footer (Status Bar) -->
        <div class="px-4 py-1.5 bg-[#1e3a8a] text-white shrink-0 text-[10px] flex justify-between items-center no-print">
          <div class="flex gap-4">
            <span class="opacity-80">Empresa: <span class="font-bold">{{ companyInfo?.name || 'INVERNO ERP' }}</span></span>
            <span class="opacity-80">Operador: <span class="font-bold">{{ currentUser || 'Utilizador' }}</span></span>
          </div>
          <div class="font-bold">
            {{ statements.length }} Artigos | {{ getTotalMovements() }} Movimentos
          </div>
        </div>
      </div> <!-- Right Panel -->
      
      <!-- Article Search Modal -->
      <app-article-search-modal
        [isOpen]="isArticleSearchOpen"
        (close)="isArticleSearchOpen = false"
        (select)="onArticleSelect($event)"
      ></app-article-search-modal>
    </div> <!-- Root div -->
  `
})
export class ArticleStatementComponent implements OnInit {
  @Output() navigateToDocument = new EventEmitter<string>();

  filters: ArticleStatementFilters = {
    articleCode: '',
    articleName: '',
    dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    warehouse: '',
    location: '',
    documentType: '',
    showOnlyWithMovements: true,
    groupByArticle: true,
    includeDetails: true
  };

  warehouses: any[] = [];
  statements: ArticleStatement[] = [];
  statementGenerated = false;
  currentDate = new Date();
  isArticleSearchOpen = false;
  companyInfo: any = null;
  currentUser: string = 'Utilizador';

  documentTypes: any[] = [];

  constructor(
    private inventoryService: InventoryService,
    private dataService: DataService
  ) { }

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
    this.loadDocumentTypes();
  }

  async loadDocumentTypes() {
    try {
      if (this.dataService.isLocalBrowser()) {
        const stockTypes = JSON.parse(localStorage.getItem('erp_stock_document_types') || '[]');
        const salesTypes = JSON.parse(localStorage.getItem('erp_sales_document_types') || '[]');
        const purchaseTypes = JSON.parse(localStorage.getItem('erp_purchase_document_types') || '[]');
        this.setDocTypes(stockTypes, salesTypes, purchaseTypes);
      } else {
        // Parallel load from DataService
        const [stockTypes, salesTypes, purchaseTypes] = await Promise.all([
          this.dataService.getDocumentTypes('STOCK').toPromise(),
          this.dataService.getDocumentTypes('SALES').toPromise(),
          this.dataService.getDocumentTypes('PURCHASES').toPromise()
        ]);
        this.setDocTypes(stockTypes || [], salesTypes || [], purchaseTypes || []);
      }
    } catch (error) {
      console.error('Error loading document types', error);
    }
  }

  private setDocTypes(stockTypes: any[], salesTypes: any[], purchaseTypes: any[]) {
    this.documentTypes = [
      {
        group: 'Stock',
        types: stockTypes.map((t: any) => ({ code: t.code, name: t.description || t.name }))
      },
      {
        group: 'Vendas',
        types: salesTypes.map((t: any) => ({ code: t.code, name: t.description || t.name }))
      },
      {
        group: 'Compras',
        types: purchaseTypes.map((t: any) => ({ code: t.code, name: t.description || t.name }))
      }
    ];
  }


  loadWarehouses() {
    const stored = localStorage.getItem('erp_warehouses');
    if (stored) {
      this.warehouses = JSON.parse(stored);
    }
  }

  generateStatement() {
    const articles = this.inventoryService.getArticles();
    console.log('[ArticleStatement] Total articles loaded:', articles.length);

    // Filter articles
    let filteredArticles = articles.filter(a => a.stockControl);

    if (this.filters.articleCode) {
      filteredArticles = filteredArticles.filter(a =>
        a.code?.toLowerCase().includes(this.filters.articleCode.toLowerCase())
      );
    }

    if (this.filters.articleName) {
      filteredArticles = filteredArticles.filter(a =>
        (a.name || a.description || '').toLowerCase().includes(this.filters.articleName.toLowerCase())
      );
    }

    // Generate statements for each article
    this.statements = filteredArticles.map(article => {
      console.log('[ArticleStatement] Processing article:', article.code);

      // 1. Get ALL movements for this article, regardless of date
      const allMovements = this.getAllMovementsForArticle(article);
      console.log('[ArticleStatement] Total movements for', article.code, ':', allMovements.length);

      // 2. Sort by date
      allMovements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 3. Calculate Initial Balance (movements before dateFrom)
      const startDate = new Date(this.filters.dateFrom);
      const endDate = new Date(this.filters.dateTo);

      // Reset hours for pure date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      let initialBalance = 0;
      let initialValue = 0;

      // Split movements into "Before" and "During"
      const periodMovements: ArticleMovement[] = [];

      for (const mov of allMovements) {
        const movDate = new Date(mov.date);
        movDate.setHours(12, 0, 0, 0); // Normalize to noon to avoid day shifts

        if (movDate < startDate) {
          initialBalance += mov.quantityIn - mov.quantityOut;
          initialValue += (mov.quantityIn - mov.quantityOut) * (mov.unitCost || 0);
        } else if (movDate <= endDate) {
          periodMovements.push(mov);
        }
      }

      console.log('[ArticleStatement] Period movements for', article.code, ':', periodMovements.length);

      // 4. Calculate Running Balance for period movements
      let runningBalance = initialBalance;
      periodMovements.forEach(mov => {
        runningBalance += mov.quantityIn - mov.quantityOut;
        mov.balance = runningBalance;
        mov.totalValue = runningBalance * (mov.unitCost || 0);
      });

      // Calculate totals for the period
      const totalIn = periodMovements.reduce((sum, m) => sum + m.quantityIn, 0);
      const totalOut = periodMovements.reduce((sum, m) => sum + m.quantityOut, 0);
      const finalBalance = initialBalance + totalIn - totalOut;

      return {
        articleCode: article.code,
        articleName: article.name || article.description || 'S/ Descrição',
        unit: article.unit,
        initialBalance: initialBalance,
        initialValue: initialValue,
        movements: periodMovements,
        totalIn: totalIn,
        totalOut: totalOut,
        finalBalance: finalBalance,
        finalValue: finalBalance * (article.purchasePrice || 0)
      };
    }).filter(s => !this.filters.showOnlyWithMovements || s.movements.length > 0 || s.initialBalance !== 0);

    console.log('[ArticleStatement] Final statements count:', this.statements.length);
    this.statementGenerated = true;
  }

  getAllMovementsForArticle(article: any): ArticleMovement[] {
    console.log('[ArticleStatement] Fetching movements for article:', article.code, 'warehouse:', this.filters.warehouse, 'docType:', this.filters.documentType);

    const movements = this.inventoryService.calculateStockMovements(
      article.code,
      this.filters.warehouse,
      this.filters.documentType
    );

    console.log('[ArticleStatement] Raw movements from service:', movements.length, movements);

    return movements.map(m => ({
      date: m.date,
      documentType: m.documentType,
      documentNumber: m.documentNumber,
      documentId: m.documentId,
      description: m.description,
      warehouse: m.warehouse,
      location: '', // Not currently returned by service, could be added later
      batch: '',    // Not currently returned by service
      quantityIn: m.quantityIn,
      quantityOut: m.quantityOut,
      balance: 0,
      unitCost: m.unitCost,
      totalValue: 0
    }));
  }

  getDocumentTypeDescription(type: string): string {
    for (const group of this.documentTypes) {
      const found = group.types.find((t: any) => t.code === type);
      if (found) return found.name;
    }
    return type;
  }

  openArticleSearch() {
    this.isArticleSearchOpen = true;
  }

  onArticleSelect(article: Article) {
    this.filters.articleCode = article.code;
    this.filters.articleName = article.name || article.description;
    this.isArticleSearchOpen = false;
    // Auto-generate statement when article is selected
    this.generateStatement();
  }

  openDocument(movement: ArticleMovement) {
    if (!movement.documentId) {
      alert('ID do documento não disponível.');
      return;
    }

    if (this.dataService.isLocalBrowser()) {
      const stored = localStorage.getItem('erp_stock_documents');
      if (!stored) {
        alert('Documento não encontrado.');
        return;
      }

      const documents = JSON.parse(stored);
      const doc = documents.find((d: any) =>
        `${d.type}${d.series}/${d.number}` === movement.documentNumber
      );

      if (doc) {
        alert(`Abrindo documento: ${movement.documentNumber}\n\nTipo: ${movement.documentType}\nData: ${movement.date}\n\nNota: Funcionalidade de navegação local limitada.`);
      } else {
        alert('Documento não encontrado no sistema local.');
      }
      return;
    }

    // Backend Navigation Logic
    // Ideally we route based on document type
    alert(`Navegação para documento ${movement.documentNumber} (${movement.documentId}). Implementação de rotas pendente.`);
    // this.router.navigate(['/sales/documents', movement.documentId]);
  }

  clearFilters() {
    this.filters = {
      articleCode: '',
      articleName: '',
      dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      warehouse: '',
      location: '',
      documentType: '',
      showOnlyWithMovements: true,
      groupByArticle: true,
      includeDetails: true
    };
    this.statements = [];
    this.statementGenerated = false;
  }

  getTotalMovements(): number {
    return this.statements.reduce((sum, s) => sum + s.movements.length, 0);
  }

  exportToPDF() {
    // In a browser environment without external libraries like jsPDF, 
    // the best way to generate a professional PDF is to use the browser's Print to PDF capability.
    // We trigger the print dialog and advise the user.
    window.print();
  }

  exportToExcel() {
    // BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF';
    let csvContent = BOM + 'Extrato de Movimentação de Artigos\n';
    csvContent += `Gerado em:;${new Date().toLocaleString()}\n`;
    csvContent += `Período:;${this.filters.dateFrom};a;${this.filters.dateTo}\n`;
    csvContent += `Filtros:;Armazém: ${this.filters.warehouse || 'Todos'};Tipo Doc: ${this.filters.documentType || 'Todos'}\n\n`;

    this.statements.forEach(statement => {
      csvContent += `ARTIGO:;${statement.articleCode};${statement.articleName};Unidade: ${statement.unit}\n`;
      csvContent += 'Data;Tipo;Nº Doc.;Descrição;Entrada;Saída;Saldo;Custo Unit.;Valor Total\n';

      statement.movements.forEach(mov => {
        const line = [
          new Date(mov.date).toLocaleDateString(),
          mov.documentType,
          mov.documentNumber,
          `"${mov.description.replace(/"/g, '""')}"`, // Escape quotes
          mov.quantityIn.toLocaleString('pt-PT', { minimumFractionDigits: 2 }),
          mov.quantityOut.toLocaleString('pt-PT', { minimumFractionDigits: 2 }),
          mov.balance.toLocaleString('pt-PT', { minimumFractionDigits: 2 }),
          mov.unitCost.toLocaleString('pt-PT', { minimumFractionDigits: 2 }),
          mov.totalValue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })
        ].join(';');
        csvContent += line + '\n';
      });

      csvContent += `TOTAIS:;;;;${statement.totalIn.toLocaleString('pt-PT', { minimumFractionDigits: 2 })};${statement.totalOut.toLocaleString('pt-PT', { minimumFractionDigits: 2 })};${statement.finalBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2 })};;${statement.finalValue.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}\n\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Extrato_Artigos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  print() {
    window.print();
  }
}
