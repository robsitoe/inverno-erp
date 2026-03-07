import re
path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: At 1515
c = re.sub(
    r'\{\{\s*getSoldSummary\(typeName:\s*string\):\s*number\s*\{\s*return\s*this\.calculateVDSum\(this\.entries\.filter\(e\s*=>\s*e\.cylinderTypeId\s*===\s*this\.cylinderTypes\.find\(t\s*=>\s*t\.name\s*===\s*typeName\)\?\.id\),\s*"vz_vend"\);\s*\}\s*\}\}',
    '{{ getSoldSummary(t.name) }}',
    c
)

# Fix 2: At 2360
c = re.sub(
    r'\{\{\s*\(getSoldSummary\(typeName:\s*string\):\s*number\s*\{\s*return\s*this\.calculateVDSum\(this\.entries\.filter\(e\s*=>\s*e\.cylinderTypeId\s*===\s*this\.cylinderTypes\.find\(t\s*=>\s*t\.name\s*===\s*typeName\)\?\.id\),\s*"vz_vend"\);\s*\}\s*\)\s*\}\}',
    '{{ getSoldSummary(t.name) }}',
    c
)

# Remove the two buggy methods at the end (I will just replace them correctly and isolate the one that's missing).
# Find the end Methods block:
c = re.sub(r'getSoldSummary\(typeName: string\): number \{\s*return this.calculateVDSum\(this.entries.filter\(e => e.cylinderTypeId === this.cylinderTypes.find\(t => t.name === typeName\)\?.id\), "vz_vend"\);\s*\}', '', c)

# Insert the proper `getSoldSummary`
get_sold = """
   getSoldSummary(typeName: string): number {
      return this.sumVDEntries(this.entries.filter(e => e.cylinderTypeId === this.cylinderTypes.find(t => t.name === typeName)?.id), "vz_vend");
   }
"""
c = c.replace('getExpectedBalance() {', get_sold + '   getExpectedBalance() {')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Restored syntax of template.")
