import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';
import { ArticleSearchModalComponent } from './article-search-modal.component';
import { DocumentTypeConfigModalComponent } from '../../shared/components/document-type-config-modal.component';
import { Article } from '../../shared/models';
import { DataService } from '../../services/data.service';
import { lastValueFrom } from 'rxjs';

interface StockDocumentLine {
  id: string;
  articleId?: string; // Added to link to real article
  articleCode: string;
  articleName: string;
  warehouse: string;
  location: string;
  batch: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  generalAccount: string;
  costCenter: string;
  analytic: string;
  functional: string;
  project: string;
  pepElement: string;
  item: string;
}

interface StockDocument {
  id: string;
  series: string;
  number: number;
  type: string;
  date: string;
  time: string;
  inputType: string;
  originAccount: string;
  originCostCenter: string;
  originProject: string;
  originAnalytic: string;
  originFunctional: string;
  originPep: string;
  warehouse: string;
  lines: StockDocumentLine[];
  status: 'DRAFT' | 'POSTED';
  movementIn: string;
  componentQty: string;
  reloadComponents: boolean;
}

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, ArticleSearchModalComponent, DocumentTypeConfigModalComponent],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="saveDocument()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">save</span>
          <span>Gravar</span>
        </button>
        <button (click)="newDocument()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Novo</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">print</span>
          <span>Imprimir</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">search</span>
          <span>Procurar</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">send</span>
          <span>Enviar</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">menu</span>
          <span>Contexto</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">help</span>
          <span>Ajuda</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">close</span>
          <span>Cancelar</span>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-300 bg-white px-2 pt-2 shrink-0">
        <button 
          class="px-4 py-1 text-xs font-medium border-t border-l border-r rounded-t-sm relative top-px bg-white border-gray-300 text-blue-600 z-10"
        >
          Geral
        </button>
        <button 
          class="px-4 py-1 text-xs font-medium border-t border-l border-r border-transparent hover:bg-gray-50 text-gray-600"
        >
          Outros
        </button>
        <button 
          class="px-4 py-1 text-xs font-medium border-t border-l border-r border-transparent hover:bg-gray-50 text-gray-600"
        >
          Observações
        </button>
      </div>

      <!-- Header Form -->
      <div class="p-2 bg-[#F0F0F0] border-b border-gray-300 shrink-0 text-xs">
        <!-- Row 1: Document & Date -->
        <div class="flex items-center gap-4 mb-2">
          <div class="flex items-center gap-2 w-64">
            <label class="text-blue-700 font-medium w-20 text-right cursor-pointer hover:underline" (click)="openDocConfigModal()">Documento:</label>
            <select [(ngModel)]="currentDoc.type" (change)="onDocumentTypeChange()" class="flex-1 border border-gray-300 px-1 py-0.5 h-6 text-xs">
              <option *ngFor="let docType of documentTypes" [value]="docType.code" [disabled]="docType.isActive === false">
                {{ docType.code }} - {{ docType.name }}
              </option>
            </select>
          </div>
          
          <!-- Series and Number with Navigation -->
          <div class="flex items-center gap-1 w-40">
            <select [(ngModel)]="currentDoc.series" (change)="loadDocument(); validateSeriesDate()" class="w-16 border border-gray-300 px-1 py-0.5 h-6 bg-white text-center text-xs" title="Série">
              <option *ngFor="let s of availableSeries" [value]="s.code">{{ s.code }}</option>
            </select>
            <div class="flex items-center border border-gray-300 bg-white h-6 flex-1">
              <input type="number" [(ngModel)]="currentDoc.number" (change)="loadDocument()" class="w-full px-1 py-0.5 h-full border-none text-right focus:ring-0">
              <div class="flex flex-col border-l border-gray-300">
                <button (click)="navigateDocument(1)" class="h-3 px-0.5 hover:bg-gray-100 flex items-center justify-center border-b border-gray-300">
                  <span class="material-symbols-outlined text-[10px]">expand_less</span>
                </button>
                <button (click)="navigateDocument(-1)" class="h-3 px-0.5 hover:bg-gray-100 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[10px]">expand_more</span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex-1"></div>
          <div class="flex items-center gap-2">
            <label class="text-gray-700">Data:</label>
            <input type="date" [(ngModel)]="currentDoc.date" (change)="validateSeriesDate()" class="border border-gray-300 px-1 py-0.5 h-6 w-28">
            <input type="time" [(ngModel)]="currentDoc.time" class="border border-gray-300 px-1 py-0.5 h-6 w-20">
          </div>
        </div>

        <!-- Row 2: Input Type -->
        <div class="flex items-center gap-2 mb-2">
          <label class="text-gray-700 font-medium w-20 text-right">Tipo de Introdução:</label>
          <select [(ngModel)]="currentDoc.inputType" class="border border-gray-300 px-1 py-0.5 h-6 w-48">
            <option value="Cód. Artigo">Cód. Artigo</option>
            <option value="Código de Barras">Código de Barras</option>
            <option value="Referência">Referência</option>
          </select>
        </div>

        <!-- Group Box: Origem & Options -->
        <div class="flex gap-2">
          <!-- Left Group: Origem -->
          <fieldset class="border border-gray-300 p-2 flex-1 relative">
            <legend class="text-[10px] text-blue-700 px-1 absolute -top-2 left-2 bg-[#F0F0F0]">Origem</legend>
            
            <div class="grid grid-cols-12 gap-y-1 gap-x-2 mt-1">
              <!-- Line 1 -->
              <div class="col-span-1 text-right text-blue-700">Conta:</div>
              <div class="col-span-2">
                <div class="flex">
                  <input [(ngModel)]="currentDoc.originAccount" class="w-full border border-gray-300 px-1 h-5">
                  <button class="bg-gray-200 border border-gray-300 px-1 h-5 flex items-center justify-center hover:bg-gray-300">
                    <span class="material-symbols-outlined text-[10px]">search</span>
                  </button>
                </div>
              </div>

              <div class="col-span-1 text-right text-gray-700">C. Custo:</div>
              <div class="col-span-2">
                <input [(ngModel)]="currentDoc.originCostCenter" class="w-full border border-gray-300 px-1 h-5">
              </div>

              <div class="col-span-1 text-right text-gray-700">Projeto:</div>
              <div class="col-span-2">
                <input [(ngModel)]="currentDoc.originProject" class="w-full border border-gray-300 px-1 h-5">
              </div>
              
              <div class="col-span-3"></div>

              <!-- Line 2 -->
              <div class="col-span-1 text-right text-gray-700">Analítica:</div>
              <div class="col-span-2">
                <div class="flex">
                  <input [(ngModel)]="currentDoc.originAnalytic" class="w-full border border-gray-300 px-1 h-5">
                  <button class="bg-gray-200 border border-gray-300 px-1 h-5 flex items-center justify-center hover:bg-gray-300">
                    <span class="material-symbols-outlined text-[10px]">search</span>
                  </button>
                </div>
              </div>

              <div class="col-span-1 text-right text-gray-700">Funcional:</div>
              <div class="col-span-2">
                <input [(ngModel)]="currentDoc.originFunctional" class="w-full border border-gray-300 px-1 h-5">
              </div>

              <div class="col-span-1 text-right text-gray-700">Elemento PEP:</div>
              <div class="col-span-2">
                <div class="flex">
                  <input [(ngModel)]="currentDoc.originPep" class="w-full border border-gray-300 px-1 h-5">
                  <button class="bg-gray-200 border border-gray-300 px-1 h-5 flex items-center justify-center hover:bg-gray-300">
                    <span class="material-symbols-outlined text-[10px]">search</span>
                  </button>
                </div>
              </div>

              <div class="col-span-1 text-right text-blue-700">Armazém:</div>
              <div class="col-span-2">
                <div class="flex">
                  <input [(ngModel)]="currentDoc.warehouse" class="w-full border border-gray-300 px-1 h-5">
                  <button class="bg-gray-200 border border-gray-300 px-1 h-5 flex items-center justify-center hover:bg-gray-300">
                    <span class="material-symbols-outlined text-[10px]">search</span>
                  </button>
                </div>
              </div>
            </div>
          </fieldset>

          <!-- Right Group: Options -->
          <div class="w-64 border border-gray-300 p-2 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-gray-700">Movimento em:</label>
              <select [(ngModel)]="currentDoc.movementIn" class="border border-gray-300 px-1 h-5 w-32">
                <option value="Preço Unitário">Preço Unitário</option>
                <option value="Valor Total">Valor Total</option>
              </select>
            </div>
            <div class="flex items-center justify-between">
              <label class="text-gray-700">Qtd. Componentes:</label>
              <select [(ngModel)]="currentDoc.componentQty" class="border border-gray-300 px-1 h-5 w-32">
                <option value="Unitária">Unitária</option>
                <option value="Total">Total</option>
              </select>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <input type="checkbox" [(ngModel)]="currentDoc.reloadComponents" class="rounded border-gray-300">
              <label class="text-gray-700">Recarregar Componentes</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid -->
      <div class="flex-1 overflow-auto bg-white border-t border-gray-300 relative">
        <table class="w-full text-xs border-collapse min-w-[1200px]">
          <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="border-b border-r border-gray-300 w-6 bg-gray-100"></th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-blue-700 w-32">Artigo</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-blue-700 w-20">Armazém</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">Localização</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">Lote</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-64">Descrição</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-12">Unidade</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-right font-semibold text-blue-700 w-20">Quantidade</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-right font-semibold text-gray-700 w-24">Valor [MT]</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">C. Geral</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">Centro de Custo</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">Analítica</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">Funcional</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">Projeto</th>
              <th class="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">Elem. PEP</th>
              <th class="border-b border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-20">Item</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of currentDoc.lines; let i = index" class="hover:bg-blue-50 group">
              <td class="border-b border-r border-gray-200 bg-gray-50 text-center text-gray-400 text-[10px]">{{ i + 1 }}</td>
              
              <!-- Artigo -->
              <td class="border-b border-r border-gray-200 p-0 relative">
                <div class="flex h-full">
                  <input [(ngModel)]="line.articleCode" (blur)="onArticleChange(line)" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent">
                  <button (click)="openArticleSearch(line)" class="w-4 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 absolute right-0 top-0 bottom-0">
                    <span class="material-symbols-outlined text-[10px]">search</span>
                  </button>
                </div>
              </td>

              <!-- Armazém -->
              <td class="border-b border-r border-gray-200 p-0">
                <select [(ngModel)]="line.warehouse" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent text-xs">
                  <option value="">-</option>
                  <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }}</option>
                </select>
              </td>

              <!-- Localização -->
              <td class="border-b border-r border-gray-200 p-0">
                <select [(ngModel)]="line.location" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent text-xs">
                  <option value="">-</option>
                  <option *ngFor="let loc of locations" [value]="loc.code">{{ loc.code }}</option>
                </select>
              </td>

              <td class="border-b border-r border-gray-200 p-0">
                <input [(ngModel)]="line.batch" [attr.list]="'batches-' + i" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent">
                <datalist [id]="'batches-' + i">
                  <option *ngFor="let batch of batches" [value]="batch.code">{{ batch.description }}</option>
                </datalist>
              </td>

              <!-- Descrição -->
              <td class="border-b border-r border-gray-200 p-0">
                <input [(ngModel)]="line.description" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent">
              </td>

              <!-- Unidade -->
              <td class="border-b border-r border-gray-200 p-0">
                <select [(ngModel)]="line.unit" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent text-center text-xs">
                  <option value="">-</option>
                  <option *ngFor="let unit of units" [value]="unit.code">{{ unit.code }}</option>
                </select>
              </td>

              <!-- Quantidade -->
              <td class="border-b border-r border-gray-200 p-0">
                <input type="number" [(ngModel)]="line.quantity" (change)="calculateLine(line)" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent text-right">
              </td>

              <!-- Valor -->
              <td class="border-b border-r border-gray-200 p-0">
                <input type="number" [(ngModel)]="line.total" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent text-right">
              </td>

              <!-- Outros Campos -->
              <td class="border-b border-r border-gray-200 p-0"><input [(ngModel)]="line.generalAccount" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent"></td>
              <td class="border-b border-r border-gray-200 p-0"><input [(ngModel)]="line.costCenter" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent"></td>
              <td class="border-b border-r border-gray-200 p-0"><input [(ngModel)]="line.analytic" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent"></td>
              <td class="border-b border-r border-gray-200 p-0"><input [(ngModel)]="line.functional" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent"></td>
              <td class="border-b border-r border-gray-200 p-0"><input [(ngModel)]="line.project" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent"></td>
              <td class="border-b border-r border-gray-200 p-0"><input [(ngModel)]="line.pepElement" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent"></td>
              <td class="border-b border-gray-200 p-0"><input [(ngModel)]="line.item" class="w-full h-full px-1 border-none focus:ring-1 focus:ring-blue-500 bg-transparent"></td>
            </tr>
            
            <!-- Empty Line for New Entry -->
            <tr class="hover:bg-blue-50">
              <td class="border-b border-r border-gray-200 bg-gray-50 text-center text-gray-400 text-[10px]">*</td>
              <td class="border-b border-r border-gray-200 p-0" colspan="15">
                <button (click)="addLine()" class="w-full text-left px-2 py-1 text-gray-400 hover:text-blue-600 text-xs italic">
                  Clique aqui para adicionar uma linha...
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="px-2 py-1 bg-[#DCE4F2] border-t border-gray-300 shrink-0 flex justify-between items-center text-xs">
        <button class="flex items-center gap-1 px-2 py-0.5 border border-gray-400 bg-gray-100 hover:bg-gray-200 rounded-sm">
          <span class="material-symbols-outlined text-[14px]">expand_less</span>
          <span>Mais Detalhes</span>
        </button>
        <div class="flex gap-4 font-medium">
          <span>Total Qtd: {{ getTotalQuantity() }}</span>
          <span>Total Valor: {{ getTotalValue() | number:'1.2-2' }} MT</span>
        </div>
      </div>
    </div>

    <!-- Article Search Modal -->
    <app-article-search-modal
      [isOpen]="isArticleSearchOpen"
      (close)="isArticleSearchOpen = false"
      (select)="onArticleSelect($event)"
    ></app-article-search-modal>

    <!-- Document Config Modal -->
    <app-document-type-config-modal
      *ngIf="isConfigModalOpen"
      [module]="'INVENTORY'"
      [documentCode]="currentDoc.type"
      (close)="onConfigModalClose()"
    ></app-document-type-config-modal>
  `
})
export class StockMovementsComponent implements OnInit {
  currentDoc: StockDocument = this.getEmptyDocument();
  isArticleSearchOpen = false;
  isConfigModalOpen = false;
  activeLine: StockDocumentLine | null = null;
  availableSeries: any[] = [];
  warehouses: any[] = [];
  units: any[] = [];
  locations: any[] = [];
  batches: any[] = [];
  documentTypes: any[] = []; // Stock document types
  activeCompanyId: string | null = null;

  constructor(
    private inventoryService: InventoryService,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.loadActiveCompany();
    this.loadDocumentTypes();
    this.loadWarehouses();
    this.loadUnits();
    this.loadLocations();
    this.loadBatches();
    this.newDocument();
  }

  loadActiveCompany() {
    this.dataService.activeCompany$.subscribe(company => {
      if (company) {
        this.activeCompanyId = company.id;
      }
    });
  }

  openDocConfigModal() {
    this.isConfigModalOpen = true;
  }

  onConfigModalClose() {
    this.isConfigModalOpen = false;
    this.loadDocumentTypes(); // Reload types to reflect changes
    this.onDocumentTypeChange(); // Reload series
  }

  loadDocumentTypes() {
    this.dataService.getDocumentTypes('STOCK').subscribe(types => {
      this.documentTypes = types.filter((t: any) => t.isActive !== false);
    });
  }

  onDocumentTypeChange() {
    // Find the selected document type configuration
    const docType = this.documentTypes.find(t => t.code === this.currentDoc.type);
    if (docType) {
      // Load series
      if (docType.series && docType.series.length > 0) {
        if (this.activeCompanyId) {
          this.availableSeries = docType.series.filter((s: any) => s.active && s.companyId === this.activeCompanyId);
        } else {
          this.availableSeries = docType.series.filter((s: any) => s.active && !s.companyId);
        }
      } else {
        const currentYear = new Date().getFullYear().toString();
        this.availableSeries = [
          { code: currentYear, description: `Série ${currentYear}` },
          { code: 'A', description: 'Série A' }
        ];
      }

      // Set default series
      if (this.availableSeries.length > 0) {
        const currentExists = this.availableSeries.find(s => s.code === this.currentDoc.series);
        if (!this.currentDoc.series || !currentExists) {
          const defaultS = this.availableSeries.find(s => s.isDefault);
          this.currentDoc.series = defaultS ? defaultS.code : this.availableSeries[0].code;
        }
      }

      // Update document number for new type
      this.currentDoc.number = this.getNextDocumentNumber(this.currentDoc.type, this.currentDoc.series);
    }
  }

  getEmptyDocument(): StockDocument {
    const currentYear = new Date().getFullYear().toString();
    return {
      id: '',
      series: currentYear,
      number: 0,
      type: 'SI',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      inputType: 'Cód. Artigo',
      originAccount: '',
      originCostCenter: '',
      originProject: '',
      originAnalytic: '',
      originFunctional: '',
      originPep: '',
      warehouse: '',
      lines: [],
      status: 'DRAFT',
      movementIn: 'Preço Unitário',
      componentQty: 'Unitária',
      reloadComponents: false
    };
  }


  loadWarehouses() {
    const stored = localStorage.getItem('erp_warehouses');
    if (stored) {
      this.warehouses = JSON.parse(stored);
    }
  }

  loadUnits() {
    const stored = localStorage.getItem('erp_units');
    if (stored) {
      this.units = JSON.parse(stored);
    } else {
      // Default units
      this.units = [
        { id: 'U1', code: 'UN', description: 'Unidade' },
        { id: 'U2', code: 'KG', description: 'Quilograma' },
        { id: 'U3', code: 'L', description: 'Litro' },
        { id: 'U4', code: 'M', description: 'Metro' },
        { id: 'U5', code: 'CX', description: 'Caixa' },
        { id: 'U6', code: 'PC', description: 'Peça' }
      ];
    }
  }

  loadLocations() {
    const stored = localStorage.getItem('erp_locations');
    if (stored) {
      this.locations = JSON.parse(stored);
    } else {
      // Default locations
      this.locations = [
        { id: 'L1', code: 'A-01', description: 'Corredor A - Prateleira 01' },
        { id: 'L2', code: 'A-02', description: 'Corredor A - Prateleira 02' },
        { id: 'L3', code: 'B-01', description: 'Corredor B - Prateleira 01' },
        { id: 'L4', code: 'B-02', description: 'Corredor B - Prateleira 02' }
      ];
      localStorage.setItem('erp_locations', JSON.stringify(this.locations));
    }
  }

  loadBatches() {
    const stored = localStorage.getItem('erp_batches');
    if (stored) {
      this.batches = JSON.parse(stored);
    }
  }



  newDocument() {
    this.currentDoc = this.getEmptyDocument();
    // Load next number logic
    this.currentDoc.number = this.getNextDocumentNumber(this.currentDoc.type, this.currentDoc.series);
    this.addLine(); // Start with one empty line
  }

  getNextDocumentNumber(type: string, series: string): number {
    const stored = localStorage.getItem('erp_stock_documents');
    if (!stored) return 1;
    const documents = JSON.parse(stored) as StockDocument[];
    const max = documents
      .filter(d => d.type === type && d.series === series)
      .reduce((max, d) => Math.max(max, d.number), 0);
    return max + 1;
  }

  loadDocument() {
    const stored = localStorage.getItem('erp_stock_documents');
    if (!stored) return;
    const documents = JSON.parse(stored) as StockDocument[];

    const doc = documents.find(d =>
      d.type === this.currentDoc.type &&
      d.series === this.currentDoc.series &&
      d.number === this.currentDoc.number
    );

    if (doc) {
      this.currentDoc = doc;
    } else {
      // If not found, maybe clear lines but keep header info? Or just show empty?
      // For now, let's assume if user types a number that doesn't exist, we treat it as new if it's next in sequence, or error.
      // But simpler: if not found, reset to empty (but keep number/series/type)
      const number = this.currentDoc.number;
      const series = this.currentDoc.series;
      const type = this.currentDoc.type;
      this.currentDoc = this.getEmptyDocument();
      this.currentDoc.number = number;
      this.currentDoc.series = series;
      this.currentDoc.type = type;
      this.addLine();
    }
  }

  navigateDocument(direction: number) {
    this.currentDoc.number += direction;
    if (this.currentDoc.number < 1) this.currentDoc.number = 1;
    this.loadDocument();
  }

  addLine() {
    this.currentDoc.lines.push({
      id: Date.now().toString(),
      articleCode: '',
      articleName: '',
      warehouse: this.currentDoc.warehouse,
      location: '',
      batch: '',
      description: '',
      unit: '',
      quantity: 0,
      unitPrice: 0,
      total: 0,
      generalAccount: '',
      costCenter: '',
      analytic: '',
      functional: '',
      project: '',
      pepElement: '',
      item: ''
    });
  }

  openArticleSearch(line: StockDocumentLine) {
    this.activeLine = line;
    this.isArticleSearchOpen = true;
  }

  onArticleSelect(article: Article) {
    if (this.activeLine) {
      this.activeLine.articleId = article.id;
      this.activeLine.articleCode = article.code;
      this.activeLine.articleName = article.name || article.description;
      this.activeLine.description = article.description || article.name;
      this.activeLine.unit = article.unit;
      this.activeLine.unitPrice = article.purchasePrice || 0; // Use purchase price for stock docs usually
      this.calculateLine(this.activeLine);
    }
  }

  onArticleChange(line: StockDocumentLine) {
    if (line.articleCode) {
      const article = this.inventoryService.getArticleByCode(line.articleCode);
      if (article) {
        this.onArticleSelect(article);
      }
    }
  }

  calculateLine(line: StockDocumentLine) {
    line.total = line.quantity * line.unitPrice;
  }

  getTotalQuantity(): number {
    return this.currentDoc.lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  }

  getTotalValue(): number {
    return this.currentDoc.lines.reduce((sum, line) => sum + (line.total || 0), 0);
  }

  async saveDocument() {
    // Validate Series Date
    const allSeries = await lastValueFrom(this.dataService.getSeries(this.activeCompanyId || undefined));
    const docTypes = await lastValueFrom(this.dataService.getDocumentTypes('STOCK'));
    const docTypeConfig = docTypes.find((t: any) => t.code === this.currentDoc.type);

    // Check series in docType first, then global
    const docTypeSeries = docTypeConfig?.series || [];
    const seriesDef = docTypeSeries.find((s: any) => s.code === this.currentDoc.series && s.companyId === this.activeCompanyId)
      || allSeries.find((s: any) => s.code === this.currentDoc.series && s.companyId === this.activeCompanyId);

    const series = seriesDef || this.availableSeries.find(s => s.code === this.currentDoc.series);

    if (series && series.startDate && series.endDate) {
      const docDate = new Date(this.currentDoc.date);
      const start = new Date(series.startDate);
      const end = new Date(series.endDate);

      // Reset hours for pure date comparison
      docDate.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (docDate < start || docDate > end) {
        alert(`A data do documento está fora do intervalo de validade da série ${series.code} (${series.startDate} a ${series.endDate}).\n\nPor favor altere a data ou selecione outra série.`);
        return;
      }
    }

    // Basic validation
    if (this.currentDoc.lines.length === 0 || !this.currentDoc.lines[0].articleCode) {
      alert('Adicione pelo menos um artigo.');
      return;
    }

    if (!this.currentDoc.series) {
      alert('A série do documento é obrigatória.');
      return;
    }

    if (!this.currentDoc.number) {
      alert('O número do documento é obrigatório.');
      return;
    }

    if (this.currentDoc.status === 'POSTED') {
      alert('Este documento já foi gravado.');
      return;
    }

    // Determine movement type based on document type configuration
    const docType = this.documentTypes.find(t => t.code === this.currentDoc.type);
    let movementType: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' = 'ADJUSTMENT';

    if (docType) {
      // Use configured movement type
      if (docType.movementType === 'IN') movementType = 'IN';
      else if (docType.movementType === 'OUT') movementType = 'OUT';
      else if (docType.category === 'TRANSFER') movementType = 'TRANSFER';
    } else {
      // Fallback to old logic if type not found
      const inTypes = ['FI', 'ES', 'SI', 'AIP', 'CP', 'LE'];
      const outTypes = ['FS', 'SS', 'AIN', 'DP', 'LDN', 'LD'];

      if (inTypes.includes(this.currentDoc.type)) movementType = 'IN';
      else if (outTypes.includes(this.currentDoc.type)) movementType = 'OUT';
      else if (['TA', 'TAV'].includes(this.currentDoc.type)) movementType = 'TRANSFER';
    }

    // Save logic
    const stored = localStorage.getItem('erp_stock_documents');
    const documents = stored ? JSON.parse(stored) : [];

    // Check if updating existing draft (not implemented fully, assuming new for now)
    if (!this.currentDoc.id) {
      this.currentDoc.id = `DOC${Date.now()}`;
    }

    this.currentDoc.status = 'POSTED';

    // Create stock movements for each line
    this.currentDoc.lines.forEach(line => {
      if (!line.articleCode || line.quantity <= 0) return;

      // Get article ID if missing
      if (!line.articleId) {
        const article = this.inventoryService.getArticleByCode(line.articleCode);
        if (article) line.articleId = article.id;
      }

      if (line.articleId) {
        this.inventoryService.createStockMovement({
          date: new Date(this.currentDoc.date),
          articleId: line.articleId,
          articleCode: line.articleCode,
          articleName: line.articleName,
          warehouseId: line.warehouse || 'ARM01', // Default if empty
          movementType: movementType,
          quantity: line.quantity,
          unitCost: line.unitPrice,
          totalCost: line.total,
          reference: `${this.currentDoc.type} ${this.currentDoc.series}/${this.currentDoc.number}`,
          sourceDocument: this.currentDoc.id,
          notes: line.description
        });
      }
    });

    documents.push(this.currentDoc);
    localStorage.setItem('erp_stock_documents', JSON.stringify(documents));

    alert(`Documento ${this.currentDoc.type} ${this.currentDoc.series}/${this.currentDoc.number} gravado com sucesso!`);

    // Prepare for next document
    this.newDocument();
  }
  async validateSeriesDate() {
    const allSeries = await lastValueFrom(this.dataService.getSeries(this.activeCompanyId || undefined));
    const docTypes = await lastValueFrom(this.dataService.getDocumentTypes('STOCK'));
    const docTypeConfig = docTypes.find((t: any) => t.code === this.currentDoc.type);

    // Check series in docType first, then global
    const docTypeSeries = docTypeConfig?.series || [];
    const seriesDef = docTypeSeries.find((s: any) => s.code === this.currentDoc.series && s.companyId === this.activeCompanyId)
      || allSeries.find((s: any) => s.code === this.currentDoc.series && s.companyId === this.activeCompanyId);

    const series = seriesDef || this.availableSeries.find(s => s.code === this.currentDoc.series);

    if (series && series.startDate && series.endDate) {
      const docDate = new Date(this.currentDoc.date);
      const start = new Date(series.startDate);
      const end = new Date(series.endDate);

      // Reset hours for pure date comparison
      docDate.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (docDate < start || docDate > end) {
        alert(`A data do documento está fora do intervalo de validade da série ${series.code} (${series.startDate} a ${series.endDate}).\n\nPor favor altere a data ou selecione outra série.`);
      }
    }
  }
}
