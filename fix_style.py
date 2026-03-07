import io, re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'

with io.open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix the broken style block: add back the @media print {
# This time using a better regex
c = re.sub(r'<style>.*?.print-only\s*\{\s*display:\s*none;\s*\}.*?\.no-print', '<style>\n      .print-only { display: none; }\n\n      @media print {\n\n        .no-print', c, flags=re.DOTALL)

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Style block @media print fixed properly.")
