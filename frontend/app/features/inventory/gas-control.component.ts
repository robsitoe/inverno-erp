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


@Component({


   selector: 'app-gas-control',


   standalone: true,


   imports: [CommonModule, FormsModule, AppIconComponent, QuickEntityModalComponent],


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


      }


      .highlight-entity {


        animation: highlight-fade 3s ease-out forwards;


      }


      @keyframes highlight-fade {


        0% { background-color: #fef08a; }


        100% { background-color: transparent; }


      }


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


                <h1 class="text-xs font-black text-gray-600 uppercase tracking-widest leading-none">{{ activeTab === 'MOVEMENT' ? 'Movimento Geral Diário' : 'Mapa de Inventário Global' }}</h1>


                <span class="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">Gestão de rmazém e Caixa</span>


             </div>


             <div *ngIf="control" class="ml-4 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm"


                  [class]="control?.status === 'OPENED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : (control?.status === 'CLOSED' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200')">


                 {{ control?.status === 'OPENED' ? 'Ã¢â€”Â berto' : (control?.status === 'CLOSED' ? 'Ã¢â€”Â Fechado' : '○ Não Iniciado') }}


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


             <span class="text-[10px] font-bold text-amber-700 animate-pulse"> PROCESSR...</span>


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


      <div class="flex-1 overflow-auto p-4 space-y-6 pb-24 no-print">


        


        <!-- TB: MOVEMENT -->



        <div *ngIf="activeTab === 'MOVEMENT'" class="p-2 space-y-4 print-a4 bg-white rounded-xl shadow-lg border border-gray-200">
           
           <div class="text-center font-bold uppercase tracking-widest text-[12px] border-b-2 border-black pb-1 mb-4 flex justify-between items-center">
              <span>Movimento Geral Diário do Armazém - {{ selectedDate | date:'dd.MM.yyyy' }}</span>
              <div class="flex gap-2 no-print">
                 <button (click)="openQuickRegistration()" class="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 shadow-lg">Novo Lançamento</button>
              </div>
           </div>

           <div class="flex justify-between gap-4 items-start">
              <div class="flex-1">
                 <table class="w-full text-[9px] border-collapse border border-black uppercase text-center">
                    <thead>
                       <tr class="bg-gray-200 border-b border-black">
                          <th class="p-1 border-r border-black text-left w-24">Stock Inicial</th>
                          <th *ngFor="let t of cylinderTypes" class="p-1 border-r border-black font-bold">{{ t.name }}</th>
                       </tr>
                    </thead>
                    <tbody class="font-bold">
                       <tr class="border-b border-black">
                          <td class="p-1 border-r border-black text-left bg-gray-50 uppercase">Kit/Redut</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black">0</td>
                       </tr>
                       <tr class="border-b border-black">
                          <td class="p-1 border-r border-black text-left bg-gray-50 uppercase">Avariadas</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black text-rose-500">{{ initialStock[t.name]?.damaged || 0 }}</td>
                       </tr>
                       <tr class="border-b border-black">
                          <td class="p-1 border-r border-black text-left bg-gray-50 uppercase">Vazias</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black">{{ initialStock[t.name]?.empty || 0 }}</td>
                       </tr>
                       <tr class="border-b border-black">
                          <td class="p-1 border-r border-black text-left bg-gray-50 uppercase">GPL</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black text-blue-700">{{ initialStock[t.name]?.gpl || 0 }}</td>
                       </tr>
                    </tbody>
                    <tfoot class="bg-[#C6E0B4] font-black">
                       <tr>
                          <td class="p-1 border-r border-black text-left uppercase">TOTAL</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black">{{ getInitialTotal(t.name) }}</td>
                       </tr>
                    </tfoot>
                 </table>
              </div>

              <div class="flex-1">
                 <table class="w-full text-[9px] border-collapse border border-black uppercase text-center">
                    <thead>
                       <tr class="bg-gray-200 border-b border-black">
                          <th class="p-1 border-r border-black text-left w-24">Stock Final</th>
                          <th *ngFor="let t of cylinderTypes" class="p-1 border-r border-black font-bold">{{ t.name }}</th>
                       </tr>
                    </thead>
                    <tbody class="font-bold">
                       <tr class="border-b border-black">
                          <td class="p-1 border-r border-black text-left bg-gray-50 uppercase">Kit/Redut</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black">0</td>
                       </tr>
                       <tr class="border-b border-black">
                          <td class="p-1 border-r border-black text-left bg-gray-50 uppercase">Avariadas</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black text-rose-500">{{ getFinalStock(t.name, 'damaged') }}</td>
                       </tr>
                       <tr class="border-b border-black">
                          <td class="p-1 border-r border-black text-left bg-gray-50 uppercase">Vazias</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black">{{ getFinalStock(t.name, 'empty') }}</td>
                       </tr>
                       <tr class="border-b border-black">
                          <td class="p-1 border-r border-black text-left bg-gray-50 uppercase">Gpl</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black text-blue-700">{{ getFinalStock(t.name, 'gpl') }}</td>
                       </tr>
                    </tbody>
                    <tfoot class="bg-[#C6E0B4] font-black">
                       <tr>
                          <td class="p-1 border-r border-black text-left uppercase">TOTAL</td>
                          <td *ngFor="let t of cylinderTypes" class="p-1 border-r border-black">{{ getFinalTotal(t.name) }}</td>
                       </tr>
                    </tfoot>
                 </table>
              </div>
           </div>

           <div class="space-y-10">
              <div *ngFor="let t of cylinderTypes" class="space-y-4">
                <div class="flex items-center gap-4 bg-gray-50/50 p-1 px-3 rounded-xl border border-gray-200 no-print">
                   <span class="px-3 py-1 font-black text-white text-xs rounded-lg shadow-sm" [style.background-color]="getTypeColor(t.name)">{{ t.name }}</span>
                   <div class="flex items-center gap-4 ml-2">
                      <div class="flex flex-col">
                         <span class="text-[7px] font-black uppercase text-gray-500 mb-0.5 ml-1 leading-none">Revendedor</span>
                         <div class="flex items-center bg-white border border-gray-300 rounded px-2 shadow-inner h-7">
                            <span class="text-[8px] font-bold text-gray-400 mr-1">MT</span>
                            <input type="number" min="0" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceRevendedor" (change)="saveTypePrice(t)" class="w-16 border-none p-0 py-1 text-[11px] font-black focus:ring-0 disabled:opacity-50 bg-transparent">
                         </div>
                      </div>
                      <div class="flex flex-col border-l border-gray-200 pl-4">
                         <span class="text-[7px] font-black uppercase text-gray-500 mb-0.5 ml-1 leading-none">Bomba</span>
                         <div class="flex items-center bg-white border border-gray-300 rounded px-2 shadow-inner h-7">
                            <span class="text-[8px] font-bold text-gray-400 mr-1">MT</span>
                            <input type="number" min="0" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceBomba" (change)="saveTypePrice(t)" class="w-16 border-none p-0 py-1 text-[11px] font-black focus:ring-0 disabled:opacity-50 bg-transparent">
                         </div>
                      </div>
                      <div class="flex flex-col border-l border-gray-200 pl-4">
                         <span class="text-[7px] font-black uppercase text-gray-500 mb-0.5 ml-1 leading-none">Consumidor</span>
                         <div class="flex items-center bg-white border border-gray-300 rounded px-2 shadow-inner h-7">
                            <span class="text-[8px] font-bold text-gray-400 mr-1">MT</span>
                            <input type="number" min="0" [disabled]="control?.status !== 'OPENED'" [(ngModel)]="t.priceConsumidor" (change)="saveTypePrice(t)" class="w-16 border-none p-0 py-1 text-[11px] font-black focus:ring-0 disabled:opacity-50 bg-transparent">
                         </div>
                      </div>
                   </div>
                   <div class="only-print flex items-center gap-3 text-[9px] font-bold">
                      <span>REV: {{ (t.priceRevendedor || 0) | currency:'MZN':'symbol':'1.0-0' }}</span>
                      <span>BOM: {{ (t.priceBomba || 0) | currency:'MZN':'symbol':'1.0-0' }}</span>
                      <span>CON: {{ (t.priceConsumidor || 0) | currency:'MZN':'symbol':'1.0-0' }}</span>
                   </div>
                </div>
                 <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!), type: t }"></ng-container>
              </div>
           </div>

           <div class="grid grid-cols-4 gap-4 mt-10 no-print">
              <div class="border border-black">
                 <div class="bg-gray-200 p-1 font-bold text-[9px] border-b border-black uppercase flex justify-between items-center group">
                     <span>Registo de Saídas para o Banco</span>
                     <button (click)="addBankDeposit()" class="bg-blue-600 text-white px-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-all">+ ADD</button>
                  </div>
                 <table class="w-full text-[8px] text-center border-collapse">
                    <thead>
                       <tr class="bg-gray-50 border-b border-black">
                          <th class="p-1 border-r border-black w-20 uppercase">DEPOSITADO</th>
                          <th class="p-1 border-r border-black uppercase">DATA / RECIBO</th>
                          <th class="p-1 w-20 uppercase">VALOR (MT)</th>
                       </tr>
                    </thead>
                    <tbody>
                       <tr *ngFor="let b of bankDeposits; let i = index" class="border-b border-gray-100 group">
                           <td class="p-0 border-r border-black">
                              <input type="text" [(ngModel)]="b.bankName" (change)="saveStocks()" class="w-full border-none p-1 bg-transparent text-center uppercase font-bold focus:bg-white focus:outline-none">
                           </td>
                           <td class="p-0 border-r border-black">
                              <input type="text" [(ngModel)]="b.depositor" (change)="saveStocks()" class="w-full border-none p-1 bg-transparent text-center italic focus:bg-white text-[7px]" placeholder="...">
                           </td>
                           <td class="p-0 border-r border-black">
                              <input type="number" [(ngModel)]="b.value" (change)="saveStocks()" class="w-full border-none p-1 bg-transparent text-center font-bold font-mono focus:bg-white focus:outline-none text-[8px]">
                           </td>
                           <td class="p-0 text-rose-500">
                              <button (click)="removeBankDeposit(i); saveStocks()" class="opacity-0 group-hover:opacity-100 transition-all"><app-icon name="close" [size]="10"></app-icon></button>
                           </td>
                        </tr>
                       <tr class="bg-blue-100 font-black">
                          <td colspan="2" class="p-1 border-r border-black text-left uppercase italic">Total Banco</td>
                          <td class="p-1 font-mono tabular-nums">{{ getBankTotal() | number:'1.2-2' }}</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
              <div class="border border-black">
                  <div class="bg-gray-200 p-1 font-bold text-[9px] border-b border-black uppercase text-center">Despesas e Saldos do dia</div>
                  <div class="p-1 space-y-1">
                     <div class="flex justify-between items-center text-[8px] border-b border-gray-100 pb-1">
                        <span class="uppercase font-bold">Saldo de Abertura</span>
                        <input type="number" [(ngModel)]="openingCash" (change)="saveStocks()" class="w-20 text-right font-mono border border-gray-200 rounded p-0.5 bg-gray-50">
                     </div>

                     <div class="group">
                        <div class="flex justify-between items-center text-[7px] uppercase font-black text-gray-400 mb-1">
                           <span>Despesas Detalhadas</span>
                           <button (click)="addExpense()" class="text-blue-600 font-bold hover:underline transition-all text-[8px]">+ REGISTRAR DESPESA</button>
                        </div>
                        <div *ngFor="let ex of dailyExpenses; let i = index" class="flex gap-1 mb-1 items-center bg-white border border-gray-100 p-0.5 rounded shadow-sm">
                           <input type="text" [(ngModel)]="ex.description" (change)="saveStocks()" class="flex-1 border-none bg-transparent text-[7px] p-0.5 focus:ring-0" placeholder="Descrição...">
                           <input type="number" [(ngModel)]="ex.value" (change)="saveStocks()" class="w-12 border-none bg-transparent text-[7px] p-0.5 text-right font-black font-mono focus:ring-0" placeholder="0.00">
                           <button (click)="removeExpense(i); saveStocks()" class="text-rose-500 hover:bg-rose-50 rounded p-0.5"><app-icon name="delete" [size]="10"></app-icon></button>
                        </div>
                     </div>

                     <table class="w-full text-[8px] border-collapse mt-2">
                        <tbody class="font-bold">
                           <tr class="border-b border-gray-300">
                              <td class="p-1 uppercase text-gray-500">(-) Total Despesas</td>
                              <td class="p-1 text-right text-rose-600 font-mono">{{ getExpensesTotal() | number:'1.2-2' }}</td>
                           </tr>
                           <tr class="border-b border-gray-300">
                              <td class="p-1 uppercase text-gray-500">(+) Arrecadação (VD)</td>
                              <td class="p-1 text-right text-emerald-600 font-mono italic">{{ getGlobalTotal() | number:'1.2-2' }}</td>
                           </tr>
                           <tr class="border-b border-gray-300 bg-emerald-50">
                              <td class="p-1 uppercase text-emerald-700 font-bold tracking-tighter">(+) Ajuste / Outras Entradas</td>
                              <td class="p-1">
                                 <input type="number" [(ngModel)]="extraIncome" (change)="saveStocks()" class="w-full text-right font-black font-mono border-none p-0 focus:ring-0 bg-transparent text-emerald-700 placeholder:text-emerald-200" placeholder="0.00">
                              </td>
                           </tr>
                           <tr class="border-b border-black">
                              <td class="p-1 uppercase font-black">Saldo Esperado (A+R-D-B)</td>
                              <td class="p-1 text-right font-black text-blue-800 font-mono italic">{{ getExpectedBalance() | number:'1.2-2' }}</td>
                           </tr>
                           <tr class="border-b border-black bg-yellow-50">
                              <td class="p-1 uppercase font-black">DINHEIRO EM GAVETA</td>
                              <td class="p-1 text-right bg-yellow-400 font-black text-[10px] font-mono tabular-nums">{{ getPhysicalTotal() | number:'1.2-2' }}</td>
                           </tr>
                           <tr [class.bg-rose-50]="getDiscrepancy() !== 0" [class.bg-emerald-50]="getDiscrepancy() === 0">
                              <td class="p-1 uppercase font-black">DIFERENCIAL</td>
                              <td class="p-1 text-right font-black font-mono text-[9px]" [class.text-rose-600]="getDiscrepancy() < 0" [class.text-emerald-600]="getDiscrepancy() >= 0">
                                 {{ getDiscrepancy() | number:'1.2-2' }}
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <div class="border border-black">
                  <div class="bg-gray-200 p-1 font-bold text-[9px] border-b border-black uppercase text-center">Contagem Física (Notas/Moedas)</div>
                  <div class="p-1 space-y-1">
                     <div class="grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <div *ngFor="let den of denominations" class="flex items-center justify-between border-b border-gray-100">
                           <span class="text-[7px] font-black text-gray-400">{{ den }} MT:</span>
                           <input type="number" [(ngModel)]="cashNotes[den]" (change)="saveStocks()" class="w-10 text-right font-mono text-[8px] border-none p-0 focus:ring-0 bg-transparent" placeholder="0">
                        </div>
                     </div>
                     <div class="flex justify-between items-center border-t border-gray-200 pt-1">
                        <span class="text-[7px] font-black uppercase">Moedas:</span>
                        <input type="number" [(ngModel)]="cashCoins" (change)="saveStocks()" class="w-16 text-right font-mono text-[8px] border-none p-0 focus:ring-0 bg-transparent" placeholder="0.00">
                     </div>
                     <div class="bg-yellow-50 p-1 rounded flex justify-between items-center border border-yellow-200 mt-1">
                        <span class="text-[7px] font-black uppercase tracking-tighter">TOTAL FÍSICO (N+M):</span>
                        <span class="text-[9px] font-mono font-black text-yellow-800">{{ getCashOnlyTotal() | number:'1.2-2' }}</span>
                     </div>

                     <div class="bg-gray-50 p-1 mt-2 border-t border-black space-y-1">
                        <div class="flex justify-between items-center">
                           <span class="text-[7px] font-black uppercase text-rose-600">Entrega à Circusal:</span>
                           <input type="number" [(ngModel)]="cashHandover" (change)="saveStocks()" class="w-20 text-right font-black font-mono text-[9px] border border-rose-100 rounded bg-rose-50 p-0.5 focus:bg-white text-rose-700">
                        </div>
                        <div class="flex justify-between items-center">
                           <span class="text-[7px] font-black uppercase text-blue-600">Pagamentos POS (Cartão):</span>
                           <input type="number" [(ngModel)]="cashPOS" (change)="saveStocks()" class="w-20 text-right font-mono text-[9px] border border-blue-100 rounded bg-blue-50 p-0.5 focus:bg-white text-blue-700">
                        </div>
                     </div>
                  </div>
               </div>

               <div class="border border-black">
                  <div class="bg-gray-200 p-1 font-bold text-[9px] border-b border-black uppercase flex justify-between items-center group">
                     <span>Movimento de KIT,S DE REDUTORES</span>
                     <button (click)="addKit()" class="bg-blue-600 text-white px-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-all">+ ADD</button>
                  </div>
                  <table class="w-full text-[8px] text-center border-collapse">
                     <thead>
                        <tr class="bg-gray-50 border-b border-black uppercase italic">
                           <th class="p-1 border-r border-black text-left">Item</th>
                           <th class="p-1 border-r border-black w-8">Sai.</th>
                           <th class="p-1 border-r border-black w-8">Ent.</th>
                           <th class="p-1 w-8">Vend.</th>
                           <th class="w-4 no-print"></th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr *ngFor="let k of kitMovements; let i = index" class="border-b border-gray-200 group">
                           <td class="p-0 border-r border-black">
                              <input type="text" [(ngModel)]="k.name" (change)="saveStocks()" class="w-full border-none p-1 bg-transparent text-left uppercase focus:bg-white focus:outline-none">
                           </td>
                           <td class="p-0 border-r border-black">
                              <input type="number" [(ngModel)]="k.out" (change)="saveStocks()" class="w-full border-none p-1 bg-transparent text-center focus:bg-white focus:outline-none focus:bg-white">
                           </td>
                           <td class="p-0 border-r border-black">
                              <input type="number" [(ngModel)]="k.ing" (change)="saveStocks()" class="w-full border-none p-1 bg-transparent text-center focus:bg-white text-blue-600 font-bold focus:outline-none focus:bg-white">
                           </td>
                           <td class="p-0 border-r border-black">
                              <input type="number" [(ngModel)]="k.sale" (change)="saveStocks()" class="w-full border-none p-1 bg-transparent text-center focus:bg-white text-emerald-600 font-bold focus:outline-none focus:bg-white">
                           </td>
                           <td class="p-0 text-rose-500 no-print">
                              <button (click)="removeKit(i); saveStocks()" class="opacity-0 group-hover:opacity-100"><app-icon name="close" [size]="8"></app-icon></button>
                           </td>
                        </tr>
                        <tr class="bg-[#C6E0B4] font-black italic uppercase">
                           <td class="p-1 border-r border-black text-left">TOTAIS</td>
                           <td class="p-1 border-r border-black">{{ getKitSum('out') }}</td>
                           <td class="p-1 border-r border-black">{{ getKitSum('ing') }}</td>
                           <td class="p-1">{{ getKitSum('sale') }}</td>
                           <td></td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

          <ng-container *ngIf="activeTab === 'INVENTORY'">


            <div class="print-a4 bg-white p-4 font-sans text-[10px] text-black overflow-auto">


               


               <!-- HEADER: INVENTÁRIO -->


               <div class="flex justify-between items-start mb-6">


                  <div class="space-y-0.5 text-left">


                     <div class="flex gap-2"><span class="font-bold uppercase tracking-widest text-[#2E3137]">Supervisão:</span> <span class="bg-blue-50 px-2 uppercase font-black">{{ control?.user || '---' }}</span></div>


                     <div class="flex gap-2"><span class="font-bold uppercase tracking-widest text-[#2E3137]">rmazém:</span> <span class="bg-blue-50 px-2 uppercase font-black">SEDE / {{ authService.currentUserValue?.username }}</span></div>


                     <div class="text-xs font-black mt-1 text-blue-900">{{ selectedDate | date:'dd.MM.yyyy' }}</div>


                  </div>


                  


                  <div class="flex border border-black text-center font-black">


                     <div class="border-r border-black"><div class="bg-gray-100 px-3 py-0.5 border-b border-black">Dia</div><div class="px-3 py-1 text-lg">{{ selectedDate | date:'dd' }}</div></div>


                     <div class="border-r border-black"><div class="bg-gray-100 px-3 py-0.5 border-b border-black">MÃªs</div><div class="px-3 py-1 text-lg">{{ selectedDate | date:'MM' }}</div></div>


                     <div><div class="bg-gray-100 px-3 py-0.5 border-b border-black">no</div><div class="px-3 py-1 text-lg">{{ selectedDate | date:'yyyy' }}</div></div>


                  </div>


               </div>


               <div class="grid grid-cols-12 gap-8">


                  <!-- COLUN ESQUERD -->


                  <div class="col-span-8 space-y-8">


                     <div class="flex gap-4 items-start">


                        <div class="flex-1">


                           <table class="w-full border-collapse border border-black text-center uppercase text-[9px]">


                              <thead>


                                 <tr class="bg-[#2E3137] text-white">


                                    <th colspan="8" class="p-1 font-black italic">QUNTIDDES EM STOCK (FÃSICO)</th>


                                 </tr>


                                 <tr class="bg-gray-200 text-black">


                                    <th class="p-1 border border-black font-black">TIPOS</th>


                                    <th *ngFor="let t of cylinderTypes" class="p-1 border border-black w-10 font-bold">{{ t.name }}</th>


                                 </tr>


                              </thead>


                              <tbody>


                                 <tr><td class="p-1 font-bold text-left bg-gray-50 border border-black italic">Cheias</td><td *ngFor="let t of cylinderTypes" class="p-1 text-blue-700 font-black border border-black tabular-nums">{{ getFinalStock(t.name, 'gpl') }}</td></tr>


                                 <tr><td class="p-1 font-bold text-left bg-gray-50 border border-black italic">Vazias</td><td *ngFor="let t of cylinderTypes" class="p-1 border border-black tabular-nums">{{ getFinalStock(t.name, 'empty') }}</td></tr>


                                 <tr><td class="p-1 font-bold text-left bg-gray-50 text-rose-600 border border-black italic">variad.</td><td *ngFor="let t of cylinderTypes" class="p-1 text-rose-600 border border-black tabular-nums">{{ getFinalStock(t.name, 'damaged') }}</td></tr>


                              </tbody>


                              <tfoot class="bg-orange-400 font-black text-white">


                                 <tr><td class="p-1 border border-black text-left">TOTIS</td><td *ngFor="let t of cylinderTypes" class="p-1 border border-black tabular-nums">{{ getFinalTotal(t.name) }}</td></tr>


                              </tfoot>


                           </table>


                        </div>


                     </div>


                     <!-- POR REVER VS DEVOLVER -->


                     <div class="grid grid-cols-2 gap-4">


                        <div class="border border-black">


                           <div class="bg-gray-100 text-center font-bold p-1 italic border-b border-black text-[10px] uppercase">Garrafas Por Reaver (Clientes/Staff)</div>


                           <table class="w-full text-center text-[8px] uppercase">


                              <thead>


                                 <tr class="bg-[#2E3137] text-white">


                                    <th class="p-1 text-left border-r border-black">NOMES</th>


                                    <th *ngFor="let t of cylinderTypes" class="p-1 border-r border-black w-7">{{ t.name }}</th>


                                 </tr>


                              </thead>


                              <tbody>


                                 <tr class="bg-blue-100 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="p-1 text-left border-b border-black">Trabalhadores/Funcionários</td></tr>


                                 <tr *ngFor="let ent of getCategorizedEntities('TRBLHDOR')" [class.highlight-entity]="highlightedEntityName === ent.name" class="divide-x divide-gray-300 border-b border-gray-100 group">


                                    <td class="p-1 text-left font-bold flex items-center justify-between"><span>{{ ent.name }}</span><button (click)="clearEntityEntries(ent.name)" class="text-rose-400 opacity-0 group-hover:opacity-100 p-0.5"><app-icon name="delete" [size]="10"></app-icon></button></td>


                                    <td *ngFor="let t of cylinderTypes" class="p-0 border-l border-gray-200">


                                       <input type="number" [value]="ent.balances[t.name] || 0" (change)="updateInventoryValue(ent.name, t, $event, 'TRBLHDOR', 'CUSTOMER')" class="w-full text-center font-bold py-1 bg-transparent border-none text-[8px] text-blue-600 focus:bg-white focus:ring-0">


                                    </td>


                                 </tr>


                                 <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'TRBLHDOR', type: 'CUSTOMER' }"></ng-container>


                                 <tr class="bg-blue-100 font-black"><td [attr.colspan]="cylinderTypes.length + 1" class="p-1 text-left border-b border-black">Clientes/Instituições</td></tr>


                                 <tr *ngFor="let ent of getCategorizedEntities('CLIENTE')" [class.highlight-entity]="highlightedEntityName === ent.name" class="divide-x divide-gray-300 border-b border-gray-100 group">


                                    <td class="p-1 text-left font-bold flex items-center justify-between"><span>{{ ent.name }}</span><button (click)="clearEntityEntries(ent.name)" class="text-rose-400 opacity-0 group-hover:opacity-100 p-0.5"><app-icon name="delete" [size]="10"></app-icon></button></td>


                                    <td *ngFor="let t of cylinderTypes" class="p-0 border-l border-gray-200">


                                       <input type="number" [value]="ent.balances[t.name] || 0" (change)="updateInventoryValue(ent.name, t, $event, 'CLIENTE', 'CUSTOMER')" class="w-full text-center font-bold py-1 bg-transparent border-none text-[8px] text-blue-600 focus:bg-white focus:ring-0">


                                    </td>


                                 </tr>


                                 <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'CLIENTE', type: 'CUSTOMER' }"></ng-container>


                                 <tr class="bg-[#C6E0B4] font-black text-black">


                                    <td class="p-1 text-left italic">Total por Reaver</td>


                                    <td *ngFor="let t of cylinderTypes" class="p-1 font-mono">{{ sumTotalReaver(t.name) }}</td>


                                 </tr>


                              </tbody>


                           </table>


                        </div>


                        <div class="border border-black">


                           <div class="bg-gray-100 text-center font-bold p-1 italic border-b border-black text-[10px] uppercase">Garf. por Devolver (Fornecedores)</div>


                           <table class="w-full text-center text-[8px] uppercase">


                              <thead><tr class="bg-[#2E3137] text-white"><th class="p-1 text-left border-r border-black">NOMES</th><th *ngFor="let t of cylinderTypes" class="p-1 border-r border-black w-7">{{ t.name }}</th></tr></thead>


                              <tbody>


                                 <tr *ngFor="let ent of getCategorizedEntities('SUPPLIER')" class="divide-x divide-gray-300 border-b border-gray-100 group">


                                    <td class="p-1 text-left font-bold flex items-center justify-between"><span>{{ ent.name }}</span><button (click)="clearEntityEntries(ent.name)" class="text-rose-400 opacity-0 group-hover:opacity-100 p-0.5"><app-icon name="delete" [size]="10"></app-icon></button></td>


                                    <td *ngFor="let t of cylinderTypes" class="p-0 border-l border-gray-200">


                                       <input type="number" [value]="ent.balances[t.name] || 0" (change)="updateInventoryValue(ent.name, t, $event, 'SUPPLIER', 'SUPPLIER')" class="w-full text-center font-bold py-1 bg-transparent border-none text-[8px] text-orange-600 focus:bg-white focus:ring-0">


                                    </td>


                                 </tr>


                                 <ng-container *ngTemplateOutlet="addInventoryRowTemplate; context: { cat: 'SUPPLIER', type: 'SUPPLIER' }"></ng-container>


                                 <tr class="bg-orange-100 font-black text-orange-900 border-t border-black">


                                    <td class="p-1 text-left italic">Total por Devolver</td>


                                    <td *ngFor="let t of cylinderTypes" class="p-1 font-mono">{{ getFinalStock(t.name, 'toReturn') }}</td>


                                 </tr>


                              </tbody>


                           </table>


                        </div>


                     </div>


                  </div>


                  <div class="col-span-4 flex flex-col gap-4">


                     <div class="bg-[#2E3137] text-white p-2 text-center font-black uppercase text-[10px] italic skew-x-[-12deg]">BLNÇO PTRIMONIL DO DI</div>


                     <div *ngFor="let t of cylinderTypes" class="border border-black flex flex-col">


                        <div class="bg-gray-200 p-1 flex justify-between items-center font-bold border-b border-black"><span class="text-[9px]">{{ t.name }}</span><span class="text-[8px] opacity-60">{{ t.brand }}</span></div>


                        <div class="grid grid-cols-2 divide-x divide-black h-12">


                           <div class="flex flex-col items-center justify-center bg-blue-50">


                              <span class="text-[7px] font-bold text-blue-800 uppercase leading-none">Património</span>


                              <span class="text-xs font-black">{{ t.inventoryTarget || 0 }}</span>


                           </div>


                           <div class="flex flex-col items-center justify-center" [class.bg-rose-100]="(getFinalTotal(t.name) + getFinalStock(t.name, 'toRecover') - getFinalStock(t.name, 'toReturn')) !== (t.inventoryTarget || 0)">


                              <span class="text-[7px] font-bold text-gray-500 uppercase leading-none">Stock Real</span>


                              <span class="text-xs font-black">{{ getFinalTotal(t.name) + getFinalStock(t.name, 'toRecover') - getFinalStock(t.name, 'toReturn') }}</span>


                           </div>


                        </div>


                     </div>


                  </div>


               </div>


            </div>


        </ng-container>


    <!-- REUSBLE TBLE TEMPLTE -->


    
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
                   <th class="p-1 border-r border-white w-8">ADC/Caução</th>
                   <th class="p-1 border-r border-white w-8 bg-blue-900">E./GPL</th>
                   <th class="p-1 border-r border-white w-8 bg-blue-900">E./VAZ</th>
                   <th class="p-1 border-r border-white w-8 bg-blue-900">E./AV</th>
                   <th class="p-1 border-r border-white w-8">P.Dívida</th>
                   <th class="p-1 border-r border-white w-12">VD,s</th>
                   <th class="p-1 border-r border-white w-12">FACTURAS</th>
                   <th class="p-1 w-12">GUIAS</th>
                </tr>
             </thead>
             <tbody>
                <tr *ngFor="let e of entries" class="border-b border-gray-300 hover:bg-gray-50 group">
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
                   <td *ngIf="!isSupplier" class="p-0 border-r border-black">
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
                   <td class="p-0 border-r border-black bg-blue-50">
                      <input type="number" [(ngModel)]="e.e_gpl" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 font-bold text-blue-900 focus:bg-white">
                   </td>
                   <td class="p-0 border-r border-black bg-blue-50">
                      <input type="number" [(ngModel)]="e.e_vaz" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 font-bold focus:bg-white">
                   </td>
                   <td class="p-0 border-r border-black bg-blue-50">
                      <input type="number" [(ngModel)]="e.e_av" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 text-rose-600 focus:bg-white">
                   </td>
                   <td class="p-0 border-r border-black">
                      <input type="number" [(ngModel)]="e.p_divida" (change)="recalculateEntry(e, t)" class="w-full h-full bg-transparent text-center border-none p-1 text-emerald-600 font-bold font-mono focus:bg-blue-50">
                   </td>
                   <td class="p-1 border-r border-black font-mono font-black italic whitespace-nowrap text-right text-gray-400"
                       [class.text-blue-800]="!e.invoice && !e.gr" [class.opacity-30]="e.invoice || e.gr">
                      {{ (!e.invoice && !e.gr) ? (e.totalAmount | number:'1.2-2') : '0.00' }}
                   </td>
                   <td class="p-1 border-r border-black font-bold font-mono tabular-nums text-right cursor-pointer hover:bg-blue-50" 
                       (click)="e.invoice = !e.invoice; onInvoiceChange(e)">
                      {{ e.invoice ? (e.totalAmount | number:'1.2-2') : '' }}
                   </td>
                   <td class="p-1 font-black text-center text-[10px] cursor-pointer hover:bg-blue-50" 
                       (click)="e.gr = !e.gr; onGrChange(e)">
                      {{ e.gr ? 'X' : '' }}
                   </td>
                </tr>
             </tbody>
             <tfoot class="bg-[#C6E0B4] font-black">
                <tr>
                   <td class="p-1 border-r border-black text-left uppercase">TOTAIS</td>
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
                   <td class="p-1 border-r border-black font-mono text-right">{{ sumVDs(entries) | number:'1.2-2' }}</td>
                   <td class="p-1 border-r border-black font-mono tabular-nums text-right">{{ sumInvoices(entries) | number:'1.2-2' }}</td>
                   <td class="p-1"></td>
                </tr>
             </tfoot>
          </table>
       </div>
    </ng-template>



    <ng-template #addInventoryRowTemplate let-cat="cat" let-type="type">


       <tr class="bg-gray-50 no-print border-b border-gray-200">


          <td class="p-1 relative min-w-[120px]">


             <input type="text" [(ngModel)]="inventorySearch[cat]" (input)="onInventorySearchInput(cat, type)" (blur)="clearSuggestions()" placeholder="Pesquisar/dicionar..." class="w-full bg-transparent border-none text-[8px] font-bold px-1 italic focus:outline-none">


             <div *ngIf="suggestedInventoryEntities.length > 0 && inventorySearch[cat]" class="absolute left-0 top-full z-50 w-full bg-white shadow-2xl border border-gray-300 rounded-lg overflow-hidden translate-y-1">


                <button *ngFor="let s of suggestedInventoryEntities" (mousedown)="selectInventorySuggestion(s, cat, type)" class="w-full p-2 text-left hover:bg-blue-50 flex flex-col border-b border-gray-100 last:border-none transition-colors">


                   <span class="text-[9px] font-black uppercase text-gray-800">{{ s.name }}</span>


                   <span class="text-[7px] text-gray-400 uppercase tracking-widest">{{ s.category }}</span>


                </button>


             </div>


             <div *ngIf="inventorySearch[cat] && suggestedInventoryEntities.length === 0" class="absolute left-0 top-full z-50 w-full bg-white shadow-2xl border border-gray-300 p-2 text-center translate-y-1">


                <span class="text-[7px] text-gray-500 block mb-1">Entidade não encontrada?</span>


                <button (mousedown)="triggerQuickRegistrationFromMap(cat, type)" class="w-full py-1.5 bg-blue-600 text-white rounded text-[7px] font-black uppercase hover:bg-blue-700 transition-colors">Criar Nova</button>


             </div>


          </td>


          <td *ngFor="let t of cylinderTypes" class="p-0 border-l border-gray-200">


             <button (click)="inventorySearch[cat] = inventorySearch[cat] || ''; commitInventoryEntry(cat, t, type)" class="w-full h-full p-1 opacity-20 hover:opacity-100 transition-opacity flex items-center justify-center">


                <app-icon name="add" [size]="10"></app-icon>


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


   selectedDate = new Date().toISOString().split('T')[0];


   currentYear = new Date().getFullYear();


   cylinderTypes: GasCylinderType[] = [];


   entries: GasDailyEntry[] = [];


   control: any = null;


   @Input() activeTab: 'MOVEMENT' | 'INVENTORY' = 'MOVEMENT';


   initialStock: any = {};


   finalStock: any = {};


   highlightedEntityName: string | null = null;


   inventorySearch: { [cat: string]: string } = {};


   suggestedInventoryEntities: any[] = [];


   inventoryEntryValues: any = {};


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


   externalEmpties: { [typeName: string]: number } = {};


   damagedLog: { typeName: string, fault: string, qty: number }[] = [];


   // SUGGESTION SYSTEM


   customers: Customer[] = [];


   suppliers: Supplier[] = [];


   filteredSuggestions: any[] = [];


   activeSuggestionEntry: GasDailyEntry | null = null;


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


            if (company) {


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


      if (!cid) return;


      this.isLoading = true;


      this.gasService.getDaily(this.selectedDate, cid).subscribe({


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

         damagedLog: this.damagedLog,

         openingCash: this.openingCash,
         extraIncome: this.extraIncome,

         closingBalance: drawerCash // Saldo que herda para amanhã (penas Gaveta)

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


               this.toaster.showWarning('udit Log', 'lteração registada após fecho do mapa.');


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


      if (!this.control?.entries) return 0;


      return this.control.entries.reduce((acc: number, e: any) => acc + (Number(e.s_gpl) || 0) + (Number(e.s_vaz) || 0) + (Number(e.s_av) || 0), 0);


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

   getKitSum(field: 'out' | 'ing'| 'sale') { return this.kitMovements.reduce((acc, k) => acc + (Number(k[field]) || 0), 0); }


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


   getEntriesForType(typeId: string, entryType?: 'CUSTOMER' | 'SUPPLIER') {


      return this.entries.filter(e => e.cylinderTypeId === typeId && (entryType ? e.entryType === entryType : true));


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
         .filter(e => e.entryType === 'CUSTOMER' && !e.invoice && !e.gr)
         .reduce((acc, e) => acc + (Number(e.totalAmount) || 0), 0); 
   }

   getInvoicesTotal() {
      return this.entries
         .filter(e => e.entryType === 'CUSTOMER' && e.invoice)
         .reduce((acc, e) => acc + (Number(e.totalAmount) || 0), 0);
   }


   getCollectionsTotal() { return this.entries.filter(e => e.entryType === 'CUSTOMER').reduce((acc, e) => acc + (Number(e.adc_caucao) || 0) + (Number(e.p_divida) || 0), 0); }


   getInitialTotal(tn: string) { const s = this.initialStock[tn]; return s ? (s.damaged || 0) + (s.empty || 0) + (s.gpl || 0) : 0; }


   getFinalStock(tn: string, f: 'gpl' | 'empty' | 'damaged' | 'toRecover' | 'toReturn'): number {


      const type = this.cylinderTypes.find(t => t.name === tn);


      if (!type || !this.initialStock[tn]) return 0;


      const ents = this.getEntriesForType(type.id!);


      const init = this.initialStock[tn];


      if (f === 'gpl') return Math.max(0, (init.gpl || 0) - this.sumEntries(ents, 's_gpl') + this.sumEntries(ents, 'e_gpl'));


      if (f === 'empty') return Math.max(0, (init.empty || 0) - this.sumEntries(ents, 's_vaz') + this.sumEntries(ents, 'e_vaz') - this.sumEntries(ents, 'vz_vend'));


      if (f === 'damaged') return Math.max(0, (init.damaged || 0) - this.sumEntries(ents, 's_av') + this.sumEntries(ents, 'e_av'));


      if (f === 'toRecover') {


         // Vasilhames que saíram para clientes e não voltaram


         return (init.toRecover || 0) + this.getEntryDiff(type.id!, 'CUSTOMER');


      }


      if (f === 'toReturn') {


         // Vasilhames que recebemos de fornecedores e não devolvemos


         return (init.toReturn || 0) + this.getEntryDiff(type.id!, 'SUPPLIER');


      }


      return 0;


   }


   getEntryDiff(typeId: string, entryType: 'CUSTOMER' | 'SUPPLIER'): number {


      const ents = this.getEntriesForType(typeId, entryType);


      // Caução (vz_vend) também conta como saída de vasilhame


      const out = this.sumEntries(ents, 's_gpl') + this.sumEntries(ents, 's_vaz') + this.sumEntries(ents, 's_av');


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


         '9KG': '#70D47',  // Green


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


   getCategorizedEntities(category: 'TRBLHDOR' | 'CLIENTE' | 'INSTITUICO' | 'SUPPLIER') {


      const allEntities: any[] = [];


      const entries = this.entries;


      const uniqueNames = new Set(entries.map(e => e.customerName));


      uniqueNames.forEach(name => {


         const entityCat = this.resolveCategoryByName(name);


         if ((category === 'SUPPLIER' && this.suppliers.some(s => s.name === name)) ||


            (category !== 'SUPPLIER' && entityCat === category)) {


            const entBalances: any = {};


            this.cylinderTypes.forEach(t => {


               const typeEntries = entries.filter(e => e.customerName === name && e.cylinderTypeId === t.id);


               entBalances[t.name] = (entBalances[t.name] || 0) + this.sumEntries(typeEntries, 'e_gpl') + this.sumEntries(typeEntries, 'e_vaz') + this.sumEntries(typeEntries, 'e_av')


                  - (this.sumEntries(typeEntries, 's_gpl') + this.sumEntries(typeEntries, 's_vaz') + this.sumEntries(typeEntries, 's_av'));


            });


            if (Object.values(entBalances).some(v => v !== 0)) {


               allEntities.push({ name, balances: entBalances });


            }


         }


      });


      return allEntities.sort((a, b) => a.name.localeCompare(b.name));


   }


   resolveCategoryByName(name: string): 'TRBLHDOR' | 'INSTITUICO' | 'CLIENTE' | 'SUPPLIER' {


      const supplier = this.suppliers.find(s => s.name?.toLowerCase() === name?.toLowerCase());


      if (supplier) return 'SUPPLIER';


      const cust: any = this.customers.find(c => c.name?.toLowerCase() === name?.toLowerCase());


      if (!cust) return 'CLIENTE';


      if (cust.category === 'TRBLHDOR' || cust.category === 'INSTITUICO') return cust.category;


      return 'CLIENTE';


   }


   updateInventoryValue(name: string, type: GasCylinderType, event: any, currentCat: string, typeId: 'CUSTOMER' | 'SUPPLIER') {


      const newVal = parseInt((event.target as HTMLInputElement).value) || 0;


      const correctCat = this.resolveCategoryByName(name);


      if (correctCat !== currentCat && correctCat !== 'SUPPLIER') {


         this.toaster.showInfo('Movimento Identificado', ` entidade ${name} foi identificada como ${correctCat} e movida para o respetivo lugar.`);


         this.highlightedEntityName = name;


         setTimeout(() => { this.highlightedEntityName = null; this.cdr.detectChanges(); }, 3000);


      }


      let entry = this.entries.find(e => e.customerName === name && e.cylinderTypeId === type.id && e.entryType === typeId);


      if (!entry) {


         const newEntry = {


            customerName: name,


            cylinderTypeId: type.id!,


            entryType: typeId,


            controlId: this.control?.id,


            s_gpl: 0, s_vaz: 0, s_av: 0, e_gpl: 0, e_vaz: 0, e_av: 0,


            vz_vend: 0, adc_caucao: 0, p_divida: 0, totalAmount: 0, gr: false, invoice: false,


            priceType: 'CONSUMIDOR'


         } as GasDailyEntry;


         this.entries.push(newEntry);


         entry = newEntry;


      }


      const currentBalance = (entry.e_gpl || 0) + (entry.e_vaz || 0) + (entry.e_av || 0)


         - ((entry.s_gpl || 0) + (entry.s_vaz || 0) + (entry.s_av || 0));


      const diff = newVal - currentBalance;


      if (diff > 0) entry.e_gpl = (entry.e_gpl || 0) + diff;


      else entry.s_gpl = (entry.s_gpl || 0) - diff;


      this.updateEntry(entry);


   }


   sumCategoryTotal(category: string, typeName: string): number {


      const entities = this.getCategorizedEntities(category as any);


      return entities.reduce((sum, ent) => sum + (ent.balances[typeName] || 0), 0);


   }


   sumTotalReaver(typeName: string): number {


      return this.sumCategoryTotal('TRBLHDOR', typeName) + this.sumCategoryTotal('CLIENTE', typeName) + this.sumCategoryTotal('INSTITUICO', typeName);


   }


   clearEntityEntries(name: string) {


      if (confirm(`Remover todos os registos pendentes de ${name}?`)) {


         this.entries = this.entries.filter(e => e.customerName !== name);


         this.toaster.showSuccess('Sucesso', `Registos de ${name} removidos.`);


         this.cdr.detectChanges();


      }


   }


   onInventorySearchInput(cat: string, entryType: 'CUSTOMER' | 'SUPPLIER') {


      const query = this.inventorySearch[cat]?.toLowerCase() || '';


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


   selectInventorySuggestion(s: any, cat: string, entryType: 'CUSTOMER' | 'SUPPLIER') {


      this.inventorySearch[cat] = s.name;


      this.suggestedInventoryEntities = [];


      this.commitInventoryEntry(cat, this.cylinderTypes[0], entryType);


   }


   triggerQuickRegistrationFromMap(cat: string, entryType: 'CUSTOMER' | 'SUPPLIER') {


      const mockEntry = { customerName: this.inventorySearch[cat] } as unknown as GasDailyEntry;


      this.triggerQuickRegistration(mockEntry, entryType);


   }


   commitInventoryEntry(cat: string, cylinderType: GasCylinderType, entryType: 'CUSTOMER' | 'SUPPLIER') {


      const name = this.inventorySearch[cat];


      if (!name) return;


      const correctCat = this.resolveCategoryByName(name);


      if (correctCat !== cat && correctCat !== 'SUPPLIER') {


         this.toaster.showInfo('Movimento Identificado', ` entidade ${name} foi identificada como ${correctCat} e redirecionada.`);


         this.highlightedEntityName = name;


         setTimeout(() => { this.highlightedEntityName = null; this.cdr.detectChanges(); }, 3000);


      }


      let entry = this.entries.find(e => e.customerName === name && e.cylinderTypeId === cylinderType.id && e.entryType === entryType);


      if (!entry) {


         const newEntry = {


            customerName: name,


            cylinderTypeId: cylinderType.id!,


            entryType: entryType,


            controlId: this.control?.id,


            s_gpl: 0, s_vaz: 0, s_av: 0, e_gpl: 0, e_vaz: 0, e_av: 0,


            vz_vend: 0, adc_caucao: 0, p_divida: 0, totalAmount: 0, gr: false, invoice: false,


            priceType: 'CONSUMIDOR'


         } as GasDailyEntry;


         this.entries.push(newEntry);


         entry = newEntry;


      }


      this.updateEntry(entry);


      this.inventorySearch[cat] = '';


      this.cdr.detectChanges();


   }


}


