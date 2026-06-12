/**
 * Single source of truth for permission keys (segregação de funções).
 * Mirrored in frontend/app/shared/permissions.catalog.ts — keep in sync.
 */

export interface PermissionDef {
    key: string;
    label: string;
}

export interface PermissionModule {
    module: string;
    label: string;
    permissions: PermissionDef[];
}

export const PERMISSIONS_CATALOG: PermissionModule[] = [
    {
        module: 'sales', label: 'Vendas', permissions: [
            { key: 'sales.create', label: 'Criar/editar documentos de venda' },
            { key: 'sales.approve', label: 'Aprovar/rejeitar documentos de venda' },
            { key: 'sales.post', label: 'Lançar vendas na contabilidade' },
        ],
    },
    {
        module: 'purchases', label: 'Compras', permissions: [
            { key: 'purchases.create', label: 'Criar/editar documentos de compra' },
            { key: 'purchases.approve', label: 'Aprovar/rejeitar documentos de compra' },
            { key: 'purchases.post', label: 'Lançar compras na contabilidade' },
        ],
    },
    {
        module: 'treasury', label: 'Tesouraria', permissions: [
            { key: 'treasury.create', label: 'Criar recibos/pagamentos' },
            { key: 'treasury.approve', label: 'Aprovar documentos de tesouraria' },
            { key: 'treasury.pay', label: 'Executar pagamentos' },
        ],
    },
    {
        module: 'accounting', label: 'Contabilidade', permissions: [
            { key: 'accounting.entries', label: 'Criar lançamentos manuais' },
            { key: 'accounting.post', label: 'Lançar/validar lançamentos' },
            { key: 'accounting.close', label: 'Fechar períodos' },
        ],
    },
    {
        module: 'hr', label: 'Recursos Humanos', permissions: [
            { key: 'hr.employees.manage', label: 'Gerir funcionários' },
            { key: 'hr.payroll.generate', label: 'Gerar/submeter folha de salários' },
            { key: 'hr.payroll.approve', label: 'Aprovar/rejeitar folha de salários' },
            { key: 'hr.payroll.post', label: 'Lançar folha na contabilidade' },
            { key: 'hr.payroll.pay', label: 'Pagar salários' },
            { key: 'hr.absences.manage', label: 'Registar férias/ausências' },
            { key: 'hr.absences.approve', label: 'Aprovar férias/ausências' },
        ],
    },
    {
        module: 'inventory', label: 'Inventário', permissions: [
            { key: 'inventory.movements', label: 'Movimentos de stock' },
        ],
    },
    {
        module: 'admin', label: 'Administração', permissions: [
            { key: 'admin.users', label: 'Gerir utilizadores e perfis' },
            { key: 'admin.settings', label: 'Configurações da empresa' },
        ],
    },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSIONS_CATALOG
    .flatMap(m => m.permissions.map(p => p.key));

export const DEFAULT_PROFILES: { name: string; permissions: string[] }[] = [
    { name: 'ADMIN', permissions: [...ALL_PERMISSION_KEYS] },
    {
        name: 'DIRETOR', permissions: [
            'sales.approve', 'purchases.approve', 'treasury.approve',
            'hr.payroll.approve', 'hr.absences.approve', 'accounting.close',
        ],
    },
    {
        name: 'RH', permissions: [
            'hr.employees.manage', 'hr.payroll.generate', 'hr.absences.manage',
        ],
    },
    {
        name: 'CONTABILISTA', permissions: [
            'accounting.entries', 'accounting.post',
            'sales.post', 'purchases.post', 'hr.payroll.post',
        ],
    },
    {
        name: 'TESOUREIRO', permissions: [
            'treasury.create', 'treasury.approve', 'treasury.pay', 'hr.payroll.pay',
        ],
    },
    {
        name: 'COMERCIAL', permissions: [
            'sales.create', 'inventory.movements',
        ],
    },
];
