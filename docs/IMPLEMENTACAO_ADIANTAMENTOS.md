# Implementação de Adiantamentos (ADC/ADF)

## Data: 2026-02-08

## Resumo

Implementação completa da funcionalidade de **Adiantamentos** no sistema ERP Inverno, permitindo:
- **ADC (Adiantamento de Cliente)** - Recebimentos antecipados de clientes
- **ADF (Adiantamento a Fornecedor)** - Pagamentos antecipados a fornecedores

## Alterações Realizadas

### 1. Payment Modal Component
**Arquivo:** `frontend/app/features/treasury/payment-modal.component.ts`

#### Mudanças:
- ✅ Adicionado import de `NgZone` e `ChangeDetectorRef`
- ✅ Adicionado tab "Adiantamentos" ao array de tabs
- ✅ Adicionados campos para adiantamentos:
  - `advanceAmount` - Valor do adiantamento
  - `advancePaymentMethod` - Meio de pagamento
  - `advanceObservations` - Observações
  - `docDate` - Data do documento
  - `isSaving` - Estado de gravação
- ✅ Implementado método `saveAdvancePayment()` para gravar ADF
- ✅ Implementado método `createAdvanceAccountingEntry()` para lançamentos contábeis
- ✅ Adicionada UI completa para o tab de Adiantamentos

#### Lançamento Contábil (ADF):
```
Débito: 22.9 - Adiantamentos a Fornecedores
Crédito: 11.x - Conta de Tesouraria (Caixa/Banco)
```

### 2. Receipt Modal Component
**Arquivo:** `frontend/app/features/treasury/receipt-modal.component.ts`

#### Mudanças:
- ✅ Adicionado import de `NgZone` e `ChangeDetectorRef`
- ✅ Adicionado tab "Adiantamentos" ao array de tabs
- ✅ Adicionados campos para adiantamentos:
  - `advanceAmount` - Valor do adiantamento
  - `advancePaymentMethod` - Meio de pagamento
  - `advanceObservations` - Observações
  - `docDate` - Data do documento
  - `isSaving` - Estado de gravação
- ✅ Implementado método `saveAdvanceReceipt()` para gravar ADC
- ✅ Implementado método `createAdvanceAccountingEntry()` para lançamentos contábeis
- ✅ Adicionada UI completa para o tab de Adiantamentos

#### Lançamento Contábil (ADC):
```
Débito: 11.x - Conta de Tesouraria (Caixa/Banco)
Crédito: 21.9 - Adiantamentos de Clientes
```

## Funcionalidades Implementadas

### Adiantamento de Cliente (ADC)
1. **Seleção de Cliente** - Via modal F4
2. **Valor do Adiantamento** - Campo numérico com validação
3. **Meio de Pagamento** - Seleção do meio de pagamento configurado
4. **Data do Documento** - Validação de período aberto
5. **Observações** - Campo de texto livre
6. **Gravação** - Salva no backend e cria lançamento contábil automático

### Adiantamento a Fornecedor (ADF)
1. **Seleção de Fornecedor** - Via modal F4
2. **Valor do Adiantamento** - Campo numérico com validação
3. **Meio de Pagamento** - Seleção do meio de pagamento configurado
4. **Data do Documento** - Validação de período aberto
5. **Observações** - Campo de texto livre
6. **Gravação** - Salva no backend e cria lançamento contábil automático

## Validações Implementadas

- ✅ Validação de período contábil aberto
- ✅ Validação de seleção de entidade (cliente/fornecedor)
- ✅ Validação de valor maior que zero
- ✅ Seleção automática de conta de tesouraria baseada no meio de pagamento
- ✅ Criação automática de lançamentos contábeis
- ✅ Feedback visual durante gravação (botão desabilitado)

## Integração Contábil

Os adiantamentos são automaticamente registrados no sistema contábil através do `AccountingService`, criando lançamentos com:
- **Journal ID** - Determinado pela conta de tesouraria (JNL-CSH para caixa, JNL-BNK para banco)
- **Linhas de Débito e Crédito** - Conforme regras contábeis
- **Referência ao Documento** - Link para rastreabilidade
- **Status** - POSTED (lançado)

## Como Usar

### Para criar um Adiantamento de Cliente (ADC):
1. Abrir o modal de Recebimentos
2. Clicar no tab "Adiantamentos"
3. Selecionar o cliente (botão F4)
4. Inserir o valor do adiantamento
5. Selecionar o meio de pagamento
6. Adicionar observações (opcional)
7. Clicar em "Gravar Adiantamento"

### Para criar um Adiantamento a Fornecedor (ADF):
1. Abrir o modal de Pagamentos
2. Clicar no tab "Adiantamentos"
3. Selecionar o fornecedor (botão F4)
4. Inserir o valor do adiantamento
5. Selecionar o meio de pagamento
6. Adicionar observações (opcional)
7. Clicar em "Gravar Adiantamento"

## Próximos Passos Sugeridos

1. **Liquidação de Adiantamentos** - Implementar funcionalidade para liquidar adiantamentos contra faturas
2. **Relatório de Adiantamentos** - Criar relatório de adiantamentos pendentes por cliente/fornecedor
3. **Integração com Extratos** - Mostrar adiantamentos nos extratos de conta corrente
4. **Validação de Saldo** - Adicionar validação de saldo disponível antes de criar ADF

## Notas Técnicas

- Os adiantamentos são salvos com tipo `ADVANCE_RECEIPT` ou `ADVANCE_PAYMENT`
- As contas contábeis usadas são:
  - **63** - Adiantamentos de Clientes (Passivo)
  - **64** - Adiantamentos a Fornecedores (Ativo)
- A integração usa `NgZone` e `ChangeDetectorRef` para garantir atualização correta da UI
- Os dados são salvos tanto no localStorage quanto no backend via `DataService`
