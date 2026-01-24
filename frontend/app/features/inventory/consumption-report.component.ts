import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-full bg-[#F0F0F0]">
      <!-- Left Panel - Filters -->
      <div class="w-80 bg-white border-r border-gray-300 flex flex-col shrink-0">
        <!-- Header -->
        <div class="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 flex items-center gap-2 shrink-0">
          <span class="material-symbols-outlined text-[20px]">trending_down</span>
          <h2 class="font-semibold text-sm">Relatório de Consumos</h2>
        </div>

        <!-- Filters Form -->
        <div class="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <!-- Período -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Período</div>
            <div class="p-2 space-y-2">
              <div>
                <label class="block text-gray-700 mb-1">Data Inicial:</label>
                <input type="date" [(ngModel)]="filters.dateFrom" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label class="block text-gray-700 mb-1">Data Final:</label>
                <input type="date" [(ngModel)]="filters.dateTo" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500" />
              </div>
            </div>
          </div>

          <!-- Artigo -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Artigo</div>
            <div class="p-2 space-y-2">
              <div>
                <label class="block text-gray-700 mb-1">Código:</label>
                <input [(ngModel)]="filters.articleCode" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500" placeholder="Código do artigo" />
              </div>
              <div>
                <label class="block text-gray-700 mb-1">Descrição:</label>
                <input [(ngModel)]="filters.articleName" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500" placeholder="Nome do artigo" />
              </div>
            </div>
          </div>

          <!-- Armazém -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Armazém</div>
            <div class="p-2">
              <select [(ngModel)]="filters.warehouse" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500">
                <option value="">Todos</option>
                <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }} - {{ wh.name }}</option>
              </select>
            </div>
          </div>

          <!-- Dimensões Analíticas -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Dimensões Analíticas</div>
            <div class="p-2 space-y-2">
              <div>
                <label class="block text-gray-700 mb-1">Centro de Custo:</label>
                <input [(ngModel)]="filters.costCenter" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500" placeholder="Centro de custo" />
              </div>
              <div>
                <label class="block text-gray-700 mb-1">Projeto:</label>
                <input [(ngModel)]="filters.project" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500" placeholder="Projeto" />
              </div>
              <div>
                <label class="block text-gray-700 mb-1">Analítico:</label>
                <input [(ngModel)]="filters.analytic" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500" placeholder="Analítico" />
              </div>
              <div>
                <label class="block text-gray-700 mb-1">Funcional:</label>
                <input [(ngModel)]="filters.functional" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500" placeholder="Funcional" />
              </div>
            </div>
          </div>

          <!-- Agrupamento -->
          <div class="border border-gray-300 rounded">
            <div class="bg-gray-100 px-2 py-1 font-semibold border-b border-gray-300">Agrupamento</div>
            <div class="p-2 space-y-2">
              <div>
                <label class="block text-gray-700 mb-1">Agrupar Por:</label>
                <select [(ngModel)]="filters.groupBy" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-red-500">
                  <option value="article">Artigo</option>
                  <option value="costCenter">Centro de Custo</option>
                  <option value="project">Projeto</option>
                  <option value="warehouse">Armazém</option>
                  <option value="date">Data</option>
                </select>
              </div>
              <label class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="filters.showDetails" class="rounded" />
                <span>Mostrar Detalhes</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="border-t border-gray-300 p-2 space-y-2 shrink-0">
          <button (click)="generateReport()" class="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded flex items-center justify-center gap-2 transition-colors">
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
            {{ groups.length }} grupo(s) | {{ getTotalLines() }} consumo(s) | Total: {{ getTotalValue() | number:'1.2-2' }} €
          </div>
        </div>

        <!-- Report Content -->
        <div class="flex-1 overflow-auto p-4">
          <div *ngIf="!reportGenerated" class="flex flex-col items-center justify-center h-full text-gray-400">
            <span class="material-symbols-outlined text-[64px] mb-4">trending_down</span>
            <p class="text-sm">Configure os filtros e clique em "Gerar Relatório"</p>
          </div>

          <div *ngIf="reportGenerated" class="space-y-6">
            <!-- Header -->
            <div class="text-center mb-6">
              <h1 class="text-lg font-bold text-gray-800">Relatório de Consumos</h1>
              <p class="text-xs text-gray-600 mt-1">
                Período: {{ filters.dateFrom | date:'dd/MM/yyyy' }} a {{ filters.dateTo | date:'dd/MM/yyyy' }}
              </p>
              <p class="text-xs text-gray-600">
                Agrupado por: {{ getGroupByLabel() }}
              </p>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-4 gap-4 mb-6">
              <div class="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-3">
                <div class="text-xs text-red-600 font-semibold mb-1">Total Consumido</div>
                <div class="text-xl font-bold text-red-700">{{ getTotalValue() | number:'1.2-2' }} €</div>
              </div>
              <div class="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
                <div class="text-xs text-blue-600 font-semibold mb-1">Nº de Consumos</div>
                <div class="text-xl font-bold text-blue-700">{{ getTotalLines() }}</div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3">
                <div class="text-xs text-green-600 font-semibold mb-1">Artigos Diferentes</div>
                <div class="text-xl font-bold text-green-700">{{ getUniqueArticles() }}</div>
              </div>
              <div class="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
                <div class="text-xs text-purple-600 font-semibold mb-1">Média por Consumo</div>
                <div class="text-xl font-bold text-purple-700">{{ getAverageValue() | number:'1.2-2' }} €</div>
              </div>
            </div>

            <!-- Groups -->
            <div *ngFor="let group of groups" class="border border-gray-300 rounded-lg overflow-hidden mb-4">
              <!-- Group Header -->
              <div class="bg-gradient-to-r from-red-50 to-red-100 px-4 py-2 border-b border-gray-300">
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="font-semibold text-sm text-gray-800">{{ group.groupLabel }}</h3>
                    <p class="text-xs text-gray-600">{{ group.lines.length }} consumo(s) | {{ group.articleCount }} artigo(s)</p>
                  </div>
                  <div class="text-right">
                    <div class="text-xs text-gray-600">Total:</div>
                    <div class="text-lg font-bold text-red-700">{{ group.totalValue | number:'1.2-2' }} €</div>
                  </div>
                </div>
              </div>

              <!-- Details Table (if enabled) -->
              <div *ngIf="filters.showDetails">
                <table class="w-full text-xs">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Data</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Documento</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Artigo</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Descrição</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">C. Custo</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold">Projeto</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-right font-semibold">Qtd</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-right font-semibold">P. Unit.</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let line of group.lines" class="hover:bg-red-50">
                      <td class="border-b border-gray-200 px-2 py-1">{{ line.date | date:'dd/MM/yyyy' }}</td>
                      <td class="border-b border-gray-200 px-2 py-1">{{ line.documentNumber }}</td>
                      <td class="border-b border-gray-200 px-2 py-1 font-mono">{{ line.articleCode }}</td>
                      <td class="border-b border-gray-200 px-2 py-1">{{ line.articleName }}</td>
                      <td class="border-b border-gray-200 px-2 py-1">{{ line.costCenter }}</td>
                      <td class="border-b border-gray-200 px-2 py-1">{{ line.project }}</td>
                      <td class="border-b border-gray-200 px-2 py-1 text-right">{{ line.quantity | number:'1.2-2' }}</td>
                      <td class="border-b border-gray-200 px-2 py-1 text-right">{{ line.unitPrice | number:'1.2-2' }}</td>
                      <td class="border-b border-gray-200 px-2 py-1 text-right font-semibold text-red-700">{{ line.totalValue | number:'1.2-2' }}</td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-gray-50 font-semibold">
                    <tr>
                      <td colspan="6" class="border-t-2 border-gray-300 px-2 py-1 text-right">Subtotal:</td>
                      <td class="border-t-2 border-gray-300 px-2 py-1 text-right">{{ group.totalQuantity | number:'1.2-2' }}</td>
                      <td class="border-t-2 border-gray-300 px-2 py-1"></td>
                      <td class="border-t-2 border-gray-300 px-2 py-1 text-right text-red-700">{{ group.totalValue | number:'1.2-2' }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Summary Only (if details disabled) -->
              <div *ngIf="!filters.showDetails" class="p-3 bg-gray-50">
                <div class="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span class="text-gray-600">Quantidade Total:</span>
                    <span class="font-semibold ml-2">{{ group.totalQuantity | number:'1.2-2' }}</span>
                  </div>
                  <div>
                    <span class="text-gray-600">Valor Total:</span>
                    <span class="font-semibold ml-2 text-red-700">{{ group.totalValue | number:'1.2-2' }} €</span>
                  </div>
                  <div>
                    <span class="text-gray-600">Artigos:</span>
                    <span class="font-semibold ml-2">{{ group.articleCount }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- No Results -->
            <div *ngIf="groups.length === 0" class="text-center py-8 text-gray-400 italic">
              Nenhum consumo encontrado com os filtros selecionados.
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-3 py-1.5 bg-[#DCE4F2] border-t border-gray-300 shrink-0 text-xs text-gray-600">
          Gerado em: {{ currentDate | date:'dd/MM/yyyy HH:mm' }}
        </div>
      </div>
    </div>
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
    alert('Exportação para PDF será implementada em breve.');
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
        csvContent += `${line.costCenter};${line.project};${line.quantity.toFixed(2)};`;
        csvContent += `${line.unitPrice.toFixed(2)};${line.totalValue.toFixed(2)}\n`;
      });

      csvContent += `\nSubtotal:;;;;;${group.totalQuantity.toFixed(2)};;${group.totalValue.toFixed(2)}\n`;
    });

    csvContent += `\n\nTOTAL GERAL:;;;;;${this.groups.reduce((s, g) => s + g.totalQuantity, 0).toFixed(2)};;${this.getTotalValue().toFixed(2)}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consumos_${this.filters.dateFrom}_${this.filters.dateTo}.csv`;
    link.click();
  }

  print() {
    window.print();
  }
}
