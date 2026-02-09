import { Component, Input, HostListener, ViewEncapsulation, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseDocumentTypeModalComponent } from './purchase-document-type-modal.component';
import { SupplierSearchModalComponent } from './supplier-search-modal.component';
import { ArticleSearchModalComponent } from '../inventory/article-search-modal.component';
import { TaxSearchModalComponent } from '../inventory/tax-search-modal.component';
import { WarehouseSearchModalComponent } from '../inventory/warehouse-search-modal.component';
import { LocationSearchModalComponent } from '../inventory/location-search-modal.component';
import { BatchSearchModalComponent } from '../inventory/batch-search-modal.component';
import { PurchaseDocumentSearchModalComponent } from './purchase-document-search-modal.component';
import { DocumentTypeConfigModalComponent } from '../../shared/components/document-type-config-modal.component';
import { AccountingService } from '../../shared/accounting.service';
import { InventoryService } from '../../shared/inventory.service';
import { AuditService } from '../../shared/audit.service';
import { PeriodService } from '../../shared/period.service';
import { DataService } from '../../services/data.service';
import { WorkflowStatus, WorkflowHistory } from '../../shared/models';
import { AppIconComponent } from '../../shared/components/app-icon.component';

interface PurchaseDocumentLine {
  id: string;
  articleId?: string; // Mandatoy for backend
  articleCode: string;
  articleName: string;
  warehouse: string;
  location: string;
  batch: string;
  description: string;
  taxCode: string;
  taxRate: number;
  unitPrice: number;
  discount: number;
  unit: string;
  quantity: number;
  totalLiquid: number;
  totalValue: number;
  project: string;
  costCenter: string;
  analytic: string;
  functional: string;
}

interface PurchaseDocument {
  id: string;
  companyId?: string;
  type: string;
  series: string;
  number: number;
  date: string;
  dueDate: string;
  supplierCode: string;
  supplierName: string;
  supplierNif: string;
  supplierAddress: string;
  supplierAccountId?: string;
  reference: string;
  paymentCondition: 'PRONTO' | 'PRAZO';
  paymentDays: number;
  currency: string;
  status: WorkflowStatus;
  lines: PurchaseDocumentLine[];
  merchandiseTotal: number;
  discountValue: number;
  taxTotal: number;
  totalValue: number;
  notes: string;
  statusNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  nif: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  city?: string;
  country?: string;
}

@Component({
  selector: 'app-purchase-document-form',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    PurchaseDocumentTypeModalComponent,
    SupplierSearchModalComponent,
    ArticleSearchModalComponent,
    TaxSearchModalComponent,
    WarehouseSearchModalComponent,
    LocationSearchModalComponent,
    BatchSearchModalComponent,
    PurchaseDocumentSearchModalComponent,
    DocumentTypeConfigModalComponent,
    AppIconComponent
  ],
  template: `
    <ng-container *ngIf="currentDoc; else loading">
      <div class="flex flex-col h-full w-full bg-[#F0F0F0] text-xs overflow-hidden relative no-print">
        <!-- Toolbar -->
        <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0 overflow-x-auto">
          <ng-container *ngFor="let item of toolbarItems; let i = index">
            <button 
              (click)="handleToolbarClick(item.label)"
              class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 whitespace-nowrap group focus:bg-gray-200 focus:outline-none"
            >
              <app-icon [name]="item.icon" [size]="18" class="text-gray-600 group-hover:text-green-600 transition-colors"></app-icon>
              <span>{{ item.label }}</span>
            </button>
            <div *ngIf="shouldRenderDivider(i)" class="w-px h-4 bg-gray-300 mx-1"></div>
          </ng-container>

          <!-- Workflow Actions -->
          <ng-container *ngIf="currentDoc.id">
            <div class="w-px h-4 bg-gray-300 mx-1"></div>
            <button *ngIf="currentDoc.status === 'DRAFT' || currentDoc.status === 'REJECTED'" (click)="onWorkflowAction('SUBMIT')" class="flex items-center gap-1 px-2 py-1 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-sm transition-all text-blue-700 group">
              <app-icon name="send" [size]="18"></app-icon>
              <span>Submeter</span>
            </button>
            <button *ngIf="currentDoc.status === 'SUBMITTED'" (click)="onWorkflowAction('APPROVE')" class="flex items-center gap-1 px-2 py-1 hover:bg-green-50 border border-transparent hover:border-green-200 rounded-sm transition-all text-green-700 group">
              <app-icon name="check_circle" [size]="18"></app-icon>
              <span>Aprovar</span>
            </button>
            <button *ngIf="currentDoc.status === 'SUBMITTED'" (click)="onWorkflowAction('REJECT')" class="flex items-center gap-1 px-2 py-1 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-sm transition-all text-red-700 group">
              <app-icon name="cancel" [size]="18"></app-icon>
              <span>Rejeitar</span>
            </button>
            <button *ngIf="currentDoc.status === 'APPROVED'" (click)="onWorkflowAction('POST')" class="flex items-center gap-1 px-2 py-1 hover:bg-purple-50 border border-transparent hover:border-purple-200 rounded-sm transition-all text-purple-700 group">
              <app-icon name="account_balance_wallet" [size]="18"></app-icon>
              <span>Lançar</span>
            </button>
          </ng-container>
        </div>

        <!-- Tabs -->
        <div class="flex items-end px-1 pt-2 border-b border-gray-300 bg-[#E0E0E0] shrink-0 gap-1 overflow-x-auto">
          <button *ngFor="let tab of tabs; let i = index"
            (click)="activeTab = i"
            [class]="'px-3 py-1 border-t-2 border-x border-b-0 rounded-t-sm text-[11px] font-medium transition-colors relative -mb-px cursor-pointer ' + 
              (i === activeTab ? 'bg-[#F0F0F0] border-t-green-600 border-x-gray-300 text-black pb-1.5 z-10' : 'bg-[#D4D4D4] border-t-transparent border-x-transparent hover:bg-[#E8E8E8] text-gray-600')">
            {{ tab }}
          </button>
        </div>

        <!-- Form Header Area (Aba Geral) -->
        <div class="bg-[#F0F0F0] border-b border-gray-300 shrink-0 h-64 overflow-y-auto relative">
          <!-- Locked Overlay -->
          <div *ngIf="isLocked" class="absolute inset-0 bg-gray-100/50 z-20 flex items-center justify-center pointer-events-none">
            <div class="bg-red-600 text-white px-4 py-2 rounded shadow-lg font-bold text-lg transform -rotate-12 opacity-80 border-4 border-white">
              {{ currentDoc.status === 'POSTED' ? 'LANÇADO' : currentDoc.status === 'APPROVED' ? 'APROVADO' : currentDoc.status === 'REJECTED' ? 'REJEITADO' : 'BLOQUEADO' }}
            </div>
          </div>

          <div *ngIf="activeTab === 0" class="flex flex-row h-full p-2 gap-2">
            <!-- Left Inputs -->
            <div class="flex-1 flex flex-col gap-1.5">
              <div class="flex items-center gap-1">
                <label class="w-24 text-green-600 font-medium text-right text-[11px] cursor-pointer hover:underline" (click)="!isLocked && openConfigModal()">Documento:</label>
                <div class="flex items-center border border-gray-300 bg-white rounded-sm h-5 w-16 relative">
                  <input class="w-full h-full px-1 focus:outline-none text-[11px]" [(ngModel)]="currentDoc.type" readonly [disabled]="isLocked" />
                  <button (click)="!isLocked && openDocTypeModal()" [disabled]="isLocked" class="absolute right-0 top-0 bottom-0 px-0.5 bg-gray-100 border-l hover:bg-gray-200 text-green-600 text-[9px] font-bold cursor-pointer">F4</button>
                </div>
                <input class="flex-1 h-5 border border-gray-300 px-1 bg-[#FDFDFD] rounded-sm focus:outline-none text-[11px]" [value]="getDocTypeDescription()" disabled />
                <div class="flex items-center gap-1 ml-2">
                  <select [(ngModel)]="currentDoc.series" (change)="loadNextNumber(); validateSeriesDate()" [disabled]="isLocked" class="h-5 border border-gray-300 bg-white rounded-sm text-[11px] w-16">
                    <option *ngFor="let s of availableSeries" [value]="s.code">{{ s.code }}</option>
                  </select>
                  <input type="number" [(ngModel)]="currentDoc.number" (change)="onNumberChange()" class="h-5 border border-gray-300 px-1 w-16 rounded-sm text-right text-[11px]" min="1" />
                </div>
                <div class="flex items-center gap-1 ml-2">
                  <label class="font-medium text-[11px]">Data Doc.:</label>
                  <input type="date" [(ngModel)]="currentDoc.date" (change)="validateSeriesDate()" [disabled]="isLocked" class="h-5 border border-gray-300 px-1 w-24 rounded-sm text-[11px]" />
                </div>
              </div>

              <!-- Fornecedor -->
              <div class="flex items-center gap-1">
                <label class="w-24 text-green-600 font-medium text-right text-[11px]">Fornecedor:</label>
                <div class="flex items-center border border-gray-300 bg-white rounded-sm h-5 w-24 relative">
                  <input class="w-full h-full px-1 focus:outline-none text-[11px]" [(ngModel)]="currentDoc.supplierCode" readonly [disabled]="isLocked" />
                  <button (click)="!isLocked && openSupplierModal()" [disabled]="isLocked" class="absolute right-0 top-0 bottom-0 px-0.5 bg-gray-100 border-l hover:bg-gray-200 text-green-600 text-[9px] font-bold cursor-pointer">F4</button>
                </div>
                <input class="flex-1 h-5 border border-gray-300 px-1 bg-white rounded-sm focus:outline-none text-[11px]" [(ngModel)]="currentDoc.supplierName" readonly [disabled]="isLocked" />
                <div class="flex items-center gap-1 ml-2">
                  <label class="font-medium text-green-600 text-[11px]">Data Venc.:</label>
                  <input type="date" [(ngModel)]="currentDoc.dueDate" [disabled]="isLocked" class="h-5 border border-gray-300 px-1 w-24 rounded-sm text-[11px]" />
                </div>
              </div>

              <div class="flex items-center gap-1">
                <div class="w-24"></div>
                <input class="flex-1 h-5 border border-gray-300 px-1 bg-[#F8F8F8] text-gray-500 rounded-sm text-[11px]" [(ngModel)]="currentDoc.supplierAddress" readonly />
              </div>

              <div class="flex items-center gap-1 mt-1">
                <label class="w-24 font-medium text-right text-[11px]">Contribuinte:</label>
                <input class="w-32 h-5 border border-gray-300 px-1 bg-white rounded-sm text-[11px]" [(ngModel)]="currentDoc.supplierNif" readonly [disabled]="isLocked" />
                <label class="ml-4 font-medium text-gray-500 text-[11px]">Referência:</label>
                <input class="flex-1 h-5 border border-gray-300 px-1 bg-white rounded-sm text-[11px]" [(ngModel)]="currentDoc.reference" [disabled]="isLocked" />
              </div>
            </div>

            <!-- Totals Panel -->
            <div class="w-64 bg-[#FDFDFD] border border-gray-300 p-2 shadow-sm flex flex-col gap-0.5 text-[11px]">
              <div class="flex justify-between text-gray-700"><span>Merc./Serv.:</span><span class="font-mono">{{ currentDoc.merchandiseTotal | number:'1.2-2' }}</span></div>
              <div class="flex justify-between text-gray-700"><span>Descontos:</span><span class="font-mono">{{ currentDoc.discountValue | number:'1.2-2' }}</span></div>
              <div class="flex justify-between text-gray-700"><span>IVA:</span><span class="font-mono">{{ currentDoc.taxTotal | number:'1.2-2' }}</span></div>
              <div class="flex justify-between text-gray-700 font-medium mt-1"><span>Subtotal:</span><span class="font-mono">{{ (currentDoc.merchandiseTotal - currentDoc.discountValue) | number:'1.2-2' }}</span></div>
              <div class="mt-auto flex justify-between font-bold text-black text-sm pt-2"><span>Total MT:</span><span class="font-mono text-green-600">{{ currentDoc.totalValue | number:'1.2-2' }}</span></div>
            </div>
          </div>

          <!-- Aba Condições -->
          <div *ngIf="activeTab === 1" class="flex flex-col gap-3 p-2">
            <div class="bg-white border border-gray-300 rounded p-3 shadow-sm">
              <h3 class="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">Condições de Pagamento</h3>
              <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center gap-3">
                  <label class="w-32 font-medium text-gray-700">Condição:</label>
                  <select [(ngModel)]="currentDoc.paymentCondition" [disabled]="isLocked" class="flex-1 h-7 border border-gray-300 px-2 bg-white rounded text-sm">
                    <option value="PRONTO">Pronto Pagamento</option>
                    <option value="PRAZO">A Prazo (Crédito)</option>
                  </select>
                </div>
                <div *ngIf="currentDoc.paymentCondition === 'PRAZO'" class="flex items-center gap-3">
                  <label class="w-32 font-medium text-gray-700">Prazo (dias):</label>
                  <input type="number" [(ngModel)]="currentDoc.paymentDays" [disabled]="isLocked" class="h-7 border border-gray-300 px-2 rounded text-sm w-24" min="0" />
                </div>
                <div class="flex items-center gap-3">
                  <label class="w-32 font-medium text-gray-700">Moeda:</label>
                  <select [(ngModel)]="currentDoc.currency" [disabled]="isLocked" class="flex-1 h-7 border border-gray-300 px-2 bg-white rounded text-sm">
                    <option value="MZN">MZN - Metical</option>
                    <option value="USD">USD - Dólar</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Aba Estado (Histórico Workflow) -->
          <div *ngIf="activeTab === 5" class="flex flex-col gap-2 p-3 h-full overflow-hidden">
             <div class="flex items-center gap-3 mb-2 bg-white p-2 border border-gray-200 rounded shadow-sm shrink-0">
               <span class="font-bold text-gray-700 text-xs">Estado Atual:</span>
               <span class="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider" 
                 [class.bg-gray-100]="currentDoc.status === 'DRAFT'"
                 [class.bg-blue-50]="currentDoc.status === 'SUBMITTED'"
                 [class.bg-green-50]="currentDoc.status === 'APPROVED'"
                 [class.bg-red-50]="currentDoc.status === 'REJECTED'"
                 [class.bg-purple-50]="currentDoc.status === 'POSTED'"
                 [class.text-gray-600]="currentDoc.status === 'DRAFT'"
                 [class.text-blue-600]="currentDoc.status === 'SUBMITTED'"
                 [class.text-green-600]="currentDoc.status === 'APPROVED'"
                 [class.text-red-600]="currentDoc.status === 'REJECTED'"
                 [class.text-purple-600]="currentDoc.status === 'POSTED'"
               >{{ currentDoc.status }}</span>
             </div>
             
             <div class="flex-1 overflow-auto border border-gray-300 rounded shadow-sm bg-white">
               <table class="w-full text-xs">
                 <thead class="bg-gray-50 sticky top-0 border-b border-gray-300 text-gray-500 uppercase text-[9px]">
                   <tr>
                     <th class="px-3 py-2 text-left font-semibold">Data/Hora</th>
                     <th class="px-3 py-2 text-left font-semibold">De</th>
                     <th class="px-3 py-2 text-left font-semibold">Para</th>
                     <th class="px-3 py-2 text-left font-semibold">Utilizador</th>
                     <th class="px-3 py-2 text-left font-semibold">Notas</th>
                   </tr>
                 </thead>
                 <tbody class="divide-y divide-gray-100">
                   <tr *ngFor="let h of workflowHistory" class="hover:bg-gray-50 transition-colors italic text-gray-600">
                     <td class="px-3 py-2 whitespace-nowrap">{{ h.createdAt | date:'yyyy-MM-dd HH:mm' }}</td>
                     <td class="px-3 py-2"><span class="px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-500 text-[9px]">{{ h.fromStatus }}</span></td>
                     <td class="px-3 py-2"><span class="px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-600 text-[9px] font-medium">{{ h.toStatus }}</span></td>
                     <td class="px-3 py-2 font-medium">{{ h.userName }}</td>
                     <td class="px-3 py-2">{{ h.notes || '-' }}</td>
                   </tr>
                   <tr *ngIf="workflowHistory.length === 0">
                     <td colspan="5" class="px-3 py-10 text-center text-gray-400">Sem histórico de workflow registrado.</td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </div>

          <div *ngIf="activeTab > 1 && activeTab !== 5" class="flex items-center justify-center p-8 text-gray-400">
            <p class="text-sm">Conteúdo da aba "{{ tabs[activeTab] }}" em desenvolvimento...</p>
          </div>
        </div>

        <!-- Data Grid -->
        <div class="flex-1 overflow-auto bg-white relative border-t border-gray-300">
          <div *ngIf="isLocked" class="absolute inset-0 bg-gray-100/30 z-20 pointer-events-none"></div>
          <table class="w-full border-collapse table-fixed">
            <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm text-[10px] uppercase">
              <tr>
                <th class="px-2 py-1 border-r border-b border-l border-gray-300 text-green-600 font-bold text-left w-[120px]">Artigo</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[60px]">Arm.</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[80px]">Localização</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[80px]">Lote</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left min-w-[300px]">Descrição</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[50px]">CIVA</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[50px]">IVA %</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[90px]">Pr. Unit.</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[60px]">Desc.</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[40px]">UN</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[70px]">Qtd.</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[90px]">Total Liq.</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[80px]">C. Custo</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[80px]">Projeto</th>
                <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left w-[90px]">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of currentDoc.lines; let i = index" (contextmenu)="onContextMenu($event, i)" class="border-b border-gray-200 hover:bg-blue-50 h-6 group">
                <td class="border-r border-b border-l border-gray-200 h-6 p-0 relative overflow-hidden">
                  <div class="flex h-full items-center bg-white group/cell focus-within:ring-1 focus-within:ring-green-500 overflow-hidden">
                    <input type="text" [(ngModel)]="line.articleCode" 
                      (keydown)="onArticleKeydown(i, $event)"
                      (dblclick)="!isLocked && openArticleSearch(i)" 
                      (change)="onArticleCodeChange(i, line.articleCode)" 
                      [disabled]="isLocked" 
                      class="flex-1 w-0 h-full px-1 border-none bg-transparent focus:outline-none text-[11px]" />
                    <button *ngIf="!isLocked" (click)="openArticleSearch(i)" 
                      class="w-5 shrink-0 h-full flex items-center justify-center text-gray-400 hover:text-green-600 transition-all opacity-0 group-hover/cell:opacity-100">
                      <app-icon name="search" [size]="14"></app-icon>
                    </button>
                  </div>
                </td>
                <td class="border-r border-b border-gray-200 p-0 text-center overflow-hidden">
                  <div class="flex h-full items-center bg-white group/cell focus-within:ring-1 focus-within:ring-blue-400 overflow-hidden">
                    <input class="flex-1 w-0 h-full border-none px-1 text-center bg-transparent focus:outline-none text-[11px]" 
                      [(ngModel)]="line.warehouse" 
                      (keydown)="onWarehouseKeydown(i, $event)"
                      [disabled]="isLocked" />
                    <button *ngIf="!isLocked && line.articleCode" (click)="openWarehouseSearch(i)" 
                      class="w-4 shrink-0 h-full flex items-center justify-center text-gray-400 hover:text-blue-600 opacity-0 group-hover/cell:opacity-100 transition-all">
                      <app-icon name="search" [size]="12"></app-icon>
                    </button>
                  </div>
                </td>
                <td class="border-r border-b border-gray-200 p-0 text-center overflow-hidden">
                  <div class="flex h-full items-center bg-white group/cell focus-within:ring-1 focus-within:ring-blue-400 overflow-hidden">
                    <input class="flex-1 w-0 h-full border-none px-1 text-center bg-transparent focus:outline-none text-[11px]" 
                      [(ngModel)]="line.location" 
                      (keydown)="onLocationKeydown(i, $event)"
                      [disabled]="isLocked" />
                    <button *ngIf="!isLocked && line.articleCode" (click)="openLocationSearch(i)" 
                      class="w-4 shrink-0 h-full flex items-center justify-center text-gray-400 hover:text-blue-600 opacity-0 group-hover/cell:opacity-100 transition-all">
                      <app-icon name="search" [size]="12"></app-icon>
                    </button>
                  </div>
                </td>
                <td class="border-r border-b border-gray-200 p-0 text-center overflow-hidden">
                  <div class="flex h-full items-center bg-white group/cell focus-within:ring-1 focus-within:ring-blue-400 overflow-hidden">
                    <input class="flex-1 w-0 h-full border-none px-1 text-center bg-transparent focus:outline-none text-[11px]" 
                      [(ngModel)]="line.batch" 
                      (keydown)="onBatchKeydown(i, $event)"
                      [disabled]="isLocked" />
                    <button *ngIf="!isLocked && line.articleCode" (click)="openBatchSearch(i)" 
                      class="w-4 shrink-0 h-full flex items-center justify-center text-gray-400 hover:text-blue-600 opacity-0 group-hover/cell:opacity-100 transition-all">
                      <app-icon name="search" [size]="12"></app-icon>
                    </button>
                  </div>
                </td>
                <td class="border-r border-b border-gray-200 p-0"><input class="w-full h-full border-none px-1 bg-transparent focus:bg-blue-50" [(ngModel)]="line.description" [disabled]="isLocked" /></td>
                <td class="border-r border-b border-gray-200 p-0 text-center overflow-hidden">
                  <div class="flex h-full items-center bg-white group/cell focus-within:ring-1 focus-within:ring-blue-400 overflow-hidden">
                    <input class="flex-1 w-0 h-full border-none px-1 text-center bg-transparent focus:outline-none text-[11px]" 
                      [(ngModel)]="line.taxCode" 
                      (keydown)="onTaxKeydown(i, $event)"
                      [disabled]="isLocked" />
                    <button *ngIf="!isLocked && line.articleCode" (click)="openTaxSearch(i)" 
                      class="w-4 shrink-0 h-full flex items-center justify-center text-gray-400 hover:text-blue-600 opacity-0 group-hover/cell:opacity-100 transition-all">
                      <app-icon name="search" [size]="12"></app-icon>
                    </button>
                  </div>
                </td>
                <td class="border-r border-b border-gray-200 p-0 text-center text-gray-500">{{ line.articleCode ? line.taxRate + '%' : '' }}</td>
                <td class="border-r border-b border-gray-200 p-0 text-right"><input *ngIf="line.articleCode" type="number" class="w-full h-full border-none px-1 text-right bg-transparent focus:bg-blue-50" [(ngModel)]="line.unitPrice" (change)="calculateLine(i)" [disabled]="isLocked" /></td>
                <td class="border-r border-b border-gray-200 p-0 text-right"><input *ngIf="line.articleCode" type="number" class="w-full h-full border-none px-1 text-right bg-transparent focus:bg-blue-50" [(ngModel)]="line.discount" (change)="calculateLine(i)" [disabled]="isLocked" /></td>
                <td class="border-r border-b border-gray-200 p-0 text-center text-gray-500">{{ line.articleCode ? line.unit : '' }}</td>
                <td class="border-r border-b border-gray-200 p-0 text-right font-medium"><input *ngIf="line.articleCode" type="number" class="w-full h-full border-none px-1 text-right bg-transparent focus:bg-blue-50 text-blue-700" [(ngModel)]="line.quantity" (change)="calculateLine(i)" [disabled]="isLocked" /></td>
                <td class="border-r border-b border-gray-200 p-0 text-right text-gray-600 bg-[#F9F9F9]">{{ line.articleCode ? (line.totalLiquid | number:'1.2-2') : '' }}</td>
                <td class="border-r border-b border-gray-200 p-0"><input class="w-full h-full border-none px-1 bg-transparent focus:bg-blue-50" [(ngModel)]="line.costCenter" [disabled]="isLocked" /></td>
                <td class="border-r border-b border-gray-200 p-0"><input class="w-full h-full border-none px-1 bg-transparent focus:bg-blue-50" [(ngModel)]="line.project" [disabled]="isLocked" /></td>
                <td class="border-r border-b border-gray-200 p-0 text-right font-bold text-gray-700 bg-[#F5F5F5]">{{ line.articleCode ? (line.totalValue | number:'1.2-2') : '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Status Bar -->
        <div class="px-2 py-1 bg-[#DCE4F2] border-t border-gray-300 shrink-0 flex justify-between items-center text-[10px] text-gray-600">
          <div><span>{{ currentDoc.lines.length }} Registo(s)</span></div>
          <div class="flex gap-4 font-bold text-blue-900 pr-4">
            <span>Subtotal: {{ (currentDoc.merchandiseTotal - currentDoc.discountValue) | number:'1.2-2' }}</span>
            <span>IVA: {{ currentDoc.taxTotal | number:'1.2-2' }}</span>
            <span class="ml-4 text-green-700 bg-white px-2 rounded-sm border border-green-200">TOTAL: {{ currentDoc.totalValue | number:'1.2-2' }} MT</span>
          </div>

          <!-- Context Menu -->
          <div *ngIf="contextMenuVisible" 
            class="fixed z-50 bg-white shadow-lg border border-gray-200 rounded-sm py-1 w-64 text-xs"
            [style.left.px]="contextMenuPosition.x"
            [style.top.px]="contextMenuPosition.y">
            <button (click)="insertLine()" class="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center gap-2">
              <app-icon name="add" [size]="16" color="#059669"></app-icon>
              Inserir Linha
            </button>
            <button (click)="removeLine()" class="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center gap-2">
              <app-icon name="remove" [size]="16" color="#dc2626"></app-icon>
              Remover Linha
            </button>
          </div>

          <!-- Modals -->
          <app-purchase-document-type-modal
            *ngIf="isDocTypeModalOpen"
            [documentTypes]="purchaseDocTypes"
            (close)="isDocTypeModalOpen = false"
            (select)="onDocTypeSelect($event)">
          </app-purchase-document-type-modal>

          <app-supplier-search-modal
            *ngIf="isSupplierModalOpen"
            (close)="isSupplierModalOpen = false"
            (select)="onSupplierSelect($event)">
          </app-supplier-search-modal>

          <app-article-search-modal
            *ngIf="isArticleModalOpen"
            [isOpen]="true"
            (close)="isArticleModalOpen = false"
            (select)="onArticleSelect($event)">
          </app-article-search-modal>

          <app-warehouse-search-modal
            *ngIf="isWarehouseModalOpen"
            [isOpen]="true"
            (close)="isWarehouseModalOpen = false"
            (select)="onWarehouseSelect($event)">
          </app-warehouse-search-modal>

          <app-location-search-modal
            *ngIf="isLocationModalOpen"
            [isOpen]="true"
            [warehouseFilter]="activeLineForModal?.warehouse || ''"
            (close)="isLocationModalOpen = false"
            (select)="onLocationSelect($event)">
          </app-location-search-modal>

          <app-batch-search-modal
            *ngIf="isBatchModalOpen"
            [isOpen]="true"
            [articleFilter]="activeLineForModal?.articleCode || ''"
            (close)="isBatchModalOpen = false"
            (select)="onBatchSelect($event)">
          </app-batch-search-modal>

          <app-tax-search-modal
            *ngIf="isTaxModalOpen"
            [isOpen]="true"
            (close)="isTaxModalOpen = false"
            (select)="onTaxSelect($event)">
          </app-tax-search-modal>

          <app-purchase-document-search-modal
            *ngIf="isSearchModalOpen"
            (close)="isSearchModalOpen = false"
            (select)="onDocumentSelect($event)">
          </app-purchase-document-search-modal>

          <app-document-type-config-modal
            *ngIf="isConfigModalOpen"
            [module]="'PURCHASES'"
            [documentCode]="currentDoc.type"
            (close)="onConfigModalClose()">
          </app-document-type-config-modal>
        </div>
      </div>

      <!-- Print (Hidden) -->
      <div class="print-only hidden">
        <div class="p-8 font-sans">
          <div class="flex justify-between items-start mb-8 border-b pb-4">
            <div class="flex items-center gap-4">
              <img *ngIf="companyInfo?.logoUrl" [src]="companyInfo?.logoUrl" class="h-16 w-auto" alt="Logo">
              <div><h1 class="text-2xl font-bold">{{ companyInfo?.name }}</h1><p>{{ companyInfo?.address }}</p><p>NIF: {{ companyInfo?.nif }}</p></div>
            </div>
            <div class="text-right"><h2 class="text-xl font-bold">Documento de Compra</h2><p>{{ currentDoc.series }} / {{ currentDoc.number }}</p><p>Data: {{ currentDoc.date | date:'dd/MM/yyyy' }}</p></div>
          </div>
          <table class="w-full mb-8">
            <thead><tr class="border-b-2 border-gray-300"><th class="text-left py-2">Artigo</th><th class="text-left py-2">Descrição</th><th class="text-right py-2">Qtd</th><th class="text-right py-2">Total</th></tr></thead>
            <tbody><tr *ngFor="let row of currentDoc.lines" class="border-b border-gray-100"><ng-container *ngIf="row.articleCode"><td class="py-2">{{ row.articleCode }}</td><td class="py-2">{{ row.description }}</td><td class="py-2 text-right">{{ row.quantity }}</td><td class="py-2 text-right">{{ row.totalValue | number:'1.2-2' }}</td></ng-container></tr></tbody>
          </table>
          <div class="flex justify-end"><div class="w-64"><div class="flex justify-between font-bold text-lg"><span>Total:</span><span>{{ currentDoc.totalValue | number:'1.2-2' }} MT</span></div></div></div>
        </div>

        <app-document-type-config-modal
          *ngIf="isConfigModalOpen"
          [module]="'PURCHASES'"
          [documentCode]="currentDoc.type"
          (close)="onConfigModalClose()">
        </app-document-type-config-modal>
      </div>
    </ng-container>

    <ng-template #loading>
      <div class="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 min-h-[400px]">
        <span class="material-symbols-outlined text-4xl animate-spin mb-2">sync</span>
        <p class="text-sm font-medium uppercase">A carregar dados...</p>
      </div>
    </ng-template>

    <style>@media print { body { visibility: hidden; } .print-only { visibility: visible; position: fixed; left: 0; top: 0; background: white; z-index: 9999; display: block !important; } .no-print { display: none !important; } }</style>
  `
})
export class PurchaseDocumentFormComponent {
  @Input() viewMode: string = 'purchase-form';

  activeCompanyId: string | null = null;
  companyInfo: CompanyInfo | null = null;

  activeTab = 0;
  tabs = ["Geral", "Condições", "Transação", "Recepção", "Observações", "Workflow/Estado", "Anexos"];
  workflowHistory: WorkflowHistory[] = [];



  get toolbarItems() {
    return this.isInternal
      ? [
        { label: "Gravar", icon: "save" },
        { label: "Novo", icon: "add_circle" },
        { label: "Duplicar", icon: "content_copy" },
        { label: "Imprimir", icon: "print" },
        { label: "Procurar", icon: "search" },
        { label: "Enviar", icon: "send" },
        { label: "CRM", icon: "contacts" },
        { label: "Contexto", icon: "settings" },
        { label: "Ajuda", icon: "help_outline" },
        { label: "Cancelar", icon: "logout" },
      ]
      : [
        { label: "Gravar", icon: "save" },
        { label: "Novo", icon: "add_circle" },
        { label: "Anular", icon: "block" },
        { label: "Duplicar", icon: "content_copy" },
        { label: "Anular e Duplicar", icon: "file_copy" },
        { label: "Imprimir", icon: "print" },
        { label: "Rascunhos", icon: "history_edu" },
        { label: "Procurar", icon: "search" },
        { label: "Enviar", icon: "send" },
        { label: "CRM", icon: "contacts" },
        { label: "Contexto", icon: "settings" },
        { label: "Ajuda", icon: "help_outline" },
        { label: "Cancelar", icon: "logout" },
      ];
  }

  shouldRenderDivider(idx: number): boolean {
    if (this.isInternal) {
      return idx === 2 || idx === 3 || idx === 4 || idx === 6;
    } else {
      return idx === 4 || idx === 6 || idx === 9;
    }
  }

  // Modals state
  isDocTypeModalOpen = false;
  isSupplierModalOpen = false;
  isArticleModalOpen = false;
  isWarehouseModalOpen = false;
  isLocationModalOpen = false;
  isBatchModalOpen = false;
  isTaxModalOpen = false;
  isSearchModalOpen = false;
  isConfigModalOpen = false;

  onConfigModalClose() {
    this.isConfigModalOpen = false;
    this.loadSeries();
  }

  // Context menu
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuRowIndex = -1;

  // Active line for modals
  activeLineForModal: PurchaseDocumentLine | null = null;
  activeLineIndex = -1;
  get isInternal(): boolean {
    return this.viewMode === 'internal-docs';
  }

  get isLocked(): boolean {
    if (!this.currentDoc) return false;
    return this.currentDoc.status === WorkflowStatus.APPROVED || this.currentDoc.status === WorkflowStatus.POSTED;
  }

  availableSeries: any[] = [];
  purchaseDocTypes: any[] = [];
  currentDoc!: PurchaseDocument;

  constructor(
    private accountingService: AccountingService,
    private inventoryService: InventoryService,
    private auditService: AuditService,
    private periodService: PeriodService,
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.loadActiveCompany();
  }

  loadActiveCompany() {
    this.dataService.activeCompany$.subscribe(company => {
      if (company) {
        this.activeCompanyId = company.id;
        this.companyInfo = company;

        // Initialize document with the correct company context
        this.currentDoc = this.createEmptyDocument();

        // Load series and numbers after company ID is known
        this.loadSeries();

        this.cdr.detectChanges();
      }
    });
  }

  loadSeries() {
    this.availableSeries = [];

    this.dataService.getDocumentTypes('PURCHASES').subscribe(types => {
      this.purchaseDocTypes = types || [];
      const docType = this.purchaseDocTypes.find((t: any) => t.code === this.currentDoc.type);

      if (docType && docType.series && docType.series.length > 0) {
        if (this.activeCompanyId) {
          this.availableSeries = docType.series.filter((s: any) => s.active && s.companyId == this.activeCompanyId);
        } else {
          this.availableSeries = docType.series.filter((s: any) => s.active && !s.companyId);
        }
      }

      // Ensure current series is in the list, if not select the default one or the first one
      if (this.availableSeries.length > 0) {
        const currentExists = this.availableSeries.find(s => s.code === this.currentDoc.series);
        if (!this.currentDoc.series || !currentExists) {
          const defaultS = this.availableSeries.find(s => s.isDefault);
          this.currentDoc.series = defaultS ? defaultS.code : this.availableSeries[0].code;
        }
      } else {
        this.currentDoc.series = '';
      }
      this.loadNextNumber(); // Reload next number after series is updated
      this.cdr.detectChanges();
    });
  }

  createEmptyDocument(): PurchaseDocument {
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();

    return {
      id: '',
      companyId: this.activeCompanyId || undefined,
      type: 'FC',
      series: currentYear,
      number: 1,
      date: today,
      dueDate: today,
      supplierCode: '',
      supplierName: '',
      supplierNif: '',
      supplierAddress: '',
      reference: '',
      paymentCondition: 'PRAZO',
      paymentDays: 30,
      currency: 'MZN',
      status: WorkflowStatus.DRAFT,
      lines: this.createEmptyLines(15),
      merchandiseTotal: 0,
      discountValue: 0,
      taxTotal: 0,
      totalValue: 0,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  createEmptyLines(count: number): PurchaseDocumentLine[] {
    return Array(count).fill(null).map(() => ({
      id: '',
      articleCode: '',
      articleName: '',
      warehouse: '',
      location: '',
      batch: '',
      description: '',
      taxCode: '',
      taxRate: 0,
      unitPrice: 0,
      discount: 0,
      unit: '',
      quantity: 0,
      totalLiquid: 0,
      totalValue: 0,
      project: '',
      costCenter: '',
      analytic: '',
      functional: ''
    }));
  }

  loadNextNumber() {
    this.dataService.getPurchaseDocuments(this.activeCompanyId || undefined).subscribe(docs => {
      const sameSeries = docs.filter((d: any) => d.type === this.currentDoc.type && d.series === this.currentDoc.series);
      if (sameSeries.length > 0) {
        const numbers = sameSeries.map((d: any) => Number(d.number)).filter(n => !isNaN(n));
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        this.currentDoc.number = maxNumber + 1;
      } else {
        this.currentDoc.number = 1;
      }
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    });
  }

  onNumberChange() {
    const type = this.currentDoc.type;
    const series = this.currentDoc.series;
    const num = this.currentDoc.number;

    if (!type || !series || !num || !this.activeCompanyId) return;

    this.dataService.getPurchaseDocumentByNumber(this.activeCompanyId, type, series, num).subscribe(found => {
      if (found) {
        this.currentDoc = found;
        this.loadWorkflowHistory();
      } else {
        // If not found, treat as new document with this number
        this.currentDoc = this.createEmptyDocument();
        this.currentDoc.type = type;
        this.currentDoc.series = series;
        this.currentDoc.number = num;
      }
    });
  }

  getDocTypeDescription(): string {
    if (!this.purchaseDocTypes || this.purchaseDocTypes.length === 0) {
      // Fallback to constants or common types if not loaded yet
      const types: any = {
        'FC': 'Fatura de Compra',
        'NC': 'Nota de Crédito',
        'ND': 'Nota de Débito',
        'GR': 'Guia de Receção',
        'EF': 'Encomenda a Fornecedor',
        'DC': 'Devolução a Fornecedor'
      };
      return types[this.currentDoc.type] || '';
    }

    const docType = this.purchaseDocTypes.find(t => t.code === this.currentDoc.type);
    return docType ? (docType.name || docType.description) : this.currentDoc.type;
  }

  // Modal handlers
  openDocTypeModal() {
    this.isDocTypeModalOpen = true;
  }

  onDocTypeSelect(type: any) {
    this.currentDoc.type = type.code;
    this.isDocTypeModalOpen = false;
    this.loadSeries(); // Reload series for new type
    this.loadNextNumber();
  }

  openSupplierModal() {
    this.isSupplierModalOpen = true;
  }

  onSupplierSelect(supplier: any) {
    this.currentDoc.supplierCode = supplier.code;
    this.currentDoc.supplierName = supplier.name;
    this.currentDoc.supplierNif = supplier.nif;
    this.currentDoc.supplierAddress = supplier.address;
    this.currentDoc.supplierAccountId = supplier.payableAccountId;

    if (supplier.paymentTerms > 0) {
      this.currentDoc.paymentCondition = 'PRAZO';
      this.currentDoc.paymentDays = supplier.paymentTerms;
    } else {
      this.currentDoc.paymentCondition = 'PRONTO';
      this.currentDoc.paymentDays = 0;
    }

    this.isSupplierModalOpen = false;
  }

  openArticleSearch(index: number) {
    this.activeLineIndex = index;
    this.activeLineForModal = this.currentDoc.lines[index];
    this.isArticleModalOpen = true;
  }

  onArticleSelect(article: any) {
    if (this.activeLineIndex !== -1) {
      const line = this.currentDoc.lines[this.activeLineIndex];
      line.articleId = article.id;
      line.articleCode = article.code;
      line.articleName = article.description;
      line.description = article.description;
      line.unit = article.unit;
      line.unitPrice = article.purchasePrice || 0;
      line.quantity = 1;
      line.taxRate = 16; // Default
      line.taxCode = '16';
      this.calculateLine(this.activeLineIndex);
    }
    this.isArticleModalOpen = false;
  }

  onArticleCodeChange(index: number, code: string) {
    if (!code) return;
    const article = this.inventoryService.getArticleByCode(code);
    if (article) {
      this.activeLineIndex = index;
      this.onArticleSelect(article);
    }
  }

  onArticleBlur(index: number) {
    const line = this.currentDoc.lines[index];
    if (!line.articleCode) return;

    const article = this.inventoryService.getArticleByCode(line.articleCode);
    if (article) {
      line.articleId = article.id;
      line.articleName = article.description;
      line.description = article.description;
      line.unit = article.unit;
      line.unitPrice = article.purchasePrice || 0;
      if (line.quantity === 0) line.quantity = 1;
      this.calculateLine(index);
    }
  }

  // Keydown Handlers for F4
  onArticleKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openArticleSearch(index);
    }
  }

  onWarehouseKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openWarehouseSearch(index);
    }
  }

  onLocationKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openLocationSearch(index);
    }
  }

  onBatchKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openBatchSearch(index);
    }
  }

  onTaxKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openTaxSearch(index);
    }
  }

  openWarehouseSearch(index: number) {
    this.activeLineIndex = index;
    this.activeLineForModal = this.currentDoc.lines[index];
    this.isWarehouseModalOpen = true;
  }

  onWarehouseSelect(warehouse: any) {
    if (this.activeLineIndex !== -1) {
      this.currentDoc.lines[this.activeLineIndex].warehouse = warehouse.code;
    }
    this.isWarehouseModalOpen = false;
  }

  openLocationSearch(index: number) {
    this.activeLineIndex = index;
    this.activeLineForModal = this.currentDoc.lines[index];
    this.isLocationModalOpen = true;
  }

  onLocationSelect(location: any) {
    if (this.activeLineIndex !== -1) {
      this.currentDoc.lines[this.activeLineIndex].location = location.code;
    }
    this.isLocationModalOpen = false;
  }

  openBatchSearch(index: number) {
    this.activeLineIndex = index;
    this.activeLineForModal = this.currentDoc.lines[index];
    this.isBatchModalOpen = true;
  }

  onBatchSelect(batch: any) {
    if (this.activeLineIndex !== -1) {
      this.currentDoc.lines[this.activeLineIndex].batch = batch.code;
    }
    this.isBatchModalOpen = false;
  }

  openTaxSearch(index: number) {
    this.activeLineIndex = index;
    this.activeLineForModal = this.currentDoc.lines[index];
    this.isTaxModalOpen = true;
  }

  onTaxSelect(tax: any) {
    if (this.activeLineIndex !== -1) {
      this.currentDoc.lines[this.activeLineIndex].taxCode = tax.code;
      this.currentDoc.lines[this.activeLineIndex].taxRate = tax.rate;
      this.calculateLine(this.activeLineIndex);
    }
    this.isTaxModalOpen = false;
  }

  // Calculations
  calculateLine(index: number) {
    const line = this.currentDoc.lines[index];
    if (!line.articleCode) return;

    const grossTotal = line.quantity * line.unitPrice;
    const discountValue = grossTotal * (line.discount / 100);
    const liquidTotal = grossTotal - discountValue;
    const taxValue = liquidTotal * (line.taxRate / 100);
    const totalValue = liquidTotal + taxValue;

    line.totalLiquid = liquidTotal;
    line.totalValue = totalValue;

    this.calculateTotals();
  }

  calculateTotals() {
    let merchandise = 0;
    let discounts = 0;
    let tax = 0;
    let total = 0;

    this.currentDoc.lines.forEach(line => {
      if (!line.articleCode) return;

      const grossTotal = line.quantity * line.unitPrice;
      const discountValue = grossTotal * (line.discount / 100);
      const liquidTotal = grossTotal - discountValue;
      const taxValue = liquidTotal * (line.taxRate / 100);

      merchandise += grossTotal;
      discounts += discountValue;
      tax += taxValue;
      total += liquidTotal + taxValue;
    });

    this.currentDoc.merchandiseTotal = merchandise;
    this.currentDoc.discountValue = discounts;
    this.currentDoc.taxTotal = tax;
    this.currentDoc.totalValue = total;
  }

  // Context menu
  onContextMenu(event: MouseEvent, index: number) {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuRowIndex = index;
  }

  insertLine() {
    if (this.contextMenuRowIndex !== -1) {
      const newLine: PurchaseDocumentLine = {
        id: '',
        articleCode: '',
        articleName: '',
        warehouse: '',
        location: '',
        batch: '',
        description: '',
        taxCode: '',
        taxRate: 0,
        unitPrice: 0,
        discount: 0,
        unit: '',
        quantity: 0,
        totalLiquid: 0,
        totalValue: 0,
        project: '',
        costCenter: '',
        analytic: '',
        functional: ''
      };
      this.currentDoc.lines.splice(this.contextMenuRowIndex, 0, newLine);
    }
    this.contextMenuVisible = false;
  }

  removeLine() {
    if (this.contextMenuRowIndex !== -1 && this.currentDoc.lines.length > 1) {
      this.currentDoc.lines.splice(this.contextMenuRowIndex, 1);
      this.calculateTotals();
    }
    this.contextMenuVisible = false;
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuVisible = false;
  }

  // Toolbar actions

  // Toolbar actions
  handleToolbarClick(action: string) {
    switch (action) {
      case 'Gravar':
        this.saveDocument();
        break;
      case 'Lançar':
        this.confirmDocument();
        break;
      case 'Novo':
        this.newDocument();
        break;
      case 'Anular':
        this.voidDocument();
        break;
      case 'Duplicar':
        this.duplicateDocument();
        break;
      case 'Imprimir':
        this.printDocument();
        break;
      case 'Procurar':
        this.openSearchModal();
        break;
      case 'Enviar':
        this.sendDocument();
        break;
      case 'Anular e Duplicar':
        this.voidAndDuplicate();
        break;
      case 'Rascunhos':
        this.showDrafts();
        break;
      case 'CRM':
        this.openCrm();
        break;
      case 'Contexto':
        this.openContext();
        break;
      case 'Ajuda':
        this.showHelp();
        break;
      case 'Cancelar':
        this.newDocument();
        break;
      default:
        console.log(`Action: ${action} `);
    }
  }

  voidDocument() {
    if (this.currentDoc.status === WorkflowStatus.REJECTED) return;
    if (!this.currentDoc.id) {
      alert('Não é possível anular um documento não gravado.');
      return;
    }
    if (confirm('Tem a certeza que deseja anular este documento?')) {
      this.currentDoc.status = WorkflowStatus.REJECTED;
      this.dataService.savePurchaseDocument(this.currentDoc).subscribe(() => {
        alert('Documento anulado com sucesso.');
        this.loadWorkflowHistory();
      });
    }
  }

  duplicateDocument() {
    // Create a copy without ID and with new number
    const copy = JSON.parse(JSON.stringify(this.currentDoc));
    copy.id = '';
    copy.status = WorkflowStatus.DRAFT;
    copy.date = new Date().toISOString().split('T')[0];
    copy.dueDate = new Date().toISOString().split('T')[0];

    this.currentDoc = copy;
    this.loadNextNumber();
    alert('Documento duplicado. Verifique os dados e grave.');
  }

  printDocument() {
    if (this.isLocked) {
      alert('Este documento já foi processado e não pode ser alterado.');
      // In a real app, we would still show the print preview
      return;
    }

    if (!confirm('A impressão irá bloquear o documento para edições futuras. Deseja continuar?')) {
      return;
    }

    // Save first to ensure data is persisted
    this.saveDocument(true, true); // Post and Print
  }

  confirmDocument() {
    if (this.isLocked) {
      alert('Este documento já foi processado.');
      return;
    }
    if (confirm('Confirma o lançamento do documento? Ele ficará bloqueado para edições.')) {
      this.saveDocument(true, false); // Post, no Print
    }
  }

  openSearchModal() {
    this.isSearchModalOpen = true;
  }

  onDocumentSelect(doc: any) {
    this.currentDoc = doc;
    this.isSearchModalOpen = false;
  }

  openConfigModal() {
    this.isConfigModalOpen = true;
  }

  sendDocument() {
    alert('Funcionalidade de envio de email em desenvolvimento.');
  }

  voidAndDuplicate() {
    if (!this.currentDoc.id) {
      alert('Grave o documento antes de anular.');
      return;
    }
    if (confirm('Deseja anular este documento e criar uma cópia?')) {
      this.currentDoc.status = WorkflowStatus.REJECTED;
      this.dataService.savePurchaseDocument(this.currentDoc).subscribe(() => {
        this.duplicateDocument();
      });
    }
  }

  showDrafts() {
    this.isSearchModalOpen = true;
    // We would ideally filter by status=DRAFT here
    alert('A mostrar pesquisa filtrada por rascunhos.');
  }

  openCrm() {
    alert('Integração com CRM em desenvolvimento.');
  }

  openContext() {
    alert('Opções de contexto em desenvolvimento.');
  }

  showHelp() {
    alert('Ajuda do sistema em desenvolvimento.');
  }

  saveDocument(post: boolean = false, print: boolean = false) {
    if (this.isLocked && !post) {
      alert('Este documento está bloqueado e não pode ser alterado.');
      return;
    }

    // Validate Period Closure
    if (!this.periodService.isPeriodOpen(this.currentDoc.date)) {
      alert('O período para esta data está fechado. Não é possível gravar documentos nesta data.');
      return;
    }

    // Check for Retroactive Date (Audit only)
    const docDate = new Date(this.currentDoc.date);
    const today = new Date();
    docDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (docDate < today) {
      // Log retroactive entry
      this.auditService.logException({
        user: 'current_user',
        action: 'RETROACTIVE_ENTRY',
        module: 'PURCHASES',
        documentRef: `${this.currentDoc.type} ${this.currentDoc.series}/${this.currentDoc.number}`,
        details: {
          documentDate: this.currentDoc.date,
          postingDate: new Date().toISOString(),
          reason: 'Retroactive purchase entry'
        }
      });
    }

    // Validate Series Date
    const allSeries = JSON.parse(localStorage.getItem('erp_series_definitions') || '[]');
    const seriesDef = allSeries.find((s: any) => s.code === this.currentDoc.series && s.companyId == this.activeCompanyId);
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

    // Validate
    if (!this.currentDoc.supplierCode) {
      alert('Selecione um fornecedor!');
      return;
    }

    if (!this.currentDoc.series) {
      alert('A série do documento é obrigatória!');
      return;
    }

    if (!this.currentDoc.number) {
      alert('O número do documento é obrigatório!');
      return;
    }

    const hasLines = this.currentDoc.lines.some(l => l.articleCode);
    if (!hasLines) {
      alert('Adicione pelo menos uma linha ao documento!');
      return;
    }

    // Generate ID if new
    if (!this.currentDoc.id) {
      this.currentDoc.id = `PUR-${Date.now()}`;
    }

    // Update status
    if (post) {
      this.currentDoc.status = WorkflowStatus.POSTED;
    } else if (this.currentDoc.status === WorkflowStatus.DRAFT) {
      this.currentDoc.status = WorkflowStatus.DRAFT;
    }

    this.currentDoc.updatedAt = new Date().toISOString();

    // Unified Mapping for Backend DTO (Matches src/purchases/dto/create-purchase.dto.ts)
    const backendPayload = {
      id: (this.currentDoc.id && !this.currentDoc.id.startsWith('PUR-')) ? this.currentDoc.id : undefined, // Only send real IDs
      companyId: this.activeCompanyId,
      documentType: this.currentDoc.type,
      series: this.currentDoc.series,
      seriesNumber: Number(this.currentDoc.number),
      documentNumber: `${this.currentDoc.type}${this.currentDoc.series}/${this.currentDoc.number}`,
      date: this.currentDoc.date,
      dueDate: this.currentDoc.dueDate || this.currentDoc.date,
      supplierId: this.currentDoc.supplierCode, // Map code to ID if needed
      supplierName: this.currentDoc.supplierName,
      supplierNif: this.currentDoc.supplierNif,
      supplierAddress: this.currentDoc.supplierAddress,
      subtotal: Number(this.currentDoc.merchandiseTotal),
      discounts: Number(this.currentDoc.discountValue),
      totalIva: Number(this.currentDoc.taxTotal),
      total: Number(this.currentDoc.totalValue),
      notes: this.currentDoc.notes,
      status: this.currentDoc.status,
      lines: this.currentDoc.lines
        .filter(l => l.articleCode && l.articleCode.trim() !== '')
        .map(l => {
          const article = this.inventoryService.getArticleByCode(l.articleCode);
          return {
            id: (l.id && l.id.length === 36) ? l.id : undefined, // Only send real UUIDs
            articleId: l.articleId || (article ? article.id : '00000000-0000-0000-0000-000000000000'), // Fallback to avoid mandatory fail
            articleCode: l.articleCode,
            articleName: l.articleName || article?.description || 'Desconhecido',
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            discount: Number(l.discount || 0),
            ivaRate: Number(l.taxRate || 0),
            ivaCode: l.taxCode || 'IVA16',
            subtotal: Number(l.totalLiquid),
            ivaAmount: Number(l.totalValue - l.totalLiquid),
            total: Number(l.totalValue)
          };
        })
    };

    // Save via DataService
    this.dataService.savePurchaseDocument(backendPayload).subscribe({
      next: (savedDoc) => {
        // Refresh inventory data after save to reflect stock changes
        this.inventoryService.loadData().then(() => {
          this.currentDoc = savedDoc || this.currentDoc;
          this.loadWorkflowHistory();
          if (post) {
            // Create stock movements and accounting ONLY when posting
            this.createStockMovements();
            this.createAccountingEntries();
            if (print) {
              alert('Documento processado e enviado para a impressora.');
              setTimeout(() => window.print(), 500);
            } else {
              alert('Documento lançado com sucesso.');
            }
          } else {
            alert('Documento gravado como Rascunho.');
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Erro ao gravar documento:', err);
        alert('Erro ao gravar o documento no backend. Verifique os dados e tente novamente.');
      }
    });
  }

  // Only clear if we are done? Or keep it open?

  // If printing (locking), we might want to clear or show the locked doc.
  // Previous code called `this.newDocument()` at the end.
  // If printing (locking), we keep it open so user sees it's locked.

  createStockMovements() {
    // Create stock movements for purchase (entrada de stock)
    this.currentDoc.lines.forEach(line => {
      if (!line.articleCode || line.quantity <= 0) return;

      const article = this.inventoryService.getArticleByCode(line.articleCode);
      if (!article) return;

      this.inventoryService.createStockMovement({
        date: new Date(this.currentDoc.date),
        articleId: article.id,
        articleCode: line.articleCode,
        articleName: line.articleName,
        warehouseId: line.warehouse || 'ARM-01',
        locationId: line.location || '',
        batchId: line.batch || '',
        quantity: line.quantity,
        movementType: 'IN',
        reference: `${this.currentDoc.type}${this.currentDoc.series}/${this.currentDoc.number}`,
        unitCost: line.unitPrice,
        totalCost: line.totalValue,
        notes: `Compra - ${this.currentDoc.supplierName}`
      });
    });
  }

  createAccountingEntries() {
    // Create accounting entry for purchase
    const supplierAccountId = this.currentDoc.supplierAccountId || '49';
    const supplierAccount = this.accountingService.getAccount(supplierAccountId);

    const entry: any = {
      id: `JE-${Date.now()}`,
      journalId: 'PURCHASES',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      createdAt: new Date(),
      date: new Date(this.currentDoc.date),
      description: `Compra ${this.currentDoc.type}${this.currentDoc.series}/${this.currentDoc.number} - ${this.currentDoc.supplierName}`,
      reference: this.currentDoc.reference,
      lines: [
        {
          id: `JEL-${Date.now()}-1`,
          accountId: '22', // 31.1.1 - Produtos Alimentares (Inventário)
          accountCode: '31.1.1',
          accountName: 'Mercadorias - Produtos Alimentares',
          debit: this.currentDoc.merchandiseTotal,
          credit: 0,
          description: 'Compra de mercadorias'
        },
        {
          id: `JEL-${Date.now()}-2`,
          accountId: '53', // 32.2 - IVA a Recuperar
          accountCode: '32.2',
          accountName: 'IVA a Recuperar',
          debit: this.currentDoc.taxTotal,
          credit: 0,
          description: 'IVA dedutível'
        },
        {
          id: `JEL-${Date.now()}-3`,
          accountId: supplierAccountId,
          accountCode: supplierAccount?.code || '22.1',
          accountName: supplierAccount?.name || 'Fornecedores Nacionais',
          debit: 0,
          credit: this.currentDoc.totalValue,
          description: `Fornecedor: ${this.currentDoc.supplierName}`
        }
      ]
    };

    this.accountingService.createJournalEntry(entry);
  }

  newDocument() {
    this.ngZone.run(() => {
      this.currentDoc = this.createEmptyDocument();
      this.loadNextNumber();
      this.cdr.detectChanges();
    });
  }

  validateSeriesDate() {
    if (!this.currentDoc?.series) return;

    const allSeries = JSON.parse(localStorage.getItem('erp_series_definitions') || '[]');
    const seriesDef = allSeries.find((s: any) => s.code === this.currentDoc.series && s.companyId == this.activeCompanyId);
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

  loadWorkflowHistory() {
    if (!this.currentDoc?.id) return;
    this.dataService.getWorkflowHistory('purchases', this.currentDoc.id).subscribe({
      next: (history) => {
        this.workflowHistory = history;
        this.cdr.detectChanges();
      }
    });
  }

  onWorkflowAction(action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST') {
    if (!this.currentDoc?.id) {
      alert('Grave o documento antes de processar o workflow.');
      return;
    }

    const notes = prompt('Notas/Justificação (Opcional):');
    if (notes === null) return;

    this.dataService.processWorkflow('purchases', this.currentDoc.id, action, notes).subscribe({
      next: (res) => {
        // Refresh inventory data after workflow action as it might trigger movements (e.g., POSTING)
        this.inventoryService.loadData().then(() => {
          this.currentDoc.status = res.status;
          this.loadWorkflowHistory();
          this.cdr.detectChanges();
          alert(`Documento ${action === 'SUBMIT' ? 'submetido' : action === 'APPROVE' ? 'aprovado' : action === 'REJECT' ? 'rejeitado' : 'lançado'} com sucesso.`);
        });
      },
      error: (err) => {
        alert('Erro ao processar workflow: ' + (err.error?.message || err.message));
      }
    });
  }
}
