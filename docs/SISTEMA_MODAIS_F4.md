# 🎯 Sistema de Modais F4 Profissionais - IMPLEMENTADO

## ✅ Status: COMPONENTES CRIADOS

---

## 📦 Modais Criados

### 1. **Warehouse Search Modal** (Armazéns)
**Arquivo**: `warehouse-search-modal.component.ts`

**Funcionalidades**:
- ✅ Lista de armazéns com busca
- ✅ Botão "Novo" para criar armazém
- ✅ Formulário inline para criação rápida
- ✅ Campos: Código, Nome, Morada
- ✅ Checkbox "Armazém padrão"
- ✅ Indicador visual de armazém padrão
- ✅ Duplo clique para selecionar e fechar
- ✅ Integração com localStorage

**Cor**: Azul (blue-500)  
**Ícone**: warehouse

---

### 2. **Location Search Modal** (Localizações)
**Arquivo**: `location-search-modal.component.ts`

**Funcionalidades**:
- ✅ Lista de localizações com busca
- ✅ Botão "Novo" para criar localização
- ✅ Formulário com: Código, Descrição, Corredor, Prateleira, Nível
- ✅ Auto-geração de descrição baseada em corredor/prateleira/nível
- ✅ Filtro por armazém (opcional)
- ✅ Estrutura hierárquica (A-01-15)
- ✅ Integração com localStorage

**Cor**: Roxo (purple-500)  
**Ícone**: place

---

### 3. **Batch Search Modal** (Lotes)
**Arquivo**: `batch-search-modal.component.ts`

**Funcionalidades**:
- ✅ Lista de lotes com busca
- ✅ Botão "Novo" para criar lote
- ✅ Campos: Código, Descrição, Data Fabrico, Data Validade, Quantidade
- ✅ **Validação de datas de validade**
- ✅ **Indicadores visuais de estado**:
  - 🔴 EXPIRADO (fundo vermelho)
  - 🟡 A EXPIRAR (fundo amarelo, < 30 dias)
  - 🟢 VÁLIDO (fundo verde)
- ✅ Filtro por artigo (opcional)
- ✅ Integração com localStorage

**Cor**: Laranja (orange-500)  
**Ícone**: qr_code_2

---

### 4. **Tax Search Modal** (Taxas IVA)
**Arquivo**: `tax-search-modal.component.ts`

**Funcionalidades**:
- ✅ Lista de taxas IVA com busca
- ✅ Botão "Novo" para criar taxa
- ✅ Campos: Código, Taxa (%), Descrição
- ✅ Checkbox "Taxa padrão"
- ✅ **Taxas pré-configuradas de Moçambique**:
  - 00: Regime de isenção (0%)
  - 01: Isento artº18 (0%)
  - 16: IVA 16% (padrão)
  - 17: IVA 17%
  - BS: Bens segunda mão (17%)
  - OA: Objectos de arte (17%)
- ✅ Validação de taxa (0-100%)
- ✅ Indicador visual de taxa padrão
- ✅ Integração com localStorage

**Cor**: Verde (green-500)  
**Ícone**: receipt_long

---

## 🎨 Design Profissional

### Características Comuns

**Layout**:
```
┌─────────────────────────────────────────────┐
│ 🎨 Título do Modal                    ✕    │ ← Header colorido
├─────────────────────────────────────────────┤
│ 🔍 Busca...                    [+ Novo]    │ ← Busca + Botão Novo
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ ➕ Novo Item                            │ │ ← Formulário inline
│ │ [Campos do formulário]                  │ │   (aparece ao clicar Novo)
│ │ [Criar e Selecionar] [Cancelar]        │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Código │ Nome       │ Outros │ Ações      │ │ ← Tabela de itens
│ ────────────────────────────────────────── │ │
│ A001   │ Item 1     │ ...    │ ✓          │ │ ← Clicável
│ A002   │ Item 2     │ ...    │            │ │
├─────────────────────────────────────────────┤
│ Total: 10 | Filtrados: 2    Duplo clique  │ │ ← Footer informativo
└─────────────────────────────────────────────┘
```

**Cores por Modal**:
- 🔵 Armazéns: Azul
- 🟣 Localizações: Roxo
- 🟠 Lotes: Laranja
- 🟢 Taxas IVA: Verde

**Interações**:
- ✅ Clique simples: Seleciona item
- ✅ Duplo clique: Seleciona e fecha modal
- ✅ Busca em tempo real
- ✅ Backdrop clicável para fechar
- ✅ Botão X para fechar
- ✅ Autofocus no campo de busca

---

## 🔧 Como Integrar no Stock Movements

### Passo 1: Importar os Modais

```typescript
import { WarehouseSearchModalComponent, Warehouse } from './warehouse-search-modal.component';
import { LocationSearchModalComponent, Location } from './location-search-modal.component';
import { BatchSearchModalComponent, Batch } from './batch-search-modal.component';
import { TaxSearchModalComponent, TaxRate } from './tax-search-modal.component';
```

### Passo 2: Adicionar aos Imports

```typescript
@Component({
  imports: [
    CommonModule, 
    FormsModule, 
    ArticleSearchModalComponent,
    WarehouseSearchModalComponent,
    LocationSearchModalComponent,
    BatchSearchModalComponent,
    TaxSearchModalComponent
  ],
  // ...
})
```

### Passo 3: Adicionar Propriedades

```typescript
export class StockMovementsComponent {
  // ... propriedades existentes ...
  
  // Modals state
  isWarehouseSearchOpen = false;
  isLocationSearchOpen = false;
  isBatchSearchOpen = false;
  isTaxSearchOpen = false;
  
  // Active line for modal selection
  activeLineForModal: StockDocumentLine | null = null;
}
```

### Passo 4: Substituir Campos por Campos com F4

**Antes** (Armazém):
```html
<select [(ngModel)]="line.warehouse">
  <option *ngFor="let wh of warehouses" [value]="wh.code">
    {{ wh.code }}
  </option>
</select>
```

**Depois** (Armazém com F4):
```html
<div class="flex h-full">
  <input [(ngModel)]="line.warehouse" 
         class="flex-1 px-1 border-none" 
         readonly>
  <button (click)="openWarehouseSearch(line)" 
          class="w-6 bg-blue-100 hover:bg-blue-200 flex items-center justify-center">
    <span class="material-symbols-outlined text-[10px]">search</span>
  </button>
</div>
```

### Passo 5: Adicionar Métodos

```typescript
openWarehouseSearch(line: StockDocumentLine) {
  this.activeLineForModal = line;
  this.isWarehouseSearchOpen = true;
}

onWarehouseSelect(warehouse: Warehouse) {
  if (this.activeLineForModal) {
    this.activeLineForModal.warehouse = warehouse.code;
  }
  this.isWarehouseSearchOpen = false;
}

openLocationSearch(line: StockDocumentLine) {
  this.activeLineForModal = line;
  this.isLocationSearchOpen = true;
}

onLocationSelect(location: Location) {
  if (this.activeLineForModal) {
    this.activeLineForModal.location = location.code;
  }
  this.isLocationSearchOpen = false;
}

openBatchSearch(line: StockDocumentLine) {
  this.activeLineForModal = line;
  this.isBatchSearchOpen = true;
}

onBatchSelect(batch: Batch) {
  if (this.activeLineForModal) {
    this.activeLineForModal.batch = batch.code;
  }
  this.isBatchSearchOpen = false;
}

openTaxSearch(line: StockDocumentLine) {
  this.activeLineForModal = line;
  this.isTaxSearchOpen = true;
}

onTaxSelect(tax: TaxRate) {
  if (this.activeLineForModal) {
    // Assumindo que existe um campo ivaRate na linha
    this.activeLineForModal.ivaRate = tax.rate;
    this.activeLineForModal.ivaCode = tax.code;
  }
  this.isTaxSearchOpen = false;
}
```

### Passo 6: Adicionar Modais no Template

```html
<!-- No final do template, antes do fechamento -->

<!-- Warehouse Modal -->
<app-warehouse-search-modal
  [isOpen]="isWarehouseSearchOpen"
  (close)="isWarehouseSearchOpen = false"
  (select)="onWarehouseSelect($event)"
></app-warehouse-search-modal>

<!-- Location Modal -->
<app-location-search-modal
  [isOpen]="isLocationSearchOpen"
  [warehouseFilter]="activeLineForModal?.warehouse || ''"
  (close)="isLocationSearchOpen = false"
  (select)="onLocationSelect($event)"
></app-location-search-modal>

<!-- Batch Modal -->
<app-batch-search-modal
  [isOpen]="isBatchSearchOpen"
  [articleFilter]="activeLineForModal?.articleCode || ''"
  (close)="isBatchSearchOpen = false"
  (select)="onBatchSelect($event)"
></app-batch-search-modal>

<!-- Tax Modal -->
<app-tax-search-modal
  [isOpen]="isTaxSearchOpen"
  (close)="isTaxSearchOpen = false"
  (select)="onTaxSelect($event)"
></app-tax-search-modal>
```

---

## 📊 Exemplo de Uso Completo

### Cenário: Criar Documento de Entrada de Stock

1. **Usuário** clica em "Novo Documento"
2. **Usuário** preenche cabeçalho
3. **Usuário** adiciona linha
4. **Usuário** clica F4 no campo Artigo → Seleciona artigo
5. **Usuário** clica F4 no campo Armazém → Seleciona ou cria armazém
6. **Usuário** clica F4 no campo Localização → Seleciona ou cria localização
7. **Usuário** clica F4 no campo Lote → Seleciona ou cria lote
8. **Usuário** clica F4 no campo IVA → Seleciona taxa
9. **Sistema** preenche todos os campos automaticamente
10. **Usuário** clica "Gravar"

**Resultado**: Documento criado com todos os dados integrados e consistentes!

---

## 🎯 Benefícios

### Para o Usuário
✅ **Rapidez**: Criar novos itens sem sair do documento  
✅ **Facilidade**: Interface intuitiva similar ao Primavera  
✅ **Consistência**: Dados sempre corretos e validados  
✅ **Produtividade**: Menos cliques, mais eficiência  

### Para o Sistema
✅ **Integridade**: Dados sempre consistentes  
✅ **Rastreabilidade**: Todos os itens têm ID único  
✅ **Manutenibilidade**: Modais reutilizáveis  
✅ **Escalabilidade**: Fácil adicionar novos modais  

---

## 📝 Próximos Passos

### Implementação Imediata
1. [ ] Integrar modais no `stock-movements.component.ts`
2. [ ] Substituir dropdowns por campos com F4
3. [ ] Adicionar botões F4 visuais (círculos vermelhos)
4. [ ] Testar criação de novos itens
5. [ ] Testar seleção de itens existentes

### Melhorias Futuras
- [ ] Adicionar atalho de teclado F4 global
- [ ] Implementar histórico de seleções recentes
- [ ] Adicionar favoritos
- [ ] Permitir edição inline de itens
- [ ] Adicionar validações avançadas
- [ ] Implementar importação/exportação

---

## 🎨 Visual dos Botões F4

```html
<!-- Estilo dos botões F4 (círculos vermelhos no Primavera) -->
<style>
.f4-button {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.f4-button:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
  transform: scale(1.1);
}

.f4-button .material-symbols-outlined {
  font-size: 12px;
  color: white;
}
</style>

<!-- Uso -->
<button class="f4-button" (click)="openWarehouseSearch(line)">
  <span class="material-symbols-outlined">search</span>
</button>
```

---

## 🎉 Conclusão

**4 Modais Profissionais Criados**:
1. ✅ Armazéns (Warehouse)
2. ✅ Localizações (Location)
3. ✅ Lotes (Batch)
4. ✅ Taxas IVA (Tax)

**Funcionalidades**:
- ✅ Seleção de itens existentes
- ✅ Criação de novos itens inline
- ✅ Busca em tempo real
- ✅ Validações automáticas
- ✅ Integração com localStorage
- ✅ Design profissional e responsivo
- ✅ Similar ao Primavera ERP

**Próximo Passo**: Integrar no componente de movimentos de stock!

---

**Inverno ERP - Gestão Empresarial Integrada**  
**Data: 05/12/2025**
