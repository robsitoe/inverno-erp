import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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
import { EntityTypeConfigModalComponent, EntityType } from '../../shared/components/entity-type-config-modal.component';
import { GenericEntityListModalComponent } from '../../shared/components/generic-entity-list-modal.component';

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
  imports: [CommonModule, FormsModule, EntityListModalComponent, SupplierListModalComponent, DocumentTypeConfigModalComponent, EntityTypeConfigModalComponent, GenericEntityListModalComponent],
  styles: [`
    .spinner {
      animation: rotate 2s linear infinite;
      display: inline-block;
    }
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
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
        <button (click)="confirmSave()" *ngIf="!isLocked" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 disabled:opacity-50" [disabled]="isSaving">
          <span class="material-symbols-outlined text-[18px] text-blue-600" [class.spinner]="isSaving">{{ isSaving ? 'sync' : 'save' }}</span>
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
        <button (click)="loadPendingDocuments()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 disabled:opacity-50" [disabled]="isSaving">
          <span class="material-symbols-outlined text-[18px] text-green-600" [class.spinner]="isSaving">{{ isSaving ? 'sync' : 'refresh' }}</span>
          <span>{{ isSaving ? 'Aguarde...' : 'Atualizar' }}</span>
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
                <label class="w-24 text-right font-medium text-blue-700 cursor-pointer hover:underline" (click)="openEntityTypeConfig()">Tipo de Entidade:</label>
                <select [(ngModel)]="entityTypeCode" (change)="onEntityTypeChange()" class="w-40 border border-gray-300 rounded-sm px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500">
                  <option *ngFor="let type of allEntityTypes" [value]="type.code">{{type.description}}</option>
                </select>

                <!-- Employee Specific Category/Filter Select -->
                <select *ngIf="entityTypeCode === 'FUNCIONARIO'" [(ngModel)]="selectedEmployeeSubType" (change)="loadPendingDocuments()" class="w-56 border border-gray-300 rounded-sm px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500 ml-1">
                  <option *ngFor="let sub of employeeSubTypes" [value]="sub">{{sub}}</option>
                </select>

                <div class="flex items-center gap-1 ml-4">
                  <input type="checkbox" id="includeAssociated" class="rounded-sm border-gray-300 text-blue-600 focus:ring-0">
                  <label for="includeAssociated" class="text-gray-700">Incluir entidades associadas</label>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <label class="w-24 text-right font-medium text-blue-700 cursor-pointer hover:underline" (click)="openEntityModal()">
                  {{ getEntityTypeLabel() }}:
                </label>
                <div class="flex-1 flex items-center bg-white border border-gray-300 rounded-sm">
                  <input type="text" [(ngModel)]="entityName" readonly class="flex-1 px-2 py-0.5 border-none focus:ring-0 text-gray-700" [placeholder]="'Selecione ' + getEntityTypeLabel().toLowerCase() + '...'">
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
            
            <span class="text-gray-400">/</span>
            
            <input type="number" [(ngModel)]="currentSeriesNumber" (change)="updateDocNumberString()" (input)="updateDocNumberString()" class="w-16 border border-gray-300 rounded-sm px-1 py-0.5 text-right focus:outline-none focus:border-blue-500" min="1">
            
            <input type="date" [(ngModel)]="docDate" (change)="validateSeriesDate()" [readOnly]="isLocked" class="w-28 border border-gray-300 rounded-sm px-1 py-0.5 focus:outline-none focus:border-blue-500">
            
            <!-- ADC Mode Toggle -->
            <div class="ml-auto flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-sm px-2 py-1">
              <input type="checkbox" id="adcMode" [(ngModel)]="isAdvanceMode" (change)="onAdvanceModeChange()" class="rounded-sm border-gray-400">
              <label for="adcMode" class="text-[11px] font-medium text-yellow-800 cursor-pointer">Adiantamento (sem documento pendente)</label>
            </div>
          </div>

          <!-- ADC Mode Fields -->
          <div *ngIf="isAdvanceMode" class="bg-yellow-50 border border-yellow-300 rounded-sm p-3 mt-1">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] font-medium text-gray-700 mb-1">Valor Total *</label>
                <input type="number" [(ngModel)]="advanceAmount" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm" placeholder="0,00" min="0" step="0.01">
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-700 mb-1">Meio de Pagamento *</label>
                <select [(ngModel)]="advancePaymentMethod" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm bg-white">
                  <option value="">Selecione...</option>
                  <option *ngFor="let pm of paymentMethods.filter(p => p.isActive)" [value]="pm.code">{{ pm.description }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-700 mb-1">Conta Tesouraria</label>
                <input type="text" [value]="getAdvanceTreasuryAccountDisplay()" readonly class="w-full border border-gray-200 rounded-sm px-2 py-1 text-sm bg-gray-50 text-gray-600">
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-[10px] font-medium text-gray-700 mb-1">Observações</label>
              <textarea [(ngModel)]="advanceObservations" rows="2" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm resize-none" placeholder="Motivo do adiantamento..."></textarea>
            </div>
            <div class="mt-2 text-[10px] text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-sm px-2 py-1">
              <strong>Nota:</strong> O adiantamento será lançado diretamente sem documento pendente. 
              {{ entityType === 'CUSTOMER' ? 'Débito: Tesouraria → Crédito: Adiantamentos de Clientes (21.9)' : 'Débito: Adiantamentos a Fornecedores (22.9) → Crédito: Tesouraria' }}
            </div>
          </div>

          <!-- Grid -->
          <div *ngIf="!isAdvanceMode" class="flex-1 bg-white border border-gray-300 overflow-auto relative mt-1">
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
                <tr *ngFor="let row of pendingRows; trackBy: trackByFn" class="border-b border-gray-100 hover:bg-blue-50">
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
            <textarea [(ngModel)]="observations" [readOnly]="isLocked" class="flex-1 w-full border-none resize-none focus:ring-0 text-xs font-sans bg-transparent outline-none" placeholder="Insira observações aqui..."></textarea>
          </div>

          <!-- Status Bar -->
          <div class="bg-gray-100 border-t border-gray-300 px-2 py-0.5 text-[10px] text-gray-600 flex justify-between mt-1">
            <span>{{ pendingRows.length }} Registo(s)</span>
            <span>Inverno ERP</span>
          </div>
        </div>

        <!-- Tab: Dados Liquidação -->
        <div *ngIf="activeTab === 1" class="flex flex-col gap-3 p-3 h-full overflow-auto">
           <!-- Conta de Tesouraria Padrão -->
           <div class="bg-white border border-gray-300 p-3 rounded-sm">
              <label class="block font-medium mb-2 text-gray-700">Conta de Tesouraria Padrão</label>
              <select [(ngModel)]="selectedTreasuryAccount" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-xs">
                <option value="">Selecione...</option>
                <option *ngFor="let acc of treasuryAccounts" [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
              </select>
              <p class="text-[10px] text-gray-500 mt-1">Esta conta será usada quando nenhum meio de pagamento específico for selecionado.</p>
           </div>

           <!-- Meios de Pagamento -->
           <div class="bg-white border border-gray-300 rounded-sm flex-1 flex flex-col overflow-hidden">
              <div class="bg-gray-100 px-3 py-2 border-b border-gray-300 flex justify-between items-center">
                 <h3 class="font-bold text-gray-700">Configuração de Meios de Pagamento</h3>
                 <button (click)="addPaymentMethod()" class="bg-green-600 text-white px-2 py-1 rounded-sm text-[10px] hover:bg-green-700 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">add</span> Novo Meio
                 </button>
              </div>

              <div class="flex-1 overflow-auto">
                 <table class="w-full text-xs border-collapse">
                    <thead class="bg-gray-50 sticky top-0 border-b border-gray-300">
                       <tr>
                          <th class="px-2 py-1 text-left w-20">Código</th>
                          <th class="px-2 py-1 text-left">Descrição</th>
                          <th class="px-2 py-1 text-left">Conta de Tesouraria</th>
                          <th class="px-2 py-1 text-center w-16">Ativo</th>
                          <th class="px-2 py-1 text-center w-16">Ordem</th>
                          <th class="px-2 py-1 text-center w-20">Ações</th>
                       </tr>
                    </thead>
                    <tbody>
                       <tr *ngFor="let pm of paymentMethods; let i = index" 
                           class="border-b border-gray-100 hover:bg-blue-50"
                           [class.bg-yellow-50]="editingPaymentMethod?.id === pm.id">
                          <td class="px-2 py-1">
                             <input *ngIf="editingPaymentMethod?.id === pm.id" 
                                    [(ngModel)]="editingPaymentMethod.code" 
                                    class="w-full border border-blue-300 rounded-sm px-1 py-0.5 uppercase"
                                    maxlength="10">
                             <span *ngIf="editingPaymentMethod?.id !== pm.id" class="font-mono font-bold text-blue-600">{{ pm.code }}</span>
                          </td>
                          <td class="px-2 py-1">
                             <input *ngIf="editingPaymentMethod?.id === pm.id" 
                                    [(ngModel)]="editingPaymentMethod.description" 
                                    class="w-full border border-blue-300 rounded-sm px-1 py-0.5">
                             <span *ngIf="editingPaymentMethod?.id !== pm.id">{{ pm.description }}</span>
                          </td>
                          <td class="px-2 py-1">
                             <select *ngIf="editingPaymentMethod?.id === pm.id" 
                                     [(ngModel)]="editingPaymentMethod.treasuryAccountId" 
                                     class="w-full border border-blue-300 rounded-sm px-1 py-0.5">
                                <option value="">Selecione...</option>
                                <option *ngFor="let acc of treasuryAccounts" [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
                             </select>
                             <span *ngIf="editingPaymentMethod?.id !== pm.id" class="text-gray-700">
                                {{ getTreasuryAccountDisplay(pm.treasuryAccountId) }}
                             </span>
                          </td>
                          <td class="px-2 py-1 text-center">
                             <input type="checkbox" 
                                    [(ngModel)]="pm.isActive" 
                                    (change)="savePaymentMethodConfig()"
                                    class="rounded-sm border-gray-300">
                          </td>
                          <td class="px-2 py-1 text-center">
                             <input *ngIf="editingPaymentMethod?.id === pm.id" 
                                    type="number" 
                                    [(ngModel)]="editingPaymentMethod.sortOrder" 
                                    class="w-12 border border-blue-300 rounded-sm px-1 py-0.5 text-center"
                                    min="1">
                             <span *ngIf="editingPaymentMethod?.id !== pm.id">{{ pm.sortOrder }}</span>
                          </td>
                          <td class="px-2 py-1 text-center">
                             <div class="flex justify-center gap-1">
                                <button *ngIf="editingPaymentMethod?.id === pm.id" 
                                        (click)="saveEditingPaymentMethod()" 
                                        class="text-green-600 hover:text-green-800">
                                   <span class="material-symbols-outlined text-[16px]">check</span>
                                </button>
                                <button *ngIf="editingPaymentMethod?.id === pm.id" 
                                        (click)="cancelEditPaymentMethod()" 
                                        class="text-red-500 hover:text-red-700">
                                   <span class="material-symbols-outlined text-[16px]">close</span>
                                </button>
                                <button *ngIf="editingPaymentMethod?.id !== pm.id" 
                                        (click)="editPaymentMethod(pm)" 
                                        class="text-blue-600 hover:text-blue-800">
                                   <span class="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                             </div>
                          </td>
                       </tr>
                       <tr *ngIf="paymentMethods.length === 0">
                          <td colspan="6" class="px-2 py-8 text-center text-gray-400 italic">
                             Nenhum meio de pagamento configurado. Clique em "Novo Meio" para adicionar.
                          </td>
                       </tr>
                    </tbody>
                 </table>
              </div>

              <div class="bg-gray-50 px-3 py-2 border-t border-gray-300 text-[10px] text-gray-600">
                 <p><strong>Dica:</strong> Configure cada meio de pagamento com a conta de tesouraria correspondente. 
                 Exemplo: Numerário → Caixa (11.1.1), Transferência → Banco (12.1.1)</p>
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
      [title]="'Lista de ' + getEntityTypeLabel() + 's'"
      (close)="showCustomerModal = false"
      (select)="onEntitySelect($event)"
    ></app-entity-list-modal>

    <app-supplier-list-modal
      *ngIf="showSupplierModal"
      [title]="'Lista de ' + getEntityTypeLabel() + 's'"
      (close)="showSupplierModal = false"
      (select)="onEntitySelect($event)"
    ></app-supplier-list-modal>

    <app-document-type-config-modal
      *ngIf="isConfigModalOpen"
      [module]="'TREASURY'"
      [documentCode]="selectedDocType"
      (close)="onConfigModalClose()"
    ></app-document-type-config-modal>

    <app-entity-type-config-modal
      *ngIf="isEntityTypeConfigOpen"
      (close)="onEntityTypeConfigClose()"
    ></app-entity-type-config-modal>

    <app-generic-entity-list-modal
      *ngIf="showOtherEntityModal"
      [entityType]="entityTypeCode"
      [entityTypeLabel]="getEntityTypeLabel()"
      (close)="showOtherEntityModal = false"
      (select)="onEntitySelect($event)"
    ></app-generic-entity-list-modal>
  `
})
export class TreasuryManagementComponent implements OnInit {
  tabs = ['Gerais', 'Dados Liquidação', 'Distribuição Automática', 'Restrições', 'Restrições das Atividades'];
  activeTab = 0;

  // Filters
  entityTypeCode = 'CLIENTE';
  allEntityTypes: EntityType[] = [];
  entityType: 'CUSTOMER' | 'SUPPLIER' | 'OTHER' = 'CUSTOMER'; // Virtual category for logic

  employeeSubTypes = [
    'Alertas Diuturnidades Vencidas',
    'Alertas Fim de Contrato',
    'Alertas Fim de Período Experimental',
    'Alertas Validade do BI',
    'Cadastro Funcionários Ativos',
    'Funcionários Ativos',
    'Funcionários admitidos entre 2 datas',
    'Funcionários demitidos entre 2 datas',
    'Funcionários'
  ];
  selectedEmployeeSubType = 'Funcionários';

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

  isSaving = false;
  isLocked = false;

  showCustomerModal = false;
  showSupplierModal = false;
  showOtherEntityModal = false; // Add generic entity support if needed
  activeCompanyId: string | null = null;
  isConfigModalOpen = false;
  isEntityTypeConfigOpen = false;

  // Payment Methods Configuration
  paymentMethods: any[] = [];
  editingPaymentMethod: any = null;

  // ADC (Advance Payment) Mode
  isAdvanceMode = false;
  advanceAmount = 0;
  advancePaymentMethod = '';
  advanceObservations = '';

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

  openEntityTypeConfig() {
    this.isEntityTypeConfigOpen = true;
  }

  onEntityTypeConfigClose() {
    this.isEntityTypeConfigOpen = false;
    this.loadEntityTypes();
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
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.ensureDefaultEntityTypes();
    this.loadActiveCompany();
    this.loadTreasuryAccounts();
    this.loadPaymentMethods();
    // onEntityTypeChange will be called inside loadActiveCompany once companyId is ready
  }

  ensureDefaultEntityTypes() {
    const stored = localStorage.getItem('erp_entity_types');
    if (!stored) {
      const defaults: EntityType[] = [
        { id: '1', code: 'CLIENTE', description: 'Cliente', category: 'CUSTOMER', active: true },
        { id: '2', code: 'FORNECEDOR', description: 'Fornecedor', category: 'SUPPLIER', active: true },
        { id: '3', code: 'SOCIO', description: 'Sócio', category: 'OTHER', active: true },
        { id: '4', code: 'ESTADO', description: 'Estado/Ente Público', category: 'OTHER', active: true },
        { id: '5', code: 'OUTRO_CREDOR', description: 'Outro Credor', category: 'OTHER', active: true },
        { id: '6', code: 'OUTRO_DEVEDOR', description: 'Outro Devedor', category: 'OTHER', active: true },
        { id: '7', code: 'FORNEC_IMOB', description: 'Fornecedor de Imobilizado', category: 'SUPPLIER', active: true },
        { id: '8', code: 'SUBS_CAPITAL', description: 'Subscritor de Capital', category: 'OTHER', active: true },
        { id: '9', code: 'CREDOR_SUBS', description: 'Credor subs. n/liberadas', category: 'OTHER', active: true },
        { id: '10', code: 'OBRIGACIONISTA', description: 'Obrigacionista', category: 'OTHER', active: true },
        { id: '11', code: 'CONSULTOR', description: 'Consultor', category: 'OTHER', active: true },
        { id: '12', code: 'CONTA_BANCARIA', description: 'Conta bancária', category: 'OTHER', active: true },
        { id: '13', code: 'FUNCIONARIO', description: 'Funcionário', category: 'OTHER', active: true },
        { id: '14', code: 'SINDICATO', description: 'Sindicato', category: 'OTHER', active: true }
      ];
      localStorage.setItem('erp_entity_types', JSON.stringify(defaults));
    }
    this.loadEntityTypes();
  }

  loadEntityTypes() {
    const stored = localStorage.getItem('erp_entity_types');
    if (stored) {
      this.allEntityTypes = JSON.parse(stored).filter((t: any) => t.active);
    }

    // Ensure default code is valid
    if (this.allEntityTypes.length > 0 && !this.allEntityTypes.some(t => t.code === this.entityTypeCode)) {
      this.entityTypeCode = this.allEntityTypes[0].code;
    }
  }

  getEntityTypeLabel(): string {
    const type = this.allEntityTypes.find(t => t.code === this.entityTypeCode);
    return type ? type.description : 'Entidade';
  }

  loadActiveCompany() {
    this.dataService.getCompanyInfo().subscribe(info => {
      if (info) {
        this.activeCompanyId = info.id;
      }
      this.onEntityTypeChange();
    });
  }

  loadTreasuryAccounts() {
    // Load treasury accounts (Class 11 - Caixa, Class 12 - Bancos)
    const allAccounts = this.accountingService.getAccounts();
    this.treasuryAccounts = allAccounts.filter(acc =>
      (acc.code.startsWith('11') || acc.code.startsWith('12')) && acc.allowPosting
    );
  }

  // Payment Methods Management
  loadPaymentMethods() {
    this.dataService.getPaymentMethods(this.activeCompanyId || undefined).subscribe(methods => {
      if (methods && methods.length > 0) {
        this.paymentMethods = methods;
      } else {
        this.initializeDefaultPaymentMethods();
      }
    });
  }

  initializeDefaultPaymentMethods() {
    const defaults = [
      { id: 'PM-1', code: 'NUM', description: 'Numerário', treasuryAccountId: '3', isActive: true, sortOrder: 1 },
      { id: 'PM-2', code: 'TRF', description: 'Transferência Bancária', treasuryAccountId: '10', isActive: true, sortOrder: 2 },
      { id: 'PM-3', code: 'CHQ', description: 'Cheque', treasuryAccountId: '10', isActive: true, sortOrder: 3 },
      { id: 'PM-4', code: 'MB', description: 'Multibanco', treasuryAccountId: '10', isActive: true, sortOrder: 4 },
      { id: 'PM-5', code: 'MBWAY', description: 'MB WAY', treasuryAccountId: '10', isActive: true, sortOrder: 5 },
      { id: 'PM-6', code: 'VISA', description: 'Cartão Visa/Mastercard', treasuryAccountId: '10', isActive: true, sortOrder: 6 },
      { id: 'PM-7', code: 'MPESA', description: 'M-Pesa', treasuryAccountId: '3', isActive: true, sortOrder: 7 }
    ];

    defaults.forEach(pm => {
      if (this.activeCompanyId) {
        (pm as any).companyId = this.activeCompanyId;
      }
      this.dataService.savePaymentMethod(pm).subscribe();
    });

    this.paymentMethods = defaults;
  }

  addPaymentMethod() {
    const newMethod = {
      id: `PM-${Date.now()}`,
      companyId: this.activeCompanyId || undefined,
      code: '',
      description: '',
      treasuryAccountId: '',
      isActive: true,
      sortOrder: this.paymentMethods.length + 1
    };
    this.paymentMethods.push(newMethod);
    this.editingPaymentMethod = { ...newMethod };
  }

  editPaymentMethod(method: any) {
    this.editingPaymentMethod = { ...method };
  }

  saveEditingPaymentMethod() {
    if (!this.editingPaymentMethod.code || !this.editingPaymentMethod.description || !this.editingPaymentMethod.treasuryAccountId) {
      alert('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    const index = this.paymentMethods.findIndex(pm => pm.id === this.editingPaymentMethod.id);
    if (index !== -1) {
      this.paymentMethods[index] = { ...this.editingPaymentMethod };
      this.dataService.savePaymentMethod(this.paymentMethods[index]).subscribe(() => {
        this.editingPaymentMethod = null;
      });
    }
  }

  cancelEditPaymentMethod() {
    if (!this.editingPaymentMethod.code && !this.editingPaymentMethod.description) {
      this.paymentMethods = this.paymentMethods.filter(pm => pm.id !== this.editingPaymentMethod.id);
    }
    this.editingPaymentMethod = null;
  }

  savePaymentMethodConfig() {
    this.paymentMethods.forEach(pm => {
      this.dataService.savePaymentMethod(pm).subscribe();
    });
  }

  getTreasuryAccountDisplay(accountId: string): string {
    const account = this.treasuryAccounts.find(acc => acc.id === accountId);
    return account ? `${account.code} - ${account.name}` : '';
  }

  // ADC Mode Methods
  onAdvanceModeChange() {
    if (this.isAdvanceMode) {
      // Clear pending documents when switching to advance mode
      this.pendingRows = [];
      this.totalSelected = 0;
      this.totalExcess = 0;
    } else {
      // Clear advance fields when switching back
      this.advanceAmount = 0;
      this.advancePaymentMethod = '';
      this.advanceObservations = '';
    }
  }

  getAdvanceTreasuryAccountDisplay(): string {
    if (!this.advancePaymentMethod) return '';
    const paymentMethod = this.paymentMethods.find(pm => pm.code === this.advancePaymentMethod);
    if (!paymentMethod) return '';
    return this.getTreasuryAccountDisplay(paymentMethod.treasuryAccountId);
  }

  onEntityTypeChange() {
    // Determine mapped category for backward compatibility and internal logic
    const type = this.allEntityTypes.find(t => t.code === this.entityTypeCode);
    if (type) {
      this.entityType = type.category;
    } else {
      this.entityType = 'OTHER';
    }

    // Reset Entity
    this.entityCode = '';
    this.entityName = '';
    this.pendingRows = [];
    this.totalSelected = 0;
    this.totalExcess = 0;

    // Reset sub-type if switching to employee
    if (this.entityTypeCode === 'FUNCIONARIO') {
      this.selectedEmployeeSubType = 'Funcionários';
    }

    this.loadDocumentTypes();
  }

  loadDocumentTypes() {
    this.dataService.getTreasuryDocuments().subscribe(docs => {
      const stored = localStorage.getItem('erp_treasury_document_types');
      let allTypes = [];

      if (stored) {
        allTypes = JSON.parse(stored);
      }

      // Sync/Add missing required types
      const requiredDefaults = [
        { id: '1', code: 'RE', description: 'Recebimento de Cliente', nature: 'RECEIVE', allowedEntities: { customer: true } },
        { id: '2', code: 'PAG', description: 'Pagamento a Fornecedor', nature: 'PAY', allowedEntities: { supplier: true } },
        { id: '3', code: 'PAGVEN', description: 'Pagamento de Vencimento', nature: 'PAY', allowedEntities: { employee: true } },
        { id: '4', code: 'PAGFUNC', description: 'Pagamento a Funcionário', nature: 'PAY', allowedEntities: { employee: true } },
        { id: '5', code: 'CHQ', description: 'Emissão de Cheque', nature: 'PAY', allowedEntities: { supplier: true, other: true } },
        { id: '6', code: 'DEP', description: 'Depósito Bancário', nature: 'RECEIVE', allowedEntities: { bank: true, other: true } }
      ];

      let changed = false;
      requiredDefaults.forEach(def => {
        const existingIndex = allTypes.findIndex((t: any) => t.code === def.code);
        if (existingIndex === -1) {
          allTypes.push(def);
          changed = true;
        } else {
          // Update flags if missing
          const existing = allTypes[existingIndex];
          if (!existing.allowedEntities) {
            existing.allowedEntities = def.allowedEntities;
            changed = true;
          } else if (JSON.stringify(existing.allowedEntities) !== JSON.stringify(def.allowedEntities)) {
            // Merge/Update entities for employee specifically if it's the target
            if (def.allowedEntities.employee && !existing.allowedEntities.employee) {
              existing.allowedEntities.employee = true;
              changed = true;
            }
          }
        }
      });

      if (changed || !stored) {
        localStorage.setItem('erp_treasury_document_types', JSON.stringify(allTypes));
      }

      const specificType = this.entityTypeCode; // CLIENTE, FORNECEDOR, FUNCIONARIO, SOCIO, etc.

      this.documentTypes = allTypes.filter((t: any) => {
        // Migration support: provide nature if missing
        if (!t.nature) t.nature = t.code.startsWith('RE') || t.code.startsWith('DEP') ? 'RECEIVE' : 'PAY';

        if (specificType === 'FUNCIONARIO') {
          return t.allowedEntities?.employee === true;
        }

        if (this.entityType === 'CUSTOMER') {
          return t.allowedEntities?.customer === true || t.nature === 'RECEIVE';
        }

        if (this.entityType === 'SUPPLIER') {
          return t.allowedEntities?.supplier === true || t.nature === 'PAY';
        }

        // Default 'OTHER' selection
        return t.allowedEntities?.other === true || (t.nature === 'PAY' && !t.allowedEntities?.customer);
      });

      // Default selection logic
      if (this.documentTypes.length > 0) {
        if (this.selectedDocType && this.documentTypes.some(t => t.code === this.selectedDocType)) {
          // Keep current selection
        } else {
          let defaultCode = '';
          if (specificType === 'FUNCIONARIO') defaultCode = 'PAGVEN';
          else if (this.entityType === 'CUSTOMER') defaultCode = 'RE';
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
    this.isSaving = true;
    const isReceipt = this.entityType === 'CUSTOMER';
    const observable = isReceipt ? this.dataService.getReceipts(this.activeCompanyId || undefined) : this.dataService.getPayments(this.activeCompanyId || undefined);

    observable.subscribe(docs => {
      const typeDocs = docs.filter((d: any) =>
        d.docType === this.selectedDocType &&
        d.series === this.selectedSeries
      );

      let nextNum = 1;
      if (typeDocs.length > 0) {
        const numbers = typeDocs.map((d: any) => Number(d.seriesNumber)).filter(n => !isNaN(n));
        nextNum = Math.max(0, ...numbers) + 1;
      }
      this.currentSeriesNumber = nextNum;
      this.ngZone.run(() => {
        this.updateDocNumberString();
        this.isSaving = false;
        this.cdr.detectChanges();
      });
    });
  }

  updateDocNumberString() {
    this.docNumberString = `${this.selectedDocType} ${this.selectedSeries}/${this.currentSeriesNumber}`;
    this.checkExistingDocument();
  }

  checkExistingDocument() {
    const isReceipt = this.entityType === 'CUSTOMER';
    const observable = isReceipt ? this.dataService.getReceipts(this.activeCompanyId || undefined) : this.dataService.getPayments(this.activeCompanyId || undefined);

    observable.subscribe(docs => {
      const doc = docs.find((d: any) =>
        d.docType === this.selectedDocType &&
        String(d.series) === String(this.selectedSeries) &&
        Number(d.seriesNumber) === Number(this.currentSeriesNumber)
      );

      this.ngZone.run(() => {
        if (doc) {
          this.loadExistingDocument(doc);
        } else if (this.isLocked) {
          this.isLocked = false;
          this.resetForm();
        }
      });
    });
  }

  loadExistingDocument(doc: any) {
    this.isLocked = true;
    this.entityCode = doc.entityCode || doc.customerCode || doc.beneficiaryCode || '';
    this.entityName = doc.entityName || doc.customerName || doc.beneficiaryName || '';
    this.docDate = new Date(doc.date).toISOString().split('T')[0];
    this.observations = doc.observations || '';
    this.selectedTreasuryAccount = doc.treasuryAccountId;
    this.paymentMethod = doc.paymentMethod || 'CASH';

    // Convert doc lines to pendingRows format
    this.pendingRows = (doc.lines || []).map((l: any) => ({
      selected: true,
      id: l.id,
      date: doc.date,
      docType: l.docType || (this.entityType === 'CUSTOMER' ? 'FC' : 'VFA'),
      docNumber: l.docNumber,
      total: l.amount,
      pending: 0,
      toPay: l.amount,
      currency: 'MZN',
      paymentMode: l.paymentMode || 'NUM',
      paymentCode: '',
      commercialEntity: this.entityName,
      dueDate: doc.date
    }));

    this.totalSelected = doc.amount;
    this.totalExcess = 0;
    this.cdr.detectChanges();
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
    const type = this.allEntityTypes.find(t => t.code === this.entityTypeCode);
    if (!type) return;

    if (type.category === 'CUSTOMER') {
      this.showCustomerModal = true;
    } else if (type.category === 'SUPPLIER') {
      this.showSupplierModal = true;
    } else {
      this.showOtherEntityModal = true;
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

    this.isSaving = true;

    if (this.entityType === 'CUSTOMER') {
      forkJoin({
        sales: this.dataService.getSalesDocuments(this.activeCompanyId || undefined),
        receipts: this.dataService.getReceipts(this.activeCompanyId || undefined)
      }).subscribe(({ sales, receipts }) => {
        const entityDocs = sales.filter((d: any) =>
          (d.customerName === this.entityName || d.customerId === this.entityCode) &&
          (d.status === 'CONFIRMED' || d.status === 'INVOICED' || d.status === 'POSTED' || d.status === 'DRAFT') &&
          d.documentType !== 'VD' // Exclude Cash Sales (Venda a Dinheiro) from pending receipts
        );
        this.ngZone.run(() => {
          this.processPendingDocuments(entityDocs, receipts);
          this.isSaving = false;
          this.cdr.detectChanges();
        });
      }, (err) => {
        console.error('Error fetching customer docs', err);
        this.ngZone.run(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
        });
      });
    } else if (this.entityType === 'SUPPLIER') {
      forkJoin({
        purchases: this.dataService.getPurchaseDocuments(this.activeCompanyId || undefined),
        payments: this.dataService.getPayments(this.activeCompanyId || undefined)
      }).subscribe(({ purchases, payments }) => {
        const entityDocs = purchases.filter((d: any) =>
          (d.supplierName === this.entityName || d.supplierCode === this.entityCode) &&
          (d.status === 'POSTED' || d.status === 'CONFIRMED' || d.status === 'DRAFT')
        );
        this.ngZone.run(() => {
          this.processPendingDocuments(entityDocs, payments);
          this.isSaving = false;
          this.cdr.detectChanges();
        });
      }, (err) => {
        console.error('Error fetching supplier docs', err);
        this.ngZone.run(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
        });
      });
    }
  }

  trackByFn(index: number, item: PendingDocRow) {
    return item.id; // unique id for the row
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
    this.isLocked = false;
    this.ngZone.run(() => {
      this.loadNextNumber();
      this.cdr.detectChanges();
    });
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
    const isReceipt = this.entityType === 'CUSTOMER';
    const typeLabel = isReceipt ? 'Recebimento' : 'Pagamento';

    // ADC Mode (Advance Payment)
    if (this.isAdvanceMode) {
      // Validate ADC fields
      if (!this.advanceAmount || this.advanceAmount <= 0) {
        alert('Por favor insira um valor válido para o adiantamento.');
        return;
      }

      if (!this.advancePaymentMethod) {
        alert('Por favor selecione o meio de pagamento.');
        return;
      }

      if (!this.entityCode || !this.entityName) {
        alert('Por favor selecione uma entidade.');
        return;
      }

      const total = this.advanceAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'MZN' });
      const confirmMsg = `Confirma o ${typeLabel} de Adiantamento ${this.docNumberString}?\n\nEntidade: ${this.entityName}\nValor: ${total}\nMeio: ${this.advancePaymentMethod}\n\nEsta operação é irreversível.`;

      if (confirm(confirmMsg)) {
        this.saveAdvancePayment(isReceipt);
      }
      return;
    }

    // Normal Mode (with pending documents)
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

    const docId = `${idPrefix}${Date.now()}`;
    const document: any = {
      id: docId,
      companyId: this.activeCompanyId || undefined,
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
      lines: selectedRows.map((r, index) => ({
        id: `${docId}-L${index + 1}`,
        docNumber: r.docNumber,
        amount: r.toPay,
        paymentMode: r.paymentMode
      }))
    };

    // Save via DataService
    this.isSaving = true;
    const saveObservable = isReceipt ? this.dataService.saveReceipt(document) : this.dataService.savePayment(document);

    saveObservable.subscribe({
      next: () => {
        this.ngZone.run(() => {
          // Create Accounting Entry
          this.createAccountingEntry(document, selectedRows, isReceipt);

          // Success feedback
          this.isSaving = false;
          alert(`${typeLabel} gravado com sucesso!`);
          this.resetForm();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Error saving document:', err);
          this.isSaving = false;
          alert(`Erro ao gravar ${typeLabel}. Verifique a consola para mais detalhes.`);
          this.cdr.detectChanges();
        });
      }
    });
  }

  createAccountingEntry(doc: any, rows: PendingDocRow[], isReceipt: boolean) {
    const entryId = `JE${Date.now()}`;
    const lines = [];

    // Group rows by payment method to create multiple treasury lines
    const paymentMethodGroups = new Map<string, { rows: PendingDocRow[], total: number, accountId: string, accountCode: string, accountName: string }>();

    rows.forEach(row => {
      const paymentMethodCode = row.paymentMode || 'NUM';
      const paymentMethod = this.paymentMethods.find(pm => pm.code === paymentMethodCode);

      // Get treasury account from payment method configuration
      const treasuryAccountId = paymentMethod?.treasuryAccountId || this.selectedTreasuryAccount || '3';
      const treasuryAccount = this.accountingService.getAccount(treasuryAccountId);
      const treasuryAccountCode = treasuryAccount?.code || '11.1.1';
      const treasuryAccountName = treasuryAccount?.name || 'Caixa';

      const key = treasuryAccountId; // Group by account ID

      if (!paymentMethodGroups.has(key)) {
        paymentMethodGroups.set(key, {
          rows: [],
          total: 0,
          accountId: treasuryAccountId,
          accountCode: treasuryAccountCode,
          accountName: treasuryAccountName
        });
      }

      const group = paymentMethodGroups.get(key)!;
      group.rows.push(row);
      group.total += row.toPay;
    });

    let lineIndex = 0;

    if (isReceipt) {
      // Debit: Treasury (one line per payment method/account)
      paymentMethodGroups.forEach((group, accountId) => {
        lines.push({
          id: `${entryId}-${lineIndex++}`,
          accountId: group.accountId,
          accountCode: group.accountCode,
          accountName: group.accountName,
          debit: group.total,
          credit: 0,
          description: `Recebimento ${doc.number} - ${group.accountName}`
        });
      });

      // Credit: Customer (one line per document)
      const customerAccountId = this.selectedEntity?.receivableAccountId || '17';
      const customerAccount = this.accountingService.getAccount(customerAccountId);

      rows.forEach((row) => {
        lines.push({
          id: `${entryId}-${lineIndex++}`,
          accountId: customerAccountId,
          accountCode: customerAccount?.code || '21.1.1',
          accountName: customerAccount?.name || 'Clientes',
          debit: 0,
          credit: row.toPay,
          description: `Liq. ${row.docNumber}`
        });
      });
    } else {
      // Debit: Supplier (one line per document)
      const supplierAccountId = this.selectedEntity?.payableAccountId || '49';
      const supplierAccount = this.accountingService.getAccount(supplierAccountId);

      rows.forEach((row) => {
        lines.push({
          id: `${entryId}-${lineIndex++}`,
          accountId: supplierAccountId,
          accountCode: supplierAccount?.code || '22.1',
          accountName: supplierAccount?.name || 'Fornecedores',
          debit: row.toPay,
          credit: 0,
          description: `Liq. ${row.docNumber}`
        });
      });

      // Credit: Treasury (one line per payment method/account)
      paymentMethodGroups.forEach((group, accountId) => {
        lines.push({
          id: `${entryId}-${lineIndex++}`,
          accountId: group.accountId,
          accountCode: group.accountCode,
          accountName: group.accountName,
          debit: 0,
          credit: group.total,
          description: `Pagamento ${doc.number} - ${group.accountName}`
        });
      });
    }

    // Determine Journal ID based on predominant account type
    let journalId = 'JNL-GEN';
    const firstGroup = Array.from(paymentMethodGroups.values())[0];
    if (firstGroup) {
      if (firstGroup.accountCode.startsWith('11')) journalId = 'JNL-CSH';
      else if (firstGroup.accountCode.startsWith('12')) journalId = 'JNL-BNK';
    }

    const entry: any = {
      id: entryId,
      companyId: doc.companyId,
      journalId: journalId,
      date: doc.date,
      description: `${isReceipt ? 'Recibo' : 'Pagamento'} ${doc.number} - ${this.entityName}`,
      reference: doc.number,
      sourceDocument: doc.number,
      sourceType: isReceipt ? 'RECEIPT' : 'PAYMENT',
      lines: lines.map(l => ({
        ...l,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0
      })),
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
