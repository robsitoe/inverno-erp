# Configuração Simplificada de Meios de Pagamento

## 🎯 Objetivo
Criar uma interface **user-friendly** para configurar meios de pagamento, onde o utilizador trabalha com termos simples, mas o sistema garante que os lançamentos contábeis sejam feitos nas contas corretas.

## ✅ Solução Implementada

### 1. **Categorias Simples** (3 tipos básicos)

Em vez de o utilizador ter que escolher contas contábeis complexas, ele escolhe entre 3 categorias intuitivas:

| Categoria | Ícone | Descrição | Conta Automática |
|-----------|-------|-----------|------------------|
| **Dinheiro em Caixa** | 💵 | Pagamentos em dinheiro físico | 11.1.1 - Caixa |
| **Banco** | 🏦 | Transferências, cheques, cartões | 12.1.1 - Depósitos à Ordem |
| **Dinheiro Móvel** | 📱 | M-Pesa, E-Mola, etc. | 11.1.2 - Caixa - Dinheiro Móvel |

### 2. **Mapeamento Automático**

```typescript
getTreasuryAccountFromCategory(categoryId: string): string {
  const category = this.paymentCategories.find(c => c.id === categoryId);
  
  // Encontra a conta contábil correta automaticamente
  const account = this.treasuryAccounts.find(a => a.code === category.accountCode);
  
  return account?.id || defaultAccountId;
}
```

### 3. **Meios de Pagamento Pré-configurados**

O sistema já vem com meios de pagamento comuns configurados:

```typescript
💵 Numerário (Dinheiro)     → Categoria: CASH   → Conta: 11.1.1
🏦 Transferência Bancária   → Categoria: BANK   → Conta: 12.1.1
🏦 Cheque                   → Categoria: BANK   → Conta: 12.1.1
🏦 Multibanco/TPA           → Categoria: BANK   → Conta: 12.1.1
📱 M-Pesa                   → Categoria: MOBILE → Conta: 11.1.2
📱 E-Mola                   → Categoria: MOBILE → Conta: 11.1.2
```

### 4. **Interface Simplificada**

#### Antes (Complexo):
```
Meio de Pagamento: Numerário
Conta de Tesouraria: [Dropdown com 50+ contas contábeis] ❌ Confuso!
```

#### Depois (Simples):
```
Meio de Pagamento: 💵 Numerário
Tipo: 💵 Dinheiro em Caixa ✅ Intuitivo!
      (11.1.1) ← Mostra a conta automaticamente
```

## 📊 Fluxo de Trabalho

### Para o Utilizador:
1. Vai à aba "Dados Liquidação"
2. Clica em "Novo Meio" ou edita um existente
3. Preenche:
   - **Código**: NUM, TRF, MPESA, etc.
   - **Descrição**: Nome amigável
   - **Tipo**: Escolhe entre 💵 Caixa, 🏦 Banco ou 📱 Móvel
4. Sistema configura automaticamente a conta contábil correta!

### No Background (Automático):
```typescript
onCategoryChange(paymentMethod) {
  // Quando o utilizador escolhe "💵 Dinheiro em Caixa"
  // Sistema automaticamente define:
  paymentMethod.treasuryAccountId = '3'; // ID da conta 11.1.1 - Caixa
}
```

## 🎨 Benefícios

### Para o Utilizador:
- ✅ **Sem jargão contábil** - Usa termos do dia-a-dia
- ✅ **Menos erros** - Impossível escolher conta errada
- ✅ **Mais rápido** - 3 opções em vez de 50+
- ✅ **Visual** - Ícones ajudam a identificar rapidamente

### Para a Contabilidade:
- ✅ **Lançamentos corretos** - Mapeamento automático garante precisão
- ✅ **Consistência** - Todos usam as mesmas contas
- ✅ **Auditável** - Regras claras de mapeamento
- ✅ **Flexível** - Fácil adicionar novas categorias se necessário

## 🔧 Exemplo Prático

### Cenário: Adicionar "POS - Terminal de Pagamento"

**Utilizador faz:**
1. Clica "Novo Meio"
2. Código: `POS`
3. Descrição: `🏦 Terminal de Pagamento (POS)`
4. Tipo: `🏦 Banco`
5. Salva

**Sistema faz automaticamente:**
```typescript
{
  code: 'POS',
  description: '🏦 Terminal de Pagamento (POS)',
  category: 'BANK',
  treasuryAccountId: '10', // Automático!
  // Lançamentos irão para: 12.1.1 - Depósitos à Ordem
}
```

## 📝 Notas Técnicas

### Estrutura de Dados:
```typescript
interface PaymentMethod {
  id: string;
  code: string;
  description: string;
  category: 'CASH' | 'BANK' | 'MOBILE';  // Simples!
  treasuryAccountId: string;              // Mapeado automaticamente
  isActive: boolean;
  sortOrder: number;
}
```

### Mapeamento de Categorias:
```typescript
paymentCategories = [
  { 
    id: 'CASH', 
    name: 'Dinheiro em Caixa',
    accountCode: '11.1.1',  // Conta contábil correta
    accountName: 'Caixa'
  },
  // ... outras categorias
];
```

## 🚀 Próximos Passos (Opcional)

Se necessário expandir no futuro:

1. **Subcategorias** - Ex: Banco → Conta Corrente / Conta Poupança
2. **Múltiplas Contas** - Ex: Caixa Loja 1, Caixa Loja 2
3. **Regras Personalizadas** - Por empresa ou filial
4. **Importação** - Importar configurações de outra empresa

## ✨ Conclusão

O utilizador trabalha com conceitos simples (💵 Dinheiro, 🏦 Banco, 📱 Móvel), mas o sistema garante que todos os lançamentos contábeis sejam feitos nas contas corretas (11.1.1, 12.1.1, etc.).

**Resultado:** Interface amigável + Contabilidade precisa! 🎯
