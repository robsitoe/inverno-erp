import os, re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Tab buttons to the toolbar
# Placement: after the date picker div
date_picker_div_end = '</div>\r\n\r\n           <div class="h-6 w-px bg-gray-300"></div>'
tab_buttons_html = """
           <div class="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-300 no-print">
             <button (click)="activeTab = 'MOVEMENT'" [class]="activeTab === 'MOVEMENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" class="px-4 py-1.5 rounded-md font-black text-[10px] uppercase tracking-widest transition-all">Movimentos</button>
             <button (click)="activeTab = 'INVENTORY'" [class]="activeTab === 'INVENTORY' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" class="px-4 py-1.5 rounded-md font-black text-[10px] uppercase tracking-widest transition-all">Inventário</button>
           </div>
           <div class="h-6 w-px bg-gray-300"></div>"""

if tab_buttons_html not in content:
    # Use a more specific anchor
    anchor = '<div class="h-6 w-px bg-gray-300"></div>'
    # We want to insert it after the first occurrence (date picker) but before the action buttons
    # Actually, let's just replace the first separator with separator + tabs + separator
    content = content.replace(anchor, anchor + tab_buttons_html, 1)

# 2. Fix potential error in loadData rollover
# If initialStock from server is missing types, we need to ensure they exist
rollover_fix = """
            if (this.control && this.control.initialStock) {
               this.cylinderTypes.forEach(t => {
                  const val = this.control.initialStock[t.name] || { damaged: 0, empty: 0, gpl: 0, toRecover: 0, toReturn: 0 };
                  this.initialStock[t.name] = { ...this.initialStock[t.name], ...val };
               });
               this.openingCash = this.control.initialStock.footers?.closingBalance || 0;
            }"""

# Find the old rollover logic and replace it
old_rollover_pattern = re.compile(r'if \(this\.control\.initialStock\) \{.*?this\.openingCash = this\.control\.initialStock\.footers\?\.closingBalance \|\| 0;\s+\}', re.DOTALL)
content = old_rollover_pattern.sub(rollover_fix, content)

# 3. Ensure Inventory tab has the correct classes and logic
# I already restored it in the previous turn, but let me check if I missed anything.
# One common issue: getSoldSummary(t.name) might error if it's not defined.

if 'getSoldSummary(' not in content:
    content = content.replace('getExpensesTotal()', 'getSoldSummary(typeName: string): number {\r\n      return this.calculateVDSum(this.entries.filter(e => e.cylinderTypeId === this.cylinderTypes.find(t => t.name === typeName)?.id), "vz_vend");\r\n   }\r\n\r\n   getExpensesTotal()')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Toolbar tabs and Rollover logic fixed.")
