
import os

file_path = r'c:\Users\yoriy\OneDrive\Documentos\Projectos\old\inverno-erp\frontend\app\features\treasury\treasury-management.component.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix encoding artifacts if any
# HistÃ³rico -> Histórico
content = content.replace('HistÃ³rico', 'Histórico')
# LiquidaÃ§Ã£o -> Liquidação
content = content.replace('LiquidaÃ§Ã£o', 'Liquidação')
# RestriÃ§Ãµes -> Restrições
content = content.replace('RestriÃ§Ãµes', 'Restrições')

# Fix the specific "?? " and "??" markers for emojis
# Based on the view_file output:
# Line 733: icon: '??',
content = content.replace("icon: '??',", "icon: '💵',", 1) # First occurrence: CASH
content = content.replace("icon: '??',", "icon: '🏦',", 1) # Second occurrence: BANK
content = content.replace("icon: '??',", "icon: '📱',", 1) # Third occurrence: MOBILE

# Line 940: description: '?? M-Pesa',
content = content.replace("'?? M-Pesa'", "'📱 M-Pesa'")
content = content.replace("'?? E-Mola'", "'📱 E-Mola'")

# Fix "Exemplo: Numerário ? Caixa"
content = content.replace('Numerário ? Caixa', 'Numerário ➔ Caixa')
content = content.replace('Transferência ? Banco', 'Transferência ➔ Banco')

# Fix logic issue: pending <= 1 -> pending <= 0.01 (to handle floating point better)
content = content.replace('if (pending <= 1) return null;', 'if (pending <= 0.01) return null;')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed treasury component encoding and logic.")
