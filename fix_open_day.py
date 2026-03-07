import os, re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix openDay to correctly call loadData so initialStock and footers populate from the backend response
open_day_patch = """
            this.isLoading = false;
            this.control = res;
            this.entries = []; // New day starts empty
            this.toaster.showSuccess('Abertura Concluída', 'O mapa está pronto para lançamentos.');
            
            // WE MUST PARSE THE OPENED INITIAL STOCK AND FOOTERS INSTEAD OF LEAVING THEM ZERO!
            // The cleanest way is to parse the new data just like loadData does or simply call loadData() again.
            this.loadData();
"""

old_open_day = """
            this.isLoading = false;
            this.control = res;
            this.entries = []; // New day starts empty
            this.toaster.showSuccess('Abertura Concluída', 'O mapa est pronto para lançamentos.');
            if (this.cdr) this.cdr.detectChanges();"""

# Alternatively, I might have replaced "est pronto" with "está pronto", let me match more loosely.
old_open_day_regex = re.compile(r'this\.isLoading = false;\s*this\.control = res;\s*this\.entries = \[\]; // New day starts empty\s*this\.toaster\.showSuccess.*?;.*?', re.DOTALL)

def replace_open_day(m):
    return open_day_patch

# Wait, let's just do a simpler replace.
if 'this.entries = []; // New day starts empty' in content:
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if 'this.entries = []; // New day starts empty' in line:
            # check the next few lines
            for j in range(i, i+5):
                if 'this.cdr.detectChanges()' in lines[j] or 'if (this.cdr) this.cdr.detectChanges()' in lines[j]:
                    lines[j] = lines[j].replace('if (this.cdr) this.cdr.detectChanges();', 'this.loadData();')
                    break
    content = '\n'.join(lines)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("openDay logic fixed to load initial logic!")
