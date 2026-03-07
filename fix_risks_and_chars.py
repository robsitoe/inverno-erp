import sys
import re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. REMOVE duplicated status indicator in the CSS block (causes syntax errors)
# find the style block
style_start = c.find('<style>')
style_end = c.find('</style>')
if style_start != -1 and style_end != -1:
    style_block = c[style_start:style_end]
    # Remove the interpolation if it's there
    new_style_block = re.sub(r'\{\{\s*control\.status.*\}\}', '', style_block)
    c = c[:style_start] + new_style_block + c[style_end:]

# 2. IMPROVE Interaction Blanket Condition
# Show it if control is null OR progress is NOT_STARTED
c = c.replace(
    "*ngIf=\"control?.status === 'NOT_STARTED'\"",
    "*ngIf=\"!control || control?.status === 'NOT_STARTED'\""
)

# 3. FIX any remaining control checks (ensure optional chaining)
# Change control.status to control?.status when NOT using ? already
# This might have were missed.
# Exception: where we are assigning to it, we need `if (control)`
c = re.sub(r'(?<!\.)control\.status', 'control?.status', c)
# Correct assignment if missed
c = c.replace("this.control.status = 'OPENED';", "if (this.control) { this.control.status = 'OPENED'; }")
c = c.replace("this.control.status = 'CLOSED';", "if (this.control) { this.control.status = 'CLOSED'; }")

# 4. FIX Portuguese characters corrupted earlier
# Map some known corrupted strings to clean versions
# For example 'â— ' -> '●', '○' -> '○', 'CAUÇÃƒO' -> 'CAUÇÃO', 'P. DÃ VIDA' -> 'P. DÍVIDA'
fixes = {
    'â— ': '●',
    '○': '○',
    'CAUÇÃƒO': 'CAUÇÃO',
    'P. DÃ VIDA': 'P. DÍVIDA',
    'CÃ LCULO': 'CÁLCULO',
    'MATEMÃ TICA': 'MATEMÁTICA',
    'DÃ VIDA': 'DÍVIDA',
    'Circusal': 'Sucursal', # Fixed typo
}
for old, new in fixes.items():
    c = c.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Template risks and character corruption fixed.")
