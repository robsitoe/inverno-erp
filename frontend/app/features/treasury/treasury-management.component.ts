import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AccountingService } from '../../shared/accounting.service';
import { AuditService } from '../../shared/audit.service';
import { PeriodService } from '../../shared/period.service';
import { DataService } from '../../services/data.service';
import { EntityListModalComponent } from '../../shared/components/entity-list-modal.component';
import { SupplierListModalComponent } from '../../shared/components/supplier-list-modal.component';
import { DocumentTypeConfigModalComponent } from '../../shared/components/document-type-config-modal.component';

interface PendingDocRow {
  selected: boolean;
  id: string;
  date: string;
  dueDate: string;
  currency: string;
  docType: string;
  docNumber: string;
  total: number;
  pending: number;
  toPay: number;
  discount: number;
  paymentMode: string;
  paymentCode: string;
  commercialEntity: string;
  originalDoc: any;
}

@Component({
  selector: 'app-treasury-management',
  standalone: true,
  imports: [CommonModule, FormsModule, EntityListModalComponent, SupplierListModalComponent, DocumentTypeConfigModalComponent],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0] text-xs font-sans relative">
      <!-- Window Header (Title Bar) -->
      <div class="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-2 py-1 flex justify-between items-center shrink-0 select-none"
           [ngClass]="{'from-red-700 to-red-600': entityType === 'SUPPLIER'}">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px]">payments</span>
          <span class="font-bold">Contas Correntes ({{ entityType === 'CUSTOMER' ? 'Recebimentos' : 'Pagamentos' }})</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="confirmSave()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
          <span class="material-symbols-outlined text-[18px] text-blue-600">save</span>
          <span>Confirmar</span>
        </button>
        <button (click)="resetForm()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
          <span class="material-symbols-outlined text-[18px] text-green-600">add_circle</span>
          <span>Novo</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
          <span class="material-symbols-outlined text-[18px]">print</span>
          <span>Imprimir</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button (click)="loadPendingDocuments()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
          <span class="material-symbols-outlined text-[18px] text-green-600">refresh</span>
          <span>Atualizar</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
          <span class="material-symbols-outlined text-[18px]">search</span>
          <span>Procurar</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
          <span class="material-symbols-outlined text-[18px] text-blue-400">help</span>
          <span>Ajuda</span>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex items-end px-1 pt-2 border-b border-gray-300 bg-[#E0E0E0] shrink-0 gap-1">
        <button *ngFor="let tab of tabs; let i = index"
          (click)="activeTab = i"
          [class]="'px-3 py-1 border-t-2 border-x border-b-0 rounded-t-sm text-[11px] font-medium transition-colors relative -mb-px cursor-pointer ' + 
            (i === activeTab ? 'bg-[#F0F0F0] border-t-blue-600 border-x-gray-300 text-black pb-1.5 z-10' : 'bg-[#D4D4D4] border-t-transparent border-x-transparent hover:bg-[#E8E8E8] text-gray-600')"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Main Content -->
      <div class="flex-1 bg-[#F0F0F0] p-2 flex flex-col gap-2 overflow-hidden">
        
        <!-- Filters Area -->
        <div *ngIf="activeTab === 0" class="flex flex-col gap-2 h-full">
          
          <!-- Top Filters -->
          <div class="grid grid-cols-[1fr_300px] gap-2">
            <!-- Left: Entity & Date Filters -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <label class="w-24 text-right font-medium text-gray-700">Tipo de Entidade:</label>
                <select [(ngModel)]="entityType" (change)="onEntityTypeChange()" class="w-40 border border-gray-300 rounded-sm px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500">
                  <option value="CUSTOMER">Cliente</option>
                  <option value="SUPPLIER">Fornecedor</option>
                  <option value="OTHER">Outros</option>
                </select>
                <div class="flex items-center gap-1 ml-4">
                  <input type="checkbox" id="includeAssociated" class="rounded-sm border-gray-300 text-blue-600 focus:ring-0">
                  <label for="includeAssociated" class="text-gray-700">Incluir entidades associadas</label>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <label class="w-24 text-right font-medium text-blue-700 cursor-pointer hover:underline" (click)="openEntityModal()">
                  {{ entityType === 'CUSTOMER' ? 'Cliente:' : (entityType === 'SUPPLIER' ? 'Fornecedor:' : 'Entidade:') }}
                </label>
                <div class="flex-1 flex items-center bg-white border border-gray-300 rounded-sm">
                  <input type="text" [(ngModel)]="entityName" readonly class="flex-1 px-2 py-0.5 border-none focus:ring-0 text-gray-700" placeholder="Selecione a entidade...">
                  <button (click)="openEntityModal()" class="px-1 text-gray-500 hover:text-blue-600">...</button>
                </div>
                <span class="w-16 text-right text-gray-500">{{ entityCode }}</span>
              </div>

              <div class="flex items-center gap-2">
                <label class="w-24 text-right font-medium text-gray-700">Data Doc. até:</label>
                <input type="date" [(ngModel)]="filterDateUntil" class="w-32 border border-gray-300 rounded-sm px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500">
                
                <div class="flex items-center gap-1 ml-8">
                  <input type="checkbox" id="onlyOverdue" class="rounded-sm border-gray-300 text-blue-600 focus:ring-0">
                  <label for="onlyOverdue" class="text-gray-700">Só vencidos até</label>
                </div>
                <input type="date" class="w-32 border border-gray-300 rounded-sm px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500 ml-2">
              </div>
            </div>

            <!-- Right: Totals Panel -->
            <div class="bg-white border border-gray-300 p-2 shadow-sm text-right flex flex-col justify-between">
              <div class="grid grid-cols-[1fr_100px] gap-y-1 text-gray-700">
                <span>Valor:</span>
                <span class="font-mono font-bold">{{ totalSelected | number:'1.2-2' }}</span>
                
                <span>Descontos:</span>
                <span class="font-mono">0,00</span>
                
                <span>Retenções:</span>
                <span class="font-mono">0,00</span>
                
                <span>V. Excesso:</span>
                <span class="font-mono">{{ totalExcess | number:'1.2-2' }}</span>
                
                <div class="col-span-2 h-px bg-gray-200 my-1"></div>
                
                <span class="font-bold text-black">Total:</span>
                <span class="font-mono font-bold text-black">{{ totalSelected | number:'1.2-2' }}</span>
              </div>
              
              <div class="grid grid-cols-[1fr_100px] gap-y-1 text-gray-500 mt-2 text-[10px]">
                <span>Moeda:</span>
                <span>Metical</span>
                
                <span>Câmbio:</span>
                <span>1,0000000</span>
              </div>
            </div>
          </div>

          <!-- Document Selection Bar -->
          <div class="flex items-center gap-2 bg-gray-100 p-1 border border-gray-300 rounded-sm mt-1">
            <label class="text-blue-600 font-medium ml-1 cursor-pointer hover:underline" (click)="openDocConfigModal()">Documento:</label>
            <select [(ngModel)]="selectedDocType" (change)="onDocumentTypeChange()" class="w-16 border border-gray-300 rounded-sm px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500">
              <option *ngFor="let t of documentTypes" [value]="t.code">{{t.code}}</option>
            </select>
            <span class="text-gray-500 italic flex-1">{{ getDocDescription(selectedDocType) }}</span>
            
            <select [(ngModel)]="selectedSeries" (change)="loadNextNumber(); validateSeriesDate()" class="w-20 border border-gray-300 rounded-sm px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500">
              <option *ngFor="let s of availableSeries" [value]="s.code">{{s.code}}</option>
            </select>
            
            <input type="number" [(ngModel)]="currentSeriesNumber" (change)="updateDocNumberString()" class="w-20 border border-gray-300 rounded-sm px-1 py-0.5 text-right focus:outline-none focus:border-blue-500">
            
            <input type="date" [(ngModel)]="docDate" (change)="validateSeriesDate()" class="w-28 border border-gray-300 rounded-sm px-1 py-0.5 focus:outline-none focus:border-blue-500">
          </div>

          <!-- Grid -->
          <div class="flex-1 bg-white border border-gray-300 overflow-auto relative mt-1">
            <table class="w-full border-collapse table-fixed">
              <thead class="bg-gray-50 sticky top-0 z-10 text-[10px] text-gray-600 font-bold border-b border-gray-300">
                <tr>
                  <th class="w-8 py-1 border-r border-gray-200 text-center">Cf.</th>
                  <th class="w-20 py-1 border-r border-gray-200 text-left px-1">Data Doc.</th>
                  <th class="w-20 py-1 border-r border-gray-200 text-left px-1 text-red-600">Data Venc.</th>
                  <th class="w-12 py-1 border-r border-gray-200 text-center">Moeda</th>
                  <th class="w-24 py-1 border-r border-gray-200 text-left px-1 text-blue-600">Documento</th>
                  <th class="w-16 py-1 border-r border-gray-200 text-left px-1 text-blue-600">N.º Doc.</th>
                  <th class="w-24 py-1 border-r border-gray-200 text-right px-1">Total</th>
                  <th class="w-24 py-1 border-r border-gray-200 text-right px-1 text-blue-600">Pendente</th>
                  <th class="w-24 py-1 border-r border-gray-200 text-right px-1 font-bold">A Pagar</th>
                  <th class="w-16 py-1 border-r border-gray-200 text-right px-1">Desc.</th>
                  <th class="w-20 py-1 border-r border-gray-200 text-left px-1">Modo Pag.</th>
                  <th class="w-16 py-1 border-r border-gray-200 text-left px-1">Cd. Pag.</th>
                  <th class="py-1 text-left px-1">Entidade Comer.</th>
                </tr>
              </thead>
              <tbody class="text-[11px]">
                <tr *ngFor="let row of pendingRows" class="border-b border-gray-100 hover:bg-blue-50">
                  <td class="text-center border-r border-gray-100">
                    <input type="checkbox" [(ngModel)]="row.selected" (change)="onRowSelect(row)" class="rounded-sm border-gray-300 text-blue-600 focus:ring-0 w-3 h-3">
                  </td>
                  <td class="px-1 border-r border-gray-100">{{ row.date | date:'dd/MM/yyyy' }}</td>
                  <td class="px-1 border-r border-gray-100 text-red-600">{{ row.dueDate | date:'dd/MM/yyyy' }}</td>
                  <td class="px-1 border-r border-gray-100 text-center">{{ row.currency }}</td>
                  <td class="px-1 border-r border-gray-100">{{ row.docType }}</td>
                  <td class="px-1 border-r border-gray-100">{{ row.docNumber.split('/')[1] }}</td>
                  <td class="px-1 border-r border-gray-100 text-right">{{ row.total | number:'1.2-2' }}</td>
                  <td class="px-1 border-r border-gray-100 text-right text-blue-600">{{ row.pending | number:'1.2-2' }}</td>
                  <td class="px-1 border-r border-gray-100 text-right font-medium relative p-0">
                    <input type="number" [(ngModel)]="row.toPay" (change)="onAmountChange(row)" class="w-full h-full text-right px-1 border-none bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500">
                  </td>
                  <td class="px-1 border-r border-gray-100 text-right">{{ row.discount | number:'1.2-2' }}</td>
                  <td class="px-1 border-r border-gray-100 p-0 relative group">
                    <input type="text" [(ngModel)]="row.paymentMode" (keydown.f4)="openPaymentModeModal(row)" readonly
                           class="w-full h-full px-1 border-none bg-transparent cursor-pointer focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                           title="Pressione F4 para selecionar">
                    <button (click)="openPaymentModeModal(row)" class="absolute right-0 top-0 bottom-0 px-1 text-gray-400 hover:text-blue-600 hidden group-hover:block">
                      <span class="material-symbols-outlined text-[14px]">more_horiz</span>
                    </button>
                  </td>
                  <td class="px-1 border-r border-gray-100">{{ row.paymentCode }}</td>
                  <td class="px-1">{{ row.commercialEntity }}</td>
                </tr>
                <tr *ngIf="pendingRows.length === 0">
                  <td colspan="13" class="text-center py-8 text-gray-400 italic">
                    Nenhum documento pendente encontrado para esta entidade.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Observations Area -->
          <div class="h-24 bg-white border border-gray-300 mt-1 p-1 flex flex-col">
            <label class="text-[10px] font-bold text-gray-700 mb-0.5">Observações:</label>
            <textarea [(ngModel)]="observations" class="flex-1 w-full border-none resize-none focus:ring-0 text-xs font-sans bg-transparent outline-none" placeholder="Insira observações aqui..."></textarea>
          </div>

          <!-- Status Bar -->
          <div class="bg-gray-100 border-t border-gray-300 px-2 py-0.5 text-[10px] text-gray-600 flex justify-between mt-1">
            <span>{{ pendingRows.length }} Registo(s)</span>
            <span>Inverno ERP</span>
          </div>
        </div>

        <!-- Other Tabs Placeholder -->
        <div *ngIf="activeTab === 1" class="flex flex-col gap-2 p-4">
           <div class="grid grid-cols-2 gap-4">
             <div>
                <label class="block font-medium mb-1">Conta de Tesouraria</label>
                <select [(ngModel)]="selectedTreasuryAccount" class="w-full border border-gray-300 rounded px-2 py-1">
                  <option value="">Selecione...</option>
                  <option *ngFor="let acc of treasuryAccounts" [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
                </select>
             </div>
             <div>
                <label class="block font-medium mb-1">Meio de Pagamento (Padrão)</label>
                <select [(ngModel)]="paymentMethod" class="w-full border border-gray-300 rounded px-2 py-1">
                  <option value="CASH">Numerário</option>
                  <option value="CHECK">Cheque</option>
                  <option value="TRANSFER">Transferência</option>
                </select>
             </div>
           </div>
        </div>
      </div>

      <!-- Payment Mode Modal -->
      <div *ngIf="showPaymentModeModal" class="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
        <div class="bg-white rounded shadow-lg border border-gray-300 w-80 flex flex-col">
          <div class="bg-gray-100 px-2 py-1 border-b border-gray-300 flex justify-between items-center">
            <span class="font-bold text-gray-700">Modos de Pagamento</span>
            <button (click)="showPaymentModeModal = false" class="hover:text-red-500"><span class="material-symbols-outlined text-[16px]">close</span></button>
          </div>
          <div class="max-h-60 overflow-y-auto p-1">
            <table class="w-full text-[11px] border-collapse">
              <thead class="bg-gray-50 text-left">
                <tr>
                  <th class="border-b border-gray-200 px-2 py-1">Código</th>
                  <th class="border-b border-gray-200 px-2 py-1">Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let mode of paymentModes" (click)="selectPaymentMode(mode)" class="hover:bg-blue-50 cursor-pointer border-b border-gray-100">
                  <td class="px-2 py-1 font-medium">{{ mode.code }}</td>
                  <td class="px-2 py-1">{{ mode.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>

    <app-entity-list-modal
      *ngIf="showCustomerModal"
      (close)="showCustomerModal = false"
      (select)="onEntitySelect($event)"
    ></app-entity-list-modal>

    <app-supplier-list-modal
      *ngIf="showSupplierModal"
      (close)="showSupplierModal = false"
      (select)="onEntitySelect($event)"
    ></app-supplier-list-modal>

    <app-document-type-config-modal
      *ngIf="isConfigModalOpen"
      [module]="'TREASURY'"
      [documentCode]="selectedDocType"
      (close)="onConfigModalClose()"
    ></app-document-type-config-modal>
  `
})
export class TreasuryManagementComponent implements OnInit {
  tabs = ['Gerais', 'Dados Liquidação', 'Distribuição Automática', 'Restrições', 'Restrições das Atividades'];
  activeTab = 0;

  // Filters
  entityType: 'CUSTOMER' | 'SUPPLIER' | 'OTHER' = 'CUSTOMER';
  entityCode = '';
  entityName = '';
  filterDateUntil = new Date().toISOString().split('T')[0];

  // Document Info
  documentTypes: any[] = [];
  availableSeries: any[] = [];
  selectedDocType = '';
  selectedSeries = '';
  currentSeriesNumber = 1;
  docDate = new Date().toISOString().split('T')[0];
  docNumberString = '';
  observations = '';

  // Grid
  pendingRows: PendingDocRow[] = [];
  totalSelected = 0;
  totalExcess = 0;

  // Liquidation Data
  selectedTreasuryAccount = '';
  paymentMethod = 'CASH';
  treasuryAccounts: any[] = [];

  showCustomerModal = false;
  showSupplierModal = false;
  activeCompanyId: string | null = null;
  isConfigModalOpen = false;

  openDocConfigModal() {
    this.isConfigModalOpen = true;
  }

  onConfigModalClose() {
    this.isConfigModalOpen = false;
    const currentSelection = this.selectedDocType;
    this.loadDocumentTypes();

    // Restore selection if possible, otherwise loadDocumentTypes sets a default
    if (currentSelection && this.documentTypes.some(t => t.code === currentSelection)) {
      this.selectedDocType = currentSelection;
      this.onDocumentTypeChange();
    }
  }

  // Payment Mode Modal
  showPaymentModeModal = false;
  activeRow: PendingDocRow | null = null;
  paymentModes = [
    { code: 'NUM', description: 'Numerário' },
    { code: 'CHQ', description: 'Cheque' },
    { code: 'TRA', description: 'Transferência Bancária' },
    { code: 'POS', description: 'Cartão de Débito/Crédito' },
    { code: 'OUT', description: 'Outros' }
  ];

  constructor(
    private accountingService: AccountingService,
    private auditService: AuditService,
    private periodService: PeriodService,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.loadActiveCompany();
    this.loadTreasuryAccounts();
    this.onEntityTypeChange(); // Load initial document types
  }

  loadActiveCompany() {
    this.dataService.getCompanyInfo().subscribe(info => {
      this.activeCompanyId = info.id;
    });
  }

  onEntityTypeChange() {
    // Reset Entity
    this.entityCode = '';
    this.entityName = '';
    this.pendingRows = [];
    this.totalSelected = 0;
    this.totalExcess = 0;

    this.loadDocumentTypes();
  }

  loadDocumentTypes() {
    this.dataService.getTreasuryDocuments().subscribe(docs => {
      // Note: getTreasuryDocuments returns documents, not types.
      // We need to fetch TYPES. DataService doesn't have getTreasuryDocumentTypes yet?
      // Let's assume we need to implement it or use localStorage for now if not available.
      // Actually, document types are usually configuration, maybe not yet fully in DataService as API.
      // But wait, I see `erp_treasury_document_types` in localStorage usage.
      // Let's stick to localStorage for Types for now as they are config, but Series should be from DataService.

      const stored = localStorage.getItem('erp_treasury_document_types');
      if (stored) {
        const allTypes = JSON.parse(stored);

        this.documentTypes = allTypes.filter((t: any) => {
          // If allowedEntities is defined, use it for more precise filtering
          if (t.allowedEntities) {
            if (this.entityType === 'CUSTOMER') return t.allowedEntities.customer;
            if (this.entityType === 'SUPPLIER') return t.allowedEntities.supplier;
            if (this.entityType === 'OTHER') return t.allowedEntities.other || t.allowedEntities.state || t.allowedEntities.shareholder || t.allowedEntities.bank;
            return false;
          }

          // Fallback to nature for backward compatibility
          if (this.entityType === 'CUSTOMER') return t.nature === 'RECEIVE';
          if (this.entityType === 'SUPPLIER') return t.nature === 'PAY';
          return false;
        });
      }

      // Default selection
      if (this.documentTypes.length > 0) {
        // Try to maintain current selection if valid
        if (this.selectedDocType && this.documentTypes.some(t => t.code === this.selectedDocType)) {
          // Keep current
        } else {
          // Prefer RE for Customer, PAG for Supplier
          let defaultCode = '';
          if (this.entityType === 'CUSTOMER') defaultCode = 'RE';
          else if (this.entityType === 'SUPPLIER') defaultCode = 'PAG';

          const def = this.documentTypes.find(t => t.code === defaultCode);
          this.selectedDocType = def ? def.code : this.documentTypes[0].code;
        }
        this.onDocumentTypeChange();
      } else {
        this.selectedDocType = '';
        this.availableSeries = [];
        this.onDocumentTypeChange();
      }
    });
  }

  onDocumentTypeChange() {
    const docType = this.documentTypes.find(t => t.code === this.selectedDocType);
    this.availableSeries = [];

    // 1. Try to get series configured specifically for this document type
    if (docType && docType.series && docType.series.length > 0) {
      if (this.activeCompanyId) {
        // Use loose equality to handle string/number mismatches
        this.availableSeries = docType.series.filter((s: any) => s.active && s.companyId == this.activeCompanyId);
      } else {
        this.availableSeries = docType.series.filter((s: any) => s.active && !s.companyId);
      }
    }

    // 2. If no specific series found, fallback to ALL active series for the company
    if (this.availableSeries.length === 0 && this.activeCompanyId) {
      this.dataService.getSeries(this.activeCompanyId).subscribe(allSeries => {
        this.availableSeries = allSeries.filter((s: any) => s.active);
        this.finalizeSeriesSelection();
      });
    } else {
      this.finalizeSeriesSelection();
    }
  }

  finalizeSeriesSelection() {
    // Sort series by code descending (newest first usually)
    this.availableSeries.sort((a, b) => b.code.localeCompare(a.code));

    // Select the first one (usually the most recent year)
    if (this.availableSeries.length > 0) {
      // If previously selected series is in the new list, keep it
      if (this.selectedSeries && this.availableSeries.some(s => s.code === this.selectedSeries)) {
        // keep selection
      } else {
        this.selectedSeries = this.availableSeries[0].code;
      }
    } else {
      this.selectedSeries = '';
    }

    this.loadNextNumber();
  }

  loadNextNumber() {
    const isReceipt = this.entityType === 'CUSTOMER';
    const observable = isReceipt ? this.dataService.getReceipts() : this.dataService.getPayments();

    observable.subscribe(docs => {
      let nextNum = 1;
      const relevant = docs.filter((r: any) =>
        r.docType === this.selectedDocType && r.series === this.selectedSeries
      );
      if (relevant.length > 0) {
        nextNum = Math.max(...relevant.map((r: any) => r.seriesNumber || 0)) + 1;
      }
      this.currentSeriesNumber = nextNum;
      this.updateDocNumberString();
    });
  }

  updateDocNumberString() {
    this.docNumberString = `${this.selectedDocType} ${this.selectedSeries}/${this.currentSeriesNumber}`;
  }

  getDocDescription(code: string): string {
    const doc = this.documentTypes.find(t => t.code === code);
    return doc ? doc.description : '';
  }

  loadTreasuryAccounts() {
    this.treasuryAccounts = this.accountingService.getAccounts()
      .filter(a => a.allowPosting && (a.code.startsWith('11') || a.code.startsWith('12')));

    if (this.treasuryAccounts.length > 0) {
      this.selectedTreasuryAccount = this.treasuryAccounts[0].id;
    }
  }

  openEntityModal() {
    if (this.entityType === 'CUSTOMER') {
      this.showCustomerModal = true;
    } else if (this.entityType === 'SUPPLIER') {
      this.showSupplierModal = true;
    }
  }

  selectedEntity: any = null;

  onEntitySelect(entity: any) {
    this.selectedEntity = entity;
    this.entityCode = entity.code;
    this.entityName = entity.name;
    this.showCustomerModal = false;
    this.showSupplierModal = false;
    this.loadPendingDocuments();
  }

  loadPendingDocuments() {
    if (!this.entityName) return;

    if (this.entityType === 'CUSTOMER') {
      forkJoin({
        sales: this.dataService.getSalesDocuments(),
        receipts: this.dataService.getReceipts()
      }).subscribe(({ sales, receipts }) => {
        const entityDocs = sales.filter((d: any) =>
          (d.customerName === this.entityName || d.customerId === this.entityCode) &&
          (d.status === 'CONFIRMED' || d.status === 'INVOICED' || d.status === 'POSTED' || d.status === 'DRAFT')
        );
        this.processPendingDocuments(entityDocs, receipts);
      });
    } else if (this.entityType === 'SUPPLIER') {
      forkJoin({
        purchases: this.dataService.getPurchaseDocuments(),
        payments: this.dataService.getPayments()
      }).subscribe(({ purchases, payments }) => {
        const entityDocs = purchases.filter((d: any) =>
          (d.supplierName === this.entityName || d.supplierCode === this.entityCode) &&
          (d.status === 'POSTED' || d.status === 'CONFIRMED' || d.status === 'DRAFT')
        );
        this.processPendingDocuments(entityDocs, payments);
      });
    }
  }

  processPendingDocuments(entityDocs: any[], existingPayments: any[]) {
    this.pendingRows = entityDocs.map((doc: any) => {
      // Calculate already paid amount
      const rawDocType = doc.documentType || doc.type || 'FC';
      const docNum = doc.documentNumber || `${rawDocType} ${doc.series}/${doc.number}`;

      const relatedDocs = existingPayments.filter((p: any) => p.relatedDocument === docNum);
      const paidAmount = relatedDocs.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Fix: Use totalValue for Purchase Docs if total is missing
      const docTotal = doc.total || doc.totalValue || 0;
      const pending = docTotal - paidAmount;

      if (pending <= 1) return null;

      return {
        selected: false,
        id: doc.id,
        date: doc.date,
        dueDate: doc.dueDate,
        currency: 'MT',
        docType: doc.status === 'DRAFT' ? `${rawDocType} (Rascunho)` : rawDocType,
        docNumber: docNum,
        total: docTotal,
        pending: pending,
        toPay: 0,
        discount: 0,
        paymentMode: 'NUM',
        paymentCode: '1',
        commercialEntity: this.entityCode,
        originalDoc: doc
      };
    }).filter((r: any) => r !== null);

    this.calculateTotals();
  }

  onRowSelect(row: PendingDocRow) {
    if (row.selected) {
      if (row.toPay === 0) {
        row.toPay = row.pending;
      }
    } else {
      row.toPay = 0;
    }
    this.calculateTotals();
  }

  onAmountChange(row: PendingDocRow) {
    if (row.toPay > 0) {
      row.selected = true;
    } else {
      row.selected = false;
    }
    this.calculateTotals();
  }

  calculateTotals() {
    this.totalSelected = 0;
    this.totalExcess = 0;

    this.pendingRows.forEach(row => {
      if (row.selected) {
        this.totalSelected += row.toPay;
        if (row.toPay > row.pending) {
          this.totalExcess += (row.toPay - row.pending);
        }
      }
    });
  }

  openPaymentModeModal(row: PendingDocRow) {
    this.activeRow = row;
    this.showPaymentModeModal = true;
  }

  selectPaymentMode(mode: any) {
    if (this.activeRow) {
      this.activeRow.paymentMode = mode.code;
      this.activeRow.paymentCode = '1'; // Reset or map if needed
    }
    this.showPaymentModeModal = false;
    this.activeRow = null;
  }

  resetForm() {
    this.entityCode = '';
    this.entityName = '';
    this.selectedEntity = null;
    this.pendingRows = [];
    this.totalSelected = 0;
    this.totalExcess = 0;
    this.observations = '';
    this.loadNextNumber();
  }

  confirmSave() {
    // Validate Series Date
    this.dataService.getSeries(this.activeCompanyId || undefined).subscribe(allSeries => {
      const seriesDef = allSeries.find((s: any) => s.code === this.selectedSeries && s.companyId === this.activeCompanyId);
      const series = seriesDef || this.availableSeries.find(s => s.code === this.selectedSeries);

      if (series && series.startDate && series.endDate) {
        const docDate = new Date(this.docDate);
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

      this.proceedWithSave();
    });
  }

  proceedWithSave() {

    const selectedRows = this.pendingRows.filter(r => r.selected);

    if (selectedRows.length === 0) {
      alert('Selecione pelo menos um documento para liquidar.');
      return;
    }

    if (!this.selectedTreasuryAccount) {
      alert('Selecione a conta de tesouraria na aba "Dados Liquidação".');
      this.activeTab = 1;
      return;
    }

    const isReceipt = this.entityType === 'CUSTOMER';
    const typeLabel = isReceipt ? 'Recebimento' : 'Pagamento';
    const total = this.totalSelected.toLocaleString('pt-PT', { style: 'currency', currency: 'MZN' });

    // Professional confirmation dialog
    if (confirm(`Confirma a emissão do ${typeLabel} ${this.docNumberString}?\n\nEntidade: ${this.entityName}\nValor Total: ${total}\n\nEsta operação é irreversível.`)) {
      this.saveDocument(selectedRows, isReceipt);
    }
  }

  saveDocument(selectedRows: PendingDocRow[], isReceipt: boolean) {
    const storageKey = isReceipt ? 'erp_receipts' : 'erp_payments';
    const idPrefix = isReceipt ? 'REC' : 'PAY';
    const type = isReceipt ? 'RECEIPT' : 'PAYMENT';
    const typeLabel = isReceipt ? 'Recebimento' : 'Pagamento';

    // Validate Period Closure
    if (!this.periodService.isPeriodOpen(this.docDate)) {
      alert('O período para esta data está fechado. Não é possível gravar documentos nesta data.');
      return;
    }

    // Validate Treasury Balance (Retroactive Check)
    // If Payment, amount is negative for balance check (Credit Asset)
    // If Receipt, amount is positive for balance check (Debit Asset)
    const amountChange = isReceipt ? this.totalSelected : -this.totalSelected;

    const balanceCheck = this.accountingService.checkBalanceFeasibility(this.selectedTreasuryAccount, this.docDate, amountChange);

    if (!balanceCheck.valid) {
      const confirmMsg = `Atenção: Este movimento retroativo fará com que o saldo da conta de tesouraria fique negativo em ${balanceCheck.dateOfMinBalance?.toLocaleDateString()}.\n\nSaldo Mínimo Projetado: ${balanceCheck.minBalance.toLocaleString('pt-PT', { style: 'currency', currency: 'MZN' })}\n\nDeseja continuar mesmo assim?`;

      if (!confirm(confirmMsg)) {
        return;
      }

      // Log exception if confirmed
      this.auditService.logException({
        user: 'current_user',
        action: 'NEGATIVE_BALANCE_RISK',
        module: 'TREASURY',
        documentRef: `${this.selectedDocType} ${this.selectedSeries}/${this.currentSeriesNumber}`,
        details: {
          date: this.docDate,
          amount: amountChange,
          projectedMinBalance: balanceCheck.minBalance,
          dateOfMinBalance: balanceCheck.dateOfMinBalance
        }
      });
    }

    const document = {
      id: `${idPrefix}${Date.now()}`,
      number: this.docNumberString,
      docType: this.selectedDocType,
      series: this.selectedSeries,
      seriesNumber: this.currentSeriesNumber,
      date: new Date(this.docDate),
      type: type,
      amount: this.totalSelected,
      treasuryAccountId: this.selectedTreasuryAccount,
      // Common fields
      entityCode: this.entityCode,
      entityName: this.entityName,
      // Specific fields for compatibility
      customerCode: isReceipt ? this.entityCode : undefined,
      customerName: isReceipt ? this.entityName : undefined,
      beneficiaryCode: !isReceipt ? this.entityCode : undefined,
      beneficiaryName: !isReceipt ? this.entityName : undefined,

      paymentMethod: this.paymentMethod,
      description: `${isReceipt ? 'Recebimento de' : 'Pagamento a'} ${this.entityName}`,
      observations: this.observations,
      relatedDocument: selectedRows[0].docNumber,
      lines: selectedRows.map(r => ({
        docNumber: r.docNumber,
        amount: r.toPay,
        paymentMode: r.paymentMode
      }))
    };

    // Save via DataService
    const saveObservable = isReceipt ? this.dataService.saveReceipt(document) : this.dataService.savePayment(document);

    saveObservable.subscribe(() => {
      // Create Accounting Entry
      this.createAccountingEntry(document, selectedRows, isReceipt);

      // Success feedback
      alert(`${typeLabel} gravado com sucesso!`);
      this.resetForm();
    });
  }

  createAccountingEntry(doc: any, rows: PendingDocRow[], isReceipt: boolean) {
    const entryId = `JE${Date.now()}`;
    const treasuryAccount = this.accountingService.getAccount(doc.treasuryAccountId);
    const treasuryAccountCode = treasuryAccount ? treasuryAccount.code : '';

    const lines = [];

    if (isReceipt) {
      // Debit: Treasury
      lines.push({
        id: `${entryId}-0`,
        accountId: doc.treasuryAccountId,
        accountCode: treasuryAccountCode,
        accountName: 'Caixa/Banco',
        debit: doc.amount,
        credit: 0,
        description: `Recebimento ${doc.number}`
      });
      // Credit: Customer
      const customerAccountId = this.selectedEntity?.receivableAccountId || '17';
      const customerAccount = this.accountingService.getAccount(customerAccountId);

      rows.forEach((row, index) => {
        lines.push({
          id: `${entryId}-${index + 1}`,
          accountId: customerAccountId,
          accountCode: customerAccount?.code || '21.1.1',
          accountName: customerAccount?.name || 'Clientes',
          debit: 0,
          credit: row.toPay,
          description: `Liq. ${row.docNumber}`
        });
      });
    } else {
      // Debit: Supplier
      const supplierAccountId = this.selectedEntity?.payableAccountId || '49';
      const supplierAccount = this.accountingService.getAccount(supplierAccountId);

      rows.forEach((row, index) => {
        lines.push({
          id: `${entryId}-${index + 1}`,
          accountId: supplierAccountId,
          accountCode: supplierAccount?.code || '22.1',
          accountName: supplierAccount?.name || 'Fornecedores',
          debit: row.toPay,
          credit: 0,
          description: `Liq. ${row.docNumber}`
        });
      });
      // Credit: Treasury
      lines.push({
        id: `${entryId}-0`,
        accountId: doc.treasuryAccountId,
        accountCode: treasuryAccountCode,
        accountName: 'Caixa/Banco',
        debit: 0,
        credit: doc.amount,
        description: `Pagamento ${doc.number}`
      });
    }

    const entry: any = {
      id: entryId,
      journalId: 'TREASURY',
      date: doc.date,
      description: `${isReceipt ? 'Recibo' : 'Pagamento'} ${doc.number} - ${this.entityName}`,
      reference: doc.number,
      sourceDocument: doc.number,
      sourceType: isReceipt ? 'RECEIPT' : 'PAYMENT',
      lines: lines,
      status: 'POSTED',
      createdBy: 'user',
      createdAt: new Date()
    };

    this.accountingService.createJournalEntry(entry);
  }

  validateSeriesDate() {
    this.dataService.getSeries(this.activeCompanyId || undefined).subscribe(allSeries => {
      const seriesDef = allSeries.find((s: any) => s.code === this.selectedSeries && s.companyId === this.activeCompanyId);
      const series = seriesDef || this.availableSeries.find(s => s.code === this.selectedSeries);

      if (series && series.startDate && series.endDate) {
        const docDate = new Date(this.docDate);
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
    });
  }
}
