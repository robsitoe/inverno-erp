import { Account, JournalEntry, Article, Customer, SalesDocument, StockMovement, Warehouse, Journal } from './models';

// Default Journals
export const DEFAULT_JOURNALS: Journal[] = [
    { id: 'JNL-SAL', code: 'VENDAS', name: 'Diário de Vendas', type: 'SALES', isActive: true },
    { id: 'JNL-PUR', code: 'COMPRAS', name: 'Diário de Compras', type: 'PURCHASES', isActive: true },
    { id: 'JNL-CSH', code: 'CAIXA', name: 'Diário de Caixa', type: 'CASH', isActive: true },
    { id: 'JNL-BNK', code: 'BANCOS', name: 'Diário de Bancos', type: 'BANK', isActive: true },
    { id: 'JNL-GEN', code: 'GERAL', name: 'Diário Geral', type: 'GENERAL', isActive: true },
    { id: 'JNL-OPS', code: 'OD', name: 'Operações Diversas', type: 'OPERATIONS', isActive: true }
];

// Default Chart of Accounts (Plano de Contas Padrão - Moçambique)
export const DEFAULT_ACCOUNTS: Account[] = [
    // 11 - Caixa e Equivalentes (ASSET)
    { id: '1', code: '11', name: 'Caixa e Equivalentes', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '2', code: '11.1', name: 'Caixa Geral', type: 'ASSET', level: 2, parentId: '1', balance: 0, allowPosting: false, isActive: true },
    { id: '3', code: '11.1.1', name: 'Caixa Principal', type: 'ASSET', level: 3, parentId: '2', balance: 0, allowPosting: true, isActive: true },
    { id: '4', code: '11.1.2', name: 'Caixa Operações', type: 'ASSET', level: 3, parentId: '2', balance: 0, allowPosting: true, isActive: true },
    { id: '5', code: '11.2', name: 'Caixa Filiais', type: 'ASSET', level: 2, parentId: '1', balance: 0, allowPosting: false, isActive: true },
    { id: '6', code: '11.2.1', name: 'Caixa Filial A', type: 'ASSET', level: 3, parentId: '5', balance: 0, allowPosting: true, isActive: true },
    { id: '7', code: '11.2.2', name: 'Caixa Filial B', type: 'ASSET', level: 3, parentId: '5', balance: 0, allowPosting: true, isActive: true },

    // 12 - Bancos (ASSET)
    { id: '8', code: '12', name: 'Bancos', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '9', code: '12.1', name: 'Banco Comercial', type: 'ASSET', level: 2, parentId: '8', balance: 0, allowPosting: false, isActive: true },
    { id: '10', code: '12.1.1', name: 'BCI Conta Corrente', type: 'ASSET', level: 3, parentId: '9', balance: 0, allowPosting: true, isActive: true },
    { id: '11', code: '12.1.2', name: 'Millennium BIM Conta Corrente', type: 'ASSET', level: 3, parentId: '9', balance: 0, allowPosting: true, isActive: true },
    { id: '12', code: '12.2', name: 'Banco Microfinanças', type: 'ASSET', level: 2, parentId: '8', balance: 0, allowPosting: false, isActive: true },
    { id: '13', code: '12.2.1', name: 'Socremo', type: 'ASSET', level: 3, parentId: '12', balance: 0, allowPosting: true, isActive: true },
    { id: '14', code: '12.2.2', name: 'Letshego', type: 'ASSET', level: 3, parentId: '12', balance: 0, allowPosting: true, isActive: true },

    // 21 - Clientes (ASSET)
    { id: '15', code: '21', name: 'Clientes', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '16', code: '21.1', name: 'Clientes Nacionais', type: 'ASSET', level: 2, parentId: '15', balance: 0, allowPosting: false, isActive: true },
    { id: '17', code: '21.1.1', name: 'Clientes a Dinheiro', type: 'ASSET', level: 3, parentId: '16', balance: 0, allowPosting: true, isActive: true },
    { id: '18', code: '21.1.2', name: 'Clientes a Crédito', type: 'ASSET', level: 3, parentId: '16', balance: 0, allowPosting: true, isActive: true },
    { id: '19', code: '21.2', name: 'Clientes Internacionais', type: 'ASSET', level: 2, parentId: '15', balance: 0, allowPosting: true, isActive: true },

    // 31 - Mercadorias (ASSET)
    { id: '20', code: '31', name: 'Mercadorias (Comércio)', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '21', code: '31.1', name: 'Mercadorias – Retalho', type: 'ASSET', level: 2, parentId: '20', balance: 0, allowPosting: false, isActive: true },
    { id: '22', code: '31.1.1', name: 'Produtos Alimentares', type: 'ASSET', level: 3, parentId: '21', balance: 0, allowPosting: true, isActive: true },
    { id: '23', code: '31.1.2', name: 'Produtos Domésticos', type: 'ASSET', level: 3, parentId: '21', balance: 0, allowPosting: true, isActive: true },
    { id: '24', code: '31.2', name: 'Mercadorias – Grossista', type: 'ASSET', level: 2, parentId: '20', balance: 0, allowPosting: false, isActive: true },
    { id: '25', code: '31.2.1', name: 'Lotes de Revenda', type: 'ASSET', level: 3, parentId: '24', balance: 0, allowPosting: true, isActive: true },
    { id: '26', code: '31.2.2', name: 'Armazém Geral', type: 'ASSET', level: 3, parentId: '24', balance: 0, allowPosting: true, isActive: true },

    // 41 - Produção (ASSET)
    { id: '27', code: '41', name: 'Produção (Indústria)', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '28', code: '41.1', name: 'Matérias-Primas', type: 'ASSET', level: 2, parentId: '27', balance: 0, allowPosting: false, isActive: true },
    { id: '29', code: '41.1.1', name: 'Matérias Importadas', type: 'ASSET', level: 3, parentId: '28', balance: 0, allowPosting: true, isActive: true },
    { id: '30', code: '41.1.2', name: 'Matérias Locais', type: 'ASSET', level: 3, parentId: '28', balance: 0, allowPosting: true, isActive: true },
    { id: '31', code: '41.2', name: 'Produtos Acabados', type: 'ASSET', level: 2, parentId: '27', balance: 0, allowPosting: false, isActive: true },
    { id: '32', code: '41.2.1', name: 'Produto Padrão', type: 'ASSET', level: 3, parentId: '31', balance: 0, allowPosting: true, isActive: true },
    { id: '33', code: '41.2.2', name: 'Produto Personalizado', type: 'ASSET', level: 3, parentId: '31', balance: 0, allowPosting: true, isActive: true },

    // 52 - Obras em Execução (ASSET)
    { id: '34', code: '52', name: 'Obras em Execução (Construção)', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '35', code: '52.1', name: 'Empreitada – Edifícios', type: 'ASSET', level: 2, parentId: '34', balance: 0, allowPosting: false, isActive: true },
    { id: '36', code: '52.1.1', name: 'Obras Comerciais', type: 'ASSET', level: 3, parentId: '35', balance: 0, allowPosting: true, isActive: true },
    { id: '37', code: '52.1.2', name: 'Obras Residenciais', type: 'ASSET', level: 3, parentId: '35', balance: 0, allowPosting: true, isActive: true },
    { id: '38', code: '52.2', name: 'Empreitada – Infraestruturas', type: 'ASSET', level: 2, parentId: '34', balance: 0, allowPosting: false, isActive: true },
    { id: '39', code: '52.2.1', name: 'Estradas', type: 'ASSET', level: 3, parentId: '38', balance: 0, allowPosting: true, isActive: true },
    { id: '40', code: '52.2.2', name: 'Pontes', type: 'ASSET', level: 3, parentId: '38', balance: 0, allowPosting: true, isActive: true },

    // 61 - Fundos/Doações (EQUITY)
    { id: '41', code: '61', name: 'Fundos/Doações (ONG)', type: 'EQUITY', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '42', code: '61.1', name: 'Doações Restritas', type: 'EQUITY', level: 2, parentId: '41', balance: 0, allowPosting: false, isActive: true },
    { id: '43', code: '61.1.1', name: 'Projeto A', type: 'EQUITY', level: 3, parentId: '42', balance: 0, allowPosting: true, isActive: true },
    { id: '44', code: '61.1.2', name: 'Projeto B', type: 'EQUITY', level: 3, parentId: '42', balance: 0, allowPosting: true, isActive: true },
    { id: '45', code: '61.2', name: 'Doações Livres', type: 'EQUITY', level: 2, parentId: '41', balance: 0, allowPosting: false, isActive: true },
    { id: '46', code: '61.2.1', name: 'Doadores Regulares', type: 'EQUITY', level: 3, parentId: '45', balance: 0, allowPosting: true, isActive: true },
    { id: '47', code: '61.2.2', name: 'Doadores Eventuais', type: 'EQUITY', level: 3, parentId: '45', balance: 0, allowPosting: true, isActive: true },

    // 22 - Fornecedores (LIABILITY)
    { id: '48', code: '22', name: 'Fornecedores', type: 'LIABILITY', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '49', code: '22.1', name: 'Fornecedores Nacionais', type: 'LIABILITY', level: 2, parentId: '48', balance: 0, allowPosting: true, isActive: true },
    { id: '50', code: '22.2', name: 'Fornecedores Internacionais', type: 'LIABILITY', level: 2, parentId: '48', balance: 0, allowPosting: true, isActive: true },

    // 32 - IVA (LIABILITY)
    { id: '51', code: '32', name: 'IVA', type: 'LIABILITY', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '52', code: '32.1', name: 'IVA a Pagar', type: 'LIABILITY', level: 2, parentId: '51', balance: 0, allowPosting: true, isActive: true },
    { id: '53', code: '32.2', name: 'IVA a Recuperar', type: 'ASSET', level: 2, parentId: '51', balance: 0, allowPosting: true, isActive: true },

    // 51 - Capital Social (EQUITY)
    { id: '54', code: '51', name: 'Capital Social', type: 'EQUITY', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '55', code: '51.1', name: 'Capital Subscrito', type: 'EQUITY', level: 2, parentId: '54', balance: 0, allowPosting: true, isActive: true },
    { id: '56', code: '51.2', name: 'Capital Realizado', type: 'EQUITY', level: 2, parentId: '54', balance: 0, allowPosting: true, isActive: true },

    // 71 - Vendas (REVENUE)
    { id: '57', code: '71', name: 'Vendas', type: 'REVENUE', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '58', code: '71.1', name: 'Vendas de Mercadorias', type: 'REVENUE', level: 2, parentId: '57', balance: 0, allowPosting: true, isActive: true },
    { id: '59', code: '71.2', name: 'Vendas de Serviços', type: 'REVENUE', level: 2, parentId: '57', balance: 0, allowPosting: true, isActive: true },

    // 62 - Custos (EXPENSE)
    { id: '60', code: '62', name: 'Custos das Vendas', type: 'EXPENSE', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '61', code: '62.1', name: 'Custo das Mercadorias Vendidas', type: 'EXPENSE', level: 2, parentId: '60', balance: 0, allowPosting: true, isActive: true },
    { id: '62', code: '62.2', name: 'Custo dos Serviços Prestados', type: 'EXPENSE', level: 2, parentId: '60', balance: 0, allowPosting: true, isActive: true },
];

// Sample Articles
export const SAMPLE_ARTICLES: Article[] = [
    {
        id: 'ART001',
        code: 'A001',
        name: 'Portátil XPTO 15"',
        description: 'Portátil profissional 15 polegadas',
        unit: 'UN',
        purchasePrice: 1200.00,
        salePrice: 1500.00,
        ivaRate: 17,
        ivaCode: '17',
        stockControl: true,
        currentStock: 0,
        minStock: 2,
        maxStock: 50,
        revenueAccountId: '58', // 71.1 - Vendas de Mercadorias
        cogsAccountId: '61',    // 62.1 - CMV
        inventoryAccountId: '22', // 31.1.1 - Produtos Alimentares
        isActive: true
    },
    {
        id: 'ART002',
        code: 'A002',
        name: 'Monitor 24" LED',
        description: 'Monitor LED 24 polegadas Full HD',
        unit: 'UN',
        purchasePrice: 200.00,
        salePrice: 250.00,
        ivaRate: 17,
        ivaCode: '17',
        stockControl: true,
        currentStock: 0,
        minStock: 5,
        maxStock: 100,
        revenueAccountId: '58', // 71.1 - Vendas de Mercadorias
        cogsAccountId: '61',    // 62.1 - CMV
        inventoryAccountId: '23', // 31.1.2 - Produtos Domésticos (Exemplo)
        isActive: true
    },
    {
        id: 'SRV001',
        code: 'S001',
        name: 'Serviço de Instalação',
        description: 'Instalação e configuração de equipamento',
        unit: 'H',
        purchasePrice: 0,
        salePrice: 45.00,
        ivaRate: 17,
        ivaCode: '17',
        stockControl: false,
        currentStock: 0,
        minStock: 0,
        maxStock: 0,
        revenueAccountId: '59', // 71.2 - Vendas de Serviços
        cogsAccountId: '61',
        inventoryAccountId: '',
        isActive: true
    }
];

// Sample Customers
export const SAMPLE_CUSTOMERS: Customer[] = [
    {
        id: 'CLI001',
        code: 'C001',
        name: 'Empresa Exemplo, Lda',
        nif: '123456789',
        address: 'Av. Julius Nyerere, 1234',
        city: 'Maputo',
        postalCode: '1100',
        country: 'Moçambique',
        phone: '+258 21 123456',
        email: 'contacto@exemplo.co.mz',
        paymentTerms: 30,
        creditLimit: 100000,
        currentBalance: 0,
        receivableAccountId: '17', // 21.1.1 - Clientes a Dinheiro
        isActive: true
    },
    {
        id: 'CLI002',
        code: 'C002',
        name: 'Comércio Geral SA',
        nif: '987654321',
        address: 'Rua da Resistência, 567',
        city: 'Maputo',
        postalCode: '1100',
        country: 'Moçambique',
        phone: '+258 21 987654',
        email: 'geral@comercio.co.mz',
        paymentTerms: 60,
        creditLimit: 250000,
        currentBalance: 0,
        receivableAccountId: '18', // 21.1.2 - Clientes a Crédito
        isActive: true
    }
];

// Sample Warehouses
export const SAMPLE_WAREHOUSES: Warehouse[] = [
    {
        id: 'WH001',
        code: 'ARM01',
        name: 'Armazém Principal',
        address: 'Zona Industrial, Maputo',
        isDefault: true,
        isActive: true
    },
    {
        id: 'WH002',
        code: 'ARM02',
        name: 'Armazém Secundário',
        address: 'Matola',
        isDefault: false,
        isActive: true
    }
];
