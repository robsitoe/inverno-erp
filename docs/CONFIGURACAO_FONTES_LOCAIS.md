# Configuração de Fontes Locais

## Data: 2026-02-08

## Problema Resolvido

O sistema estava tentando carregar fontes do Google Fonts (Inter e Material Symbols Outlined) via CDN, causando erros `ERR_NAME_NOT_RESOLVED` quando não há conexão à internet.

## Solução Implementada

### 1. Remoção de Dependências Externas

**Arquivo:** `frontend/index.html`
- ✅ Removidas as tags `<link>` para Google Fonts
- ✅ Sistema agora funciona completamente offline

### 2. Configuração de Fontes Locais

**Arquivo:** `frontend/src/assets/fonts/fonts.css`
- ✅ Criado arquivo de fontes locais
- ✅ Configurado stack de fontes do sistema
- ✅ Adicionados fallbacks Unicode para ícones Material

**Arquivo:** `frontend/angular.json`
- ✅ Adicionado `fonts.css` ao array de estilos
- ✅ Fontes carregadas automaticamente no build

### 3. Fontes do Sistema Utilizadas

#### Para Texto (substituindo Inter):
```css
-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif
```

**Vantagens:**
- ✅ Disponíveis em todos os sistemas operacionais
- ✅ Otimizadas para cada plataforma
- ✅ Sem necessidade de download
- ✅ Melhor performance

#### Para Ícones (substituindo Material Symbols):
```css
'Segoe UI Symbol', 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif
```

**Fallbacks Unicode:**
- ✕ (close)
- 🔍 (search)
- + (add)
- ✎ (edit)
- 🗑 (delete)
- ✓ (check)
- 💾 (save)
- ☰ (menu)
- ⚙ (settings)
- E mais...

## Como Adicionar Fontes Reais (Opcional)

Se desejar usar as fontes originais offline, siga estes passos:

### Opção 1: Baixar Material Symbols Outlined

1. **Baixar a fonte:**
   ```powershell
   # Com internet disponível
   Invoke-WebRequest -Uri "https://fonts.gstatic.com/s/materialsymbolsoutlined/v..." -OutFile "frontend/src/assets/fonts/MaterialSymbolsOutlined.woff2"
   ```

2. **Atualizar fonts.css:**
   ```css
   @font-face {
     font-family: 'Material Symbols Outlined';
     font-style: normal;
     font-weight: 400;
     font-display: block;
     src: url('./MaterialSymbolsOutlined.woff2') format('woff2');
   }
   ```

### Opção 2: Baixar Inter Font

1. **Baixar do site oficial:**
   - Visitar: https://rsms.me/inter/
   - Baixar versão variable ou estática
   - Extrair arquivos `.woff2` para `frontend/src/assets/fonts/`

2. **Adicionar ao fonts.css:**
   ```css
   @font-face {
     font-family: 'Inter';
     font-style: normal;
     font-weight: 400 700;
     font-display: swap;
     src: url('./Inter-Variable.woff2') format('woff2');
   }
   ```

### Opção 3: Usar Google Fonts Helper

1. **Visitar:** https://gwfh.mranftl.com/fonts
2. **Selecionar:** Inter e Material Symbols Outlined
3. **Baixar:** Arquivos de fonte
4. **Copiar:** Para `frontend/src/assets/fonts/`
5. **Copiar:** CSS gerado para `fonts.css`

## Estrutura de Arquivos

```
frontend/
├── src/
│   └── assets/
│       └── fonts/
│           ├── fonts.css              ← Configuração de fontes
│           ├── Inter-Regular.woff2    ← (Opcional) Fonte Inter
│           ├── Inter-Medium.woff2     ← (Opcional)
│           ├── Inter-SemiBold.woff2   ← (Opcional)
│           ├── Inter-Bold.woff2       ← (Opcional)
│           └── MaterialSymbols.woff2  ← (Opcional) Ícones Material
├── angular.json                       ← Configurado para incluir fonts.css
└── index.html                         ← Links externos removidos
```

## Verificação

Para verificar se as fontes estão funcionando:

1. **Abrir DevTools** (F12)
2. **Ir para Network**
3. **Recarregar página**
4. **Verificar:** Não deve haver requisições para `fonts.googleapis.com`

## Benefícios da Solução Atual

1. ✅ **Funciona Offline** - Sem dependências externas
2. ✅ **Performance** - Fontes do sistema são mais rápidas
3. ✅ **Compatibilidade** - Funciona em todos os navegadores
4. ✅ **Manutenção** - Sem necessidade de atualizar fontes
5. ✅ **Privacidade** - Sem rastreamento do Google

## Desvantagens (Mínimas)

1. ⚠️ **Aparência Variável** - Pode variar ligeiramente entre sistemas operacionais
2. ⚠️ **Ícones Limitados** - Alguns ícones usam caracteres Unicode simples

## Recomendação

Para um sistema ERP interno, a solução atual com fontes do sistema é **ideal** porque:
- Funciona offline (importante para ambientes sem internet)
- Melhor performance
- Sem custos de licenciamento
- Aparência profissional em todos os sistemas

Se precisar de branding específico ou ícones mais elaborados, considere adicionar as fontes reais conforme as opções acima.
