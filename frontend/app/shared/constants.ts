export interface MenuItem {
  label: string;
  icon: string;
  view?: string;
  beta?: boolean;
  productionReady?: boolean;
  feature?: string;
  children?: MenuItem[];
}

export const RECENT_ITEMS = [
  { label: "Extrato de Artigos", view: "article-statement" },
  { label: "Extrato de Conta", view: "account-statement" },
  { label: "Compras/Encomendas", view: "purchase-form" },
  { label: "Vendas/Encomendas", view: "sales-form" },
  { label: "Documentos Stock", view: "stock-movements" }
];

export const MENU_ITEMS: MenuItem[] = [
  {
    label: "Contabilidade",
    icon: "account_balance",
    feature: "ACCOUNTING",
    children: [
      { label: "Plano de Contas", icon: "account_tree", view: "chart-of-accounts" },
      { label: "Lançamentos", icon: "edit_note", view: "journal-entries" },
      { label: "Revisão de Lançamentos", icon: "fact_check", view: "journal-entries-review" },
      { label: "Diários", icon: "book", view: "diaries" },
      { label: "Balancetes", icon: "balance", view: "trial-balance" },
      { label: "Demonstrações Financeiras", icon: "assessment", view: "financial-statements" },
      { label: "Centros de Custo", icon: "business_center", view: "cost-centers", beta: true, productionReady: false },
      { label: "IVA", icon: "receipt_long", view: "vat", beta: true, productionReady: false },
      { label: "Fecho de Período", icon: "lock_clock", view: "period-close", beta: true, productionReady: false },
      { label: "Exploração", icon: "explore", view: "exploration", beta: true, productionReady: false },
      { label: "Utilitários", icon: "build", view: "utilities", beta: true, productionReady: false }
    ]
  },
  {
    label: "Administração",
    icon: "admin_panel_settings",
    children: [
      { label: "Painel Principal", icon: "dashboard", view: "admin-page" },
      { label: "Ferramentas", icon: "build", view: "admin-tools" }
    ]
  },
  {
    label: "Equipamentos e Ativos",
    icon: "construction",
    feature: "ASSETS",
    children: [
      { label: "Ficha do Ativo", icon: "inventory" },
      { label: "Manutenções", icon: "build_circle" },
      { label: "Depreciações", icon: "trending_down" },
      { label: "Seguros", icon: "security" },
      { label: "Transferências", icon: "swap_horiz" },
      { label: "Abates", icon: "delete" },
      { label: "Reavaliações", icon: "update" },
      { label: "Exploração", icon: "explore" },
      { label: "Utilitários", icon: "build" }
    ]
  },
  {
    label: "Tesouraria",
    icon: "account_balance_wallet",
    feature: "TREASURY",
    children: [
      { label: "Gestão de Tesouraria", icon: "account_balance_wallet", view: "treasury-management" },
      { label: "Pagamentos", icon: "payment" },
      { label: "Recebimentos", icon: "account_balance" },
      { label: "Caixas", icon: "point_of_sale" },
      { label: "Bancos", icon: "account_balance" },
      { label: "Reconciliação Bancária", icon: "sync", view: "bank-reconciliation" },
      { label: "Cheques", icon: "receipt" },
      { label: "Letras", icon: "description" },
      { label: "Vales de Caixa", icon: "receipt_long", view: "petty-cash-vouchers" },
      { label: "Tesouraria Previsional", icon: "calendar_today" },
      { label: "Calculadoras Financeiras", icon: "calculate" },
      {
        label: "Exploração",
        icon: "explore",
        children: [
          { label: "Extrato de Conta", icon: "history", view: "account-statement" },
          { label: "Listagem de Movimentos", icon: "list" },
          { label: "Fluxos de Caixa", icon: "payments" }
        ]
      },
      { label: "Utilitários", icon: "build" }
    ]
  },
  {
    label: "Inventário",
    icon: "inventory",
    feature: "INVENTORY",
    children: [
      { label: "Artigos", icon: "inventory_2", view: "article-management" },
      { label: "Documentos Stock", icon: "swap_horiz", view: "stock-movements" },
      { label: "Documentos Internos", icon: "description" },
      {
        label: "Inventários",
        icon: "fact_check",
        children: [
          { label: "Preparação Inventário", icon: "edit_note", view: "inventory-count" },
          { label: "Contagem Física", icon: "checklist", view: "inventory-count" }
        ]
      },
      {
        label: "Exploração",
        icon: "explore",
        children: [
          { label: "Extrato de Artigos", icon: "history", view: "article-statement" },
          { label: "Entradas/Saídas", icon: "sync_alt", view: "stock-movements-report" },
          { label: "Consumos", icon: "trending_down", view: "consumption-report" },
          { label: "Controlo de Stocks", icon: "analytics", view: "stock-control-report" },
          { label: "Inventários", icon: "inventory", view: "inventory-report" },
          { label: "Números de Série", icon: "qr_code" }
        ]
      },
      {
        label: "Lotes",
        icon: "category",
        children: [
          { label: "Lotes por Artigos", icon: "view_list", view: "batch-management" },
          { label: "Rastreabilidade dos Lotes", icon: "timeline" }
        ]
      }
    ]
  },
  {
    label: "Vendas",
    icon: "shopping_cart",
    feature: "SALES",
    children: [
      { label: "Clientes", icon: "group", view: "customer-management" },
      { label: "Vendas/Encomendas", icon: "receipt", view: "sales-form" },
      { label: "Campanhas de Vendas", icon: "campaign" },
      { label: "Comissões", icon: "percent" },
      { label: "Exploração", icon: "explore" },
      { label: "Utilitários", icon: "build" }
    ]
  },
  {
    label: "Compras",
    icon: "shopping_bag",
    feature: "PURCHASES",
    children: [
      { label: "Fornecedores", icon: "group", view: "supplier-management" },
      { label: "Compras/Encomendas", icon: "receipt", view: "purchase-form" },
      { label: "Encomendas a Fornecedor", icon: "receipt_long" },
      { label: "Faturas de Fornecedor", icon: "description" },
      { label: "Notas de Crédito", icon: "credit_card" },
      { label: "Guias de Receção", icon: "move_to_inbox" },
      { label: "Devoluções a Fornecedor", icon: "keyboard_return" },
      { label: "Requisições de Compra", icon: "assignment" },
      { label: "Consultas de Preço", icon: "search" },
      { label: "Gestão de Stocks", icon: "warehouse" },
      { label: "Projeção de Necessidades", icon: "analytics" },
      { label: "Estado de Encomendas", icon: "local_shipping" },
      { label: "Preços de Compra", icon: "euro" },
      { label: "Exploração", icon: "explore" },
      { label: "Utilitários", icon: "build" }
    ]
  },

  {
    label: "Recursos Humanos",
    icon: "badge",
    feature: "HR",
    children: [
      { label: "Funcionários", icon: "people", view: "employee-list" },
      { label: "Processamento de Salários", icon: "payments", view: "payroll-processing" },
      { label: "Férias e Ausências", icon: "event_busy", view: "absences-management" },
      { label: "Tabelas de IRPS/INSS", icon: "table_rows", view: "tax-tables" },
      { label: "Relatórios de RH", icon: "assessment", view: "hr-reports" },
      { label: "Utilitários", icon: "build", view: "hr-utilities" }
    ]
  },
  {
    label: "GESt-GAS",
    icon: "gas_meter",
    feature: "INVENTORY",
    children: [
      { label: "Movimento Geral Diário", icon: "edit_note", view: "gas-movement" },
      { label: "Mapa de Inventário", icon: "inventory_2", view: "gas-inventory" }
    ]
  },
  {
    label: "Projetos e Serviços",
    icon: "work",
    feature: "PROJECTS",
    children: [
      { label: "Projetos", icon: "folder_special" },
      { label: "Fases do Projeto", icon: "timeline" },
      { label: "Tarefas", icon: "task" },
      { label: "Recursos", icon: "people" },
      { label: "Tempos", icon: "schedule" },
      { label: "Despesas", icon: "receipt" },
      { label: "Faturação de Projetos", icon: "description" },
      { label: "Ordens de Serviço", icon: "build" },
      { label: "Contratos de Manutenção", icon: "handshake" },
      { label: "Exploração", icon: "explore" },
      { label: "Utilitários", icon: "build" }
    ]
  },
  {
    label: "Tabelas",
    icon: "table_chart",
    children: [
      { label: "Gerais", icon: "settings" },
      { label: "Contabilidade", icon: "account_balance" },
      { label: "Projetos e Serviços", icon: "work" },
      {
        label: "Inventário",
        icon: "inventory",
        children: [
          { label: "Tipos de Artigo", icon: "category" },
          {
            label: "Outras Tabelas",
            icon: "folder",
            children: [
              { label: "Unidades", icon: "straighten", view: "unit-management" },
              { label: "Fórmulas", icon: "functions" },
              { label: "Prazos de Garantia", icon: "timer" },
              { label: "Etiquetas", icon: "label" },
              { label: "Catálogos de Artigos", icon: "menu_book" },
              { label: "Tipos de Documentos de Stock", icon: "description", view: "stock-document-types" }
            ]
          },
          {
            label: "Estrutura Artigos",
            icon: "account_tree",
            children: [
              { label: "Famílias/Subfamílias", icon: "folder_open" },
              { label: "Marcas/Modelos", icon: "branding_watermark" }
            ]
          },
          {
            label: "Armazém",
            icon: "warehouse",
            children: [
              { label: "Armazéns", icon: "store", view: "warehouse-management" },
              { label: "Níveis de Localização", icon: "layers" },
              { label: "Geração de Localizações", icon: "add_location" },
              { label: "Localizações", icon: "place" }
            ]
          },
          {
            label: "Dimensões",
            icon: "aspect_ratio",
            children: [
              { label: "Tipos de Dimensão", icon: "settings_overscan" },
              { label: "Dimensões", icon: "view_module" }
            ]
          },
          { label: "Tesouraria", icon: "account_balance_wallet" },
          {
            label: "Vendas",
            icon: "shopping_cart",
            children: [
              { label: "Tipos de Documento", icon: "description", view: "document-types" }
            ]
          },
          {
            label: "Compras",
            icon: "shopping_bag",
            children: [
              { label: "Tipos de Documento", icon: "description", view: "document-types" }
            ]
          },
          { label: "Contactos e Oportunidades", icon: "contacts" },
          { label: "Recursos Humanos", icon: "badge" },
          { label: "Impostos", icon: "receipt_long" },
          { label: "Países e Moedas", icon: "public" },
          { label: "Unidades de Medida", icon: "straighten" }
        ]
      }
    ]
  },
  {
    label: "Menus do Utilizador",
    icon: "person",
    children: [
      { label: "Personalizar Menus", icon: "tune" },
      { label: "Atalhos", icon: "star" },
      { label: "Favoritos", icon: "favorite" },
      { label: "Configurações", icon: "settings" }
    ]
  }
];

export const ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    label: "Configuração",
    icon: "settings",
    children: [
      { label: "Geral", icon: "tune", view: "admin-companies" },
      { label: "Parâmetros", icon: "settings_applications" }
    ]
  },
  {
    label: "Consola",
    icon: "terminal",
    children: [
      { label: "Eventos", icon: "event_note" },
      { label: "Tarefas", icon: "task" }
    ]
  },
  {
    label: "Aplicações",
    icon: "apps",
    children: [
      { label: "Gestão", icon: "business_center" },
      { label: "Contabilidade", icon: "account_balance" }
    ]
  },
  {
    label: "Empresas",
    icon: "business",
    children: [
      { label: "Dados da Empresa", icon: "info", view: "admin-companies" },
      { label: "Exercícios", icon: "calendar_month", view: "admin-fiscal-years" },
      { label: "Séries", icon: "format_list_numbered", view: "admin-series" }
    ]
  },
  {
    label: "Utilizadores",
    icon: "group",
    children: [
      { label: "Gestão de Utilizadores", icon: "manage_accounts", view: "admin-users" },
      { label: "Permissões", icon: "lock", view: "admin-users" }
    ]
  },
  {
    label: "Perfis",
    icon: "badge",
    children: [
      { label: "Perfis de Acesso", icon: "admin_panel_settings" }
    ]
  },
  {
    label: "Outras Bases de Dados",
    icon: "database",
    children: [
      { label: "Ferramentas", icon: "build", view: "admin-tools" }
    ]
  },
  {
    label: "Planos de Manutenção",
    icon: "healing",
    children: [
      { label: "Backups", icon: "backup" },
      { label: "Limpeza", icon: "cleaning_services" }
    ]
  },
  {
    label: "Servidor de Dados",
    icon: "dns",
    children: [
      { label: "Conexões", icon: "link" }
    ]
  }
];

export const SALES_DOCUMENT_TYPES = [
  { code: "FA", description: "Fatura", isStandard: true, nature: 'RECEIVE', type: 'Venda' },
  { code: "VD", description: "Venda a Dinheiro", isStandard: true, nature: 'RECEIVE', type: 'Venda' },
  { code: "NC", description: "Nota de Crédito", isStandard: true, nature: 'PAY', type: 'Venda' },
  { code: "ND", description: "Nota de Débito", isStandard: true, nature: 'RECEIVE', type: 'Venda' },
  { code: "GR", description: "Guia de Remessa", isStandard: true, nature: 'RECEIVE', type: 'Venda' },
  { code: "GT", description: "Guia de Transporte", isStandard: true, nature: 'RECEIVE', type: 'Venda' },
  { code: "EC", description: "Encomenda de Cliente", isStandard: true, nature: 'RECEIVE', type: 'Venda' },
  { code: "PP", description: "Proforma", isStandard: true, nature: 'RECEIVE', type: 'Venda' }
];

export const ENTITIES = [
  { code: "C001", name: "Cliente Exemplo Lda", nif: "123456789", address: "Rua Principal 123" },
  { code: "C002", name: "Empresa Teste SA", nif: "987654321", address: "Av. da Liberdade 456" },
  { code: "C003", name: "Consumidor Final", nif: "999999990", address: "Desconhecido" },
  { code: "F001", name: "Fornecedor A", nif: "555555555", address: "Zona Industrial Lote 1" },
  { code: "F002", name: "Serviços B", nif: "444444444", address: "Rua dos Serviços 789" }
];

export const SUPPLIERS = [
  { code: "F001", name: "Fornecedor Global Lda", nif: "500123456", address: "Zona Industrial Norte, Lote 15" },
  { code: "F002", name: "Distribuidora Central SA", nif: "500234567", address: "Av. Empresarial 890" },
  { code: "F003", name: "Importadora Premium", nif: "500345678", address: "Rua do Comércio 234" },
  { code: "F004", name: "Materiais e Equipamentos Lda", nif: "500456789", address: "Parque Industrial Sul, Armazém 7" },
  { code: "F005", name: "Fornecedor Internacional", nif: "500567890", address: "Zona Franca, Edifício B" }
];

export const PURCHASE_DOCUMENT_TYPES = [
  { code: "FC", description: "Fatura de Compra", isStandard: true, nature: 'PAY', type: 'Compra' },
  { code: "NC", description: "Nota de Crédito", isStandard: true, nature: 'RECEIVE', type: 'Compra' },
  { code: "ND", description: "Nota de Débito", isStandard: true, nature: 'PAY', type: 'Compra' },
  { code: "GR", description: "Guia de Receção", isStandard: true, nature: 'PAY', type: 'Compra' },
  { code: "EF", description: "Encomenda a Fornecedor", isStandard: true, nature: 'PAY', type: 'Compra' },
  { code: "DC", description: "Devolução a Fornecedor", isStandard: true, nature: 'PAY', type: 'Compra' }
];

export const TREASURY_DOCUMENT_TYPES = [
  {
    code: "RE",
    description: "Recibo de Cliente",
    isStandard: true,
    nature: "RECEIVE",
    type: "Liquidacoes",
    allowedEntities: { customer: true }
  },
  {
    code: "PAG",
    description: "Pagamento a Fornecedor",
    isStandard: true,
    nature: "PAY",
    type: "Liquidacoes",
    allowedEntities: { supplier: true }
  },
  {
    code: "PAGVEN",
    description: "Pagamento de Vencimentos",
    isStandard: true,
    nature: "PAY",
    type: "Liquidacoes",
    allowedEntities: { employee: true }
  },
  {
    code: "ADC",
    description: "Adiantamento de Cliente",
    isStandard: true,
    nature: "RECEIVE",
    type: "Liquidacoes",
    allowedEntities: { customer: true }
  },
  {
    code: "ADF",
    description: "Adiantamento a Fornecedor",
    isStandard: true,
    nature: "PAY",
    type: "Liquidacoes",
    allowedEntities: { supplier: true }
  },
  {
    code: "ADE",
    description: "Adiantamento a Funcionário",
    isStandard: true,
    nature: "PAY",
    type: "Liquidacoes",
    allowedEntities: { employee: true }
  },
  { code: "DEP", description: "Depósito Bancário", isStandard: true, nature: "INTERNAL", type: "Liquidacoes" },
  { code: "LEV", description: "Levantamento Bancário", isStandard: true, nature: "INTERNAL", type: "Liquidacoes" },
  { code: "TRF", description: "Transferência entre Contas", isStandard: true, nature: "INTERNAL", type: "Liquidacoes" },
  { code: "RECON", description: "Reconciliação Bancária", isStandard: true, nature: "INTERNAL", type: "Liquidacoes" }
];

export const STOCK_DOCUMENT_TYPES = [
  { code: "ENT", description: "Entrada de Stock", isStandard: true, nature: "IN", type: "Stock" },
  { code: "SAI", description: "Saída de Stock", isStandard: true, nature: "OUT", type: "Stock" },
  { code: "TRF", description: "Transferência de Armazém", isStandard: true, nature: "TRANSFER", type: "Stock" },
  { code: "INV", description: "Acerto de Inventário", isStandard: true, nature: "ADJUSTMENT", type: "Stock" }
];

export const ARTICLES = [
  { code: "A001", description: "Portátil XPTO 15'", unit: "UN", price: 1500.00, iva: "23%" },
  { code: "A002", description: "Monitor 24' LED", unit: "UN", price: 250.00, iva: "23%" },
  { code: "A003", description: "Teclado Mecânico", unit: "UN", price: 80.00, iva: "23%" },
  { code: "A004", description: "Rato Wireless", unit: "UN", price: 35.00, iva: "23%" },
  { code: "A005", description: "Cadeira de Escritório", unit: "UN", price: 120.00, iva: "23%" },
  { code: "S001", description: "Serviço de Instalação", unit: "H", price: 45.00, iva: "23%" },
  { code: "S002", description: "Manutenção Mensal", unit: "MES", price: 200.00, iva: "23%" }
];

export const IVA_RATES = [
  { code: "00", description: "Regime de isenção", rate: 0 },
  { code: "01", description: "Isento (artº18)", rate: 0 },
  { code: "16", description: "Iva Ã  taxa de 16%", rate: 16 },
  { code: "17", description: "Iva Ã  taxa de 17%", rate: 17 },
  { code: "BS", description: "Bens em segunda mão", rate: 17 },
  { code: "OA", description: "Objectos de arte", rate: 17 }
];

