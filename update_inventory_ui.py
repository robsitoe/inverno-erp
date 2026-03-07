import io, re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'

with io.open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# --- 1. Update sumGlobalStock to support 'target' ---
c = c.replace(
    "sumGlobalStock(f: 'gpl' | 'empty' | 'damaged' | 'total' | 'toRecover' | 'toReturn'): number {",
    "sumGlobalStock(f: 'gpl' | 'empty' | 'damaged' | 'total' | 'toRecover' | 'toReturn' | 'target'): number {"
)
c = c.replace(
    "if (f === 'total') return acc + this.getFinalTotal(t.name);",
    "if (f === 'target') return acc + (Number(t.inventoryTarget) || 0);\n          if (f === 'total') return acc + this.getFinalTotal(t.name);"
)

# --- 2. Update Toolbar Title (Dynamic) ---
c = c.replace(
    '<h1 class="text-xs font-black text-gray-600 uppercase tracking-widest leading-none">Movimento Geral Diário</h1>',
    '<h1 class="text-xs font-black text-gray-600 uppercase tracking-widest leading-none">{{ activeTab === \'MOVEMENT\' ? \'Movimento Geral Diário\' : \'Mapa de Inventário Global\' }}</h1>'
)

# --- 3. Add Dashboard to INVENTORY Tab ---
DASHBOARD = """
          <ng-container *ngIf="activeTab === 'INVENTORY'">

             <!-- INVENTORY DASHBOARD -->
             <div class="grid grid-cols-1 md:grid-cols-4 gap-6 no-print mb-8">
                
                <!-- PATRIMONIO -->
                <div class="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm">
                   <div class="p-3 bg-blue-100 text-blue-600 rounded-xl">
                      <app-icon name="apartment" [size]="24"></app-icon>
                   </div>
                   <div>
                      <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Património Total</span>
                      <span class="text-2xl font-black text-gray-800 font-mono tracking-tighter">{{ sumGlobalStock('target') }} <small class="text-[10px] opacity-30 italic">UN</small></span>
                   </div>
                </div>

                <!-- STOCK REAL (ARMAZEM + RUA) -->
                <div class="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm">
                   <div class="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                      <app-icon name="warehouse" [size]="24"></app-icon>
                   </div>
                   <div>
                      <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Stock Real (Físico + Rua)</span>
                      <span class="text-2xl font-black text-emerald-700 font-mono tracking-tighter">{{ sumGlobalStock('total') + sumGlobalStock('toRecover') - sumGlobalStock('toReturn') }} <small class="text-[10px] opacity-30 italic">UN</small></span>
                   </div>
                </div>

                <!-- DIFERENCA -->
                <div class="bg-white rounded-2xl border-2 p-6 flex items-center gap-4 shadow-xl overflow-hidden relative"
                     [class]="(sumGlobalStock('target') - (sumGlobalStock('total') + sumGlobalStock('toRecover') - sumGlobalStock('toReturn'))) === 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20'">
                   <div class="p-3 rounded-xl" [class]="(sumGlobalStock('target') - (sumGlobalStock('total') + sumGlobalStock('toRecover') - sumGlobalStock('toReturn'))) === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'">
                      <app-icon [name]="(sumGlobalStock('target') - (sumGlobalStock('total') + sumGlobalStock('toRecover') - sumGlobalStock('toReturn'))) === 0 ? 'check_circle' : 'warning'" [size]="24"></app-icon>
                   </div>
                   <div>
                      <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Diferença / Injustificado</span>
                      <span class="text-2xl font-black font-mono tracking-tighter" [class]="(sumGlobalStock('target') - (sumGlobalStock('total') + sumGlobalStock('toRecover') - sumGlobalStock('toReturn'))) === 0 ? 'text-emerald-700' : 'text-rose-700'">
                         {{ sumGlobalStock('target') - (sumGlobalStock('total') + sumGlobalStock('toRecover') - sumGlobalStock('toReturn')) }}
                         <small class="text-[10px] opacity-30 italic">UN</small>
                      </span>
                   </div>
                </div>

                <!-- EXTERNO NET -->
                <div class="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm">
                   <div class="p-3 bg-amber-100 text-amber-600 rounded-xl">
                      <app-icon name="outgoing_mail" [size]="24"></app-icon>
                   </div>
                   <div>
                      <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Saldo Externo (Net)</span>
                      <span class="text-2xl font-black text-amber-700 font-mono tracking-tighter">{{ sumGlobalStock('toRecover') - sumGlobalStock('toReturn') }} <small class="text-[10px] opacity-30 italic">UN</small></span>
                   </div>
                </div>

             </div>
"""
# Replace the <ng-container *ngIf="activeTab === 'INVENTORY'"> line (with spaces)
c = re.sub(r'<!-- TAB: INVENTORY -->\s*<ng-container \*ngIf="activeTab === \'INVENTORY\'">', DASHBOARD, c)

# --- 4. Update Inventory Table Columns ---
# Add Património column header
c = c.replace(
    '<th class="p-5 text-left text-gray-800">TIPO DE GARRAFA</th>',
    '<th class="p-5 text-left text-gray-800">TIPO DE GARRAFA</th>\n                           <th class="p-3 bg-blue-50 text-blue-800 border-x border-blue-100 uppercase">Património</th>'
)
# Add Unjustified footer header
c = c.replace(
    '<th class="p-3 bg-gray-100 text-gray-800 uppercase">CÃ LCULO TOTAL</th>',
    '<th class="p-3 bg-gray-100 text-gray-800 uppercase">CÁLCULO TOTAL</th>\n                           <th class="p-3 bg-rose-600 text-white uppercase">DESVIO</th>'
)
# Fix the sub-header row too
c = c.replace(
    '<th class="p-3 border-b border-gray-200 bg-gray-100">CÃ LCULO TOTAL</th>',
    '<th class="p-3 border-b border-gray-200 bg-gray-100">FROTA ATUAL</th>\n                           <th class="p-3 border-b border-rose-600 bg-rose-50 text-rose-800 font-black">INJUSTIF.</th>'
)

# Update the *ngFor loop row in Inventory Table
# Add the inventoryTarget input cell
TARGET_CELL = """
                           <td class="p-5 text-center bg-blue-50/30 border-x border-blue-50">
                              <input type="number" min="0" [(ngModel)]="t.inventoryTarget" (change)="saveTypePrice(t)" class="w-20 bg-white border border-blue-100 rounded px-2 py-1 text-center font-black text-blue-700 shadow-inner focus:ring-1 focus:ring-blue-300">
                           </td>"""

# Find where getFinalStock(t.name, 'gpl') is and insert before it
# But specifically in the Inventory Table loop
c = c.replace(
    '<td class="p-5 text-center font-bold text-gray-600 font-mono">{{ getFinalStock(t.name, \'gpl\') }}</td>',
    TARGET_CELL + '\n                           <td class="p-5 text-center font-bold text-gray-600 font-mono">{{ getFinalStock(t.name, \'gpl\') }}</td>'
)

# Add the final columns in the row (Frota and Unjustified)
END_CELLS = """
                           <td class="p-5 text-center bg-gray-100 font-black text-gray-800 text-base font-mono tabular-nums">{{ getFinalTotal(t.name) + getFinalStock(t.name, 'toRecover') - getFinalStock(t.name, 'toReturn') }}</td>
                           
                           <td class="p-5 text-center font-black text-rose-700 bg-rose-50/50 text-base font-mono tabular-nums">
                              {{ (t.inventoryTarget || 0) - (getFinalTotal(t.name) + getFinalStock(t.name, 'toRecover') - getFinalStock(t.name, 'toReturn')) }}
                           </td>"""

# Instead of updating the `toReturn` cell (which is complex), I'll replace the whole end of the row.
# But I'll try to find a specific pattern.
# The row ends with </tr> eventually.
# Let's find getEntryDiff(t.id!, 'SUPPLIER') and see what's after.

c = re.sub(
    r'<td class="p-5 text-center bg-gray-100">.*?</td>', # This was Frota
    END_CELLS,
    c
)

# --- 5. Fix Status Character one more time ---
c = c.replace('â— ', '●')

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Inventory Dashboard, Património column and Toolbar fixes applied.")
