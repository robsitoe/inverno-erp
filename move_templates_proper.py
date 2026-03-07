import sys
import re
import io

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'

with io.open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure #movementTable is OUTSIDE ANY ng-container
# The problem is that <ng-template #movementTable> was still inside some tag or blocked.

# Let's extract it if we can find it
match1 = re.search(r'(\s*<!-- REUSABLE TABLE TEMPLATE -->\s*<ng-template #movementTable.*?</ng-template>)', content, re.DOTALL)
if match1:
    content = content.replace(match1.group(1), "")
    
match2 = re.search(r'(\s*<!-- DEBT ROW TEMPLATE -->\s*<ng-template #debtGroup.*?</ng-template>)', content, re.DOTALL)
if not match2:
    match2 = re.search(r'(\s*<ng-template #debtGroup.*?</ng-template>)', content, re.DOTALL)

if match2:
    content = content.replace(match2.group(1), "")

# Instead of putting it inside the main div, let's put it at the very END of the template string (before `)
# The template string ends with `,\n  styles:` typically, or `\n`})

insert_pos = content.find("`\n})")
if insert_pos == -1:
    insert_pos = content.find("`\n  ]")

if insert_pos == -1:
    # Just find the last backtick before class
    class_pos = content.find("export class GasControlComponent")
    last_backtick = content.rfind("`", 0, class_pos)
    insert_pos = last_backtick

templates_str = ""
if match1: templates_str += match1.group(1) + "\n"
if match2: templates_str += match2.group(1) + "\n"

# Insert immediately before the closing backtick of the template
content = content[:insert_pos] + "\n" + templates_str + "\n" + content[insert_pos:]

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Templates correctly placed at EOF of template block.")
