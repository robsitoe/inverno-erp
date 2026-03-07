"""
Master fix script for gas-control.component.ts.
Starts from the git HEAD version and applies all necessary fixes cleanly.
"""
import re, io

SRC  = r'C:\Users\Nelson\Documents\Programacao\inverno-erp\gas_original.ts'
DEST = r'C:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'

with io.open(SRC, 'r', encoding='utf-8') as f:
    c = f.read()

# ─── 1. FIX TS2779 – cannot assign to optional-chained property ────────────────
c = c.replace(
    "this.control?.status = 'OPENED';",
    "if (this.control) this.control.status = 'OPENED';"
)
c = c.replace(
    "this.control?.status = 'CLOSED';",
    "if (this.control) this.control.status = 'CLOSED';"
)

# ─── 2. FIX selectedDate assignment (TS2663 "did you mean this.selectedDate?") ─
# The changeDate function has `selectedDate = d...` instead of `this.selectedDate`
c = re.sub(
    r'(\bchangeDate\b.*?\{.*?)\bselectedDate\s*=\s*d\.toISOString\(\)',
    r'\1this.selectedDate = d.toISOString()',
    c, flags=re.DOTALL
)

# ─── 3. ACTIVATE loadData() AFTER openDay succeeds ────────────────────────────
# Make sure the openDay next: callback calls loadData() at the end
OLD_OPEN = """this.control = res;

             this.entries = []; // New day starts empty"""
NEW_OPEN = """this.control = res;

             this.entries = []; // New day starts empty

             this.loadData(); // Reload to show rollover stock"""
c = c.replace(OLD_OPEN, NEW_OPEN) if OLD_OPEN in c else c

# Also ensure loadData is called if it's already there (idempotent)

# ─── 4. FIX dynamic brands (no longer hardcoded ['PETROGAS','GALP']) ──────────
c = c.replace(
    "*ngFor=\"let brand of ['PETROGAS', 'GALP']\"",
    "*ngFor=\"let brand of activeBrands\""
)

# Add activeBrands getter if missing
if 'get activeBrands()' not in c:
    GETTER = """
   get activeBrands(): string[] {
      const brands = new Set(this.cylinderTypes.map(t => (t.brand || 'PETROGAS').toUpperCase()));
      if (brands.size === 0) return ['PETROGAS', 'GALP'];
      return Array.from(brands);
   }

   """
    c = c.replace('   getTypesByBrand(brand: string)', GETTER + '   getTypesByBrand(brand: string)')

# Make getTypesByBrand case-insensitive
c = c.replace(
    '.filter(t => t.brand === brand)',
    ".filter(t => (t.brand || 'PETROGAS').toUpperCase() === brand.toUpperCase())"
)

# ─── 5. FIX corrupted Portuguese characters ────────────────────────────────────
CHARS = {
    'TIPO PRE?O': 'TIPO PREÇO',
    'CAU?O': 'CAUÇÃO',
    'Mapas de Opera??es': 'Mapas de Operações',
    '<!-- MAPAS DE OPERA??ES SECTION -->': '<!-- MAPAS DE OPERAÇÕES SECTION -->',
}
for old, new in CHARS.items():
    c = c.replace(old, new)

# ─── 6. FIX defensive null checks in getEntriesForType ───────────────────────
# Ensure entries are guarded
c = c.replace(
    'getEntriesForType(typeId: string, entryType: string) {\n      return this.entries.filter(',
    'getEntriesForType(typeId: string, entryType: string) {\n      if (!this.entries) return [];\n      return this.entries.filter('
)

with io.open(DEST, 'w', encoding='utf-8') as f:
    f.write(c)

print("All fixes applied cleanly from original.")
