import { LicensePlan } from './entities/license.entity';

/**
 * Tabela única dos planos: o que se vende, o que cada plano liga (módulos) e os limites que a licença aplica.
 * O ecrã de licença, o assistente inicial, a ativação e os limites leem daqui — o que se anuncia é o que o programa faz.
 * Preços em MZN por ano, por instalação. Para mudar preços ou limites, mude apenas esta tabela
 * (e a cópia em tools/licenca/Gerador-Licencas.html, usada para emitir as chaves).
 */

/** Módulos que a licença liga (são as "features" que o menu verifica). */
export const MODULES: Record<string, string> = {
  SALES: 'Vendas e faturação',
  INVENTORY: 'Inventário, armazéns e Setor de Gás',
  TREASURY: 'Tesouraria: recibos, pagamentos, caixas, bancos, cheques',
  PURCHASES: 'Compras e fornecedores',
  HR: 'Recursos Humanos e salários',
  ACCOUNTING: 'Contabilidade, IVA, fecho de período e ativos',
};

export interface LicensePlanDefinition {
  id: LicensePlan;
  name: string;
  /** Para que tipo de cliente é. */
  description: string;
  /** Preço anual (MZN). */
  price: number;
  /** Equivalente mensal, só para mostrar. */
  monthly: number;
  billing: string;
  features: string[];
  maxUsers: number | null;
  maxCompanies: number | null;
  /** Lista curta mostrada nos cartões (gerada a partir dos módulos e limites). */
  benefitSummary: string[];
  /** Módulos que NÃO estão incluídos (para ser claro no que se vende). */
  notIncluded: string[];
  support: string;
  icon: string;
  color: string;
  isPopular?: boolean;
}

/** Preço de cada utilizador além dos incluídos no plano (MZN por ano). */
export const EXTRA_USER_PRICE = 2400;

type PlanSeed = Omit<LicensePlanDefinition, 'benefitSummary' | 'notIncluded' | 'monthly'> & { extras?: string[] };

const SEEDS: PlanSeed[] = [
  {
    id: LicensePlan.LITE, name: 'Essencial', description: 'Lojas, mercearias, revendedores de gás e pequeno comércio',
    price: 7500, billing: 'por ano', features: ['SALES', 'INVENTORY', 'TREASURY'], maxUsers: 2, maxCompanies: 1,
    support: 'Suporte por WhatsApp e email', icon: 'storefront', color: 'green',
  },
  {
    id: LicensePlan.STANDARD, name: 'Negócio', description: 'PME de comércio, distribuição e armazém, com pessoal',
    price: 18000, billing: 'por ano', features: ['SALES', 'INVENTORY', 'TREASURY', 'PURCHASES', 'HR'], maxUsers: 5, maxCompanies: 1,
    support: 'Suporte por WhatsApp e email', icon: 'warehouse', color: 'blue', isPopular: true,
  },
  {
    id: LicensePlan.PRO, name: 'Profissional', description: 'Empresas com contabilidade organizada e gabinetes de contabilidade',
    price: 36000, billing: 'por ano', features: ['SALES', 'INVENTORY', 'TREASURY', 'PURCHASES', 'HR', 'ACCOUNTING'], maxUsers: 10, maxCompanies: 3,
    support: 'Suporte prioritário por WhatsApp e email', icon: 'business', color: 'purple',
  },
  {
    id: LicensePlan.ENTERPRISE, name: 'Empresarial', description: 'Grupos de empresas e operações com muitos utilizadores',
    price: 72000, billing: 'por ano', features: ['ALL'], maxUsers: null, maxCompanies: null,
    support: 'Suporte prioritário, com resposta no mesmo dia útil', icon: 'corporate_fare', color: 'amber',
    extras: ['Módulos futuros incluídos'],
  },
];

/** 2400 → "2.400" (sem depender do locale do Node). */
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const LICENSE_PLANS: LicensePlanDefinition[] = SEEDS.map(({ extras, ...p }) => {
  const all = p.features.includes('ALL');
  const mods = all ? Object.keys(MODULES) : p.features;
  return {
    ...p,
    monthly: Math.round(p.price / 12),
    benefitSummary: [
      ...mods.map(m => MODULES[m]),
      'Controlo de Validades e Prazos',
      ...(extras || []),
      p.maxCompanies ? `${p.maxCompanies} empresa${p.maxCompanies > 1 ? 's' : ''}` : 'Empresas ilimitadas',
      p.maxUsers ? `${p.maxUsers} utilizadores (adicional: ${fmt(EXTRA_USER_PRICE)} MT/ano cada)` : 'Utilizadores ilimitados',
      'Atualizações durante a licença',
      p.support,
    ],
    notIncluded: all ? [] : Object.keys(MODULES).filter(m => !p.features.includes(m)).map(m => MODULES[m]),
  };
});

/** Avaliação: todos os módulos durante o período de teste, para o cliente ver tudo antes de escolher. */
export const DEMO_FEATURES = ['ALL'];

export function planDefinition(plan: LicensePlan | string): LicensePlanDefinition | undefined {
  return LICENSE_PLANS.find(p => p.id === plan);
}

export function featuresForPlan(plan: LicensePlan | string): string[] {
  if (plan === LicensePlan.DEMO) return DEMO_FEATURES;
  return planDefinition(plan)?.features || ['SALES'];
}
