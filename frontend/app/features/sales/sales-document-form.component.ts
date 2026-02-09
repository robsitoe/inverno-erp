import { Component, Input, HostListener, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { DocumentTypeModalComponent } from '../../shared/components/document-type-modal.component';
import { EntityListModalComponent } from '../../shared/components/entity-list-modal.component';
import { ArticleListModalComponent } from '../../shared/components/article-list-modal.component';
import { IvaListModalComponent } from '../../shared/components/iva-list-modal.component';
import { DocumentTypeConfigModalComponent } from '../../shared/components/document-type-config-modal.component';
import { IVA_RATES } from '../../shared/constants';
import { AccountingService } from '../../shared/accounting.service';
import { InventoryService } from '../../shared/inventory.service';
import { SalesDocument, SalesDocumentLine, WorkflowStatus, WorkflowHistory } from '../../shared/models';
import { AuditService } from '../../shared/audit.service';
import { PeriodService } from '../../shared/period.service';
import { DataService } from '../../services/data.service';
import { SalesDocumentSearchModalComponent } from './sales-document-search-modal.component';
import { WarehouseSearchModalComponent } from '../inventory/warehouse-search-modal.component';
import { LocationSearchModalComponent } from '../inventory/location-search-modal.component';
import { BatchSearchModalComponent } from '../inventory/batch-search-modal.component';
import { PrintSettingsModalComponent, PrintSettings } from './print-settings-modal.component';
import { SalesDocumentPrintComponent } from './sales-document-print.component';
import { AppIconComponent } from '../../shared/components/app-icon.component';

interface GridRow {
  id?: string;
  articleId?: string;
  articleCode: string;
  warehouse: string;
  location: string;
  batch: string;
  description: string;
  civa: string;
  iva: string;
  unitPrice: number;
  discount: number;
  unit: string;
  quantity: number;
  totalLiquid: number;
  project: string;
  pepElement: string;
  barcode: string;
  ivaRule: string;
  totalValue: number;
  contract: string;
  processNumber: string;
}

@Component({
  selector: 'app-sales-document-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DocumentTypeModalComponent,
    DocumentTypeConfigModalComponent,
    EntityListModalComponent,
    ArticleListModalComponent,
    IvaListModalComponent,
    SalesDocumentSearchModalComponent,
    WarehouseSearchModalComponent,
    LocationSearchModalComponent,
    BatchSearchModalComponent,
    PrintSettingsModalComponent,
    SalesDocumentPrintComponent,
    AppIconComponent
  ],
  template: `
    <div class="flex flex-col h-full w-full bg-[#F0F0F0] text-xs overflow-hidden relative">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0 overflow-x-auto">
        <ng-container *ngFor="let item of toolbarItems; let i = index">
          <button 
            (click)="handleToolbarClick(item.label)"
            class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 whitespace-nowrap group focus:bg-gray-200 focus:outline-none"
          >
            <app-icon [name]="item.icon" [size]="18" class="text-gray-600 group-hover:text-primary transition-colors"></app-icon>
            <span>{{ item.label }}</span>
          </button>
          <div *ngIf="shouldRenderDivider(i)" class="w-px h-4 bg-gray-300 mx-1"></div>
        </ng-container>

        <!-- Workflow Actions -->
        <ng-container *ngIf="currentId">
          <div class="w-px h-4 bg-gray-300 mx-1"></div>
          <button *ngIf="status === 'DRAFT' || status === 'REJECTED'" (click)="onWorkflowAction('SUBMIT')" class="flex items-center gap-1 px-2 py-1 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-sm transition-all text-blue-700 group">
            <app-icon name="send" [size]="18"></app-icon>
            <span>Submeter</span>
          </button>
          <button *ngIf="status === 'SUBMITTED'" (click)="onWorkflowAction('APPROVE')" class="flex items-center gap-1 px-2 py-1 hover:bg-green-50 border border-transparent hover:border-green-200 rounded-sm transition-all text-green-700 group">
            <app-icon name="check_circle" [size]="18"></app-icon>
            <span>Aprovar</span>
          </button>
          <button *ngIf="status === 'SUBMITTED'" (click)="onWorkflowAction('REJECT')" class="flex items-center gap-1 px-2 py-1 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-sm transition-all text-red-700 group">
            <app-icon name="cancel" [size]="18"></app-icon>
            <span>Rejeitar</span>
          </button>
          <button *ngIf="status === 'APPROVED'" (click)="onWorkflowAction('POST')" class="flex items-center gap-1 px-2 py-1 hover:bg-purple-50 border border-transparent hover:border-purple-200 rounded-sm transition-all text-purple-700 group">
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
            (i === activeTab ? 'bg-[#F0F0F0] border-t-primary border-x-gray-300 text-black pb-1.5 z-10' : 'bg-[#D4D4D4] border-t-transparent border-x-transparent hover:bg-[#E8E8E8] text-gray-600')"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Form Header - Altura fixa para manter grid na mesma posição -->
      <div class="bg-[#F0F0F0] border-b border-gray-300 shrink-0 h-64 overflow-y-auto relative">
        <!-- Locked Overlay -->
        <div *ngIf="isLocked" class="absolute inset-0 bg-gray-100/50 z-20 flex items-center justify-center pointer-events-none">
          <div class="bg-red-600 text-white px-4 py-2 rounded shadow-lg font-bold text-lg transform -rotate-12 opacity-80 border-4 border-white">
            {{ status === 'POSTED' ? 'LANÇADO' : status === 'APPROVED' ? 'APROVADO' : status === 'REJECTED' ? 'REJEITADO' : 'BLOQUEADO' }}
          </div>
        </div>

        <!-- Aba Geral -->
        <div *ngIf="activeTab === 0" class="flex flex-row h-full p-2 gap-2">
          
          <!-- Left Inputs Area -->
          <div class="flex-1 flex flex-col gap-1.5">
            <!-- Linha 1: Documento -->
            <!-- Linha 1: Documento -->
            <div class="flex items-center gap-1">
              <label class="w-20 text-blue-600 font-medium text-right text-[11px] cursor-pointer hover:underline" (click)="!isLocked && openDocConfigModal()">Documento:</label>
              <div class="flex items-center border border-gray-300 bg-white rounded-sm h-5 w-16 relative">
                 <input class="w-full h-full px-1 focus:outline-none text-[11px]" [value]="selectedDocType || defaultDocValue" [readOnly]="!isInternal" [disabled]="isLocked" (keydown)="onDocTypeKeydown($event)" />
                 <button (click)="!isLocked && openDocTypeModal()" [disabled]="isLocked" class="absolute right-0 top-0 bottom-0 px-0.5 bg-gray-100 border-l hover:bg-gray-200 text-blue-600 text-[9px] font-bold cursor-pointer disabled:opacity-50">F4</button>
              </div>
              <input class="flex-1 h-5 border border-gray-300 px-1 bg-[#FDFDFD] rounded-sm focus:outline-none text-[11px]" [value]="selectedDocDescription" disabled />
              
              <!-- Série e Número -->
              <div class="flex items-center gap-1 ml-2">
                <select [(ngModel)]="currentSeries" (change)="loadNextNumber(); validateSeriesDate()" class="h-5 border border-gray-300 bg-white rounded-sm text-[11px] w-16 disabled:bg-gray-100">
                  <option *ngFor="let s of availableSeries" [value]="s.code">{{ s.code }}</option>
                </select>
                <input 
                  type="number" 
                  class="h-5 border border-gray-300 px-1 w-16 rounded-sm text-right text-[11px] disabled:bg-gray-100" 
                  [ngModel]="currentSeriesNumber"
                  (ngModelChange)="onNumberChange($event)"
                  min="1" 
                />
              </div>

              <!-- Data Doc -->
              <div class="flex items-center gap-1 ml-2">
                 <label class="font-medium text-[11px]">Data Doc.:</label>
                 <input type="date" class="h-5 border border-gray-300 px-1 w-24 rounded-sm text-[11px] disabled:bg-gray-100" [(ngModel)]="documentDate" (change)="validateSeriesDate()" [disabled]="isLocked" />
              </div>
            </div>

            <!-- Linha 2: Entidade -->
            <div class="flex items-center gap-1">
              <label class="w-20 text-blue-600 font-medium text-right text-[11px]">Entidade:</label>
              <div class="flex items-center border border-gray-300 bg-white rounded-sm h-5 w-24 relative">
                 <input class="w-full h-full px-1 focus:outline-none text-[11px] disabled:bg-gray-100" [value]="selectedEntityCode" [disabled]="isLocked" (keydown)="onEntityKeydown($event)" />
                 <button (click)="!isLocked && openEntityModal()" [disabled]="isLocked" class="absolute right-0 top-0 bottom-0 px-0.5 bg-gray-100 border-l hover:bg-gray-200 text-blue-600 text-[9px] font-bold cursor-pointer disabled:opacity-50">F4</button>
              </div>
              <input class="flex-1 h-5 border border-gray-300 px-1 bg-white rounded-sm focus:outline-none text-[11px] disabled:bg-gray-100" [value]="selectedEntityName" [disabled]="isLocked" />
              
              <!-- Data Vencimento -->
              <div class="flex items-center gap-1 ml-2">
                 <label class="font-medium text-blue-600 text-[11px]">Data Venc.:</label>
                 <input type="date" class="h-5 border border-gray-300 px-1 w-24 rounded-sm text-[11px] disabled:bg-gray-100" [(ngModel)]="dueDate" [disabled]="isLocked" />
              </div>
            </div>

             <!-- Linha 3: Endereço -->
             <div class="flex items-center gap-1">
               <div class="w-20"></div> <!-- Spacer -->
               <input class="flex-1 h-5 border border-gray-300 px-1 bg-[#F8F8F8] text-gray-500 rounded-sm text-[11px]" [value]="selectedEntityAddress" readonly />
               
               <!-- Desc. Cli. -->
               <div class="flex items-center gap-1 ml-2">
                 <label class="font-medium w-[58px] text-right text-[11px]">Desc. Cl.</label>
                 <input 
                    type="number" 
                    class="h-5 border border-gray-300 px-1 w-16 text-right rounded-sm text-[11px] disabled:bg-gray-100" 
                    [(ngModel)]="clientDiscount" 
                    (ngModelChange)="calculateTotals()"
                    [disabled]="isLocked"
                    min="0" max="100"
                 />
              </div>
             </div>
             <!-- Linha 4: Campos Extras (Vazios na imagem) -->
             <div class="flex items-center gap-1">
               <div class="w-20"></div> <!-- Spacer -->
               <div class="flex-1 flex gap-1">
                   <div class="relative flex-1">
                     <input class="w-full h-5 border border-gray-300 px-1 bg-[#F8F8F8] text-gray-500 rounded-sm text-[11px]" readonly />
                     <button class="absolute right-0 top-0 bottom-0 px-0.5 text-blue-600 text-[9px] font-bold cursor-pointer disabled:opacity-50" [disabled]="isLocked">F4</button>
                   </div>
                   <div class="relative flex-1">
                     <input class="w-full h-full border border-gray-300 px-1 bg-[#F8F8F8] text-gray-500 rounded-sm text-[11px]" readonly />
                     <button class="absolute right-0 top-0 bottom-0 px-0.5 text-blue-600 text-[9px] font-bold cursor-pointer disabled:opacity-50" [disabled]="isLocked">F4</button>
                   </div>
               </div>
               
               <!-- Desc. Financ. -->
               <div class="flex items-center gap-1 ml-2">
                 <label class="font-medium w-[58px] text-right text-[11px]">Desc. Fin.</label>
                 <input 
                    type="number" 
                    class="h-5 border border-gray-300 px-1 w-16 text-right rounded-sm text-[11px] disabled:bg-gray-100" 
                    [(ngModel)]="financialDiscount" 
                    (ngModelChange)="calculateTotals()"
                    [disabled]="isLocked"
                    min="0" max="100"
                 />
              </div>
             </div>

             <!-- Linha 5: Contribuinte e Referência -->
             <div class="flex items-center gap-1 mt-1">
               <label class="w-20 font-medium text-right text-[11px]">Contribuinte:</label>
               <input class="w-32 h-5 border border-gray-300 px-1 bg-white rounded-sm text-[11px] disabled:bg-gray-100" [value]="selectedEntityNif" [disabled]="isLocked" />
               
               <label class="ml-4 font-medium text-gray-500 text-[11px]">{{ documentRefLabel }}</label>
               <input class="flex-1 h-5 border border-gray-300 px-1 bg-white rounded-sm text-[11px] disabled:bg-gray-100" [disabled]="isLocked" />
               <span class="material-symbols-outlined text-[16px] text-gray-400 cursor-pointer">search</span>
             </div>
          </div>

          <!-- Right Side Summary Panel (Totais) -->
          <div class="w-64 bg-[#FDFDFD] border border-gray-300 p-2 shadow-sm flex flex-col gap-0.5 text-[11px]">
             <div class="flex justify-between text-gray-700">
                 <span>Merc./Serv.:</span>
                 <span class="font-mono">{{ merchandiseTotal | number:'1.2-2' }}</span>
             </div>
             <div class="flex justify-between text-gray-700">
                 <span>Descontos:</span>
                 <span class="font-mono">{{ discountValue | number:'1.2-2' }}</span>
             </div>
             <div class="flex justify-between text-gray-700">
                 <span>IVA:</span>
                 <span class="font-mono">{{ totalIva | number:'1.2-2' }}</span>
             </div>
             <div class="flex justify-between text-gray-700">
                 <span>Outros:</span>
                 <span class="font-mono">0,00</span>
             </div>
             <div class="flex justify-between text-gray-700 font-medium mt-1">
                 <span>Subtotal:</span>
                 <span class="font-mono">{{ subtotal | number:'1.2-2' }}</span>
             </div>
             <div class="flex justify-between text-gray-700">
                 <span>Acerto:</span>
                 <span class="font-mono">0,00</span>
             </div>
             <div class="flex justify-between text-gray-700">
                 <span>Ecovalor:</span>
                 <span class="font-mono">0,00</span>
             </div>
             
             <div class="mt-auto flex justify-between font-bold text-black text-sm pt-2">
               <span>Total MT:</span>
               <span class="font-mono text-red-600">{{ totalValue | number:'1.2-2' }}</span>
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
               <select [(ngModel)]="paymentCondition" [disabled]="isLocked" class="flex-1 h-7 border border-gray-300 px-2 bg-white rounded text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100">
                 <option value="PRONTO">Pronto Pagamento</option>
                 <option value="PRAZO">A Prazo (Crédito)</option>
               </select>
             </div>

             <div *ngIf="paymentCondition === 'PRONTO'" class="flex items-center gap-3">
               <label class="w-32 font-medium text-gray-700">Conta de Depósito:</label>
               <select [(ngModel)]="selectedTreasuryAccountId" [disabled]="isLocked" class="flex-1 h-7 border border-gray-300 px-2 bg-white rounded text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100">
                 <option *ngFor="let acc of treasuryAccounts" [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
               </select>
             </div>

             <div *ngIf="paymentCondition === 'PRAZO'" class="flex items-center gap-3">
               <label class="w-32 font-medium text-gray-700">Prazo (dias):</label>
               <input type="number" class="h-7 border border-gray-300 px-2 rounded text-sm w-24 disabled:bg-gray-100" value="30" min="0" [disabled]="isLocked" />
             </div>

             <div class="flex items-center gap-3">
               <label class="w-32 font-medium text-gray-700">Moeda:</label>
               <select class="flex-1 h-7 border border-gray-300 px-2 bg-white rounded text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100" [disabled]="isLocked">
                 <option value="MZN">MZN - Metical</option>
                 <option value="USD">USD - Dólar</option>
                 <option value="EUR">EUR - Euro</option>
               </select>
             </div>
           </div>
         </div>

         <div class="bg-white border border-gray-300 rounded p-3 shadow-sm">
           <h3 class="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">Outras Condições</h3>
           
           <div class="grid grid-cols-2 gap-4">
             <div class="flex items-center gap-3">
               <label class="w-32 font-medium text-gray-700">Vendedor:</label>
               <input type="text" class="flex-1 h-7 border border-gray-300 px-2 rounded text-sm disabled:bg-gray-100" placeholder="Código do vendedor" [disabled]="isLocked" />
             </div>

             <div class="flex items-center gap-3">
               <label class="w-32 font-medium text-gray-700">Comissão (%):</label>
               <input type="number" class="h-7 border border-gray-300 px-2 rounded text-sm w-24 disabled:bg-gray-100" value="0" min="0" max="100" step="0.1" [disabled]="isLocked" />
             </div>
           </div>
         </div>
       </div>

       <!-- Outras abas (placeholder) -->
       <div *ngIf="activeTab > 1" class="flex items-center justify-center p-8 text-gray-400">
         <p class="text-sm">Conteúdo da aba "{{ tabs[activeTab] }}" em desenvolvimento...</p>
       </div>
     </div>

     <!-- Grid Section -->
     <div class="flex-1 overflow-auto bg-white border-t border-gray-300 relative">
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
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[80px]">Projeto</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[80px]">Elem. PEP</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[100px]">Cód. Barras</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[120px]">IVA - Regra Cálculo</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[90px]">Valor Total</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[80px]">Contrato</th>
              <th class="px-2 py-1 border-r border-b border-gray-300 text-green-600 font-bold text-left whitespace-nowrap w-[80px]">N.º Processo</th>
            </tr>
          </thead>
          <tbody class="text-[11px]">
             <tr *ngFor="let row of rows; let i = index" 
                 class="hover:bg-blue-50 cursor-pointer group h-6"
                 [class.bg-blue-100]="i === activeRowIndex"
                 (click)="activeRowIndex = i"
                 (contextmenu)="!isLocked && onContextMenu($event, i)">
               <td class="border-r border-b border-gray-200 h-6 px-1 relative p-0 overflow-hidden">
                 <input 
                    type="text" 
                    [(ngModel)]="row.articleCode" 
                    (blur)="onArticleBlur(i)"
                    (keydown)="!isLocked && onArticleKeydown(i, $event)"
                    [disabled]="isLocked"
                    class="w-full h-full px-1 border-none bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-transparent"
                 />
                  <app-icon *ngIf="row.articleCode" name="pentagon" [size]="14" color="#ef4444" class="absolute left-1 top-1.5 hidden group-hover:block" title="Artigo"></app-icon>
               </td>
               
               <!-- Other Columns (Read-only for now or simple inputs) -->
               <!-- Armazém -->
               <td class="border-r border-b border-gray-200 h-6 px-0 relative group/wh overflow-hidden">
                 <div class="flex h-full">
                   <input [(ngModel)]="row.warehouse" 
                     (keydown)="!isLocked && onWarehouseKeydown(i, $event)"
                     [disabled]="isLocked"
                     class="flex-1 px-1 border-none bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-transparent" />
                   <button (click)="!isLocked && openWarehouseSearch(i)" 
                     [disabled]="isLocked"
                     class="w-5 bg-blue-50 hover:bg-blue-100 flex items-center justify-center border-l border-gray-200 opacity-0 group-hover/wh:opacity-100 transition-opacity disabled:hidden">
                     <span class="material-symbols-outlined text-[12px] text-blue-600">search</span>
                   </button>
                 </div>
               </td>

               <!-- Localização -->
               <td class="border-r border-b border-gray-200 h-6 px-0 relative group/loc overflow-hidden">
                 <div class="flex h-full">
                   <input [(ngModel)]="row.location" 
                     (keydown)="!isLocked && onLocationKeydown(i, $event)"
                     [disabled]="isLocked"
                     class="flex-1 px-1 border-none bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-transparent" />
                    <button (click)="!isLocked && openLocationSearch(i)" 
                      [disabled]="isLocked"
                      class="w-5 bg-blue-50 hover:bg-blue-100 flex items-center justify-center border-l border-gray-200 opacity-0 group-hover/loc:opacity-100 transition-opacity disabled:hidden">
                      <app-icon name="search" [size]="12" color="#2563eb"></app-icon>
                    </button>
                 </div>
               </td>

               <!-- Lote -->
               <td class="border-r border-b border-gray-200 h-6 px-0 relative group/batch overflow-hidden">
                 <div class="flex h-full">
                   <input [(ngModel)]="row.batch" 
                     (keydown)="!isLocked && onBatchKeydown(i, $event)"
                     [disabled]="isLocked"
                     class="flex-1 px-1 border-none bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-transparent" />
                    <button (click)="!isLocked && openBatchSearch(i)" 
                      [disabled]="isLocked"
                      class="w-5 bg-blue-50 hover:bg-blue-100 flex items-center justify-center border-l border-gray-200 opacity-0 group-hover/batch:opacity-100 transition-opacity disabled:hidden">
                      <app-icon name="search" [size]="12" color="#2563eb"></app-icon>
                    </button>
                 </div>
               </td>
               <td class="border-r border-b border-gray-200 h-6 px-1 overflow-hidden">{{ row.description }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1 relative p-0 group/civa">
                 <input 
                    type="text" 
                    [(ngModel)]="row.civa" 
                    (keydown)="!isLocked && onCivaKeydown(i, $event)"
                    [disabled]="isLocked"
                    class="w-full h-full px-1 border-none bg-transparent focus:outline-none focus:bg-blue-50 disabled:bg-transparent"
                 />
                 <span *ngIf="row.civa && !isLocked" class="material-symbols-outlined text-[14px] text-blue-500 absolute right-1 top-1.5 hidden group-hover/civa:block cursor-pointer" (click)="openIvaModal(i)">arrow_drop_down</span>
               </td>
               <td class="border-r border-b border-gray-200 h-6 px-1 text-right">{{ row.articleCode ? row.iva : '' }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1 text-right">{{ row.articleCode ? (row.unitPrice | number:'1.2-2') : '' }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1 text-right">{{ row.articleCode ? (row.discount | number:'1.2-2') : '' }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1">{{ row.unit }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1 text-right">
                  <input 
                    *ngIf="row.articleCode"
                    type="number" 
                    [(ngModel)]="row.quantity" 
                    (ngModelChange)="calculateRow(i)"
                    [disabled]="isLocked"
                    class="w-full h-full px-1 border-none bg-transparent focus:outline-none text-right disabled:bg-transparent" 
                  />
               </td>
               <td class="border-r border-b border-gray-200 h-6 px-1 text-right">{{ row.articleCode ? (row.totalLiquid | number:'1.2-2') : '' }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1">{{ row.project }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1">{{ row.pepElement }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1">{{ row.barcode }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1">{{ row.ivaRule }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1 text-right">{{ row.articleCode ? (row.totalValue | number:'1.2-2') : '' }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1">{{ row.contract }}</td>
               <td class="border-r border-b border-gray-200 h-6 px-1">{{ row.processNumber }}</td>
             </tr>
           </tbody>
         </table>
         <div class="absolute inset-0 pointer-events-none shadow-[inset_0px_0px_4px_rgba(0,0,0,0.05)]"></div>
      </div>
      <app-document-type-modal 
        *ngIf="showDocTypeModal" 
        [module]="'SALES'"
        [documentTypes]="salesDocTypes"
        (close)="showDocTypeModal = false"
        (select)="onDocTypeSelect($event)"
      ></app-document-type-modal>

      <app-entity-list-modal
        *ngIf="showEntityModal"
        (close)="showEntityModal = false"
        (select)="onEntitySelect($event)"
      ></app-entity-list-modal>

      <app-article-list-modal
        *ngIf="showArticleModal"
        (close)="showArticleModal = false"
        (select)="onArticleSelect($event)"
      ></app-article-list-modal>

      <app-iva-list-modal
        *ngIf="showIvaModal"
        (close)="showIvaModal = false"
        (select)="onIvaSelect($event)"
      ></app-iva-list-modal>

      <app-sales-document-search-modal
        *ngIf="isSearchModalOpen"
        (close)="isSearchModalOpen = false"
        (select)="loadDocument($event)"
      ></app-sales-document-search-modal>

      <app-warehouse-search-modal
        *ngIf="isWarehouseModalOpen"
        [isOpen]="true"
        (close)="isWarehouseModalOpen = false"
        (select)="onWarehouseSelect($event)"
      ></app-warehouse-search-modal>

      <app-location-search-modal
        *ngIf="isLocationModalOpen"
        [isOpen]="true"
        [warehouseFilter]="activeRow?.warehouse || ''"
        (close)="isLocationModalOpen = false"
        (select)="onLocationSelect($event)"
      ></app-location-search-modal>

      <app-batch-search-modal
        *ngIf="isBatchModalOpen"
        [isOpen]="true"
        [articleFilter]="activeRow?.articleCode || ''"
        (close)="isBatchModalOpen = false"
        (select)="onBatchSelect($event)"
      ></app-batch-search-modal>

      <app-document-type-config-modal
        *ngIf="isConfigModalOpen"
        [module]="'SALES'"
        [documentCode]="selectedDocType || defaultDocValue"
        (close)="onConfigModalClose()"
      ></app-document-type-config-modal>

      <!-- Context Menu -->
      <div *ngIf="contextMenuVisible" 
           class="fixed z-50 bg-white shadow-lg border border-gray-200 rounded-sm py-1 w-72 text-xs"
           [style.left.px]="contextMenuPosition.x"
           [style.top.px]="contextMenuPosition.y">
        
        <button (click)="insertLine()" class="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center gap-2 text-gray-700">
          <app-icon name="add" [size]="16" color="#2563eb"></app-icon>
          Insere Linha
        </button>
        <button (click)="removeLine()" class="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center gap-2 text-gray-700">
          <app-icon name="remove" [size]="16" color="#dc2626"></app-icon>
          Remove Linha
        </button>
        
        <div class="h-px bg-gray-200 my-1"></div>
        
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 text-gray-700 pl-10">Preços de Venda</button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Desconto em Valor sobre Mercadorias</span>
          <span class="text-gray-400">F5</span>
        </button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Desconto em Valor sobre Serviços</span>
          <span class="text-gray-400">F6</span>
        </button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Acerto</span>
          <span class="text-gray-400">F7</span>
        </button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Portes</span>
          <span class="text-gray-400">F8</span>
        </button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Outros Serviços</span>
          <span class="text-gray-400">F9</span>
        </button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Adiantamentos</span>
          <span class="text-gray-400">Ctrl+A</span>
        </button>

        <div class="h-px bg-gray-200 my-1"></div>

        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Outros campos da linha</span>
          <span class="text-gray-400">F10</span>
        </button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Números de Série</span>
          <span class="text-gray-400">Ctrl+S</span>
        </button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 text-gray-700 pl-10">Informação sobre o Lote</button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Stock nos diversos Armazéns</span>
          <span class="text-gray-400">F11</span>
        </button>

        <div class="h-px bg-gray-200 my-1"></div>

        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 text-gray-700 pl-10">Detalhe do Ecovalor</button>
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 text-gray-700 pl-10">Detalhe do IEC</button>

        <div class="h-px bg-gray-200 my-1"></div>
        
        <button class="w-full text-left px-4 py-1 hover:bg-blue-50 flex justify-between text-gray-700 pl-10">
          <span>Resumo de Encomendas</span>
          <span class="text-gray-400">Ctrl+F3</span>
        </button>
      </div>


      <!-- Print Components -->
      <app-print-settings-modal
        [isOpen]="isPrintSettingsOpen"
        (closeEvent)="onPrintSettingsClose()"
        (confirmEvent)="onPrintSettingsConfirm($event)">
      </app-print-settings-modal>

      <app-sales-document-print
        [document]="documentToPrint"
        [settings]="printSettings">
      </app-sales-document-print>
    </div>
  `
})
export class SalesDocumentFormComponent {
  @Input() viewMode: string = 'sales-form';

  activeCompanyId: string | null = null;

  showDocTypeModal = false;
  salesDocTypes: any[] = [];
  selectedDocType = '';
  selectedDocDescription = '';

  showEntityModal = false;
  selectedEntityCode = '';
  selectedEntityName = '';
  selectedEntityNif = '';
  selectedEntityAddress = '';
  selectedCustomer: any = null;
  currentId: string | undefined;
  workflowHistory: WorkflowHistory[] = [];

  showArticleModal = false;
  activeRowIndex = -1;

  availableSeries: any[] = [];
  currentSeries: string = '';
  currentSeriesNumber: number = 1;

  @ViewChild(SalesDocumentPrintComponent) printComponent!: SalesDocumentPrintComponent;

  ngOnInit() {
    this.loadActiveCompany();
    // loadSeries and loadNextNumber are now called inside loadActiveCompany
  }

  loadActiveCompany() {
    const stored = localStorage.getItem('erp_company_info');
    if (stored) {
      this.activeCompany = JSON.parse(stored);
      this.activeCompanyId = this.activeCompany.id;
    }

    // Only call loadSeries, which will itself call loadNextNumber
    this.loadSeries();
  }

  loadSeries() {
    this.availableSeries = [];

    this.dataService.getDocumentTypes('SALES').subscribe(types => {
      this.salesDocTypes = types || [];
      if (types) {
        const docType = types.find((t: any) => t.code === (this.selectedDocType || this.defaultDocValue));

        if (docType && docType.series && docType.series.length > 0) {
          // Filter by active and company
          if (this.activeCompanyId) {
            this.availableSeries = docType.series.filter((s: any) => s.active && s.companyId == this.activeCompanyId);
          } else {
            this.availableSeries = docType.series.filter((s: any) => s.active && !s.companyId);
          }
        }
      }

      // Ensure current series is in the list
      if (this.availableSeries.length > 0) {
        const currentExists = this.availableSeries.find(s => s.code === this.currentSeries);
        // If current series is not in the list, select the default one or the first one
        if (!this.currentSeries || !currentExists) {
          const defaultS = this.availableSeries.find(s => s.isDefault);

          this.currentSeries = defaultS ? defaultS.code : this.availableSeries[0].code;
          this.loadNextNumber();
        } else {
          this.loadNextNumber();
        }
      } else {
        this.currentSeries = '';
        this.loadNextNumber();
      }

      this.cdr.detectChanges();
    });
  }

  showIvaModal = false;
  activeIvaRowIndex = -1;

  // New modals state
  isWarehouseModalOpen = false;
  isLocationModalOpen = false;
  isBatchModalOpen = false;
  isConfigModalOpen = false;

  onConfigModalClose() {
    this.isConfigModalOpen = false;
    this.loadSeries();
  }

  // Active row for modals
  activeModalRowIndex = -1;

  clientDiscount = 0;
  financialDiscount = 0;
  paymentCondition: 'PRONTO' | 'PRAZO' = 'PRONTO';

  treasuryAccounts: any[] = [];
  selectedTreasuryAccountId: string = '';

  // Totals
  merchandiseTotal = 0;
  subtotal = 0;
  discountValue = 0;
  totalIva = 0;
  totalValue = 0;

  // Context Menu State
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuRowIndex = -1;

  rows: GridRow[] = Array(20).fill(null).map(() => ({
    articleCode: '',
    warehouse: '',
    location: '',
    batch: '',
    description: '',
    civa: '',
    iva: '',
    unitPrice: 0,
    discount: 0,
    unit: '',
    quantity: 0,
    totalLiquid: 0,
    project: '',
    pepElement: '',
    barcode: '',
    ivaRule: '',
    totalValue: 0,
    contract: '',
    processNumber: ''
  }));

  activeCompany: any = null;

  get isInternal(): boolean {
    return this.viewMode === 'internal-docs';
  }

  get activeRow(): GridRow | null {
    if (this.activeModalRowIndex >= 0 && this.activeModalRowIndex < this.rows.length) {
      return this.rows[this.activeModalRowIndex];
    }
    return null;
  }

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

  activeTab = 0;

  tabs = [
    "Geral", "Condições", "Transação", "Fatura", "Impressão",
    "Carga/Descarga", "Observações", "Workflow/Estado", "Anexos"
  ];

  totals = {
    merchandise: 0,
    discounts: 0,
    iva: 0,
    others: 0,
    subtotal: 0,
    adjustment: 0,
    ecovalue: 0,
    total: 0
  };

  get documentRefLabel(): string {
    return this.isInternal ? "N.º Doc:" : "V/Refer.";
  }

  get defaultDocValue(): string {
    return this.isInternal ? "" : "FA";
  }



  shouldRenderDivider(idx: number): boolean {
    if (this.isInternal) {
      return idx === 2 || idx === 3 || idx === 4 || idx === 6;
    } else {
      return idx === 4 || idx === 6 || idx === 9;
    }
  }

  onDocTypeKeydown(event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      if (!this.isLocked) {
        this.openDocTypeModal();
      }
    }
  }

  onEntityKeydown(event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      if (!this.isLocked) {
        this.openEntityModal();
      }
    }
  }

  openDocTypeModal() {
    this.showDocTypeModal = true;
  }

  openDocConfigModal() {
    this.isConfigModalOpen = true;
  }

  onDocTypeSelect(type: any) {
    this.selectedDocType = type.code;
    this.selectedDocDescription = type.description;
    this.showDocTypeModal = false;

    // Auto-select PRONTO for VD
    if (this.selectedDocType === 'VD') {
      this.paymentCondition = 'PRONTO';
    }

    this.loadSeries();
    this.loadNextNumber();
  }

  openEntityModal() {
    this.showEntityModal = true;
  }

  onEntitySelect(entity: any) {
    this.selectedEntityCode = entity.code;
    this.selectedEntityName = entity.name;
    this.selectedEntityNif = entity.nif;
    this.selectedEntityAddress = entity.address;
    this.selectedCustomer = entity;
    this.showEntityModal = false;
  }

  // Article Logic
  onArticleBlur(index: number) {
    const code = this.rows[index].articleCode;
    if (!code) return;

    const article = this.inventoryService.getArticles().find(a => a.code.toLowerCase() === code.toLowerCase());
    if (article) {
      this.updateRowWithArticle(index, article);
    } else {
      // Optional: Show error or clear
      // console.log('Article not found');
    }
  }

  onArticleKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.activeRowIndex = index;
      this.showArticleModal = true;
    }
  }

  onArticleSelect(article: any) {
    if (this.activeRowIndex !== -1) {
      this.updateRowWithArticle(this.activeRowIndex, article);
      this.activeRowIndex = -1;
    }
    this.showArticleModal = false;
  }

  private updateRowWithArticle(index: number, article: any) {
    const defaultWarehouse = this.inventoryService.getDefaultWarehouse();
    const batches = this.inventoryService.getBatches(article.code);
    let defaultBatch = '';

    // If there are batches, pick the first one (or ideally the one with earliest expiry)
    if (batches.length > 0) {
      // Sort by expiry date (ascending) to pick FIFO
      const sortedBatches = [...batches].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
      defaultBatch = sortedBatches[0].code;
    }

    this.rows[index] = {
      ...this.rows[index],
      id: undefined, // Clear existing line ID if changing article
      articleId: article.id,
      articleCode: article.code,
      description: article.name || article.description,
      unit: article.unit,
      unitPrice: article.salePrice || 0,
      iva: (article.ivaRate || 0) + '%',
      quantity: 1, // Default to 1
      warehouse: defaultWarehouse ? defaultWarehouse.code : '',
      batch: defaultBatch
    };

    // Default IVA mapping
    if (article.ivaRate === 23) {
      this.rows[index].civa = "23";
    } else {
      this.rows[index].civa = article.ivaCode || "01";
    }

    this.calculateRow(index);
  }

  calculateRow(index: number) {
    const row = this.rows[index];
    if (!row.articleCode) return;

    // Parse IVA percentage (e.g., "23%") - handle undefined/null/empty values
    let ivaRate = 0;
    if (row.iva && typeof row.iva === 'string' && row.iva.trim() !== '') {
      ivaRate = parseFloat(row.iva.replace('%', '')) / 100 || 0;
    }

    // Calculate totals
    const grossTotal = row.quantity * row.unitPrice;
    const discountValue = grossTotal * (row.discount / 100); // Assuming discount is percentage for now, or 0
    const liquidTotal = grossTotal - discountValue;
    const ivaValue = liquidTotal * ivaRate;
    const totalValue = liquidTotal + ivaValue;

    // Update row
    this.rows[index] = {
      ...row,
      totalLiquid: liquidTotal,
      totalValue: totalValue
    };

    this.calculateTotals();
  }

  calculateTotals() {
    let merchandise = 0;
    let rowDiscounts = 0;
    let iva = 0;
    let subtotal = 0;

    this.rows.forEach(row => {
      if (!row.articleCode) return;

      // Parse IVA percentage - handle undefined/null/empty values
      let ivaRate = 0;
      if (row.iva && typeof row.iva === 'string' && row.iva.trim() !== '') {
        ivaRate = parseFloat(row.iva.replace('%', '')) / 100 || 0;
      }

      const grossTotal = row.quantity * row.unitPrice;
      const discountValue = grossTotal * (row.discount / 100);
      const liquidTotal = grossTotal - discountValue;
      const ivaValue = liquidTotal * ivaRate;

      merchandise += grossTotal;
      rowDiscounts += discountValue;
      iva += ivaValue;
      subtotal += liquidTotal;
    });

    // Apply Global Discounts
    const clientDiscountValue = subtotal * (this.clientDiscount / 100);
    const afterClientDiscount = subtotal - clientDiscountValue;

    const financialDiscountValue = afterClientDiscount * (this.financialDiscount / 100);

    const totalDiscounts = rowDiscounts + clientDiscountValue + financialDiscountValue;
    const total = subtotal + iva - clientDiscountValue - financialDiscountValue;

    // Update class properties
    this.merchandiseTotal = merchandise;
    this.subtotal = subtotal - clientDiscountValue - financialDiscountValue;
    this.discountValue = totalDiscounts;
    this.totalIva = iva;
    this.totalValue = total;
  }

  // IVA Logic
  onCivaKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openIvaModal(index);
    }
  }

  openIvaModal(index: number) {
    this.activeIvaRowIndex = index;
    this.showIvaModal = true;
  }

  onIvaSelect(iva: any) {
    if (this.activeIvaRowIndex !== -1) {
      const row = this.rows[this.activeIvaRowIndex];
      this.rows[this.activeIvaRowIndex] = {
        ...row,
        civa: iva.code,
        iva: iva.rate + '%'
      };
      this.calculateRow(this.activeIvaRowIndex);
      this.activeIvaRowIndex = -1;
    }
    this.showIvaModal = false;
  }

  // Warehouse Modal Logic
  onWarehouseKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openWarehouseSearch(index);
    }
  }

  openWarehouseSearch(index: number) {
    this.activeModalRowIndex = index;
    this.isWarehouseModalOpen = true;
  }

  onWarehouseSelect(warehouse: any) {
    if (this.activeModalRowIndex !== -1) {
      this.rows[this.activeModalRowIndex].warehouse = warehouse.code;
    }
    this.isWarehouseModalOpen = false;
  }

  // Location Modal Logic
  onLocationKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openLocationSearch(index);
    }
  }

  openLocationSearch(index: number) {
    this.activeModalRowIndex = index;
    this.isLocationModalOpen = true;
  }

  onLocationSelect(location: any) {
    if (this.activeModalRowIndex !== -1) {
      this.rows[this.activeModalRowIndex].location = location.code;
    }
    this.isLocationModalOpen = false;
  }

  // Batch Modal Logic
  onBatchKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'F4') {
      event.preventDefault();
      this.openBatchSearch(index);
    }
  }

  openBatchSearch(index: number) {
    this.activeModalRowIndex = index;
    this.isBatchModalOpen = true;
  }

  onBatchSelect(batch: any) {
    if (this.activeModalRowIndex !== -1) {
      this.rows[this.activeModalRowIndex].batch = batch.code;
    }
    this.isBatchModalOpen = false;
  }

  // Context Menu Logic
  onContextMenu(event: MouseEvent, index: number) {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuRowIndex = index;
  }

  insertLine() {
    if (this.contextMenuRowIndex !== -1) {
      const newRow = {
        articleCode: '',
        warehouse: '',
        location: '',
        batch: '',
        description: '',
        civa: '',
        iva: '',
        unitPrice: 0,
        discount: 0,
        unit: '',
        quantity: 0,
        totalLiquid: 0,
        project: '',
        pepElement: '',
        barcode: '',
        ivaRule: '',
        totalValue: 0,
        contract: '',
        processNumber: ''
      };
      // Insert at index
      this.rows.splice(this.contextMenuRowIndex, 0, newRow);
      this.calculateTotals();
      this.contextMenuVisible = false;
    }
  }

  removeLine() {
    if (this.contextMenuRowIndex !== -1) {
      this.rows.splice(this.contextMenuRowIndex, 1);
      this.calculateTotals();
      // Ensure we maintain a minimum number of rows if desired, or just let it shrink
      if (this.rows.length < 20) {
        this.rows.push({
          articleCode: '',
          warehouse: '',
          location: '',
          batch: '',
          description: '',
          civa: '',
          iva: '',
          unitPrice: 0,
          discount: 0,
          unit: '',
          quantity: 0,
          totalLiquid: 0,
          project: '',
          pepElement: '',
          barcode: '',
          ivaRule: '',
          totalValue: 0,
          contract: '',
          processNumber: ''
        });
      }
      this.contextMenuVisible = false;
    }
  }

  // Search Modal
  isSearchModalOpen = false;

  // Print Logic
  isPrintSettingsOpen = false;
  printSettings: PrintSettings | null = null;
  documentToPrint: SalesDocument | null = null;

  constructor(
    private accountingService: AccountingService,
    private inventoryService: InventoryService,
    private titleService: Title,
    private auditService: AuditService,
    private periodService: PeriodService,
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.initializeGrid();
    this.calculateTotals();
    this.loadTreasuryAccounts();
  }

  initializeGrid() {
    this.rows = Array(20).fill(null).map(() => ({
      articleCode: '',
      warehouse: '',
      location: '',
      batch: '',
      description: '',
      civa: '',
      iva: '',
      unitPrice: 0,
      discount: 0,
      unit: '',
      quantity: 0,
      totalLiquid: 0,
      project: '',
      pepElement: '',
      barcode: '',
      ivaRule: '',
      totalValue: 0,
      contract: '',
      processNumber: ''
    }));
  }

  loadTreasuryAccounts() {
    this.treasuryAccounts = this.accountingService.getAccounts()
      .filter(a => a.allowPosting && (a.code.startsWith('11') || a.code.startsWith('12')))
      .sort((a, b) => a.code.localeCompare(b.code));

    if (this.treasuryAccounts.length > 0) {
      this.selectedTreasuryAccountId = this.treasuryAccounts[0].id;
    }
  }

  documentDate: string = new Date().toISOString().split('T')[0];
  dueDate: string = new Date().toISOString().split('T')[0];

  status: WorkflowStatus = WorkflowStatus.DRAFT;

  get isLocked(): boolean {
    // Only approved or posted docs are locked for editing
    return this.status === WorkflowStatus.APPROVED || this.status === WorkflowStatus.POSTED;
  }

  handleToolbarClick(action: string) {
    switch (action) {
      case 'Gravar':
        this.saveDocument();
        break;
      case 'Procurar':
        this.openSearchModal();
        break;
      case 'Novo':
        this.resetForm();
        break;
      case 'Imprimir':
        this.printDocument();
        break;
      case 'Cancelar':
        this.resetForm();
        break;
      case 'Anular':
        this.cancelDocument();
        break;
      case 'Duplicar':
        this.duplicateDocument();
        break;
      case 'Anular e Duplicar':
        this.voidAndDuplicate();
        break;
      case 'Rascunhos':
        this.showDrafts();
        break;
      case 'Enviar':
        this.sendDocument();
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
      default:
        console.log('Action not implemented:', action);
        break;
    }
  }

  printDocument() {
    if (this.isLocked) {
      // Allow re-printing of locked documents
      if (confirm('Deseja imprimir uma 2ª via deste documento?')) {
        this.documentToPrint = this.getCurrentDocument();
        this.isPrintSettingsOpen = true;
      }
      return;
    }

    if (!confirm('A impressão irá bloquear o documento para edições futuras. Deseja continuar?')) {
      return;
    }

    // Save first to ensure data is persisted
    this.saveDocument(true); // Pass true to indicate printing
  }

  onPrintSettingsClose() {
    this.isPrintSettingsOpen = false;
  }

  onPrintSettingsConfirm(settings: PrintSettings) {
    this.printSettings = settings;
    this.isPrintSettingsOpen = false;

    // Construct the document object for printing
    // We need to ensure we have a valid document object even if it's not fully saved yet,
    // but typically we save before printing.
    // In saveDocument, we'll set documentToPrint.

    // Force refresh of company info in print component
    if (this.printComponent) {
      this.printComponent.refreshCompanyInfo();
    }

    // Set title for printing (browser uses this as filename)
    if (this.documentToPrint) {
      const type = this.documentToPrint.documentType;
      const series = this.documentToPrint.series;
      const number = this.documentToPrint.seriesNumber;
      const description = this.getDocDescription(type);

      this.titleService.setTitle(`${description} Nº.${number} - ${series}`);
    }

    setTimeout(() => {
      window.print();
      // Reset after print
      // this.documentToPrint = null; 
    }, 500);
  }

  cancelDocument() {
    if (this.status === WorkflowStatus.REJECTED) return; // Allow cancelling rejected docs? Or maybe REJECTED is already a stop.
    if (!confirm('Tem a certeza que deseja anular este documento?')) return;

    this.status = WorkflowStatus.REJECTED; // Using REJECTED as CANCELLED for now or we could add CANCELLED
    this.saveDocument(false, true); // Save as cancelled
  }

  openSearchModal() {
    this.isSearchModalOpen = true;
  }

  loadNextNumber() {
    this.dataService.getSalesDocuments(this.activeCompanyId || undefined).subscribe(docs => {
      let nextNum = 1;
      const typeDocs = docs.filter((d: any) =>
        d.documentType === (this.selectedDocType || this.defaultDocValue) &&
        d.series === this.currentSeries
      );

      if (typeDocs.length > 0) {
        const numbers = typeDocs.map((d: any) => Number(d.seriesNumber)).filter(n => !isNaN(n));
        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        nextNum = maxNum + 1;
      }

      // Wrap in setTimeout to ensure it runs outside the check cycle
      setTimeout(() => {
        this.ngZone.run(() => {
          this.currentSeriesNumber = nextNum;
          this.updatePageTitle();
          this.cdr.detectChanges();
        });
      });
    });
  }

  updatePageTitle() {
    const type = this.selectedDocType || this.defaultDocValue;
    const series = this.currentSeries;
    const number = this.currentSeriesNumber;

    let description = this.selectedDocDescription;
    if (!description) {
      description = this.getDocDescription(type);
    }

    if (description && series && number) {
      let title = `${description} Nº.${number} - ${series}`;

      if (this.activeCompany && this.activeCompany.documentNameFormat) {
        title = this.activeCompany.documentNameFormat
          .replace('{description}', description)
          .replace('{type}', type)
          .replace('{series}', series)
          .replace('{number}', number.toString());
      }

      this.titleService.setTitle(title);
    } else {
      this.titleService.setTitle('Inverno ERP');
    }
  }

  onNumberChange(newNumber: number) {
    this.ngZone.run(() => {
      this.currentSeriesNumber = newNumber;
      this.tryLoadDocumentByNumber();
      this.updatePageTitle();
      this.cdr.detectChanges();
    });
  }

  tryLoadDocumentByNumber() {
    const type = this.selectedDocType || this.defaultDocValue;
    const series = this.currentSeries;
    const num = this.currentSeriesNumber;

    if (!type || !series || !num || !this.activeCompanyId) return;

    this.dataService.getSalesDocumentByNumber(this.activeCompanyId, type, series, num).subscribe(doc => {
      this.ngZone.run(() => {
        if (doc) {
          this.loadDocument(doc);
        } else {
          // If loading a number that doesn't exist, reset to draft and clear entity/lines
          // but keep the current number
          const currentNum = this.currentSeriesNumber;
          this.status = WorkflowStatus.DRAFT;
          this.clearForm();
          this.currentSeriesNumber = currentNum;
          this.selectedDocType = type;
          this.currentSeries = series;
          this.updatePageTitle();
        }
        this.cdr.detectChanges();
      });
    });
  }

  loadDocument(doc: SalesDocument) {
    this.selectedDocType = doc.documentType;
    this.selectedDocDescription = this.getDocDescription(doc.documentType);
    this.currentSeries = doc.series || '2025';
    this.currentSeriesNumber = doc.seriesNumber || 0;
    this.documentDate = new Date(doc.date).toISOString().split('T')[0];
    this.dueDate = new Date(doc.dueDate || doc.date).toISOString().split('T')[0];
    this.status = doc.status || WorkflowStatus.DRAFT;
    this.currentId = doc.id;
    this.loadWorkflowHistory();

    this.selectedEntityCode = doc.customerId;
    this.selectedEntityName = doc.customerName;
    this.selectedEntityNif = doc.customerNif;
    this.selectedEntityAddress = doc.customerAddress || '';

    // Reset grid
    this.rows = Array(20).fill(null).map(() => ({
      articleCode: '',
      warehouse: '',
      location: '',
      batch: '',
      description: '',
      civa: '',
      iva: '',
      unitPrice: 0,
      discount: 0,
      unit: '',
      quantity: 0,
      totalLiquid: 0,
      project: '',
      pepElement: '',
      barcode: '',
      ivaRule: '',
      totalValue: 0,
      contract: '',
      processNumber: ''
    }));

    // Fill grid
    doc.lines.forEach((line, index) => {
      if (index < 20) {
        this.rows[index] = {
          ...this.rows[index],
          articleCode: line.articleCode,
          description: line.articleName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          iva: line.ivaRate + '%',
          civa: line.ivaCode,
          totalLiquid: line.subtotal,
          totalValue: line.total
        };
      }
    });

    this.calculateTotals();
    this.isSearchModalOpen = false;
    this.updatePageTitle();
  }

  resetForm() {
    setTimeout(() => {
      this.ngZone.run(() => {
        // Keep context (Type/Series) when resetting for "Novo"
        this.status = WorkflowStatus.DRAFT;
        this.clearForm(true);
        this.loadNextNumber();
        this.cdr.detectChanges();
      });
    }, 50);
  }

  getCurrentDocument(): SalesDocument {
    // Check if there are lines with articles
    const validLines = this.rows.filter(row => row.articleCode && row.quantity > 0);

    // Create sales document with sequential numbering
    const documentNumber = `${this.selectedDocType} ${this.currentSeries}/${this.currentSeriesNumber}`;

    const salesLines: SalesDocumentLine[] = validLines.map((row, index) => {
      // Parse IVA rate properly - handle "23%" format
      let ivaRate = 0;
      if (row.iva && typeof row.iva === 'string' && row.iva.trim() !== '') {
        ivaRate = parseFloat(row.iva.replace('%', '')) || 0;
      }

      const subtotal = row.quantity * row.unitPrice * (1 - row.discount / 100);
      const ivaAmount = subtotal * (ivaRate / 100);

      return {
        id: `LINE${index + 1}`,
        articleId: row.articleCode,
        articleCode: row.articleCode,
        articleName: row.description,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        discount: row.discount,
        ivaRate: ivaRate,
        ivaCode: row.civa,
        subtotal: subtotal,
        ivaAmount: ivaAmount,
        total: subtotal + ivaAmount
      };
    });

    return {
      id: `DOC${Date.now()}`, // This ID might be wrong for existing docs, but okay for print preview
      documentType: this.selectedDocType,
      documentNumber: documentNumber,
      series: this.currentSeries,
      seriesNumber: this.currentSeriesNumber,
      date: new Date(this.documentDate),
      dueDate: new Date(this.dueDate),
      customerId: this.selectedEntityCode,
      customerName: this.selectedEntityName,
      customerNif: this.selectedEntityNif,
      customerAddress: this.selectedEntityAddress,
      lines: salesLines,
      subtotal: this.subtotal,
      discounts: this.discountValue,
      totalIva: this.totalIva,
      total: this.totalValue,
      status: this.status,
      notes: ''
    };
  }

  duplicateDocument() {
    this.currentId = undefined;
    this.status = WorkflowStatus.DRAFT;
    this.loadNextNumber();
    alert('Documento duplicado. Verifique os dados e grave.');
  }

  voidAndDuplicate() {
    if (!this.currentId) {
      alert('Grave o documento antes de anular.');
      return;
    }
    if (confirm('Deseja anular este documento e criar uma cópia?')) {
      this.cancelDocument();
      // Wait for save to complete? cancelDocument calls saveDocument with subscription
      // We'll just trigger duplication as well
      this.duplicateDocument();
    }
  }

  getDocDescription(type: string): string {
    // Mock description fetch
    if (type === 'FA') return 'Fatura';
    if (type === 'VD') return 'Venda a Dinheiro';
    return '';
  }

  // Save document with accounting and inventory integration
  saveDocument(isPrinting: boolean = false, isCancelling: boolean = false) {
    if (this.isLocked && !isPrinting && !isCancelling) {
      alert('Este documento está bloqueado e não pode ser alterado.');
      return;
    }

    // Validate Series Date
    // Validate Period Closure
    if (!this.periodService.isPeriodOpen(this.documentDate)) {
      alert('O período para esta data está fechado. Não é possível gravar documentos nesta data.');
      return;
    }

    // Validate Sequential Date (Sales Only)
    if (!this.validateSequentialDate()) {
      return;
    }

    // Validate Series Date
    const allSeries = JSON.parse(localStorage.getItem('erp_series_definitions') || '[]');
    const seriesDef = allSeries.find((s: any) => s.code === this.currentSeries && s.companyId === this.activeCompanyId);
    const series = seriesDef || this.availableSeries.find(s => s.code === this.currentSeries);

    if (series && series.startDate && series.endDate) {
      const docDate = new Date(this.documentDate);
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

    // Validate document
    if (!this.selectedDocType) {
      alert('Por favor selecione um tipo de documento');
      return;
    }

    if (!this.selectedEntityCode) {
      alert('Por favor selecione uma entidade');
      return;
    }

    if (!this.currentSeries) {
      alert('A série do documento é obrigatória');
      return;
    }

    if (!this.currentSeriesNumber) {
      alert('O número do documento é obrigatório');
      return;
    }

    // Check if there are lines with articles
    const validLines = this.rows.filter(row => row.articleCode && row.quantity > 0);
    if (validLines.length === 0) {
      alert('Por favor adicione pelo menos um artigo');
      return;
    }

    // Create sales document with sequential numbering
    const documentNumber = `${this.selectedDocType} ${this.currentSeries}/${this.currentSeriesNumber}`;

    const salesLines: SalesDocumentLine[] = validLines.map((row) => {
      // Parse IVA rate properly - handle "23%" format
      let ivaRate = 0;
      if (row.iva && typeof row.iva === 'string' && row.iva.trim() !== '') {
        ivaRate = parseFloat(row.iva.replace('%', '')) || 0;
      }

      const unitPrice = Number(row.unitPrice) || 0;
      const discount = Number(row.discount) || 0;
      const quantity = Number(row.quantity) || 0;

      const subtotal = quantity * unitPrice * (1 - discount / 100);
      const ivaAmount = subtotal * (ivaRate / 100);

      // Backend requires articleName. Fallback to code if description is missing.
      const articleName = row.description && row.description.trim() !== '' ? row.description : row.articleCode;

      return {
        // Only send ID if it's a valid UUID (36 chars). 
        // Do NOT send temporary IDs like "LINE1" as backend entity expects UUID.
        id: (row.id && row.id.length === 36) ? row.id : undefined,
        articleId: row.articleId || row.articleCode,
        articleCode: row.articleCode,
        articleName: articleName,
        quantity: quantity,
        unitPrice: unitPrice,
        discount: discount,
        ivaRate: ivaRate,
        ivaCode: row.civa,
        subtotal: subtotal,
        ivaAmount: ivaAmount,
        total: subtotal + ivaAmount
      } as any;
    });

    // Determine status
    let newStatus: WorkflowStatus = this.status;
    if (isPrinting) newStatus = WorkflowStatus.APPROVED; // Using APPROVED for CONFIRMED/INVOICED
    if (isCancelling) newStatus = WorkflowStatus.REJECTED;

    const salesDoc: any = {
      id: this.currentId,
      companyId: this.activeCompanyId || undefined,
      documentType: this.selectedDocType,
      documentNumber: documentNumber,
      series: this.currentSeries,
      seriesNumber: this.currentSeriesNumber,
      date: this.documentDate,
      dueDate: this.dueDate,
      customerId: this.selectedEntityCode,
      customerName: this.selectedEntityName,
      customerNif: this.selectedEntityNif,
      customerAddress: this.selectedEntityAddress,
      lines: salesLines,
      subtotal: this.subtotal,
      discounts: this.discountValue,
      totalIva: this.totalIva,
      total: this.totalValue,
      status: newStatus,
      notes: ''
    };

    // Save via DataService
    // Check for sequential number gap
    this.dataService.getSalesDocuments(this.activeCompanyId || undefined).subscribe(docs => {
      this.ngZone.run(() => {
        const typeDocs = docs.filter((d: any) =>
          d.documentType === this.selectedDocType &&
          d.series === this.currentSeries
        );

        const numbers = typeDocs.map((d: any) => Number(d.seriesNumber)).filter(n => !isNaN(n));
        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        const expectedNum = maxNum + 1;

        // Only check schema if we are creating a new doc or changing number to something potentially new
        if (!salesDoc.id || !docs.find((d: any) => d.id === salesDoc.id)) {
          if (this.currentSeriesNumber > expectedNum) {
            if (!confirm(`O número ${this.currentSeriesNumber} não é sequencial (Esperado: ${expectedNum}). Deseja continuar e criar um intervalo na numeração?`)) {
              return;
            }
          }
        } else {
          // If updating existing doc, check if we changed number to something way off?
          // Maybe too complex for now, assume updates are fine or handled by uniqueness check elsewhere.
        }

        // Save via DataService
        this.dataService.saveSalesDocument(salesDoc).subscribe({
          next: (savedDoc) => {
            this.ngZone.run(() => {
              // Update local status
              this.status = newStatus;
              this.currentId = savedDoc?.id || this.currentId;
              this.loadWorkflowHistory();

              // Refresh inventory data to reflect stock movements
              this.inventoryService.loadData().then(() => {
                this.processPostSaveActions(savedDoc || salesDoc, this.currentId || '', documentNumber, isPrinting, isCancelling);
                this.cdr.detectChanges();
              });
            });
          },
          error: (err) => {
            console.error('Error saving document:', err);
            // Log full validation error details from backend
            if (err.error && err.error.message) {
              console.error('Validation errors:', err.error.message);
              alert('Erro de validação: ' + (Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message));
            } else {
              alert('Erro ao gravar documento: ' + err.message);
            }
          }
        });
      });
    });
  }

  processPostSaveActions(
    salesDoc: SalesDocument,
    id: string,
    documentNumber: string,
    isPrinting: boolean,
    isCancelling: boolean
  ) {
    if (isPrinting) {
      this.documentToPrint = salesDoc;
      this.isPrintSettingsOpen = true;
      this.cdr.detectChanges(); // Force Check
    } else if (isCancelling) {
      alert(`Documento ${documentNumber} anulado.`);
    } else {
      // Determine if this document type should create accounting entries
      const accountingDocTypes = ['FA', 'VD', 'NC', 'ND'];
      const shouldCreateAccounting = accountingDocTypes.includes(this.selectedDocType);

      try {
        const articles = this.inventoryService.getArticles();

        // ALWAYS process stock movements
        this.inventoryService.processSalesStockMovements(
          id,
          salesDoc.lines,
          documentNumber
        );

        // ONLY create accounting entries for financial documents
        if (shouldCreateAccounting) {
          const debitAccountId = this.paymentCondition === 'PRONTO' ? this.selectedTreasuryAccountId : undefined;
          // Assuming selectedCustomer is available or configured
          const customer = { code: this.selectedEntityCode, name: this.selectedEntityName, nif: this.selectedEntityNif };

          this.accountingService.createSalesJournalEntry(salesDoc, customer, articles, this.paymentCondition, debitAccountId);
          this.accountingService.createCOGSEntry(salesDoc, articles);

          alert(`Documento ${documentNumber} gravado com sucesso!\n\nMovimentos de stock e lançamentos contabilísticos criados automaticamente.`);
        } else {
          alert(`Documento ${documentNumber} gravado com sucesso!\n\nMovimento de stock criado.`);
        }

        salesDoc.lines.forEach(line => {
          if (line.articleCode) {
            this.inventoryService.recalculateArticleStock(line.articleCode);
          }
        });

      } catch (error) {
        console.error('Erro ao processar documento:', error);
        alert('Documento gravado mas houve erro ao processar movimentos.');
      }
    }
  }

  clearForm(keepContext: boolean = false) {
    if (!keepContext) {
      this.selectedDocType = '';
      this.selectedDocDescription = '';
      this.currentSeries = ''; // Also clear series if clearing type
    }
    this.selectedEntityCode = '';
    this.selectedEntityName = '';
    this.selectedEntityNif = '';
    this.selectedEntityAddress = '';
    this.selectedCustomer = null;

    this.rows = Array(20).fill(null).map(() => ({
      articleCode: '',
      warehouse: '',
      location: '',
      batch: '',
      description: '',
      civa: '',
      iva: '',
      unitPrice: 0,
      discount: 0,
      unit: '',
      quantity: 0,
      totalLiquid: 0,
      project: '',
      pepElement: '',
      barcode: '',
      ivaRule: '',
      totalValue: 0,
      contract: '',
      processNumber: ''
    }));

    this.clientDiscount = 0;
    this.financialDiscount = 0;

    this.merchandiseTotal = 0;
    this.subtotal = 0;
    this.discountValue = 0;
    this.totalIva = 0;
    this.totalValue = 0;
    this.currentId = undefined;
    this.status = WorkflowStatus.DRAFT;
    this.workflowHistory = [];
  }



  showDrafts() {
    this.isSearchModalOpen = true;
    alert('A mostrar pesquisa filtrada por rascunhos.');
  }

  sendDocument() {
    alert('Funcionalidade de envio de email em desenvolvimento.');
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

  loadWorkflowHistory() {
    if (!this.currentId) return;
    this.dataService.getWorkflowHistory('sales', this.currentId).subscribe(history => {
      this.workflowHistory = history;
    });
  }

  onWorkflowAction(action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST') {
    if (!this.currentId) {
      alert('Grave o documento antes de processar o workflow.');
      return;
    }

    const notes = prompt('Notas/Justificação (Opcional):');
    if (notes === null) return; // Cancelled prompt

    this.dataService.processWorkflow('sales', this.currentId, action, notes).subscribe({
      next: (res) => {
        this.status = res.status;
        this.loadWorkflowHistory();
        alert(`Documento ${action === 'SUBMIT' ? 'submetido' : action === 'APPROVE' ? 'aprovado' : action === 'REJECT' ? 'rejeitado' : 'lançado'} com sucesso.`);
      },
      error: (err) => {
        alert('Erro ao processar workflow: ' + (err.error?.message || err.message));
      }
    });
  }

  // Close context menu on click outside
  @HostListener('document:click')
  onDocumentClick() {
    this.contextMenuVisible = false;
  }

  validateSeriesDate() {
    const allSeries = JSON.parse(localStorage.getItem('erp_series_definitions') || '[]');
    const seriesDef = allSeries.find((s: any) => s.code === this.currentSeries && s.companyId === this.activeCompanyId);
    const series = seriesDef || this.availableSeries.find(s => s.code === this.currentSeries);

    if (series && series.startDate && series.endDate) {
      const docDate = new Date(this.documentDate);
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

  validateSequentialDate(): boolean {
    const stored = localStorage.getItem('erp_sales_documents');
    if (!stored) return true;

    const documents = JSON.parse(stored) as SalesDocument[];

    // Get last document of same series and type
    const lastDoc = documents
      .filter(d => d.documentType === this.selectedDocType && d.series === this.currentSeries)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (lastDoc) {
      const current = new Date(this.documentDate);
      const last = new Date(lastDoc.date);

      // Reset hours
      current.setHours(0, 0, 0, 0);
      last.setHours(0, 0, 0, 0);

      if (current < last) {
        const confirmMsg = `Atenção: A data do documento (${this.documentDate}) é anterior à do último documento emitido nesta série (${lastDoc.date}).\n\nIsto quebra a sequência cronológica.\n\nDeseja continuar mesmo assim?`;

        if (confirm(confirmMsg)) {
          const reason = prompt('Por favor, indique o motivo desta exceção:');
          if (reason) {
            this.auditService.logException({
              user: 'current_user', // Replace with actual user service
              action: 'DATE_EXCEPTION',
              module: 'SALES',
              documentRef: `${this.selectedDocType} ${this.currentSeries}/${this.currentSeriesNumber}`,
              details: {
                originalDate: lastDoc.date.toString(),
                newDate: this.documentDate,
                reason: reason
              }
            });
            return true;
          } else {
            alert('É obrigatório indicar um motivo para prosseguir.');
            return false;
          }
        } else {
          return false;
        }
      }
    }
    return true;
  }
}
