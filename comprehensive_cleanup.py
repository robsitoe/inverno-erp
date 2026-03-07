import os, re

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix CSS/Tailwind/HTML junk
replacements = {
    'nãone': 'none',
    'não-print': 'no-print',
    'border-collapóse': 'border-collapse',
    'collapóse': 'collapse',
    'font-monóo': 'font-mono',
    'italicá': 'italic',
    'tracking-widestá': 'tracking-widest',
    'tracking-tighterá': 'tracking-tighter',
    'shadow-innerá': 'shadow-inner',
    'animate-iná': 'animate-in',
    'duration-500á': 'duration-500',
    'duration-300á': 'duration-300',
    'duration-700á': 'duration-700',
    'duration-200á': 'duration-200',
    'opacity-0á': 'opacity-0',
    'group-hover:opacity-100á': 'group-hover:opacity-100',
    'leading-relaxedá': 'leading-relaxed',
    'rounded-3xlá': 'rounded-3xl',
    'rounded-2xlá': 'rounded-2xl',
    'shadow-2xlá': 'shadow-2xl',
    'shadow-xlá': 'shadow-xl',
    'shadow-mdá': 'shadow-md',
    'shadow-smá': 'shadow-sm',
    'shadow-innerá': 'shadow-inner',
    'ring-4á': 'ring-4',
    'ring-2á': 'ring-2',
    'ring-gray-900á': 'ring-gray-900',
    'blur-[150px]á': 'blur-[150px]',
    'blur-[120px]á': 'blur-[120px]',
    'rounded-fullá': 'rounded-full',
    'rounded-smá': 'rounded-sm',
    'rounded-lgá': 'rounded-lg',
    'rounded-xlá': 'rounded-xl',
    'rounded-[40px]á': 'rounded-[40px]',
    'rounded-[2.5rem]á': 'rounded-[2.5rem]',
    'rounded-[2rem]á': 'rounded-[2rem]',
    'gap-12á': 'gap-12',
    'gap-8á': 'gap-8',
    'gap-6á': 'gap-6',
    'gap-3á': 'gap-3',
    'gap-2á': 'gap-2',
    'gap-4á': 'gap-4',
    'p-12á': 'p-12',
    'p-10á': 'p-10',
    'p-6á': 'p-6',
    'p-4á': 'p-4',
    'px-10á': 'px-10',
    'px-12á': 'px-12',
    'px-8á': 'px-8',
    'px-6á': 'px-6',
    'px-4á': 'px-4',
    'py-2á': 'py-2',
    'py-3á': 'py-3',
    'py-4á': 'py-4',
    'py-1á': 'py-1',
    'mb-16á': 'mb-16',
    'mb-12á': 'mb-12',
    'mb-2á': 'mb-2',
    'mt-2á': 'mt-2',
    'mt-12á': 'mt-12',
    'mt-20á': 'mt-20',
    'mt-3á': 'mt-3',
    'mt-4á': 'mt-4',
    'ml-4á': 'ml-4',
    'mr-1á': 'mr-1',
    'mr-40á': '-mr-40',
    'mt-40á': '-mt-40',
    'ml-40á': '-ml-40',
    'mb-40á': '-mb-40',
    'z-[150]á': 'z-[150]',
    'z-[200]á': 'z-[200]',
    'z-[300]á': 'z-[300]',
    'z-10á': 'z-10',
    'backdrop-blur-[2px]á': 'backdrop-blur-[2px]',
    'tabular-numsá': 'tabular-nums',
    'uppercaseá': 'uppercase',
    'lowercaseá': 'lowercase',
    'capitalizeá': 'capitalize',
    'font-blacká': 'font-black',
    'font-boldá': 'font-bold',
    'font-mediumá': 'font-medium',
    'font-sansá': 'font-sans',
    'italicá': 'italic',
    'leading-noneá': 'leading-none',
    'leading-relaxedá': 'leading-relaxed',
    'tracking-widestá': 'tracking-widest',
    'tracking-tighterá': 'tracking-tighter',
    'tracking-tightá': 'tracking-tight',
    'tracking-[0.5em]á': 'tracking-[0.5em]',
    'tracking-[0.4em]á': 'tracking-[0.4em]',
    'tracking-[0.3em]á': 'tracking-[0.3em]',
    'duration-500á': 'duration-500',
    'duration-300á': 'duration-300',
    'duration-200á': 'duration-200',
    'transition-allá': 'transition-all',
    'hover:bg-blue-700á': 'hover:bg-blue-700',
    'hover:bg-emerald-700á': 'hover:bg-emerald-700',
    'hover:scale-[1.01]á': 'hover:scale-[1.01]',
    'active:scale-95á': 'active:scale-95',
}

for old, new in replacements.items():
    content = content.replace(old, new)

# 2. Fix specific broken strings in templates
content = content.replace('? No Iniciado', 'Não Iniciado')
content = content.replace('? necessário', 'é necessário')
content = content.replace('comear a registar', 'começar a registar')
content = content.replace('InTransit', 'toRecover') # Found this earlier
content = content.replace('MAPA DE INVENT?RIO', 'MAPA DE INVENTÁRIO')
content = content.replace('Auto-suggestá', 'Auto-sugestão')

# 3. Fix the "Dia Bloqueado" text and other Portuguese labels that got 'á' suffix
labels_fix = {
    'Balano': 'Balanço',
    'Gesto': 'Gestão',
    'Diário do Armazém': 'Diário do Armazém', # Check line 115
    'Geral Diário': 'Geral Diário',
}
for old, new in labels_fix.items():
    content = content.replace(old, new)

# 4. Remove any remaining stray 'á' at the end of CSS classes in quotes
content = re.sub(r'([a-zA-Z0-9\-\[\]\/]+)á"', r'\1"', content)
content = re.sub(r'([a-zA-Z0-9\-\[\]\/]+)á\s', r'\1 ', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Comprehensive cleanup finished.")
