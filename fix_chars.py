import os, io

path = r'c:\Users\Nelson\Documents\Programacao\inverno-erp\frontend\app\features\inventory\gas-control.component.ts'
with io.open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

replacements = {
    'TIPO PRE?O': 'TIPO PREÇO',
    'CAU?O': 'CAUÇÃO',
    'Mapas de Opera??es': 'Mapas de Operações',
    'Aten??o': 'Atenção',
    'discrep?ncia': 'discrepância',
    'rectificao?': 'rectificação?',
    'alteraes serão': 'alterações serão',
    'Edio': 'Edição',
    'impresso': 'impressão',
    'Opera?tes': 'Operações',
    'Lanamento de Vendas e Movimentao por Marca': 'Lançamento de Vendas e Movimentação por Marca',
    'Gesto de Fluxo e Movimentao': 'Gestão de Fluxo e Movimentação',
    'Lan?amentos': 'Lançamentos',
    'Lan?amento': 'Lançamento',
    'movimenta??o': 'movimentação',
    'D?vida': 'Dívida',
    'Cr?ditos': 'Créditos'
}

for old, new in replacements.items():
    content = content.replace(old, new)

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Character replacement completed.")
