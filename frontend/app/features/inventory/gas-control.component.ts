import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GasService, GasCylinderType, GasDailyEntry } from '../../services/gas.service';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gas-control',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="h-full flex flex-col bg-[#E5E7EB] font-sans text-gray-800 overflow-hidden">
      <!-- Toolbar -->
      <div class="bg-white border-b border-gray-300 px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
        <div class="flex items-center gap-4">
           <div class="flex items-center gap-2">
             <div class="p-1.5 bg-blue-600 rounded text-white italic font-black text-sm tracking-tighter shadow-inner">GESt-GAS</div>
             <h1 class="text-sm font-bold text-gray-600 uppercase tracking-widest">Movimento Geral Diário do Armazém</h1>
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
             <span class="text-[10px] font-bold text-amber-700 animate-pulse">A PROCESSAR...</span>
           </div>

           <button (click)="saveStocks()" class="flex items-center gap-2 px-5 py-1.5 bg-emerald-600 text-white rounded font-black text-xs hover:bg-emerald-700 transition-all shadow-md active:scale-95 uppercase tracking-wider">
             <app-icon name="save" [size]="16"></app-icon> Gravar Tudo
           </button>
        </div>
      </div>

      <!-- Main Spreadsheet Area -->
      <div class="flex-1 overflow-auto p-4 space-y-12 pb-24">
        
        <!-- HEADER SUMMARY: Initial and Final Stock -->
        <div class="flex flex-wrap gap-6 items-start">
           
           <!-- Stock Inicial Table -->
           <div class="bg-white border border-gray-400 shadow-sm border-l-4 border-l-orange-400 font-sans">
             <div class="bg-[#70AD47] px-3 py-1 border-b border-gray-400">
                <span class="text-[11px] font-black text-white uppercase italic">Stock Inicial (ABERTURA)</span>
             </div>
             <table class="border-collapse text-[11px]">
               <thead class="bg-gray-100 font-bold border-b border-gray-400">
                 <tr class="divide-x divide-gray-400">
                   <th class="p-1.5 w-24 text-left font-black tracking-tighter">{{ currentYear }}</th>
                   <th *ngFor="let t of cylinderTypes" class="p-1.5 w-16 text-center whitespace-nowrap">{{ t.name }}</th>
                 </tr>
               </thead>
               <tbody class="divide-y divide-gray-300 text-center">
                 <tr class="divide-x divide-gray-300 hover:bg-gray-50">
                   <td class="p-1 px-2 font-bold bg-gray-50 uppercase tracking-tighter text-gray-400 font-mono text-left">AV-</td>
                   <td *ngFor="let t of cylinderTypes" class="p-0">
                     <input type="number" [(ngModel)]="initialStock[t.name].damaged" class="w-full text-center p-1 bg-transparent border-none font-bold focus:bg-amber-50">
                   </td>
                 </tr>
                 <tr class="divide-x divide-gray-300 hover:bg-gray-50">
                   <td class="p-1 px-2 font-bold bg-gray-50 uppercase tracking-tighter text-gray-400 font-mono text-left">VZ-</td>
                   <td *ngFor="let t of cylinderTypes" class="p-0">
                     <input type="number" [(ngModel)]="initialStock[t.name].empty" class="w-full text-center p-1 bg-transparent border-none font-bold focus:bg-amber-50">
                   </td>
                 </tr>
                 <tr class="divide-x divide-gray-300 hover:bg-gray-50">
                   <td class="p-1 px-2 font-bold bg-gray-50 uppercase tracking-tighter text-gray-600 font-mono text-left">GPL-</td>
                   <td *ngFor="let t of cylinderTypes" class="p-0">
                     <input type="number" [(ngModel)]="initialStock[t.name].gpl" class="w-full text-center p-1 bg-transparent border-none font-black text-blue-800 focus:bg-blue-50">
                   </td>
                 </tr>
                 <tr class="bg-[#70AD47]/20 divide-x divide-gray-400 font-black">
                   <td class="p-1.5 px-2 bg-[#70AD47]/40 uppercase tracking-tighter text-[9px] text-left">TOTAL INV.</td>
                   <td *ngFor="let t of cylinderTypes" class="p-1.5 text-center text-emerald-900 font-mono">
                     {{ getInitialTotal(t.name) }}
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>

           <!-- Stock Final Table -->
           <div class="bg-white border border-gray-400 shadow-sm border-r-4 border-r-emerald-500 font-sans">
             <div class="bg-[#E2EFDA] px-3 py-1 border-b border-gray-400">
                <span class="text-[11px] font-black text-emerald-800 uppercase italic">Stock Final (FECHO)</span>
             </div>
             <table class="border-collapse text-[11px]">
               <thead class="bg-gray-100 font-bold border-b border-gray-400">
                 <tr class="divide-x divide-gray-400">
                   <th class="p-1.5 w-24 text-left font-black text-gray-400 italic font-mono tracking-tighter">Calculado</th>
                   <th *ngFor="let t of cylinderTypes" class="p-1.5 w-16 text-center whitespace-nowrap">{{ t.name }}</th>
                 </tr>
               </thead>
               <tbody class="divide-y divide-gray-300 text-center">
                 <tr class="divide-x divide-gray-300 hover:bg-gray-50">
                   <td class="p-1 px-2 font-bold bg-gray-50 uppercase tracking-tighter text-gray-400 font-mono text-left">AV-</td>
                   <td *ngFor="let t of cylinderTypes" class="p-1 text-center font-bold">
                     {{ getFinalStock(t.name, 'damaged') }}
                   </td>
                 </tr>
                 <tr class="divide-x divide-gray-300 hover:bg-gray-50">
                   <td class="p-1 px-2 font-bold bg-gray-50 uppercase tracking-tighter text-gray-400 font-mono text-left">VZ-</td>
                   <td *ngFor="let t of cylinderTypes" class="p-1 text-center font-bold">
                     {{ getFinalStock(t.name, 'empty') }}
                   </td>
                 </tr>
                 <tr class="divide-x divide-gray-300 hover:bg-gray-50">
                   <td class="p-1 px-2 font-bold bg-gray-50 uppercase tracking-tighter text-gray-600 font-mono text-left">GPL-</td>
                   <td *ngFor="let t of cylinderTypes" class="p-1 text-center font-black text-emerald-700">
                     {{ getFinalStock(t.name, 'gpl') }}
                   </td>
                 </tr>
                 <tr class="bg-[#E2EFDA] divide-x divide-gray-400 font-black text-emerald-900 text-center">
                   <td class="p-1.5 px-2 bg-emerald-200/50 uppercase tracking-tighter font-mono text-[9px] text-left">T. FECHO</td>
                   <td *ngFor="let t of cylinderTypes" class="p-1.5 text-center font-mono">
                     {{ getFinalTotal(t.name) }}
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>

        </div>

        <!-- MOVEMENTS SECTIONS BY BRAND -->
        <div *ngFor="let brand of ['PETROGAS', 'GALP']" class="space-y-10">
           <div class="flex items-center gap-3">
             <div class="w-12 h-1.5 rounded" [class]="brand === 'PETROGAS' ? 'bg-amber-500' : 'bg-orange-600'"></div>
             <h2 class="font-black text-2xl uppercase italic tracking-tighter" [class]="brand === 'PETROGAS' ? 'text-amber-700' : 'text-orange-700'">{{ brand }}</h2>
           </div>
           
           <div *ngFor="let t of getTypesByBrand(brand)" class="space-y-4">
             <div class="flex items-center gap-4 bg-gray-100 p-2 border-l-8" [style.border-left-color]="getTypeColor(t.name)">
               <div class="px-5 py-1 rounded font-black text-white text-sm shadow-sm" [style.background-color]="getTypeColor(t.name)">{{ t.name }}</div>
               
               <div class="flex items-center gap-6 ml-8">
                 <div class="flex flex-col">
                   <span class="text-[7px] font-black uppercase text-gray-500">Revendedor</span>
                   <input type="number" [(ngModel)]="t.priceRevendedor" (change)="saveTypePrice(t)" class="w-16 bg-white border border-gray-300 px-2 py-0.5 rounded text-[10px] font-black">
                 </div>
                 <div class="flex flex-col">
                   <span class="text-[7px] font-black uppercase text-gray-500">Bomba</span>
                   <input type="number" [(ngModel)]="t.priceBomba" (change)="saveTypePrice(t)" class="w-16 bg-white border border-gray-300 px-2 py-0.5 rounded text-[10px] font-black">
                 </div>
                 <div class="flex flex-col">
                   <span class="text-[7px] font-black uppercase text-gray-500">Consumidor</span>
                   <input type="number" [(ngModel)]="t.priceConsumidor" (change)="saveTypePrice(t)" class="w-16 bg-white border border-gray-300 px-2 py-0.5 rounded text-[10px] font-black">
                 </div>
               </div>
               
               <div class="ml-auto flex gap-2">
                 <button (click)="addEntry(t, 'SUPPLIER')" class="px-4 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded font-black text-[9px] uppercase hover:bg-orange-100 shadow-sm active:scale-95 transition-all">Carga Fornecedor</button>
                 <button (click)="addEntry(t, 'CUSTOMER')" class="px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-black text-[9px] uppercase hover:bg-blue-100 shadow-sm active:scale-95 transition-all">Venda Cliente</button>
               </div>
             </div>

             <!-- Fornecedor Table -->
             <div *ngIf="getEntriesForType(t.id!, 'SUPPLIER').length > 0" class="bg-orange-50/20 border border-orange-100 rounded p-3 space-y-2">
                <div class="bg-white border border-orange-200 shadow-sm overflow-hidden rounded">
                   <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!, 'SUPPLIER'), type: t, isSupplier: true }"></ng-container>
                </div>
             </div>

             <!-- Cliente Table -->
             <div class="bg-white border border-gray-400 shadow-sm overflow-hidden rounded">
                <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!, 'CUSTOMER'), type: t, isSupplier: false }"></ng-container>
             </div>
           </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-12 mb-12">
            
           <!-- FECHO DE CAIXA SECTION -->
           <div class="bg-white border-2 border-blue-200 shadow-xl rounded-2xl p-6 space-y-8 relative overflow-hidden">
              <div class="flex items-center justify-between border-b-2 border-blue-50 pb-6">
                 <div class="flex items-center gap-4 text-blue-700">
                    <div class="p-3 bg-blue-50 rounded-2xl shadow-inner"><app-icon name="account_balance_wallet" [size]="32"></app-icon></div>
                    <div class="flex flex-col">
                       <h3 class="font-black text-xl uppercase tracking-widest leading-none">Fecho de Caixa Físico</h3>
                       <span class="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">Conferência Real do Numerário</span>
                    </div>
                 </div>
                 <div class="flex gap-4">
                    <div class="flex flex-col items-end">
                       <span class="text-[10px] font-black text-blue-800 uppercase tracking-tighter italic leading-none">Total Físico</span>
                       <div class="px-4 py-1 text-blue-600 bg-blue-50 rounded-lg font-black text-xl font-mono border border-blue-100">
                         {{ getPhysicalTotal() | number:'1.2-2' }}
                       </div>
                    </div>
                    <div class="flex flex-col items-end">
                       <span class="text-[10px] font-black text-emerald-700 uppercase tracking-tighter italic leading-none">Saldo p/ Amanhã</span>
                       <div class="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-3xl font-mono shadow-lg border-2 border-emerald-400 mt-1">
                         {{ (getPhysicalTotal() - (cashHandover || 0)) | number:'1.2-2' }} <small class="text-xs">MT</small>
                       </div>
                    </div>
                 </div>
              </div>

              <div class="grid grid-cols-2 gap-8">
                 <div class="space-y-6">
                    <div class="p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                       <h4 class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">Contagem de Notas</h4>
                       <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div *ngFor="let bill of denominations" class="flex items-center justify-between bg-white pl-3 pr-1 py-1 rounded-lg border border-gray-200 group hover:border-blue-300 transition-all shadow-sm">
                             <span class="font-black text-blue-700 text-xs font-mono leading-none">{{ bill }}</span>
                             <div class="flex items-center">
                                <span class="text-[8px] font-bold text-gray-300 mr-1">x</span>
                                <input type="number" [(ngModel)]="cashNotes[bill]" class="w-12 text-right bg-transparent border-none p-0 mr-1 text-xs font-black text-gray-700 focus:ring-0" placeholder="0">
                             </div>
                          </div>
                       </div>
                       <div class="mt-4 space-y-2">
                          <div class="flex items-center justify-between bg-blue-100/50 p-2 rounded-lg border border-blue-200 font-black">
                             <span class="text-[9px] text-blue-700 uppercase tracking-widest">Moedas</span>
                             <input type="number" [(ngModel)]="cashCoins" class="w-24 text-right bg-white border border-blue-300 rounded px-2 py-1 text-xs shadow-inner">
                          </div>
                          <div class="flex items-center justify-between bg-emerald-100/50 p-2 rounded-lg border border-emerald-200 font-black">
                             <span class="text-[9px] text-emerald-700 uppercase tracking-widest">Valor Direto (Mão)</span>
                             <input type="number" [(ngModel)]="cashDirectTotal" class="w-24 text-right bg-white border border-emerald-300 rounded px-2 py-1 text-xs shadow-inner">
                          </div>
                       </div>
                    </div>

                    <div class="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100 shadow-inner space-y-4">
                       <div class="flex items-center justify-between bg-white p-2.5 rounded-lg border border-indigo-200 shadow-sm">
                          <span class="text-[10px] font-black text-indigo-700 uppercase italic leading-none">Total POS</span>
                          <input type="number" [(ngModel)]="cashPOS" class="w-24 text-right bg-indigo-50/50 border-none rounded px-2 py-1 text-xs font-black text-indigo-800">
                       </div>
                       <div class="space-y-2">
                          <div class="flex items-center justify-between text-[10px] font-black text-indigo-400 uppercase italic px-1">
                             <span>Depósitos Bancários</span>
                             <button (click)="addBankDeposit()" class="p-1 px-2.5 bg-indigo-600 text-white rounded font-black text-[9px] uppercase active:scale-95">+</button>
                          </div>
                          <div class="max-h-[120px] overflow-y-auto space-y-2 px-1">
                             <div *ngFor="let dep of bankDeposits; let i = index" class="bg-white border border-indigo-100 rounded-lg p-2 shadow-sm space-y-2 group">
                                <div class="flex gap-2">
                                   <input type="text" [(ngModel)]="dep.bankName" placeholder="Banco..." class="flex-1 bg-gray-50 border-none rounded px-2 py-1 text-[9px] font-black uppercase">
                                   <input type="number" [(ngModel)]="dep.value" class="w-20 bg-emerald-50 border-none rounded px-2 py-1 text-[10px] font-black text-emerald-800 text-right">
                                   <button (click)="removeBankDeposit(i)" class="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><app-icon name="close" [size]="14"></app-icon></button>
                                </div>
                                <input type="text" [(ngModel)]="dep.depositor" placeholder="Quem depositou?" class="w-full bg-gray-50 border-none rounded px-2 py-1 text-[9px] font-bold text-gray-400 italic">
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <!-- Resumo Matemático -->
                 <div class="space-y-6">
                    <div class="p-4 bg-amber-50 rounded-xl border-l-4 border-amber-400 shadow-inner">
                       <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1">Abertura / Saldo de Ontem</span>
                       <div class="flex justify-between items-center">
                          <span class="text-xs font-bold text-gray-400 italic">Entrada inicial de caixa:</span>
                          <span class="text-xl font-mono font-black text-amber-700">{{ openingCash | number:'1.2-2' }} MT</span>
                       </div>
                    </div>

                    <div class="p-5 bg-white rounded-2xl border border-gray-200 shadow-lg space-y-4">
                       <div class="flex justify-between items-center text-xs font-black border-b pb-2">
                          <span class="text-blue-500 uppercase">Recebimentos do Dia:</span>
                          <span class="font-mono text-blue-700">(+) {{ (getGlobalTotal() + getCollectionsTotal()) | number:'1.2-2' }} MT</span>
                       </div>
                       <div class="flex justify-between items-center text-xs font-black text-rose-500 border-b pb-2">
                          <span>Despesas e Vales:</span>
                          <span class="font-mono">(-) {{ getExpensesTotal() | number:'1.2-2' }} MT</span>
                       </div>
                       <div class="flex justify-between items-center text-xs font-black text-orange-600 border-b pb-2">
                          <span class="uppercase italic">Remessa à Sede/Circusal:</span>
                          <input type="number" [(ngModel)]="cashHandover" class="w-28 text-right bg-orange-50 border-none rounded-lg px-2 py-1 text-sm font-black focus:ring-1 focus:ring-orange-400 shadow-inner">
                       </div>
                       <div class="flex justify-between pt-2 text-[10px] font-black uppercase text-gray-900 border-t border-gray-100">
                          <span>Saldo Esperado (Sistema):</span>
                          <span class="text-xl font-mono underline decoration-double">{{ getExpectedBalance() | number:'1.2-2' }} MT</span>
                       </div>
                    </div>

                    <!-- DISCREPÂNCIA -->
                    <div class="p-5 rounded-2xl border-2 flex items-center justify-between transition-all shadow-xl" 
                         [class]="getDiscrepancy() < -1 ? 'bg-rose-50 border-rose-200 text-rose-700' : (getDiscrepancy() > 1 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700')">
                       <div class="flex flex-col">
                          <span class="text-[9px] font-black uppercase tracking-[0.2em]">
                             {{ getDiscrepancy() < -1 ? 'Quebra (Falta Dinheiro)' : (getDiscrepancy() > 1 ? 'Sobra (Excesso)' : 'Caixa Batido (Certinho)') }}
                          </span>
                          <span class="text-[11px] font-bold text-gray-400 italic">Diferença Físico vs Sistema</span>
                       </div>
                       <span class="text-2xl font-mono font-black tabular-nums">{{ getDiscrepancy() | number:'1.2-2' }} MT</span>
                    </div>
                 </div>
              </div>
           </div>

           <!-- WASILHAME & AVARIAS -->
           <div class="space-y-8">
              <!-- Vasilhame Exterior Table -->
              <div class="bg-white border-2 border-emerald-200 shadow-xl rounded-2xl p-6">
                 <div class="flex items-center gap-4 text-emerald-700 mb-6 border-b pb-4">
                    <div class="p-2.5 bg-emerald-50 rounded-xl"><app-icon name="inventory_2" [size]="28"></app-icon></div>
                    <div class="flex flex-col">
                       <h3 class="font-black text-lg uppercase tracking-widest leading-none">Vasilhame Exterior</h3>
                       <span class="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Garrafas Vazias em Dívida</span>
                    </div>
                 </div>
                 <table class="w-full text-[11px] font-bold">
                    <tbody class="divide-y divide-gray-100">
                       <tr *ngFor="let t of cylinderTypes" class="hover:bg-emerald-50/20 transition-colors">
                          <td class="p-3 uppercase tracking-tighter flex items-center gap-2">
                             <div class="w-3 h-3 rounded" [style.background-color]="getTypeColor(t.name)"></div>
                             {{ t.name }} <span class="text-gray-400 text-[9px] font-mono italic">({{ t.brand }})</span>
                          </td>
                          <td class="p-0 text-right">
                             <input type="number" [(ngModel)]="externalEmpties[t.name]" class="w-24 text-center border-none font-black text-emerald-700 bg-transparent py-3 focus:bg-emerald-50 shadow-inner">
                          </td>
                       </tr>
                    </tbody>
                 </table>
              </div>

              <!-- Avarias -->
              <div class="bg-white border-2 border-amber-200 shadow-xl rounded-2xl p-6">
                 <div class="flex items-center justify-between mb-6 border-b pb-4 text-amber-700">
                    <div class="flex items-center gap-3">
                       <div class="p-2.5 bg-amber-50 rounded-xl"><app-icon name="report_problem" [size]="28"></app-icon></div>
                       <h3 class="font-black text-lg uppercase tracking-widest">Avarias Técnicas</h3>
                    </div>
                    <button (click)="addDamagedLog()" class="px-5 py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95">+</button>
                 </div>
                 <div class="space-y-3">
                    <div *ngFor="let log of damagedLog; let i = index" class="flex items-center gap-3 bg-gray-50 p-2 rounded-xl group transition-all shadow-sm">
                       <select [(ngModel)]="log.typeName" class="bg-white border-none shadow-inner rounded text-[10px] uppercase px-2 py-2 font-black min-w-[100px]">
                          <option *ngFor="let t of cylinderTypes" [value]="t.name">{{ t.name }}</option>
                       </select>
                       <input type="text" [(ngModel)]="log.fault" placeholder="Problema (ex: Fuga, Amassada...)" class="flex-1 bg-white border-none shadow-inner rounded text-[10px] font-bold px-3 py-2">
                       <input type="number" [(ngModel)]="log.qty" class="w-12 bg-white border-none shadow-inner rounded text-xs font-black text-amber-700 text-center py-2">
                       <button (click)="removeDamagedLog(i)" class="text-gray-300 hover:text-amber-600 px-1"><app-icon name="close" [size]="18"></app-icon></button>
                    </div>
                    <div *ngIf="damagedLog.length === 0" class="p-10 text-center text-gray-300 italic uppercase text-[10px] tracking-widest">Sem avarias registadas</div>
                 </div>
              </div>
           </div>
        </div>

      </div>

      <!-- GLOBAL FOOTER -->
      <div class="bg-white border-t-4 border-emerald-500 p-4 px-12 flex justify-end items-center gap-12 shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.3)] shrink-0 z-[120] relative backdrop-blur-sm bg-white/95">
         <div class="flex flex-col items-end border-l border-gray-100 pl-8">
            <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 italic font-mono">LIQUIDAÇÕES (DIA)</span>
            <span class="text-2xl font-black text-blue-600 font-mono italic tracking-tighter">{{ (getGlobalTotal() + getCollectionsTotal()) | number:'1.2-2' }} <small class="text-[10px] opacity-40 font-sans NOT-italic">MT</small></span>
         </div>
         <div class="flex flex-col items-end border-l-4 border-emerald-600 pl-8 font-sans">
            <span class="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1 font-mono italic">VENDAS TOTAIS</span>
            <span class="text-3xl font-black text-emerald-700 font-mono drop-shadow-lg tracking-tighter">{{ getGlobalTotal() | number:'1.2-2' }} <small class="text-sm font-sans font-black opacity-30 NOT-italic">MT</small></span>
         </div>
         <!-- SALDO FINAL DE CAIXA -->
         <div class="flex flex-col items-end border-l-8 border-blue-800 pl-10 font-sans">
            <span class="text-[11px] font-black text-blue-800 uppercase tracking-widest leading-none mb-1 font-mono italic">FECHO DE CAIXA (LÍQUIDO)</span>
            <div class="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-8 py-2 rounded-xl shadow-2xl flex flex-col items-end border-2 border-blue-400/30">
                <span class="text-5xl font-black font-mono tracking-tighter drop-shadow-md">{{ (getPhysicalTotal() - (cashHandover || 0)) | number:'1.2-2' }} <small class="text-xs font-sans font-black opacity-60">MT</small></span>
                <span class="text-[9px] font-bold uppercase tracking-widest text-blue-200 mt-1">Disponível para abertura de amanhã</span>
            </div>
         </div>
      </div>
    </div>

    <!-- REUSABLE TABLE TEMPLATE -->
    <ng-template #movementTable let-entries="entries" let-t="type" let-isSupplier="isSupplier">
       <div class="overflow-x-auto">
          <table class="w-full text-[11px] border-collapse">
            <thead [class]="isSupplier ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'" class="font-black text-[9px] uppercase tracking-tighter text-center">
              <tr class="divide-x divide-white/20 border-b border-gray-400">
                <th class="p-3 text-left px-5 min-w-[220px] italic tracking-widest">{{ isSupplier ? 'FORNECEDOR / OPERADOR' : 'CLIENTE / ENTIDADE' }}</th>
                <th *ngIf="!isSupplier" class="p-2 w-28 bg-gray-300 text-gray-700">TIPO PREÇO</th>
                <th class="p-2 w-16" [class]="isSupplier ? 'bg-orange-700' : 'bg-amber-50'">S/GPL</th>
                <th class="p-2 w-16" [class]="isSupplier ? 'bg-orange-700' : 'bg-amber-50'">S/VAZ</th>
                <th class="p-2 w-16" [class]="isSupplier ? 'bg-orange-700' : 'bg-amber-50'">S/AV</th>
                <th class="p-2 w-16" [class]="isSupplier ? 'bg-blue-600' : 'bg-blue-100/50 text-blue-800 font-mono italic'">VZ-VEND</th>
                <th class="p-2 w-20" [class]="isSupplier ? 'bg-blue-600' : 'bg-blue-100/50 text-blue-800 font-mono italic'">CAUÇÃO</th>
                <th class="p-2 w-16" [class]="isSupplier ? 'bg-emerald-600' : 'bg-emerald-50'">E./GPL</th>
                <th class="p-2 w-16" [class]="isSupplier ? 'bg-emerald-600' : 'bg-emerald-50'">E/VAZ</th>
                <th class="p-2 w-16" [class]="isSupplier ? 'bg-emerald-600' : 'bg-emerald-50'">E./AV</th>
                <th class="p-2 w-24" [class]="isSupplier ? 'bg-pink-600' : 'bg-pink-50 text-pink-800 font-mono italic font-black'">P. DÍVIDA</th>
                <th class="p-2 w-36 bg-gray-800 text-white font-mono uppercase italic tracking-tighter">TOTAL MT</th>
                <th class="p-2 w-10 bg-white border-none"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr *ngFor="let e of entries" class="divide-x divide-gray-100 hover:bg-blue-50/30 group transition-all">
                <td class="p-0 border-l-4 border-l-transparent group-hover:border-l-blue-400">
                  <input type="text" [(ngModel)]="e.customerName" (blur)="updateEntry(e)" [placeholder]="isSupplier ? 'Motorista / Carga...' : 'Nome do Cliente...'" class="w-full px-5 py-2.5 bg-transparent border-none text-[11px] font-black focus:ring-0">
                </td>
                <td *ngIf="!isSupplier" class="p-0">
                  <select [(ngModel)]="e.priceType" (change)="recalculateEntry(e, t)" class="w-full px-3 py-2.5 bg-gray-50/50 border-none text-[10px] font-black text-gray-500 uppercase focus:ring-0 cursor-pointer">
                    <option value="REVENDEDOR">Revendedor</option>
                    <option value="BOMBA">Bomba</option>
                    <option value="CONSUMIDOR">Consumidor</option>
                  </select>
                </td>
                <td class="p-0"><input type="number" [(ngModel)]="e.s_gpl" (change)="recalculateEntry(e, t)" class="w-full text-center p-2.5 bg-transparent border-none font-black text-amber-700 shadow-inner"></td>
                <td class="p-0"><input type="number" [(ngModel)]="e.s_vaz" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none"></td>
                <td class="p-0"><input type="number" [(ngModel)]="e.s_av" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none"></td>
                <td class="p-0 bg-blue-50/20"><input type="number" [(ngModel)]="e.vz_vend" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none font-black text-blue-700 italic"></td>
                <td class="p-0 bg-blue-50/20"><input type="number" [(ngModel)]="e.adc_caucao" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none font-black text-blue-700 italic font-mono"></td>
                <td class="p-0"><input type="number" [(ngModel)]="e.e_gpl" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none font-black text-emerald-700 shadow-inner"></td>
                <td class="p-0"><input type="number" [(ngModel)]="e.e_vaz" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none"></td>
                <td class="p-0"><input type="number" [(ngModel)]="e.e_av" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none"></td>
                <td class="p-0 bg-pink-50/20 font-black"><input type="number" [(ngModel)]="e.p_divida" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none text-pink-700 font-mono"></td>
                <td class="p-0 bg-gray-700 group-hover:bg-gray-800 transition-colors border-l-2 border-gray-600 shadow-xl">
                  <div class="px-4 py-2.5 text-right font-mono font-bold text-emerald-400 text-sm tracking-widest drop-shadow-sm tabular-nums">{{ e.totalAmount | number:'1.2-2' }}</div>
                </td>
                <td class="p-0 text-center bg-white border-none">
                  <button (click)="removeEntry(e)" class="text-gray-200 hover:text-red-600 p-2.5 opacity-0 group-hover:opacity-100 transition-all"><app-icon name="close" [size]="18"></app-icon></button>
                </td>
              </tr>
              <tr *ngIf="entries.length === 0" class="divide-x divide-gray-100">
                 <td [attr.colspan]="isSupplier ? 12 : 13" class="p-16 text-center text-gray-200 italic font-black uppercase tracking-[0.5em] bg-gray-50/20 select-none">Sem movimentos</td>
              </tr>
              <!-- TOTAIS DA SUB-TABELA -->
              <tr class="bg-gray-100 font-black text-[10px] text-gray-700 border-t-2 border-gray-400 shadow-inner divide-x divide-gray-300 uppercase italic">
                <td [attr.colspan]="isSupplier ? 1 : 2" class="p-4 text-right pr-6 tracking-widest text-gray-400 font-mono">Sub-Totais {{ t.name }}</td>
                <td class="p-4 text-center text-amber-700 bg-amber-50/20">{{ sumEntries(entries, 's_gpl') }}</td>
                <td class="p-4 text-center text-amber-700 bg-amber-50/20">{{ sumEntries(entries, 's_vaz') }}</td>
                <td class="p-4 text-center text-amber-700 bg-amber-50/20">{{ sumEntries(entries, 's_av') }}</td>
                <td class="p-4 text-center text-blue-900 bg-blue-50/50">{{ sumEntries(entries, 'vz_vend') }}</td>
                <td class="p-4 text-center text-blue-900 bg-blue-50/50 text-[12px] tabular-nums tracking-tighter">{{ sumEntries(entries, 'adc_caucao') | number:'1.2-2' }}</td>
                <td class="p-4 text-center text-emerald-900 bg-emerald-50/20">{{ sumEntries(entries, 'e_gpl') }}</td>
                <td class="p-4 text-center text-emerald-900 bg-emerald-50/20">{{ sumEntries(entries, 'e_vaz') }}</td>
                <td class="p-4 text-center text-emerald-900 bg-emerald-50/20">{{ sumEntries(entries, 'e_av') }}</td>
                <td class="p-4 text-center text-pink-900 bg-pink-50/50 text-[12px] tabular-nums tracking-tighter">{{ sumEntries(entries, 'p_divida') | number:'1.2-2' }}</td>
                <td class="p-4 text-right bg-gray-900 text-yellow-300 font-mono text-xl tracking-tighter tabular-nums drop-shadow-md">{{ sumEntries(entries, 'totalAmount') | number:'1.2-2' }}</td>
                <td class="bg-white border-none"></td>
              </tr>
            </tbody>
          </table>
       </div>
    </ng-template>
  `
})
export class GasControlComponent implements OnInit, OnDestroy {
  selectedDate = new Date().toISOString().split('T')[0];
  currentYear = new Date().getFullYear();
  cylinderTypes: GasCylinderType[] = [];
  entries: GasDailyEntry[] = [];
  control: any = null;

  initialStock: any = {};
  finalStock: any = {};

  // FOOTER DATA
  openingCash: number = 0;
  denominations = [1000, 500, 200, 100, 50, 20];
  cashNotes: { [val: number]: number } = { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0 };
  cashCoins: number = 0;
  cashDirectTotal: number = 0;
  cashPOS: number = 0;
  cashHandover: number = 0;
  bankDeposits: { bankName: string, value: number, depositor: string }[] = [];
  dailyExpenses: { description: string, value: number }[] = [];
  externalEmpties: { [typeName: string]: number } = {};
  damagedLog: { typeName: string, fault: string, qty: number }[] = [];

  isLoading = false;
  private sub = new Subscription();

  constructor(
    private gasService: GasService,
    private dataService: DataService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.sub.add(
      this.dataService.activeCompany$.subscribe(company => {
        if (company) {
          this.initModule();
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  initModule() {
    const cid = this.dataService.getCompanyId();
    if (!cid) return;

    this.isLoading = true;
    this.gasService.getCylinderTypes(cid).subscribe({
      next: (types) => {
        this.cylinderTypes = types;
        this.ensureDefaultTypes(cid);
      },
      error: () => {
        this.isLoading = false;
        this.toaster.showError('Erro', 'Falha ao carregar tipos de garrafas.');
      }
    });
  }

  ensureDefaultTypes(cid: string) {
    const defaults = [
      { name: '9KG', brand: 'PETROGAS', priceRevendedor: 739, priceBomba: 739, priceConsumidor: 850 },
      { name: '14KG', brand: 'PETROGAS', priceRevendedor: 1149, priceBomba: 1149, priceConsumidor: 1300 },
      { name: '19KG', brand: 'PETROGAS', priceRevendedor: 1560, priceBomba: 1560, priceConsumidor: 1750 },
      { name: '48KG', brand: 'PETROGAS', priceRevendedor: 3800, priceBomba: 3800, priceConsumidor: 4200 },
      { name: '6KG', brand: 'PETROGAS', priceRevendedor: 480, priceBomba: 480, priceConsumidor: 550 },
      { name: '11KG', brand: 'GALP', priceRevendedor: 900, priceBomba: 900, priceConsumidor: 1050 },
      { name: '45KG', brand: 'GALP', priceRevendedor: 3750, priceBomba: 3750, priceConsumidor: 4100 },
      { name: '05KG', brand: 'GALP', priceRevendedor: 410, priceBomba: 410, priceConsumidor: 480 }
    ];

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
      if (!this.initialStock[t.name]) this.initialStock[t.name] = { kit: 0, damaged: 0, empty: 0, gpl: 0 };
      if (!this.finalStock[t.name]) this.finalStock[t.name] = { kit: 0, damaged: 0, empty: 0, gpl: 0 };
      if (this.externalEmpties[t.name] === undefined) this.externalEmpties[t.name] = 0;
    });
  }

  loadData() {
    const cid = this.dataService.getCompanyId();
    if (!cid) return;

    this.isLoading = true;
    this.gasService.getDaily(this.selectedDate, cid).subscribe({
      next: (res) => {
        this.control = res.control;
        this.entries = res.entries;

        // ROLLOVER INVENTORY
        if (this.control.initialStock) {
          this.initialStock = { ...this.initialStock, ...this.control.initialStock };
          // ROLLOVER CASH
          this.openingCash = this.control.initialStock.footers?.closingBalance || 0;
        }

        const footers = this.control.finalStock?.footers || {};
        this.cashNotes = footers.cashNotes || { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0 };
        this.cashCoins = footers.cashCoins || 0;
        this.cashDirectTotal = footers.cashDirectTotal || 0;
        this.cashPOS = footers.cashPOS || 0;
        this.cashHandover = footers.cashHandover || 0;
        this.bankDeposits = footers.bankDeposits || [];
        this.dailyExpenses = footers.dailyExpenses || [];
        // Vasilhame exterior assume o valor do dia anterior se não houver registo hoje
        this.externalEmpties = footers.externalEmpties || this.control.initialStock?.footers?.externalEmpties || this.externalEmpties;
        this.damagedLog = footers.damagedLog || [];

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.toaster.showError('Erro', 'Falha ao carregar dados do dia.');
      }
    });
  }

  saveStocks() {
    const cid = this.dataService.getCompanyId();
    if (!cid || !this.control) return;

    const fs: any = {};
    this.cylinderTypes.forEach(t => {
      fs[t.name] = {
        gpl: this.getFinalStock(t.name, 'gpl'),
        empty: this.getFinalStock(t.name, 'empty'),
        damaged: this.getFinalStock(t.name, 'damaged')
      };
    });

    // FOOTERS (CASHIER CLOSURE)
    const closingBalance = this.getPhysicalTotal() - (Number(this.cashHandover) || 0);
    fs.footers = {
      cashNotes: this.cashNotes,
      cashCoins: this.cashCoins,
      cashDirectTotal: this.cashDirectTotal,
      cashPOS: this.cashPOS,
      cashHandover: this.cashHandover,
      bankDeposits: this.bankDeposits,
      dailyExpenses: this.dailyExpenses,
      externalEmpties: this.externalEmpties,
      damagedLog: this.damagedLog,
      closingBalance: closingBalance // Saldo que herda para amanhã
    };

    this.isLoading = true;
    this.gasService.updateStocks(this.control.id, this.initialStock, fs, cid).subscribe({
      next: () => {
        this.isLoading = false;
        this.toaster.showSuccess('Relatório Gravado', 'Stocks e Caixa sincronizados.');
      },
      error: () => {
        this.isLoading = false;
        this.toaster.showError('Erro', 'Falha ao gravar relatório.');
      }
    });
  }

  // --- MATEMÁTICA DO CAIXA ---
  getBankTotal() { return this.bankDeposits.reduce((acc, d) => acc + (Number(d.value) || 0), 0); }

  getPhysicalTotal(): number {
    let notesVal = 0;
    this.denominations.forEach(bill => {
      notesVal += bill * (Number(this.cashNotes[bill]) || 0);
    });

    const digital = (Number(this.cashPOS) || 0) + this.getBankTotal();
    const other = (Number(this.cashCoins) || 0) + (Number(this.cashDirectTotal) || 0);

    return notesVal + digital + other;
  }

  getExpensesTotal() { return this.dailyExpenses.reduce((acc, ex) => acc + (Number(ex.value) || 0), 0); }

  getExpectedBalance() {
    const recpt = (this.getGlobalTotal() + this.getCollectionsTotal());
    return (Number(this.openingCash) || 0) + recpt - this.getExpensesTotal() - (Number(this.cashHandover) || 0);
  }

  getDiscrepancy() {
    return this.getPhysicalTotal() - this.getExpectedBalance();
  }

  addExpense() { this.dailyExpenses.unshift({ description: '', value: 0 }); }
  removeExpense(i: number) { this.dailyExpenses.splice(i, 1); }
  addBankDeposit() { this.bankDeposits.unshift({ bankName: '', value: 0, depositor: '' }); }
  removeBankDeposit(i: number) { this.bankDeposits.splice(i, 1); }
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
      s_gpl: 0, s_vaz: 0, s_av: 0, vz_vend: 0, adc_caucao: 0, e_gpl: 0, e_vaz: 0, e_av: 0, p_divida: 0, totalAmount: 0
    };
    this.gasService.saveEntry(newEntry, cid).subscribe(saved => { this.entries.push(saved); this.cdr.detectChanges(); });
  }

  updateEntry(entry: GasDailyEntry) {
    const cid = this.dataService.getCompanyId();
    if (cid) this.gasService.saveEntry(entry, cid).subscribe();
  }

  recalculateEntry(entry: GasDailyEntry, type: GasCylinderType) {
    const price = entry.priceType === 'BOMBA' ? type.priceBomba : (entry.priceType === 'CONSUMIDOR' ? type.priceConsumidor : type.priceRevendedor);
    entry.totalAmount = (entry.s_gpl || 0) * price;
    this.updateEntry(entry);
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

  getTypesByBrand(brand: string) { return this.cylinderTypes.filter(t => t.brand === brand); }
  getEntriesForType(typeId: string, entryType?: 'CUSTOMER' | 'SUPPLIER') {
    return this.entries.filter(e => e.cylinderTypeId === typeId && (entryType ? e.entryType === entryType : true));
  }

  sumEntries(ents: GasDailyEntry[], f: keyof GasDailyEntry) { return ents.reduce((acc, e) => acc + (Number(e[f]) || 0), 0); }
  getGlobalTotal() { return this.entries.filter(e => e.entryType === 'CUSTOMER').reduce((acc, e) => acc + (Number(e.totalAmount) || 0), 0); }
  getCollectionsTotal() { return this.entries.filter(e => e.entryType === 'CUSTOMER').reduce((acc, e) => acc + (Number(e.adc_caucao) || 0) + (Number(e.p_divida) || 0), 0); }
  getInitialTotal(tn: string) { const s = this.initialStock[tn]; return s ? (s.damaged || 0) + (s.empty || 0) + (s.gpl || 0) : 0; }

  getFinalStock(tn: string, f: 'gpl' | 'empty' | 'damaged'): number {
    const type = this.cylinderTypes.find(t => t.name === tn);
    if (!type || !this.initialStock[tn]) return 0;
    const ents = this.getEntriesForType(type.id!);
    if (f === 'gpl') return (this.initialStock[tn].gpl || 0) - this.sumEntries(ents, 's_gpl') + this.sumEntries(ents, 'e_gpl');
    if (f === 'empty') return (this.initialStock[tn].empty || 0) - this.sumEntries(ents, 's_vaz') + this.sumEntries(ents, 'e_vaz');
    if (f === 'damaged') return (this.initialStock[tn].damaged || 0) - this.sumEntries(ents, 's_av') + this.sumEntries(ents, 'e_av');
    return 0;
  }
  getFinalTotal(tn: string) { return this.getFinalStock(tn, 'gpl') + this.getFinalStock(tn, 'empty') + this.getFinalStock(tn, 'damaged'); }

  getTypeColor(tn: string): string {
    const c: any = { '9KG': '#70AD47', '14KG': '#4472C4', '19KG': '#ED7D31', '48KG': '#A5A5A5', '6KG': '#FFC000', '11KG': '#7030A0', '45KG': '#C00000', '05KG': '#00B0F0' };
    return c[tn] || '#3182ce';
  }
}
