import { Component, EventEmitter, Output, OnInit, Input, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../shared/accounting.service';
import { AuditService } from '../../shared/audit.service';
import { PeriodService } from '../../shared/period.service';
import { SupplierListModalComponent } from '../../shared/components/supplier-list-modal.component';
import { DataService } from '../../services/data.service';
import { forkJoin } from 'rxjs';

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
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SupplierListModalComponent],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded shadow-lg w-[1000px] h-[700px] flex flex-col text-xs font-sans">
        <!-- Window Header (Title Bar) -->
        <div class="bg-gradient-to-r from-red-700 to-red-600 text-white px-2 py-1 flex justify-between items-center shrink-0 select-none">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px]">payments</span>
            <span class="font-bold">Contas Correntes (Pagamentos)</span>
          </div>
          <button (click)="close.emit()" class="hover:bg-red-500 rounded p-0.5 transition-colors">
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center gap-1 px-2 py-1 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
          <button (click)="savePayment()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">
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
                    <option value="SUPPLIER">Fornecedor</option>
                    <option value="CUSTOMER">Cliente</option>
                    <option value="OTHER">Outros</option>
                  </select>
                  <div class="flex items-center gap-1 ml-4">
                    <input type="checkbox" id="includeAssociated" class="rounded-sm border-gray-300 text-blue-600 focus:ring-0">
                    <label for="includeAssociated" class="text-gray-700">Incluir entidades associadas</label>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <label class="w-24 text-right font-medium text-blue-700 cursor-pointer hover:underline" (click)="openSupplierModal()">Fornecedor:</label>
                  <div class="flex-1 flex items-center bg-white border border-gray-300 rounded-sm">
                    <input type="text" [(ngModel)]="supplierName" readonly class="flex-1 px-2 py-0.5 border-none focus:ring-0 text-gray-700" placeholder="Selecione a entidade...">
                    <button (click)="openSupplierModal()" class="px-1 text-gray-500 hover:text-blue-600">...</button>
                  </div>
                  <span class="w-16 text-right text-gray-500">{{ supplierCode }}</span>
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
              
              <input type="number" [(ngModel)]="currentSeriesNumber" (change)="updatePaymentNumberString()" class="w-20 border border-gray-300 rounded-sm px-1 py-0.5 text-right focus:outline-none focus:border-blue-500">
              
              <input type="date" [(ngModel)]="paymentDate" (change)="validateSeriesDate()" class="w-28 border border-gray-300 rounded-sm px-1 py-0.5 focus:outline-none focus:border-blue-500">
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
                    <td class="px-1 border-r border-gray-100">{{ row.paymentMode }}</td>
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
              <h3 class="text-sm font-bold mb-4 text-gray-700">Adiantamento a Fornecedor (ADF)</h3>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-medium mb-1 text-xs">Fornecedor</label>
                  <div class="flex items-center bg-gray-50 border border-gray-300 rounded-sm">
                    <input type="text" [(ngModel)]="supplierName" readonly class="flex-1 px-2 py-1 border-none focus:ring-0 text-xs bg-transparent" placeholder="Selecione o fornecedor...">
                    <button (click)="openSupplierModal()" class="px-2 text-blue-600 hover:text-blue-800 font-bold">F4</button>
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
                <button (click)="saveAdvancePayment()" [disabled]="isSaving" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                  <span class="material-symbols-outlined text-[18px]">save</span>
                  <span>{{ isSaving ? 'Gravando...' : 'Gravar Adiantamento' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-supplier-list-modal
      *ngIf="showSupplierModal"
      (close)="showSupplierModal = false"
      (select)="onSupplierSelect($event)"
    ></app-supplier-list-modal>
  `
})
export class PaymentModalComponent implements OnInit {
  @Input() initialDocCode: string = '';
  @Input() pendingDocument: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  tabs = ['Gerais', 'Dados Liquidação', 'Adiantamentos', 'Distribuição Automática', 'Restrições', 'Restrições das Atividades'];
  activeTab = 0;

  // Filters
  entityType = 'SUPPLIER';
  supplierCode = '';
  supplierName = '';
  filterDateUntil = new Date().toISOString().split('T')[0];

  // Document Info
  documentTypes: any[] = [];
  availableSeries: any[] = [];
  selectedDocType = 'PAG';
  selectedSeries = '';
  currentSeriesNumber = 1;
  paymentDate = new Date().toISOString().split('T')[0];
  paymentNumberString = '';

  // Grid
  pendingRows: PendingDocRow[] = [];
  totalSelected = 0;
  totalExcess = 0;

  // Liquidation Data
  selectedTreasuryAccount = '';
  paymentMethod = 'CASH';
  treasuryAccounts: any[] = [];
  paymentMethods: any[] = [];

  // Advance Payment Fields
  advanceAmount = 0;
  advancePaymentMethod = 'NUM';
  advanceObservations = '';
  docDate = new Date().toISOString().split('T')[0];
  docNumberString = '';
  isSaving = false;
  entityCode = '';
  entityName = '';

  showSupplierModal = false;
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
      this.supplierName = this.pendingDocument.entity;
      this.loadPendingDocuments();
    }
  }

  loadActiveCompany() {
    this.dataService.activeCompany$.subscribe(company => {
      if (company) {
        this.activeCompanyId = company.id;
      }
    });
  }

  loadDocumentTypes() {
    this.dataService.getDocumentTypes('TREASURY').subscribe(allTypes => {
      this.documentTypes = allTypes.filter((t: any) => t.nature === 'PAY');

      if (this.documentTypes.length > 0) {
        const pag = this.documentTypes.find(t => t.code === 'PAG');
        this.selectedDocType = pag ? pag.code : this.documentTypes[0].code;
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
    const stored = localStorage.getItem('erp_payments');
    let nextNum = 1;
    if (stored) {
      const payments = JSON.parse(stored);
      const relevant = payments.filter((p: any) =>
        p.docType === this.selectedDocType && p.series === this.selectedSeries
      );
      if (relevant.length > 0) {
        nextNum = Math.max(...relevant.map((p: any) => p.seriesNumber || 0)) + 1;
      }
    }
    this.currentSeriesNumber = nextNum;
    this.updatePaymentNumberString();
  }

  updatePaymentNumberString() {
    this.paymentNumberString = `${this.selectedDocType} ${this.selectedSeries}/${this.currentSeriesNumber}`;
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

  openSupplierModal() {
    this.showSupplierModal = true;
  }

  onSupplierSelect(supplier: any) {
    this.supplierCode = supplier.code;
    this.supplierName = supplier.name;
    this.showSupplierModal = false;
    this.loadPendingDocuments();
  }

  loadPendingDocuments() {
    if (!this.supplierName && !this.supplierCode) return;

    forkJoin({
      purchases: this.dataService.getPurchaseDocuments(this.activeCompanyId || undefined),
      payments: this.dataService.getPayments(this.activeCompanyId || undefined)
    }).subscribe({
      next: ({ purchases, payments }) => {
        // Filter documents for this entity that are POSTED or CONFIRMED
        const entityDocs = (purchases || []).filter((d: any) =>
          (d.supplierName === this.supplierName || d.supplierCode === this.supplierCode) &&
          (d.status === 'POSTED' || d.status === 'CONFIRMED')
        );

        this.pendingRows = entityDocs.map((doc: any) => {
          // Calculate already paid amount
          let paidAmount = 0;
          const rawDocType = doc.documentType || doc.type || 'FC';
          const docNum = doc.documentNumber || `${rawDocType} ${doc.series}/${doc.number}`;

          (payments || []).forEach((p: any) => {
            if (p.lines && p.lines.length > 0) {
              const line = p.lines.find((l: any) => l.docNumber === docNum);
              if (line) paidAmount += (line.amount || 0);
            } else if (p.relatedDocument === docNum) {
              paidAmount += (p.amount || 0);
            }
          });

          const pending = (doc.totalValue || doc.total || 0) - paidAmount;

          if (pending <= 0.01) return null;

          const isPreSelected = this.pendingDocument && this.pendingDocument.documentNumber === docNum;

          return {
            selected: isPreSelected,
            id: doc.id,
            date: doc.date,
            dueDate: doc.dueDate,
            currency: 'MT',
            docType: rawDocType,
            docNumber: docNum,
            total: doc.totalValue || doc.total,
            pending: pending,
            toPay: isPreSelected ? pending : 0,
            discount: 0,
            paymentMode: 'PGNUM',
            paymentCode: '1',
            commercialEntity: this.supplierCode,
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

  resetForm() {
    this.supplierCode = '';
    this.supplierName = '';
    this.pendingRows = [];
    this.totalSelected = 0;
    this.loadNextNumber();
  }

  savePayment() {
    // Validate Period Closure
    if (!this.periodService.isPeriodOpen(this.paymentDate)) {
      alert('O período para esta data está fechado. Não é possível gravar documentos nesta data.');
      return;
    }

    // Validate Treasury Balance (Retroactive Check)
    // Payment decreases balance (Credit Asset)
    const amountChange = -this.totalSelected;

    const balanceCheck = this.accountingService.checkBalanceFeasibility(this.selectedTreasuryAccount, this.paymentDate, amountChange);

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
          date: this.paymentDate,
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
      const docDate = new Date(this.paymentDate);
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

    // Create Payment
    const payment = {
      id: `PAY${Date.now()}`,
      number: this.paymentNumberString,
      docType: this.selectedDocType,
      series: this.selectedSeries,
      seriesNumber: this.currentSeriesNumber,
      date: new Date(this.paymentDate),
      type: 'PAYMENT',
      amount: this.totalSelected,
      treasuryAccountId: this.selectedTreasuryAccount,
      beneficiaryCode: this.supplierCode,
      beneficiaryName: this.supplierName,
      category: 'SUPPLIER',
      paymentMethod: this.paymentMethod,
      description: `Pagamento a ${this.supplierName}`,
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

    // Save to Backend
    this.dataService.savePayment(payment).subscribe({
      next: () => {
        // Create Accounting Entry
        this.createAccountingEntry(payment, selectedRows);

        alert(`Pagamento ${this.paymentNumberString} gravado com sucesso!`);
        this.saved.emit(payment);
        this.close.emit();
      },
      error: (err) => {
        console.error('Erro ao guardar pagamento:', err);
        alert('Erro ao guardar pagamento.');
      }
    });
  }

  createAccountingEntry(payment: any, rows: PendingDocRow[]) {
    const entryId = `JE${Date.now()}`;

    // Debit: Supplier Account (22)
    // Credit: Treasury Account

    const treasuryAccount = this.accountingService.getAccount(payment.treasuryAccountId);
    const treasuryAccountCode = treasuryAccount ? treasuryAccount.code : '';

    const lines = [
      {
        id: `${entryId}-0`,
        accountId: payment.treasuryAccountId,
        accountCode: treasuryAccountCode,
        accountName: 'Caixa/Banco',
        debit: 0,
        credit: payment.amount,
        description: `Pagamento ${payment.number}`
      }
    ];

    rows.forEach((row, index) => {
      lines.push({
        id: `${entryId}-${index + 1}`,
        accountId: '22', // Generic Supplier Account
        accountCode: '22',
        accountName: 'Fornecedores',
        debit: row.toPay,
        credit: 0,
        description: `Liq. ${row.docNumber}`
      });
    });

    const entry: any = {
      id: entryId,
      journalId: 'TREASURY',
      date: payment.date,
      description: `Pagamento ${payment.number} - ${payment.beneficiaryName}`,
      reference: payment.number,
      sourceDocument: payment.number,
      sourceType: 'PAYMENT',
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
      const docDate = new Date(this.paymentDate);
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

  saveAdvancePayment() {
    const idPrefix = 'ADF';
    const typeLabel = 'Adiantamento a Fornecedor';

    if (!this.periodService.isPeriodOpen(this.docDate)) {
      alert('O período para esta data está fechado.');
      return;
    }

    if (!this.supplierName) {
      alert('Selecione um fornecedor.');
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
      type: 'ADVANCE_PAYMENT',
      amount: this.advanceAmount,
      treasuryAccountId: treasuryAccountId,
      entityCode: this.supplierCode,
      entityName: this.supplierName,
      paymentMethod: this.advancePaymentMethod,
      description: `${typeLabel} - ${this.supplierName}`,
      observations: this.advanceObservations
    };

    this.isSaving = true;
    this.dataService.savePayment(document).subscribe({
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
    const advanceAccountId = '64'; // Adiantamentos a Fornecedores
    const advanceAccount = this.accountingService.getAccount(advanceAccountId);

    const lines = [];

    // For supplier advance payment (ADF):
    // Debit: Advance to Suppliers (22.9)
    // Credit: Treasury Account
    lines.push({
      id: `${entryId}-0`,
      accountId: advanceAccountId,
      accountCode: advanceAccount?.code || '22.9',
      accountName: advanceAccount?.name || 'Adiantamentos a Fornecedores',
      debit: doc.amount,
      credit: 0,
      description: `Adiantamento ${doc.number}`
    });
    lines.push({
      id: `${entryId}-1`,
      accountId: doc.treasuryAccountId,
      accountCode: treasuryAccount?.code || '11.1.1',
      accountName: treasuryAccount?.name || 'Caixa',
      debit: 0,
      credit: doc.amount,
      description: `Adiantamento a ${doc.entityName}`
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
      sourceDocument: doc.number,
      sourceType: 'ADVANCE_PAYMENT',
      lines: lines,
      status: 'POSTED',
      createdBy: 'user',
      createdAt: new Date()
    };

    this.accountingService.createJournalEntry(entry);
  }
}
