import os, re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Defensively assign entries
content = content.replace('this.entries = res.entries;', 'this.entries = res.entries || [];\n            if(!this.control) this.control = {};')

# 2. Fix `getEntriesForType` just in case
content = content.replace(
    'return this.entries.filter(e => e.cylinderTypeId === typeId && (entryType ? e.entryType === entryType : true));',
    'return (this.entries || []).filter(e => e.cylinderTypeId === typeId && (entryType ? e.entryType === entryType : true));'
)

# 3. Ensure 'control.status' checks don't crash if 'control' is completely null
content = content.replace("control.status === 'OPENED'", "control?.status === 'OPENED'")
content = content.replace("control.status === 'CLOSED'", "control?.status === 'CLOSED'")
content = content.replace("this.control.status", "this.control?.status")
content = content.replace("this.control && this.control.initialStock", "this.control?.initialStock")
content = content.replace("const footers = this.control.finalStock?.footers", "const footers = this.control?.finalStock?.footers")
content = content.replace("this.control.initialStock?.footers", "this.control?.initialStock?.footers")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Defensive checks added to gas-control")
