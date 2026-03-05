import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GasService, GasCylinderType, GasDailyEntry } from '../../services/gas.service';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
   selector: 'app-gas-control',
   standalone: true,
   imports: [CommonModule, FormsModule, AppIconComponent],
   template: `
    <style>
      .print-only { display: none; }
      @media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        .page-break { page-break-before: always; }
        body { background: white !important; padding: 0 !important; margin: 0 !important; font-size: 8pt !important; }
        .main-container { padding: 0 !important; background: white !important; overflow: visible !important; }
        .print-a4 { width: 100%; padding: 10mm; margin: 0 auto; background: white; }
        table { border-collapse: collapse !important; width: 100% !important; margin-bottom: 3mm !important; }
        th, td { padding: 0.5px 2px !important; border: 0.5pt solid black !important; line-height: 1 !important; }
        .grid-cols-2 { display: flex !important; gap: 10mm !important; }
        .grid-cols-2 > div { flex: 1 !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    </style>
    <div class="h-full flex flex-col bg-[#E5E7EB] font-sans text-gray-800 overflow-hidden main-container">
      <!-- Interaction Blanket for NOT_STARTED -->
      <div *ngIf="control?.status === 'NOT_STARTED'" class="fixed inset-0 z-[150] bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-500 no-print">
         <div class="bg-white p-10 rounded-3xl shadow-2xl border border-blue-200 text-center max-w-md space-y-6 transform animate-in zoom-in-95 duration-300">
            <div class="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <app-icon name="lock" [size]="40"></app-icon>
            </div>
            <h2 class="text-2xl font-black text-gray-800 uppercase tracking-tight">Dia Bloqueado</h2>
            <p class="text-sm font-medium text-gray-500 leading-relaxed">Este dia ainda não foi iniciado. Para começar a registar movimentos de stock e vendas, é necessário realizar a abertura formal.</p>
            <button (click)="openDay()" class="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3">
               <app-icon name="play_arrow" [size]="24"></app-icon> Realizar Abertura Agora
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
             <div class="p-1.5 bg-blue-600 rounded text-white italic font-black text-sm tracking-tighter shadow-inner">GESt-GAS</div>
             <div class="flex flex-col">
                <h1 class="text-xs font-black text-gray-600 uppercase tracking-widest leading-none">Movimento Geral Diário</h1>
                <span class="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">Gestão de Armazém e Caixa</span>
             </div>
             <div *ngIf="control" class="ml-4 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm"
                  [class]="control.status === 'OPENED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : (control.status === 'CLOSED' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200')">
                 {{ control.status === 'OPENED' ? '● Aberto' : (control.status === 'CLOSED' ? '● Fechado' : '○ Não Iniciado') }}
             </div>
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

           <button (click)="printReport('pdf')" class="flex items-center gap-2 px-5 py-1.5 bg-gray-800 text-white rounded font-black text-xs hover:bg-black transition-all shadow-md active:scale-95 uppercase tracking-wider">
             <app-icon name="picture_as_pdf" [size]="16" class="text-blue-400"></app-icon> Relatório PDF
           </button>

           <div class="h-6 w-px bg-gray-300"></div>

           <button (click)="saveStocks()" class="flex items-center gap-2 px-5 py-1.5 bg-emerald-600 text-white rounded font-black text-xs hover:bg-emerald-700 transition-all shadow-md active:scale-95 uppercase tracking-wider">
             <app-icon name="save" [size]="16"></app-icon> Gravar Tudo
           </button>
        </div>
      </div>

      <!-- Main Spreadsheet Area -->
      <div class="flex-1 overflow-auto p-4 space-y-12 pb-24 no-print">
        
        <!-- HEADER SUMMARY: Initial and Final Stock -->
        <!-- TOP DASHBOARD BOARD -->
        <div class="bg-white rounded-2xl border border-gray-300 shadow-xl overflow-hidden no-print">
           <div class="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                 <div class="p-2 bg-blue-600 text-white rounded-lg shadow-sm"><app-icon name="analytics" [size]="20"></app-icon></div>
                 <h3 class="font-black text-sm uppercase tracking-widest text-gray-700">Resumo de Balanço do Dia</h3>
              </div>
              <div class="flex items-center gap-4">
                 <div class="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full">
                    <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    <span class="text-[9px] font-black text-gray-400 uppercase">Stock Inicial</span>
                 </div>
                 <div class="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span class="text-[9px] font-black text-gray-400 uppercase">Stock Final</span>
                 </div>
              </div>
           </div>

           <div class="grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-200">
              <!-- Stock Inicial -->
              <div class="p-0">
                 <div class="bg-orange-50/50 px-4 py-1.5 border-b border-gray-100 flex items-center justify-between">
                    <span class="text-[10px] font-black text-orange-700 uppercase italic">Stock Abertura (Contagem Física)</span>
                    <span class="text-[9px] font-bold text-orange-400 uppercase">{{ selectedDate | date:'dd MMM yyyy' }}</span>
                 </div>
                 <div class="overflow-x-auto">
                    <table class="w-full text-[10px]">
                       <thead class="bg-gray-50/50 border-b border-gray-100 font-bold">
                          <tr class="divide-x divide-gray-100">
                             <th class="p-2 w-20 text-left font-black text-gray-400 uppercase tracking-tighter">Tipo</th>
                             <th *ngFor="let t of cylinderTypes" class="p-2 w-14 text-center">{{ t.name }}</th>
                          </tr>
                       </thead>
                       <tbody class="divide-y divide-gray-50 text-center">
                          <tr class="divide-x divide-gray-50">
                             <td class="p-1 px-3 text-left font-bold text-gray-400 uppercase">Avarias</td>
                             <td *ngFor="let t of cylinderTypes" class="p-0">
                                <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="initialStock[t.name].damaged" class="w-full text-center p-2 bg-transparent border-none font-bold focus:bg-orange-50/30 disabled:opacity-50">
                             </td>
                          </tr>
                          <tr class="divide-x divide-gray-50">
                             <td class="p-1 px-3 text-left font-bold text-gray-400 uppercase">Vazias</td>
                             <td *ngFor="let t of cylinderTypes" class="p-0">
                                <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="initialStock[t.name].empty" class="w-full text-center p-2 bg-transparent border-none font-bold focus:bg-orange-50/30 disabled:opacity-50">
                             </td>
                          </tr>
                          <tr class="divide-x divide-gray-50">
                             <td class="p-1 px-3 text-left font-black text-blue-800 uppercase bg-blue-50/10">Cheias (GPL)</td>
                             <td *ngFor="let t of cylinderTypes" class="p-0 bg-blue-50/10">
                                <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="initialStock[t.name].gpl" class="w-full text-center p-2 bg-transparent border-none font-black text-blue-900 focus:bg-blue-100/30 disabled:opacity-50">
                             </td>
                          </tr>
                          <tr class="bg-gray-50 bg-opacity-50 divide-x divide-gray-100 font-black">
                             <td class="p-2 px-3 text-left text-[9px] uppercase tracking-widest text-gray-400">Total Inicial</td>
                             <td *ngFor="let t of cylinderTypes" class="p-2 text-center text-gray-700 font-mono">
                                {{ getInitialTotal(t.name) }}
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>

              <!-- Stock Final -->
              <div class="p-0">
                 <div class="bg-emerald-50/50 px-4 py-1.5 border-b border-gray-100 flex items-center justify-between">
                    <span class="text-[10px] font-black text-emerald-700 uppercase italic">Stock Fecho (Calculado via Sistema)</span>
                    <app-icon name="info" [size]="14" class="text-emerald-400 cursor-help" title="Baseado no Stock Inicial + Cargas - Vendas"></app-icon>
                 </div>
                 <div class="overflow-x-auto">
                    <table class="w-full text-[10px]">
                       <thead class="bg-gray-50/50 border-b border-gray-100 font-bold">
                          <tr class="divide-x divide-gray-100">
                             <th class="p-2 w-20 text-left font-black text-gray-400 uppercase tracking-tighter">Tipo</th>
                             <th *ngFor="let t of cylinderTypes" class="p-2 w-14 text-center">{{ t.name }}</th>
                          </tr>
                       </thead>
                       <tbody class="divide-y divide-gray-50 text-center">
                          <tr class="divide-x divide-gray-50">
                             <td class="p-1 px-3 text-left font-bold text-gray-300 uppercase italic">Avarias</td>
                             <td *ngFor="let t of cylinderTypes" class="p-2 text-center text-gray-400 font-bold">
                                {{ getFinalStock(t.name, 'damaged') }}
                             </td>
                          </tr>
                          <tr class="divide-x divide-gray-50">
                             <td class="p-1 px-3 text-left font-bold text-gray-300 uppercase italic">Vazias</td>
                             <td *ngFor="let t of cylinderTypes" class="p-2 text-center text-gray-400 font-bold">
                                {{ getFinalStock(t.name, 'empty') }}
                             </td>
                          </tr>
                          <tr class="divide-x divide-gray-50">
                             <td class="p-1 px-3 text-left font-black text-emerald-700 uppercase bg-emerald-50/10">Cheias (GPL)</td>
                             <td *ngFor="let t of cylinderTypes" class="p-2 text-center text-emerald-800 font-black bg-emerald-50/10">
                                {{ getFinalStock(t.name, 'gpl') }}
                             </td>
                          </tr>
                          <tr class="bg-gray-50 bg-opacity-50 divide-x divide-gray-100 font-black">
                             <td class="p-2 px-3 text-left text-[9px] uppercase tracking-widest text-gray-400">Total Final</td>
                             <td *ngFor="let t of cylinderTypes" class="p-2 text-center text-emerald-900 font-mono">
                                {{ getFinalTotal(t.name) }}
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>

        <!-- MAPAS DE OPERAÇÕES SECTION -->
        <div class="space-y-6">
           <div class="bg-gray-800 p-6 rounded-2xl shadow-xl flex items-center justify-between border-b-4 border-amber-500 no-print">
              <div class="flex items-center gap-4 text-white">
                 <div class="p-3 bg-white/10 rounded-xl shadow-inner border border-white/10">
                    <app-icon name="map" [size]="28" class="text-amber-400"></app-icon>
                 </div>
                 <div class="flex flex-col">
                    <h2 class="font-black text-xl uppercase tracking-[0.2em] leading-none">Mapas de Operações</h2>
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Lançamento de Vendas e Movimentação por Marca</span>
                 </div>
              </div>
           </div>

           <!-- Vertical Brand Layout -->
           <div class="flex flex-col gap-12 no-print">
              <div *ngFor="let brand of ['PETROGAS', 'GALP']" class="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-8 space-y-8">
                 <div class="flex items-center gap-4 border-b-2 border-gray-100 pb-6">
                    <div class="w-2.5 h-10 rounded-full" [class]="brand === 'PETROGAS' ? 'bg-amber-500' : 'bg-orange-600'"></div>
                    <div class="flex flex-col">
                       <h3 class="font-black text-3xl uppercase italic tracking-tighter text-gray-800">{{ brand }}</h3>
                       <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestão de Fluxo e Movimentação</span>
                    </div>
                    <div class="ml-auto px-6 py-2 bg-gray-50 rounded-2xl border border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest shadow-inner">Painel de Controlo {{ brand }}</div>
                 </div>

                 <div *ngFor="let t of getTypesByBrand(brand)" class="space-y-4">
                    <!-- Type Header & Actions -->
                    <div class="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                       <div class="px-5 py-2 rounded-xl font-black text-white text-xs shadow-md shadow-current/20" [style.background-color]="getTypeColor(t.name)">{{ t.name }}</div>
                       
                       <div class="flex items-center gap-4 ml-6">
                          <div class="flex flex-col">
                             <span class="text-[7px] font-black uppercase text-gray-400 mb-0.5 ml-1 leading-none">Revendedor</span>
                             <div class="flex items-center bg-white border border-gray-200 rounded-lg px-2 shadow-inner">
                                <span class="text-[9px] font-black text-gray-300 mr-1.5">MT</span>
                                <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceRevendedor" (change)="saveTypePrice(t)" class="w-16 border-none px-0 py-1.5 text-[11px] font-black focus:ring-0 disabled:opacity-50">
                             </div>
                          </div>
                          <div class="flex flex-col border-l border-gray-200 pl-4">
                             <span class="text-[7px] font-black uppercase text-gray-400 mb-0.5 ml-1 leading-none">Bomba</span>
                             <div class="flex items-center bg-white border border-gray-200 rounded-lg px-2 shadow-inner">
                                <span class="text-[9px] font-black text-gray-300 mr-1.5">MT</span>
                                <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceBomba" (change)="saveTypePrice(t)" class="w-16 border-none px-0 py-1.5 text-[11px] font-black focus:ring-0 disabled:opacity-50">
                             </div>
                          </div>
                          <div class="flex flex-col border-l border-gray-200 pl-4">
                             <span class="text-[7px] font-black uppercase text-gray-400 mb-0.5 ml-1 leading-none">Consumidor Final</span>
                             <div class="flex items-center bg-blue-50 border border-blue-100 rounded-lg px-2 shadow-sm">
                                <span class="text-[9px] font-black text-blue-300 mr-1.5">MT</span>
                                <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceConsumidor" (change)="saveTypePrice(t)" class="w-18 border-none px-0 py-1.5 text-[11px] font-black text-blue-700 focus:ring-0 bg-transparent disabled:opacity-50">
                             </div>
                          </div>
                       </div>
                       
                       <div class="ml-auto flex gap-2">
                          <button (click)="addEntry(t, 'SUPPLIER')" [disabled]="control?.status !== 'OPENED'" class="px-4 py-2 bg-white text-orange-600 border border-orange-100 rounded-xl font-black text-[9px] uppercase hover:bg-orange-600 hover:text-white shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                             <app-icon name="add_circle" [size]="14"></app-icon> Carga
                          </button>
                          <button (click)="addEntry(t, 'CUSTOMER')" [disabled]="control?.status !== 'OPENED'" class="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase hover:bg-blue-700 shadow-md shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                             <app-icon name="shopping_cart" [size]="14"></app-icon> Venda
                          </button>
                       </div>
                    </div>

                    <!-- Entry Tables -->
                    <div class="space-y-2">
                       <!-- Fornecedor Table -->
                       <div *ngIf="getEntriesForType(t.id!, 'SUPPLIER').length > 0" class="overflow-hidden rounded-2xl border border-orange-100 shadow-sm">
                          <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!, 'SUPPLIER'), type: t, isSupplier: true }"></ng-container>
                       </div>

                       <!-- Cliente Table -->
                       <div class="overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white">
                          <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!, 'CUSTOMER'), type: t, isSupplier: false }"></ng-container>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
         
          <!-- STICKY ACTION BAR (OBSOLETE HERE - REMOVING FROM INSIDE) -->

         <!-- PROFESSIONAL OPERATION GRID -->
         <div class="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-12 mb-24 items-start">
            
            <!-- LEFT PANEL: STOCK STATUS (Vasilhame & Avarias) -->
            <div class="xl:col-span-5 space-y-8 h-full">
               
               <!-- Vasilhame Exterior Section -->
               <div class="bg-white rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                  <div class="p-6 bg-emerald-600 text-white flex items-center justify-between">
                     <div class="flex items-center gap-3">
                        <app-icon name="inventory_2" [size]="24"></app-icon>
                        <div class="flex flex-col">
                           <h3 class="font-black text-xs uppercase tracking-widest leading-none">Vasilhame Exterior</h3>
                           <span class="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-1">Garrafas e Vasilhames em Dívida</span>
                        </div>
                     </div>
                     <span class="text-[10px] font-black bg-white/20 px-3 py-1 rounded-lg uppercase">Créditos de Vasilhame</span>
                  </div>
                  <div class="p-0">
                     <table class="w-full text-[11px]">
                        <thead>
                           <tr class="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest divide-x divide-gray-100 border-b border-gray-100">
                              <th class="p-3 text-left">Marca / Tamanho</th>
                              <th class="p-3 text-center w-28">Quantidade</th>
                           </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                           <tr *ngFor="let t of cylinderTypes" class="hover:bg-emerald-50 transition-colors group">
                              <td class="p-3 uppercase tracking-tighter flex items-center gap-3">
                                 <div class="w-1.5 h-6 rounded-full" [style.background-color]="getTypeColor(t.name)"></div>
                                 <div class="flex flex-col">
                                    <span class="font-black text-gray-700">{{ t.name }}</span>
                                    <span class="text-[8px] font-bold text-gray-400 uppercase">{{ t.brand }}</span>
                                 </div>
                              </td>
                              <td class="p-0">
                                 <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="externalEmpties[t.name]" class="w-full text-center border-none font-black text-emerald-700 bg-transparent py-4 focus:bg-white shadow-inner disabled:opacity-50">
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <!-- Avarias Técnicas Section -->
               <div class="bg-white rounded-2xl border border-gray-300 shadow-xl overflow-hidden">
                  <div class="p-6 bg-amber-500 text-white flex items-center justify-between">
                     <div class="flex items-center gap-3">
                        <app-icon name="report_problem" [size]="24"></app-icon>
                        <div class="flex flex-col">
                           <h3 class="font-black text-xs uppercase tracking-widest leading-none">Avarias Técnicas</h3>
                           <span class="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-1">Registo de Perdas e Danos</span>
                        </div>
                     </div>
                     <button (click)="addDamagedLog()" [disabled]="control?.status !== 'OPENED'" class="w-8 h-8 flex items-center justify-center bg-white text-amber-600 rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all text-xl font-black disabled:opacity-50">+</button>
                  </div>
                  <div class="p-6 space-y-4">
                     <div *ngFor="let log of damagedLog; let i = index" class="flex items-start gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-200 group hover:border-amber-200 transition-all">
                        <div class="flex flex-col gap-1 w-28 shrink-0">
                           <span class="text-[8px] font-black uppercase text-gray-400 pl-1">Tipo</span>
                           <select [(ngModel)]="log.typeName" [disabled]="control?.status !== 'OPENED'" class="bg-white border-none shadow-sm rounded-lg text-[10px] uppercase px-2 py-2 font-black disabled:opacity-50">
                              <option *ngFor="let t of cylinderTypes" [value]="t.name">{{ t.name }}</option>
                           </select>
                        </div>
                        <div class="flex flex-col gap-1 flex-1">
                           <span class="text-[8px] font-black uppercase text-gray-400 pl-1">Motivo / Descrição</span>
                           <input type="text" [(ngModel)]="log.fault" [disabled]="control?.status !== 'OPENED'" placeholder="Fuga, Amassada..." class="w-full bg-white border-none shadow-sm rounded-lg text-[11px] font-bold px-3 py-2 disabled:opacity-50 placeholder:italic">
                        </div>
                        <div class="flex flex-col gap-1 w-16 shrink-0">
                           <span class="text-[8px] font-black uppercase text-gray-400 pl-1 text-center">Quant.</span>
                           <input type="number" [(ngModel)]="log.qty" [disabled]="control?.status !== 'OPENED'" class="w-full bg-white border-none shadow-sm rounded-lg text-xs font-black text-amber-700 text-center py-2 disabled:opacity-50">
                        </div>
                        <button (click)="removeDamagedLog(i)" *ngIf="control?.status === 'OPENED'" class="mt-6 text-gray-300 hover:text-rose-500 transition-colors p-1"><app-icon name="close" [size]="18"></app-icon></button>
                     </div>
                     <div *ngIf="damagedLog.length === 0" class="py-12 flex flex-col items-center justify-center text-gray-300 gap-3 border-2 border-dashed border-gray-100 rounded-2xl">
                        <app-icon name="check_circle_outline" [size]="40" class="opacity-30"></app-icon>
                        <span class="italic uppercase text-[9px] font-black tracking-[3px]">Sem Registos de Avaria</span>
                     </div>
                  </div>
               </div>
            </div>

            <!-- RIGHT PANEL: FINANCIAL CLOSURE (FECHO DE CAIXA) -->
            <div class="xl:col-span-7 bg-white rounded-3xl border border-gray-300 shadow-2xl overflow-hidden relative">
               <div class="p-8 bg-blue-600 text-white flex items-center justify-between">
                  <div class="flex items-center gap-4">
                     <div class="p-3 bg-white/20 rounded-2xl shadow-inner"><app-icon name="account_balance_wallet" [size]="32"></app-icon></div>
                     <div class="flex flex-col">
                        <h3 class="font-black text-xl uppercase tracking-widest leading-none">Fecho de Caixa Físico</h3>
                        <span class="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1 italic">Conferência Real e Contagem de Numerário</span>
                     </div>
                  </div>
                  <div class="flex flex-col items-end border-l border-white/20 pl-6">
                     <span class="text-[10px] font-black text-white/70 uppercase mb-1">Total Disponível (Digital + Gaveta)</span>
                     <div class="font-mono text-4xl font-black italic tracking-tighter">{{ getPhysicalTotal() | number:'1.2-2' }} <small class="text-[10px] font-sans opacity-50 not-italic">MT</small></div>
                  </div>
               </div>

               <div class="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <!-- Coluna Esquerda: Contagem e Digital -->
                  <div class="space-y-8">
                     <!-- Contagem de Notas -->
                     <div class="p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner group transition-all">
                        <div class="flex items-center justify-between mb-4 px-1">
                           <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <app-icon name="payments" [size]="14"></app-icon> Contagem de Notas
                           </h4>
                           <span class="text-[9px] font-black text-blue-500 uppercase italic">Dinheiro Efetivo</span>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                           <div *ngFor="let bill of denominations" class="flex items-center justify-between bg-white pl-4 pr-1 py-1 rounded-xl border border-gray-100 group hover:border-blue-300 transition-all shadow-sm">
                              <span class="font-black text-blue-600 font-mono italic leading-none">{{ bill }}</span>
                              <div class="flex items-center bg-gray-50 rounded-lg pr-2 ml-2">
                                 <span class="text-[9px] font-bold text-gray-300 mx-2 italic">x</span>
                                 <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="cashNotes[bill]" class="w-14 text-right bg-transparent border-none py-2 text-xs font-black text-gray-700 focus:ring-0 disabled:opacity-50" placeholder="0">
                              </div>
                           </div>
                        </div>
                        <div class="mt-6 p-4 bg-white rounded-xl border border-blue-50 shadow-sm space-y-3">
                           <div class="flex items-center justify-between">
                              <span class="text-[10px] font-black text-gray-400 uppercase italic">Moedas Totais</span>
                              <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="cashCoins" class="w-28 text-right bg-blue-50/50 border-none rounded-lg px-3 py-2 text-xs font-black text-blue-700 shadow-inner disabled:opacity-50">
                           </div>
                           <div class="flex items-center justify-between">
                              <span class="text-[10px] font-black text-gray-400 uppercase italic">Valor Direto (Mão)</span>
                              <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="cashDirectTotal" class="w-28 text-right bg-emerald-50/50 border-none rounded-lg px-3 py-2 text-xs font-black text-emerald-700 shadow-inner disabled:opacity-50">
                           </div>
                        </div>
                     </div>

                     <!-- Digital & Bancário -->
                     <div class="p-6 bg-indigo-50/20 rounded-2xl border border-indigo-100 shadow-inner space-y-6">
                        <div class="flex items-center justify-between bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                           <div class="flex items-center gap-3">
                              <div class="p-2 bg-indigo-50 rounded-lg text-indigo-600"><app-icon name="credit_card" [size]="20"></app-icon></div>
                              <span class="text-xs font-black text-indigo-700 uppercase italic">Recebimentos POS</span>
                           </div>
                           <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="cashPOS" class="w-32 text-right bg-indigo-50/30 border-none rounded-lg px-3 py-2.5 text-sm font-black text-indigo-800 disabled:opacity-50">
                        </div>

                        <div class="space-y-4">
                           <div class="flex items-center justify-between px-2">
                              <div class="flex flex-col">
                                 <span class="text-[10px] font-black text-indigo-400 uppercase leading-none">Depósitos Bancários</span>
                                 <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Envios para Contas</span>
                              </div>
                              <button (click)="addBankDeposit()" [disabled]="control?.status !== 'OPENED'" class="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all text-xl font-black disabled:opacity-50">+</button>
                           </div>
                           <div class="space-y-3">
                              <div *ngFor="let dep of bankDeposits; let i = index" class="bg-white border border-indigo-50 rounded-xl p-4 shadow-sm group relative overflow-hidden">
                                 <div class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400"></div>
                                 <div class="flex gap-4 mb-3">
                                    <div class="flex-1 flex flex-col gap-1">
                                       <span class="text-[8px] font-black text-gray-300 uppercase pl-1">Instituição</span>
                                       <input type="text" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="dep.bankName" placeholder="EX: BIM, BCI..." class="w-full bg-gray-50 border-none rounded-lg px-3 py-1.5 text-[10px] font-black uppercase disabled:opacity-50">
                                    </div>
                                    <div class="w-28 flex flex-col gap-1">
                                       <span class="text-[8px] font-black text-gray-300 uppercase pl-1 text-right">Valor</span>
                                       <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="dep.value" class="w-full bg-emerald-50 border-none rounded-lg px-3 py-1.5 text-[11px] font-black text-emerald-800 text-right disabled:opacity-50">
                                    </div>
                                 </div>
                                 <div class="flex items-center justify-between gap-4">
                                    <input type="text" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="dep.depositor" placeholder="Responsável pelo Depósito..." class="flex-1 bg-gray-50/50 border-none rounded px-3 py-1.5 text-[9px] font-bold text-gray-400 italic disabled:opacity-50">
                                    <button (click)="removeBankDeposit(i)" *ngIf="control?.status === 'OPENED'" class="text-rose-200 hover:text-rose-600 transition-colors"><app-icon name="delete" [size]="16"></app-icon></button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <!-- Coluna Direita: Balanço Matemático -->
                  <div class="space-y-6">
                     <!-- Card de Diferença (Dashboard Estilo) -->
                     <div class="p-8 rounded-3xl border shadow-2xl space-y-4 relative overflow-hidden group transition-all" 
                          [class]="getDiscrepancy() < -1 ? 'bg-rose-600 text-white border-rose-400' : (getDiscrepancy() > 1 ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-blue-600 text-white border-blue-400')">
                        <div class="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                        <div class="flex flex-col relative z-2">
                           <span class="text-[9px] font-black uppercase tracking-[0.3em] opacity-60">Diferença de Caixa</span>
                           <h4 class="text-xs font-bold italic mb-6">Status: {{ getDiscrepancy() < -1 ? 'Quebra (Falta Dinheiro)' : (getDiscrepancy() > 1 ? 'Sobra (Excesso)' : 'Valores Corretos') }}</h4>
                           <div class="flex items-baseline gap-2">
                              <span class="text-5xl font-mono font-black italic tabular-nums drop-shadow-lg">{{ getDiscrepancy() | number:'1.2-2' }}</span>
                              <span class="text-sm font-black opacity-60">MT</span>
                           </div>
                           <div class="mt-6 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                              <div class="h-full bg-white animate-pulse" [style.width]="getDiscrepancy() === 0 ? '100%' : '50%'"></div>
                           </div>
                        </div>
                     </div>

                     <!-- Painel de Cálculos -->
                     <div class="bg-gray-50/50 rounded-2xl border border-gray-200 p-8 space-y-6 shadow-inner">
                        <div class="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">
                           <span>Resumo Financeiro</span>
                           <app-icon name="assessment" [size]="16"></app-icon>
                        </div>
                        
                        <div class="space-y-4">
                           <div class="flex justify-between items-center">
                              <span class="text-[10px] font-black text-amber-600 uppercase italic">Abertura de Caixa:</span>
                              <span class="text-lg font-mono font-black text-amber-700">{{ openingCash | number:'1.2-2' }} MT</span>
                           </div>
                           <div class="flex justify-between items-center">
                              <span class="text-[10px] font-black text-blue-500 uppercase italic">Recebimentos:</span>
                              <span class="text-[15px] font-mono font-black text-blue-700">(+) {{ (getGlobalTotal() + getCollectionsTotal()) | number:'1.2-2' }} MT</span>
                           </div>
                           <div class="flex justify-between items-center">
                              <span class="text-[10px] font-black text-rose-500 uppercase italic">Despesas / Vales:</span>
                              <span class="text-[15px] font-mono font-black text-rose-700">(-) {{ getExpensesTotal() | number:'1.2-2' }} MT</span>
                           </div>
                           <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm group">
                              <span class="text-[10px] font-black text-orange-600 uppercase italic">Remessa (Sede/Circusal):</span>
                              <div class="flex items-center gap-2">
                                 <span class="text-[9px] font-bold text-gray-300">(-)</span>
                                 <input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="cashHandover" class="w-32 text-right bg-orange-50/50 border-none rounded px-3 py-1.5 text-sm font-black text-orange-700 focus:ring-1 focus:ring-orange-200 shadow-inner group-hover:bg-orange-50 transition-all disabled:opacity-50">
                              </div>
                           </div>
                        </div>

                        <div class="pt-6 border-t border-gray-200 flex flex-col items-end">
                           <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Final Esperado</span>
                           <span class="text-[28px] font-black font-mono tracking-tighter text-gray-800 leading-none">{{ getExpectedBalance() | number:'1.2-2' }} <small class="text-[10px] font-sans opacity-30">MT</small></span>
                        </div>
                     </div>

                  </div>
               </div>
            </div>
         </div>

         <!-- AUDIT LOG SECTION -->
         <div *ngIf="control?.auditLog?.length > 0" class="mt-20 border-t-2 border-dashed border-gray-300 pt-12">
            <div class="flex items-center gap-3 mb-8">
               <div class="p-2 bg-gray-800 text-white rounded-lg shadow-lg"><app-icon name="history" [size]="24"></app-icon></div>
               <div class="flex flex-col">
                  <h3 class="font-black text-lg uppercase tracking-widest text-gray-700">Histórico de Alterações (Audit Log)</h3>
                  <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Registo de modificações realizadas após o fecho do mapa</span>
               </div>
            </div>

            <div class="space-y-3 pb-32">
               <div *ngFor="let log of control.auditLog" class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
                  <div class="flex items-center gap-5">
                     <div class="flex flex-col items-center justify-center p-2 min-w-[70px] bg-gray-50 rounded-xl border border-gray-100">
                        <span class="text-[9px] font-black text-gray-400 uppercase leading-none">{{ log.timestamp | date:'HH:mm' }}</span>
                        <span class="text-[10px] font-bold text-gray-600 uppercase">{{ log.timestamp | date:'dd MMM' }}</span>
                     </div>
                     <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                           <span class="text-xs font-black text-gray-800 uppercase">{{ log.user }}</span>
                           <div class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase">Edição Pós-Fecho</div>
                        </div>
                        <p class="text-[11px] font-medium text-gray-500 mt-1 italic">{{ log.summary }}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- STICKY ACTION BAR (FLOATING) -->
      <div class="fixed bottom-32 left-0 right-0 z-[150] flex justify-center no-print pointer-events-none">
         <div class="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-blue-100 flex items-center gap-8 animate-in slide-in-from-bottom-8 duration-700 ring-4 ring-blue-50/50 pointer-events-auto">
             <div class="flex items-center gap-4 pr-8 border-r-2 border-dashed border-gray-100">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-current/10 transform rotate-3" 
                     [class]="control?.status === 'OPENED' ? 'bg-emerald-500 text-white' : (control?.status === 'CLOSED' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400')">
                    <app-icon [name]="control?.status === 'CLOSED' ? 'lock' : (control?.status === 'OPENED' ? 'lock_open' : 'schedule')" [size]="24"></app-icon>
                </div>
                <div class="flex flex-col">
                    <span class="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Status Operacional</span>
                    <div class="flex items-center gap-2">
                       <span class="w-2 h-2 rounded-full animate-pulse" [class]="control?.status === 'OPENED' ? 'bg-emerald-500' : 'text-gray-400'"></span>
                       <span class="text-sm font-black uppercase tracking-tight" [class]="control?.status === 'OPENED' ? 'text-emerald-700' : (control?.status === 'CLOSED' ? 'text-blue-700' : 'text-gray-500')">
                          {{ control?.status === 'OPENED' ? 'Mapa Online' : (control?.status === 'CLOSED' ? 'Sessão Concluída' : 'Standby') }}
                       </span>
                    </div>
                </div>
             </div>

             <div class="flex items-center gap-4">
                 <button *ngIf="control?.status === 'NOT_STARTED'" (click)="openDay()" class="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-700 shadow-2xl shadow-blue-200 active:scale-95 transition-all flex items-center gap-3 group">
                     <app-icon name="play_arrow" [size]="24" class="group-hover:translate-x-1 transition-transform"></app-icon> Iniciar Ciclo de Operações
                 </button>

                 <button *ngIf="control?.status === 'OPENED'" (click)="closeDay()" [disabled]="getDiscrepancy() < -1 || getDiscrepancy() > 1" class="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group">
                     <app-icon name="check_circle" [size]="24" class="group-hover:scale-110 transition-transform"></app-icon> Validar e Fechar Dia
                 </button>

                 <button *ngIf="control?.status === 'CLOSED'" (click)="reopenDay()" class="px-10 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase hover:bg-amber-600 shadow-2xl shadow-amber-200 active:scale-95 transition-all flex items-center gap-3">
                     <app-icon name="edit_note" [size]="24"></app-icon> Reabrir para Ajustes
                 </button>
                 
                 <div class="h-10 w-px bg-gray-100 mx-1"></div>

                 <div class="flex items-center gap-2">
                      <button (click)="printReport('pdf')" class="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100" title="Exportar PDF"><app-icon name="picture_as_pdf" [size]="22"></app-icon></button>
                      <button (click)="printReport('excel')" class="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-gray-100" title="Exportar Excel"><app-icon name="table_view" [size]="22"></app-icon></button>
                 </div>
             </div>
         </div>
      </div>

      <!-- PROFESSIONAL PRINT REPORT (EXCEL STYLE) -->
      <div class="print-only print-a4 font-sans text-black bg-white">
         <div class="flex flex-col items-center mb-6">
            <h1 class="text-xl font-bold uppercase underline">Movimento Geral Diário do Armazém</h1>
            <span class="text-lg font-bold">{{ selectedDate | date:'dd.MM.yyyy' }}</span>
         </div>

         <!-- STOCKS SECTION (SIDE-BY-SIDE FLEX) -->
         <div style="display: flex; gap: 8mm; margin-bottom: 5mm; align-items: flex-start;">
            <!-- Stock Inicial -->
            <div style="flex: 1;">
               <div class="flex items-center gap-2 mb-1">
                  <div class="w-8 h-4 bg-emerald-500"></div>
                  <span class="text-xs font-bold uppercase">Stock Inicial</span>
               </div>
               <table class="w-full text-[8pt] border-collapse border border-black text-center">
                  <thead class="bg-gray-100 font-bold uppercase">
                     <tr class="divide-x divide-black border-b border-black">
                        <th class="p-1 px-2 border-r border-black font-black bg-gray-300">2026</th>
                        <th *ngFor="let t of cylinderTypes" class="p-1 w-12">{{ t.name }}</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-black">
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left font-bold bg-gray-200">Kit/Redut</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">0</td>
                     </tr>
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left font-bold bg-gray-200">Avariadas-</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">{{ initialStock[t.name]?.damaged || 0 }}</td>
                     </tr>
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left font-bold bg-gray-200">Vazias-</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">{{ initialStock[t.name]?.empty || 0 }}</td>
                     </tr>
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left font-bold bg-gray-200">GPL</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">{{ initialStock[t.name]?.gpl || 0 }}</td>
                     </tr>
                  </tbody>
                  <tfoot class="border-t border-black font-black bg-emerald-200">
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left">TOTAL</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">{{ getInitialTotal(t.name) }}</td>
                     </tr>
                  </tfoot>
            </div>

            <!-- Stock Final -->
            <div style="flex: 1;">
               <div class="flex items-center justify-end gap-2 mb-1">
                  <span class="text-xs font-bold uppercase">Stock Final</span>
               </div>
               <table class="w-full text-[8pt] border-collapse border border-black text-center">
                  <thead class="bg-gray-100 font-bold uppercase">
                     <tr class="divide-x divide-black border-b border-black">
                        <th class="p-1 px-2 border-r border-black font-black bg-gray-300">.</th>
                        <th *ngFor="let t of cylinderTypes" class="p-1 w-12">{{ t.name }}</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-black">
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left font-bold bg-gray-200">Kit/Redut</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">0</td>
                     </tr>
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left font-bold bg-gray-200">Avariadas-</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">{{ getFinalStock(t.name, 'damaged') }}</td>
                     </tr>
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left font-bold bg-gray-200">Vazias-</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">{{ getFinalStock(t.name, 'empty') }}</td>
                     </tr>
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left font-bold bg-gray-200">Gpl-</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">{{ getFinalStock(t.name, 'gpl') }}</td>
                     </tr>
                  </tbody>
                  <tfoot class="border-t border-black font-black bg-emerald-200">
                     <tr class="divide-x divide-black">
                        <td class="p-1 text-left">TOTAL</td>
                        <td *ngFor="let t of cylinderTypes" class="p-1">{{ getFinalTotal(t.name) }}</td>
                     </tr>
                  </tfoot>
               </table>
            </div>
         </div>

         <!-- MOVEMENTS PER TYPE (Excel Style) -->
         <div *ngFor="let t of cylinderTypes; let first = first" [class.mt-4]="!first" [class.page-break]="!first && $index % 2 === 0" class="mb-4">
            <!-- Group Header -->
            <div class="flex items-center mb-1">
               <div class="px-4 py-1 font-black text-xs text-white uppercase tabular-nums" [style.backgroundColor]="getTypeColor(t.name)">{{ t.name }}</div>
               <div class="ml-auto flex border border-black">
                  <span class="bg-gray-300 px-3 py-0.5 text-[10px] font-bold uppercase border-r border-black">Preço</span>
                  <span class="bg-blue-300 px-6 py-0.5 text-[12px] font-black tabular-nums">{{ t.priceConsumidor }}</span>
               </div>
            </div>

            <table class="w-full text-[9px] border-collapse border border-black text-center">
               <thead class="bg-gray-400 font-bold uppercase tracking-widest border-b border-black">
                  <tr class="divide-x divide-black">
                     <th class="p-1 text-left w-[20%]">CLIENTE/ENTIDADE</th>
                     <th class="p-1 w-10">S/GPL</th>
                     <th class="p-1 w-10">S/VAZ</th>
                     <th class="p-1 w-10">S/AV</th>
                     <th class="p-1 w-10">VZ-VEND</th>
                     <th class="p-1 w-[12%]">ADC/Caucao</th>
                     <th class="p-1 w-10">E./GPL</th>
                     <th class="p-1 w-10">E/VAZ</th>
                     <th class="p-1 w-10">E./AV</th>
                     <th class="p-1 w-[12%]">P.Divida</th>
                     <th class="p-1 w-[14%] bg-orange-300">VD,s</th>
                  </tr>
               </thead>
               <tbody class="divide-y divide-black">
                  <tr *ngFor="let e of getEntriesForType(t.id!)" class="divide-x divide-black">
                     <td class="p-1 text-left font-bold uppercase">{{ e.customerName || '---' }}</td>
                     <td class="p-1">{{ e.s_gpl || 0 }}</td>
                     <td class="p-1">{{ e.s_vaz || 0 }}</td>
                     <td class="p-1">{{ e.s_av || 0 }}</td>
                     <td class="p-1">{{ e.vz_vend || 0 }}</td>
                     <td class="p-1">{{ e.adc_caucao || 0 | number:'1.2-2' }}</td>
                     <td class="p-1">{{ e.e_gpl || 0 }}</td>
                     <td class="p-1">{{ e.e_vaz || 0 }}</td>
                     <td class="p-1">{{ e.e_av || 0 }}</td>
                     <td class="p-1">{{ e.p_divida || 0 | number:'1.2-2' }}</td>
                     <td class="p-1 font-black bg-orange-100 italic">{{ e.totalAmount || 0 | number:'1.2-2' }}</td>
                  </tr>
               </tbody>
               <tfoot class="border-t border-black font-black bg-gray-100 italic text-[11px]">
                  <tr class="divide-x divide-black">
                     <td class="p-1 text-right pr-6 uppercase bg-emerald-100">Totais</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 's_gpl') }}</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 's_vaz') }}</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 's_av') }}</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 'vz_vend') }}</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 'adc_caucao') | number:'1.2-2' }}</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 'e_gpl') }}</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 'e_vaz') }}</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 'e_av') }}</td>
                     <td class="p-1">{{ sumEntries(getEntriesForType(t.id!), 'p_divida') | number:'1.2-2' }}</td>
                     <td class="p-1 text-right pr-2 bg-orange-200">{{ sumEntries(getEntriesForType(t.id!), 'totalAmount') | number:'1.2-2' }}</td>
                  </tr>
               </tfoot>
            </table>
            <!-- Type Specific Summary (Exactly as screenshot) -->
            <div class="flex flex-col items-end mt-2 text-[8pt] font-black space-y-1">
               <div class="flex items-center gap-4">
                  <span class="uppercase text-[7pt] text-gray-400 italic">Total de Saídas</span>
                  <div class="w-24 text-right pr-2">{{ sumEntries(getEntriesForType(t.id!), 's_gpl') }} Botijas</div>
               </div>
               <div class="flex items-center gap-4">
                  <span class="uppercase text-[7pt] text-gray-400 italic">Total de vendas Gerais</span>
                  <div class="w-24 text-right pr-2">{{ sumEntries(getEntriesForType(t.id!), 'totalAmount') | number:'1.2-2' }}</div>
               </div>
               <div class="flex items-center gap-4 py-0.5">
                  <span class="uppercase text-[8pt]">Total Recebido</span>
                  <div class="w-28 border border-black bg-blue-300 p-1 text-center font-mono text-[9pt] tabular-nums shadow-[2px_2px_0px_#000]">{{ sumEntries(getEntriesForType(t.id!), 'totalAmount') | number:'1.2-2' }}</div>
               </div>
            </div>
         </div>

         <!-- 4. CONFERÊNCIA FINANCEIRA FINAL (Só no fim de tudo) -->
         <div class="mt-4 border-t-2 border-black pt-4 page-break-avoid">
            <h3 class="text-[9pt] font-black uppercase mb-2">Resumo Geral Financeiro do Dia</h3>
            <div class="flex justify-between items-start gap-10">
               <div class="flex-1 grid grid-cols-2 gap-4 text-[7pt]">
                  <div class="border border-black p-2">
                     <span class="block font-black border-b border-black mb-1 uppercase text-[6.5pt]">Conferência de Meios</span>
                     <div class="flex justify-between"><span>Dinheiro/Gaveta:</span> <span>{{ getCashOnlyTotal() | number:'1.2-2' }}</span></div>
                     <div class="flex justify-between"><span>Valor em POS:</span> <span>{{ cashPOS | number:'1.2-2' }}</span></div>
                     <div class="flex justify-between"><span>Depósitos:</span> <span>{{ getBankTotal() | number:'1.2-2' }}</span></div>
                     <div class="flex justify-between font-black border-t border-black mt-1"><span>TOTAL FÍSICO:</span> <span>{{ getPhysicalTotal() | number:'1.2-2' }} MT</span></div>
                  </div>
                  <div class="border border-black p-2">
                     <span class="block font-black border-b border-black mb-1 uppercase text-[6.5pt]">Balanço do Dia</span>
                     <div class="flex justify-between"><span>Saldo Abertura:</span> <span>{{ openingCash | number:'1.2-2' }}</span></div>
                     <div class="flex justify-between"><span>Vendas Totais:</span> <span>{{ (getGlobalTotal() + getCollectionsTotal()) | number:'1.2-2' }}</span></div>
                     <div class="flex justify-between"><span>Remessas/Vales:</span> <span>({{ (getExpensesTotal() + cashHandover) | number:'1.2-2' }})</span></div>
                     <div class="flex justify-between font-black border-t border-black mt-1">
                        <span class="uppercase">Diferença Final:</span> <span>{{ getDiscrepancy() | number:'1.2-2' }} MT</span>
                     </div>
                  </div>
               </div>
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
                  <input type="text" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.customerName" (blur)="updateEntry(e)" [placeholder]="isSupplier ? 'Motorista / Carga...' : 'Nome do Cliente...'" class="w-full px-5 py-2.5 bg-transparent border-none text-[11px] font-black focus:ring-0 disabled:opacity-50">
                </td>
                <td *ngIf="!isSupplier" class="p-0">
                  <select [(ngModel)]="e.priceType" [disabled]="control?.status !== 'OPENED'" (change)="recalculateEntry(e, t)" class="w-full px-3 py-2.5 bg-gray-50/50 border-none text-[10px] font-black text-gray-500 uppercase focus:ring-0 cursor-pointer disabled:opacity-50">
                    <option value="REVENDEDOR">Revendedor</option>
                    <option value="BOMBA">Bomba</option>
                    <option value="CONSUMIDOR">Consumidor</option>
                  </select>
                </td>
                <td class="p-0"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.s_gpl" (change)="recalculateEntry(e, t)" class="w-full text-center p-2.5 bg-transparent border-none font-black text-amber-700 shadow-inner disabled:opacity-50"></td>
                <td class="p-0"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.s_vaz" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none disabled:opacity-50"></td>
                <td class="p-0"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.s_av" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none disabled:opacity-50"></td>
                <td class="p-0 bg-blue-50/20"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.vz_vend" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none font-black text-blue-700 italic disabled:opacity-50"></td>
                <td class="p-0 bg-blue-50/20"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.adc_caucao" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none font-black text-blue-700 italic font-mono disabled:opacity-50"></td>
                <td class="p-0"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.e_gpl" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none font-black text-emerald-700 shadow-inner disabled:opacity-50"></td>
                <td class="p-0"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.e_vaz" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none disabled:opacity-50"></td>
                <td class="p-0"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.e_av" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none disabled:opacity-50"></td>
                <td class="p-0 bg-pink-50/20 font-black"><input type="number" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="e.p_divida" (change)="updateEntry(e)" class="w-full text-center p-2.5 bg-transparent border-none text-pink-700 font-mono disabled:opacity-50"></td>
                <td class="p-0 bg-gray-700 group-hover:bg-gray-800 transition-colors border-l-2 border-gray-600 shadow-xl">
                  <div class="px-4 py-2.5 text-right font-mono font-bold text-emerald-400 text-sm tracking-widest drop-shadow-sm tabular-nums">{{ e.totalAmount | number:'1.2-2' }}</div>
                </td>
                <td class="p-0 text-center bg-white border-none">
                  <button (click)="removeEntry(e)" *ngIf="control?.status === 'OPENED'" class="text-gray-200 hover:text-red-600 p-2.5 opacity-0 group-hover:opacity-100 transition-all"><app-icon name="close" [size]="18"></app-icon></button>
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

   dateNow = new Date();

   constructor(
      public gasService: GasService,
      private dataService: DataService,
      private toaster: ToasterService,
      public authService: AuthService,
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
      ] as any[];

      // Fix brand mismatch for existing types (Force 11KG to be GALP)
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

   getFinalStockPayload() {
      const fs: any = {};
      this.cylinderTypes.forEach(t => {
         fs[t.name] = {
            gpl: this.getFinalStock(t.name, 'gpl'),
            empty: this.getFinalStock(t.name, 'empty'),
            damaged: this.getFinalStock(t.name, 'damaged')
         };
      });

      // FOOTERS (CASHIER CLOSURE)
      const drawerCash = this.getCashOnlyTotal();
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
         closingBalance: drawerCash // Saldo que herda para amanhã (Apenas Gaveta)
      };
      return fs;
   }

   saveStocks() {
      const cid = this.dataService.getCompanyId();
      if (!cid || !this.control) return;

      const fs = this.getFinalStockPayload();
      const user = this.authService.currentUserValue?.username || 'admin';

      this.isLoading = true;
      this.gasService.updateStocks(this.control.id!, this.initialStock, fs, user, cid!).subscribe({
         next: () => {
            this.isLoading = false;
            this.toaster.showSuccess('Relatório Gravado', 'Stocks e Caixa sincronizados.');
            if (this.control.status === 'CLOSED') {
               this.toaster.showWarning('Audit Log', 'Alteração registada após fecho do mapa.');
            }
         },
         error: () => {
            this.isLoading = false;
            this.toaster.showError('Erro', 'Falha ao gravar relatório.');
         }
      });
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
            this.entries = []; // New day starts empty
            this.toaster.showSuccess('Abertura Concluída', 'O mapa está pronto para lançamentos.');

            if (this.cdr) this.cdr.detectChanges();
         },
         error: (err) => {
            console.error('[GasControl] Opening ERROR:', err);
            this.isLoading = false;
            const msg = err.error?.message || 'Falha ao realizar abertura.';
            this.toaster.showError('Erro de Abertura', msg);
         }
      });
   }

   closeDay() {
      if (Math.abs(this.getDiscrepancy()) > 1) {
         this.toaster.showWarning('Atenção', 'O caixa não pode ser fechado com discrepância superior a 1 MT.');
         return;
      }

      if (!confirm('Deseja realmente fechar o mapa do dia? Os dados serão guardados e o mapa bloqueado.')) return;

      const cid = this.dataService.getCompanyId();
      const user = this.authService.currentUserValue?.username || 'admin';
      if (!cid || !this.control?.id) return;

      this.isLoading = true;
      const fs = this.getFinalStockPayload();

      // SAVE first, then CLOSE
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
      if (confirm('Deseja reabrir o mapa para rectificação? Todas as alterações serão auditadas.')) {
         this.control.status = 'OPENED';
         this.toaster.showInfo('Modo de Edição', 'Mapa reaberto temporariamente.');
      }
   }

   printReport(format: 'pdf' | 'excel') {
      this.dateNow = new Date();
      this.toaster.showInfo('A processar...', `A preparar documento para impressão...`);
      setTimeout(() => {
         window.print();
      }, 500);
   }
   getDiscrepancy() { return this.getPhysicalTotal() - this.getExpectedBalance(); }

   getGlobalSaidasCount(): number {
      if (!this.control?.entries) return 0;
      return this.control.entries.reduce((acc: number, e: any) => acc + (Number(e.s_gpl) || 0) + (Number(e.s_vaz) || 0) + (Number(e.s_av) || 0), 0);
   }

   // --- MATEMÁTICA DO CAIXA ---
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
      const recpt = (this.getGlobalTotal() + this.getCollectionsTotal());
      return (Number(this.openingCash) || 0) + recpt - this.getExpensesTotal() - (Number(this.cashHandover) || 0);
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

   recalculateEntry(e: GasDailyEntry, t: GasCylinderType) {
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

   getTypesByBrand(brand: string) {
      return this.cylinderTypes
         .filter(t => t.brand === brand)
         .sort((a, b) => {
            const valA = parseInt(a.name.replace(/\D/g, '') || '0');
            const valB = parseInt(b.name.replace(/\D/g, '') || '0');
            return valA - valB;
         });
   }

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
      const c: any = {
         '9KG': '#70AD47',  // Green
         '14KG': '#4472C4', // Blue
         '19KG': '#ED7D31', // Orange
         '48KG': '#A5A5A5', // Gray
         '6KG': '#FFC000',  // Yellow
         '11KG': '#334155', // Slate/Dark Blue (Avoid Purple)
         '45KG': '#C00000', // Red
         '05KG': '#00B0F0'  // Light Blue
      };
      return c[tn] || '#3182ce';
   }
}
