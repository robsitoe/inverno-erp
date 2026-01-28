---
artifact_type: implementation_plan
summary: |
  Plano de implementação para mapeamento automático de meios de pagamento para contas 
  contabilísticas na Tesouraria, incluindo suporte para múltiplos meios de pagamento 
  e lançamentos de ADC (Adiantamento de Cliente).
---

# Melhoria: Mapeamento Automático de Meios de Pagamento

## 🎯 Objetivo

Permitir que o utilizador configure uma vez a relação entre **Meios de Pagamento** (Numerário, Transferência, Cheque) e **Contas de Tesouraria** (11.1.1 - Caixa, 12.1.1 - Banco BCI, etc.), para que os lançamentos contabilísticos sejam gerados automaticamente de forma correta.

## 📊 Requisitos Funcionais

### 1. Configuração de Meios de Pagamento
- Criar interface de configuração na aba "Dados Liquidação"
- Permitir associar cada meio de pagamento a uma conta contabilística
- Armazenar configuração em localStorage e backend

### 2. Lançamentos com Múltiplos Meios
- Quando um documento é liquidado com múltiplos meios de pagamento:
  - Gerar **um único lançamento** contabilístico
  - Criar **múltiplas linhas de débito/crédito** (uma por meio de pagamento)
  - Exemplo: Recibo 10.000 MT = 5.000 Cheque + 5.000 Numerário
    ```
    Débito: 12.1.1 (Banco) ......... 5.000
    Débito: 11.1.1 (Caixa) ......... 5.000
    Crédito: 21.1.1 (Cliente) ...... 10.000
    ```

### 3. Suporte para ADC (Adiantamento de Cliente)
- Adicionar modo "Adiantamento" na Tesouraria
- Permitir lançar valor sem documento pendente
- Campos necessários:
  - Entidade (Cliente/Fornecedor)
  - Valor Total
  - Meio de Pagamento
  - Observações
- Lançamento: Débito Tesouraria → Crédito Adiantamentos

## 🏗️ Estrutura de Dados

### PaymentMethod (Meio de Pagamento)
```typescript
interface PaymentMethod {
  id: string;
  code: string;              // 'NUM', 'TRF', 'CHQ', 'MB', 'MBWAY'
  description: string;       // 'Numerário', 'Transferência', 'Cheque'
  treasuryAccountId: string; // ID da conta de tesouraria (ex: '3' = 11.1.1)
  isActive: boolean;
  sortOrder: number;
}
```

### Meios de Pagamento Padrão
| Código | Descrição | Conta Padrão |
|--------|-----------|--------------|
| NUM | Numerário | 11.1.1 - Caixa Principal |
| TRF | Transferência Bancária | 12.1.1 - BCI Conta Corrente |
| CHQ | Cheque | 12.1.1 - BCI Conta Corrente |
| MB | Multibanco | 12.1.1 - BCI Conta Corrente |
| MBWAY | MB WAY | 12.1.1 - BCI Conta Corrente |
| VISA | Cartão Visa | 12.1.1 - BCI Conta Corrente |
| MPESA | M-Pesa | 11.1.1 - Caixa Principal |

## 📝 Tarefas de Implementação

### Fase 1: Modelo de Dados e Serviço
- [ ] Criar interface `PaymentMethod` em `models.ts`
- [ ] Adicionar métodos no `DataService`:
  - `getPaymentMethods()`
  - `savePaymentMethod(method)`
- [ ] Criar dados padrão em `sample-data.ts`
- [ ] Adicionar endpoint no backend (`/payment-methods`)

### Fase 2: Interface de Configuração
- [ ] Adicionar secção "Meios de Pagamento" na aba "Dados Liquidação"
- [ ] Grid editável com colunas:
  - Código
  - Descrição
  - Conta de Tesouraria (dropdown)
  - Ativo (checkbox)
- [ ] Botões: Novo, Gravar, Remover

### Fase 3: Lógica de Lançamentos
- [ ] Modificar `createAccountingEntry()` em `treasury-management.component.ts`:
  - Agrupar linhas por meio de pagamento
  - Criar múltiplas linhas de débito/crédito conforme necessário
  - Usar `paymentMethod.treasuryAccountId` em vez de `selectedTreasuryAccount`
- [ ] Validar que a soma dos meios = valor total do documento

### Fase 4: Modo ADC (Adiantamento)
- [ ] Adicionar checkbox "Adiantamento (sem documento pendente)"
- [ ] Quando ativado:
  - Ocultar grid de documentos pendentes
  - Mostrar campos: Valor Total, Meio de Pagamento, Observações
  - Criar lançamento direto: Débito Tesouraria → Crédito Adiantamentos
- [ ] Conta de adiantamentos:
  - Cliente: 21.9 - Adiantamentos de Clientes
  - Fornecedor: 22.9 - Adiantamentos a Fornecedores

### Fase 5: Testes e Validação
- [ ] Testar recibo com 1 meio de pagamento
- [ ] Testar recibo com 2+ meios de pagamento
- [ ] Testar ADC de cliente
- [ ] Testar ADC de fornecedor
- [ ] Verificar lançamentos contabilísticos gerados
- [ ] Validar saldos das contas

## 🎨 Mockup da Interface

### Aba "Dados Liquidação" (Atualizada)
```
┌─────────────────────────────────────────────────────────────┐
│ Conta de Tesouraria Padrão: [12.1.1 - BCI Conta Corrente ▼]│
│                                                               │
│ ☐ Adiantamento (sem documento pendente)                      │
│                                                               │
│ ┌─ Meios de Pagamento ────────────────────────────────────┐ │
│ │ Código │ Descrição          │ Conta Tesouraria         │ │
│ │ NUM    │ Numerário          │ 11.1.1 - Caixa       [▼]│ │
│ │ TRF    │ Transferência      │ 12.1.1 - BCI         [▼]│ │
│ │ CHQ    │ Cheque             │ 12.1.1 - BCI         [▼]│ │
│ │ MBWAY  │ MB WAY             │ 12.1.1 - BCI         [▼]│ │
│ │ MPESA  │ M-Pesa             │ 11.1.1 - Caixa       [▼]│ │
│ └──────────────────────────────────────────────────────────┘ │
│ [+ Novo Meio]  [💾 Gravar Configuração]                      │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Trabalho do Utilizador

### Cenário 1: Recibo Normal (com documentos pendentes)
1. Selecionar Cliente
2. Marcar documentos a liquidar
3. Para cada linha, escolher meio de pagamento (NUM, TRF, etc.)
4. Sistema calcula automaticamente a conta de tesouraria baseado no meio
5. Confirmar → Lançamento gerado automaticamente

### Cenário 2: ADC (Adiantamento sem documento)
1. Selecionar Cliente
2. Marcar checkbox "Adiantamento"
3. Inserir Valor Total
4. Escolher Meio de Pagamento
5. Confirmar → Lançamento: Débito Tesouraria → Crédito Adiantamentos

## ✅ Critérios de Aceitação

- [ ] Utilizador consegue configurar meios de pagamento uma única vez
- [ ] Lançamentos são gerados automaticamente com as contas corretas
- [ ] Suporte para múltiplos meios de pagamento no mesmo documento
- [ ] ADC pode ser lançado sem documento pendente
- [ ] Interface é simples e não requer conhecimento contabilístico profundo
- [ ] Configuração é persistida e reutilizada

## 📚 Notas Técnicas

### Contas Contabilísticas Relevantes
- **11.1.1** - Caixa Principal (Numerário, M-Pesa)
- **12.1.1** - BCI Conta Corrente (Transferências, Cheques, Cartões)
- **12.1.2** - Millennium BIM (Alternativa)
- **21.9** - Adiantamentos de Clientes (a criar)
- **22.9** - Adiantamentos a Fornecedores (a criar)

### Diários Contabilísticos
- Caixa (11.x) → Diário de Caixa (JNL-CSH)
- Banco (12.x) → Diário de Bancos (JNL-BNK)

### Validações
- Soma dos meios de pagamento = Valor total do documento
- Meio de pagamento deve ter conta associada
- Conta de tesouraria deve ser do tipo ASSET
- Conta de tesouraria deve permitir lançamentos (allowPosting = true)
