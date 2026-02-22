import { Account } from './entities/account.entity';

export const PGC_NIR_MOZ: Partial<Account>[] = [
    // Classe 1 - Meios Financeiros
    { id: '1', code: '1.1', name: 'CAIXA', type: 'ASSET', level: 1, balance: 0, allowPosting: true, isActive: true },
    { id: '2', code: '1.2', name: 'BANCOS', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '3', code: '1.2.1', name: 'Depósitos à ordem', type: 'ASSET', level: 2, parentId: '2', balance: 0, allowPosting: true, isActive: true },
    { id: '4', code: '1.2.2', name: 'Depósitos com pré-aviso', type: 'ASSET', level: 2, parentId: '2', balance: 0, allowPosting: true, isActive: true },
    { id: '5', code: '1.2.3', name: 'Depósitos a prazo', type: 'ASSET', level: 2, parentId: '2', balance: 0, allowPosting: true, isActive: true },

    // Classe 2 - Inventários e Activos Biológicos
    { id: '210', code: '2.1', name: 'COMPRAS', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '211', code: '2.1.1', name: 'Mercadorias', type: 'ASSET', level: 2, parentId: '210', balance: 0, allowPosting: true, isActive: true },
    { id: '212', code: '2.1.2', name: 'Matérias primas, auxiliares e materiais', type: 'ASSET', level: 2, parentId: '210', balance: 0, allowPosting: true, isActive: true },
    { id: '22', code: '2.2', name: 'MERCADORIAS', type: 'ASSET', level: 1, balance: 0, allowPosting: true, isActive: true }, // Antigo Mercadorias
    { id: '26', code: '2.6', name: 'MATÉRIAS PRIMAS, AUXILIARES E MATERIAIS', type: 'ASSET', level: 1, balance: 0, allowPosting: true, isActive: true },

    // Classe 3 - Investimentos de Capital
    { id: '31', code: '3.1', name: 'INVESTIMENTOS FINANCEIROS', type: 'ASSET', level: 1, balance: 0, allowPosting: true, isActive: true },
    { id: '32', code: '3.2', name: 'ACTIVOS TANGÍVEIS', type: 'ASSET', level: 1, balance: 0, allowPosting: true, isActive: true },
    { id: '33', code: '3.3', name: 'ACTIVOS INTANGÍVEIS', type: 'ASSET', level: 1, balance: 0, allowPosting: true, isActive: true },

    // Classe 4 - Contas a Receber, Pagar, Acréscimos e Diferimentos
    { id: '15', code: '4.1', name: 'CLIENTES', type: 'ASSET', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '18', code: '4.1.1', name: 'Clientes c/c', type: 'ASSET', level: 2, parentId: '15', balance: 0, allowPosting: true, isActive: true }, // Antigo Clientes Nacionais -> c/c
    { id: '412', code: '4.1.2', name: 'Clientes - Títulos a receber', type: 'ASSET', level: 2, parentId: '15', balance: 0, allowPosting: true, isActive: true },
    { id: '418', code: '4.1.8', name: 'Clientes de cobrança duvidosa', type: 'ASSET', level: 2, parentId: '15', balance: 0, allowPosting: true, isActive: true },
    { id: '17', code: '4.1.9', name: 'Adiantamentos de clientes', type: 'LIABILITY', level: 2, parentId: '15', balance: 0, allowPosting: true, isActive: true },

    { id: '48', code: '4.2', name: 'FORNECEDORES', type: 'LIABILITY', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '49', code: '4.2.1', name: 'Fornecedores c/c', type: 'LIABILITY', level: 2, parentId: '48', balance: 0, allowPosting: true, isActive: true }, // Antigo Fornec Nacionais
    { id: '422', code: '4.2.2', name: 'Fornecedores - Títulos a pagar', type: 'LIABILITY', level: 2, parentId: '48', balance: 0, allowPosting: true, isActive: true },
    { id: '429', code: '4.2.9', name: 'Adiantamentos a fornecedores', type: 'ASSET', level: 2, parentId: '48', balance: 0, allowPosting: true, isActive: true },

    { id: '43', code: '4.3', name: 'EMPRÉSTIMOS OBTIDOS', type: 'LIABILITY', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '431', code: '4.3.1', name: 'Empréstimos bancários', type: 'LIABILITY', level: 2, parentId: '43', balance: 0, allowPosting: true, isActive: true },

    { id: '44', code: '4.4', name: 'ESTADO', type: 'LIABILITY', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '441', code: '4.4.1', name: 'Imposto sobre o rendimento', type: 'LIABILITY', level: 2, parentId: '44', balance: 0, allowPosting: true, isActive: true },
    { id: '442', code: '4.4.2', name: 'Impostos retidos na fonte', type: 'LIABILITY', level: 2, parentId: '44', balance: 0, allowPosting: true, isActive: true },
    { id: '443', code: '4.4.3', name: 'Imposto sobre o valor acrescentado', type: 'LIABILITY', level: 2, parentId: '44', balance: 0, allowPosting: false, isActive: true },
    { id: '4431', code: '4.4.3.1', name: 'IVA suportado', type: 'ASSET', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '53', code: '4.4.3.2', name: 'IVA dedutível', type: 'ASSET', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '4433', code: '4.4.3.3', name: 'IVA liquidado', type: 'LIABILITY', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '4434', code: '4.4.3.4', name: 'IVA regularizações', type: 'LIABILITY', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '4435', code: '4.4.3.5', name: 'IVA apuramento', type: 'LIABILITY', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '4436', code: '4.4.3.6', name: 'IVA liquidações oficiosas', type: 'LIABILITY', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '52', code: '4.4.3.7', name: 'IVA a pagar', type: 'LIABILITY', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '4438', code: '4.4.3.8', name: 'IVA a recuperar', type: 'ASSET', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '4439', code: '4.4.3.9', name: 'IVA reembolsos pedidos', type: 'ASSET', level: 3, parentId: '443', balance: 0, allowPosting: true, isActive: true },
    { id: '449', code: '4.4.9', name: 'Contribuições para o INSS', type: 'LIABILITY', level: 2, parentId: '44', balance: 0, allowPosting: true, isActive: true },

    { id: '45', code: '4.5', name: 'OUTROS DEVEDORES', type: 'ASSET', level: 1, balance: 0, allowPosting: true, isActive: true },
    { id: '46', code: '4.6', name: 'OUTROS CREDORES', type: 'LIABILITY', level: 1, balance: 0, allowPosting: true, isActive: true },

    // Classe 5 - Capital Próprio
    { id: '51', code: '5.1', name: 'CAPITAL', type: 'EQUITY', level: 1, balance: 0, allowPosting: true, isActive: true },
    { id: '55', code: '5.5', name: 'RESERVAS', type: 'EQUITY', level: 1, balance: 0, allowPosting: true, isActive: true },
    { id: '59', code: '5.9', name: 'RESULTADOS TRANSITADOS', type: 'EQUITY', level: 1, balance: 0, allowPosting: true, isActive: true },

    // Classe 6 - Gastos
    { id: '61', code: '6.1', name: 'Custo das mercadorias vendidas e das matérias consumidas', type: 'EXPENSE', level: 1, balance: 0, allowPosting: true, isActive: true },
    { id: '62', code: '6.2', name: 'Fornecimentos e serviços de terceiros', type: 'EXPENSE', level: 1, balance: 0, allowPosting: true, isActive: true },
    { id: '63', code: '6.3', name: 'Gastos com o pessoal', type: 'EXPENSE', level: 1, balance: 0, allowPosting: true, isActive: true },

    // Classe 7 - Rendimentos
    { id: '57', code: '7.1', name: 'VENDAS', type: 'REVENUE', level: 1, balance: 0, allowPosting: false, isActive: true },
    { id: '58', code: '7.1.1', name: 'Vendas de mercadorias', type: 'REVENUE', level: 2, parentId: '57', balance: 0, allowPosting: true, isActive: true },
    { id: '72', code: '7.2', name: 'Prestações de serviços', type: 'REVENUE', level: 1, balance: 0, allowPosting: true, isActive: true },
];

export const ACCOUNT_PRESETS = {
    'PGC-NIR': PGC_NIR_MOZ,
    'PGCM': PGC_NIR_MOZ,
    'PGC-PE': PGC_NIR_MOZ
};
