import io, re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'

with io.open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Ensure loadData() exists in openDay
if 'this.loadData(); // Reload to show rollover stock' not in c:
    # Find next: (res) => { ... } block inside openDay
    c = re.sub(
        r'(openDay\s*\(.*?\s*next:\s*\(res\)\s*=>\s*\{.*?this\.control\s*=\s*res;.*?\n)',
        r'\1\n             this.loadData(); // Reload to show rollover stock\n',
        c, flags=re.DOTALL
    )

# 2. Fix remaining control.status
c = re.sub(r'(?<!\.)control\.status', 'control?.status', c)
# But keep assignments as they were correctly fixed by my previous script or fix them again safely
c = c.replace("this.control?.status = 'OPENED';", "if (this.control) { this.control.status = 'OPENED'; }")
c = c.replace("this.control?.status = 'CLOSED';", "if (this.control) { this.control.status = 'CLOSED'; }")

# 3. Clean up the style block (just in case there's mess)
c = c.replace('●', '●')

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Final cleanup and openDay fix applied.")
