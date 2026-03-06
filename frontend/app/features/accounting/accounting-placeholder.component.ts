import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accounting-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full bg-white overflow-y-auto p-6">
      <div class="max-w-5xl mx-auto w-full space-y-6">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-amber-600">construction</span>
            <h2 class="text-xl font-semibold text-gray-800">{{ activeDefinition.title }} (MVP)</h2>
          </div>
          <p class="text-sm text-gray-700 mt-3">{{ activeDefinition.description }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <h3 class="font-semibold text-gray-800 mb-2">Escopo funcional MVP</h3>
            <ul class="space-y-1 text-sm text-gray-700">
              <li *ngFor="let item of activeDefinition.milestones">• {{ item }}</li>
            </ul>
          </div>

          <div class="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <h3 class="font-semibold text-gray-800 mb-2">Critérios de aceite</h3>
            <ul class="space-y-1 text-sm text-gray-700">
              <li *ngFor="let item of activeDefinition.acceptanceCriteria">• {{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 class="font-semibold text-blue-900 mb-2">Endpoint backend mínimo</h3>
          <code class="text-sm text-blue-900">{{ activeDefinition.endpoint }}</code>
          <p class="text-xs text-blue-800 mt-2">Disponível para integração incremental do UI antes da versão final.</p>
        </div>
      </div>
    </div>
  `
})
export class AccountingPlaceholderComponent {
  @Input() viewKey: string = '';

  private readonly definitions: Record<string, {
    title: string;
    description: string;
    endpoint: string;
    milestones: string[];
    acceptanceCriteria: string[];
  }> = {
    'cost-centers': {
      title: 'Centros de Custo',
      description: 'Cadastro e classificação de centros de custo com ligação aos lançamentos contabilísticos.',
      endpoint: 'GET/POST /accounting/cost-centers',
      milestones: ['Criar centro de custo (código + descrição + estado).', 'Listar e pesquisar centros por código.', 'Associar centro em lançamentos futuros.'],
      acceptanceCriteria: ['Entrada: formulário exige código e descrição.', 'Validação: código único e ativo/inativo obrigatório.', 'Persistência: criação e listagem via API.', 'Relatório/exportação: endpoint CSV com lista filtrada.']
    },
    'vat': {
      title: 'IVA',
      description: 'Consulta fiscal de movimentos IVA por período com apoio à declaração.',
      endpoint: 'GET /accounting/vat/summary?fromDate&toDate',
      milestones: ['Selecionar período e carregar resumo.', 'Ver totais de IVA liquidado e dedutível.', 'Preparar dados para exportação.'],
      acceptanceCriteria: ['Entrada: período obrigatório.', 'Validação: data inicial <= data final.', 'Persistência: leitura de lançamentos já contabilizados.', 'Relatório/exportação: CSV do resumo fiscal.']
    },
    'period-close': {
      title: 'Encerramento de Período',
      description: 'Fluxo controlado para validar pendências e executar fecho contabilístico.',
      endpoint: 'POST /accounting/period-close',
      milestones: ['Executar validação pré-fecho.', 'Gerar registo mínimo de fecho.', 'Bloquear reprocessamento duplicado no mesmo período.'],
      acceptanceCriteria: ['Entrada: ano e mês obrigatórios.', 'Validação: não permitir períodos futuros.', 'Persistência: registo de fecho com timestamp.', 'Relatório/exportação: resumo de fecho em JSON/CSV.']
    },
    'exploration': {
      title: 'Exploração',
      description: 'Painel sintético para explorar saldos e movimentos por conta/período.',
      endpoint: 'GET /accounting/exploration/summary?fromDate&toDate',
      milestones: ['Resumo de totais débito/crédito.', 'Top contas com maior variação.', 'Filtro por período.'],
      acceptanceCriteria: ['Entrada: período opcional com default no mês corrente.', 'Validação: intervalo máximo de 12 meses.', 'Persistência: leitura de movimentos existentes.', 'Relatório/exportação: CSV do resumo e detalhes.']
    },
    'utilities': {
      title: 'Utilitários',
      description: 'Ferramentas operacionais para auditoria e manutenção de dados contabilísticos.',
      endpoint: 'GET /accounting/utilities/audit-log',
      milestones: ['Expor log básico de operações MVP.', 'Permitir paginação simples.', 'Adicionar exportação de auditoria.'],
      acceptanceCriteria: ['Entrada: paginação opcional.', 'Validação: limite máximo de 500 registos por pedido.', 'Persistência: histórico lido da API.', 'Relatório/exportação: CSV de auditoria.']
    }
  };

  get activeDefinition() {
    return this.definitions[this.viewKey] || {
      title: 'Em Desenvolvimento',
      description: 'Funcionalidade em fase de MVP.',
      endpoint: 'GET /accounting/mvp',
      milestones: ['Mapear requisitos.', 'Criar endpoint mínimo.', 'Integrar no menu.'],
      acceptanceCriteria: ['Entrada de dados definida.', 'Validações mínimas aplicadas.', 'Persistência disponível.', 'Relatório/exportação disponível.']
    };
  }
}
