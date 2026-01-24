import { Component, Input, HostListener, ViewEncapsulation } from '@angular/core';
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

interface PurchaseDocumentLine {
  id: string;
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
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  lines: PurchaseDocumentLine[];
  merchandiseTotal: number;
  discountValue: number;
  taxTotal: number;
  totalValue: number;
  notes: string;
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
    DocumentTypeConfigModalComponent
  ],
  template: `
    <div class="flex flex-col h-full w-full bg-[#F0F0F0] text-xs overflow-hidden relative no-print">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0 overflow-x-auto">
        <button *ngFor="let item of toolbarItems; let i = index"
          (click)="handleToolbarClick(item.label)"
          class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 whitespace-nowrap group">
          <span class="material-symbols-outlined text-[18px] text-gray-600 group-hover:text-green-600">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
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

      <!-- Form Header -->
      <div class="bg-[#F0F0F0] border-b border-gray-300 shrink-0 h-64 overflow-y-auto relative">
        <!-- Locked Overlay -->
        <div *ngIf="isLocked" class="absolute inset-0 bg-gray-100/50 z-20 flex items-center justify-center pointer-events-none">
          <div class="bg-red-600 text-white px-4 py-2 rounded shadow-lg font-bold text-lg transform -rotate-12 opacity-80 border-4 border-white">
            {{ currentDoc.status === 'CANCELLED' ? 'ANULADO' : 'FECHADO' }}
          </div>
        </div>

        <!-- Aba Geral -->
        <div *ngIf="activeTab === 0" class="flex flex-row h-full p-2 gap-2">
          
          <!-- Left Inputs Area -->
          <div class="flex-1 flex flex-col gap-1.5">
            <!-- Linha 1: Documento -->
            <div class="flex items-center gap-1">
              <label 
                class="w-24 text-green-600 font-medium text-right text-[11px] cursor-pointer hover:underline" 
                (click)="!isLocked && openConfigModal()"
                title="Clique para configurar o tipo de documento"
              >Documento:</label>
              <div class="flex items-center border border-gray-300 bg-white rounded-sm h-5 w-16 relative">
                <input class="w-full h-full px-1 focus:outline-none text-[11px]" [(ngModel)]="currentDoc.type" readonly [disabled]="isLocked" />
                <button (click)="!isLocked && openDocTypeModal()" [disabled]="isLocked" class="absolute right-0 top-0 bottom-0 px-0.5 bg-gray-100 border-l hover:bg-gray-200 text-green-600 text-[9px] font-bold cursor-pointer disabled:opacity-50">F4</button>
              </div>
              <input class="flex-1 h-5 border border-gray-300 px-1 bg-[#FDFDFD] rounded-sm focus:outline-none text-[11px]" [value]="getDocTypeDescription()" disabled />
              
              <!-- Série e Número -->
              <div class="flex items-center gap-1 ml-2">
                <select [(ngModel)]="currentDoc.series" (change)="loadNextNumber(); validateSeriesDate()" [disabled]="isLocked" class="h-5 border border-gray-300 bg-white rounded-sm text-[11px] w-16 disabled:bg-gray-100">
                  <option *ngFor="let s of availableSeries" [value]="s.code">{{ s.code }}</option>
                </select>
                <input type="number" [(ngModel)]="currentDoc.number" (change)="onNumberChange()" [disabled]="isLocked" class="h-5 border border-gray-300 px-1 w-16 rounded-sm text-right text-[11px] disabled:bg-gray-100" min="1" />
              </div>

              <!-- Data Doc -->
              <div class="flex items-center gap-1 ml-2">
                <label class="font-medium text-[11px]">Data Doc.:</label>
                <input type="date" [(ngModel)]="currentDoc.date" (change)="validateSeriesDate()" [disabled]="isLocked" class="h-5 border border-gray-300 px-1 w-24 rounded-sm text-[11px] disabled:bg-gray-100" />
              </div>
            </div>

            <!-- Linha 2: Fornecedor -->
            <div class="flex items-center gap-1">
              <label class="w-24 text-green-600 font-medium text-right text-[11px]">Fornecedor:</label>
              <div class="flex items-center border border-gray-300 bg-white rounded-sm h-5 w-24 relative">
                <input class="w-full h-full px-1 focus:outline-none text-[11px] disabled:bg-gray-100" [(ngModel)]="currentDoc.supplierCode" readonly [disabled]="isLocked" />
                <button (click)="!isLocked && openSupplierModal()" [disabled]="isLocked" class="absolute right-0 top-0 bottom-0 px-0.5 bg-gray-100 border-l hover:bg-gray-200 text-green-600 text-[9px] font-bold cursor-pointer disabled:opacity-50">F4</button>
              </div>
              <input class="flex-1 h-5 border border-gray-300 px-1 bg-white rounded-sm focus:outline-none text-[11px] disabled:bg-gray-100" [(ngModel)]="currentDoc.supplierName" readonly [disabled]="isLocked" />
              
              <!-- Data Vencimento -->
              <div class="flex items-center gap-1 ml-2">
                <label class="font-medium text-green-600 text-[11px]">Data Venc.:</label>
                <input type="date" [(ngModel)]="currentDoc.dueDate" [disabled]="isLocked" class="h-5 border border-gray-300 px-1 w-24 rounded-sm text-[11px] disabled:bg-gray-100" />
              </div>
            </div>

            <!-- Linha 3: Endereço -->
            <div class="flex items-center gap-1">
              <div class="w-24"></div>
              <input class="flex-1 h-5 border border-gray-300 px-1 bg-[#F8F8F8] text-gray-500 rounded-sm text-[11px]" [(ngModel)]="currentDoc.supplierAddress" readonly />
            </div>

            <!-- Linha 4: Contribuinte e Referência -->
            <div class="flex items-center gap-1 mt-1">
              <label class="w-24 font-medium text-right text-[11px]">Contribuinte:</label>
              <input class="w-32 h-5 border border-gray-300 px-1 bg-white rounded-sm text-[11px] disabled:bg-gray-100" [(ngModel)]="currentDoc.supplierNif" readonly [disabled]="isLocked" />
              
              <label class="ml-4 font-medium text-gray-500 text-[11px]">Referência:</label>
              <input class="flex-1 h-5 border border-gray-300 px-1 bg-white rounded-sm text-[11px] disabled:bg-gray-100" [(ngModel)]="currentDoc.reference" [disabled]="isLocked" />
            </div>
          </div>

          <!-- Right Side Summary Panel -->
          <div class="w-64 bg-[#FDFDFD] border border-gray-300 p-2 shadow-sm flex flex-col gap-0.5 text-[11px]">
            <div class="flex justify-between text-gray-700">
              <span>Merc./Serv.:</span>
              <span class="font-mono">{{ currentDoc.merchandiseTotal | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-gray-700">
              <span>Descontos:</span>
              <span class="font-mono">{{ currentDoc.discountValue | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-gray-700">
              <span>IVA:</span>
              <span class="font-mono">{{ currentDoc.taxTotal | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-gray-700 font-medium mt-1">
              <span>Subtotal:</span>
              <span class="font-mono">{{ (currentDoc.merchandiseTotal - currentDoc.discountValue) | number:'1.2-2' }}</span>
            </div>
            
            <div class="mt-auto flex justify-between font-bold text-black text-sm pt-2">
              <span>Total MT:</span>
              <span class="font-mono text-green-600">{{ currentDoc.totalValue | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Aba Condições -->
        <div *ngIf="activeTab === 1" class="flex flex-col gap-3 p-2">
          <div class="bg-white border border-gray-300 rounded p-3 shadow-sm">
            <h3 class="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">Condições de Pagamento</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="flex items-center gap-3">
                <label class="w-32 font-medium text-gray-700">Condição:</label>
                <select [(ngModel)]="currentDoc.paymentCondition" [disabled]="isLocked" class="flex-1 h-7 border border-gray-300 px-2 bg-white rounded text-sm disabled:bg-gray-100">
                  <option value="PRONTO">Pronto Pagamento</option>
                  <option value="PRAZO">A Prazo (Crédito)</option>
                </select>
              </div>

              <div *ngIf="currentDoc.paymentCondition === 'PRAZO'" class="flex items-center gap-3">
                <label class="w-32 font-medium text-gray-700">Prazo (dias):</label>
                <input type="number" [(ngModel)]="currentDoc.paymentDays" [disabled]="isLocked" class="h-7 border border-gray-300 px-2 rounded text-sm w-24 disabled:bg-gray-100" min="0" />
              </div>

              <div class="flex items-center gap-3">
                <label class="w-32 font-medium text-gray-700">Moeda:</label>
                <select [(ngModel)]="currentDoc.currency" [disabled]="isLocked" class="flex-1 h-7 border border-gray-300 px-2 bg-white rounded text-sm disabled:bg-gray-100">
                  <option value="MZN">MZN - Metical</option>
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Outras abas -->
        <div *ngIf="activeTab > 1" class="flex items-center justify-center p-8 text-gray-400">
          <p class="text-sm">Conteúdo da aba "{{ tabs[activeTab] }}" em desenvolvimento...</p>
        </div>
      </div>

      <!-- Data Grid -->
      <div class="flex-1 overflow-auto bg-white relative border-t border-gray-300">
        <!-- Locked Overlay for Grid -->
        <div *ngIf="isLocked" class="absolute inset-0 bg-gray-100/30 z-20 pointer-events-none"></div>

        <table class="w-full border-collapse table-fixed">
          <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm text-[10px] uppercase">
            <tr>
              <th class="px-2 py-1 border-r border-b border-l border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[120px]">Artigo</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[60px]">Arm.</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[80px]">Localização</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[80px]">Lote</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap min-w-[300px]">Descrição</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[50px]">CIVA</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[50px]">IVA %</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[90px]">Pr. Unit.</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[60px]">Desc.</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[40px]">UN</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[70px]">Qtd.</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[90px]">Total Liq.</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[80px]">C. Custo</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[80px]">Projeto</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[90px]">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of currentDoc.lines; let i = index" class="border-b border-gray-200 hover:bg-blue-50 h-6 group">
              <!-- Artigo -->
              <td class="border-r border-b border-l border-gray-200 h-6 p-0 relative overflow-hidden">
                <div class="flex h-full">
                  <input 
                    type="text" 
                    [(ngModel)]="line.articleCode" 
                    (keydown.f4)="!isLocked && openArticleSearch(i)"
                    (dblclick)="!isLocked && openArticleSearch(i)"
                    (change)="onArticleCodeChange(i, line.articleCode)"
                    [disabled]="isLocked"
                    class="flex-1 h-full px-1 border-none bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-transparent"
                  />
                  <button (click)="!isLocked && openArticleSearch(i)" tabindex="-1" [disabled]="isLocked"
                    class="w-5 bg-gray-100 hover:bg-gray-200 flex items-center justify-center border-l border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden">
                    <span class="material-symbols-outlined text-[10px] text-gray-600">search</span>
                  </button>
                </div>
              </td>

              <!-- Armazém -->
              <td class="border-r border-b border-gray-200 h-6 p-0 relative overflow-hidden">
                 <div class="flex h-full">
                  <input [(ngModel)]="line.warehouse" (keydown.f4)="!isLocked && openWarehouseSearch(i)" [disabled]="isLocked" class="flex-1 h-full px-1 border-none bg-transparent outline-none focus:bg-blue-50 disabled:bg-transparent" />
                  <button (click)="!isLocked && openWarehouseSearch(i)" tabindex="-1" [disabled]="isLocked" class="w-4 bg-gray-100 hover:bg-gray-200 flex items-center justify-center border-l border-gray-200 opacity-0 group-hover:opacity-100 disabled:hidden">
                    <span class="material-symbols-outlined text-[10px]">search</span>
                  </button>
                 </div>
              </td>

              <!-- Localização -->
              <td class="border-r border-b border-gray-200 h-6 p-0 overflow-hidden">
                 <input [(ngModel)]="line.location" [disabled]="isLocked" class="w-full h-full px-1 border-none bg-transparent outline-none focus:bg-blue-50 disabled:bg-transparent" />
              </td>

              <!-- Lote -->
              <td class="border-r border-b border-gray-200 h-6 p-0 overflow-hidden">
                 <input [(ngModel)]="line.batch" [disabled]="isLocked" class="w-full h-full px-1 border-none bg-transparent outline-none focus:bg-blue-50 disabled:bg-transparent" />
              </td>

              <!-- Descrição -->
              <td class="border-r border-b border-gray-200 h-6 px-1 truncate max-w-[300px] overflow-hidden" [title]="line.articleName">
                {{ line.articleName }}
              </td>

              <!-- CIVA -->
              <td class="border-r border-b border-gray-200 h-6 p-0 relative overflow-hidden">
                <div class="flex h-full">
                  <input [(ngModel)]="line.taxCode" (keydown.f4)="!isLocked && openTaxSearch(i)" [disabled]="isLocked" class="flex-1 h-full px-1 border-none bg-transparent outline-none focus:bg-blue-50 disabled:bg-transparent" />
                  <button (click)="!isLocked && openTaxSearch(i)" tabindex="-1" [disabled]="isLocked"
                    class="w-5 bg-gray-100 hover:bg-gray-200 flex items-center justify-center border-l border-gray-200 opacity-0 group-hover:opacity-100 disabled:hidden">
                    <span class="material-symbols-outlined text-[10px] text-gray-600">search</span>
                  </button>
                </div>
              </td>
              
              <!-- IVA % -->
              <td class="border-r border-b border-gray-200 h-6 px-1 text-right overflow-hidden">{{ line.articleCode ? line.taxRate + '%' : '' }}</td>
              
              <!-- Preço Unit. -->
              <td class="border-r border-b border-gray-200 h-6 px-1 text-right overflow-hidden">
                <input *ngIf="line.articleCode" type="number" [(ngModel)]="line.unitPrice" (ngModelChange)="calculateLine(i)" [disabled]="isLocked"
                  class="w-full h-full px-1 border-none bg-transparent text-right outline-none focus:bg-blue-50 disabled:bg-transparent" />
              </td>
              
              <!-- Desconto -->
              <td class="border-r border-b border-gray-200 h-6 px-1 text-right overflow-hidden">
                <input *ngIf="line.articleCode" type="number" [(ngModel)]="line.discount" (ngModelChange)="calculateLine(i)" [disabled]="isLocked"
                  class="w-full h-full px-1 border-none bg-transparent text-right outline-none focus:bg-blue-50 disabled:bg-transparent" />
              </td>
              
              <!-- UN -->
              <td class="border-r border-b border-gray-200 h-6 px-1 overflow-hidden">{{ line.unit }}</td>
              
              <!-- Quantidade -->
              <td class="border-r border-b border-gray-200 h-6 px-1 text-right overflow-hidden">
                <input *ngIf="line.articleCode" type="number" [(ngModel)]="line.quantity" (ngModelChange)="calculateLine(i)" [disabled]="isLocked"
                  class="w-full h-full px-1 border-none bg-transparent text-right outline-none focus:bg-blue-50 disabled:bg-transparent" />
              </td>
              
              <!-- Total Líquido -->
              <td class="border-r border-b border-gray-200 h-6 px-1 text-right overflow-hidden">{{ line.articleCode ? (line.totalLiquid | number:'1.2-2') : '' }}</td>
              
              <!-- Centro de Custo -->
              <td class="border-r border-b border-gray-200 h-6 px-1 overflow-hidden">
                <input [(ngModel)]="line.costCenter" [disabled]="isLocked" class="w-full h-full px-1 border-none bg-transparent outline-none focus:bg-blue-50 disabled:bg-transparent" />
              </td>
              
              <!-- Projeto -->
              <td class="border-r border-b border-gray-200 h-6 px-1 overflow-hidden">
                <input [(ngModel)]="line.project" [disabled]="isLocked" class="w-full h-full px-1 border-none bg-transparent outline-none focus:bg-blue-50 disabled:bg-transparent" />
              </td>
              
              <!-- Valor Total -->
              <td class="border-r border-b border-gray-200 h-6 px-1 text-right font-medium overflow-hidden">{{ line.articleCode ? (line.totalValue | number:'1.2-2') : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modals -->
      <app-purchase-document-type-modal
        *ngIf="isDocTypeModalOpen"
        (close)="isDocTypeModalOpen = false"
        (select)="onDocTypeSelect($event)"
      ></app-purchase-document-type-modal>

      <app-supplier-search-modal
        *ngIf="isSupplierModalOpen"
        (close)="isSupplierModalOpen = false"
        (select)="onSupplierSelect($event)"
      ></app-supplier-search-modal>

      <app-article-search-modal
        *ngIf="isArticleModalOpen"
        [isOpen]="true"
        (close)="isArticleModalOpen = false"
        (select)="onArticleSelect($event)"
      ></app-article-search-modal>

      <app-warehouse-search-modal
        *ngIf="isWarehouseModalOpen"
        [isOpen]="true"
        (close)="isWarehouseModalOpen = false"
        (select)="onWarehouseSelect($event)"
      ></app-warehouse-search-modal>

      <app-location-search-modal
        *ngIf="isLocationModalOpen"
        [isOpen]="true"
        [warehouseFilter]="activeLineForModal?.warehouse || ''"
        (close)="isLocationModalOpen = false"
        (select)="onLocationSelect($event)"
      ></app-location-search-modal>

      <app-batch-search-modal
        *ngIf="isBatchModalOpen"
        [isOpen]="true"
        [articleFilter]="activeLineForModal?.articleCode || ''"
        (close)="isBatchModalOpen = false"
        (select)="onBatchSelect($event)"
      ></app-batch-search-modal>

      <app-tax-search-modal
        *ngIf="isTaxModalOpen"
        [isOpen]="true"
        (close)="isTaxModalOpen = false"
        (select)="onTaxSelect($event)"
      ></app-tax-search-modal>

      <app-purchase-document-search-modal
        *ngIf="isSearchModalOpen"
        (close)="isSearchModalOpen = false"
        (select)="onDocumentSelect($event)"
      ></app-purchase-document-search-modal>

      <app-document-type-config-modal
        *ngIf="isConfigModalOpen"
        [module]="'PURCHASES'"
        [documentCode]="currentDoc.type"
        (close)="isConfigModalOpen = false"
      ></app-document-type-config-modal>

      <!-- Context Menu -->
      <div *ngIf="contextMenuVisible" 
        class="fixed z-50 bg-white shadow-lg border border-gray-200 rounded-sm py-1 w-64 text-xs"
        [style.left.px]="contextMenuPosition.x"
        [style.top.px]="contextMenuPosition.y">
        
        <button (click)="insertLine()" class="w-full text-left px-4 py-1.5 hover:bg-green-50 flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px] text-green-600">add</span>
          Inserir Linha
        </button>
        <button (click)="removeLine()" class="w-full text-left px-4 py-1.5 hover:bg-green-50 flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px] text-red-600">remove</span>
          Remover Linha
        </button>
      </div>
    </div>

    <!-- Print Template -->
    <div class="print-only hidden">
      <div class="p-8 font-sans">
        <!-- Header -->
        <div class="flex justify-between items-start mb-8 border-b pb-4">
          <div class="flex items-center gap-4">
            <img *ngIf="companyInfo?.logoUrl" [src]="companyInfo?.logoUrl" class="h-16 w-auto object-contain" alt="Logo">
            <div>
              <h1 class="text-2xl font-bold text-gray-800">{{ companyInfo?.name }}</h1>
              <p class="text-sm text-gray-600">{{ companyInfo?.address }}</p>
              <p class="text-sm text-gray-600" *ngIf="companyInfo?.city">{{ companyInfo?.city }}, {{ companyInfo?.country }}</p>
              <p class="text-sm text-gray-600">NIF: {{ companyInfo?.nif }}</p>
            </div>
          </div>
          <div class="text-right">
            <h2 class="text-xl font-bold text-gray-800">Documento de Compra</h2>
            <p class="text-lg text-gray-600">{{ currentDoc.series }} / {{ currentDoc.number }}</p>
            <p class="text-sm text-gray-500">Data: {{ currentDoc.date | date:'dd/MM/yyyy' }}</p>
          </div>
        </div>

        <!-- Supplier Info -->
        <div class="mb-8 bg-gray-50 p-4 rounded">
          <h3 class="text-sm font-bold text-gray-500 uppercase mb-2">Fornecedor</h3>
          <p class="text-lg font-bold">{{ currentDoc.supplierName }}</p>
          <p class="text-gray-600">{{ currentDoc.supplierAddress }}</p>
          <p class="text-gray-600">NIF: {{ currentDoc.supplierNif }}</p>
        </div>

        <!-- Lines -->
        <table class="w-full mb-8">
          <thead>
            <tr class="border-b-2 border-gray-300">
              <th class="text-left py-2 font-bold text-gray-600">Artigo</th>
              <th class="text-left py-2 font-bold text-gray-600">Descrição</th>
              <th class="text-right py-2 font-bold text-gray-600">Qtd</th>
              <th class="text-right py-2 font-bold text-gray-600">Preço Unit.</th>
              <th class="text-right py-2 font-bold text-gray-600">Desc.</th>
              <th class="text-right py-2 font-bold text-gray-600">IVA</th>
              <th class="text-right py-2 font-bold text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of currentDoc.lines" class="border-b border-gray-100">
              <ng-container *ngIf="row.articleCode">
                <td class="py-2">{{ row.articleCode }}</td>
                <td class="py-2">{{ row.description }}</td>
                <td class="py-2 text-right">{{ row.quantity }} {{ row.unit }}</td>
                <td class="py-2 text-right">{{ row.unitPrice | number:'1.2-2' }}</td>
                <td class="py-2 text-right">{{ row.discount | number:'1.2-2' }}%</td>
                <td class="py-2 text-right">{{ row.taxCode }}</td>
                <td class="py-2 text-right font-medium">{{ row.totalLiquid | number:'1.2-2' }}</td>
              </ng-container>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <div class="flex justify-end">
          <div class="w-64">
            <div class="flex justify-between py-1 border-b border-gray-100">
              <span class="text-gray-600">Mercadorias:</span>
              <span class="font-medium">{{ currentDoc.merchandiseTotal | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-100">
              <span class="text-gray-600">Descontos:</span>
              <span class="font-medium">{{ currentDoc.discountValue | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-100">
              <span class="text-gray-600">IVA:</span>
              <span class="font-medium">{{ currentDoc.taxTotal | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
              <span class="text-lg font-bold text-gray-800">Total:</span>
              <span class="text-lg font-bold text-gray-800">{{ currentDoc.totalValue | number:'1.2-2' }} MT</span>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Processado por Computador | Inverno ERP</p>
        </div>
      </div>
    </div>

    <style>
      @media print {
        body {
          visibility: hidden;
          overflow: hidden;
        }
        .print-only, .print-only * {
          visibility: visible;
        }
        .print-only {
          position: fixed;
          left: 0;
          top: 0;
          width: 100vw;
          height: 100vh;
          margin: 0;
          padding: 0;
          background: white;
          z-index: 99999;
          display: block !important;
        }
        .no-print {
          display: none !important;
        }
        /* Hide potential layout containers that might interfere */
        app-sidebar, app-header, .sidebar, .header {
          display: none !important;
        }
      }
    </style>
  `
})
export class PurchaseDocumentFormComponent {
  @Input() viewMode: string = 'purchase-form';

  activeCompanyId: string | null = null;
  companyInfo: CompanyInfo | null = null;

  activeTab = 0;
  tabs = ["Geral", "Condições", "Transação", "Recepção", "Observações", "Estado", "Anexos"];



  toolbarItems = [
    { label: "Gravar", icon: "save" },
    { label: "Lançar", icon: "check_circle" },
    { label: "Novo", icon: "add_circle" },
    { label: "Anular", icon: "block" },
    { label: "Duplicar", icon: "content_copy" },
    { label: "Imprimir", icon: "print" },
    { label: "Procurar", icon: "search" },
    { label: "Enviar", icon: "send" },
    { label: "Contexto", icon: "settings" },
    { label: "Ajuda", icon: "help_outline" },
    { label: "Cancelar", icon: "logout" }
  ];

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

  // Context menu
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuRowIndex = -1;

  // Active line for modals
  activeLineForModal: PurchaseDocumentLine | null = null;
  activeLineIndex = -1;

  availableSeries: any[] = [];
  currentDoc: PurchaseDocument = this.createEmptyDocument();

  constructor(
    private accountingService: AccountingService,
    private inventoryService: InventoryService,
    private auditService: AuditService,
    private periodService: PeriodService,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.loadActiveCompany();
    this.loadSeries();
    this.loadNextNumber();
  }

  loadActiveCompany() {
    this.dataService.getCompanyInfo().subscribe(company => {
      if (company) {
        this.activeCompanyId = company.id;
        this.companyInfo = company;
      }
    });
  }

  loadSeries() {
    const storedTypes = localStorage.getItem('erp_purchase_document_types');
    this.availableSeries = [];

    if (storedTypes) {
      const types = JSON.parse(storedTypes);
      const docType = types.find((t: any) => t.code === this.currentDoc.type);

      if (docType && docType.series && docType.series.length > 0) {
        if (this.activeCompanyId) {
          this.availableSeries = docType.series.filter((s: any) => s.active && s.companyId === this.activeCompanyId);
        } else {
          this.availableSeries = docType.series.filter((s: any) => s.active && !s.companyId);
        }
      }
    }

    // Ensure current series is in the list, if not select the first one
    if (this.availableSeries.length > 0) {
      if (!this.currentDoc.series || !this.availableSeries.find(s => s.code === this.currentDoc.series)) {
        this.currentDoc.series = this.availableSeries[0].code;
      }
    } else {
      this.currentDoc.series = '';
    }
  }

  createEmptyDocument(): PurchaseDocument {
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();

    return {
      id: '',
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
      status: 'DRAFT',
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
    this.dataService.getPurchaseDocuments().subscribe(docs => {
      const sameSeries = docs.filter((d: any) => d.type === this.currentDoc.type && d.series === this.currentDoc.series);
      if (sameSeries.length > 0) {
        const maxNumber = Math.max(...sameSeries.map((d: any) => d.number));
        this.currentDoc.number = maxNumber + 1;
      } else {
        this.currentDoc.number = 1;
      }
    });
  }

  onNumberChange() {
    this.dataService.getPurchaseDocuments().subscribe(docs => {
      const found = docs.find((d: any) =>
        d.type === this.currentDoc.type &&
        d.series === this.currentDoc.series &&
        d.number === this.currentDoc.number
      );

      if (found) {
        this.currentDoc = found;
      } else {
        // If not found, treat as new document with this number
        const type = this.currentDoc.type;
        const series = this.currentDoc.series;
        const num = this.currentDoc.number;

        this.currentDoc = this.createEmptyDocument();
        this.currentDoc.type = type;
        this.currentDoc.series = series;
        this.currentDoc.number = num;
      }
    });
  }

  getDocTypeDescription(): string {
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

  onArticleBlur(index: number) {
    const line = this.currentDoc.lines[index];
    if (!line.articleCode) return;

    const article = this.inventoryService.getArticleByCode(line.articleCode);
    if (article) {
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
  get isLocked(): boolean {
    return this.currentDoc.status === 'POSTED' || this.currentDoc.status === 'CANCELLED';
  }

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
      case 'Contexto':
        // Context menu logic or settings
        alert('Opções de contexto não disponíveis.');
        break;
      case 'Ajuda':
        alert('Ajuda não disponível.');
        break;
      case 'Cancelar':
        this.newDocument();
        break;
      default:
        console.log(`Action: ${action}`);
    }
  }

  voidDocument() {
    if (this.currentDoc.status === 'CANCELLED') return;
    if (!this.currentDoc.id) {
      alert('Não é possível anular um documento não gravado.');
      return;
    }
    if (confirm('Tem a certeza que deseja anular este documento?')) {
      this.currentDoc.status = 'CANCELLED';
      this.dataService.savePurchaseDocument(this.currentDoc).subscribe(() => {
        alert('Documento anulado com sucesso.');
      });
    }
  }

  duplicateDocument() {
    // Create a copy without ID and with new number
    const copy = JSON.parse(JSON.stringify(this.currentDoc));
    copy.id = '';
    copy.status = 'DRAFT';
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
    const seriesDef = allSeries.find((s: any) => s.code === this.currentDoc.series && s.companyId === this.activeCompanyId);
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
      this.currentDoc.status = 'POSTED';
    } else if (this.currentDoc.status === 'DRAFT') {
      this.currentDoc.status = 'DRAFT';
    }

    this.currentDoc.updatedAt = new Date().toISOString();

    // Save via DataService
    this.dataService.savePurchaseDocument(this.currentDoc).subscribe(() => {
      if (post) {
        // Create stock movements and accounting ONLY when posting/printing
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
    this.currentDoc = this.createEmptyDocument();
    this.loadNextNumber();
  }

  validateSeriesDate() {
    const allSeries = JSON.parse(localStorage.getItem('erp_series_definitions') || '[]');
    const seriesDef = allSeries.find((s: any) => s.code === this.currentDoc.series && s.companyId === this.activeCompanyId);
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
