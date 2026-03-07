import re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract #movementTable completely
move_table_match = re.search(r'(\s*<!-- REUSABLE TABLE TEMPLATE -->\s*<ng-template #movementTable.*?</ng-template>)', content, re.DOTALL)
if move_table_match:
    move_table_str = move_table_match.group(1)
    content = content.replace(move_table_str, '')
else:
    move_table_str = ""

# Extract #debtGroup completely
debt_group_match = re.search(r'(\s*<!-- DEBT ROW TEMPLATE -->\s*<ng-template #debtGroup.*?</ng-template>)', content, re.DOTALL)
if not debt_group_match:
    debt_group_match = re.search(r'(\s*<ng-template #debtGroup.*?</ng-template>)', content, re.DOTALL)

if debt_group_match:
    debt_str = debt_group_match.group(1)
    content = content.replace(debt_str, '')
else:
    debt_str = ""

# Put them at the TOP right after `<div class="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden relative">`
insert_point = '<div class="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden relative">'
if move_table_str or debt_str:
    content = content.replace(insert_point, insert_point + "\n" + move_table_str + "\n" + debt_str + "\n")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Moved ng-templates to the top.")
