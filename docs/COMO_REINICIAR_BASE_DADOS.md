# Como Reiniciar a Base de Dados

## Método 1: Via Console do Navegador

1. Abra o navegador (Chrome/Edge/Firefox)
2. Pressione `F12` para abrir as Ferramentas de Desenvolvedor
3. Vá para a aba **Console**
4. Cole o seguinte código e pressione Enter:

```javascript
// Limpar TODOS os dados do localStorage
localStorage.clear();

// Ou limpar apenas dados específicos:
localStorage.removeItem('erp_sales_documents');
localStorage.removeItem('erp_journal_entries');
localStorage.removeItem('erp_stock_movements');
localStorage.removeItem('erp_accounts');
localStorage.removeItem('erp_journals');
localStorage.removeItem('erp_customers');

// Recarregar a página
location.reload();
```

## Método 2: Via Ferramentas do Navegador

1. Pressione `F12`
2. Vá para a aba **Application** (Chrome) ou **Storage** (Firefox)
3. No menu lateral, expanda **Local Storage**
4. Clique em `http://localhost:4200` (ou seu domínio)
5. Clique com botão direito e selecione **Clear**
6. Recarregue a página (`F5`)

## Método 3: Limpar Cache e Dados do Site

1. No Chrome: `Ctrl + Shift + Delete`
2. Selecione "Cached images and files" e "Cookies and other site data"
3. Escolha o período "All time"
4. Clique em "Clear data"

## Dados que serão removidos:

- ✅ Documentos de venda
- ✅ Lançamentos contábeis
- ✅ Movimentos de stock
- ✅ Contas contábeis customizadas
- ✅ Diários contábeis
- ✅ Clientes

## Dados que serão recriados automaticamente:

- ✅ Plano de contas padrão
- ✅ Diários padrão
- ✅ Clientes de exemplo
- ✅ Artigos de exemplo
