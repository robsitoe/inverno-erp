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
      @page { size: A4; margin: 10mm; }
      body { background: white; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      
      /* Print Typography */
      .print-container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
      .print-header { border-bottom: 2px solid #2563EB; padding-bottom: 10px; margin-bottom: 20px; }
      .print-title { font-size: 24px; font-weight: bold; color: #1E40AF; }
      .print-meta { font-size: 12px; color: #666; margin-top: 5px; }
      
      /* Print Table */
      .print-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; }
      .print-table th { background-color: #F3F4F6; color: #374151; font-weight: bold; text-align: left; padding: 6px; border-bottom: 1px solid #D1D5DB; }
      .print-table td { padding: 6px; border-bottom: 1px solid #E5E7EB; }
      .print-table tr:nth-child(even) { background-color: #F9FAFB; }
      
      /* Alignment */
      .text-right { text-align: right; }
      .font-mono { font-family: 'Courier New', Courier, monospace; }
      
      /* Totals Row */
      .print-totals { font-weight: bold; background-color: #EFF6FF !important; border-top: 2px solid #BFDBFE; }
    }
    .print-only { display: none; }
  `],
  template: `
    <div class="flex h-full bg-[#F0F0F0] no-print">
      <!-- Left Panel - Filters -->
      <div class="w-80 bg-white border-r border-gray-300 flex flex-col shrink-0">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 flex items-center gap-2 shrink-0">
          <span class="material-symbols-outlined text-[20px]">history</span>
          <h2 class="font-semibold text-sm">Extrato de Artigos</h2>
        </div>

        <!-- Filters Form -->
        <div class="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <!-- Período -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Período</div>
            <div class="p-2 space-y-2">
              <div>
                <label class="block text-gray-700 mb-1">Data Inicial:</label>
                <input type="date" [(ngModel)]="filters.dateFrom" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-gray-700 mb-1">Data Final:</label>
                <input type="date" [(ngModel)]="filters.dateTo" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <!-- Artigo -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Artigo</div>
            <div class="p-2 space-y-2">
              <div>
                <label class="block text-gray-700 mb-1">Código:</label>
                <div class="flex gap-1">
                  <input [(ngModel)]="filters.articleCode" 
                         (keyup.enter)="generateStatement()"
                         class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" 
                         placeholder="Código do artigo" />
                  <button (click)="openArticleSearch()" 
                          class="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded flex items-center gap-1"
                          title="Procurar artigo (F4)">
                    <span class="material-symbols-outlined text-[14px]">search</span>
                    <span class="text-[9px]">F4</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-gray-700 mb-1">Descrição:</label>
                <input [(ngModel)]="filters.articleName" 
                       readonly
                       class="w-full px-2 py-1 border border-gray-300 bg-gray-50 focus:outline-none" 
                       placeholder="Nome do artigo" />
              </div>
            </div>
          </div>

          <!-- Armazém -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Armazém</div>
            <div class="p-2">
              <select [(ngModel)]="filters.warehouse" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500">
                <option value="">Todos</option>
                <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }} - {{ wh.name }}</option>
              </select>
            </div>
          </div>

          <!-- Tipo de Documento -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Tipo de Documento</div>
            <div class="p-2">
              <select [(ngModel)]="filters.documentType" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500">
                <option value="">Todos</option>
                <optgroup *ngFor="let group of documentTypes" [label]="group.group">
                  <option *ngFor="let type of group.types" [value]="type.code">
                    {{ type.name }} ({{ type.code }})
                  </option>
                </optgroup>
              </select>
            </div>
          </div>

          <!-- Opções -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Opções</div>
            <div class="p-2 space-y-1">
              <label class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="filters.showOnlyWithMovements" class="rounded" />
                <span>Apenas com Movimentos</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="border-t border-gray-300 p-2 space-y-2 shrink-0">
          <button (click)="generateStatement()" class="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded flex items-center justify-center gap-2 transition-colors">
            <span class="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>Gerar Extrato</span>
          </button>
          <button (click)="clearFilters()" class="w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded flex items-center justify-center gap-2 transition-colors">
            <span class="material-symbols-outlined text-[18px]">refresh</span>
            <span>Limpar</span>
          </button>
        </div>
      </div>

      <!-- Right Panel - Statement -->
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
            {{ statements.length }} artigo(s) | {{ getTotalMovements() }} movimento(s)
          </div>
        </div>

        <!-- Statement Content -->
        <div class="flex-1 overflow-auto p-4">
          <div *ngIf="!statementGenerated" class="flex flex-col items-center justify-center h-full text-gray-400">
            <span class="material-symbols-outlined text-[64px] mb-4">history</span>
            <p class="text-sm">Configure os filtros e clique em "Gerar Extrato"</p>
          </div>

          <div *ngIf="statementGenerated" class="space-y-6">
            <!-- Header -->
            <div class="text-center mb-6">
              <h1 class="text-lg font-bold text-gray-800">Extrato de Movimentação de Artigos</h1>
              <p class="text-xs text-gray-600 mt-1">
                Período: {{ filters.dateFrom | date:'dd/MM/yyyy' }} a {{ filters.dateTo | date:'dd/MM/yyyy' }}
              </p>
            </div>

            <!-- Each Article Statement -->
            <div *ngFor="let statement of statements" class="border border-gray-300 rounded-lg overflow-hidden mb-4">
              <!-- Article Header -->
              <div class="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 border-b border-gray-300">
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="font-semibold text-sm text-gray-800">{{ statement.articleCode }} - {{ statement.articleName }}</h3>
                    <p class="text-xs text-gray-600">Unidade: {{ statement.unit }}</p>
                  </div>
                  <div class="text-right text-xs">
                    <div class="text-gray-600">Saldo Inicial: <span class="font-semibold">{{ statement.initialBalance | number:'1.2-2' }}</span></div>
                  </div>
                </div>
              </div>

              <!-- Movements Table -->
              <table class="w-full text-xs">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Data</th>
                    <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Tipo Doc.</th>
                    <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Nº Doc.</th>
                    <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Descrição</th>
                    <th class="border-b border-gray-300 px-2 py-1 text-right font-semibold text-green-700">Entradas</th>
                    <th class="border-b border-gray-300 px-2 py-1 text-right font-semibold text-red-700">Saídas</th>
                    <th class="border-b border-gray-300 px-2 py-1 text-right font-semibold text-blue-700">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let mov of statement.movements" 
                      (click)="openDocument(mov)"
                      class="hover:bg-blue-50 cursor-pointer transition-colors group"
                      title="Clique para abrir o documento {{ mov.documentNumber }}">
                    <td class="border-b border-gray-200 px-2 py-1">{{ mov.date | date:'dd/MM/yyyy' }}</td>
                    <td class="border-b border-gray-200 px-2 py-1">{{ mov.documentType }}</td>
                    <td class="border-b border-gray-200 px-2 py-1 text-blue-600 group-hover:underline font-medium">
                      <span class="flex items-center gap-1">
                        {{ mov.documentNumber }}
                        <span class="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100">open_in_new</span>
                      </span>
                    </td>
                    <td class="border-b border-gray-200 px-2 py-1">{{ mov.description }}</td>
                    <td class="border-b border-gray-200 px-2 py-1 text-right text-green-700 font-medium">
                      {{ mov.quantityIn > 0 ? (mov.quantityIn | number:'1.2-2') : '-' }}
                    </td>
                    <td class="border-b border-gray-200 px-2 py-1 text-right text-red-700 font-medium">
                      {{ mov.quantityOut > 0 ? (mov.quantityOut | number:'1.2-2') : '-' }}
                    </td>
                    <td class="border-b border-gray-200 px-2 py-1 text-right font-semibold text-blue-700">
                      {{ mov.balance | number:'1.2-2' }}
                    </td>
                  </tr>
                  <tr *ngIf="statement.movements.length === 0">
                    <td colspan="7" class="border-b border-gray-200 px-2 py-4 text-center text-gray-400 italic">
                      Sem movimentos no período
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-gray-50 font-semibold">
                  <tr>
                    <td colspan="4" class="border-t-2 border-gray-300 px-2 py-1 text-right">Totais:</td>
                    <td class="border-t-2 border-gray-300 px-2 py-1 text-right text-green-700">{{ statement.totalIn | number:'1.2-2' }}</td>
                    <td class="border-t-2 border-gray-300 px-2 py-1 text-right text-red-700">{{ statement.totalOut | number:'1.2-2' }}</td>
                    <td class="border-t-2 border-gray-300 px-2 py-1 text-right text-blue-700">{{ statement.finalBalance | number:'1.2-2' }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Summary -->
            <div *ngIf="statements.length === 0" class="text-center py-8 text-gray-400 italic">
              Nenhum artigo encontrado com os filtros selecionados.
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-3 py-1.5 bg-[#DCE4F2] border-t border-gray-300 shrink-0 text-xs text-gray-600">
          Gerado em: {{ currentDate | date:'dd/MM/yyyy HH:mm' }}
        </div>
      </div>
    </div>

    <!-- Article Search Modal -->
    <app-article-search-modal
      [isOpen]="isArticleSearchOpen"
      (close)="isArticleSearchOpen = false"
      (select)="onArticleSelect($event)"
    ></app-article-search-modal>

    <!-- Print Template -->
    <div class="print-only print-container">
      <!-- Header -->
      <div class="print-header">
        <div class="flex justify-between items-end">
          <div>
            <h1 class="print-title">Extrato de Movimentação de Artigos</h1>
            <div class="print-meta">
              <p><strong>Empresa:</strong> Inverno ERP Lda.</p>
              <p><strong>Gerado em:</strong> {{ currentDate | date:'dd/MM/yyyy HH:mm' }}</p>
            </div>
          </div>
          <div class="text-right print-meta">
            <p><strong>Período:</strong> {{ filters.dateFrom | date:'dd/MM/yyyy' }} a {{ filters.dateTo | date:'dd/MM/yyyy' }}</p>
            <p><strong>Filtros:</strong> Armazém: {{ filters.warehouse || 'Todos' }} | Doc: {{ filters.documentType || 'Todos' }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div *ngFor="let statement of statements" class="mb-8 break-inside-avoid">
        <div class="bg-gray-100 p-2 border-l-4 border-blue-600 mb-2">
          <h3 class="font-bold text-lg">{{ statement.articleCode }} - {{ statement.articleName }}</h3>
          <p class="text-xs text-gray-600">Unidade: {{ statement.unit }}</p>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 80px;">Data</th>
              <th style="width: 60px;">Tipo</th>
              <th style="width: 100px;">Nº Doc.</th>
              <th>Descrição</th>
              <th class="text-right" style="width: 80px;">Entrada</th>
              <th class="text-right" style="width: 80px;">Saída</th>
              <th class="text-right" style="width: 80px;">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let mov of statement.movements">
              <td>{{ mov.date | date:'dd/MM/yyyy' }}</td>
              <td>{{ mov.documentType }}</td>
              <td>{{ mov.documentNumber }}</td>
              <td>{{ mov.description }}</td>
              <td class="text-right font-mono">{{ mov.quantityIn > 0 ? (mov.quantityIn | number:'1.2-2') : '-' }}</td>
              <td class="text-right font-mono">{{ mov.quantityOut > 0 ? (mov.quantityOut | number:'1.2-2') : '-' }}</td>
              <td class="text-right font-mono font-bold">{{ mov.balance | number:'1.2-2' }}</td>
            </tr>
            <tr *ngIf="statement.movements.length === 0">
              <td colspan="7" class="text-center italic text-gray-500 py-4">Sem movimentos no período.</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="print-totals">
              <td colspan="4" class="text-right">TOTAIS:</td>
              <td class="text-right font-mono">{{ statement.totalIn | number:'1.2-2' }}</td>
              <td class="text-right font-mono">{{ statement.totalOut | number:'1.2-2' }}</td>
              <td class="text-right font-mono">{{ statement.finalBalance | number:'1.2-2' }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Footer -->
      <div class="fixed bottom-0 left-0 w-full text-center text-[10px] text-gray-400 border-t pt-2">
        Processado por Inverno ERP
      </div>
    </div>
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

  documentTypes: any[] = [];

  constructor(
    private inventoryService: InventoryService,
    private dataService: DataService
  ) { }

  ngOnInit() {
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
