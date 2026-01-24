# Sistema de Inventário Integrado - Inverno ERP

## 📋 Visão Geral

O Sistema de Inventário Integrado do Inverno ERP é uma solução completa para gestão de stock que integra documentos de movimentação, relatórios analíticos e controle multidimensional de consumos.

## 🔄 Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                  DOCUMENTOS DE STOCK                         │
│  (ES - Entrada Stock, SS - Saída Stock, etc.)               │
│                 localStorage: erp_stock_documents            │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────────┐ ┌────────────┐ ┌──────────────────┐
│ Extrato de     │ │ Relatório  │ │ Relatório de     │
│ Artigos        │ │ Inventário │ │ Consumos         │
│                │ │            │ │                  │
│ • Movimentos   │ │ • Stock    │ │ • Análise por    │
│ • Saldos       │ │   Atual    │ │   Centro Custo   │
│ • Valorização  │ │ • Valores  │ │ • Análise por    │
│                │ │            │ │   Projeto        │
└────────────────┘ └────────────┘ └──────────────────┘
```

## 📦 Tipos de Documentos de Stock

### Documentos de Entrada (Aumentam Stock)

| Tipo | Descrição | Uso |
|------|-----------|-----|
| **FI** | Entrada de Stock | Receção de mercadorias, compras |
| **SI** | Stock Inicial | Abertura de exercício, inventário inicial |
| **LE** | Lançamento de Encargos | Custos adicionais ao stock |
| **AIP** | Acertos de Inventário Positivos | Correções positivas após contagem física |

### Documentos de Saída (Diminuem Stock)

| Tipo | Descrição | Uso |
|------|-----------|-----|
| **FS** | Saída de Stock | Vendas, consumos, transferências |
| **AIN** | Acertos de Inventário Negativos | Correções negativas após contagem física |
| **LD** | Lançamento de Descontos | Descontos que reduzem valor do stock |

### Outros Documentos

| Tipo | Descrição | Uso |
|------|-----------|-----|
| **TA** | Transferência entre Armazéns | Move stock entre localizações |
| **CP** | Composição de Produtos | Produção/montagem |
| **DP** | Decomposição de Produtos | Desmontagem |

## 🗂️ Estrutura de Dados

### Documento de Stock

```typescript
interface StockDocument {
  id: string;                    // Identificador único
  series: string;                // Série do documento (ex: "A", "B")
  number: number;                // Número sequencial
  type: string;                  // Tipo (FI, FS, SI, etc.)
  date: string;                  // Data do documento
  time: string;                  // Hora do documento
  warehouse: string;             // Armazém principal
  status: 'DRAFT' | 'POSTED';   // Estado do documento
  
  // Dimensões Analíticas (origem)
  originAccount: string;         // Conta contabilística
  originCostCenter: string;      // Centro de custo
  originProject: string;         // Projeto
  originAnalytic: string;        // Dimensão analítica
  originFunctional: string;      // Dimensão funcional
  originPep: string;             // Elemento PEP (SAP)
  
  lines: StockDocumentLine[];    // Linhas do documento
}
```

### Linha de Documento

```typescript
interface StockDocumentLine {
  id: string;
  articleCode: string;           // Código do artigo
  articleName: string;           // Descrição do artigo
  warehouse: string;             // Armazém específico da linha
  location: string;              // Localização no armazém
  batch: string;                 // Lote/Batch
  quantity: number;              // Quantidade
  unitPrice: number;             // Preço unitário
  total: number;                 // Total da linha
  
  // Dimensões Analíticas (linha)
  generalAccount: string;        // Conta geral
  costCenter: string;            // Centro de custo
  project: string;               // Projeto
  analytic: string;              // Analítico
  functional: string;            // Funcional
  pepElement: string;            // Elemento PEP
  item: string;                  // Item
}
```

## 📊 Relatórios Disponíveis

### 1. Extrato de Artigos (Article Statement)

**Objetivo**: Mostrar todos os movimentos de um ou mais artigos num período.

**Funcionalidades**:
- ✅ Filtros por artigo, período, armazém, tipo de documento
- ✅ Cálculo de saldo inicial e final
- ✅ Movimentos detalhados (entradas e saídas)
- ✅ Valorização do stock
- ✅ Exportação para Excel/CSV

**Exemplo de Uso**:
```
Artigo: MAT-001 - Parafuso M8
Período: 01/11/2025 a 30/11/2025

Saldo Inicial: 1.000 un

Data       | Tipo | Documento  | Entradas | Saídas | Saldo
-----------|------|------------|----------|--------|-------
05/11/2025 | FI   | FIA/001    | 500      | -      | 1.500
10/11/2025 | FS   | FSA/015    | -        | 200    | 1.300
15/11/2025 | FS   | FSA/020    | -        | 150    | 1.150

Totais:                         | 500      | 350    | 1.150
```

### 2. Relatório de Inventário (Inventory Report)

**Objetivo**: Mostrar o stock atual de todos os artigos.

**Funcionalidades**:
- ✅ Stock atual calculado a partir dos movimentos reais
- ✅ Filtros por artigo, armazém, categoria
- ✅ Valorização total do inventário
- ✅ Identificação de artigos com stock negativo
- ✅ Exportação para Excel/CSV

**Cálculo do Stock Atual**:
```
Stock Atual = Σ Entradas - Σ Saídas

Onde:
- Entradas = FI + SI + LE + AIP
- Saídas = FS + AIN + LD
```

### 3. Relatório de Consumos (Consumption Report) ⭐ NOVO

**Objetivo**: Analisar consumos de materiais por diferentes dimensões analíticas.

**Funcionalidades**:
- ✅ Análise de consumos (apenas saídas: FS, AIN, LD)
- ✅ Agrupamento por:
  - Artigo
  - Centro de Custo
  - Projeto
  - Armazém
  - Data
- ✅ Filtros por dimensões analíticas
- ✅ Estatísticas resumidas:
  - Total consumido (valor)
  - Número de consumos
  - Artigos diferentes
  - Média por consumo
- ✅ Visualização detalhada ou resumida
- ✅ Exportação para Excel/CSV

**Exemplo - Agrupado por Centro de Custo**:
```
Relatório de Consumos
Período: 01/11/2025 a 30/11/2025
Agrupado por: Centro de Custo

┌─────────────────────────────────────────────────────┐
│ PRODUÇÃO (CC-001)                                   │
│ 45 consumos | 23 artigos | Total: 15.450,00 €      │
├─────────────────────────────────────────────────────┤
│ Data       | Artigo    | Qtd    | Valor           │
│ 05/11/2025 | MAT-001   | 200    | 1.200,00 €      │
│ 10/11/2025 | MAT-015   | 50     | 2.500,00 €      │
│ ...                                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ MANUTENÇÃO (CC-002)                                 │
│ 28 consumos | 15 artigos | Total: 8.750,00 €       │
├─────────────────────────────────────────────────────┤
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

## 🎯 Casos de Uso

### Caso 1: Receção de Mercadoria

```typescript
// 1. Criar documento de entrada
const entryDoc: StockDocument = {
  type: 'FI',
  series: 'A',
  number: 123,
  date: '2025-11-05',
  warehouse: 'ARM-01',
  originCostCenter: 'CC-COMPRAS',
  lines: [
    {
      articleCode: 'MAT-001',
      articleName: 'Parafuso M8',
      quantity: 500,
      unitPrice: 0.50,
      total: 250.00,
      warehouse: 'ARM-01',
      location: 'A-01-15',
      batch: 'LOTE-2025-11'
    }
  ]
};

// 2. Salvar no localStorage
localStorage.setItem('erp_stock_documents', JSON.stringify([...docs, entryDoc]));

// 3. O stock é automaticamente atualizado nos relatórios
```

### Caso 2: Consumo para Produção

```typescript
// 1. Criar documento de saída
const exitDoc: StockDocument = {
  type: 'FS',
  series: 'A',
  number: 45,
  date: '2025-11-10',
  warehouse: 'ARM-01',
  originCostCenter: 'CC-PRODUCAO',
  originProject: 'PROJ-2025-001',
  lines: [
    {
      articleCode: 'MAT-001',
      articleName: 'Parafuso M8',
      quantity: 200,
      unitPrice: 0.50,
      total: 100.00,
      costCenter: 'CC-PRODUCAO',
      project: 'PROJ-2025-001'
    }
  ]
};

// 2. Salvar
localStorage.setItem('erp_stock_documents', JSON.stringify([...docs, exitDoc]));

// 3. Aparece automaticamente em:
//    - Extrato de Artigos (MAT-001)
//    - Relatório de Inventário (reduz stock)
//    - Relatório de Consumos (CC-PRODUCAO, PROJ-2025-001)
```

### Caso 3: Análise de Consumos por Projeto

```typescript
// No Relatório de Consumos:
// 1. Selecionar agrupamento: "Projeto"
// 2. Filtrar período: 01/11/2025 a 30/11/2025
// 3. Gerar relatório

// Resultado:
// PROJ-2025-001: 15.450,00 € (45 consumos, 23 artigos)
// PROJ-2025-002: 8.750,00 € (28 consumos, 15 artigos)
// (Sem Projeto): 2.300,00 € (12 consumos, 8 artigos)
```

## 🔗 Integração com Contabilidade

### Lançamentos Automáticos

Quando um documento de stock é criado, podem ser gerados lançamentos contabilísticos:

#### Entrada de Stock (FI)
```
Débito:  22 - Inventários           500,00
Crédito: 21 - Fornecedores          500,00
```

#### Saída de Stock (FS)
```
Débito:  61 - CMV                   300,00
Crédito: 22 - Inventários           300,00
```

**Nota**: Os lançamentos são criados em **DRAFT** e precisam ser validados pelo contabilista (ver `SISTEMA_VALIDACAO_LANCAMENTOS.md`).

## 📈 Dimensões Analíticas

O sistema suporta análise multidimensional:

| Dimensão | Descrição | Exemplo |
|----------|-----------|---------|
| **Centro de Custo** | Departamento/Setor | CC-PRODUCAO, CC-VENDAS |
| **Projeto** | Projeto específico | PROJ-2025-001 |
| **Analítico** | Dimensão livre 1 | CLIENTE-A, REGIAO-NORTE |
| **Funcional** | Dimensão livre 2 | FUNCAO-X |
| **PEP Element** | Estrutura SAP | PEP-001 |
| **Item** | Item de projeto | ITEM-001 |

### Benefícios da Análise Multidimensional

✅ **Controle de Custos**: Saber quanto cada centro de custo consome  
✅ **Gestão de Projetos**: Rastrear consumos por projeto  
✅ **Análise de Rentabilidade**: Custos reais vs. orçados  
✅ **Tomada de Decisão**: Dados precisos para decisões estratégicas  

## 🛡️ Validações e Controles

### Validações Automáticas

1. **Stock Negativo**: Sistema alerta mas permite (para correções)
2. **Artigo Inexistente**: Validação na criação do documento
3. **Armazém Inválido**: Verificação de armazéns cadastrados
4. **Preços**: Validação de valores negativos

### Auditoria

Todos os documentos registram:
- Data e hora de criação
- Usuário que criou
- Alterações realizadas
- Estado (DRAFT/POSTED)

## 📱 Interface do Usuário

### Navegação

```
Inventário
├── Movimentos de Stock
│   ├── Novo Documento
│   ├── Consultar Documentos
│   └── Editar Documento
├── Relatórios
│   ├── Extrato de Artigos
│   ├── Relatório de Inventário
│   └── Relatório de Consumos ⭐
└── Configurações
    ├── Artigos
    ├── Armazéns
    ├── Localizações
    └── Lotes
```

### Características da Interface

✅ **Filtros Avançados**: Múltiplos critérios de pesquisa  
✅ **Exportação**: PDF, Excel, CSV  
✅ **Impressão**: Layouts profissionais  
✅ **Responsivo**: Funciona em desktop e tablet  
✅ **Tempo Real**: Dados sempre atualizados  

## 🚀 Próximas Funcionalidades

- [ ] Gestão de Lotes com rastreabilidade completa
- [ ] Alertas de stock mínimo
- [ ] Previsão de consumo (ML)
- [ ] Integração com código de barras
- [ ] Dashboard de inventário
- [ ] Relatório de rotatividade de stock
- [ ] Análise ABC de artigos

## 📝 Melhores Práticas

### 1. Organização de Armazéns
- Use códigos claros (ARM-01, ARM-02)
- Defina localizações (A-01-15 = Corredor A, Prateleira 01, Posição 15)
- Mantenha armazéns separados por tipo de material

### 2. Gestão de Lotes
- Use nomenclatura consistente (LOTE-YYYY-MM-XXX)
- Registre data de validade quando aplicável
- Rastreie fornecedor no lote

### 3. Centros de Custo
- Estruture hierarquicamente
- Use prefixos (CC-PROD, CC-ADM, CC-VEND)
- Documente responsáveis

### 4. Projetos
- Código único por projeto
- Associe orçamento
- Monitore consumos vs. orçado

## 🔧 Troubleshooting

### Problema: Stock não atualiza
**Solução**: Verificar se documento está em status POSTED

### Problema: Valores incorretos no relatório
**Solução**: Verificar preços unitários nas linhas dos documentos

### Problema: Consumos não aparecem
**Solução**: Verificar se tipo de documento é FS, AIN ou LD

---

**Sistema desenvolvido seguindo as melhores práticas de ERPs profissionais**  
**Inverno ERP - Gestão Empresarial Integrada**
