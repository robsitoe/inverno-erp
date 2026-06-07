import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';


import { CommonModule } from '@angular/common';


import { FormsModule } from '@angular/forms';


import { forkJoin } from 'rxjs';


import { AccountingService } from '../../shared/accounting.service';


import { AuditService } from '../../shared/audit.service';


import { PeriodService } from '../../shared/period.service';


import { DataService } from '../../services/data.service';


import { AuthService } from '../../services/auth.service';


import { EntityListModalComponent } from '../../shared/components/entity-list-modal.component';


import { SupplierListModalComponent } from '../../shared/components/supplier-list-modal.component';


import { DocumentTypeConfigModalComponent } from '../../shared/components/document-type-config-modal.component';


import { EntityTypeConfigModalComponent, EntityType } from '../../shared/components/entity-type-config-modal.component';


import { GenericEntityListModalComponent } from '../../shared/components/generic-entity-list-modal.component';


import { PrintSettingsModalComponent, PrintSettings } from '../../shared/components/print-settings-modal.component';


import { TreasuryDocumentPrintComponent } from './treasury-document-print.component';


import { WorkflowStatus, WorkflowHistory, TreasuryDocument, TreasuryDocumentLine } from '../../shared/models';





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


  imports: [CommonModule, FormsModule, EntityListModalComponent, SupplierListModalComponent, DocumentTypeConfigModalComponent, EntityTypeConfigModalComponent, GenericEntityListModalComponent, PrintSettingsModalComponent, TreasuryDocumentPrintComponent],


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


      <div class="flex flex-col h-full w-full no-print">


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


        <button (click)="confirmSave()" *ngIf="!isLocked && status === 'DRAFT'" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 disabled:opacity-50" [disabled]="isSaving">


          <span class="material-symbols-outlined text-[18px] text-blue-600" [class.spinner]="isSaving">{{ isSaving ? 'sync' : 'save' }}</span>


          <span>Confirmar</span>


        </button>





        <!-- Workflow Actions -->


        <ng-container *ngIf="currentDocId">


          <button (click)="onWorkflowAction('SUBMIT')" *ngIf="status === 'DRAFT' || status === 'REJECTED'" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">


            <span class="material-symbols-outlined text-[18px] text-orange-500">send</span>


            <span>Submeter</span>


          </button>


          <button (click)="onWorkflowAction('APPROVE')" *ngIf="status === 'SUBMITTED'" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">


            <span class="material-symbols-outlined text-[18px] text-green-600">how_to_reg</span>


            <span>Aprovar</span>


          </button>


          <button (click)="onWorkflowAction('REJECT')" *ngIf="status === 'SUBMITTED'" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">


            <span class="material-symbols-outlined text-[18px] text-red-600">block</span>


            <span>Rejeitar</span>


          </button>


          <button (click)="onWorkflowAction('POST')" *ngIf="status === 'APPROVED'" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">


            <span class="material-symbols-outlined text-[18px] text-purple-600">account_balance</span>


            <span>Lançar</span>


          </button>


        </ng-container>


        <button (click)="resetForm()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">


          <span class="material-symbols-outlined text-[18px] text-green-600">add_circle</span>


          <span>Novo</span>


        </button>


        <button (click)="openPrintSettings()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700">


          <span class="material-symbols-outlined text-[18px] text-blue-600">print</span>


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


                  <option *ngFor="let pm of activePaymentMethods" [value]="pm.code">{{ pm.description }}</option>


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


              {{ entityType === 'CUSTOMER' ? 'Débito: Tesouraria ? Crédito: Adiantamentos de Clientes (21.9)' : 'Débito: Adiantamentos a Fornecedores (22.9) ? Crédito: Tesouraria' }}


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


                <tr *ngFor="let row of pendingRows; trackBy: trackByFn" class="border-b border-gray-100 hover:bg-blue-50">


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


                  <td colspan="14" class="text-center py-8 text-gray-400 italic">


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


                          <th class="px-2 py-1 text-left w-40">Tipo</th>


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


                 Exemplo: Numerário ➔ Caixa (11.1.1), Transferência ➔ Banco (12.1.1)</p>


              </div>


           </div>


        </div>


      </div>











        <!-- Tab: Workflow/Estado (Histórico) -->


<div *ngIf="activeTab === 5" class="flex flex-col gap-2 p-3 h-full overflow-hidden">


    <div class="flex items-center gap-3 mb-2 bg-white p-2 border border-gray-200 rounded shadow-sm shrink-0 font-sans">


        <span class="font-bold text-gray-700 text-[11px] text-blue-600">Estado Atual:</span>


        <span class="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm"


            [class.bg-gray-100]="status === 'DRAFT'" [class.bg-blue-50]="status === 'SUBMITTED'"


            [class.bg-green-50]="status === 'APPROVED'" [class.bg-red-50]="status === 'REJECTED'"


            [class.bg-purple-50]="status === 'POSTED'" [class.text-gray-600]="status === 'DRAFT'"


            [class.text-blue-600]="status === 'SUBMITTED'" [class.text-green-600]="status === 'APPROVED'"


            [class.text-red-600]="status === 'REJECTED'" [class.text-purple-600]="status === 'POSTED'">{{ status


            }}</span>


    </div>





    <div class="flex-1 overflow-auto border border-gray-300 rounded shadow-sm bg-white">


        <table class="w-full text-[11px] font-sans">


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


                <tr *ngFor="let h of workflowHistory" class="hover:bg-gray-50 transition-colors">


                    <td class="px-3 py-2 whitespace-nowrap text-gray-600">{{ h.createdAt | date:'yyyy-MM-dd HH:mm' }}


                    </td>


                    <td class="px-3 py-2">


                        <span class="px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-500 text-[9px]">{{ h.fromStatus


                            }}</span>


                    </td>


                    <td class="px-3 py-2">


                        <span class="px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-600 text-[9px] font-medium">{{


                            h.toStatus }}</span>


                    </td>


                    <td class="px-3 py-2 font-medium text-gray-700">{{ h.userName }}</td>


                    <td class="px-3 py-2 italic text-gray-500 max-w-[250px] truncate">{{ h.notes || '-' }}</td>


                </tr>


                <tr *ngIf="workflowHistory.length === 0">


                    <td colspan="5" class="px-3 py-10 text-center text-gray-400 italic">


                        <span class="material-symbols-outlined text-4xl block mb-2 opacity-20">history</span>


                        Nenhum histórico de workflow registrado para este documento.


                    </td>


                </tr>


            </tbody>


        </table>


    </div>


</div>      <!-- Payment Mode Modal -->


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





      <!-- Employee Picker Modal (for FUNCIONARIO entity type) -->


      <div *ngIf="showEmployeeModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" (click)="showEmployeeModal = false">


        <div class="bg-white rounded-sm shadow-lg w-[750px] max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">


          <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">


            <h3 class="text-sm font-medium text-gray-700 flex items-center gap-2">


              <span class="material-symbols-outlined text-[18px]">badge</span>


              Selecionar Funcionário


            </h3>


            <button (click)="showEmployeeModal = false" class="text-gray-400 hover:text-gray-600">


              <span class="material-symbols-outlined text-lg">close</span>


            </button>


          </div>





          <div class="px-3 py-2 border-b border-gray-200 bg-white">


            <input type="text" [(ngModel)]="employeePickerSearch" (input)="filterEmployeePicker($event)"


              placeholder="Pesquisar funcionário..."


              class="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />


          </div>





          <div class="overflow-y-auto flex-1">


            <table class="w-full text-xs border-collapse">


              <thead class="bg-gray-50 text-gray-600 font-medium sticky top-0 border-b border-gray-200">


                <tr>


                  <th class="px-2 py-1 text-left w-20">Cód.</th>


                  <th class="px-2 py-1 text-left">Nome</th>


                  <th class="px-2 py-1 text-left w-32">Função</th>


                  <th class="px-2 py-1 text-left w-28">Departamento</th>


                  <th class="px-2 py-1 text-right w-28">Salário Base</th>


                </tr>


              </thead>


              <tbody>


                <tr *ngFor="let emp of filteredEmployeeList" (click)="onEmployeePickerSelect(emp)"


                  class="hover:bg-blue-50 cursor-pointer border-b border-gray-100 group">


                  <td class="px-2 py-1.5 font-medium text-blue-600">{{ emp.code }}</td>


                  <td class="px-2 py-1.5 font-medium text-gray-800">{{ emp.name }}</td>


                  <td class="px-2 py-1.5 text-gray-600">{{ emp.position || '-' }}</td>


                  <td class="px-2 py-1.5 text-gray-600">{{ emp.department || '-' }}</td>


                  <td class="px-2 py-1.5 text-right font-mono text-gray-700">{{ emp.baseSalary | number:'1.2-2' }}</td>


                </tr>


                <tr *ngIf="filteredEmployeeList.length === 0">


                  <td colspan="5" class="px-2 py-8 text-center text-gray-400 italic">


                    <span *ngIf="isLoadingEmployees">A carregar funcionários...</span>


                    <span *ngIf="!isLoadingEmployees">Nenhum funcionário encontrado.</span>


                  </td>


                </tr>


              </tbody>


            </table>


          </div>





          <div class="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between text-[10px] text-gray-500">


            <span>{{ filteredEmployeeList.length }} funcionário(s) encontrado(s)</span>


            <button (click)="showEmployeeModal = false" class="px-4 py-1 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50">Fechar</button>


          </div>


        </div>


      </div>





      <!-- Print Components -->


      <app-print-settings-modal


        [isOpen]="isPrintSettingsOpen"


        (closeEvent)="isPrintSettingsOpen = false"


        (confirmEvent)="onPrintConfirm($event)">


      </app-print-settings-modal>





      <app-treasury-document-print


        [document]="documentToPrint"


        [settings]="printSettings">


      </app-treasury-document-print>


    </div>


  `


})


export class TreasuryManagementComponent implements OnInit {


  tabs = ['Gerais', 'Dados Liquidação', 'Distribuição Automática', 'Restrições', 'Restrições das Atividades', 'Workflow/Estado'];


  activeTab = 0;





  // Print State


  isPrintSettingsOpen = false;


  documentToPrint: TreasuryDocument | null = null;


  printSettings: PrintSettings | null = null;





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


  entityNif = '';


  entityAddress = '';


  entityCity = '';


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


  status: WorkflowStatus = WorkflowStatus.DRAFT;


  workflowHistory: WorkflowHistory[] = [];


  currentDocId: string | null = null;





  // Grid


  pendingRows: PendingDocRow[] = [];


  totalSelected = 0;


  totalExcess = 0;





  // Liquidation Data


  selectedTreasuryAccount = '';


  paymentMethod = 'CASH';


  treasuryAccounts: any[] = [];





  isSaving = false;


  get isLocked(): boolean {


    return this.status === WorkflowStatus.APPROVED || this.status === WorkflowStatus.POSTED;


  }





  showCustomerModal = false;


  showSupplierModal = false;


  showOtherEntityModal = false;


  showEmployeeModal = false;  // dedicated employee picker from HR backend


  employeePickerSearch = '';


  employeeList: any[] = [];


  filteredEmployeeList: any[] = [];


  isLoadingEmployees = false;


  activeCompanyId: string | null = null;


  isConfigModalOpen = false;


  isEntityTypeConfigOpen = false;





  openEmployeePickerModal() {


    this.showEmployeeModal = true;


    this.employeePickerSearch = '';


    if (this.employeeList.length === 0) {


      this.loadEmployeeList();


    } else {


      this.filteredEmployeeList = [...this.employeeList];


    }


  }





  loadEmployeeList() {


    const cid = this.activeCompanyId || '';


    this.isLoadingEmployees = true;


    fetch(`http://192.168.88.25:3000/hr/employees?companyId=${cid}`, {


      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }


    })


      .then(r => r.json())


      .then(data => {


        this.employeeList = (data || []).filter((e: any) => e.status !== 'INACTIVE');


        this.filteredEmployeeList = [...this.employeeList];


        this.isLoadingEmployees = false;


        this.cdr.detectChanges();


      })


      .catch(err => {


        console.error('Error loading employees', err);


        this.isLoadingEmployees = false;


        this.cdr.detectChanges();


      });


  }





  filterEmployeePicker(event: Event) {


    const q = (event.target as HTMLInputElement).value.toLowerCase();


    this.filteredEmployeeList = q


      ? this.employeeList.filter(e =>


        e.name?.toLowerCase().includes(q) ||


        e.code?.toLowerCase().includes(q) ||


        e.nif?.toLowerCase().includes(q))


      : [...this.employeeList];


  }





  onEmployeePickerSelect(emp: any) {


    this.entityCode = emp.code || emp.id;


    this.entityName = emp.name;


    this.entityNif = emp.nif || '';


    this.entityAddress = emp.address || '';


    this.showEmployeeModal = false;


    this.loadPendingDocuments();


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


        user: this.authService.currentUserValue?.username || 'current_user',


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


        docType: r.docType,


        docNumber: r.docNumber,


        originalAmount: r.total,       // Total da FA original


        amount: r.toPay,               // Valor pago agora


        discount: r.discount || 0,     // Desconto aplicado


        pendingAfter: r.pending - r.toPay, // Valor pendente após este pagamento


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





          if (confirm('Deseja imprimir o comprovativo?')) {


            this.printDocument(document);


          }





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





  printDocument(doc: any) {


    this.documentToPrint = doc;


    this.isPrintSettingsOpen = true;


    this.cdr.detectChanges();


  }





  openPrintSettings() {


    if (!this.entityCode) {


      alert('Selecione uma entidade primeiro.');


      return;


    }





    // If we have a current doc, use it. Otherwise, generate preview from current form data.


    if (this.currentDocId) {


      // In a real scenario, we'd fetch the full doc. For now, we'll build it from state.


      this.documentToPrint = this.getCurrentDocument();


    } else {


      this.documentToPrint = this.getCurrentDocument();


    }





    this.isPrintSettingsOpen = true;


  }





  onPrintConfirm(settings: PrintSettings) {


    this.printSettings = settings;


    this.isPrintSettingsOpen = false;


    this.cdr.detectChanges();





    // The print component handles the actual window.print() via @media print


    // We just need to ensure it's rendered with the current document/settings


    setTimeout(() => {


      window.print();


    }, 100);


  }





  getCurrentDocument(): TreasuryDocument {


    const isReceipt = this.entityType === 'CUSTOMER';


    const type = isReceipt ? 'RECEIPT' : 'PAYMENT';





    const lines: TreasuryDocumentLine[] = this.isAdvanceMode ? [] : this.pendingRows


      .filter(r => r.selected && r.toPay > 0)


      .map((r, index) => ({


        id: `L${index + 1}`,


        docNumber: r.docNumber,


        amount: r.toPay,


        paymentMode: r.paymentMode


      }));





    return {


      id: this.currentDocId || `TEMP-${Date.now()}`,


      companyId: this.activeCompanyId || undefined,


      number: this.docNumberString || `${this.selectedDocType} ${this.selectedSeries}/${this.currentSeriesNumber}`,


      docType: this.selectedDocType,


      series: this.selectedSeries,


      seriesNumber: this.currentSeriesNumber,


      date: new Date(this.docDate),


      type: type as 'RECEIPT' | 'PAYMENT',


      amount: Number(this.isAdvanceMode ? this.advanceAmount : this.totalSelected) || 0,


      treasuryAccountId: this.selectedTreasuryAccount,


      entityCode: this.entityCode,


      entityName: this.entityName,


      entityNif: this.entityNif,


      entityAddress: this.entityAddress,


      entityCity: this.entityCity,


      customerCode: isReceipt ? this.entityCode : undefined,


      customerName: isReceipt ? this.entityName : undefined,


      beneficiaryCode: !isReceipt ? this.entityCode : undefined,


      beneficiaryName: !isReceipt ? this.entityName : undefined,


      paymentMethod: this.isAdvanceMode ? this.advancePaymentMethod : this.paymentMethod,


      description: `${isReceipt ? 'Recebimento' : 'Pagamento'} ${this.entityName}`,


      observations: this.isAdvanceMode ? this.advanceObservations : this.observations,


      status: this.status,


      lines: lines.map((l, i) => {


        const row = this.pendingRows.filter(d => d.selected)[i];


        return {


          ...l,


          docType: row?.docType || 'FA',


          originalAmount: row?.total || 0,


          discount: row?.discount || 0,


          pendingAfter: row ? row.pending - row.toPay : 0


        };


      })


    };


  }





  getTreasuryAccountDisplay(accountId: string): string {


    const account = this.treasuryAccounts.find(a => a.id === accountId);


    return account ? `${account.code} - ${account.name}` : 'N/A';


  }





  getAdvanceTreasuryAccountDisplay(): string {


    const pm = this.paymentMethods.find(p => p.code === this.advancePaymentMethod);


    const accountId = pm?.treasuryAccountId || this.selectedTreasuryAccount;


    return this.getTreasuryAccountDisplay(accountId);


  }





  // Payment Methods Configuration


  paymentMethods: any[] = [];


  editingPaymentMethod: any = null;





  // Simple Payment Categories for User-Friendly Configuration


  paymentCategories = [


    {


      id: 'CASH',


      name: 'Dinheiro em Caixa',


      icon: '💵',


      description: 'Pagamentos em dinheiro físico',


      accountCode: '11.1.1',


      accountName: 'Caixa'


    },


    {


      id: 'BANK',


      name: 'Banco',


      icon: '🏦',


      description: 'Transferências, cheques, cartões bancários',


      accountCode: '12.1.1',


      accountName: 'Depósitos à Ordem'


    },


    {


      id: 'MOBILE',


      name: 'Dinheiro Móvel',


      icon: '📱',


      description: 'M-Pesa, E-Mola, etc.',


      accountCode: '11.1.2',


      accountName: 'Caixa - Dinheiro Móvel'


    }


  ];





  // ADC (Advance Payment) Mode


  isAdvanceMode = false;


  advanceAmount = 0;


  advancePaymentMethod = '';


  advanceObservations = '';





  get activePaymentMethods() {


    return this.paymentMethods.filter(p => p.isActive);


  }





  // Get treasury account ID from category


  getTreasuryAccountFromCategory(categoryId: string): string {


    const category = this.paymentCategories.find(c => c.id === categoryId);


    if (!category) return '3'; // Default to Caixa





    // Find or create the account


    const account = this.treasuryAccounts.find(a => a.code === category.accountCode);


    if (account) return account.id;





    // If account doesn't exist, return a default based on category


    if (categoryId === 'CASH' || categoryId === 'MOBILE') return '3'; // Caixa


    if (categoryId === 'BANK') return '10'; // Banco


    return '3';


  }





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


    private authService: AuthService,


    private cdr: ChangeDetectorRef,


    private ngZone: NgZone


  ) { }





  ngOnInit() {


    this.ensureDefaultEntityTypes();


    this.loadActiveCompany();


    this.loadTreasuryAccounts();


    this.loadPaymentMethods();





    // Subscribe to account changes to ensure treasury accounts stay in sync


    this.accountingService.accountsChanged$.subscribe(() => {


      this.loadTreasuryAccounts();


      this.cdr.detectChanges();


    });





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


    this.dataService.activeCompany$.subscribe(info => {


      if (info) {


        this.activeCompanyId = info.id;


        // Only load dependent data if company is valid


        this.loadTreasuryAccounts();


        this.loadPaymentMethods();


        this.cancelEditPaymentMethod(); // Reset any edit state


        this.onEntityTypeChange();


      }


    });


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


      {


        id: 'PM-1',


        code: 'NUM',


        description: '?? Numerário (Dinheiro)',


        category: 'CASH',


        treasuryAccountId: this.getTreasuryAccountFromCategory('CASH'),


        isActive: true,


        sortOrder: 1


      },


      {


        id: 'PM-2',


        code: 'TRF',


        description: '?? Transferência Bancária',


        category: 'BANK',


        treasuryAccountId: this.getTreasuryAccountFromCategory('BANK'),


        isActive: true,


        sortOrder: 2


      },


      {


        id: 'PM-3',


        code: 'CHQ',


        description: '?? Cheque',


        category: 'BANK',


        treasuryAccountId: this.getTreasuryAccountFromCategory('BANK'),


        isActive: true,


        sortOrder: 3


      },


      {


        id: 'PM-4',


        code: 'MB',


        description: '?? Multibanco/TPA',


        category: 'BANK',


        treasuryAccountId: this.getTreasuryAccountFromCategory('BANK'),


        isActive: true,


        sortOrder: 4


      },


      {


        id: 'PM-5',


        code: 'MPESA',


        description: '📱 M-Pesa',


        category: 'MOBILE',


        treasuryAccountId: this.getTreasuryAccountFromCategory('MOBILE'),


        isActive: true,


        sortOrder: 5


      },


      {


        id: 'PM-6',


        code: 'EMOLA',


        description: '📱 E-Mola',


        category: 'MOBILE',


        treasuryAccountId: this.getTreasuryAccountFromCategory('MOBILE'),


        isActive: true,


        sortOrder: 6


      }


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


      category: 'CASH', // Default category


      treasuryAccountId: this.getTreasuryAccountFromCategory('CASH'),


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


    if (this.editingPaymentMethod) {


      if (!this.editingPaymentMethod.code && !this.editingPaymentMethod.description) {


        this.paymentMethods = this.paymentMethods.filter(pm => pm.id !== this.editingPaymentMethod.id);


      }


    }


    this.editingPaymentMethod = null;


  }





  savePaymentMethodConfig() {


    this.paymentMethods.forEach(pm => {


      this.dataService.savePaymentMethod(pm).subscribe();


    });


  }





  // Helper methods for category-based configuration


  getCategoryDisplay(categoryId: string): string {


    const category = this.paymentCategories.find(c => c.id === categoryId);


    return category ? `${category.icon} ${category.name}` : 'Não definido';


  }





  getTreasuryAccountCode(accountId: string): string {


    const account = this.treasuryAccounts.find(acc => acc.id === accountId);


    return account ? account.code : '';


  }





  onCategoryChange(paymentMethod: any) {


    // Automatically update treasury account when category changes


    if (paymentMethod && paymentMethod.category) {


      paymentMethod.treasuryAccountId = this.getTreasuryAccountFromCategory(paymentMethod.category);


    }


  }








  // ADC Mode Methods


  onAdvanceModeChange() {


    if (this.isAdvanceMode) {


      // Auto-select proper document type (ADC or ADF)


      const advanceType = this.entityType === 'CUSTOMER' ? 'ADC' : 'ADF';


      if (this.documentTypes.some(t => t.code === advanceType)) {


        this.selectedDocType = advanceType;


        this.onDocumentTypeChange(); // Load series/numbers


      }





      // Clear pending documents when switching to advance mode


      this.pendingRows = [];


      this.totalSelected = 0;


      this.totalExcess = 0;


    } else {


      // Revert to standard document type (RE or PAG)


      if (['ADC', 'ADF'].includes(this.selectedDocType)) {


        const standardType = this.entityType === 'CUSTOMER' ? 'RE' : 'PAG';


        if (this.documentTypes.some(t => t.code === standardType)) {


          this.selectedDocType = standardType;


          this.onDocumentTypeChange(); // Load series/numbers


        }


      }





      // Clear advance fields when switching back


      this.advanceAmount = 0;


      this.advancePaymentMethod = '';


      this.advanceObservations = '';


    }


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


    this.dataService.getDocumentTypes('TREASURY').subscribe(allTypes => {


      const specificType = this.entityTypeCode; // CLIENTE, FORNECEDOR, FUNCIONARIO, SOCIO, etc.





      this.documentTypes = allTypes.filter((t: any) => {


        // Migration support: provide nature if missing


        if (!t.nature) t.nature = t.code.startsWith('RE') || t.code.startsWith('DEP') ? 'RECEIVE' : 'PAY';





        if (specificType === 'FUNCIONARIO') {


          // For employees: show salary payments and employee advances


          return t.allowedEntities?.employee === true


            || t.code === 'PAGVEN'  // Pagamento de Vencimentos


            || t.code === 'ADE'     // Adiantamento a Funcionário


            || t.code === 'ADF';    // Generic Advance (fallback)


        }





        if (this.entityType === 'CUSTOMER') {


          return t.allowedEntities?.customer === true || t.nature === 'RECEIVE';


        }





        if (this.entityType === 'SUPPLIER') {


          // Explicitly exclude employee-only docs for suppliers


          if (t.code === 'PAGVEN') return false;


          return t.allowedEntities?.supplier === true || (t.nature === 'PAY' && t.code !== 'PAGVEN');


        }





        // Default 'OTHER' (Sócio, Estado, Credor, etc.)


        return t.allowedEntities?.other === true || t.nature === 'INTERNAL' || (t.nature === 'PAY' && t.code !== 'PAGVEN');


      });





      // Default selection logic


      if (this.documentTypes.length > 0) {


        if (this.selectedDocType && this.documentTypes.some(t => t.code === this.selectedDocType)) {


          // Keep current selection if valid for new entity type


        } else {


          let defaultCode = '';


          if (specificType === 'FUNCIONARIO') defaultCode = 'PAGVEN';


          else if (this.entityType === 'CUSTOMER') defaultCode = 'RE';


          else if (this.entityType === 'SUPPLIER') defaultCode = 'PAG';


          else defaultCode = 'PAG'; // OTHER default





          const def = this.documentTypes.find(t => t.code === defaultCode)


            || this.documentTypes.find(t => t.nature === 'PAY')


            || this.documentTypes[0];


          this.selectedDocType = def ? def.code : this.documentTypes[0].code;


        }


        this.onDocumentTypeChange();


      } else {


        // Fallback: if no types after filter, load ALL and pick appropriate nature


        this.documentTypes = allTypes.filter((t: any) =>


          (this.entityType === 'CUSTOMER' ? t.nature === 'RECEIVE' : t.nature === 'PAY') || !t.nature


        );


        this.selectedDocType = this.documentTypes[0]?.code || '';


        this.onDocumentTypeChange();


      }


    });


  }





  onDocumentTypeChange() {


    // Sync Checkbox State based on Document Type


    const isAdvanceDoc = ['ADC', 'ADF'].includes(this.selectedDocType);


    if (this.isAdvanceMode !== isAdvanceDoc) {


      this.isAdvanceMode = isAdvanceDoc;


      if (this.isAdvanceMode) {


        this.pendingRows = [];


        this.totalSelected = 0;


        this.totalExcess = 0;


      } else {


        this.advanceAmount = 0;


        this.advancePaymentMethod = '';


        this.advanceObservations = '';


      }


    }


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


        } else if (this.currentDocId) {


          this.resetForm();


        }


      });


    });


  }





  loadExistingDocument(doc: any) {


    this.currentDocId = doc.id;


    this.status = doc.status || WorkflowStatus.DRAFT;


    this.loadWorkflowHistory();


    this.entityCode = doc.entityCode || doc.customerCode || doc.beneficiaryCode || '';


    this.entityName = doc.entityName || doc.customerName || doc.beneficiaryName || '';


    this.docDate = new Date(doc.date).toISOString().split('T')[0];


    this.observations = doc.observations || '';


    this.selectedTreasuryAccount = doc.treasuryAccountId;


    this.paymentMethod = doc.paymentMethod || 'CASH';





    // Handle Advance Mode Detection


    this.isAdvanceMode = doc.isAdvance === true || ['ADC', 'ADF'].includes(doc.docType);





    if (this.isAdvanceMode) {


      this.advanceAmount = Number(doc.amount) || 0;


      this.advancePaymentMethod = doc.paymentMethod;


      this.advanceObservations = doc.observations || '';


      this.pendingRows = [];


    } else {


      // Convert doc lines to pendingRows format


      this.pendingRows = (doc.lines || []).map((l: any) => ({


        selected: true,


        id: l.id,


        date: doc.date,


        docType: l.docType || (this.entityType === 'CUSTOMER' ? 'FA' : 'FC'),


        docNumber: l.docNumber,


        total: Number(l.amount) || 0,


        pending: 0,


        toPay: Number(l.amount) || 0,


        currency: 'MZN',


        paymentMode: l.paymentMode || 'NUM',


        paymentCode: '',


        commercialEntity: this.entityName,


        dueDate: doc.date


      }));


    }





    this.totalSelected = Number(doc.amount) || 0;


    this.totalExcess = 0;


    this.cdr.detectChanges();


  }





  getDocDescription(code: string): string {


    const doc = this.documentTypes.find(t => t.code === code);


    return doc ? doc.description : '';


  }





  loadTreasuryAccounts() {


    console.log('[Treasury] Loading accounts for fallback/selection...');


    const accounts = this.accountingService.getAccounts();





    // Se estiver vazio, tenta forçar um load no serviço caso tenha empresa ativa


    if (accounts.length === 0 && this.activeCompanyId) {


      this.accountingService.loadAccounts();


    }





    this.treasuryAccounts = accounts


      .filter(a => a.allowPosting && (a.code.startsWith('11') || a.code.startsWith('12') || a.code.startsWith('1.1') || a.code.startsWith('1.2')));





    console.log(`[Treasury] Found ${this.treasuryAccounts.length} candidate accounts.`);





    // Só define padrão se não houver seleção ou se a seleção atual não existir na lista nova


    if (this.treasuryAccounts.length > 0) {


      const selectionExists = this.treasuryAccounts.some(a => a.id === this.selectedTreasuryAccount);


      if (!this.selectedTreasuryAccount || !selectionExists) {


        this.selectedTreasuryAccount = this.treasuryAccounts[0].id;


      }


    }


  }





  openEntityModal() {


    const type = this.allEntityTypes.find(t => t.code === this.entityTypeCode);


    if (!type) return;





    if (type.category === 'CUSTOMER') {


      this.showCustomerModal = true;


    } else if (type.category === 'SUPPLIER') {


      this.showSupplierModal = true;


    } else if (this.entityTypeCode === 'FUNCIONARIO') {


      this.openEmployeePickerModal();


    } else {


      this.showOtherEntityModal = true;


    }


  }





  selectedEntity: any = null;





  onEntitySelect(entity: any) {


    this.selectedEntity = entity;


    this.entityCode = entity.code;


    this.entityName = entity.name;


    this.entityNif = entity.nif || '';


    this.entityAddress = entity.address || '';


    this.entityCity = entity.city || '';


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


          (d.status === 'APPROVED' || d.status === 'POSTED' || d.status === 'SUBMITTED' || d.status === 'DRAFT') &&


          d.documentType !== 'VD'


        );


        this.ngZone.run(() => {


          this.processPendingDocuments(entityDocs, receipts);


          this.isSaving = false;


          this.cdr.detectChanges();


        });


      }, (err) => {


        console.error('Error fetching customer docs', err);


        this.ngZone.run(() => { this.isSaving = false; this.cdr.detectChanges(); });


      });


    } else if (this.entityType === 'SUPPLIER') {


      forkJoin({


        purchases: this.dataService.getPurchaseDocuments(this.activeCompanyId || undefined),


        payments: this.dataService.getPayments(this.activeCompanyId || undefined)


      }).subscribe(({ purchases, payments }) => {


        const entityDocs = purchases.filter((d: any) =>


          (d.supplierName === this.entityName || d.supplierCode === this.entityCode) &&


          (d.status === 'APPROVED' || d.status === 'POSTED' || d.status === 'SUBMITTED' || d.status === 'DRAFT')


        );


        this.ngZone.run(() => {


          this.processPendingDocuments(entityDocs, payments);


          this.isSaving = false;


          this.cdr.detectChanges();


        });


      }, (err) => {


        console.error('Error fetching supplier docs', err);


        this.ngZone.run(() => { this.isSaving = false; this.cdr.detectChanges(); });


      });


    } else {


      // OTHER entities (Funcionário, Sócio, Estado, Credor, etc.)


      if (this.entityTypeCode === 'FUNCIONARIO') {


        // Load payroll records (processed salaries not yet paid)


        const cid = this.activeCompanyId || '';


        fetch(`http://192.168.88.25:3000/hr/payroll?companyId=${cid}&employeeId=${this.entityCode}`, {


          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }


        })


          .then(r => r.json())


          .then((payrolls: any[]) => {


            this.dataService.getPayments(cid || undefined).subscribe(payments => {


              // Show only DRAFT or APPROVED payrolls (not yet paid via treasury)


              const pending = (payrolls || []).filter((p: any) =>


                p.status === 'DRAFT' || p.status === 'APPROVED' || p.status === 'POSTED'


              );


              const rows = pending.map((p: any) => {


                const ref = `PAGVEN ${p.year}/${String(p.month).padStart(2, '0')}`;


                const alreadyPaid = (payments || []).filter((pay: any) =>


                  pay.relatedDocument === ref || pay.entityCode === this.entityCode


                ).reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);


                const net = Number(p.netSalary || 0);


                const pending = Math.max(0, net - alreadyPaid);


                if (pending < 0.01) return null;


                return {


                  selected: false,


                  id: p.id,


                  date: `${p.year}-${String(p.month).padStart(2, '0')}-01`,


                  dueDate: `${p.year}-${String(p.month).padStart(2, '0')}-28`,


                  currency: 'MT',


                  docType: 'PAGVEN',


                  docNumber: ref,


                  total: net,


                  pending: pending,


                  toPay: 0,


                  discount: 0,


                  paymentMode: 'NUM',


                  paymentCode: '1',


                  commercialEntity: this.entityCode,


                  originalDoc: p


                };


              }).filter((r: any) => r !== null);


              this.ngZone.run(() => {


                this.pendingRows = rows;


                this.calculateTotals();


                this.isSaving = false;


                this.cdr.detectChanges();


              });


            });


          })


          .catch(err => {


            console.error('Error fetching payroll for employee', err);


            this.ngZone.run(() => { this.isSaving = false; this.cdr.detectChanges(); });


          });


      } else {


        // Generic OTHER: no specific pending docs — use advance/payment mode


        this.pendingRows = [];


        this.totalSelected = 0;


        this.totalExcess = 0;


        // Auto-suggest advance mode for generic others


        if (!this.isAdvanceMode) {


          this.isAdvanceMode = true;


          this.onAdvanceModeChange();


        }


        this.isSaving = false;


        this.cdr.detectChanges();


      }


    }


  }





  trackByFn(index: number, item: PendingDocRow) {


    return item.id; // unique id for the row


  }





  processPendingDocuments(entityDocs: any[], existingPayments: any[]) {


    this.pendingRows = entityDocs.map((doc: any) => {


      // Calculate already paid amount


      const rawDocType = doc.documentType || doc.type || (this.entityType === 'CUSTOMER' ? 'FA' : 'FC');


      const docNum = doc.documentNumber || `${rawDocType} ${doc.series}/${doc.number}`;





      const relatedDocs = existingPayments.filter((p: any) => p.relatedDocument === docNum);


      const paidAmount = relatedDocs.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);





      // Fix: Use totalValue for Purchase Docs if total is missing


      const docTotal = doc.total || doc.totalValue || 0;


      const pending = docTotal - paidAmount;





      if (pending <= 0.01) return null;





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


    this.pendingRows = [];


    this.totalSelected = 0;


    this.totalExcess = 0;


    this.observations = '';


    this.currentDocId = null;


    this.status = WorkflowStatus.DRAFT;


    this.workflowHistory = [];


    this.ngZone.run(() => {


      this.loadNextNumber();


      this.cdr.detectChanges();


    });


  }





  loadWorkflowHistory() {


    if (!this.currentDocId) return;


    this.dataService.getWorkflowHistory('treasury', this.currentDocId).subscribe(history => {


      this.workflowHistory = history;


      this.cdr.detectChanges();


    });


  }





  onWorkflowAction(action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST') {


    if (!this.currentDocId) {


      alert('Grave o documento antes de processar o workflow.');


      return;


    }





    const notes = prompt('Notas/Justificação (Opcional):');


    if (notes === null) return;





    this.dataService.processWorkflow('treasury', this.currentDocId, action, notes).subscribe({


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


      // Use '18' (21.1.2 - Clientes a Crédito) as default for receipts to match Credit Sales and Statement


      const customerAccountId = this.selectedEntity?.receivableAccountId || this.accountingService.getAccounts().find(a => a.code === '4.1.1')?.id || '';


      const customerAccount = this.accountingService.getAccount(customerAccountId);





      rows.forEach((row) => {


        lines.push({


          id: `${entryId}-${lineIndex++}`,


          accountId: customerAccountId,


          accountCode: customerAccount?.code || '4.1.1',


          accountName: customerAccount?.name || 'Clientes a Crédito',


          debit: 0,


          credit: row.toPay,


          description: `Liq. ${row.docNumber}`


        });


      });


    } else {


      // Debit: Supplier (one line per document)


      const supplierAccountId = this.selectedEntity?.payableAccountId || this.accountingService.getAccounts().find(a => a.code === '4.2.1')?.id || '';


      const supplierAccount = this.accountingService.getAccount(supplierAccountId);





      rows.forEach((row) => {


        lines.push({


          id: `${entryId}-${lineIndex++}`,


          accountId: supplierAccountId,


          accountCode: supplierAccount?.code || '4.2.1',


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


      if (firstGroup.accountCode.startsWith('11') || firstGroup.accountCode.startsWith('1.1')) journalId = 'JNL-CSH';


      else if (firstGroup.accountCode.startsWith('12') || firstGroup.accountCode.startsWith('1.2')) journalId = 'JNL-BNK';


    }





    const entry: any = {


      id: entryId,


      companyId: doc.companyId,


      journalId: journalId,


      date: doc.date,


      description: `${isReceipt ? 'Recibo' : 'Pagamento'} ${doc.number} - ${this.entityName} (${this.entityCode || ''})`,


      reference: doc.number,


      sourceDocument: doc.id || doc.number,


      sourceType: isReceipt ? 'RECEIPT' : 'PAYMENT',


      lines: lines.map(l => ({


        ...l,


        debit: Number(l.debit) || 0,


        credit: Number(l.credit) || 0


      })),


      status: 'POSTED',


      createdBy: this.authService.currentUserValue?.username || 'Sistema',


      createdAt: new Date()


    };





    this.accountingService.createJournalEntry(entry);


  }





  saveAdvancePayment(isReceipt: boolean) {


    const idPrefix = isReceipt ? 'REC' : 'PAY';


    const type = isReceipt ? 'RECEIPT' : 'PAYMENT';


    const typeLabel = isReceipt ? 'Recebimento' : 'Pagamento';





    // Validate Period Closure


    if (!this.periodService.isPeriodOpen(this.docDate)) {


      alert('O período para esta data está fechado. Não é possível gravar documentos nesta data.');


      return;


    }





    // Get treasury account from payment method


    const paymentMethod = this.paymentMethods.find(pm => pm.code === this.advancePaymentMethod);


    const treasuryAccountId = paymentMethod?.treasuryAccountId || this.selectedTreasuryAccount || '3';





    // Validate Treasury Balance for Payments


    if (!isReceipt) {


      const amountChange = -this.advanceAmount;


      const balanceCheck = this.accountingService.checkBalanceFeasibility(treasuryAccountId, this.docDate, amountChange);





      if (!balanceCheck.valid) {


        const confirmMsg = `Atenção: Este movimento retroativo fará com que o saldo da conta de tesouraria fique negativo em ${balanceCheck.dateOfMinBalance?.toLocaleDateString()}.\n\nSaldo Mínimo Projetado: ${balanceCheck.minBalance.toLocaleString('pt-PT', { style: 'currency', currency: 'MZN' })}\n\nDeseja continuar mesmo assim?`;





        if (!confirm(confirmMsg)) {


          return;


        }





        // Log exception if confirmed


        this.auditService.logException({


          user: this.authService.currentUserValue?.username || 'Sistema',


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


      amount: this.advanceAmount,


      treasuryAccountId: treasuryAccountId,


      entityCode: this.entityCode,


      entityName: this.entityName,


      customerCode: isReceipt ? this.entityCode : undefined,


      customerName: isReceipt ? this.entityName : undefined,


      beneficiaryCode: !isReceipt ? this.entityCode : undefined,


      beneficiaryName: !isReceipt ? this.entityName : undefined,


      paymentMethod: this.advancePaymentMethod,


      description: `${isReceipt ? 'Adiantamento de' : 'Adiantamento a'} ${this.entityName}`,


      observations: this.advanceObservations,


      isAdvance: true,


      lines: []


    };





    // Save via DataService


    this.isSaving = true;


    const saveObservable = isReceipt ? this.dataService.saveReceipt(document) : this.dataService.savePayment(document);





    saveObservable.subscribe({


      next: () => {


        this.ngZone.run(() => {


          // Create Accounting Entry for Advance


          this.createAdvanceAccountingEntry(document, isReceipt, treasuryAccountId);





          // Success feedback


          this.isSaving = false;


          alert(`${typeLabel} de Adiantamento gravado com sucesso!`);


          this.resetForm();


          this.cdr.detectChanges();


        });


      },


      error: (err) => {


        this.ngZone.run(() => {


          console.error('Error saving advance payment:', err);


          this.isSaving = false;


          alert(`Erro ao gravar ${typeLabel} de Adiantamento. Verifique a consola para mais detalhes.`);


          this.cdr.detectChanges();


        });


      }


    });


  }





  createAdvanceAccountingEntry(doc: any, isReceipt: boolean, treasuryAccountId: string) {


    const entryId = `JE${Date.now()}`;


    const lines = [];





    // Get treasury account


    const treasuryAccount = this.accountingService.getAccount(treasuryAccountId);


    const treasuryAccountCode = treasuryAccount?.code || '11.1.1';


    const treasuryAccountName = treasuryAccount?.name || 'Caixa';





    // Determine advance account based on entity type


    // Customer Advances: 21.9 (Adiantamentos de Clientes)


    // Supplier Advances: 22.9 (Adiantamentos a Fornecedores)


    const targetCode = isReceipt ? '4.1.9' : '4.2.9';


    const fallbackName = isReceipt ? 'Adiantamentos de Clientes' : 'Adiantamentos a Fornecedores';





    // Find or use default advance account


    const allAccounts = this.accountingService.getAccounts();


    const advanceAccount = allAccounts.find(a => a.code === targetCode || a.code.startsWith(targetCode));


    const advanceAccountId = advanceAccount?.id || targetCode;


    const advanceAccountCode = advanceAccount?.code || targetCode;


    const advanceAccountName = advanceAccount?.name || fallbackName;





    if (isReceipt) {


      // Customer Advance Receipt


      // Debit: Treasury


      lines.push({


        id: `${entryId}-1`,


        accountId: treasuryAccountId,


        accountCode: treasuryAccountCode,


        accountName: treasuryAccountName,


        debit: doc.amount,


        credit: 0,


        description: `Adiantamento ${doc.number} - ${treasuryAccountName}`


      });





      // Credit: Customer Advances (21.9)


      lines.push({


        id: `${entryId}-2`,


        accountId: advanceAccountId,


        accountCode: advanceAccountCode,


        accountName: advanceAccountName,


        debit: 0,


        credit: doc.amount,


        description: `Adiantamento de ${this.entityName}`


      });


    } else {


      // Supplier Advance Payment


      // Debit: Supplier Advances (22.9)


      lines.push({


        id: `${entryId}-1`,


        accountId: advanceAccountId,


        accountCode: advanceAccountCode,


        accountName: advanceAccountName,


        debit: doc.amount,


        credit: 0,


        description: `Adiantamento a ${this.entityName}`


      });


      // Credit: Treasury


      lines.push({


        id: `${entryId}-2`,


        accountId: treasuryAccountId,


        accountCode: treasuryAccountCode,


        accountName: treasuryAccountName,


        debit: 0,


        credit: doc.amount,


        description: `Adiantamento ${doc.number} - ${treasuryAccountName}`


      });


    }





    // Determine Journal ID based on treasury account type


    let journalId = 'JNL-GEN';


    if (treasuryAccountCode.startsWith('11') || treasuryAccountCode.startsWith('1.1')) journalId = 'JNL-CSH';


    else if (treasuryAccountCode.startsWith('12') || treasuryAccountCode.startsWith('1.2')) journalId = 'JNL-BNK';





    const entry: any = {


      id: entryId,


      companyId: doc.companyId,


      journalId: journalId,


      date: doc.date,


      description: `Adiantamento ${doc.number} - ${this.entityName} (${this.entityCode || ''})`,


      reference: doc.number,


      sourceDocument: doc.id || doc.number,


      sourceType: isReceipt ? 'RECEIPT' : 'PAYMENT',


      lines: lines.map(l => ({


        ...l,


        debit: Number(l.debit) || 0,


        credit: Number(l.credit) || 0


      })),


      status: 'POSTED',


      createdBy: this.authService.currentUserValue?.username || 'Sistema',


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


