# 🔧 Guia de Atualização - Interface Simplificada de Meios de Pagamento

## 📍 Problema Atual
A interface ainda mostra o dropdown complexo de "Conta de Tesouraria" com todas as contas contábeis, confundindo o utilizador.

## ✅ Solução
Substituir por uma interface simplificada com 3 categorias intuitivas.

---

## 🛠️ Instruções de Atualização

### Passo 1: Abrir o Arquivo
Abra: `frontend/app/features/treasury/treasury-management.component.ts`

### Passo 2: Localizar a Seção
Procure pela linha **330** que contém:
```html
<th class="px-2 py-1 text-left">Conta de Tesouraria</th>
```

### Passo 3: Substituir o Cabeçalho da Tabela
**SUBSTITUIR a linha 330:**
```html
<!-- ANTES -->
<th class="px-2 py-1 text-left">Conta de Tesouraria</th>

<!-- DEPOIS -->
<th class="px-2 py-1 text-left w-40">Tipo</th>
```

### Passo 4: Substituir a Coluna de Seleção
**LOCALIZAR as linhas 353-363** (coluna de conta):
```html
<td class="px-2 py-1">
  <select *ngIf="editingPaymentMethod?.id === pm.id" 
          [(ngModel)]="editingPaymentMethod.treasuryAccountId" 
          class="w-full border border-blue-300 rounded-sm px-1 py-0.5">
     <option value="">Selecione...</option>
     <option *ngFor="let acc of treasuryAccounts" [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
  </select>
  <span *ngIf="editingPaymentMethod?.id !== pm.id" class="text-gray-700">
     {{ getTreasuryAccountDisplay(pm.treasuryAccountId) }}
  </span>
</td>
```

**SUBSTITUIR POR:**
```html
<td class="px-2 py-1">
  <!-- Edit Mode: Category Dropdown -->
  <select *ngIf="editingPaymentMethod?.id === pm.id" 
          [(ngModel)]="editingPaymentMethod.category"
          (change)="onCategoryChange(editingPaymentMethod)"
          class="w-full border border-blue-300 rounded-sm px-1 py-0.5 text-xs">
    <option *ngFor="let cat of paymentCategories" [value]="cat.id">
      {{ cat.icon }} {{ cat.name }}
    </option>
  </select>
  
  <!-- View Mode: Show Category with Account Code -->
  <span *ngIf="editingPaymentMethod?.id !== pm.id" class="flex items-center gap-1">
    <span>{{ getCategoryDisplay(pm.category) }}</span>
    <span class="text-[10px] text-gray-400" [title]="getTreasuryAccountDisplay(pm.treasuryAccountId)">
      ({{ getTreasuryAccountCode(pm.treasuryAccountId) }})
    </span>
  </span>
</td>
```

### Passo 5: Atualizar o Texto de Ajuda
**LOCALIZAR as linhas 407-410:**
```html
<div class="bg-gray-50 px-3 py-2 border-t border-gray-300 text-[10px] text-gray-600">
  <p><strong>Dica:</strong> Configure cada meio de pagamento com a conta de tesouraria correspondente. 
  Exemplo: Numerário → Caixa (11.1.1), Transferência → Banco (12.1.1)</p>
</div>
```

**SUBSTITUIR POR:**
```html
<div class="bg-gray-50 px-3 py-2 border-t border-gray-300 text-[10px] text-gray-600">
  <p><strong>💡 Dica:</strong> Escolha o tipo de cada meio de pagamento:</p>
  <ul class="mt-1 ml-4 space-y-0.5">
    <li>💵 <strong>Dinheiro em Caixa</strong> - Para pagamentos em dinheiro físico</li>
    <li>🏦 <strong>Banco</strong> - Para transferências, cheques e cartões bancários</li>
    <li>📱 <strong>Dinheiro Móvel</strong> - Para M-Pesa, E-Mola, etc.</li>
  </ul>
  <p class="mt-2 text-gray-500 italic">O sistema configura automaticamente as contas contábeis corretas.</p>
</div>
```

---

## 📋 Template Completo

O template completo está disponível em:
`docs/payment-methods-table-template.html`

Você pode copiar todo o conteúdo desse arquivo e substituir as linhas 324-410 no componente principal.

---

## ✅ Verificação

Após fazer as mudanças:

1. **Salvar o arquivo**
2. **Recompilar**: `ng serve`
3. **Abrir o navegador** e ir para Tesouraria → Dados Liquidação
4. **Verificar** que agora mostra:
   - Coluna "Tipo" em vez de "Conta de Tesouraria"
   - Dropdown com 3 opções: 💵 Dinheiro em Caixa, 🏦 Banco, 📱 Dinheiro Móvel
   - Código da conta entre parênteses (ex: "💵 Dinheiro em Caixa (11.1.1)")

---

## 🎯 Resultado Esperado

### Antes:
```
| Código | Descrição | Conta de Tesouraria ▼ | Ativo | Ordem |
|--------|-----------|------------------------|-------|-------|
| NUM    | Numerário | 11.1.1 - Caixa ▼      |  ✓    |   1   |
```

### Depois:
```
| Código | Descrição                | Tipo                           | Ativo | Ordem |
|--------|--------------------------|--------------------------------|-------|-------|
| NUM    | 💵 Numerário (Dinheiro) | 💵 Dinheiro em Caixa (11.1.1) |  ✓    |   1   |
```

---

## 🆘 Problemas?

Se encontrar erros de compilação:

1. Verifique que todas as funções helper existem no componente:
   - `getCategoryDisplay()`
   - `getTreasuryAccountCode()`
   - `onCategoryChange()`
   - `paymentCategories` array

2. Verifique que os meios de pagamento têm o campo `category`:
   - Pode ser necessário limpar localStorage: `localStorage.clear()`
   - Ou adicionar migração para adicionar `category` aos registos existentes

---

## 📝 Notas Importantes

- ✅ **Todas as funções TypeScript já estão implementadas** no componente
- ✅ **O sistema de categorias já está configurado**
- ✅ **O mapeamento automático já funciona**
- ⚠️ **Apenas falta atualizar o template HTML**

A mudança é **apenas visual** - a lógica já está pronta!
