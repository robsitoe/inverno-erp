import { Account } from './entities/account.entity';

export const PGC_NIR_MOZ: Partial<Account>[] = [
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
    { id: '63', code: '21.9', name: 'Adiantamentos de Clientes', type: 'LIABILITY', level: 2, parentId: '15', balance: 0, allowPosting: true, isActive: true },

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

    // 22 - Fornecedores (LIABILITY)
    { id: '48', code: '22', name: 'Fornecedores', type: 'LIABILITY', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '49', code: '22.1', name: 'Fornecedores Nacionais', type: 'LIABILITY', level: 2, parentId: '48', balance: 0, allowPosting: true, isActive: true },
    { id: '50', code: '22.2', name: 'Fornecedores Internacionais', type: 'LIABILITY', level: 2, parentId: '48', balance: 0, allowPosting: true, isActive: true },
    { id: '64', code: '22.9', name: 'Adiantamentos a Fornecedores', type: 'ASSET', level: 2, parentId: '48', balance: 0, allowPosting: true, isActive: true },

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

export const ACCOUNT_PRESETS = {
    'PGC-NIR': PGC_NIR_MOZ,
    'PGCM': PGC_NIR_MOZ, // For now they share the same base, can be specialized later
};
