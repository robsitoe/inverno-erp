import { Component, OnInit, ChangeDetectorRef, OnDestroy, Input } from '@angular/core';


import { CommonModule } from '@angular/common';


import { FormsModule } from '@angular/forms';


import { GasService, GasCylinderType, GasDailyEntry } from '../../services/gas.service';


import { DataService } from '../../services/data.service';


import { ToasterService } from '../../services/toaster.service';


import { AppIconComponent } from '../../shared/components/app-icon.component';


import { Subscription } from 'rxjs';


import { AuthService } from '../../services/auth.service';


import { CustomerService } from '../../shared/customer.service';


import { SupplierService } from '../../shared/supplier.service';


import { Customer, Supplier } from '../../shared/models';


import { QuickEntityModalComponent } from '../../shared/components/quick-entity-modal.component';
import { GasControlReportPrintComponent } from './gas-control-report-print.component';

@Component({
   selector: 'app-gas-control',
   standalone: true,
   imports: [CommonModule, FormsModule, AppIconComponent, QuickEntityModalComponent, GasControlReportPrintComponent],


   template: `


    <style>


      .print-only { display: none; }
      @media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        
        @page { size: landscape; margin: 10mm; }
        body { background: white !important; margin: 0 !important; }
      }


      .highlight-entity {


        animation: highlight-fade 3s ease-out forwards;


      }


      @keyframes highlight-fade {
        0% { background-color: #fef08a; }
        100% { background-color: transparent; }
      }

      .inventory-sheet-table { border-collapse: collapse; border: 1px solid black; text-align: center; text-transform: uppercase; }
      .inventory-sheet-table th, .inventory-sheet-table td { border: 1px solid black; padding: 1px 3px; line-height: 1.1; }
      .inventory-sheet-table thead th { font-weight: 800; font-size: 7px; }
      .inventory-sheet-table tbody td { font-size: 8px; }
      .bg-header-grey { background-color: #D9D9D9; }
      .bg-dark-header { background-color: #31353D; color: white; }
      .bg-total-orange { background-color: #ED7D31; color: white; }
      .bg-dark-red { background-color: #C00000; color: white; }
      .divider-row td { border-bottom: 2px solid black; }
      .entities-body td { height: 14px; }


    </style>


    <div class="h-full flex flex-col bg-[#E5E7EB] font-sans text-gray-800 overflow-hidden main-container">


      <!-- Interaction Blanket for NOT_STRTED -->


      <div *ngIf="!control || control?.status === 'NOT_STRTED'" class="fixed inset-0 z-[150] bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-500 no-print">


         <div class="bg-white p-10 rounded-3xl shadow-2xl border border-blue-200 text-center max-w-md space-y-6 transform animate-in zoom-in-95 duration-300">


            <div class="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">


               <app-icon name="lock" [size]="40"></app-icon>


            </div>


            <h2 class="text-2xl font-black text-gray-800 uppercase tracking-tight">Dia Bloqueado</h2>


            <p class="text-sm font-medium text-gray-500 leading-relaxed">Este dia ainda não foi iniciado. Para começar a registar movimentos de stock e vendas, é necessário realizar a Abertura formal.</p>


            <button (click)="openDay()" class="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3">


               <app-icon name="play_arrow" [size]="24"></app-icon> Realizar Abertura agora


            </button>


            <div class="pt-4 border-t border-gray-100">


               <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operador: {{ authService.currentUserValue?.username || 'admin' }}</span>


            </div>
         </div>
      </div>


      <!-- Toolbar -->


      <div class="bg-white border-b border-gray-300 px-4 py-2 flex items-center justify-between shadow-sm shrink-0 no-print">


        <div class="flex items-center gap-4">


           <div class="flex items-center gap-2">


             <div class="p-1.5 bg-blue-600 rounded text-white italic font-black text-sm tracking-tighter shadow-inner">GESt-GS</div>
              <div class="flex flex-col">
                 <h1 class="text-xs font-black text-gray-600 uppercase tracking-widest leading-none">
                    {{ activeTab === 'MOVEMENT' ? 'Movimento Geral Diário' : (activeTab === 'INVENTORY' ? 'Mapa de Inventário Global' : 'Relatórios e Estatísticas') }}
                 </h1>
                 <span class="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">Gestão de Armazém e Caixa</span>
              </div>

              <div *ngIf="control" class="ml-4 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm">
                 <span [class]="control?.status === 'OPENED' ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100' : (control?.status === 'CLOSED' ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100' : 'text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100')">
                    {{ control?.status === 'OPENED' ? '● Aberto' : (control?.status === 'CLOSED' ? '● Fechado' : '○ Não Iniciado') }}
                 </span>
              </div>
           </div>

           <div class="h-6 w-px bg-gray-300"></div>

           <div class="flex items-center bg-white/50 backdrop-blur-sm p-1 rounded-xl shadow-inner no-print border border-gray-200">
              <button (click)="activeTab = 'MOVEMENT'" [class]="activeTab === 'MOVEMENT' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:text-blue-600 hover:bg-white/80'" class="px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all transform duration-200 flex items-center gap-1.5">
                 <app-icon name="list_alt" [size]="14"></app-icon> Diário
              </button>
              <button (click)="activeTab = 'INVENTORY'" [class]="activeTab === 'INVENTORY' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:text-blue-600 hover:bg-white/80'" class="px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all transform duration-200 flex items-center gap-1.5 border-x border-gray-100">
                 <app-icon name="grid_view" [size]="14"></app-icon> Inventário
              </button>
              <button (click)="activeTab = 'STATS'; loadStatistics()" [class]="activeTab === 'STATS' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:text-blue-600 hover:bg-white/80'" class="px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all transform duration-200 flex items-center gap-1.5">
                 <app-icon name="trending_up" [size]="14"></app-icon> Estatísticas
              </button>
           </div>

           <div class="h-6 w-px bg-gray-300"></div>


           <div class="flex items-center bg-gray-50 border border-gray-300 rounded overflow-hidden">


             <button (click)="changeDate(-1)" class="p-1 hover:bg-gray-200 transition-colors border-r border-gray-300"><app-icon name="chevron_left" [size]="18"></app-icon></button>


             <input type="date" [(ngModel)]="selectedDate" (change)="loadData()" class="bg-transparent border-none text-[11px] font-black px-3 py-1 focus:ring-0">


             <button (click)="changeDate(1)" class="p-1 hover:bg-gray-200 transition-colors border-l border-gray-300"><app-icon name="chevron_right" [size]="18"></app-icon></button>


            </div>
         </div>


        <div class="flex items-center gap-3">


           <div *ngIf="isLoading" class="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded border border-amber-200">


             <div class="animate-spin rounded-full h-3 w-3 border-2 border-amber-500 border-t-transparent"></div>


             <span class="text-[10px] font-bold text-amber-700 animate-pulse"> PROCESSANDO...</span>


           </div>


           <button (click)="printReport('pdf')" class="flex items-center gap-2 px-5 py-1.5 bg-gray-800 text-white rounded font-black text-xs hover:bg-black transition-all shadow-md active:scale-95 uppercase tracking-wider">


             <app-icon name="picture_as_pdf" [size]="16" class="text-blue-400"></app-icon> Relatório PDF


           </button>


           <div class="h-6 w-px bg-gray-300"></div>

           <button (click)="saveStocks()" class="flex items-center gap-2 px-5 py-1.5 bg-emerald-600 text-white rounded font-black text-xs hover:bg-emerald-700 transition-all shadow-md active:scale-95 uppercase tracking-wider">
             <app-icon name="save" [size]="16"></app-icon> Gravar Tudo
           </button>

           <button *ngIf="control?.status === 'OPENED'" (click)="closeDay()" class="flex items-center gap-2 px-5 py-1.5 bg-rose-600 text-white rounded font-black text-xs hover:bg-rose-700 transition-all shadow-md active:scale-95 uppercase tracking-wider">
             <app-icon name="lock" [size]="16"></app-icon> Fechar Dia
           </button>

           <button *ngIf="control?.status === 'CLOSED'" (click)="reopenDay()" class="flex items-center gap-2 px-5 py-1.5 bg-amber-500 text-white rounded font-black text-xs hover:bg-amber-600 transition-all shadow-md active:scale-95 uppercase tracking-wider">
             <app-icon name="edit" [size]="16"></app-icon> Editar Documento
           </button>
        </div>


      </div>


      <!-- Main Spreadsheet rea -->


      <div class="flex-1 overflow-auto p-4 space-y-6 pb-24">


        


        <!-- TB: MOVEMENT -->



        <div *ngIf="activeTab === 'MOVEMENT'" class="space-y-6">
           <!-- PRINT COMPONENT (HIDDEN BY ITS OWN CSS ON SCREEN) -->
           <app-gas-control-report-print 
              [selectedDate]="selectedDate"
              [cylinderTypes]="cylinderTypes"
              [initialStock]="initialStock"
              [entries]="entries"
              [currentYear]="currentYear"
              [totals]="printTotals"
              [globalTotal]="getGlobalTotal()">
           </app-gas-control-report-print>

           <!-- DASHBOARD HEADER & STOCK -->
           <div class="p-4 bg-white rounded-xl shadow-lg border border-gray-200 no-print space-y-6">
              <div class="text-center font-bold uppercase tracking-widest text-[12px] border-b-2 border-black pb-2 mb-2 flex justify-between items-center">
                 <span class="text-blue-900">Movimento Geral Diário do Armazém - {{ selectedDate | date:'dd.MM.yyyy' }}</span>
                 <button (click)="openQuickRegistration()" class="px-5 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 shadow-lg transition-all active:scale-95">Novo Lançamento</button>
              </div>

              <!-- Stock Tables -->
              <div class="flex flex-col md:flex-row justify-between gap-6 items-start">
                 <div class="flex-1 w-full md:w-1/2">
                    <div class="text-[8px] font-black uppercase text-gray-400 mb-1 ml-1">Tabela de Stock Inicial</div>
                    <table class="w-full text-[10px] border-collapse border border-black uppercase text-center">
                       <thead>
                          <tr class="bg-gray-100 border-b border-black">
                             <th class="p-1 border-r border-black text-left w-24">Initial</th>
                             <th *ngFor="let t of cylinderTypes" class="p-1 border-r border-black font-bold">{{ t.name }}</th>
                          </tr>
                       </thead>
                       <tbody class="font-bold">
                          <tr class="border-b border-black"><td class="p-1 border-r border-black text-left bg-gray-50 text-[8px]">Kit/Redut</td><td *ngFor="let t of cylinderTypes">0</td></tr>
                          <tr class="border-b border-black"><td class="p-1 border-r border-black text-left bg-gray-50 text-[8px]">Avariadas</td><td *ngFor="let t of cylinderTypes" class="text-rose-500">{{ initialStock[t.name]?.damaged || 0 }}</td></tr>
                          <tr class="border-b border-black"><td class="p-1 border-r border-black text-left bg-gray-50 text-[8px]">Vazias</td><td *ngFor="let t of cylinderTypes">{{ initialStock[t.name]?.empty || 0 }}</td></tr>
                          <tr class="border-b border-black"><td class="p-1 border-r border-black text-left bg-gray-50 text-[8px]">GPL</td><td *ngFor="let t of cylinderTypes" class="text-blue-700">{{ initialStock[t.name]?.gpl || 0 }}</td></tr>
                       </tbody>
                       <tfoot class="bg-[#C6E0B4] font-black">
                          <tr><td class="p-1 border-r border-black text-left uppercase">TOTAL</td><td *ngFor="let t of cylinderTypes">{{ getInitialTotal(t.name) }}</td></tr>
                       </tfoot>
                    </table>
                 </div>
                 <div class="flex-1 w-full md:w-1/2">
                    <div class="text-[8px] font-black uppercase text-gray-400 mb-1 ml-1">Tabela de Stock Final</div>
                    <table class="w-full text-[10px] border-collapse border border-black uppercase text-center">
                       <thead>
                          <tr class="bg-gray-100 border-b border-black">
                             <th class="p-1 border-r border-black text-left w-24">Final</th>
                             <th *ngFor="let t of cylinderTypes" class="p-1 border-r border-black font-bold">{{ t.name }}</th>
                          </tr>
                       </thead>
                       <tbody class="font-bold">
                          <tr class="border-b border-black"><td class="p-1 border-r border-black text-left bg-gray-50 text-[8px]">Kit/Redut</td><td *ngFor="let t of cylinderTypes">0</td></tr>
                          <tr class="border-b border-black"><td class="p-1 border-r border-black text-left bg-gray-50 text-[8px]">Avariadas</td><td *ngFor="let t of cylinderTypes" class="text-rose-500">{{ getFinalStock(t.name, 'damaged') }}</td></tr>
                          <tr class="border-b border-black"><td class="p-1 border-r border-black text-left bg-gray-50 text-[8px]">Vazias</td><td *ngFor="let t of cylinderTypes">{{ getFinalStock(t.name, 'empty') }}</td></tr>
                          <tr class="border-b border-black"><td class="p-1 border-r border-black text-left bg-gray-50 text-[8px]">Gpl</td><td *ngFor="let t of cylinderTypes" class="text-blue-700">{{ getFinalStock(t.name, 'gpl') }}</td></tr>
                       </tbody>
                       <tfoot class="bg-[#C6E0B4] font-black">
                          <tr><td class="p-1 border-r border-black text-left uppercase">TOTAL</td><td *ngFor="let t of cylinderTypes">{{ getFinalTotal(t.name) }}</td></tr>
                       </tfoot>
                    </table>
                 </div>
              </div>
           </div>

           <!-- TRANSACTION TABLES BY TYPE -->
           <div class="space-y-6 no-print">
              <div *ngFor="let t of cylinderTypes" class="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                 <div class="flex items-center gap-4 mb-4 pb-2 border-b border-gray-50">
                    <span class="px-4 py-1.5 font-black text-white text-[11px] rounded-lg shadow-sm uppercase tracking-widest" [style.background-color]="getTypeColor(t.name)">{{ t.name }}</span>
                    <div class="flex items-center gap-6 ml-4">
                       <div class="flex flex-col">
                          <span class="text-[8px] font-black uppercase text-gray-400 mb-0.5 ml-1">Revendedor</span>
                          <div class="flex items-center bg-gray-50 border border-gray-200 rounded px-2 h-8">
                             <span class="text-[9px] font-bold text-gray-400 mr-1">MT</span>
                             <input type="number" min="0" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceRevendedor" (change)="saveTypePrice(t)" class="w-20 border-none p-0 text-[12px] font-black focus:ring-0 bg-transparent">
                          </div>
                       </div>
                       <div class="flex flex-col border-l border-gray-100 pl-4">
                          <span class="text-[8px] font-black uppercase text-gray-400 mb-0.5 ml-1">Bomba</span>
                          <div class="flex items-center bg-gray-50 border border-gray-200 rounded px-2 h-8">
                             <span class="text-[9px] font-bold text-gray-400 mr-1">MT</span>
                             <input type="number" min="0" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceBomba" (change)="saveTypePrice(t)" class="w-20 border-none p-0 text-[12px] font-black focus:ring-0 bg-transparent">
                          </div>
                       </div>
                       <div class="flex flex-col border-l border-gray-100 pl-4">
                           <span class="text-[8px] font-black uppercase text-gray-400 mb-0.5 ml-1">Consumidor</span>
                           <div class="flex items-center bg-gray-50 border border-gray-200 rounded px-2 h-8">
                              <span class="text-[9px] font-bold text-gray-400 mr-1">MT</span>
                              <input type="number" min="0" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceConsumidor" (change)="saveTypePrice(t)" class="w-20 border-none p-0 text-[12px] font-black focus:ring-0 bg-transparent">
                           </div>
                        </div>

                        <!-- ARTICLE CODES MAPPING -->
                        <div class="flex flex-col border-l border-gray-100 pl-4 border-dashed">
                           <span class="text-[8px] font-black uppercase text-blue-400 mb-0.5 ml-1">Códigos Inventário (Opcional)</span>
                           <div class="flex items-center gap-2">
                              <div class="flex flex-col">
                                 <span class="text-[6px] text-gray-400 uppercase">Cheia</span>
                                 <input type="text" [(ngModel)]="t.fullArticleCode" (change)="saveTypePrice(t)" [disabled]="control?.status !== 'OPENED'" class="w-16 h-6 border border-gray-200 rounded text-[9px] font-bold px-1 focus:ring-1 focus:ring-blue-100" placeholder="Default">
                              </div>
                              <div class="flex flex-col">
                                 <span class="text-[6px] text-gray-400 uppercase">Vazia</span>
                                 <input type="text" [(ngModel)]="t.emptyArticleCode" (change)="saveTypePrice(t)" [disabled]="control?.status !== 'OPENED'" class="w-16 h-6 border border-gray-200 rounded text-[9px] font-bold px-1 focus:ring-1 focus:ring-blue-100" placeholder="Default">
                              </div>
                              <div class="flex flex-col">
                                 <span class="text-[6px] text-gray-400 uppercase">Avar.</span>
                                 <input type="text" [(ngModel)]="t.damagedArticleCode" (change)="saveTypePrice(t)" [disabled]="control?.status !== 'OPENED'" class="w-16 h-6 border border-gray-200 rounded text-[9px] font-bold px-1 focus:ring-1 focus:ring-blue-100" placeholder="Default">
                              </div>
                           </div>
                        </div>
                     </div>
                   </div>
                 
                 <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!, undefined, false), type: t }"></ng-container>
              </div>
           </div>

           <!-- BOTTOM GRID: BANK, EXPENSES, CASH, KITS -->
           <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 no-print pb-10">
              <!-- BANK DEPOSITS -->
              <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                 <div class="bg-gray-100 p-2 font-black text-[10px] border-b border-gray-200 uppercase flex justify-between items-center group">
                     <span class="text-blue-900">Saídas p/ Banco</span>
                     <button (click)="addBankDeposit()" class="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] hover:bg-blue-700 transition-all shadow-sm">+ ADD</button>
                  </div>
                 <table class="w-full text-[9px] text-center border-collapse">
                    <thead>
                       <tr class="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
                          <th class="p-1 border-r border-gray-100 uppercase text-[8px]">Banco</th>
                          <th class="p-1 border-r border-gray-100 uppercase text-[8px]">Doc/Data</th>
                          <th class="p-1 uppercase text-[8px]">Valor</th>
                       </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                       <tr *ngFor="let b of bankDeposits; let i = index" class="hover:bg-blue-50/30 group">
                           <td class="p-0 border-r border-gray-100">
                              <input type="text" [(ngModel)]="b.bankName" (change)="saveStocks()" class="w-full border-none p-1.5 bg-transparent text-center uppercase font-black focus:bg-white focus:ring-1 focus:ring-blue-100">
                           </td>
                           <td class="p-0 border-r border-gray-100">
                              <input type="text" [(ngModel)]="b.depositor" (change)="saveStocks()" class="w-full border-none p-1.5 bg-transparent text-center italic text-[9px] focus:bg-white focus:ring-1 focus:ring-blue-100">
                           </td>
                           <td class="p-0 relative">
                              <input type="number" [(ngModel)]="b.value" (change)="saveStocks()" class="w-full border-none p-1.5 bg-transparent text-center font-black font-mono focus:bg-white focus:ring-1 focus:ring-blue-100">
                              <button (click)="removeBankDeposit(i); saveStocks()" class="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all text-rose-500 p-1"><app-icon name="close" [size]="10"></app-icon></button>
                           </td>
                        </tr>
                    </tbody>
                    <tfoot class="bg-blue-50 font-black border-t border-blue-100">
                       <tr>
                          <td colspan="2" class="p-2 text-left uppercase italic text-[9px] text-blue-800">Total Banco</td>
                          <td class="p-2 font-mono tabular-nums text-blue-900 border-l border-blue-100">{{ getBankTotal() | number:'1.2-2' }}</td>
                       </tr>
                    </tfoot>
                 </table>
              </div>

              <!-- EXPENSES -->
              <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div class="bg-gray-100 p-2 font-black text-[10px] border-b border-gray-200 uppercase text-center text-rose-900">Despesas e Saldos</div>
                  <div class="p-2 space-y-2">
                     <div class="flex justify-between items-center p-1.5 bg-gray-50 rounded border border-gray-100">
                        <span class="uppercase font-bold text-[9px] text-gray-500">Saldo Abertura</span>
                        <input type="number" [(ngModel)]="openingCash" (change)="saveStocks()" class="w-24 text-right font-black font-mono border-none p-0 bg-transparent text-gray-700">
                     </div>

                     <div class="space-y-1">
                        <div class="flex justify-between items-center text-[8px] uppercase font-black text-gray-400 px-1">
                           <span>Detalhes</span>
                           <button (click)="addExpense()" class="text-blue-600 hover:scale-105 transition-transform">+ ADD DESPESA</button>
                        </div>
                        <div *ngFor="let ex of dailyExpenses; let i = index" class="flex gap-1 items-center bg-rose-50/30 border border-rose-100/50 p-1 rounded">
                           <input type="text" [(ngModel)]="ex.description" (change)="saveStocks()" class="flex-1 border-none bg-transparent text-[9px] p-0 font-bold focus:ring-0" placeholder="...">
                           <input type="number" [(ngModel)]="ex.value" (change)="saveStocks()" class="w-16 border-none bg-transparent text-[9px] p-0 text-right font-black font-mono focus:ring-0">
                           <button (click)="removeExpense(i); saveStocks()" class="text-rose-500 p-0.5"><app-icon name="delete" [size]="10"></app-icon></button>
                        </div>
                     </div>

                     <table class="w-full text-[9px] border-collapse mt-2 border-t border-gray-100">
                        <tbody class="font-bold divide-y divide-gray-50">
                           <tr><td class="p-1 uppercase text-gray-400 text-[8px]">(-) Despesas</td><td class="p-1 text-right text-rose-600 font-mono">{{ getExpensesTotal() | number:'1.2-2' }}</td></tr>
                           <tr><td class="p-1 uppercase text-gray-400 text-[8px]">(+) Arrecadação</td><td class="p-1 text-right text-emerald-600 font-mono">{{ getGlobalTotal() | number:'1.2-2' }}</td></tr>
                           <tr class="bg-emerald-50/50"><td class="p-1 uppercase text-emerald-700 text-[8px]">(+) Ajustes</td><td class="p-1"><input type="number" [(ngModel)]="extraIncome" (change)="saveStocks()" class="w-full text-right font-black font-mono border-none p-0 bg-transparent text-emerald-700"></td></tr>
                           <tr class="bg-blue-50 mt-1 font-black"><td class="p-1 uppercase text-blue-900">ESPERADO</td><td class="p-1 text-right font-mono text-blue-900">{{ getExpectedBalance() | number:'1.2-2' }}</td></tr>
                           <tr class="bg-yellow-400 text-black font-black"><td class="p-1 uppercase">EM GAVETA</td><td class="p-1 text-right font-mono text-[11px]">{{ getPhysicalTotal() | number:'1.2-2' }}</td></tr>
                           <tr [class.bg-rose-600]="getDiscrepancy() < 0" [class.bg-emerald-600]="getDiscrepancy() >= 0" class="text-white font-black">
                              <td class="p-1 uppercase">DIFERENÇA</td>
                              <td class="p-1 text-right font-mono">{{ getDiscrepancy() | number:'1.2-2' }}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
              </div>

              <!-- PHYSICAL CASH -->
              <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div class="bg-gray-100 p-2 font-black text-[10px] border-b border-gray-200 uppercase text-center text-amber-900">Contagem Física</div>
                  <div class="p-2 space-y-2">
                     <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                        <div *ngFor="let den of denominations" class="flex items-center justify-between border-b border-gray-50 pb-0.5">
                           <span class="text-[9px] font-bold text-gray-500 italic">{{ den }}:</span>
                           <input type="number" [(ngModel)]="cashNotes[den]" (change)="saveStocks()" class="w-12 text-right font-black font-mono text-[10px] border-none p-0 bg-transparent focus:ring-0">
                        </div>
                     </div>
                     <div class="flex justify-between items-center border-t border-gray-100 pt-2 px-1">
                        <span class="text-[9px] font-bold uppercase text-gray-500">Moedas</span>
                        <input type="number" [(ngModel)]="cashCoins" (change)="saveStocks()" class="w-20 text-right font-black font-mono text-[10px] border-none p-0 bg-transparent">
                     </div>
                     <div class="bg-amber-100 p-2 rounded-lg border border-amber-200">
                        <div class="flex justify-between items-center">
                           <span class="text-[8px] font-black uppercase text-amber-900 tracking-tighter">TOTAL (N+M)</span>
                           <span class="text-[12px] font-mono font-black text-amber-900">{{ getCashOnlyTotal() | number:'1.2-2' }}</span>
                        </div>
                     </div>
                     <div class="pt-2 border-t border-gray-100 space-y-2">
                        <div class="flex flex-col">
                           <span class="text-[8px] font-black uppercase text-rose-500 ml-1">Para Circusal</span>
                           <input type="number" [(ngModel)]="cashHandover" (change)="saveStocks()" class="w-full text-right font-black font-mono text-[11px] bg-rose-50 border border-rose-100 rounded-lg p-1.5 focus:bg-white text-rose-700">
                        </div>
                        <div class="flex flex-col">
                           <span class="text-[8px] font-black uppercase text-blue-500 ml-1">Vendas POS</span>
                           <input type="number" [(ngModel)]="cashPOS" (change)="saveStocks()" class="w-full text-right font-black font-mono text-[11px] bg-blue-50 border border-blue-100 rounded-lg p-1.5 focus:bg-white text-blue-700">
                        </div>
                     </div>
                  </div>
              </div>

              <!-- KITS -->
              <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div class="bg-gray-100 p-2 font-black text-[10px] border-b border-gray-200 uppercase flex justify-between items-center group">
                     <span class="text-emerald-900">KITS de Redutores</span>
                     <button (click)="addKit()" class="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] shadow-sm">+ ADD</button>
                  </div>
                  <table class="w-full text-[9px] text-center border-collapse">
                     <thead>
                        <tr class="bg-gray-50 border-b border-gray-100 text-[8px] font-bold text-gray-500 uppercase italic">
                           <th class="p-1 border-r border-gray-50 text-left">Item</th>
                           <th class="p-1 border-r border-gray-50 w-8">Sai.</th>
                           <th class="p-1 border-r border-gray-50 w-8">Ent.</th>
                           <th class="p-1 w-8">Vnd.</th>
                        </tr>
                     </thead>
                     <tbody class="divide-y divide-gray-50">
                        <tr *ngFor="let k of kitMovements; let i = index" class="hover:bg-emerald-50/30 group">
                           <td class="p-0 border-r border-gray-50">
                              <input type="text" [(ngModel)]="k.name" (change)="saveStocks()" class="w-full border-none p-1.5 bg-transparent text-left uppercase text-[9px] font-bold focus:bg-white">
                           </td>
                           <td class="p-0 border-r border-gray-50">
                              <input type="number" [(ngModel)]="k.out" (change)="saveStocks()" class="w-full border-none p-1.5 bg-transparent text-center focus:bg-white">
                           </td>
                           <td class="p-0 border-r border-gray-50">
                              <input type="number" [(ngModel)]="k.ing" (change)="saveStocks()" class="w-full border-none p-1.5 bg-transparent text-center text-blue-600 font-bold focus:bg-white">
                           </td>
                           <td class="p-0 relative">
                              <input type="number" [(ngModel)]="k.sale" (change)="saveStocks()" class="w-full border-none p-1.5 bg-transparent text-center text-emerald-600 font-black focus:bg-white">
                              <button (click)="removeKit(i); saveStocks()" class="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-rose-500"><app-icon name="close" [size]="10"></app-icon></button>
                           </td>
                        </tr>
                     </tbody>
                     <tfoot class="bg-emerald-50 font-black border-t border-emerald-100 text-emerald-900">
                        <tr>
                           <td class="p-2 border-r border-emerald-100 text-left uppercase text-[8px]">TOTAIS</td>
                           <td class="p-2 border-r border-emerald-100">{{ getKitSum('out') }}</td>
                           <td class="p-2 border-r border-emerald-100">{{ getKitSum('ing') }}</td>
                           <td class="p-2">{{ getKitSum('sale') }}</td>
                        </tr>
                     </tfoot>
                  </table>
              </div>
            </div>
         </div>
<ng-container *ngIf="activeTab === 'INVENTORY'">
             <div class="print-a4 bg-white p-4 font-sans text-black overflow-auto min-h-screen">
                <!-- HEADER SECTION -->
                <div class="flex flex-col mb-4">
                   <div class="flex justify-center mb-4">
                      <div class="flex border border-black text-center font-bold text-[10px] shadow-sm">
                         <div class="border-r border-black"><div class="bg-gray-200 px-4 py-1 border-b border-black uppercase text-[7px] font-black tracking-widest">Dia</div><div class="px-4 py-1 text-base">{{ selectedDate | date:'dd' }}</div></div>
                         <div class="border-r border-black"><div class="bg-gray-200 px-4 py-1 border-b border-black uppercase text-[7px] font-black tracking-widest">Mês</div><div class="px-4 py-1 text-base">{{ selectedDate | date:'MM' }}</div></div>
                         <div><div class="bg-gray-200 px-4 py-1 border-b border-black uppercase text-[7px] font-black tracking-widest">Ano</div><div class="px-4 py-1 text-base">{{ selectedDate | date:'yyyy' }}</div></div>
                      </div>
                   </div>
                   <div class="flex justify-between items-start text-[10px]">
                      <div class="space-y-1">
                         <div class="flex gap-2"><span class="font-bold text-gray-500 uppercase tracking-tighter w-20">Supervisão:</span> <span class="font-black text-rose-600 uppercase">{{ control?.user || '---' }}</span></div>
                         <div class="flex gap-2"><span class="font-bold text-gray-500 uppercase tracking-tighter w-20">Armazém:</span> <span class="font-black">SEDE</span></div>
                         <div class="text-[9px] font-black text-blue-900 border-b border-blue-100 pb-0.5 inline-block">{{ selectedDate | date:'dd.MM.yyyy' }}</div>
                      </div>
                      <div class="text-right">
                         <h1 class="text-2xl font-black text-blue-900 leading-none tracking-tighter">INVERNO ERP</h1>
                         <p class="text-[9px] uppercase font-bold text-gray-400 tracking-widest border-t border-gray-100 pt-1 mt-1">Mapa de Inventário Global</p>
                      </div>
                   </div>
                </div>

                <!-- TOP TABLES -->
                <div class="flex gap-4 mb-8">
                   <div class="flex-[1.2]">
                      <table class="inventory-sheet-table w-full">
                         <thead>
                            <tr class="bg-[#31353D] text-white"><th colspan="8" class="p-1 uppercase text-[8px] font-black tracking-[0.2em]">Quantidades em Stock</th></tr>
                            <tr class="bg-gray-100">
                               <th class="w-20"></th>
                               <th *ngFor="let t of cylinderTypes" class="w-10 text-[8px] font-black">{{ t.name }}</th>
                            </tr>
                         </thead>
                         <tbody class="font-bold">
                            <tr>
                               <td class="text-left px-2 bg-gray-50/50">Cheias</td>
                               <td *ngFor="let t of cylinderTypes" class="p-0 border border-transparent focus-within:border-blue-400">
                                  <input type="number" min="0" [value]="getFinalStock(t.name, 'gpl')" (change)="updateEditableStock(t.name, 'gpl', $event)" class="w-full text-center bg-transparent border-none focus:ring-0 text-blue-700 font-bold px-0 hide-arrows">
                               </td>
                            </tr>
                            <tr>
                               <td class="text-left px-2 bg-gray-50/50">Vazias</td>
                               <td *ngFor="let t of cylinderTypes" class="p-0 border border-transparent focus-within:border-blue-400">
                                  <input type="number" min="0" [value]="getFinalStock(t.name, 'empty')" (change)="updateEditableStock(t.name, 'empty', $event)" class="w-full text-center bg-transparent border-none focus:ring-0 font-bold px-0 hide-arrows">
                               </td>
                            </tr>
                            <tr>
                               <td class="text-left px-2 bg-gray-50/50 text-rose-600">Avariadas</td>
                               <td *ngFor="let t of cylinderTypes" class="p-0 border border-transparent focus-within:border-blue-400">
                                  <input type="number" min="0" [value]="getFinalStock(t.name, 'damaged')" (change)="updateEditableStock(t.name, 'damaged', $event)" class="w-full text-center bg-transparent border-none focus:ring-0 text-rose-600 font-bold px-0 hide-arrows">
                               </td>
                            </tr>
                         </tbody>
                         <tfoot class="bg-orange-500 font-black text-white">
                            <tr><td class="text-left px-2">TOTAIS</td><td *ngFor="let t of cylinderTypes">{{ getFinalTotal(t.name) }}</td></tr>
                         </tfoot>
                      </table>
                   </div>

                   <div class="flex-[1.2]">
                       <table class="inventory-sheet-table w-full">
                          <thead>
                             <tr class="bg-[#31353D] text-white">
                                <th class="w-16 p-1 text-left text-[7px] font-black tracking-wider uppercase"></th>
                                <th *ngFor="let t of cylinderTypes" class="w-10 text-[8px] font-black">{{ t.name }}</th>
                                <th class="w-14 text-[8px] font-black">KIT</th>
                             </tr>
                          </thead>
                          <tbody>
                             <!-- Row 1: Calculated -->
                             <tr class="font-black text-blue-900 bg-blue-50">
                                <td class="text-left px-1 text-[7px] uppercase text-blue-700 bg-blue-100 border-r border-black">Calculado</td>
                                <td *ngFor="let t of cylinderTypes" class="py-1">{{ getManeioCalculated(t.name) }}</td>
                                <td class="py-1">{{ getKitSum('ing') - getKitSum('out') }}</td>
                             </tr>
                             <!-- Row 2: Physical (mostly auto-calculated now) -->
                             <tr class="font-black text-gray-800 bg-white">
                                <td class="text-left px-1 text-[7px] uppercase text-gray-600 bg-gray-100 border-r border-black">Físico</td>
                                <td *ngFor="let t of cylinderTypes" class="py-1 text-center text-[10px] bg-gray-50/20">
                                   {{ physicalManeio[t.name] || 0 }}
                                </td>
                                <td class="py-0">
                                   <input type="number" min="0"
                                      [(ngModel)]="physicalManeio['kit']"
                                      (change)="saveStocks()"
                                      class="w-full border-none bg-transparent text-center font-black text-[10px] focus:bg-yellow-50 focus:ring-1 focus:ring-yellow-300 focus:outline-none p-0.5"
                                      [placeholder]="'0'">
                                </td>
                             </tr>
                             <!-- Row 3: Difference -->
                             <tr class="font-black">
                                <td class="text-left px-1 text-[7px] uppercase bg-gray-100 border-r border-black tracking-widest text-rose-700">Dif.</td>
                                <td *ngFor="let t of cylinderTypes" class="py-1"
                                   [class.text-rose-600]="getManeioDifference(t.name) !== 0"
                                   [class.text-emerald-600]="getManeioDifference(t.name) === 0"
                                   [class.font-black]="getManeioDifference(t.name) !== 0">
                                   {{ getManeioDifference(t.name) === 0 ? '✓' : getManeioDifference(t.name) }}
                                </td>
                                <td class="py-1"
                                   [class.text-rose-600]="getKitDifference() !== 0"
                                   [class.text-emerald-600]="getKitDifference() === 0">
                                   {{ getKitDifference() === 0 ? '✓' : getKitDifference() }}
                                </td>
                             </tr>
                          </tbody>
                       </table>
                    </div>

                   <div class="flex-1">
                      <table class="inventory-sheet-table w-full">
                         <thead>
                            <tr class="bg-[#31353D] text-white"><th colspan="7" class="p-1 uppercase text-[8px] font-black tracking-[0.2em]">Líquidos Vendidos</th></tr>
                            <tr class="bg-gray-100">
                               <th *ngFor="let t of cylinderTypes" class="w-10 text-[8px] font-black">{{ t.name }}</th>
                            </tr>
                         </thead>
                         <tbody>
                            <tr class="font-black text-rose-600">
                               <td *ngFor="let t of cylinderTypes" class="py-1">{{ sumEntries(getEntriesForType(t.id!, 'CUSTOMER'), 'vz_vend') }}</td>
                            </tr>
                         </tbody>
                      </table>
                   </div>
                </div>

                <!-- MAIN GRID -->
                <div class="grid grid-cols-12 gap-6">
                   <div class="col-span-4 space-y-1">
                      <div class="text-center font-black text-[10px] uppercase border-b-2 border-black pb-1 mb-2 italic">Garrafas Por Reaver</div>
                      <table class="inventory-sheet-table w-full text-[8px]">
                         <thead>
                            <tr class="bg-gray-100"><th [attr.colspan]="cylinderTypes.length + 1" class="text-center font-bold p-1">Quantidades</th></tr>
                            <tr class="bg-[#31353D] text-white border-t border-black">
                               <th class="text-left px-2 w-32">NOMES</th>
                               <th *ngFor="let t of cylinderTypes" class="w-8">{{ t.name }}</th>
                            </tr>
                         </thead>
                         <tbody class="entities-body">
                            <tr class="bg-blue-50 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="text-left px-2 border-b border-black text-blue-800 tracking-tighter">TRABALHADOR / STAFF</td></tr>
                            <tr *ngFor="let ent of getCategorizedEntities('TRBLHDOR', 'CUSTOMER')">
                               <td class="text-left px-2 font-bold border-r border-black group">
                                  <div class="flex items-center justify-between w-full">
                                     <span class="truncate">{{ ent.name }}</span>
                                     <button (click)="clearEntityEntries(ent.name, 'CUSTOMER')" class="text-red-500 opacity-0 group-hover:opacity-100" title="Remover"><span class="material-symbols-outlined text-[12px] font-bold">close</span></button>
                                  </div>
                               </td>
                                <td *ngFor="let t of cylinderTypes" class="font-mono p-0 relative group/cell">
                                   <input type="number" [value]="ent.balances[t.name]" (change)="updateInventoryValue(ent.name, t, $event, 'CUSTOMER')" class="w-full text-center bg-transparent outline-none font-bold text-[9px] py-1 border border-transparent focus:bg-white focus:border-blue-400 hide-arrows">
                                </td>
                            </tr>
                            <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'TRBLHDOR', entRole: 'CUSTOMER', dbEntry: 'CUSTOMER' }"></ng-container>
                            <tr class="bg-[#ED7D31] font-black text-white"><td class="text-left px-2 uppercase">Total</td><td *ngFor="let t of cylinderTypes" class="font-mono">{{ sumCategorizedBalances('TRBLHDOR', t.name, 'CUSTOMER') }}</td></tr>

                            <tr class="bg-blue-50 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="text-left px-2 border-b border-black text-blue-800 tracking-tighter mt-2">CLIENTES</td></tr>
                            <tr *ngFor="let ent of getCategorizedEntities('CLIENTE', 'CUSTOMER')">
                               <td class="text-left px-2 font-bold border-r border-black group">
                                  <div class="flex items-center justify-between w-full">
                                     <span class="truncate">{{ ent.name }}</span>
                                     <button (click)="clearEntityEntries(ent.name, 'CUSTOMER')" class="text-red-500 opacity-0 group-hover:opacity-100" title="Remover"><span class="material-symbols-outlined text-[12px] font-bold">close</span></button>
                                  </div>
                               </td>
                                <td *ngFor="let t of cylinderTypes" class="font-mono p-0 relative group/cell">
                                   <input type="number" [value]="ent.balances[t.name]" (change)="updateInventoryValue(ent.name, t, $event, 'CUSTOMER')" class="w-full text-center bg-transparent outline-none font-bold text-[9px] py-1 border border-transparent focus:bg-white focus:border-blue-400 hide-arrows">
                                </td>
                            </tr>
                            <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'CLIENTE', entRole: 'CUSTOMER', dbEntry: 'CUSTOMER' }"></ng-container>
                            <tr class="bg-[#ED7D31] font-black text-white"><td class="text-left px-2 uppercase">Total</td><td *ngFor="let t of cylinderTypes" class="font-mono">{{ sumCategorizedBalances('CLIENTE', t.name, 'CUSTOMER') }}</td></tr>

                            <tr class="bg-blue-50 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="text-left px-2 border-b border-black text-blue-800 tracking-tighter mt-2">INSTITUIÇÕES</td></tr>
                            <tr *ngFor="let ent of getCategorizedEntities('INSTITUICO', 'CUSTOMER')">
                               <td class="text-left px-2 font-bold border-r border-black group">
                                  <div class="flex items-center justify-between w-full">
                                     <span class="truncate">{{ ent.name }}</span>
                                     <button (click)="clearEntityEntries(ent.name, 'CUSTOMER')" class="text-red-500 opacity-0 group-hover:opacity-100" title="Remover"><span class="material-symbols-outlined text-[12px] font-bold">close</span></button>
                                  </div>
                               </td>
                                <td *ngFor="let t of cylinderTypes" class="font-mono p-0 relative group/cell">
                                   <input type="number" [value]="ent.balances[t.name]" (change)="updateInventoryValue(ent.name, t, $event, 'CUSTOMER')" class="w-full text-center bg-transparent outline-none font-bold text-[9px] py-1 border border-transparent focus:bg-white focus:border-blue-400 hide-arrows">
                                </td>
                            </tr>
                            <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'INSTITUICO', entRole: 'CUSTOMER', dbEntry: 'CUSTOMER' }"></ng-container>
                            <tr class="bg-[#ED7D31] font-black text-white"><td class="text-left px-2 uppercase border-b border-black">Total</td><td *ngFor="let t of cylinderTypes" class="font-mono border-b border-black">{{ sumCategorizedBalances('INSTITUICO', t.name, 'CUSTOMER') }}</td></tr>
                            <tr class="bg-blue-50 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="text-left px-2 border-b border-black text-blue-800 tracking-tighter mt-2">FORNECEDORES</td></tr>
                             <tr *ngFor="let ent of getCategorizedEntities('SUPPLIER', 'CUSTOMER')">
                                <td class="text-left px-2 font-bold border-r border-black group">
                                   <div class="flex items-center justify-between w-full">
                                      <span class="truncate">{{ ent.name }}</span>
                                      <button (click)="clearEntityEntries(ent.name, 'CUSTOMER')" class="text-red-500 opacity-0 group-hover:opacity-100" title="Remover"><span class="material-symbols-outlined text-[12px] font-bold">close</span></button>
                                   </div>
                                </td>
                                <td *ngFor="let t of cylinderTypes" class="font-mono p-0">
                                   <input type="number" min="0" [value]="ent.balances[t.name]" (change)="updateInventoryValue(ent.name, t, $event, 'CUSTOMER')" class="w-full text-center bg-transparent outline-none font-bold text-[9px] py-1 border border-transparent focus:bg-white focus:border-blue-400 hide-arrows">
                                </td>
                             </tr>
                             <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'SUPPLIER', entRole: 'SUPPLIER', dbEntry: 'CUSTOMER' }"></ng-container>
                             <tr class="bg-[#ED7D31] font-black text-white"><td class="text-left px-2 uppercase border-b border-black">Total</td><td *ngFor="let t of cylinderTypes" class="font-mono border-b border-black">{{ sumCategorizedBalances('SUPPLIER', t.name, 'CUSTOMER') }}</td></tr>
                         </tbody>
                         <tfoot class="bg-[#C00000] font-black text-white">
                            <tr class="text-[9px]"><td class="text-left px-2 uppercase">TOTAIS GERAIS</td><td *ngFor="let t of cylinderTypes" class="font-mono">{{ sumCategorizedBalances('ALL_REAVER', t.name, 'CUSTOMER') }}</td></tr>
                         </tfoot>
                      </table>
                   </div>

                   <div class="col-span-4 space-y-1">
                      <div class="text-center font-black text-[10px] uppercase border-b-2 border-black pb-1 mb-2 italic">Garrafas Por Devolver</div>
                      <table class="inventory-sheet-table w-full text-[8px]">
                         <thead>
                            <tr class="bg-gray-100"><th [attr.colspan]="cylinderTypes.length + 1" class="text-center font-bold p-1">Quantidades</th></tr>
                             <tr class="bg-[#31353D] text-white border-t border-black">
                                <th class="text-left px-2 w-32">NOMES</th>
                                <th *ngFor="let t of cylinderTypes" class="w-8">{{ t.name }}</th>
                             </tr>
                          </thead>
                          <tbody class="entities-body">
                             <tr class="bg-blue-50 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="text-left px-2 border-b border-black text-blue-800 tracking-tighter">FORNECEDORES</td></tr>
                             <ng-container *ngFor="let ent of getCategorizedEntities('SUPPLIER', 'SUPPLIER')">
                                <tr>
                                   <td class="text-left px-2 font-bold border-r border-black group">
                                      <div class="flex items-center justify-between w-full">
                                         <span class="truncate">{{ ent.name }}</span>
                                         <button (click)="clearEntityEntries(ent.name, 'SUPPLIER')" class="text-red-500 opacity-0 group-hover:opacity-100" title="Remover"><span class="material-symbols-outlined text-[12px] font-bold">close</span></button>
                                      </div>
                                   </td>
                                    <td *ngFor="let t of cylinderTypes" class="font-mono p-0 relative group/cell">
                                       <input type="number" min="0" [value]="ent.balances[t.name]" (change)="updateInventoryValue(ent.name, t, $event, 'SUPPLIER')" class="w-full text-center bg-transparent outline-none font-bold text-[9px] py-1 text-orange-700 border border-transparent focus:bg-white focus:border-blue-400 hide-arrows">
                                    </td>
                                </tr>
                             </ng-container>
                             <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'SUPPLIER', entRole: 'SUPPLIER', dbEntry: 'SUPPLIER' }"></ng-container>
                             <tr class="bg-[#ED7D31] font-black text-white"><td class="text-left px-2 uppercase">Total</td><td *ngFor="let t of cylinderTypes" class="font-mono">{{ sumCategorizedBalances('SUPPLIER', t.name, 'SUPPLIER') }}</td></tr>

                             <tr class="bg-blue-50 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="text-left px-2 border-b border-black text-blue-800 tracking-tighter mt-2">INSTITUIÇÕES</td></tr>
                             <tr *ngFor="let ent of getCategorizedEntities('INSTITUICO', 'SUPPLIER')">
                                <td class="text-left px-2 font-bold flex items-center justify-between group">
                                   <span class="truncate w-full">{{ ent.name }}</span>
                                   <button (click)="clearEntityEntries(ent.name, 'SUPPLIER')" class="text-red-500 opacity-0 group-hover:opacity-100" title="Remover"><span class="material-symbols-outlined text-[12px] font-bold">close</span></button>
                                </td>
                                <td *ngFor="let t of cylinderTypes" class="font-mono p-0">
                                   <input type="number" [value]="ent.balances[t.name]" (change)="updateInventoryValue(ent.name, t, $event, 'SUPPLIER')" class="w-full text-center bg-transparent outline-none font-bold text-[9px] py-1 text-orange-700 border border-transparent focus:bg-white focus:border-blue-400 hide-arrows">
                                </td>
                             </tr>
                             <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'INSTITUICO', entRole: 'CUSTOMER', dbEntry: 'SUPPLIER' }"></ng-container>
                             <tr class="bg-[#ED7D31] font-black text-white"><td class="text-left px-2 uppercase border-b border-black">Total</td><td *ngFor="let t of cylinderTypes" class="font-mono border-b border-black">{{ sumCategorizedBalances('INSTITUICO', t.name, 'SUPPLIER') }}</td></tr>
                             <tr class="bg-blue-50 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="text-left px-2 border-b border-black text-blue-800 tracking-tighter mt-2">CLIENTES</td></tr>
                             <ng-container *ngFor="let ent of getCategorizedEntities('CLIENTE', 'SUPPLIER')">
                                <tr>
                                   <td class="text-left px-2 font-bold border-r border-black group">
                                      <div class="flex items-center justify-between w-full">
                                         <span class="truncate">{{ ent.name }}</span>
                                         <button (click)="clearEntityEntries(ent.name, 'SUPPLIER')" class="text-red-500 opacity-0 group-hover:opacity-100" title="Remover"><span class="material-symbols-outlined text-[12px] font-bold">close</span></button>
                                      </div>
                                   </td>
                                    <td *ngFor="let t of cylinderTypes" class="font-mono p-0 relative group/cell">
                                       <input type="number" min="0" [value]="ent.balances[t.name]" (change)="updateInventoryValue(ent.name, t, $event, 'SUPPLIER')" class="w-full text-center bg-transparent outline-none font-bold text-[9px] py-1 text-orange-700 border border-transparent focus:bg-white focus:border-blue-400 hide-arrows">
                                    </td>
                                </tr>
                             </ng-container>
                             <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'CLIENTE', entRole: 'CUSTOMER', dbEntry: 'SUPPLIER' }"></ng-container>
                             <tr class="bg-[#ED7D31] font-black text-white"><td class="text-left px-2 uppercase border-b border-black">Total</td><td *ngFor="let t of cylinderTypes" class="font-mono border-b border-black">{{ sumCategorizedBalances('CLIENTE', t.name, 'SUPPLIER') }}</td></tr>
                          </tbody>
                          <tfoot class="bg-[#C00000] font-black text-white">
                             <tr class="text-[9px]"><td class="text-left px-2 uppercase">TOTAIS GERAIS</td><td *ngFor="let t of cylinderTypes" class="font-mono">{{ sumCategorizedBalances('ALL_DEVOLVER', t.name, 'SUPPLIER') }}</td></tr>
                          </tfoot>
                       </table>
                    </div>

                   <div class="col-span-4 space-y-3">
                      <div class="text-center font-black text-[10px] uppercase border-b-2 border-black pb-1 mb-2 italic">Histórico de Movimento</div>
                       <div *ngFor="let t of cylinderTypes" class="border border-black flex flex-col items-center bg-gray-50/30 p-1 mb-2">
                          <div class="text-[9px] font-black uppercase italic text-blue-900 border-b border-gray-300 w-full text-center pb-0.5 mb-1">Total Caucionadas {{ t.name }}</div>
                          <div class="flex items-center gap-1 mb-2">
                             <!-- Left: Previous Total (Editable) -->
                             <div class="border border-black bg-orange-100 flex flex-col min-w-[50px] shadow-sm group">
                                <div class="text-[6px] font-black border-b border-black uppercase bg-gray-200 py-0.5 text-center px-1">Anterior</div>
                                <input type="number" [(ngModel)]="cautionPrev[t.name]" (change)="saveStocks()" class="w-full text-[10px] font-black py-1 text-center bg-transparent border-none focus:ring-0 p-0 hover:bg-white focus:bg-white text-gray-700">
                             </div>
                             
                             <div class="flex flex-col border border-black text-center min-w-[35px] bg-white">
                                <div class="text-[7px] font-black border-b border-black uppercase bg-gray-200 py-0.5">Entradas</div>
                                <input type="number" [(ngModel)]="cautionIn[t.name]" (change)="saveStocks()" class="text-[10px] font-black text-emerald-600 py-1 text-center border-none bg-transparent w-full focus:ring-0">
                             </div>
                             
                             <div class="flex flex-col border border-black text-center min-w-[35px] bg-white">
                                <div class="text-[7px] font-black border-b border-black uppercase bg-gray-200 py-0.5">Saídas</div>
                                <input type="number" [(ngModel)]="cautionOut[t.name]" (change)="saveStocks()" class="text-[10px] font-black text-rose-600 py-1 text-center border-none bg-transparent w-full focus:ring-0">
                             </div>

                             <!-- Right: Final Total (Prev + In - Out) -->
                             <div class="border border-black bg-orange-100 flex flex-col min-w-[50px] shadow-sm">
                                <div class="text-[6px] font-black border-b border-black uppercase bg-gray-200 py-0.5 text-center px-1">{{ selectedDate | date:'dd.MM.yyyy' }}</div>
                                <div class="text-[10px] font-black py-1 text-center">
                                   {{ physicalManeio[t.name] || 0 }}
                                   <div [hidden]="true">{{ externalEmpties[t.name] = physicalManeio[t.name] || 0 }}</div>
                                </div>
                             </div>
                          </div>
                          
                          <div class="grid grid-cols-1 w-full text-[7px] italic px-2 space-y-0.5" *ngIf="cautionInfo[t.name] || (cautionInfo[t.name] = { caucao: '', entrega: '', rececao: '' })">
                             <div class="flex items-center border-b border-gray-200">
                                <span class="whitespace-nowrap">Caução:</span>
                                <input type="text" [(ngModel)]="cautionInfo[t.name].caucao" (change)="saveStocks()" class="w-full bg-transparent border-none text-[8px] p-0 ml-1 font-bold focus:ring-0" placeholder="...">
                             </div>
                             <div class="flex items-center border-b border-gray-200">
                                <span class="whitespace-nowrap">Entregues a:</span>
                                <input type="text" [(ngModel)]="cautionInfo[t.name].entrega" (change)="saveStocks()" class="w-full bg-transparent border-none text-[8px] p-0 ml-1 font-bold focus:ring-0" placeholder="...">
                             </div>
                             <div class="flex items-center border-b border-gray-200">
                                <span class="whitespace-nowrap">Recebida de:</span>
                                <input type="text" [(ngModel)]="cautionInfo[t.name].rececao" (change)="saveStocks()" class="w-full bg-transparent border-none text-[8px] p-0 ml-1 font-bold focus:ring-0" placeholder="...">
                             </div>
                          </div>
                       </div>
                   </div>
                </div>
             </div>
          </ng-container>

    <!-- ===== TAB: ESTATÍSTICAS ===== -->
    <ng-container *ngIf="activeTab === 'STATS'">
      <div class="p-4 space-y-4">

        <!-- Date Range Selector -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">De</label>
            <input type="date" [(ngModel)]="statsRange.from" class="h-8 px-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Até</label>
            <input type="date" [(ngModel)]="statsRange.to" class="h-8 px-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <button (click)="loadStatistics()" [disabled]="statsLoading"
                  class="flex items-center gap-1.5 h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:bg-blue-300">
            <span class="material-symbols-outlined text-[15px]" [class.animate-spin]="statsLoading">{{ statsLoading ? 'refresh' : 'query_stats' }}</span>
            {{ statsLoading ? 'A carregar...' : 'Actualizar' }}
          </button>
        </div>

        <!-- Loading -->
        <div *ngIf="statsLoading" class="flex items-center justify-center py-16 text-gray-400">
          <div class="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          A processar estatísticas...
        </div>

        <!-- Empty -->
        <div *ngIf="!statsLoading && !statsData" class="text-center py-16 text-gray-400">
          <span class="material-symbols-outlined text-5xl text-gray-300 block mb-2">bar_chart</span>
          <p class="text-sm">Seleccione um período e clique em "Actualizar" para ver as estatísticas.</p>
        </div>

        <!-- Stats Content -->
        <div *ngIf="!statsLoading && statsData" class="space-y-4">

          <!-- Summary KPIs -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-blue-600 text-[18px]">calendar_month</span>
                <span class="text-[10px] font-bold text-gray-400 uppercase">Período</span>
              </div>
              <p class="text-xl font-black text-gray-900">{{ statsData.period?.days || 0 }} dias</p>
              <p class="text-[10px] text-gray-400">{{ statsData.period?.from }} → {{ statsData.period?.to }}</p>
            </div>
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-green-600 text-[18px]">receipt_long</span>
                <span class="text-[10px] font-bold text-gray-400 uppercase">Total VD's</span>
              </div>
              <p class="text-xl font-black text-green-700">{{ statsData.vdsTotal || 0 }}</p>
              <p class="text-[10px] text-gray-400">Vendas a dinheiro</p>
            </div>
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-purple-600 text-[18px]">description</span>
                <span class="text-[10px] font-bold text-gray-400 uppercase">Total Facturas</span>
              </div>
              <p class="text-xl font-black text-purple-700">{{ statsData.invoicesTotal || 0 }}</p>
              <p class="text-[10px] text-gray-400">Documentos emitidos</p>
            </div>
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-orange-600 text-[18px]">payments</span>
                <span class="text-[10px] font-bold text-gray-400 uppercase">Receita Total</span>
              </div>
              <p class="text-xl font-black text-orange-700">{{ getStatsTotalRevenue() | number:'1.0-0' }}</p>
              <p class="text-[10px] text-gray-400">MZN no período</p>
            </div>
          </div>

          <!-- Sales by Type Table -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <span class="material-symbols-outlined text-blue-600 text-[18px]">propane_tank</span>
              <h3 class="font-bold text-gray-800 text-sm">Vendas por Tipo de Cilindro</h3>
            </div>
            <table class="w-full text-xs">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-gray-600 font-semibold">Tipo</th>
                  <th class="px-4 py-2 text-right text-gray-600 font-semibold">Quantidade</th>
                  <th class="px-4 py-2 text-right text-gray-600 font-semibold">Média/Dia</th>
                  <th class="px-4 py-2 text-right text-gray-600 font-semibold">VD's</th>
                  <th class="px-4 py-2 text-right text-gray-600 font-semibold">Facturas</th>
                  <th class="px-4 py-2 text-right text-gray-600 font-semibold">Receita (MZN)</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of getStatsSalesRows()" class="border-t border-gray-100 hover:bg-gray-50">
                  <td class="px-4 py-2 font-bold text-gray-800">
                    <span class="inline-block w-2.5 h-2.5 rounded-full mr-2" [style.background]="getTypeColor(row.type)"></span>
                    {{ row.type }}
                  </td>
                  <td class="px-4 py-2 text-right font-mono font-semibold text-blue-700">{{ row.quantity }}</td>
                  <td class="px-4 py-2 text-right font-mono text-gray-500">{{ row.avg }}</td>
                  <td class="px-4 py-2 text-right font-mono text-gray-600">{{ row.vds }}</td>
                  <td class="px-4 py-2 text-right font-mono text-gray-600">{{ row.invoices }}</td>
                  <td class="px-4 py-2 text-right font-mono font-semibold text-green-700">{{ row.total | number:'1.2-2' }}</td>
                </tr>
                <tr *ngIf="getStatsSalesRows().length === 0">
                  <td colspan="6" class="px-4 py-6 text-center text-gray-400 italic">Sem vendas registadas no período.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Stock Trend (simple bar visualization) -->
          <div *ngIf="statsData.stockTrend?.length" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-blue-600 text-[18px]">trending_up</span>
              <h3 class="font-bold text-gray-800 text-sm">Evolução de Stock (GPL)</h3>
            </div>
            <div class="flex items-end gap-1 h-32 overflow-x-auto pb-1">
              <div *ngFor="let pt of statsData.stockTrend" class="flex flex-col items-center justify-end shrink-0" style="min-width: 24px;">
                <div class="w-4 bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                     [style.height.px]="getTrendBarHeight(pt.stock)"
                     [title]="pt.date + ': ' + pt.stock"></div>
                <span class="text-[7px] text-gray-400 mt-1 rotate-45 origin-left whitespace-nowrap">{{ pt.date | slice:5 }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ng-container>

    <!-- REUSABLE TABLE TEMPLATE -->



    <ng-template #movementTable let-entries="entries" let-t="type" let-isSupplier="isSupplier">
       <div class="overflow-x-auto">
          <table class="w-full text-[8px] border-collapse border border-black uppercase text-center">
             <thead>
                <tr class="bg-[#2E3137] text-white">
                   <th class="p-1 border-r border-white text-left w-32">CLIENTE/ENTIDADE</th>
                   <th *ngIf="!isSupplier" class="p-1 border-r border-white w-20">TIPO PREÇO</th>
                   <th class="p-1 border-r border-white w-8">S/GPL</th>
                   <th class="p-1 border-r border-white w-8">S/VAZ</th>
                   <th class="p-1 border-r border-white w-8">S/AV</th>
                   <th class="p-1 border-r border-white w-8">VZ-VEND</th>
                   <th class="p-1 border-r border-white w-8">ADC/Caucao</th>
                   <th class="p-1 border-r border-white w-8 bg-blue-900">E./GPL</th>
                   <th class="p-1 border-r border-white w-8 bg-blue-900">E/VAZ</th>
                   <th class="p-1 border-r border-white w-8 bg-blue-900">E./AV</th>
                   <th class="p-1 border-r border-white w-8">P.Divida</th>
                   <th class="p-1 border-r border-white w-12">VD,s</th>
                   <th class="p-1 border-r border-white w-12">FACTURAS</th>
                   <th class="p-1 w-12">GUIAS</th>
                </tr>
             </thead>
             <tbody>
                <tr *ngFor="let e of entries" class="border-b border-gray-300 hover:bg-gray-50 group"
                     [class.bg-orange-row]="e.customerName && (e.customerName.includes('PALETA') || e.customerName.includes('Petrogas'))">
                   <td class="p-1 border-r border-black text-left font-bold relative group/name">
                      <input type="text" [(ngModel)]="e.customerName" 
                             (input)="onSearchInput(e, 'CUSTOMER')"
                             (blur)="onNameBlur()"
                             (change)="updateEntry(e)"
                             placeholder="NOME DO CLIENTE..."
                             class="w-full bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 placeholder:text-gray-300">
                      
                      <!-- Custom Suggestions Dropdown -->
                      <div *ngIf="activeSuggestionEntry === e && (filteredSuggestions.length > 0 || (e.customerName && e.customerName.length > 2))" 
                           class="absolute left-0 top-full w-full bg-white border border-gray-300 shadow-2xl z-[100] rounded-b-md overflow-hidden">
                         
                         <div *ngFor="let s of filteredSuggestions" 
                              (mousedown)="selectSuggestion(s, e)"
                              class="p-2 text-[10px] font-bold hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex items-center gap-2">
                            <app-icon name="person" [size]="12" class="text-blue-500"></app-icon>
                            <div class="flex flex-col">
                               <span class="leading-none">{{ s.name }}</span>
                               <span class="text-[8px] text-gray-400">{{ s.code }}</span>
                            </div>
                         </div>

                         <div *ngIf="filteredSuggestions.length === 0 && e.customerName && e.customerName.length > 2" 
                              (mousedown)="triggerQuickRegistration(e, 'CUSTOMER')"
                              class="p-2 text-[10px] font-black text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-2 bg-blue-50/30">
                            <app-icon name="person_add" [size]="14"></app-icon>
                            CADASTRAR: "{{ e.customerName | uppercase }}"
                         </div>
                      </div>

                      <button (click)="removeEntry(e)" *ngIf="e.id" class="absolute right-1 top-1/2 -translate-y-1/2 no-print opacity-0 group-hover/name:opacity-100 text-rose-500 p-0.5 hover:bg-rose-50 rounded transition-all">
                         <app-icon name="delete" [size]="10"></app-icon>
                      </button>
                   </td>
                   <td *ngIf="!isSupplier" class="p-0 border-r border-black no-print">
                      <select [(ngModel)]="e.priceType" (change)="recalculateEntry(e, t)" class="w-full bg-transparent border-none text-[8px] font-black p-0 h-full text-center focus:ring-0">
                         <option value="CONSUMIDOR">Cons.</option>
                         <option value="REVENDEDOR">Rev.</option>
                         <option value="BOMBA">Bomb.</option>
                      </select>
                   </td>
                   <td class="p-0 border-r border-black">
                      <input type="number" [(ngModel)]="e.s_gpl" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 text-blue-800 font-bold focus:bg-blue-50">
                   </td>
                   <td class="p-0 border-r border-black">
                      <input type="number" [(ngModel)]="e.s_vaz" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 focus:bg-blue-50">
                   </td>
                   <td class="p-0 border-r border-black">
                      <input type="number" [(ngModel)]="e.s_av" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 text-rose-500 focus:bg-blue-50">
                   </td>
                   <td class="p-0 border-r border-black">
                      <input type="number" [(ngModel)]="e.vz_vend" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 focus:bg-blue-50">
                   </td>
                   <td class="p-0 border-r border-black">
                      <input type="number" [(ngModel)]="e.adc_caucao" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 font-mono italic focus:bg-blue-50">
                   </td>
                   <td class="p-0 border-r border-black print:bg-transparent bg-blue-50">
                      <input type="number" [(ngModel)]="e.e_gpl" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 font-bold text-blue-900 focus:bg-white">
                   </td>
                   <td class="p-0 border-r border-black print:bg-transparent bg-blue-50">
                      <input type="number" [(ngModel)]="e.e_vaz" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 font-bold focus:bg-white">
                   </td>
                   <td class="p-0 border-r border-black print:bg-transparent bg-blue-50">
                      <input type="number" [(ngModel)]="e.e_av" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 text-rose-600 focus:bg-white">
                   </td>
                   <td class="p-0 border-r border-black">
                      <input type="number" [(ngModel)]="e.p_divida" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 text-emerald-600 font-bold font-mono focus:bg-blue-50">
                   </td>
                   <td class="p-1 border-r border-black font-mono font-black italic whitespace-nowrap text-right text-gray-400"
                       [class.text-blue-800]="!e.invoice && !e.gr" [class.opacity-30]="(e.invoice || e.gr) && !isPrint">
                      {{ e.totalAmount | number:'1.2-2' }}
                   </td>
                   <td class="p-1 border-r border-black font-bold font-mono tabular-nums text-right cursor-pointer hover:bg-blue-50 no-print" 
                       (click)="e.invoice = !e.invoice; onInvoiceChange(e)">
                      {{ e.invoice ? (e.totalAmount | number:'1.2-2') : '' }}
                   </td>
                   <td class="p-1 font-black text-center text-[10px] cursor-pointer hover:bg-blue-50 no-print" 
                       (click)="e.gr = !e.gr; onGrChange(e)">
                      {{ e.gr ? 'X' : '' }}
                   </td>
                </tr>
                <!-- Blank spaces to match image spreadsheet style -->
             </tbody>
             <tfoot class="bg-[#C6E0B4] font-black">
                <tr>
                   <td class="p-1 border-r border-black text-left uppercase">Totais</td>
                   <td *ngIf="!isSupplier" class="p-1 border-r border-black"></td>
                   <td class="p-1 border-r border-black">{{ sumEntries(entries, 's_gpl') }}</td>
                   <td class="p-1 border-r border-black">{{ sumEntries(entries, 's_vaz') }}</td>
                   <td class="p-1 border-r border-black">{{ sumEntries(entries, 's_av') }}</td>
                   <td class="p-1 border-r border-black">{{ sumEntries(entries, 'vz_vend') }}</td>
                   <td class="p-1 border-r border-black">{{ sumEntries(entries, 'adc_caucao') | number:'1.0-0' }}</td>
                   <td class="p-1 border-r border-black">{{ sumEntries(entries, 'e_gpl') }}</td>
                   <td class="p-1 border-r border-black">{{ sumEntries(entries, 'e_vaz') }}</td>
                   <td class="p-1 border-r border-black">{{ sumEntries(entries, 'e_av') }}</td>
                   <td class="p-1 border-r border-black font-mono">{{ sumEntries(entries, 'p_divida') | number:'1.2-2' }}</td>
                   <td class="p-1 border-r border-black font-mono text-right text-rose-600">{{ sumVDs(entries) | number:'1.2-2' }}</td>
                   <td class="p-1 border-r border-black font-mono tabular-nums text-right">{{ sumInvoices(entries) | number:'1.2-2' }}</td>
                   <td class="p-1"></td>
                </tr>
             </tfoot>
          </table>
       </div>
    </ng-template>



    <ng-template #addInventoryRowTemplate let-cat="cat" let-entRole="entRole" let-dbEntry="dbEntry">
        <tr class="bg-white no-print border-b border-black">
           <td class="p-1 relative min-w-[120px] border-r border-black">
              <input type="text" [(ngModel)]="inventorySearch[cat + '_' + dbEntry]" (input)="onInventorySearchInput(cat + '_' + dbEntry, entRole)" (blur)="clearSuggestions()" placeholder="[+] Adicionar Novo..." class="w-full bg-transparent border-none text-[9px] font-black px-1 italic focus:outline-none placeholder:text-blue-300">
             <div *ngIf="suggestedInventoryEntities.length > 0 && inventorySearch[cat + '_' + dbEntry] && activeSearchKey === (cat + '_' + dbEntry)" class="absolute left-0 top-full z-50 w-full bg-white shadow-2xl border border-gray-300 rounded-lg overflow-hidden translate-y-1">
                <button *ngFor="let s of suggestedInventoryEntities" (mousedown)="selectInventorySuggestion(s, cat + '_' + dbEntry)" class="w-full p-2 text-left hover:bg-blue-50 flex flex-col border-b border-gray-100 last:border-none transition-colors">
                   <span class="text-[9px] font-black uppercase text-gray-800">{{ s.name }}</span>
                   <span class="text-[7px] text-gray-400 uppercase tracking-widest">{{ s.category }}</span>
                </button>
             </div>
             <div *ngIf="inventorySearch[cat + '_' + dbEntry] && suggestedInventoryEntities.length === 0 && activeSearchKey === (cat + '_' + dbEntry)" class="absolute left-0 top-full z-50 w-full bg-white shadow-2xl border border-gray-300 p-2 text-center translate-y-1">
                <span class="text-[7px] text-gray-500 block mb-1">Entidade não encontrada?</span>
                <button (mousedown)="triggerQuickRegistrationFromMap(cat + '_' + dbEntry, entRole)" class="w-full py-1.5 bg-blue-600 text-white rounded text-[7px] font-black uppercase hover:bg-blue-700 transition-colors">Criar Nova</button>
             </div>
          </td>
          <td *ngFor="let t of cylinderTypes" class="p-0 border-r border-black">
              <button (click)="inventorySearch[cat + '_' + dbEntry] = inventorySearch[cat + '_' + dbEntry] || ''; commitInventoryEntry(cat, cat + '_' + dbEntry, t, dbEntry)" class="w-full h-full p-1 opacity-10 hover:opacity-100 transition-opacity flex items-center justify-center bg-blue-50/50">
                 <app-icon name="add" [size]="12" class="text-blue-600"></app-icon>
              </button>
           </td>
        </tr>
     </ng-template>


    <!-- QUICK REGISTRTION MODL -->


    <app-quick-entity-modal 


      *ngIf="showQuickModal" 


      [type]="quickModalType" 


      [initialName]="quickModalName"


      (close)="showQuickModal = false"


      (saved)="handleQuickSave($event)">


    </app-quick-entity-modal>
    </div>
    </div>
  `


})


export class GasControlComponent implements OnInit, OnDestroy {


   selectedDate = new Date().toLocaleDateString('en-CA'); // Safer YYYY-MM-DD format
   currentYear = new Date().getFullYear();
   private lastInitializedCompanyId: string | null = null;
   private dataLoadSub: any = null;


   cylinderTypes: GasCylinderType[] = [];


   entries: GasDailyEntry[] = [];


   activeSearchKey: string | null = null;


   control: any = null;


   @Input() activeTab: 'MOVEMENT' | 'INVENTORY' | 'STATS' = 'MOVEMENT';
   statsData: any = null;
   statsLoading = false;
   statsRange: { from: string, to: string } = {
      from: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
      to: new Date().toISOString().split('T')[0]
   };


   initialStock: any = {};


   finalStock: any = {};


   highlightedEntityName: string | null = null;


   inventorySearch: { [cat: string]: string } = {};


   suggestedInventoryEntities: any[] = [];


   inventoryEntryValues: any = {};


   // Physical stock count for Fundo do Maneio (editable)
   physicalManeio: { [key: string]: number } = {};


   // FOOTER DT


   openingCash: number = 0;
   extraIncome: number = 0;


   denominations = [1000, 500, 200, 100, 50, 20];


   cashNotes: { [val: number]: number } = { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0 };


   cashCoins: number = 0;


   cashDirectTotal: number = 0;


   cashPOS: number = 0;


   cashHandover: number = 0;


   bankDeposits: { bankName: string, value: number, depositor: string }[] = [];


   dailyExpenses: { description: string, value: number }[] = [];

   kitMovements: { name: string, out: number, ing: number, sale: number }[] = [];


   cautionPrev: { [typeName: string]: number } = {};
   externalEmpties: { [typeName: string]: number } = {};
   cautionIn: { [typeName: string]: number } = {};
   cautionOut: { [typeName: string]: number } = {};
   cautionInfo: { [typeName: string]: { caucao: string, entrega: string, rececao: string } } = {};

   customerDebts: { [key: string]: number } = {};
   manualStockAdj: { [key: string]: number } = {};


   damagedLog: { typeName: string, fault: string, qty: number }[] = [];


   // SUGGESTION SYSTEM


   customers: Customer[] = [];


   suppliers: Supplier[] = [];


   filteredSuggestions: any[] = [];


   activeSuggestionEntry: GasDailyEntry | null = null;


   forceShowMapEntities = new Set<string>();


   showQuickModal = false;


   quickModalType: 'CUSTOMER' | 'SUPPLIER' = 'CUSTOMER';


   quickModalName = '';


   isLoading = false;


   private sub = new Subscription();


   dateNow = new Date();


   constructor(


      public gasService: GasService,


      private dataService: DataService,


      private toaster: ToasterService,


      public authService: AuthService,


      private customerService: CustomerService,


      private supplierService: SupplierService,


      private cdr: ChangeDetectorRef


   ) { }


   ngOnInit() {


      this.sub.add(


         this.dataService.activeCompany$.subscribe(company => {
            if (company && company.id !== this.lastInitializedCompanyId) {
               this.lastInitializedCompanyId = company.id;
               this.initModule();
               this.loadEntities();
            }
         })


      );


   }


   ngOnDestroy() {


      this.sub.unsubscribe();


   }


   async loadEntities() {


      await this.customerService.loadCustomers();


      await this.supplierService.loadSuppliers();


      this.customers = this.customerService.getCustomers();


      this.suppliers = this.supplierService.getSuppliers();


   }


   initModule() {


      const cid = this.dataService.getCompanyId();


      if (!cid) return;


      this.isLoading = true;


      this.gasService.getCylinderTypes(cid).subscribe({


         next: (types) => {


            this.cylinderTypes = types;


            this.ensureDefaultTypes(cid);

            this.ensureBlankEntries();

         },


         error: () => {


            this.isLoading = false;


            this.toaster.showError('Erro', 'Falha ao carregar tipos de garrafas.');


         }


      });

   }


   ensureDefaultTypes(cid: string) {


      const defaults = [


         { name: '9KG', brand: 'PETROGS', priceRevendedor: 739, priceBomba: 739, priceConsumidor: 850 },


         { name: '14KG', brand: 'PETROGS', priceRevendedor: 1149, priceBomba: 1149, priceConsumidor: 1300 },


         { name: '19KG', brand: 'PETROGS', priceRevendedor: 1560, priceBomba: 1560, priceConsumidor: 1750 },


         { name: '48KG', brand: 'PETROGS', priceRevendedor: 3800, priceBomba: 3800, priceConsumidor: 4200 },


         { name: '6KG', brand: 'PETROGS', priceRevendedor: 480, priceBomba: 480, priceConsumidor: 550 },


         { name: '11KG', brand: 'GLP', priceRevendedor: 900, priceBomba: 900, priceConsumidor: 1050 },


         { name: '45KG', brand: 'GLP', priceRevendedor: 3750, priceBomba: 3750, priceConsumidor: 4100 },


         { name: '05KG', brand: 'GLP', priceRevendedor: 410, priceBomba: 410, priceConsumidor: 480 }


      ] as any[];


      // Fix brand mismatch for existing types (Force 11KG to be GLP)


      this.cylinderTypes.forEach(t => {


         const def = defaults.find(d => d.name === t.name);


         if (def && t.brand !== def.brand) {


            t.brand = def.brand;


            this.saveTypePrice(t); // Sync with database


         }


      });


      const missing = defaults.filter(d => !this.cylinderTypes.some(t => t.name === d.name));


      if (missing.length === 0) {


         this.prepareStockObjects();


         this.loadData();


         return;


      }


      let created = 0;


      missing.forEach(m => {


         this.gasService.saveCylinderType(m, cid).subscribe({


            next: (newType) => {


               this.cylinderTypes.push(newType);


               created++;


               if (created === missing.length) {


                  this.prepareStockObjects();


                  this.loadData();


               }


            }


         });


      });

   }


   prepareStockObjects() {


      this.cylinderTypes.forEach(t => {


         if (!this.initialStock[t.name]) {


            this.initialStock[t.name] = { damaged: 0, empty: 0, gpl: 0, toRecover: 0, toReturn: 0 };


         }


         // Ensure properties exist for rollover


         if (this.initialStock[t.name].toRecover === undefined) this.initialStock[t.name].toRecover = 0;


         if (this.initialStock[t.name].toReturn === undefined) this.initialStock[t.name].toReturn = 0;


         if (!this.finalStock[t.name]) this.finalStock[t.name] = { damaged: 0, empty: 0, gpl: 0, toRecover: 0, toReturn: 0 };


      });

   }


   loadData() {


      const cid = this.dataService.getCompanyId();


      if (this.dataLoadSub) {
         this.dataLoadSub.unsubscribe();
      }

      this.isLoading = true;
      this.dataLoadSub = this.gasService.getDaily(this.selectedDate, cid).subscribe({
         next: (res) => {


            this.control = res.control;
            this.initialStock = {}; // Reset to avoid carrying over from previous date


            this.entries = res.entries;

            this.ensureBlankEntries();


            // ROLLOVER INVENTORY


            if (this.control && this.control.initialStock) {
               this.initialStock = { ...this.initialStock, ...this.control.initialStock };
               // Tenta carregar do initialStock do dia (que vem do finalStock de ontem)
               this.openingCash = this.control.initialStock.footers?.closingBalance || 0;
            }


            const footers = this.control.finalStock?.footers || {};
            this.extraIncome = footers.extraIncome || 0;
            this.openingCash = footers.openingCash || this.openingCash;


            this.cashNotes = footers.cashNotes || { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0 };


            this.cashCoins = footers.cashCoins || 0;


            this.cashDirectTotal = footers.cashDirectTotal || 0;


            this.cashPOS = footers.cashPOS || 0;


            this.cashHandover = footers.cashHandover || 0;


            this.bankDeposits = footers.bankDeposits || [];
            this.dailyExpenses = footers.dailyExpenses || [];
            this.kitMovements = footers.kitMovements || [];
            this.physicalManeio = footers.physicalManeio || {};

            // Vasilhame exterior assume o valor do dia anterior se não houver registo hoje
            this.externalEmpties = (footers.externalEmpties && Object.keys(footers.externalEmpties).length > 0) ? footers.externalEmpties : (this.control?.initialStock?.footers?.externalEmpties || {});
            this.cautionIn = footers.cautionIn || {};
            this.cautionOut = footers.cautionOut || {};
            this.cautionInfo = footers.cautionInfo || this.control?.initialStock?.footers?.cautionInfo || {};
            this.cautionPrev = (footers.cautionPrev && Object.keys(footers.cautionPrev).length > 0) ? footers.cautionPrev : (this.control?.initialStock?.footers?.physicalManeio || {});
            this.damagedLog = footers.damagedLog || [];

            // Carry-over customer debts and editable stock configurations
            this.customerDebts = this.control?.initialStock?.footers?.customerDebts || {};
            this.manualStockAdj = (footers.manualStockAdj && Object.keys(footers.manualStockAdj).length > 0) ? footers.manualStockAdj : (this.control?.initialStock?.footers?.manualStockAdj || {});


            this.isLoading = false;


            this.cdr.detectChanges();


         },


         error: () => {


            this.isLoading = false;


            this.toaster.showError('Erro', 'Falha ao carregar dados do dia.');


         }


      });

   }


   getFinalStockPayload() {


      const fs: any = {};


      this.cylinderTypes.forEach(t => {


         fs[t.name] = {


            gpl: this.getFinalStock(t.name, 'gpl'),


            empty: this.getFinalStock(t.name, 'empty'),


            damaged: this.getFinalStock(t.name, 'damaged'),


            toRecover: this.getFinalStock(t.name, 'toRecover'),


            toReturn: this.getFinalStock(t.name, 'toReturn')


         };


      });


      // FOOTERS (CSHIER CLOSURE)


      const drawerCash = this.getCashOnlyTotal();


      fs.footers = {


         cashNotes: this.cashNotes,


         cashCoins: this.cashCoins,


         cashDirectTotal: this.cashDirectTotal,


         cashPOS: this.cashPOS,


         cashHandover: this.cashHandover,


         bankDeposits: this.bankDeposits,

         dailyExpenses: this.dailyExpenses,

         kitMovements: this.kitMovements,

         externalEmpties: this.externalEmpties,
         cautionIn: this.cautionIn,
         cautionOut: this.cautionOut,
         cautionInfo: this.cautionInfo,
         cautionPrev: this.cautionPrev,
         damagedLog: this.damagedLog,
         customerDebts: this.computeEndOfDayCustomerDebts(),
         manualStockAdj: this.manualStockAdj,

         physicalManeio: this.physicalManeio,

         openingCash: this.openingCash,
         extraIncome: this.extraIncome,

         closingBalance: drawerCash // Saldo que herda para amanhã (gaveta)

      };


      return fs;


   }


   saveStocks() {
      const cid = this.dataService.getCompanyId();
      if (!cid || !this.control) return;

      // Auto-calculate 'physicalManeio' (A) based on B + IN - OUT (C)
      this.cylinderTypes.forEach(t => {
         this.physicalManeio[t.name] = (Number(this.cautionPrev[t.name]) || 0) + (Number(this.cautionIn[t.name]) || 0) - (Number(this.cautionOut[t.name]) || 0);
      });

      this.cdr.detectChanges();
      const fs = this.getFinalStockPayload();


      const user = this.authService.currentUserValue?.username || 'admin';


      this.isLoading = true;


      this.gasService.updateStocks(this.control.id!, this.initialStock, fs, user, cid!).subscribe({


         next: () => {


            this.isLoading = false;


            this.toaster.showSuccess('Relatório Gravado', 'Stocks e Caixa sincronizados.');


            if (this.control.status === 'CLOSED') {


               this.toaster.showWarning('Auditoria', 'Alteração registada após fecho do mapa.');


            }


         },


         error: () => {


            this.isLoading = false;


            this.toaster.showError('Erro', 'Falha ao gravar relatório.');


         }


      });

   }


   loadStatistics() {
      const cid = this.dataService.getCompanyId();
      if (!cid) return;

      this.statsLoading = true;
      this.gasService.getStatistics(this.statsRange.from, this.statsRange.to, cid).subscribe({
         next: (data) => {
            this.statsData = data;
            this.statsLoading = false;
            this.cdr.detectChanges();
         },
         error: () => {
            this.statsLoading = false;
            this.toaster.showError('Erro', 'Falha ao carregar estatísticas.');
            this.cdr.detectChanges();
         }
      });
   }

   /** Build sales-by-type rows for the statistics table */
   getStatsSalesRows(): Array<{ type: string; quantity: number; avg: string; vds: number; invoices: number; total: number }> {
      if (!this.statsData?.salesByType) return [];
      const averages = this.statsData.dailyAverages || {};
      return Object.keys(this.statsData.salesByType).map(type => {
         const s = this.statsData.salesByType[type] || {};
         return {
            type,
            quantity: s.quantity || 0,
            avg: averages[type] || '0.00',
            vds: s.vds || 0,
            invoices: s.invoices || 0,
            total: parseFloat(String(s.total)) || 0,
         };
      }).sort((a, b) => b.quantity - a.quantity);
   }

   /** Total revenue across all cylinder types */
   getStatsTotalRevenue(): number {
      return this.getStatsSalesRows().reduce((sum, r) => sum + r.total, 0);
   }

   /** Scaled bar height (px) for stock trend chart, max 120px */
   getTrendBarHeight(stock: number): number {
      const trend = this.statsData?.stockTrend || [];
      const max = Math.max(1, ...trend.map((p: any) => parseFloat(String(p.stock)) || 0));
      const val = parseFloat(String(stock)) || 0;
      return Math.max(2, Math.round((val / max) * 120));
   }

   openDay() {


      const cid = this.dataService.getCompanyId();


      const user = this.authService.currentUserValue?.username || 'admin';


      if (!cid) return;


      this.isLoading = true;


      console.log('[GasControl] Requesting opening for:', { date: this.selectedDate, user, cid });


      this.gasService.openDaily(this.selectedDate, user, cid).subscribe({


         next: (res) => {


            console.log('[GasControl] Opening SUCCESS:', res);


            this.isLoading = false;


            this.control = res;


            this.loadData(); // Reload to show rollover stock


            this.entries = []; // New day starts empty


            this.toaster.showSuccess('Abertura Concluída', 'O mapa está pronto para lançamentos.');


            if (this.cdr) this.cdr.detectChanges();


         },


         error: (err) => {


            console.error('[GasControl] Opening ERROR:', err);


            this.isLoading = false;


            const msg = err.error?.message || 'Falha ao realizar Abertura.';


            this.toaster.showError('Erro de Abertura', msg);


         }


      });

   }


   closeDay() {


      const disc = this.getDiscrepancy();

      if (disc < -1) {
         this.toaster.showWarning('Atenção', `O caixa tem um défice de ${Math.abs(disc).toFixed(2)} MT. Verifique os movimentos antes de fechar.`);
         return;
      }

      if (disc > 1) {
         if (!confirm(`Existe um excesso de ${disc.toFixed(2)} MT no caixa. Deseja fechar o dia mesmo assim?`)) {
            return;
         }
      }


      if (!confirm('Deseja realmente fechar o mapa do dia? Os dados serão guardados e o mapa bloqueado.')) return;


      const cid = this.dataService.getCompanyId();


      const user = this.authService.currentUserValue?.username || 'admin';


      if (!cid || !this.control?.id) return;


      this.isLoading = true;


      const fs = this.getFinalStockPayload();


      // SVE first, then CLOSE


      this.gasService.updateStocks(this.control.id, this.initialStock, fs, user, cid).subscribe({


         next: () => {


            this.gasService.closeDaily(this.control.id, user, cid).subscribe({


               next: () => {


                  this.isLoading = false;


                  this.toaster.showSuccess('Sucesso', 'Mapa guardado e fechado permanentemente.');


                  this.loadData();


               },


               error: () => {


                  this.isLoading = false;


                  this.toaster.showError('Erro', 'Os dados foram guardados mas falhou ao fechar o mapa.');


               }


            });


         },


         error: () => {


            this.isLoading = false;


            this.toaster.showError('Erro', 'Falha crítica: Não foi possível guardar os dados antes de fechar.');


         }


      });

   }


   reopenDay() {
      if (!confirm('Deseja reabrir este mapa para edição? Esta ação será registrada no log de auditoria.')) return;

      const cid = this.dataService.getCompanyId();
      const user = this.authService.currentUserValue?.username || 'admin';

      if (!cid || !this.control?.id) return;

      this.isLoading = true;
      this.gasService.reopenDaily(this.control.id, user, cid).subscribe({
         next: () => {
            this.isLoading = false;
            this.toaster.showSuccess('Sucesso', 'Documento reaberto para edição.');
            this.loadData();
         },
         error: () => {
            this.isLoading = false;
            this.toaster.showError('Erro', 'Falha ao reabrir o documento.');
         }
      });
   }


   printReport(format: 'pdf' | 'excel') {


      this.dateNow = new Date();


      this.toaster.showInfo(' processar...', ` preparar documento para impressão...`);


      setTimeout(() => {


         window.print();


      }, 500);


   }


   getDiscrepancy() { return this.getPhysicalTotal() - this.getExpectedBalance(); }


   getGlobalSaidasCount(): number {
      if (!this.entries) return 0;
      return this.entries
         .filter(e => !(e as any).isAdj)
         .reduce((acc: number, e: any) => acc + (Number(e.s_gpl) || 0) + (Number(e.s_vaz) || 0) + (Number(e.s_av) || 0), 0);
   }


   // --- MTEMÃÂTIC DO CIX ---


   getBankTotal() { return this.bankDeposits.reduce((acc, d) => acc + (Number(d.value) || 0), 0); }


   getCashOnlyTotal(): number {


      let notesVal = 0;


      this.denominations.forEach(bill => {


         notesVal += bill * (Number(this.cashNotes[bill]) || 0);


      });


      return notesVal + (Number(this.cashCoins) || 0) + (Number(this.cashDirectTotal) || 0);


   }


   getPhysicalTotal(): number {


      const digital = (Number(this.cashPOS) || 0) + this.getBankTotal();


      return this.getCashOnlyTotal() + digital;


   }


   getExpensesTotal() { return this.dailyExpenses.reduce((acc, ex) => acc + (Number(ex.value) || 0), 0); }


   getExpectedBalance() {

      const recpt = (this.getGlobalTotal() + this.getCollectionsTotal() + (Number(this.extraIncome) || 0));
      return (Number(this.openingCash) || 0) + recpt - this.getExpensesTotal() - this.getBankTotal() - (Number(this.cashHandover) || 0);

   }


   addExpense() { this.dailyExpenses.unshift({ description: '', value: 0 }); }

   removeExpense(i: number) { this.dailyExpenses.splice(i, 1); }

   addBankDeposit() { this.bankDeposits.unshift({ bankName: '', value: 0, depositor: '' }); }

   removeBankDeposit(i: number) { this.bankDeposits.splice(i, 1); }

   addKit() { this.kitMovements.push({ name: '', out: 0, ing: 0, sale: 0 }); }

   removeKit(i: number) { this.kitMovements.splice(i, 1); }

   getKitSum(field: 'out' | 'ing' | 'sale') { return this.kitMovements.reduce((acc, k) => acc + (Number(k[field]) || 0), 0); }


   addDamagedLog() { this.damagedLog.unshift({ typeName: this.cylinderTypes[0]?.name, fault: '', qty: 0 }); }


   removeDamagedLog(i: number) { this.damagedLog.splice(i, 1); }


   changeDate(days: number) {


      const d = new Date(this.selectedDate);


      d.setDate(d.getDate() + days);


      this.selectedDate = d.toISOString().split('T')[0];


      this.loadData();


   }


   addEntry(type: GasCylinderType, entryType: 'CUSTOMER' | 'SUPPLIER') {


      const cid = this.dataService.getCompanyId();


      if (!cid || !this.control) return;


      const newEntry: GasDailyEntry = {


         controlId: this.control.id,


         cylinderTypeId: type.id!,


         customerName: '',


         entryType: entryType,


         priceType: 'REVENDEDOR',


         s_gpl: 0, s_vaz: 0, s_av: 0, vz_vend: 0, adc_caucao: 0, e_gpl: 0, e_vaz: 0, e_av: 0, p_divida: 0, totalAmount: 0, gr: false, invoice: false


      };


      this.gasService.saveEntry(newEntry, cid).subscribe(saved => { this.entries.push(saved); this.cdr.detectChanges(); });


   }


   validateEntry(e: GasDailyEntry) {


      const keys: (keyof GasDailyEntry)[] = ['s_gpl', 's_vaz', 's_av', 'vz_vend', 'adc_caucao', 'e_gpl', 'e_vaz', 'e_av', 'p_divida'];


      keys.forEach(k => {


         if ((Number(e[k]) || 0) < 0) (e[k] as any) = 0;


      });

   }


   updateEntry(entry: GasDailyEntry) {

      const isBlank = !entry.customerName &&
         (Number(entry.s_gpl) || 0) === 0 &&
         (Number(entry.s_vaz) || 0) === 0 &&
         (Number(entry.s_av) || 0) === 0 &&
         (Number(entry.e_gpl) || 0) === 0 &&
         (Number(entry.e_vaz) || 0) === 0 &&
         (Number(entry.adc_caucao) || 0) === 0;

      if (isBlank && !entry.id) return;

      this.validateEntry(entry);

      const cid = this.dataService.getCompanyId();

      if (cid) {

         this.gasService.saveEntry(entry, cid).subscribe(saved => {
            if (!entry.id && saved.id) {
               Object.assign(entry, saved);
               this.ensureBlankEntries();
            }
            this.saveStocks(); // Keep control summary updated
            this.cdr.detectChanges();
         });

      }

   }

   ensureBlankEntries() {

      if (!this.control || this.control.status !== 'OPENED') return;

      this.cylinderTypes.forEach(t => {

         this.addBlankIfMissing(t.id!, 'CUSTOMER');

      });

   }

   private addBlankIfMissing(typeId: string, entryType: 'CUSTOMER' | 'SUPPLIER') {

      const ents = this.entries.filter(e => e.cylinderTypeId === typeId && e.entryType === entryType);

      const hasBlank = ents.some(e => !e.customerName && !e.id && e.totalAmount === 0);

      if (!hasBlank) {

         this.entries.push({

            controlId: this.control!.id,

            cylinderTypeId: typeId,

            customerName: '',

            entryType: entryType,

            priceType: 'REVENDEDOR',

            s_gpl: 0, s_vaz: 0, s_av: 0, vz_vend: 0, adc_caucao: 0, e_gpl: 0, e_vaz: 0, e_av: 0, p_divida: 0, totalAmount: 0, gr: false, invoice: false

         } as GasDailyEntry);

      }

   }


   onGrChange(e: GasDailyEntry) {


      if (e.gr) e.invoice = false;


      this.updateEntry(e);


   }


   onInvoiceChange(e: GasDailyEntry) {


      if (e.invoice) e.gr = false;


      this.updateEntry(e);


   }


   recalculateEntry(e: GasDailyEntry, t: GasCylinderType) {


      this.validateEntry(e);


      let price = t.priceConsumidor || 0;


      if (e.priceType === 'REVENDEDOR') price = t.priceRevendedor || 0;


      if (e.priceType === 'BOMBA') price = t.priceBomba || 0;


      e.totalAmount = (Number(e.s_gpl) || 0) * price;


      this.updateEntry(e);


   }


   removeEntry(entry: GasDailyEntry) {


      const cid = this.dataService.getCompanyId();


      if (confirm('Eliminar registo?') && cid) {


         this.gasService.deleteEntry(entry.id!, cid).subscribe(() => {


            this.entries = this.entries.filter(e => e.id !== entry.id);


            this.cdr.detectChanges();


         });


      }


   }


   saveTypePrice(type: GasCylinderType) {


      const cid = this.dataService.getCompanyId();


      if (cid) this.gasService.saveCylinderType(type, cid).subscribe();


   }


   get activeBrands(): string[] {


      const brands = new Set(this.cylinderTypes.map(t => (t.brand || 'PETROGS').toUpperCase()));


      if (brands.size === 0) return ['PETROGS', 'GLP'];


      return Array.from(brands);


   }


   getTypesByBrand(brand: string) {


      return this.cylinderTypes


         .filter(t => (t.brand || 'PETROGS').toUpperCase() === brand.toUpperCase())


         .sort((a, b) => {


            const val = parseInt(a.name.replace(/\D/g, '') || '0');


            const valB = parseInt(b.name.replace(/\D/g, '') || '0');


            return val - valB;


         });

   }


   getEntriesForType(typeId: string, entryType?: 'CUSTOMER' | 'SUPPLIER', includeAdjustments: boolean = true) {
      return this.entries.filter(e =>
         e.cylinderTypeId === typeId &&
         (entryType ? e.entryType === entryType : true) &&
         (includeAdjustments ? true : !(e as any).isAdj)
      );
   }


   sumEntries(ents: GasDailyEntry[], f: keyof GasDailyEntry) { return ents.reduce((acc, e) => acc + (Number(e[f]) || 0), 0); }

   sumVDs(ents: GasDailyEntry[]) {
      return ents.reduce((acc, e) => acc + ((!e.invoice && !e.gr) ? (Number(e.totalAmount) || 0) : 0), 0);
   }

   sumInvoices(ents: GasDailyEntry[]) {
      return ents.reduce((acc, e) => acc + (e.invoice ? (Number(e.totalAmount) || 0) : 0), 0);
   }


   getGlobalTotal() {
      return this.entries
         .filter(e => e.entryType === 'CUSTOMER' && !e.invoice && !e.gr && !(e as any).isAdj)
         .reduce((acc, e) => acc + (Number(e.totalAmount) || 0), 0);
   }

   getInvoicesTotal() {
      return this.entries
         .filter(e => e.entryType === 'CUSTOMER' && e.invoice && !(e as any).isAdj)
         .reduce((acc, e) => acc + (Number(e.totalAmount) || 0), 0);
   }


   getCollectionsTotal() {
      return this.entries
         .filter(e => e.entryType === 'CUSTOMER' && !(e as any).isAdj)
         .reduce((acc, e) => acc + (Number(e.adc_caucao) || 0) + (Number(e.p_divida) || 0), 0);
   }


   getInitialTotal(tn: string) { const s = this.initialStock[tn]; return s ? (s.damaged || 0) + (s.empty || 0) + (s.gpl || 0) : 0; }


   updateEditableStock(tn: string, type: string, event: any) {
      const val = event.target.value;
      const key = type + '_' + tn;
      if (val === '' || val === null) {
         delete this.manualStockAdj[key];
      } else {
         this.manualStockAdj[key] = Number(val);
      }
      this.saveStocks();
   }

   getFinalStock(tn: string, f: 'gpl' | 'empty' | 'damaged' | 'toRecover' | 'toReturn'): number {
      const manualKey = f + '_' + tn;
      if (this.manualStockAdj && typeof this.manualStockAdj[manualKey] === 'number' && ['gpl', 'empty', 'damaged'].includes(f)) {
         return this.manualStockAdj[manualKey];
      }

      const type = this.cylinderTypes.find(t => t.name === tn);
      if (!type || !this.initialStock[tn]) return 0;

      // For physical stock columns, we only count REAL movements (not map adjustments)
      const ents = this.getEntriesForType(type.id!, undefined, false);
      const init = this.initialStock[tn];

      if (f === 'gpl') return Math.max(0, (init.gpl || 0) - this.sumEntries(ents, 's_gpl') + this.sumEntries(ents, 'e_gpl'));
      if (f === 'empty') return Math.max(0, (init.empty || 0) - this.sumEntries(ents, 's_vaz') + this.sumEntries(ents, 'e_vaz') - this.sumEntries(ents, 'vz_vend'));
      if (f === 'damaged') return Math.max(0, (init.damaged || 0) - this.sumEntries(ents, 's_av') + this.sumEntries(ents, 'e_av'));

      if (f === 'toRecover') {
         // Debt DOES include map adjustments
         return (init.toRecover || 0) + this.getEntryDiff(type.id!, 'CUSTOMER');
      }
      if (f === 'toReturn') {
         return (init.toReturn || 0) + this.getEntryDiff(type.id!, 'SUPPLIER');
      }
      return 0;
   }


   getEntryDiff(typeId: string, entryType: 'CUSTOMER' | 'SUPPLIER'): number {


      const ents = this.getEntriesForType(typeId, entryType);


      // Caução (vz_vend) também conta como saída de vasilhame


      const out = (Number(ents.reduce((acc, e) => acc + (Number(e.s_gpl) || 0) + (Number(e.s_vaz) || 0) + (Number(e.s_av) || 0) + (entryType === 'CUSTOMER' ? (Number(e.vz_vend) || 0) : 0), 0)));

      const inc = this.sumEntries(ents, 'e_gpl') + this.sumEntries(ents, 'e_vaz') + this.sumEntries(ents, 'e_av');


      if (entryType === 'CUSTOMER') return out - inc;


      return inc - out; // Para fornecedor, diff positiva significa que recebemos mais do que devolvemos


   }


   sumGlobalStock(f: 'gpl' | 'empty' | 'damaged' | 'total' | 'toRecover' | 'toReturn' | 'target'): number {


      return this.cylinderTypes.reduce((acc, t) => {


         if (f === 'target') return acc + (Number(t.inventoryTarget) || 0);


         if (f === 'total') return acc + this.getFinalTotal(t.name);


         return acc + this.getFinalStock(t.name, f);


      }, 0);


   }


   getFinalTotal(tn: string) { return this.getFinalStock(tn, 'gpl') + this.getFinalStock(tn, 'empty') + this.getFinalStock(tn, 'damaged'); }


   getTypeColor(tn: string): string {


      const c: any = {


         '9KG': '#70AD47',  // Green


         '14KG': '#4472C4', // Blue


         '19KG': '#ED7D31', // Orange


         '48KG': '#555', // Gray


         '6KG': '#FFC000',  // Yellow


         '11KG': '#334155', // Slate/Dark Blue (void Purple)


         '45KG': '#C00000', // Red


         '05KG': '#00B0F0'  // Light Blue


      };


      return c[tn] || '#3182ce';


   }


   // SUGGESTION HNDLERS


   onSearchInput(entry: GasDailyEntry, entryType: 'CUSTOMER' | 'SUPPLIER') {


      this.activeSuggestionEntry = entry;


      const query = (entry.customerName || '').toLowerCase().trim();


      if (!query) {


         this.filteredSuggestions = [];


         return;


      }


      const list = entryType === 'CUSTOMER' ? this.customers : this.suppliers;


      this.filteredSuggestions = list.filter(e =>


         e.name.toLowerCase().includes(query) ||


         e.code.toLowerCase().includes(query)


      ).slice(0, 5);


   }


   selectSuggestion(suggestion: any, entry: GasDailyEntry) {
      entry.customerName = suggestion.name;

      // Auto-set priceType based on customer type
      if (suggestion.type) {
         entry.priceType = suggestion.type;
         const cylinderType = this.cylinderTypes.find(t => t.id === entry.cylinderTypeId);
         if (cylinderType) {
            this.recalculateEntry(entry, cylinderType);
         }
      }

      this.filteredSuggestions = [];
      this.activeSuggestionEntry = null;
      this.updateEntry(entry);
   }


   openQuickRegistration() {
      if (!this.control || this.control?.status !== 'OPENED') {
         this.openDay();
         return;
      }
      this.cylinderTypes.forEach(t => {
         this.entries.push({
            controlId: this.control!.id,
            cylinderTypeId: t.id!,
            customerName: '',
            entryType: 'CUSTOMER',
            priceType: 'REVENDEDOR',
            s_gpl: 0, s_vaz: 0, s_av: 0, vz_vend: 0, adc_caucao: 0, e_gpl: 0, e_vaz: 0, e_av: 0, p_divida: 0, totalAmount: 0, gr: false, invoice: false
         });
      });
      this.toaster.showSuccess('Novas Linhas', 'Adicionadas linhas para lançamento.');
      if (this.cdr) this.cdr.detectChanges();
   }

   triggerQuickRegistration(entry: GasDailyEntry, type: 'CUSTOMER' | 'SUPPLIER') {


      this.quickModalType = type;


      this.quickModalName = entry.customerName;


      this.activeSuggestionEntry = entry;


      this.showQuickModal = true;


      this.filteredSuggestions = [];


   }


   handleQuickSave(newEntity: any) {
      if (this.activeSuggestionEntry) {
         this.activeSuggestionEntry.customerName = newEntity.name;

         // Auto-set priceType for the newly created entity
         if (newEntity.type) {
            this.activeSuggestionEntry.priceType = newEntity.type;
            const cylinderType = this.cylinderTypes.find(t => t.id === this.activeSuggestionEntry.cylinderTypeId);
            if (cylinderType) {
               this.recalculateEntry(this.activeSuggestionEntry, cylinderType);
            }
         }

         this.updateEntry(this.activeSuggestionEntry);
         this.loadEntities(); // Refresh local list
      }

      this.showQuickModal = false;
      this.activeSuggestionEntry = null;
      this.filteredSuggestions = [];
   }


   onNameBlur() {
      setTimeout(() => {
         this.activeSuggestionEntry = null;
         this.filteredSuggestions = [];
      }, 250);
   }

   clearSuggestions() {


      // Small delay to allow mousedown on suggestions to trigger first


      setTimeout(() => {


         this.activeSuggestionEntry = null;


         this.filteredSuggestions = [];


      }, 200);


   }


   getCategorizedEntities(category: 'TRBLHDOR' | 'CLIENTE' | 'INSTITUICO' | 'SUPPLIER', entryType: 'CUSTOMER' | 'SUPPLIER') {
      const allEntities: any[] = [];
      const entries = this.entries.filter(e => e.entryType === entryType);

      const namesSet = new Set<string>(entries.map(e => e.customerName).filter(n => n));

      // Use rolled over customerDebts as base for names and initial balances
      const initDebts = this.customerDebts || {};
      Object.keys(initDebts).forEach(k => {
         if (k.includes('_' + entryType + '_')) {
            const name = k.split('_' + entryType + '_')[0];
            if (name) namesSet.add(name);
         }
      });

      const uniqueNames = Array.from(namesSet);
      uniqueNames.forEach(name => {
         const entityCat = this.resolveCategoryByName(name);
         if ((category === 'SUPPLIER' && entityCat === 'SUPPLIER') ||
            (category !== 'SUPPLIER' && entityCat === category)) {
            const entBalances: any = {};
            this.cylinderTypes.forEach(t => {
               const typeEntries = entries.filter(e => e.customerName === name && e.cylinderTypeId === t.id);

               // Get initial debt from previous day's end map
               const debtKey = name + '_' + entryType + '_' + t.name;
               const initDebt = initDebts[debtKey] || 0;

               if (entryType === 'CUSTOMER') {
                  // Net variation today: (OUT + CAUTION) - IN
                  const todayVar = (this.sumEntries(typeEntries, 's_gpl') + this.sumEntries(typeEntries, 's_vaz') + this.sumEntries(typeEntries, 's_av') + this.sumEntries(typeEntries, 'vz_vend'))
                     - (this.sumEntries(typeEntries, 'e_gpl') + this.sumEntries(typeEntries, 'e_vaz') + this.sumEntries(typeEntries, 'e_av'));

                  // Total debt displayed = Previous Debt + Today's Variation
                  entBalances[t.name] = (entBalances[t.name] || 0) + initDebt + todayVar;
               } else {
                  // Devolver balance: In - Out
                  const todayVar = (this.sumEntries(typeEntries, 'e_gpl') + this.sumEntries(typeEntries, 'e_vaz') + this.sumEntries(typeEntries, 'e_av'))
                     - (this.sumEntries(typeEntries, 's_gpl') + this.sumEntries(typeEntries, 's_vaz') + this.sumEntries(typeEntries, 's_av'));

                  entBalances[t.name] = (entBalances[t.name] || 0) + initDebt + todayVar;
               }
            });
            if (Object.values(entBalances).some(v => v !== 0) || this.forceShowMapEntities.has(name + '_' + entryType)) {
               allEntities.push({ name, balances: entBalances });
            }
         }
      });
      return allEntities.sort((a, b) => a.name.localeCompare(b.name));
   }

   computeEndOfDayCustomerDebts(): { [key: string]: number } {
      const debts: { [key: string]: number } = {};
      const allCats: ('TRBLHDOR' | 'CLIENTE' | 'INSTITUICO' | 'SUPPLIER')[] = ['TRBLHDOR', 'CLIENTE', 'INSTITUICO', 'SUPPLIER'];

      allCats.forEach(cat => {
         // For CUSTOMER side
         if (cat !== 'SUPPLIER') {
            const ents = this.getCategorizedEntities(cat as any, 'CUSTOMER');
            ents.forEach(e => {
               this.cylinderTypes.forEach(t => {
                  const val = e.balances[t.name] || 0;
                  if (val !== 0) debts[e.name + '_CUSTOMER_' + t.name] = val;
               });
            });
         }
         // For SUPPLIER side
         if (cat === 'SUPPLIER' || cat === 'CLIENTE' || cat === 'INSTITUICO') {
            const ents = this.getCategorizedEntities(cat as any, 'SUPPLIER');
            ents.forEach(e => {
               this.cylinderTypes.forEach(t => {
                  const val = e.balances[t.name] || 0;
                  if (val !== 0) debts[e.name + '_SUPPLIER_' + t.name] = val;
               });
            });
         }
      });
      return debts;
   }

   sumCategorizedBalances(category: 'TRBLHDOR' | 'CLIENTE' | 'INSTITUICO' | 'SUPPLIER' | 'ALL_REAVER' | 'ALL_DEVOLVER', typeName: string, entryType: 'CUSTOMER' | 'SUPPLIER'): number {
      if (category === 'ALL_REAVER') {
         const catList: ('TRBLHDOR' | 'CLIENTE' | 'INSTITUICO' | 'SUPPLIER')[] = ['TRBLHDOR', 'CLIENTE', 'INSTITUICO', 'SUPPLIER'];
         return catList.reduce((acc, cat) => acc + this.sumCategorizedBalances(cat, typeName, 'CUSTOMER'), 0);
      }
      if (category === 'ALL_DEVOLVER') {
         const catList: ('SUPPLIER' | 'INSTITUICO' | 'CLIENTE')[] = ['SUPPLIER', 'INSTITUICO', 'CLIENTE'];
         return catList.reduce((acc, cat) => acc + this.sumCategorizedBalances(cat, typeName, 'SUPPLIER'), 0);
      }
      const ents = this.getCategorizedEntities(category as any, entryType) || [];
      return ents.reduce((acc, e) => acc + (Number((e.balances || {})[typeName]) || 0), 0);
   }

   getManeioCalculated(tn: string): number {
      // CALCULADO = O que deve estar fisicamente no armazém
      return this.getFinalTotal(tn); // total de cheias + vazias + avariadas
   }

   getManeioDifference(tn: string): number {
      const fundo = Number(this.physicalManeio[tn]) || 0; // Físico contado hoje
      const stock = this.getManeioCalculated(tn); // Stock teórico
      const reaver = this.sumCategorizedBalances('ALL_REAVER', tn, 'CUSTOMER');
      const devolver = this.sumCategorizedBalances('ALL_DEVOLVER', tn, 'SUPPLIER');

      // USER FORMULA: Físico - Calculado - Reaver + Devolver
      return fundo - stock - reaver + devolver;
   }

   getKitDifference(): number {
      const fisico = Number(this.physicalManeio['kit']) || 0;
      const calculado = this.getKitSum('ing') - this.getKitSum('out');
      return fisico - calculado;
   }


   resolveCategoryByName(name: string): 'TRBLHDOR' | 'INSTITUICO' | 'CLIENTE' | 'SUPPLIER' {


      const supplier = this.suppliers.find(s => s.name?.toLowerCase() === name?.toLowerCase());


      if (supplier) return 'SUPPLIER';


      const cust: any = this.customers.find(c => c.name?.toLowerCase() === name?.toLowerCase());


      if (!cust) return 'CLIENTE';


      if (cust.category === 'TRBLHDOR' || cust.category === 'INSTITUICO') return cust.category;


      return 'CLIENTE';


   }


   updateInventoryValue(name: string, type: GasCylinderType, event: any, typeId: 'CUSTOMER' | 'SUPPLIER') {
      const newVal = Math.max(0, parseInt((event.target as HTMLInputElement).value) || 0);

      // Calculate current account balance
      const allEnts = this.entries.filter(e => e.customerName === name && e.cylinderTypeId === type.id && e.entryType === typeId);
      const initDebt = typeId === 'CUSTOMER'
         ? (this.customerDebts[name + '_CUSTOMER_' + type.name] || 0)
         : (this.customerDebts[name + '_SUPPLIER_' + type.name] || 0);

      let currentAccountBalance = initDebt;
      if (typeId === 'CUSTOMER') {
         currentAccountBalance += allEnts.reduce((acc, e) => acc + (Number(e.s_gpl) || 0) + (Number(e.s_vaz) || 0) + (Number(e.s_av) || 0) + (Number(e.vz_vend) || 0) - ((Number(e.e_gpl) || 0) + (Number(e.e_vaz) || 0) + (Number(e.e_av) || 0)), 0);
      } else {
         currentAccountBalance += allEnts.reduce((acc, e) => acc + (Number(e.e_gpl) || 0) + (Number(e.e_vaz) || 0) + (Number(e.e_av) || 0) - ((Number(e.s_gpl) || 0) + (Number(e.s_vaz) || 0) + (Number(e.s_av) || 0)), 0);
      }

      const diff = newVal - currentAccountBalance;
      if (diff === 0) return;

      // IMMEDIATE ADJUSTMENT
      let entry = allEnts.find(e =>
         (Number(e.totalAmount) || 0) === 0 && (Number(e.vz_vend) || 0) === 0 &&
         (Number(e.adc_caucao) || 0) === 0 && (Number(e.p_divida) || 0) === 0
      );

      if (!entry) {
         entry = {
            customerName: name, cylinderTypeId: type.id!, entryType: typeId,
            controlId: this.control?.id, s_gpl: 0, s_vaz: 0, s_av: 0, e_gpl: 0, e_vaz: 0, e_av: 0,
            vz_vend: 0, adc_caucao: 0, p_divida: 0, totalAmount: 0, gr: false, invoice: false,
            priceType: 'REVENDEDOR'
         } as GasDailyEntry;
         (entry as any).isAdj = true;
         this.entries.push(entry);
      } else {
         (entry as any).isAdj = true;
      }

      if (typeId === 'CUSTOMER') {
         if (diff > 0) entry.s_gpl = (Number(entry.s_gpl) || 0) + diff;
         else entry.e_gpl = (Number(entry.e_gpl) || 0) - diff;
      } else {
         if (diff > 0) entry.e_gpl = (Number(entry.e_gpl) || 0) + diff;
         else entry.s_gpl = (Number(entry.s_gpl) || 0) - diff;
      }

      this.updateEntry(entry);
      this.cdr.detectChanges();
   }
   clearEntityEntries(name: string, entryType: 'CUSTOMER' | 'SUPPLIER') {

      if (confirm(`Remover todos os registos pendentes de ${name}?`)) {

         this.forceShowMapEntities.delete(name + '_' + entryType);

         const cid = this.dataService.getCompanyId();

         // Delete from server ONLY for this specific table (entryType)
         const toDelete = this.entries.filter(e => e.customerName === name && e.entryType === entryType && e.id && cid);
         toDelete.forEach(e => {
            if (cid && e.id) {
               this.gasService.deleteEntry(e.id, cid).subscribe();
            }
         });

         // Remove from UI only for this specific table
         this.entries = this.entries.filter(e => !(e.customerName === name && e.entryType === entryType));

         this.toaster.showSuccess('Sucesso', `Registos de ${name} removidos.`);
         this.saveStocks();
         this.cdr.detectChanges();

      }

   }


   onInventorySearchInput(searchKey: string, entryType: 'CUSTOMER' | 'SUPPLIER') {


      this.activeSearchKey = searchKey;
      const query = this.inventorySearch[searchKey]?.toLowerCase() || '';


      if (query.length < 2) {


         this.suggestedInventoryEntities = [];


         return;


      }


      if (entryType === 'CUSTOMER') {


         this.suggestedInventoryEntities = this.customers


            .filter(c => c.name?.toLowerCase().includes(query))


            .map(c => ({ name: c.name, category: (c as any).category }));


      } else {


         this.suggestedInventoryEntities = this.suppliers


            .filter(s => s.name?.toLowerCase().includes(query))


            .map(s => ({ name: s.name, category: 'SUPPLIER' }));


      }


   }


   selectInventorySuggestion(s: any, searchKey: string) {


      this.inventorySearch[searchKey] = s.name;


      this.suggestedInventoryEntities = [];


      this.activeSearchKey = null;

   }


   triggerQuickRegistrationFromMap(searchKey: string, entryType: 'CUSTOMER' | 'SUPPLIER') {
      const mockEntry = { customerName: this.inventorySearch[searchKey] } as unknown as GasDailyEntry;
      this.triggerQuickRegistration(mockEntry, entryType);
   }


   commitInventoryEntry(cat: string, searchKey: string, cylinderType: GasCylinderType, entryType: 'CUSTOMER' | 'SUPPLIER') {
      const name = this.inventorySearch[searchKey];
      if (!name) return;

      this.forceShowMapEntities.add(name + '_' + entryType);

      const cid = this.dataService.getCompanyId();

      // Only update category logic (no migrating entries between types)
      const cust: any = this.customers.find(c => c.name?.toLowerCase() === name.toLowerCase());
      if (cust && cust.category !== cat && cat !== 'SUPPLIER') {
         cust.category = cat;
         this.customerService.updateCustomer(cust);
      }

      // Check if entry already exists
      const exists = this.entries.find(e => e.customerName === name && e.cylinderTypeId === cylinderType.id && e.entryType === entryType);

      if (!exists) {
         const newEntry: GasDailyEntry = {
            customerName: name,
            cylinderTypeId: cylinderType.id!,
            entryType: entryType,
            controlId: this.control?.id,
            s_gpl: 0, s_vaz: 0, s_av: 0, e_gpl: 0, e_vaz: 0, e_av: 0,
            vz_vend: 0, adc_caucao: 0, p_divida: 0, totalAmount: 0, gr: false, invoice: false,
            priceType: 'CONSUMIDOR'
         };

         if (cid) {
            // Optimistic update for UI responsiveness
            const tempEntry = { ...newEntry };
            this.entries.push(tempEntry);
            this.inventorySearch[searchKey] = '';
            this.cdr.detectChanges();

            this.gasService.saveEntry(newEntry, cid).subscribe(saved => {
               const idx = this.entries.indexOf(tempEntry);
               if (idx > -1) this.entries[idx] = saved;
               this.saveStocks(); // Trigger stock summary update
               this.cdr.detectChanges();
            });
         } else {
            this.entries.push(newEntry);
            this.cdr.detectChanges();
         }
      }

      this.inventorySearch[searchKey] = '';
      this.clearSuggestions();
   }


}