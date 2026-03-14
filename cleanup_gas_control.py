import os

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the extra closing div and fix indentation
# We look for the pattern around line 346:
# 343:                  <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!), type: t }"></ng-container>
# 344:               </div>
# 345:            </div>
# 346:            </div>

broken_block = '''                 <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!), type: t }"></ng-container>
              </div>
           </div>
           </div>'''

fixed_block = '''                 <ng-container *ngTemplateOutlet="movementTable; context: { entries: getEntriesForType(t.id!), type: t }"></ng-container>
              </div>
           </div>'''

if broken_block in content:
    content = content.replace(broken_block, fixed_block)
    print("Fixed extra closing tag.")
else:
    # Try with slightly different spacing if first try fails
    print("Broken block not found with exact spacing. Trying regex-like approach...")
    import re
    content = re.sub(r'(<ng-container \*ngTemplateOutlet="movementTable;[^>]+></ng-container>\s+</div>\s+</div>)\s+</div>', r'\1', content)
    print("Attempted regex replacement for extra div.")

# 2. Cleanup redundant no-print classes
# These are redundant because the whole container already has no-print
content = content.replace(' gap-4 items-start mb-4 no-print', ' gap-4 items-start mb-4')
content = content.replace('class="space-y-0.5 no-print"', 'class="space-y-0.5"')
content = content.replace('mt-10 no-print', 'mt-10')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleanup complete.")
