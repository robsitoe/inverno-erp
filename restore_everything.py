import os, re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix opening blanket condition
content = content.replace("*ngIf=\"control?.status === 'NOT_STARTED'\"", "*ngIf=\"!control || control?.status === 'NOT_STARTED'\"")

# 2. Fix status label
status_label_old = "{{ control.status === 'OPENED' ? ' Aberto' : (control.status === 'CLOSED' ? ' Fechado' : '? No Iniciado') }}"
status_label_new = "{{ control?.status === 'OPENED' ? ' Aberto' : (control?.status === 'CLOSED' ? ' Fechado' : 'Não Iniciado') }}"
content = content.replace(status_label_old, status_label_new)

# 3. Restore MOVEMENT vs INVENTORY tabs
if "activeTab === 'INVENTORY'" not in content:
    # Need to re-insert the INVENTORY tab after the MOVEMENT tab container ends.
    # The MOVEMENT tab container starts with <ng-container *ngIf="activeTab === 'MOVEMENT'">
    # and ends with </ng-container> (the one before movementTable template)
    
    # Let's find the closing tag for MOVEMENT tab.
    # Based on previous readings, it's before <!-- REUSABLE TABLE TEMPLATE -->
    
    inventory_tab_html = """
        <ng-container *ngIf="activeTab === 'INVENTORY'">
           <div class="flex-1 overflow-auto p-8 space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-5 duration-700">
              
              <!-- 1. HEADER & DATE -->
              <div class="flex items-center justify-between bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 no-print">
                 <div>
                    <h2 class="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">Mapa de Inventário</h2>
                    <div class="bg-gray-900 text-white p-2 px-6 inline-block shadow-2xl rounded-sm mt-2 border-l-4 border-orange-500 italic font-black">
                       {{ selectedDate | date:'dd.MM.yyyy' }}
                    </div>
                 </div>
                 <table class="border-collapse border border-gray-400 text-center shadow-xl font-sans overflow-hidden rounded-lg">
                    <thead>
                       <tr class="bg-gray-800 text-white">
                          <th class="border border-gray-400 p-2 px-8 tracking-[0.3em] text-[9px]">DIA</th>
                          <th class="border border-gray-400 p-2 px-8 tracking-[0.3em] text-[9px]">MÊS</th>
                          <th class="border border-gray-400 p-2 px-8 tracking-[0.3em] text-[9px]">ANO</th>
                       </tr>
                    </thead>
                    <tbody class="text-2xl font-black font-mono">
                       <tr class="bg-white">
                          <td class="border border-gray-400 p-3 text-gray-900 tabular-nums">{{ selectedDate | date:'dd' }}</td>
                          <td class="border border-gray-400 p-3 text-gray-900 tabular-nums">{{ selectedDate | date:'MM' }}</td>
                          <td class="border border-gray-400 p-3 text-gray-900 tabular-nums">{{ selectedDate | date:'yyyy' }}</td>
                       </tr>
                    </tbody>
                 </table>
              </div>

              <!-- 2. MAIN GRID: STOCK SECTIONS -->
              <div class="grid grid-cols-2 items-start gap-12 mb-16">
                 
                 <!-- COLUNA 1: MOVIMENTACAO FISICA & VENDAS -->
                 <div class="space-y-10">
                    <table class="w-full text-[11px] text-center border-collapse border border-gray-400 shadow-2xl font-black text-gray-700 overflow-hidden rounded-xl">
                       <thead>
                          <tr class="bg-gray-100 border-b-2 border-gray-300">
                             <th class="py-2"></th>
                             <th [attr.colspan]="cylinderTypes.length" class="border border-gray-400 p-2 bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] italic">Quantidades em Armazém</th>
                          </tr>
                          <tr class="bg-orange-500 text-white">
                             <th class="border border-gray-400 p-2 w-28 bg-orange-600 text-[10px] tracking-widest">ESTADO</th>
                             <th *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 min-w-[55px]">{{ t.name }}</th>
                          </tr>
                       </thead>
                       <tbody class="font-mono text-[14px]">
                          <tr class="bg-white hover:bg-teal-50/30 transition-colors group">
                             <td class="border border-gray-400 p-2 text-left font-sans bg-gray-50 text-emerald-800 px-4 tracking-widest uppercase text-[10px] font-black italic">Cheias</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 italic bg-white">{{ getFinalStock(t.name, 'gpl') }}</td>
                          </tr>
                          <tr class="bg-white hover:bg-orange-50/30 transition-colors group">
                             <td class="border border-gray-400 p-2 text-left font-sans bg-gray-50 text-orange-800 px-4 tracking-widest uppercase text-[10px] font-black italic">Vazias</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 italic bg-white">{{ getFinalStock(t.name, 'empty') }}</td>
                          </tr>
                          <tr class="bg-white hover:bg-rose-50/30 transition-colors group">
                             <td class="border border-gray-400 p-2 text-left font-sans bg-gray-50 text-rose-800 px-4 tracking-widest uppercase text-[10px] font-black italic">Avariadas</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 italic bg-white">{{ getFinalStock(t.name, 'damaged') }}</td>
                          </tr>
                          <tr class="bg-gray-900 text-white shadow-inner">
                             <td class="border border-gray-800 p-2 text-left font-sans uppercase px-4 tracking-tighter text-[11px] font-black bg-black/40">Total Armazém</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-800 p-2 font-black italic">{{ getFinalTotal(t.name) }}</td>
                          </tr>
                       </tbody>
                    </table>

                    <table class="w-full text-[11px] text-center border-collapse border border-gray-400 shadow-2xl font-black text-gray-700 overflow-hidden rounded-xl">
                       <thead>
                          <tr>
                             <th [attr.colspan]="cylinderTypes.length" class="border border-gray-400 p-2 bg-emerald-600 text-white uppercase tracking-widest shadow-inner text-sm font-black py-3 italic">Botijas Vendidas no Dia</th>
                          </tr>
                          <tr class="bg-gray-100 text-gray-400">
                             <th *ngFor="let t of cylinderTypes" class="border border-gray-400 p-1 text-[10px]">{{ t.name }}</th>
                          </tr>
                       </thead>
                       <tbody class="font-mono text-[16px]">
                          <tr class="bg-emerald-50 text-emerald-900">
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-400 p-3 font-black underline decoration-emerald-300 underline-offset-4">{{ getSoldSummary(t.name) }}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <!-- COLUNA 2: PATRIMONIO & VIATURAS -->
                 <div class="space-y-10">
                    <!-- RECONCILIACAO PATRIMONIAL -->
                    <table class="w-full text-[11px] text-center border-collapse border border-gray-400 shadow-2xl font-black text-gray-700 overflow-hidden rounded-xl">
                       <thead>
                          <tr>
                             <th [attr.colspan]="cylinderTypes.length + 1" class="border border-gray-400 p-2 bg-gray-900 text-white uppercase tracking-widest shadow-inner text-sm font-black py-3 italic">Reconciliação de Património Total</th>
                          </tr>
                          <tr class="bg-gray-100 text-gray-500 text-[10px]">
                             <th class="border border-gray-400 p-2 w-32 tracking-widest uppercase italic">Categoria</th>
                             <th *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 min-w-[55px]">{{ t.name }}</th>
                          </tr>
                       </thead>
                       <tbody class="font-mono text-[14px]">
                          <tr class="bg-blue-50/50">
                             <td class="border border-gray-400 p-2 text-left font-sans bg-gray-50 text-blue-900 px-4 uppercase text-[10px] font-black italic">Total da Empresa</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-400 p-0 italic">
                                <input [disabled]="control?.status !== 'OPENED'" type="number" min="0" [(ngModel)]="companyTotalStock[t.name]" (change)="saveStocks()" class="w-full p-2 text-center bg-transparent border-none outline-none font-black text-blue-900 focus:bg-white disabled:opacity-50 tabular-nums">
                             </td>
                          </tr>
                          <tr class="bg-white">
                             <td class="border border-gray-400 p-2 text-left font-sans bg-gray-50 text-gray-500 px-4 uppercase text-[10px] font-black italic">Identificado (Global)</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 italic bg-white text-gray-400 text-xs">{{ getGlobalTotalCount(t.name) }}</td>
                          </tr>
                          <tr class="bg-gray-900 text-white shadow-inner font-mono">
                             <td class="border border-gray-800 p-2 text-left font-sans uppercase px-4 tracking-tighter text-[10px] font-black bg-black/40">Não Justificadas</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-800 p-2 font-black italic text-orange-400 tabular-nums">
                                {{ getUnjustifiedDiff(t.name) }}
                             </td>
                          </tr>
                       </tbody>
                    </table>

                    <!-- VIATURAS -->
                    <table class="w-full text-[11px] text-center border-collapse border border-gray-400 shadow-2xl font-black text-gray-700 overflow-hidden rounded-xl">
                       <thead>
                          <tr>
                             <th [attr.colspan]="cylinderTypes.length + 2" class="border border-gray-400 p-0 bg-gray-900 text-white uppercase tracking-widest shadow-inner py-3">
                                <div class="flex items-center justify-between px-5">
                                   <span class="text-xs font-black italic">Garrafas em Viaturas (Fleet)</span>
                                   <button (click)="addFleetStock()" [disabled]="control?.status !== 'OPENED'" class="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded text-[10px] border border-orange-400/50 shadow-lg active:scale-95 transition-all font-black uppercase tracking-widest">+ ADD FROTA</button>
                                </div>
                             </th>
                          </tr>
                          <tr class="bg-gray-300 text-gray-600">
                             <th class="border border-gray-400 p-2 w-32 tracking-widest uppercase italic">Viatura</th>
                             <th *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 min-w-[40px] font-black uppercase">{{ t.name }}</th>
                             <th class="border border-gray-400 p-1 w-8 bg-gray-300"></th>
                          </tr>
                       </thead>
                       <tbody class="font-mono text-[12px]">
                          <tr *ngFor="let v of fleetStock" class="bg-white group">
                             <td class="border border-gray-400 p-0 text-left">
                                <input [disabled]="control?.status !== 'OPENED'" type="text" [(ngModel)]="v.name" (change)="saveStocks()" placeholder="Ex: T1..." class="w-full bg-transparent border-none outline-none p-2.5 px-4 text-[10px] font-black uppercase focus:ring-0 disabled:opacity-50">
                             </td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-400 p-0">
                                <input [disabled]="control?.status !== 'OPENED'" type="number" min="0" [(ngModel)]="v.bottles[t.name]" (change)="saveStocks()" class="w-full text-center bg-transparent border-none outline-none p-2 text-[13px] font-bold text-gray-800 disabled:opacity-50 tabular-nums">
                             </td>
                             <td class="border border-gray-400 p-1 text-center bg-gray-50">
                                <button (click)="removeFleetStock(v.id)" *ngIf="control?.status === 'OPENED'" class="text-rose-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><app-icon name="close" [size]="14"></app-icon></button>
                             </td>
                          </tr>
                          <tr class="bg-gray-800 text-white shadow-2xl">
                             <td class="border border-gray-800 p-2 px-4 text-left font-sans uppercase font-black text-[10px] tracking-widest italic">Total Frota</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-800 p-2 italic font-black text-sm">{{ getFleetStockTotal(t.name) }}</td>
                             <td class="border border-gray-800 p-1 bg-gray-950"></td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>

              <!-- 3. DEBT RECONCILIATION -->
              <div class="grid grid-cols-2 items-start gap-12 border-t-4 border-gray-900 pt-12 mt-12 mb-12 relative">
                 <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-10 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.5em] shadow-2xl z-10 border-4 border-white">Vasilhame de Terceiros</div>
                 
                 <!-- REAVER -->
                 <div>
                    <div class="text-[12px] text-center mb-1 flex items-center justify-center gap-2">
                       <span class="bg-emerald-600 text-white px-12 py-1 uppercase font-black tracking-widest rounded-t-lg text-[10px]">Garrafas por Reaver</span>
                       <button (click)="importDebtsFromMovements()" class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded text-[9px] font-black uppercase hover:bg-emerald-200 transition-all shadow-sm border border-emerald-300/30">
                          <app-icon name="sync" [size]="10" class="mr-1"></app-icon> IMPORTAR
                       </button>
                    </div>
                    <table class="w-full text-[10px] text-center border-collapse border border-gray-400 shadow-2xl font-black text-gray-700 overflow-hidden rounded-lg">
                       <thead>
                          <tr class="bg-gray-100 text-gray-500 text-[8px]">
                             <th class="border border-gray-400 p-2 px-4 text-left w-40 tracking-widest uppercase italic font-black">Designação</th>
                             <th *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 min-w-[45px]">{{ t.name }}</th>
                             <th class="border border-gray-400 p-1 w-8 bg-gray-200"></th>
                          </tr>
                       </thead>
                       <tbody class="text-[11px]">
                          <ng-container *ngTemplateOutlet="debtGroup; context: {type: 'RECOVER', category: 'Trabalhador', color: 'bg-teal-50/50'}"></ng-container>
                          <ng-container *ngTemplateOutlet="debtGroup; context: {type: 'RECOVER', category: 'Clientes', color: 'bg-blue-50/50'}"></ng-container>
                          <ng-container *ngTemplateOutlet="debtGroup; context: {type: 'RECOVER', category: 'Instituições', color: 'bg-cyan-50/50'}"></ng-container>
                          <tr class="bg-black text-white shadow-inner font-mono text-sm border-t-2 border-white/20">
                             <td class="border border-gray-800 p-2.5 px-4 text-left uppercase font-black tracking-widest">Totais Reaver</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-800 p-2.5 font-black italic tabular-nums">{{ getDebtTotalCol('RECOVER', t.name) }}</td>
                             <td class="border border-gray-800 p-2.5 bg-gray-950"></td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <!-- DEVOLVER -->
                 <div>
                    <div class="text-[12px] text-center mb-1"><span class="bg-rose-600 text-white px-12 py-1 uppercase font-black tracking-widest rounded-t-lg text-[10px]">Garrafas por Devolver</span></div>
                    <table class="w-full text-[10px] text-center border-collapse border border-gray-400 shadow-2xl font-black text-gray-700 overflow-hidden rounded-lg">
                       <thead>
                          <tr class="bg-gray-100 text-gray-500 text-[8px]">
                             <th class="border border-gray-400 p-2 px-4 text-left w-40 tracking-widest uppercase italic font-black">Designação</th>
                             <th *ngFor="let t of cylinderTypes" class="border border-gray-400 p-2 min-w-[45px]">{{ t.name }}</th>
                             <th class="border border-gray-400 p-1 w-8 bg-gray-200"></th>
                          </tr>
                       </thead>
                       <tbody class="text-[11px]">
                          <ng-container *ngTemplateOutlet="debtGroup; context: {type: 'RETURN', category: 'Trabalhador', color: 'bg-rose-50/50'}"></ng-container>
                          <ng-container *ngTemplateOutlet="debtGroup; context: {type: 'RETURN', category: 'Clientes', color: 'bg-orange-50/50'}"></ng-container>
                          <ng-container *ngTemplateOutlet="debtGroup; context: {type: 'RETURN', category: 'Instituições', color: 'bg-red-50/50'}"></ng-container>
                          <tr class="bg-black text-white shadow-inner font-mono text-sm border-t-2 border-white/20">
                             <td class="border border-gray-800 p-2.5 px-4 text-left uppercase font-black tracking-widest">Totais Devolver</td>
                             <td *ngFor="let t of cylinderTypes" class="border border-gray-800 p-2.5 font-black italic tabular-nums">{{ getDebtTotalCol('RETURN', t.name) }}</td>
                             <td class="border border-gray-800 p-2.5 bg-gray-950"></td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>

              <!-- 4. FINAL GLOBAL STATUS BANNER -->
              <div class="mt-20 bg-gray-950 rounded-[40px] p-12 text-white relative overflow-hidden ring-4 ring-gray-900 shadow-2xl group hover:scale-[1.01] transition-all duration-700">
                 <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/10 blur-[150px] -mr-40 -mt-40 rounded-full"></div>
                 <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] -ml-40 -mb-40 rounded-full"></div>
                 <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                    <div class="flex items-center gap-8 border-l-8 border-orange-600 pl-8">
                       <div class="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-inner group-hover:bg-white/10 transition-all duration-500">
                          <app-icon name="analytics" [size]="56" class="text-orange-500"></app-icon>
                       </div>
                       <div class="flex flex-col">
                          <h3 class="text-5xl font-black uppercase tracking-tighter leading-none">STATUS GLOBAL</h3>
                          <span class="text-sm font-black text-orange-400 uppercase tracking-[0.5em] mt-3 italic drop-shadow-md">Auditado: Armazém + Frota + Mercado</span>
                       </div>
                    </div>
                    <div class="flex flex-wrap justify-center gap-6">
                       <div *ngFor="let t of cylinderTypes" class="flex flex-col items-center bg-white/5 backdrop-blur-3xl p-6 py-5 rounded-[2rem] border border-white/10 min-w-[125px] hover:bg-white/10 transition-all">
                          <span class="text-[11px] font-black text-gray-500 uppercase mb-3 tracking-widest">{{ t.name }}</span>
                          <div class="relative">
                             <span class="text-5xl font-mono font-black italic tabular-nums leading-none tracking-tighter">{{ getGlobalTotalCount(t.name) }}</span>
                             <div *ngIf="getUnjustifiedDiff(t.name) !== 0" 
                                  [class]="getUnjustifiedDiff(t.name) > 0 ? 'bg-rose-500' : 'bg-emerald-500'"
                                  class="absolute -top-4 -right-10 text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg animate-pulse">
                                {{ getUnjustifiedDiff(t.name) > 0 ? 'FALTA ' : 'EXTRA' }} {{ Math.abs(getUnjustifiedDiff(t.name)) }}
                             </div>
                          </div>
                          <div class="w-12 h-1 bg-white/10 rounded-full mt-4 group-hover:bg-orange-600/50 transition-all"></div>
                          <div class="flex flex-col items-center gap-0.5 mt-4">
                             <span class="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">Total Stock</span>
                             <span *ngIf="companyTotalStock[t.name]" class="text-[7px] font-black text-orange-500/50 uppercase">Património: {{ companyTotalStock[t.name] }}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </ng-container>
    """
    
    # Insert it after the MOVEMENT container ends
    insertion_point = "        </ng-container>"
    content = content.replace(insertion_point, insertion_point + inventory_tab_html)

# 4. Final Cleanup of common corrupted strings in whole file
content = content.replace("font-monão", "font-mono")
content = content.replace("font-mon\ufffdo", "font-mono")
content = content.replace("n\ufffdot-italic", "not-italic")
content = content.replace("n\ufffdo-print", "no-print")
content = content.replace("n\ufffdone", "none")
content = content.replace("tracking-widest\ufffd", "tracking-widest")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restoration and cleanup finished.")
