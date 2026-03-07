import os

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the invalid optional chaining assignments
content = content.replace("this.control?.status = 'OPENED';", "if(this.control) this.control.status = 'OPENED';")
content = content.replace("this.control?.status = 'CLOSED';", "if(this.control) this.control.status = 'CLOSED';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed optional assignments in gas-control.component.ts")
