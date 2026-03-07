import os

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the hardcoded ['PETROGAS', 'GALP'] with a dynamic activeBrands getter output
content = content.replace(
    """<div *ngFor="let brand of ['PETROGAS', 'GALP']" class="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-8 space-y-8">""",
    """<div *ngFor="let brand of activeBrands" class="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-8 space-y-8">"""
)

# 2. Add activeBrands getter to the class
active_brands_getter = """
   get activeBrands(): string[] {
      const brands = new Set(this.cylinderTypes.map(t => (t.brand || 'PETROGAS').toUpperCase()));
      // Ensure we at least show the main two if they somehow disappeared but still want the structure
      if (brands.size === 0) return ['PETROGAS', 'GALP'];
      return Array.from(brands);
   }

   getTypesByBrand(brand: string) {
"""
content = content.replace("   getTypesByBrand(brand: string) {\n", active_brands_getter)

# 3. Make `getTypesByBrand` case-insensitive
old_filter = ".filter(t => t.brand === brand)"
new_filter = ".filter(t => (t.brand || 'PETROGAS').toUpperCase() === brand.toUpperCase())"
content = content.replace(old_filter, new_filter)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Dynamic brands array implemented.")
