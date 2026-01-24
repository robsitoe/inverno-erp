# Sistema de Validação de Lançamentos Contabilísticos

## 📋 Visão Geral

Este documento descreve o sistema profissional de validação de lançamentos contabilísticos implementado no Inverno ERP, seguindo as melhores práticas de ERPs empresariais (SAP, Primavera, PHC, Oracle NetSuite, TOTVS, Odoo).

## 🔄 Fluxo de Trabalho

### PASSO 1: Criação do Documento de Venda
- O operador ou vendedor cria uma fatura, nota de débito ou outro documento de venda
- O sistema valida os dados do documento (cliente, artigos, valores, impostos)
- O documento é gravado no sistema

### PASSO 2: Geração Automática de Lançamentos em RASCUNHO
Quando uma venda é processada, o sistema gera automaticamente **2 lançamentos em DRAFT**:

#### Lançamento 1: Reconhecimento da Venda
```
Débito:  21 - Clientes                    1.000,00
Crédito: 71 - Vendas de Mercadorias         800,00
Crédito: 32 - IVA a Pagar                   200,00
```

#### Lançamento 2: Custo das Mercadorias Vendidas (CMV)
```
Débito:  61 - CMV                           500,00
Crédito: 22 - Inventários                   500,00
```

**IMPORTANTE**: Estes lançamentos são criados com `status: 'DRAFT'` e **NÃO afetam os saldos das contas** até serem validados.

### PASSO 3: Revisão pelo Contabilista
O contabilista acessa a interface de "Revisão de Lançamentos" onde pode:

✅ **Visualizar** todos os lançamentos pendentes em rascunho
✅ **Expandir** cada lançamento para ver as linhas detalhadas
✅ **Verificar** se as contas estão corretas
✅ **Verificar** se os valores estão corretos
✅ **Verificar** se os impostos foram calculados corretamente
✅ **Editar** o lançamento se necessário (antes de validar)
✅ **Cancelar** lançamentos incorretos com justificativa

### PASSO 4: Validação e Postagem
Após a revisão, o contabilista pode:

**Opção A: Validar Individualmente**
- Clicar no botão "Validar" de cada lançamento
- O sistema valida que Débito = Crédito
- O sistema valida que todas as contas existem e permitem lançamentos
- O lançamento muda para `status: 'POSTED'`
- **Agora sim**, os saldos das contas são atualizados
- Auditoria completa é registrada

**Opção B: Validar em Lote**
- Selecionar múltiplos lançamentos
- Clicar em "Validar Selecionados"
- O sistema processa todos de uma vez
- Retorna sucesso/falha para cada um

### PASSO 5: Lançamento Definitivo
- Lançamentos validados movimentam o razão
- Aparecem no balancete
- Aparecem nas demonstrações financeiras
- Não podem mais ser editados diretamente
- Apenas podem ser corrigidos através de estorno + novo lançamento

## 🛡️ Controles de Segurança

### Validações Automáticas
Antes de postar um lançamento, o sistema valida:

1. **Balanceamento**: `Σ Débitos = Σ Créditos`
2. **Contas Existentes**: Todas as contas referenciadas existem no plano de contas
3. **Permissão de Lançamento**: Contas sintéticas (totalizadoras) não permitem lançamentos diretos
4. **Status Correto**: Apenas lançamentos em DRAFT podem ser validados

### Auditoria Completa
Cada ação é registrada:
- Quem criou o lançamento
- Quando foi criado
- Quem validou
- Quando foi validado
- Estado anterior e novo estado
- Motivo de qualquer alteração

## 📊 Estados dos Lançamentos

| Estado | Descrição | Afeta Saldos? | Pode Editar? |
|--------|-----------|---------------|--------------|
| **DRAFT** | Rascunho, aguardando validação | ❌ Não | ✅ Sim |
| **POSTED** | Validado e lançado | ✅ Sim | ❌ Não* |
| **CANCELLED** | Cancelado (nunca foi postado) | ❌ Não | ❌ Não |
| **CORRECTED** | Foi corrigido por outro lançamento | ❌ Não** | ❌ Não |
| **REVERSED** | Lançamento de estorno | ✅ Sim | ❌ Não |
| **VOIDED** | Anulado (limpeza de zeros) | ❌ Não | ❌ Não |

\* Pode ser corrigido através de estorno + novo lançamento  
\*\* O efeito foi revertido pelo lançamento de estorno

## 🔧 Métodos Disponíveis no AccountingService

### Criação de Lançamentos
```typescript
createSalesJournalEntry(salesDoc: SalesDocument): JournalEntry
// Cria lançamento de venda em DRAFT

createCOGSEntry(salesDoc: SalesDocument, articles: Article[]): void
// Cria lançamento de CMV em DRAFT

createManualJournalEntry(entry: JournalEntry): void
// Cria lançamento manual (pode ser DRAFT ou POSTED)
```

### Validação e Postagem
```typescript
postJournalEntry(entryId: string, userId: string): void
// Valida e posta um único lançamento

postMultipleEntries(entryIds: string[], userId: string): { success: string[]; failed: { id: string; error: string }[] }
// Valida e posta múltiplos lançamentos em lote

getDraftEntries(): JournalEntry[]
// Retorna apenas lançamentos em DRAFT para revisão
```

### Edição e Cancelamento
```typescript
updateJournalEntry(entryId: string, updates: Partial<JournalEntry>, userId: string): void
// Atualiza um lançamento em DRAFT

cancelDraftEntry(entryId: string, userId: string, reason: string): void
// Cancela um lançamento em DRAFT
```

### Correção de Lançamentos Postados
```typescript
correctJournalEntry(originalEntryId: string, correctedEntryData: Partial<JournalEntry>, reason: string, userId: string): void
// Corrige um lançamento POSTED através de:
// 1. Estorno do lançamento original
// 2. Criação do lançamento corrigido
// 3. Marcação do original como CORRECTED
```

## 🎯 Benefícios do Sistema

### ✅ Controlo Interno
- Separação de funções: quem vende ≠ quem valida contabilidade
- Previne fraudes e manipulações
- Garante revisão profissional antes de afetar o razão

### ✅ Qualidade dos Dados
- Reduz erros contabilísticos
- Permite correção antes de impactar relatórios
- Garante que apenas dados validados afetam demonstrações financeiras

### ✅ Auditoria e Compliance
- Rastro completo de todas as ações
- Justificativas obrigatórias para alterações
- Histórico imutável de quem fez o quê e quando

### ✅ Flexibilidade Operacional
- Vendas podem continuar normalmente
- Contabilidade valida em lote no final do dia/semana
- Permite ajustes sem reprocessar vendas

## 🚀 Como Usar

### Para Vendedores/Operadores
1. Criar documentos de venda normalmente
2. Sistema gera lançamentos automaticamente
3. Não precisa se preocupar com contabilidade

### Para Contabilistas
1. Acessar "Contabilidade" → "Revisão de Lançamentos"
2. Filtrar por "Rascunhos"
3. Revisar cada lançamento:
   - Verificar contas
   - Verificar valores
   - Verificar impostos
4. Validar individualmente ou em lote
5. Lançamentos validados aparecem no razão

### Para Gestores
1. Acessar relatórios contabilísticos
2. Ver apenas dados validados
3. Confiar na qualidade da informação
4. Auditar através dos logs

## 📝 Exemplo Prático

```typescript
// 1. Venda é criada
const salesDoc: SalesDocument = {
    id: 'SALE-001',
    documentNumber: 'FA 2025/001',
    customerName: 'Cliente ABC',
    total: 1000,
    subtotal: 800,
    totalIva: 200,
    // ... outros campos
};

// 2. Sistema gera lançamentos em DRAFT
const salesEntry = accountingService.createSalesJournalEntry(salesDoc);
accountingService.createCOGSEntry(salesDoc, articles);

// 3. Contabilista revisa
const drafts = accountingService.getDraftEntries();
console.log(`${drafts.length} lançamentos pendentes de validação`);

// 4. Contabilista valida
try {
    accountingService.postJournalEntry(salesEntry.id, 'joao.contabilista');
    console.log('Lançamento validado com sucesso!');
} catch (error) {
    console.error('Erro na validação:', error.message);
}

// 5. Agora o lançamento afeta o razão e aparece nos relatórios
```

## 🔐 Permissões Recomendadas

| Função | Criar Vendas | Ver Rascunhos | Validar Lançamentos | Corrigir Postados |
|--------|--------------|---------------|---------------------|-------------------|
| Vendedor | ✅ | ❌ | ❌ | ❌ |
| Operador | ✅ | ❌ | ❌ | ❌ |
| Contabilista | ❌ | ✅ | ✅ | ✅ |
| Gestor Financeiro | ❌ | ✅ | ✅ | ✅ |
| Administrador | ✅ | ✅ | ✅ | ✅ |

---

**Desenvolvido seguindo as melhores práticas de ERPs profissionais**
