import os
import re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove signature block
sig_block = re.compile(r'<div class="print-only signature-area.*?</div>\s+</div>', re.DOTALL)
content = sig_block.sub('</div>', content)

# Remove extra closings or debris if any
# Just to be safe, search for the end of the kits section
# <td class="p-1">{{ getKitSum(\'sale\') }}</td>\s+<td></td>\s+</tr>\s+</tbody>\s+</table>\s+</div>\s+</div>\s+</div>

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Final cleanup complete.")
