# 📊 Dados de Teste - Sistema de Inventário Integrado

## 🎯 Objetivo

Este arquivo contém dados de exemplo para testar completamente o sistema de inventário integrado, incluindo o novo **Relatório de Consumos**.

---

## 📦 Documentos de Stock para Teste

### 1. Stock Inicial (SI)

```json
{
  "id": "SI-001",
  "type": "SI",
  "series": "A",
  "number": 1,
  "date": "2025-12-01",
  "time": "08:00",
  "warehouse": "ARM-01",
  "status": "POSTED",
  "originAccount": "22",
  "originCostCenter": "",
  "originProject": "",
  "lines": [
    {
      "id": "SI-001-L1",
      "articleCode": "MAT-001",
      "articleName": "Parafuso M8 x 20mm",
      "warehouse": "ARM-01",
      "location": "A-01-15",
      "batch": "LOTE-2025-001",
      "quantity": 5000,
      "unitPrice": 0.50,
      "total": 2500.00,
      "unit": "UN",
      "costCenter": "",
      "project": ""
    },
    {
      "id": "SI-001-L2",
      "articleCode": "MAT-002",
      "articleName": "Chapa Aço 1mm",
      "warehouse": "ARM-01",
      "location": "B-02-10",
      "batch": "LOTE-2025-002",
      "quantity": 200,
      "unitPrice": 25.00,
      "total": 5000.00,
      "unit": "M2",
      "costCenter": "",
      "project": ""
    },
    {
      "id": "SI-001-L3",
      "articleCode": "MAT-003",
      "articleName": "Tinta Branca 5L",
      "warehouse": "ARM-01",
      "location": "C-03-05",
      "batch": "LOTE-2025-003",
      "quantity": 100,
      "unitPrice": 45.00,
      "total": 4500.00,
      "unit": "LT",
      "costCenter": "",
      "project": ""
    }
  ]
}
```

### 2. Entrada de Stock - Compra (FI)

```json
{
  "id": "FI-001",
  "type": "FI",
  "series": "A",
  "number": 1,
  "date": "2025-12-05",
  "time": "10:30",
  "warehouse": "ARM-01",
  "status": "POSTED",
  "originAccount": "21",
  "originCostCenter": "CC-COMPRAS",
  "originProject": "",
  "lines": [
    {
      "id": "FI-001-L1",
      "articleCode": "MAT-001",
      "articleName": "Parafuso M8 x 20mm",
      "warehouse": "ARM-01",
      "location": "A-01-15",
      "batch": "LOTE-2025-004",
      "quantity": 2000,
      "unitPrice": 0.48,
      "total": 960.00,
      "unit": "UN",
      "costCenter": "CC-COMPRAS",
      "project": ""
    },
    {
      "id": "FI-001-L2",
      "articleCode": "MAT-002",
      "articleName": "Chapa Aço 1mm",
      "warehouse": "ARM-01",
      "location": "B-02-10",
      "batch": "LOTE-2025-005",
      "quantity": 150,
      "unitPrice": 24.50,
      "total": 3675.00,
      "unit": "M2",
      "costCenter": "CC-COMPRAS",
      "project": ""
    }
  ]
}
```

### 3. Saída para Produção - Projeto A (FS)

```json
{
  "id": "FS-001",
  "type": "FS",
  "series": "A",
  "number": 1,
  "date": "2025-12-08",
  "time": "09:15",
  "warehouse": "ARM-01",
  "status": "POSTED",
  "originAccount": "61",
  "originCostCenter": "CC-PRODUCAO",
  "originProject": "PROJ-2025-001",
  "lines": [
    {
      "id": "FS-001-L1",
      "articleCode": "MAT-001",
      "articleName": "Parafuso M8 x 20mm",
      "warehouse": "ARM-01",
      "location": "A-01-15",
      "batch": "LOTE-2025-001",
      "quantity": 500,
      "unitPrice": 0.50,
      "total": 250.00,
      "unit": "UN",
      "costCenter": "CC-PRODUCAO",
      "project": "PROJ-2025-001",
      "analytic": "CLIENTE-ABC",
      "functional": "MONTAGEM"
    },
    {
      "id": "FS-001-L2",
      "articleCode": "MAT-002",
      "articleName": "Chapa Aço 1mm",
      "warehouse": "ARM-01",
      "location": "B-02-10",
      "batch": "LOTE-2025-002",
      "quantity": 50,
      "unitPrice": 25.00,
      "total": 1250.00,
      "unit": "M2",
      "costCenter": "CC-PRODUCAO",
      "project": "PROJ-2025-001",
      "analytic": "CLIENTE-ABC",
      "functional": "CORTE"
    },
    {
      "id": "FS-001-L3",
      "articleCode": "MAT-003",
      "articleName": "Tinta Branca 5L",
      "warehouse": "ARM-01",
      "location": "C-03-05",
      "batch": "LOTE-2025-003",
      "quantity": 10,
      "unitPrice": 45.00,
      "total": 450.00,
      "unit": "LT",
      "costCenter": "CC-PRODUCAO",
      "project": "PROJ-2025-001",
      "analytic": "CLIENTE-ABC",
      "functional": "PINTURA"
    }
  ]
}
```

### 4. Saída para Produção - Projeto B (FS)

```json
{
  "id": "FS-002",
  "type": "FS",
  "series": "A",
  "number": 2,
  "date": "2025-12-10",
  "time": "11:00",
  "warehouse": "ARM-01",
  "status": "POSTED",
  "originAccount": "61",
  "originCostCenter": "CC-PRODUCAO",
  "originProject": "PROJ-2025-002",
  "lines": [
    {
      "id": "FS-002-L1",
      "articleCode": "MAT-001",
      "articleName": "Parafuso M8 x 20mm",
      "warehouse": "ARM-01",
      "location": "A-01-15",
      "batch": "LOTE-2025-004",
      "quantity": 800,
      "unitPrice": 0.48,
      "total": 384.00,
      "unit": "UN",
      "costCenter": "CC-PRODUCAO",
      "project": "PROJ-2025-002",
      "analytic": "CLIENTE-XYZ",
      "functional": "MONTAGEM"
    },
    {
      "id": "FS-002-L2",
      "articleCode": "MAT-002",
      "articleName": "Chapa Aço 1mm",
      "warehouse": "ARM-01",
      "location": "B-02-10",
      "batch": "LOTE-2025-005",
      "quantity": 75,
      "unitPrice": 24.50,
      "total": 1837.50,
      "unit": "M2",
      "costCenter": "CC-PRODUCAO",
      "project": "PROJ-2025-002",
      "analytic": "CLIENTE-XYZ",
      "functional": "CORTE"
    }
  ]
}
```

### 5. Saída para Manutenção (FS)

```json
{
  "id": "FS-003",
  "type": "FS",
  "series": "A",
  "number": 3,
  "date": "2025-12-12",
  "time": "14:30",
  "warehouse": "ARM-01",
  "status": "POSTED",
  "originAccount": "61",
  "originCostCenter": "CC-MANUTENCAO",
  "originProject": "",
  "lines": [
    {
      "id": "FS-003-L1",
      "articleCode": "MAT-001",
      "articleName": "Parafuso M8 x 20mm",
      "warehouse": "ARM-01",
      "location": "A-01-15",
      "batch": "LOTE-2025-001",
      "quantity": 200,
      "unitPrice": 0.50,
      "total": 100.00,
      "unit": "UN",
      "costCenter": "CC-MANUTENCAO",
      "project": "",
      "analytic": "MANUTENCAO-PREVENTIVA",
      "functional": "EQUIPAMENTO-A"
    },
    {
      "id": "FS-003-L2",
      "articleCode": "MAT-003",
      "articleName": "Tinta Branca 5L",
      "warehouse": "ARM-01",
      "location": "C-03-05",
      "batch": "LOTE-2025-003",
      "quantity": 5,
      "unitPrice": 45.00,
      "total": 225.00,
      "unit": "LT",
      "costCenter": "CC-MANUTENCAO",
      "project": "",
      "analytic": "MANUTENCAO-PREVENTIVA",
      "functional": "PINTURA-INSTALACOES"
    }
  ]
}
```

### 6. Saída para Vendas/Administrativo (FS)

```json
{
  "id": "FS-004",
  "type": "FS",
  "series": "A",
  "number": 4,
  "date": "2025-12-15",
  "time": "16:00",
  "warehouse": "ARM-01",
  "status": "POSTED",
  "originAccount": "61",
  "originCostCenter": "CC-VENDAS",
  "originProject": "",
  "lines": [
    {
      "id": "FS-004-L1",
      "articleCode": "MAT-003",
      "articleName": "Tinta Branca 5L",
      "warehouse": "ARM-01",
      "location": "C-03-05",
      "batch": "LOTE-2025-003",
      "quantity": 3,
      "unitPrice": 45.00,
      "total": 135.00,
      "unit": "LT",
      "costCenter": "CC-VENDAS",
      "project": "",
      "analytic": "ESCRITORIO",
      "functional": "PINTURA-SHOWROOM"
    }
  ]
}
```

---

## 📊 Resultados Esperados

### Extrato de Artigos - MAT-001 (Parafuso)

```
Período: 01/12/2025 a 31/12/2025

Saldo Inicial: 0

Data       | Tipo | Documento | Entradas | Saídas | Saldo
-----------|------|-----------|----------|--------|-------
01/12/2025 | SI   | SIA/001   | 5000     | -      | 5000
05/12/2025 | FI   | FIA/001   | 2000     | -      | 7000
08/12/2025 | FS   | FSA/001   | -        | 500    | 6500
10/12/2025 | FS   | FSA/002   | -        | 800    | 5700
12/12/2025 | FS   | FSA/003   | -        | 200    | 5500

Totais:                        | 7000     | 1500   | 5500
```

### Relatório de Inventário

```
Data: 31/12/2025

Artigo  | Descrição           | Stock Atual | Preço | Valor
--------|---------------------|-------------|-------|----------
MAT-001 | Parafuso M8 x 20mm  | 5500.00     | 0.49  | 2,695.00
MAT-002 | Chapa Aço 1mm       | 225.00      | 24.73 | 5,564.25
MAT-003 | Tinta Branca 5L     | 82.00       | 45.00 | 3,690.00

Total Geral:                                       11,949.25
```

### Relatório de Consumos - Por Centro de Custo

```
Período: 01/12/2025 a 31/12/2025
Agrupado por: Centro de Custo

┌─────────────────────────────────────────────────────────┐
│ CC-PRODUCAO                                             │
│ 5 consumos | 3 artigos | Total: 4,171.50 €             │
├─────────────────────────────────────────────────────────┤
│ Projeto A (PROJ-2025-001): 1,950.00 €                  │
│ Projeto B (PROJ-2025-002): 2,221.50 €                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CC-MANUTENCAO                                           │
│ 2 consumos | 2 artigos | Total: 325.00 €               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CC-VENDAS                                               │
│ 1 consumo | 1 artigo | Total: 135.00 €                 │
└─────────────────────────────────────────────────────────┘

Resumo Geral:
- Total Consumido: 4,631.50 €
- Nº de Consumos: 8
- Artigos Diferentes: 3
- Média por Consumo: 578.94 €
```

### Relatório de Consumos - Por Projeto

```
Período: 01/12/2025 a 31/12/2025
Agrupado por: Projeto

┌─────────────────────────────────────────────────────────┐
│ PROJ-2025-002                                           │
│ 2 consumos | 2 artigos | Total: 2,221.50 €             │
├─────────────────────────────────────────────────────────┤
│ Cliente: CLIENTE-XYZ                                    │
│ MAT-001: 800 un × 0.48 = 384.00 €                      │
│ MAT-002: 75 m2 × 24.50 = 1,837.50 €                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PROJ-2025-001                                           │
│ 3 consumos | 3 artigos | Total: 1,950.00 €             │
├─────────────────────────────────────────────────────────┤
│ Cliente: CLIENTE-ABC                                    │
│ MAT-001: 500 un × 0.50 = 250.00 €                      │
│ MAT-002: 50 m2 × 25.00 = 1,250.00 €                    │
│ MAT-003: 10 lt × 45.00 = 450.00 €                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ (Sem Projeto)                                           │
│ 3 consumos | 2 artigos | Total: 460.00 €               │
└─────────────────────────────────────────────────────────┘
```

### Relatório de Consumos - Por Artigo

```
Período: 01/12/2025 a 31/12/2025
Agrupado por: Artigo

┌─────────────────────────────────────────────────────────┐
│ MAT-002 - Chapa Aço 1mm                                 │
│ 2 consumos | Total: 3,087.50 €                          │
├─────────────────────────────────────────────────────────┤
│ CC-PRODUCAO / PROJ-2025-002: 75 m2 = 1,837.50 €        │
│ CC-PRODUCAO / PROJ-2025-001: 50 m2 = 1,250.00 €        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ MAT-001 - Parafuso M8 x 20mm                            │
│ 3 consumos | Total: 734.00 €                            │
├─────────────────────────────────────────────────────────┤
│ CC-PRODUCAO / PROJ-2025-002: 800 un = 384.00 €         │
│ CC-PRODUCAO / PROJ-2025-001: 500 un = 250.00 €         │
│ CC-MANUTENCAO: 200 un = 100.00 €                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ MAT-003 - Tinta Branca 5L                               │
│ 3 consumos | Total: 810.00 €                            │
├─────────────────────────────────────────────────────────┤
│ CC-PRODUCAO / PROJ-2025-001: 10 lt = 450.00 €          │
│ CC-MANUTENCAO: 5 lt = 225.00 €                         │
│ CC-VENDAS: 3 lt = 135.00 €                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Como Inserir os Dados de Teste

### Opção 1: Via Interface (Recomendado)

1. Ir para **Inventário → Movimentos de Stock**
2. Para cada documento acima:
   - Clicar em "Novo Documento"
   - Preencher os campos do cabeçalho
   - Adicionar as linhas
   - Salvar

### Opção 2: Via Console do Navegador

```javascript
// Abrir DevTools (F12) e executar:

const testDocuments = [
  // Colar aqui os documentos JSON acima
];

localStorage.setItem('erp_stock_documents', JSON.stringify(testDocuments));
location.reload();
```

### Opção 3: Criar Script de Inicialização

Adicionar em `sample-data.ts`:

```typescript
export const SAMPLE_STOCK_DOCUMENTS = [
  // Documentos de teste aqui
];
```

---

## ✅ Checklist de Testes

### Testes Básicos
- [ ] Criar documento SI (Stock Inicial)
- [ ] Criar documento FI (Entrada)
- [ ] Criar documento FS (Saída)
- [ ] Verificar que documentos aparecem em localStorage

### Testes de Relatórios
- [ ] Gerar Extrato de Artigos
- [ ] Verificar saldos corretos
- [ ] Gerar Relatório de Inventário
- [ ] Verificar stock atual correto
- [ ] Gerar Relatório de Consumos por Centro de Custo
- [ ] Gerar Relatório de Consumos por Projeto
- [ ] Gerar Relatório de Consumos por Artigo

### Testes de Filtros
- [ ] Filtrar por período
- [ ] Filtrar por artigo
- [ ] Filtrar por armazém
- [ ] Filtrar por centro de custo
- [ ] Filtrar por projeto

### Testes de Exportação
- [ ] Exportar Extrato para Excel
- [ ] Exportar Inventário para Excel
- [ ] Exportar Consumos para Excel
- [ ] Verificar formato CSV correto

---

## 📝 Notas Importantes

1. **Preços Diferentes**: Note que o MAT-001 tem preços diferentes (0.50 no SI, 0.48 no FI) para testar o custo médio ponderado.

2. **Dimensões Analíticas**: Os documentos incluem diferentes dimensões (Centro de Custo, Projeto, Analítico, Funcional) para testar todos os filtros.

3. **Múltiplos Projetos**: Há consumos em PROJ-2025-001 e PROJ-2025-002 para testar agrupamento por projeto.

4. **Diferentes Centros de Custo**: CC-PRODUCAO, CC-MANUTENCAO, CC-VENDAS para testar análise por departamento.

5. **Datas Sequenciais**: As datas estão em ordem cronológica para facilitar testes de período.

---

**Pronto para testar! 🚀**
