import os

path = r'c:\Users\yoriy\OneDrive\Documentos\Projectos\old\inverno-erp\frontend\app\features\admin\license-manager.component.ts'

with open(path, 'rb') as f:
    raw_content = f.read()
    content = raw_content.decode('utf-8', errors='ignore')

# The previous script might have left some mess or not finished the task
# Since I already resolved the markers (according to previous output), 
# I should check if they are still there or if I need to fix the current state.

lines = content.splitlines()

# Re-implementing a cleaner version to handle the specific pattern I see now
new_lines = []
skip_next_empty = False

for i, line in enumerate(lines):
    # Fix the broken offline notice I created
    if 'license?.offline' in line and 'flex items-center gap-2' in line:
        # Add the text and icon
        new_lines.append('            <div *ngIf="license?.offline" class="mx-6 mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-700 flex items-center gap-2 font-medium">')
        new_lines.append('              <span class="material-symbols-outlined text-[16px]">cloud_off</span>')
        new_lines.append('              Sem conexão ao servidor. Última validação: {{ license?.lastServerCheckAt | date:\'dd/MM/yyyy HH:mm\' }}.')
        new_lines.append('            </div>')
        skip_next_empty = True
        continue
    
    if skip_next_empty and not line.strip():
        skip_next_empty = False
        continue

    # Just in case there are still markers (if my previous check was wrong)
    if any(m in line for m in ['<<<<<<<', '=======', '>>>>>>>']):
        continue
        
    new_lines.append(line)

with open(path, 'wb') as f:
    f.write('\n'.join(new_lines).encode('utf-8'))
print("Cleanup and final resolution done.")
