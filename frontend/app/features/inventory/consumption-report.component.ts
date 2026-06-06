import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';
import { ArticleSearchModalComponent } from './article-search-modal.component';
import { Article } from '../../shared/models';

interface ConsumptionFilters {
  dateFrom: string;
  dateTo: string;
  articleCode: string;
  articleName: string;
  warehouse: string;
  costCenter: string;
  project: string;
  analytic: string;
  functional: string;
  groupBy: 'article' | 'costCenter' | 'project' | 'warehouse' | 'date';
  showDetails: boolean;
}

interface ConsumptionLine {
  date: string;
  documentType: string;
  documentNumber: string;
  articleCode: string;
  articleName: string;
  warehouse: string;
  costCenter: string;
  project: string;
  analytic: string;
  functional: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  description: string;
}

interface ConsumptionGroup {
  groupKey: string;
  groupLabel: string;
  lines: ConsumptionLine[];
  totalQuantity: number;
  totalValue: number;
  articleCount: number;
}

@Component({
  selector: 'app-consumption-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ArticleSearchModalComponent],
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
          <span class="material-symbols-outlined text-[20px]">trending_down</span>
          <h2 class="font-semibold text-sm">Relatório de Consumos</h2>
        </div>

        <!-- Filters Form -->
        <div class="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          <!-- Período -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Período de Consumo</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2.5">
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">Data Inicial:</label>
                <input type="date" [(ngModel)]="filters.dateFrom" class="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" />
              </div>
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">Data Final:</label>
                <input type="date" [(ngModel)]="filters.dateTo" class="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" />
              </div>
            </div>
          </div>

          <!-- Filtro de Artigo -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Filtro de Artigo</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2.5">
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">Artigo:</label>
                <div class="flex gap-1">
                  <input [(ngModel)]="filters.articleCode" 
                         (keyup.enter)="generateReport()"
                         class="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" 
                         placeholder="Código..." />
                  <button (click)="openArticleSearch()" 
                          class="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all flex items-center shadow-sm"
                          title="Procurar artigo (F4)">
                    <span class="material-symbols-outlined text-[16px]">manage_search</span>
                  </button>
                </div>
              </div>
              <div *ngIf="filters.articleName">
                <input [(ngModel)]="filters.articleName" 
                       readonly
                       class="w-full px-2 py-1.5 border border-gray-300 bg-white text-gray-500 rounded text-[10px]" />
              </div>
            </div>
          </div>

          <!-- Filtros Analíticos -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Análise de Custos</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2.5">
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">Centro de Custo:</label>
                <input [(ngModel)]="filters.costCenter" class="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Ex: ADM.01" />
              </div>
              <div>
                <label class="block text-gray-600 text-[10px] mb-1 pl-0.5 font-medium">Projeto:</label>
                <input [(ngModel)]="filters.project" class="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Ex: PROJ.X" />
              </div>
            </div>
          </div>

          <!-- Agrupamento -->
          <div>
            <label class="block text-[10px] font-bold text-blue-700 uppercase mb-1.5 ml-1">Agrupamento</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2.5">
              <select [(ngModel)]="filters.groupBy" class="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 transition-all shadow-sm font-bold">
                  <option value="article">Por Artigo</option>
                  <option value="costCenter">Por Centro de Custo</option>
                  <option value="project">Por Projeto</option>
                  <option value="warehouse">Por Armazém</option>
                  <option value="date">Por Data</option>
              </select>
              <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" [(ngModel)]="filters.showDetails" class="rounded border-gray-300 text-blue-600 shadow-sm" />
                <span class="group-hover:text-blue-700 transition-colors">Detalhar movimentos</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="border-t border-gray-300 p-2.5 space-y-2 shrink-0 bg-white no-print">
          <button (click)="generateReport()" class="w-full px-3 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
            <span class="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>GERAR RELATÓRIO</span>
          </button>
          <button (click)="clearFilters()" class="w-full px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium rounded flex items-center justify-center gap-2 transition-all">
            <span class="material-symbols-outlined text-[16px]">refresh</span>
            <span>LIMPAR TUDO</span>
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
             Análise Detalhada de Consumos de Inventário
          </div>
        </div>

        <div id="report-area" class="flex-1 overflow-auto bg-[#F0F0F0] p-8 scroll-smooth no-print-padding">

          <div *ngIf="reportGenerated" class="max-w-4xl mx-auto Paper p-10 min-h-[1120px] flex flex-col mb-10">
            <!-- Document Header -->
            <div class="border-b-2 border-WinterBlue pb-4 mb-6 flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-12 h-12 bg-WinterBlue rounded shrink-0 flex items-center justify-center text-white">
                            <span class="material-symbols-outlined text-[32px]">trending_down</span>
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
                    <h2 class="text-xl font-black text-gray-900 uppercase">Relatório de Consumos</h2>
                    <p class="text-[10px] font-bold text-blue-700 uppercase tracking-widest mt-1">Análise de Saídas de Stock</p>
                    <div class="mt-4 bg-gray-50 border border-gray-200 rounded p-2 text-right">
                        <p class="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Período:</p>
                        <p class="text-xs font-black">{{ filters.dateFrom | date:'dd/MM/yyyy' }} a {{ filters.dateTo | date:'dd/MM/yyyy' }}</p>
                    </div>
                </div>
            </div>

            <!-- Report Body -->
            <div class="flex-1">
                <!-- Summary Stats (Dashboard style in report) -->
                <div class="grid grid-cols-4 gap-2 mb-8 no-print">
                  <div class="bg-blue-50 border border-blue-100 p-3 rounded text-center">
                    <p class="text-[8px] font-bold text-blue-600 uppercase">Total Valor</p>
                    <p class="text-sm font-black text-blue-900">{{ getTotalValue() | number:'1.2-2' }} MT</p>
                  </div>
                  <div class="bg-blue-50 border border-blue-100 p-3 rounded text-center">
                    <p class="text-[8px] font-bold text-blue-600 uppercase">Nº Consumos</p>
                    <p class="text-sm font-black text-blue-900">{{ getTotalLines() }}</p>
                  </div>
                  <div class="bg-blue-50 border border-blue-100 p-3 rounded text-center">
                    <p class="text-[8px] font-bold text-blue-600 uppercase">Artigos</p>
                    <p class="text-sm font-black text-blue-900">{{ getUniqueArticles() }}</p>
                  </div>
                  <div class="bg-blue-50 border border-blue-100 p-3 rounded text-center">
                    <p class="text-[8px] font-bold text-blue-600 uppercase">Média</p>
                    <p class="text-sm font-black text-blue-900">{{ getAverageValue() | number:'1.2-2' }} MT</p>
                  </div>
                </div>

                <!-- Groups -->
                <div *ngFor="let group of groups" class="mb-8 break-inside-avoid">
                  <!-- Group Header -->
                  <div class="bg-winter-blue text-white px-4 py-2 flex justify-between items-center rounded-t shadow-sm">
                    <h3 class="font-black text-xs uppercase tracking-tight">{{ group.groupLabel }}</h3>
                    <div class="text-right">
                      <p class="text-[9px] opacity-80 uppercase font-bold">Total Grupo:</p>
                      <p class="text-sm font-black">{{ group.totalValue | number:'1.2-2' }}</p>
                    </div>
                  </div>

                  <table class="w-full text-[9px] border-collapse" *ngIf="filters.showDetails">
                    <thead class="bg-gray-100 uppercase text-gray-700 font-bold tracking-tighter">
                      <tr>
                        <th class="px-2 py-2 text-left border-b-2 border-gray-300 w-16">Data</th>
                        <th class="px-2 py-2 text-left border-b-2 border-gray-300 w-24">Doc.</th>
                        <th class="px-2 py-2 text-left border-b-2 border-gray-300">Artigo/Descrição</th>
                        <th class="px-2 py-2 text-left border-b-2 border-gray-300 w-20">Analítica</th>
                        <th class="px-2 py-2 text-right border-b-2 border-gray-300 w-14">Qtd.</th>
                        <th class="px-2 py-2 text-right border-b-2 border-gray-300 w-20">P.Unit.</th>
                        <th class="px-2 py-2 text-right border-b-2 border-gray-300 w-20 bg-blue-50">Total</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr *ngFor="let line of group.lines" class="hover:bg-blue-50/50 transition-colors">
                        <td class="px-2 py-2">{{ line.date | date:'dd/MM/yyyy' }}</td>
                        <td class="px-2 py-2 font-bold">{{ line.documentNumber }}</td>
                        <td class="px-2 py-2">
                           <span class="font-black text-blue-800">{{ line.articleCode }}</span> - {{ line.articleName }}
                        </td>
                        <td class="px-2 py-2 uppercase text-[8px] font-bold text-gray-400">
                           {{ line.costCenter || '---' }}
                        </td>
                        <td class="px-2 py-2 text-right font-bold text-gray-700">{{ line.quantity | number:'1.2-2' }}</td>
                        <td class="px-2 py-2 text-right text-gray-500">{{ line.unitPrice | number:'1.2-2' }}</td>
                        <td class="px-2 py-2 text-right font-black text-blue-900 bg-blue-50/20">{{ line.totalValue | number:'1.2-2' }}</td>
                      </tr>
                    </tbody>
                    <tfoot class="bg-gray-50 font-black border-t border-gray-200">
                      <tr>
                        <td colspan="4" class="px-2 py-2 text-right uppercase tracking-tighter text-gray-400">Subtotal:</td>
                        <td class="px-2 py-2 text-right text-gray-700">{{ group.totalQuantity | number:'1.2-2' }}</td>
                        <td class="px-2 py-2"></td>
                        <td class="px-2 py-2 text-right text-blue-900 bg-blue-50">{{ group.totalValue | number:'1.2-2' }}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <div *ngIf="!filters.showDetails" class="bg-gray-50 p-3 rounded-b border-x border-b border-gray-200 flex justify-between text-[10px] font-bold text-gray-600 uppercase">
                     <span>Qtd Total: {{ group.totalQuantity | number:'1.2-2' }}</span>
                     <span>Valor Total: {{ group.totalValue | number:'1.2-2' }} MT</span>
                     <span>{{ group.articleCount }} Artigos Diferentes</span>
                  </div>
                </div>

                <div *ngIf="groups.length === 0" class="text-center py-20 text-gray-400 uppercase tracking-widest text-xs font-bold bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  Nenhum consumo registado nos filtros aplicados
                </div>
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
        </div>

        <!-- App Footer (Status Bar) -->
        <div class="px-4 py-1.5 bg-[#1e3a8a] text-white shrink-0 text-[10px] flex justify-between items-center no-print">
          <div class="flex gap-4">
            <span class="opacity-80">Empresa: <span class="font-bold">{{ companyInfo?.name || 'INVERNO ERP' }}</span></span>
            <span class="opacity-80">Operador: <span class="font-bold">{{ currentUser }}</span></span>
          </div>
          <div class="font-bold">
            {{ groups.length }} Grupos | {{ getTotalLines() }} Movimentos | total: {{ getTotalValue() | number:'1.2-2' }} MT
          </div>
        </div> <!-- Right Panel -->
    </div> <!-- Root div -->

    <!-- Article Search Modal -->
    <app-article-search-modal
      [isOpen]="isArticleSearchOpen"
      (close)="isArticleSearchOpen = false"
      (select)="onArticleSelect($event)"
    ></app-article-search-modal>
  `
})
export class ConsumptionReportComponent implements OnInit {
  filters: ConsumptionFilters = {
    dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    articleCode: '',
    articleName: '',
    warehouse: '',
    costCenter: '',
    project: '',
    analytic: '',
    functional: '',
    groupBy: 'article',
    showDetails: true
  };

  warehouses: any[] = [];
  groups: ConsumptionGroup[] = [];
  reportGenerated = false;
  currentDate = new Date();
  companyInfo: any = null;
  currentUser: string = 'Utilizador';
  isArticleSearchOpen = false;

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

  generateReport() {
    const consumptionLines = this.extractConsumptionLines();
    this.groups = this.groupConsumptionLines(consumptionLines);
    this.reportGenerated = true;
  }

  extractConsumptionLines(): ConsumptionLine[] {
    const lines: ConsumptionLine[] = [];

    // Load stock documents
    const stored = localStorage.getItem('erp_stock_documents');
    if (!stored) return lines;

    const documents = JSON.parse(stored);
    const startDate = new Date(this.filters.dateFrom);
    const endDate = new Date(this.filters.dateTo);

    // Load document types to determine which are consumption (OUT) types
    const storedTypes = localStorage.getItem('erp_stock_document_types');
    let consumptionTypes: string[] = [];

    if (storedTypes) {
      const docTypes = JSON.parse(storedTypes);
      consumptionTypes = docTypes
        .filter((t: any) => t.movementType === 'OUT' && t.isActive)
        .map((t: any) => t.code);
    } else {
      // Fallback to default consumption types
      consumptionTypes = ['FS', 'AIN', 'LD'];
    }

    documents.forEach((doc: any) => {
      const docDate = new Date(doc.date);

      // Filter by date range
      if (docDate < startDate || docDate > endDate) return;

      // Only process consumption documents
      if (!consumptionTypes.includes(doc.type)) return;

      // Process each line
      doc.lines.forEach((line: any) => {
        // Apply filters
        if (this.filters.articleCode && !line.articleCode.toLowerCase().includes(this.filters.articleCode.toLowerCase())) return;
        if (this.filters.articleName && !line.articleName.toLowerCase().includes(this.filters.articleName.toLowerCase())) return;
        if (this.filters.warehouse && line.warehouse !== this.filters.warehouse) return;
        if (this.filters.costCenter && line.costCenter !== this.filters.costCenter) return;
        if (this.filters.project && line.project !== this.filters.project) return;
        if (this.filters.analytic && line.analytic !== this.filters.analytic) return;
        if (this.filters.functional && line.functional !== this.filters.functional) return;

        const consumptionLine: ConsumptionLine = {
          date: doc.date,
          documentType: doc.type,
          documentNumber: `${doc.type}${doc.series}/${doc.number}`,
          articleCode: line.articleCode,
          articleName: line.articleName,
          warehouse: line.warehouse || '',
          costCenter: line.costCenter || '',
          project: line.project || '',
          analytic: line.analytic || '',
          functional: line.functional || '',
          quantity: line.quantity,
          unitPrice: line.unitPrice || 0,
          totalValue: line.total || (line.quantity * (line.unitPrice || 0)),
          description: line.description || ''
        };

        lines.push(consumptionLine);
      });
    });

    return lines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  groupConsumptionLines(lines: ConsumptionLine[]): ConsumptionGroup[] {
    const groupMap = new Map<string, ConsumptionLine[]>();

    lines.forEach(line => {
      let groupKey = '';
      let groupLabel = '';

      switch (this.filters.groupBy) {
        case 'article':
          groupKey = line.articleCode;
          groupLabel = `${line.articleCode} - ${line.articleName}`;
          break;
        case 'costCenter':
          groupKey = line.costCenter || '(Sem Centro de Custo)';
          groupLabel = groupKey;
          break;
        case 'project':
          groupKey = line.project || '(Sem Projeto)';
          groupLabel = groupKey;
          break;
        case 'warehouse':
          groupKey = line.warehouse || '(Sem Armazém)';
          groupLabel = groupKey;
          break;
        case 'date':
          groupKey = line.date;
          groupLabel = new Date(line.date).toLocaleDateString('pt-PT');
          break;
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(line);
    });

    const groups: ConsumptionGroup[] = [];
    groupMap.forEach((groupLines, groupKey) => {
      const totalQuantity = groupLines.reduce((sum, l) => sum + l.quantity, 0);
      const totalValue = groupLines.reduce((sum, l) => sum + l.totalValue, 0);
      const uniqueArticles = new Set(groupLines.map(l => l.articleCode)).size;

      groups.push({
        groupKey,
        groupLabel: groupLines[0] ? (this.filters.groupBy === 'article' ?
          `${groupLines[0].articleCode} - ${groupLines[0].articleName}` :
          groupKey) : groupKey,
        lines: groupLines,
        totalQuantity,
        totalValue,
        articleCount: uniqueArticles
      });
    });

    // Sort by total value descending
    return groups.sort((a, b) => b.totalValue - a.totalValue);
  }

  getGroupByLabel(): string {
    const labels: any = {
      'article': 'Artigo',
      'costCenter': 'Centro de Custo',
      'project': 'Projeto',
      'warehouse': 'Armazém',
      'date': 'Data'
    };
    return labels[this.filters.groupBy] || this.filters.groupBy;
  }

  getTotalLines(): number {
    return this.groups.reduce((sum, g) => sum + g.lines.length, 0);
  }

  getTotalValue(): number {
    return this.groups.reduce((sum, g) => sum + g.totalValue, 0);
  }

  getUniqueArticles(): number {
    const articles = new Set<string>();
    this.groups.forEach(g => {
      g.lines.forEach(l => articles.add(l.articleCode));
    });
    return articles.size;
  }

  getAverageValue(): number {
    const total = this.getTotalLines();
    return total > 0 ? this.getTotalValue() / total : 0;
  }

  clearFilters() {
    this.filters = {
      dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      articleCode: '',
      articleName: '',
      warehouse: '',
      costCenter: '',
      project: '',
      analytic: '',
      functional: '',
      groupBy: 'article',
      showDetails: true
    };
    this.groups = [];
    this.reportGenerated = false;
  }

  exportToPDF() {
    window.print();
  }

  exportToExcel() {
    let csvContent = 'Relatório de Consumos\n';
    csvContent += `Período: ${this.filters.dateFrom} a ${this.filters.dateTo}\n`;
    csvContent += `Agrupado por: ${this.getGroupByLabel()}\n\n`;

    this.groups.forEach(group => {
      csvContent += `\n${group.groupLabel}\n`;
      csvContent += 'Data;Documento;Artigo;Descrição;C.Custo;Projeto;Quantidade;P.Unitário;Total\n';

      group.lines.forEach(line => {
        csvContent += `${line.date};${line.documentNumber};${line.articleCode};${line.articleName};`;
        csvContent += `${line.costCenter};${line.project};${Number(line.quantity).toFixed(2)};`;
        csvContent += `${Number(line.unitPrice).toFixed(2)};${Number(line.totalValue).toFixed(2)}\n`;
      });

      csvContent += `\nSubtotal:;;;;;${Number(group.totalQuantity).toFixed(2)};;${Number(group.totalValue).toFixed(2)}\n`;
    });

    csvContent += `\n\nTOTAL GERAL:;;;;;${Number(this.groups.reduce((s, g) => s + g.totalQuantity, 0)).toFixed(2)};;${Number(this.getTotalValue()).toFixed(2)}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consumos_${this.filters.dateFrom}_${this.filters.dateTo}.csv`;
    link.click();
  }

  print() {
    window.print();
  }

  openArticleSearch() {
    this.isArticleSearchOpen = true;
  }

  onArticleSelect(article: Article) {
    this.filters.articleCode = article.code;
    this.filters.articleName = article.name || article.description;
    this.isArticleSearchOpen = false;
    this.generateReport();
  }
}
