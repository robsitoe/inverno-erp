import { Component, EventEmitter, Output, OnInit, Input, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../shared/accounting.service';
import { AuditService } from '../../shared/audit.service';
import { PeriodService } from '../../shared/period.service';
import { EntityListModalComponent } from '../../shared/components/entity-list-modal.component';
import { DataService } from '../../services/data.service';
import { forkJoin } from 'rxjs';


interface PendingDocRow {
  selected: boolean;
  id: string;
  date: string;
  dueDate: string;
  currency: string;
  docType: string;
  docNumber: string; // Full string e.g. FA 2025/1
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
  selector: 'app-receipt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, EntityListModalComponent],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded shadow-lg w-[1000px] h-[700px] flex flex-col text-xs font-sans">
        <!-- Window Header (Title Bar) -->
        <div class="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-2 py-1 flex justify-between items-center shrink-0 select-none">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px]">payments</span>
            <span class="font-bold">Contas Correntes (Recebimentos)</span>
          </div>
          <button (click)="close.emit()" class="hover:bg-red-500 rounded p-0.5 transition-colors">
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center gap-1 px-2 py-1 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
          <button (click)="saveReceipt()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
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
          <button (click)="close.emit()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
            <span class="material-symbols-outlined text-[18px]">logout</span>
            <span>Cancelar</span>
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
                  <select [(ngModel)]="entityType" class="w-40 border border-gray-300 rounded-sm px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500">
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
                  <label class="w-24 text-right font-medium text-blue-700 cursor-pointer hover:underline" (click)="openEntityModal()">Cliente:</label>
                  <div class="flex-1 flex items-center bg-white border border-gray-300 rounded-sm">
                    <input type="text" [(ngModel)]="customerName" readonly class="flex-1 px-2 py-0.5 border-none focus:ring-0 text-gray-700" placeholder="Selecione a entidade...">
                    <button (click)="openEntityModal()" class="px-1 text-gray-500 hover:text-blue-600">...</button>
                  </div>
                  <span class="w-16 text-right text-gray-500">{{ customerCode }}</span>
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
              <label class="text-blue-600 font-medium ml-1">Documento:</label>
              <select [(ngModel)]="selectedDocType" (change)="onDocumentTypeChange()" class="w-16 border border-gray-300 rounded-sm px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500">
                <option *ngFor="let t of documentTypes" [value]="t.code">{{t.code}}</option>
              </select>
              <span class="text-gray-500 italic flex-1">{{ getDocDescription(selectedDocType) }}</span>
              
              <select [(ngModel)]="selectedSeries" (change)="loadNextNumber(); validateSeriesDate()" class="w-20 border border-gray-300 rounded-sm px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500">
                <option *ngFor="let s of availableSeries" [value]="s.code">{{s.code}}</option>
              </select>
              
              <input type="number" [(ngModel)]="currentSeriesNumber" (change)="updateReceiptNumberString()" class="w-20 border border-gray-300 rounded-sm px-1 py-0.5 text-right focus:outline-none focus:border-blue-500">
              
              <input type="date" [(ngModel)]="receiptDate" (change)="validateSeriesDate()" class="w-28 border border-gray-300 rounded-sm px-1 py-0.5 focus:outline-none focus:border-blue-500">
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
                    <th class="w-24 py-1 border-r border-gray-200 text-right px-1">Total FA</th>
                    <th class="w-24 py-1 border-r border-gray-200 text-right px-1 text-orange-600">Pendente</th>
                    <th class="w-24 py-1 border-r border-gray-200 text-right px-1 font-bold">A Pagar</th>
                    <th class="w-16 py-1 border-r border-gray-200 text-right px-1">Desc.</th>
                    <th class="w-24 py-1 border-r border-gray-200 text-right px-1 text-green-700">Pend. Após</th>
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
                    <td class="px-1 border-r border-gray-100">{{ row.docNumber }}</td>
                    <td class="px-1 border-r border-gray-100 text-right font-medium">{{ row.total | number:'1.2-2' }}</td>
                    <td class="px-1 border-r border-gray-100 text-right font-bold text-orange-600">{{ row.pending | number:'1.2-2' }}</td>
                    <td class="px-1 border-r border-gray-100 text-right font-medium relative p-0">
                      <input type="number" [(ngModel)]="row.toPay" (change)="onAmountChange(row)" class="w-full h-full text-right px-1 border-none bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500">
                    </td>
                    <td class="px-1 border-r border-gray-100 text-right">{{ (row.discount || 0) | number:'1.2-2' }}</td>
                    <td class="px-1 border-r border-gray-100 text-right text-green-700 font-medium">{{ (row.pending - row.toPay) | number:'1.2-2' }}</td>
                    <td class="px-1 border-r border-gray-100">{{ row.paymentMode }}</td>
                    <td class="px-1 border-r border-gray-100">{{ row.paymentCode }}</td>
                    <td class="px-1">{{ row.commercialEntity }}</td>
                  </tr>
                  <tr *ngIf="pendingRows.length === 0">
                    <td colspan="14" class="text-center py-8 text-gray-400 italic">
                      Nenhum documento pendente encontrado para esta entidade.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Status Bar -->
            <div class="bg-gray-100 border-t border-gray-300 px-2 py-0.5 text-[10px] text-gray-600 flex justify-between">
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
                  <label class="block font-medium mb-1">Meio de Pagamento</label>
                  <select [(ngModel)]="paymentMethod" (change)="onPaymentMethodChange()" class="w-full border border-gray-300 rounded px-2 py-1">
                    <option *ngFor="let pm of paymentMethods" [value]="pm.code">{{ pm.description }}</option>
                  </select>
               </div>
             </div>
          </div>

          <!-- Adiantamentos Tab -->
          <div *ngIf="activeTab === 2" class="flex flex-col gap-4 p-4 h-full">
            <div class="bg-white border border-gray-300 p-4 rounded shadow-sm">
              <h3 class="text-sm font-bold mb-4 text-gray-700">Adiantamento de Cliente (ADC)</h3>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-medium mb-1 text-xs">Cliente</label>
                  <div class="flex items-center bg-gray-50 border border-gray-300 rounded-sm">
                    <input type="text" [(ngModel)]="customerName" readonly class="flex-1 px-2 py-1 border-none focus:ring-0 text-xs bg-transparent" placeholder="Selecione o cliente...">
                    <button (click)="openEntityModal()" class="px-2 text-blue-600 hover:text-blue-800 font-bold">F4</button>
                  </div>
                </div>

                <div>
                  <label class="block font-medium mb-1 text-xs">Data do Documento</label>
                  <input type="date" [(ngModel)]="docDate" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-blue-500">
                </div>

                <div>
                  <label class="block font-medium mb-1 text-xs">Valor do Adiantamento</label>
                  <input type="number" [(ngModel)]="advanceAmount" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-xs text-right focus:outline-none focus:border-blue-500" step="0.01" min="0">
                </div>

                <div>
                  <label class="block font-medium mb-1 text-xs">Meio de Pagamento</label>
                  <select [(ngModel)]="advancePaymentMethod" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-blue-500">
                    <option *ngFor="let pm of paymentMethods" [value]="pm.code">{{ pm.description }}</option>
                  </select>
                </div>

                <div class="col-span-2">
                  <label class="block font-medium mb-1 text-xs">Observações</label>
                  <textarea [(ngModel)]="advanceObservations" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-blue-500" rows="3" placeholder="Observações sobre o adiantamento..."></textarea>
                </div>
              </div>

              <div class="mt-4 flex justify-end">
                <button (click)="saveAdvanceReceipt()" [disabled]="isSaving" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                  <span class="material-symbols-outlined text-[18px]">save</span>
                  <span>{{ isSaving ? 'Gravando...' : 'Gravar Adiantamento' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-entity-list-modal
      *ngIf="showEntityModal"
      (close)="showEntityModal = false"
      (select)="onEntitySelect($event)"
    ></app-entity-list-modal>
  `
})
export class ReceiptModalComponent implements OnInit {
  @Input() initialDocCode: string = '';
  @Input() pendingDocument: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  tabs = ['Gerais', 'Dados Liquidação', 'Adiantamentos', 'Distribuição Automática', 'Restrições', 'Restrições das Atividades'];
  activeTab = 0;

  // Filters
  entityType = 'CUSTOMER';
  customerCode = '';
  customerName = '';
  filterDateUntil = new Date().toISOString().split('T')[0];

  // Document Info
  documentTypes: any[] = [];
  availableSeries: any[] = [];
  selectedDocType = 'RE';
  selectedSeries = '';
  currentSeriesNumber = 1;
  receiptDate = new Date().toISOString().split('T')[0];
  receiptNumberString = '';

  // Grid
  pendingRows: PendingDocRow[] = [];
  totalSelected = 0;
  totalExcess = 0;

  // Liquidation Data
  selectedTreasuryAccount = '';
  paymentMethod = 'CASH';
  treasuryAccounts: any[] = [];
  paymentMethods: any[] = [];

  // Advance Receipt Fields
  advanceAmount = 0;
  advancePaymentMethod = 'NUM';
  advanceObservations = '';
  docDate = new Date().toISOString().split('T')[0];
  docNumberString = '';
  isSaving = false;

  showEntityModal = false;
  selectedEntity: any = null;
  activeCompanyId: string | null = null;


  constructor(
    private accountingService: AccountingService,
    private auditService: AuditService,
    private periodService: PeriodService,
    private dataService: DataService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }


  ngOnInit() {
    this.loadActiveCompany();
    this.loadDocumentTypes();
    this.loadTreasuryAccounts();
    this.loadPaymentMethods();

    if (this.pendingDocument) {
      this.customerName = this.pendingDocument.entity;
      // Try to find full customer object if possible, or just use name to filter
      // For now, we assume we can filter by name if code is missing
      this.loadPendingDocuments();
    }
  }

  loadActiveCompany() {
    this.dataService.activeCompany$.subscribe(info => {
      if (info) {
        this.activeCompanyId = info.id;
      }
    });
  }

  loadDocumentTypes() {
    this.dataService.getDocumentTypes('TREASURY').subscribe(allTypes => {
      this.documentTypes = allTypes.filter((t: any) => t.nature === 'RECEIVE');

      // Default to RE (Recibo) if available, or first one
      if (this.documentTypes.length > 0) {
        const re = this.documentTypes.find(t => t.code === 'RE');
        this.selectedDocType = re ? re.code : this.documentTypes[0].code;
        this.onDocumentTypeChange();
      }
    });
  }

  onDocumentTypeChange() {
    const docType = this.documentTypes.find(t => t.code === this.selectedDocType);
    this.availableSeries = [];

    if (docType && docType.series && docType.series.length > 0) {
      if (this.activeCompanyId) {
        this.availableSeries = docType.series.filter((s: any) => s.active && s.companyId === this.activeCompanyId);
      } else {
        this.availableSeries = docType.series.filter((s: any) => s.active && !s.companyId);
      }
    }

    if (this.availableSeries.length === 0) {
      const currentYear = new Date().getFullYear().toString();
      this.availableSeries = [{ code: currentYear }];
    }

    this.selectedSeries = this.availableSeries[0].code;
    this.loadNextNumber();
  }

  loadNextNumber() {
    this.dataService.getReceipts(this.activeCompanyId || undefined).subscribe(receipts => {
      let nextNum = 1;
      if (receipts && receipts.length > 0) {
        const relevant = receipts.filter((r: any) =>
          r.docType === this.selectedDocType && r.series === this.selectedSeries
        );
        if (relevant.length > 0) {
          nextNum = Math.max(...relevant.map((r: any) => extractNumber(r.seriesNumber))) + 1;
        }
      }
      this.currentSeriesNumber = nextNum;
      this.updateReceiptNumberString();
    });

    // Helper to safely extract number
    function extractNumber(val: any): number {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    }
  }

  updateReceiptNumberString() {
    this.receiptNumberString = `${this.selectedDocType} ${this.selectedSeries}/${this.currentSeriesNumber}`;
  }

  getDocDescription(code: string): string {
    const doc = this.documentTypes.find(t => t.code === code);
    return doc ? doc.description : '';
  }

  loadTreasuryAccounts() {
    this.treasuryAccounts = this.accountingService.getAccounts()
      .filter(a => a.allowPosting && (a.code.startsWith('11') || a.code.startsWith('12') || a.code.startsWith('1.1') || a.code.startsWith('1.2')));

    if (this.treasuryAccounts.length > 0) {
      this.selectedTreasuryAccount = this.treasuryAccounts[0].id;
    }
  }

  loadPaymentMethods() {
    this.dataService.getPaymentMethods(this.activeCompanyId || undefined).subscribe(methods => {
      this.paymentMethods = methods;
      if (this.paymentMethods.length > 0) {
        const cash = this.paymentMethods.find(pm => pm.code === 'NUM' || pm.code === 'CASH');
        this.paymentMethod = cash ? cash.code : this.paymentMethods[0].code;
        this.onPaymentMethodChange();
      }
    });
  }

  onPaymentMethodChange() {
    const selected = this.paymentMethods.find(pm => pm.code === this.paymentMethod);
    if (selected && selected.treasuryAccountId) {
      this.selectedTreasuryAccount = selected.treasuryAccountId;
    }
  }

  openEntityModal() {
    this.showEntityModal = true;
  }

  onEntitySelect(entity: any) {
    this.selectedEntity = entity;
    this.customerCode = entity.code;
    this.customerName = entity.name;
    this.showEntityModal = false;
    this.loadPendingDocuments();
  }


  loadPendingDocuments() {
    if (!this.customerName && !this.customerCode) return;

    forkJoin({
      sales: this.dataService.getSalesDocuments(this.activeCompanyId || undefined),
      receipts: this.dataService.getReceipts(this.activeCompanyId || undefined)
    }).subscribe({
      next: ({ sales, receipts }) => {
        // Filter documents for this entity that are CONFIRMED, INVOICED or POSTED
        const entityDocs = (sales || []).filter((d: any) =>
          (d.customerName === this.customerName || d.customerId === this.customerCode) &&
          (d.status === 'CONFIRMED' || d.status === 'INVOICED' || d.status === 'POSTED')
        );

        this.pendingRows = entityDocs.map((doc: any) => {
          // Calculate already paid amount by checking all receipts and their lines
          let paidAmount = 0;
          (receipts || []).forEach((r: any) => {
            if (r.lines && r.lines.length > 0) {
              const line = r.lines.find((l: any) => l.docNumber === doc.documentNumber);
              if (line) paidAmount += Number(line.amount) || 0;
            } else if (r.relatedDocument === doc.documentNumber) {
              paidAmount += Number(r.amount) || 0;
            }
          });

          const docTotal = Number(doc.total) || 0;
          const pending = docTotal - paidAmount;

          if (pending <= 0.01) return null; // Skip fully paid (tolerance 0.01)

          // Check if this specific doc was passed as pendingDocument to pre-select it
          const isPreSelected = this.pendingDocument && this.pendingDocument.documentNumber === doc.documentNumber;

          return {
            selected: isPreSelected,
            id: doc.id,
            date: doc.date,
            dueDate: doc.dueDate,
            currency: 'MT',
            docType: doc.documentType,
            docNumber: doc.documentNumber,
            total: docTotal,
            pending: pending,
            toPay: isPreSelected ? pending : 0,
            discount: 0,
            paymentMode: 'PGNUM',
            paymentCode: '1',
            commercialEntity: this.customerCode,
            originalDoc: doc
          };
        }).filter((r: any) => r !== null);

        this.calculateTotals();
      },
      error: (err) => {
        console.error('Error loading pending documents:', err);
        this.pendingRows = [];
      }
    });
  }

  onRowSelect(row: PendingDocRow) {
    if (row.selected) {
      // If checked, auto-fill with pending amount if 0
      if (row.toPay === 0) {
        row.toPay = row.pending;
      }
    } else {
      // If unchecked, clear amount
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

  resetForm() {
    this.customerCode = '';
    this.customerName = '';
    this.pendingRows = [];
    this.totalSelected = 0;
    this.loadNextNumber();
  }

  saveReceipt() {
    // Validate Period Closure
    if (!this.periodService.isPeriodOpen(this.receiptDate)) {
      alert('O período para esta data está fechado. Não é possível gravar documentos nesta data.');
      return;
    }

    // Validate Treasury Balance (Retroactive Check)
    // Receipt increases balance (Debit Asset)
    const amountChange = this.totalSelected;

    const balanceCheck = this.accountingService.checkBalanceFeasibility(this.selectedTreasuryAccount, this.receiptDate, amountChange);

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
          date: this.receiptDate,
          amount: amountChange,
          projectedMinBalance: balanceCheck.minBalance,
          dateOfMinBalance: balanceCheck.dateOfMinBalance
        }
      });
    }

    // Validate Series Date
    const allSeries = JSON.parse(localStorage.getItem('erp_series_definitions') || '[]');
    const seriesDef = allSeries.find((s: any) => s.code === this.selectedSeries && s.companyId === this.activeCompanyId);
    const series = seriesDef || this.availableSeries.find(s => s.code === this.selectedSeries);

    if (series && series.startDate && series.endDate) {
      const docDate = new Date(this.receiptDate);
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

    // Create Receipt
    const receipt = {
      id: `REC${Date.now()}`,
      number: this.receiptNumberString,
      docType: this.selectedDocType,
      series: this.selectedSeries,
      seriesNumber: this.currentSeriesNumber,
      date: new Date(this.receiptDate),
      type: 'RECEIPT',
      amount: this.totalSelected,
      treasuryAccountId: this.selectedTreasuryAccount,
      customerCode: this.customerCode,
      customerName: this.customerName,
      paymentMethod: this.paymentMethod,
      description: `Recebimento de ${this.customerName}`,
      // We store the first document as "related" for backward compatibility, 
      // but ideally we should store lines or multiple relations
      relatedDocument: selectedRows[0].docNumber,
      lines: selectedRows.map(r => ({
        docType: r.docType,
        docNumber: r.docNumber,
        originalAmount: r.total,
        amount: r.toPay,
        discount: r.discount || 0,
        pendingAfter: r.pending - r.toPay
      }))
    };

    // Save to Backend (Permanent Sync)
    this.dataService.saveReceipt(receipt).subscribe({
      next: () => {
        // Create Accounting Entry
        this.createAccountingEntry(receipt, selectedRows);

        alert(`Recibo ${this.receiptNumberString} gravado com sucesso!`);
        this.saved.emit(receipt);
        this.close.emit();
      },
      error: (err) => {
        console.error('Erro ao guardar recibo no servidor:', err);
        alert('Erro ao gravar recibo. Tente novamente.');
      }
    });
  }

  createAccountingEntry(receipt: any, rows: PendingDocRow[]) {
    const entryId = `JE${Date.now()}`;

    // Debit: Treasury Account
    // Credit: Customer Account (for each invoice)

    const treasuryAccount = this.accountingService.getAccount(receipt.treasuryAccountId);
    const treasuryAccountCode = treasuryAccount ? treasuryAccount.code : '';

    const lines = [
      {
        id: `${entryId}-0`,
        accountId: receipt.treasuryAccountId,
        accountCode: treasuryAccountCode,
        accountName: 'Caixa/Banco',
        debit: receipt.amount,
        credit: 0,
        description: `Recebimento ${receipt.number}`
      }
    ];

    rows.forEach((row, index) => {
      const customerAccountId = this.selectedEntity?.receivableAccountId || this.accountingService.getAccounts().find(a => a.code === '4.1.1')?.id || '';
      const customerAccount = this.accountingService.getAccount(customerAccountId);

      lines.push({
        id: `${entryId}-${index + 1}`,
        accountId: customerAccountId,
        accountCode: customerAccount?.code || '4.1.1',
        accountName: customerAccount?.name || 'Clientes',
        debit: 0,
        credit: row.toPay,
        description: `Liq. ${row.docNumber}`
      });
    });


    const entry: any = {
      id: entryId,
      journalId: 'TREASURY',
      date: receipt.date,
      description: `Recibo ${receipt.number} - ${receipt.customerName}`,
      reference: receipt.number,
      sourceDocument: receipt.id,
      sourceType: 'RECEIPT',
      lines: lines,
      status: 'POSTED',
      createdBy: 'user',
      createdAt: new Date()
    };

    this.accountingService.createJournalEntry(entry);
  }
  validateSeriesDate() {
    const allSeries = JSON.parse(localStorage.getItem('erp_series_definitions') || '[]');
    const seriesDef = allSeries.find((s: any) => s.code === this.selectedSeries && s.companyId === this.activeCompanyId);
    const series = seriesDef || this.availableSeries.find(s => s.code === this.selectedSeries);

    if (series && series.startDate && series.endDate) {
      const docDate = new Date(this.receiptDate);
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

  saveAdvanceReceipt() {
    const idPrefix = 'ADC';
    const typeLabel = 'Adiantamento de Cliente';

    if (!this.periodService.isPeriodOpen(this.docDate)) {
      alert('O período para esta data está fechado.');
      return;
    }

    if (!this.customerName) {
      alert('Selecione um cliente.');
      return;
    }

    if (!this.advanceAmount || this.advanceAmount <= 0) {
      alert('Insira um valor válido para o adiantamento.');
      return;
    }

    const docId = `${idPrefix}${Date.now()}`;
    const paymentMethod = this.paymentMethods.find(pm => pm.code === this.advancePaymentMethod);
    const treasuryAccountId = paymentMethod?.treasuryAccountId || this.selectedTreasuryAccount || '3';

    const document: any = {
      id: docId,
      companyId: this.activeCompanyId || undefined,
      number: this.docNumberString || `${idPrefix}${Date.now()}`,
      docType: this.selectedDocType,
      series: this.selectedSeries,
      seriesNumber: this.currentSeriesNumber,
      date: new Date(this.docDate),
      type: 'ADVANCE_RECEIPT',
      amount: this.advanceAmount,
      treasuryAccountId: treasuryAccountId,
      entityCode: this.customerCode,
      entityName: this.customerName,
      paymentMethod: this.advancePaymentMethod,
      description: `${typeLabel} - ${this.customerName}`,
      observations: this.advanceObservations
    };

    this.isSaving = true;
    this.dataService.saveReceipt(document).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.createAdvanceAccountingEntry(document);
          this.isSaving = false;
          alert(`${typeLabel} gravado com sucesso!`);
          this.resetForm();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Error:', err);
          this.isSaving = false;
          alert(`Erro ao gravar ${typeLabel}.`);
          this.cdr.detectChanges();
        });
      }
    });
  }

  createAdvanceAccountingEntry(doc: any) {
    const entryId = `JE${Date.now()}`;
    const treasuryAccount = this.accountingService.getAccount(doc.treasuryAccountId);
    const advanceAccount = this.accountingService.getAccounts().find(a => a.code === '4.1.9'); // PGC-NIR
    const advanceAccountId = advanceAccount?.id || '4.1.9';

    const lines = [];

    // For customer advance receipt (ADC):
    // Debit: Treasury Account
    // Credit: Advance from Customers (21.9)
    lines.push({
      id: `${entryId}-0`,
      accountId: doc.treasuryAccountId,
      accountCode: treasuryAccount?.code || '11.1.1',
      accountName: treasuryAccount?.name || 'Caixa',
      debit: doc.amount,
      credit: 0,
      description: `Adiantamento de ${doc.entityName}`
    });
    lines.push({
      id: `${entryId}-1`,
      accountId: advanceAccountId,
      accountCode: advanceAccount?.code || '4.1.9',
      accountName: advanceAccount?.name || 'Adiantamentos de Clientes',
      debit: 0,
      credit: doc.amount,
      description: `Adiantamento ${doc.number}`
    });

    let journalId = 'JNL-GEN';
    if (treasuryAccount?.code.startsWith('11') || treasuryAccount?.code.startsWith('1.1')) journalId = 'JNL-CSH';
    else if (treasuryAccount?.code.startsWith('12') || treasuryAccount?.code.startsWith('1.2')) journalId = 'JNL-BNK';

    const entry: any = {
      id: entryId,
      companyId: doc.companyId,
      journalId: journalId,
      date: doc.date,
      description: `Adiantamento ${doc.number} - ${doc.entityName}`,
      reference: doc.number,
      sourceDocument: doc.id,
      sourceType: 'ADVANCE_RECEIPT',
      lines: lines,
      status: 'POSTED',
      createdBy: 'user',
      createdAt: new Date()
    };

    this.accountingService.createJournalEntry(entry);
  }
}
