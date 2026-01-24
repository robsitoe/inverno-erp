
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  subItems: string[];
}

export const RECENT_ITEMS = [
  "Extrato de Artigos",
  "Extrato de Conta",
  "Compras/Encomendas",
  "Vendas/Encomendas",
  "Documentos Stock"
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "contabilidade",
    label: "Contabilidade",
    icon: "account_balance",
    subItems: ["Planos de contas", "Lançamentos", "Relatórios fiscais"]
  },
  {
    id: "equipamentos",
    label: "Equipamentos e Ativos",
    icon: "construction",
    subItems: ["Ficha do Ativo", "Manutenções", "Depreciações"]
  },
  {
    id: "tesouraria",
    label: "Tesouraria",
    icon: "account_balance_wallet",
    subItems: [
      "Pagamentos e Recebimentos",
      "Caixas e Bancos",
      "Tesouraria Previsional",
      "Calculadoras Financeiras"
    ]
  },
  {
    id: "vendas",
    label: "Vendas/Encomendas",
    icon: "receipt_long",
    subItems: [
      "Clientes",
      "Vendas/Encomendas",
      "Documentos Internos",
      "Conversão de Documentos de Venda",
      "Estorno de Documentos"
    ]
  },
  {
    id: "compras",
    label: "Compras",
    icon: "shopping_cart",
    subItems: ["Compras/Encomendas", "Ordens de compra", "Faturas fornecedor"]
  },
  {
    id: "inventario",
    label: "Inventário",
    icon: "inventory_2",
    subItems: ["Artigos", "Movimentos de stock", "Armazéns"]
  },
  {
    id: "projetos",
    label: "Projetos e Serviços",
    icon: "assignment",
    subItems: ["Gestão de projetos", "Folhas de obra", "Tempos"]
  },
  {
    id: "tabelas",
    label: "Tabelas",
    icon: "table_rows",
    subItems: ["Tabelas gerais", "Tabelas de utilizador", "Impostos"]
  },
  {
    id: "menus",
    label: "Menus do Utilizador",
    icon: "menu_book",
    subItems: ["Personalizar menus", "Atalhos"]
  }
];
