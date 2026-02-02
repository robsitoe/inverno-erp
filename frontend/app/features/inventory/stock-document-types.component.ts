import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockDocumentType } from '../../shared/models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-stock-document-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-full bg-[#F0F0F0]">
      <!-- Left Panel - List -->
      <div class="w-96 bg-white border-r border-gray-300 flex flex-col shrink-0">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 flex items-center gap-2 shrink-0">
          <span class="material-symbols-outlined text-[20px]">description</span>
          <h2 class="font-semibold text-sm">Tipos de Documentos de Stock</h2>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shrink-0">
          <button (click)="newDocumentType()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
            <span class="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Novo</span>
          </button>
          <button (click)="saveDocumentType()" [disabled]="!selectedType" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-[16px]">save</span>
            <span>Gravar</span>
          </button>
          <button (click)="deleteDocumentType()" [disabled]="!selectedType || !selectedType.id" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>Eliminar</span>
          </button>
        </div>

        <!-- Search -->
        <div class="p-2 border-b border-gray-300 shrink-0">
          <input [(ngModel)]="searchTerm" (ngModelChange)="filterTypes()" type="text" placeholder="Procurar..." class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500">
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto">
          <div *ngFor="let type of filteredTypes" 
               (click)="selectType(type)"
               [class.bg-purple-100]="selectedType?.id === type.id"
               [class.border-l-4]="selectedType?.id === type.id"
               [class.border-l-purple-600]="selectedType?.id === type.id"
               class="px-3 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px]" [style.color]="type.color">{{ type.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-xs text-gray-800 truncate">{{ type.code }} - {{ type.name }}</div>
                <div class="text-[10px] text-gray-500 truncate">{{ type.description }}</div>
              </div>
              <div class="flex flex-col items-end gap-0.5">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold" 
                      [class.bg-green-100]="type.movementType === 'IN'"
                      [class.text-green-700]="type.movementType === 'IN'"
                      [class.bg-red-100]="type.movementType === 'OUT'"
                      [class.text-red-700]="type.movementType === 'OUT'"
                      [class.bg-gray-100]="type.movementType === 'NEUTRAL'"
                      [class.text-gray-700]="type.movementType === 'NEUTRAL'">
                  {{ type.movementType === 'IN' ? 'ENTRADA' : type.movementType === 'OUT' ? 'SAÍDA' : 'NEUTRO' }}
                </span>
                <span *ngIf="!type.isActive" class="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] font-semibold">INATIVO</span>
              </div>
            </div>
          </div>
          <div *ngIf="filteredTypes.length === 0" class="p-8 text-center text-gray-400 text-xs">
            Nenhum tipo de documento encontrado.
          </div>
        </div>

        <!-- Stats -->
        <div class="px-3 py-2 bg-gray-50 border-t border-gray-300 text-[10px] text-gray-600 shrink-0">
          Total: {{ documentTypes.length }} tipos | Ativos: {{ getActiveCount() }}
        </div>
      </div>

      <!-- Right Panel - Details -->
      <div class="flex-1 flex flex-col bg-white">
        <div *ngIf="!selectedType" class="flex-1 flex items-center justify-center text-gray-400">
          <div class="text-center">
            <span class="material-symbols-outlined text-[64px] mb-4">description</span>
            <p class="text-sm">Selecione um tipo de documento para editar</p>
            <p class="text-xs mt-2">ou clique em "Novo" para criar um novo tipo</p>
          </div>
        </div>

        <div *ngIf="selectedType" class="flex-1 overflow-y-auto p-4">
          <h3 class="text-lg font-bold text-gray-800 mb-4">{{ selectedType.id ? 'Editar' : 'Novo' }} Tipo de Documento</h3>

          <div class="grid grid-cols-2 gap-4">
            <!-- Informações Básicas -->
            <div class="col-span-2 border border-gray-300 rounded-lg p-4">
              <h4 class="font-semibold text-sm text-purple-700 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">info</span>
                Informações Básicas
              </h4>
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Código *</label>
                  <input [(ngModel)]="selectedType.code" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="Ex: FI, FS, SI">
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                  <input [(ngModel)]="selectedType.name" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="Ex: Entrada de Stock">
                </div>
                
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea [(ngModel)]="selectedType.description" rows="2" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="Descrição detalhada do tipo de documento"></textarea>
                </div>
              </div>
            </div>

            <!-- Classificação -->
            <div class="border border-gray-300 rounded-lg p-4">
              <h4 class="font-semibold text-sm text-purple-700 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">category</span>
                Classificação
              </h4>
              
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Categoria *</label>
                  <select [(ngModel)]="selectedType.category" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500">
                    <option value="ENTRY">Entrada</option>
                    <option value="EXIT">Saída</option>
                    <option value="TRANSFER">Transferência</option>
                    <option value="ADJUSTMENT">Acerto</option>
                    <option value="TRANSFORMATION">Transformação</option>
                  </select>
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de Movimento *</label>
                  <select [(ngModel)]="selectedType.movementType" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500">
                    <option value="IN">Entrada (IN)</option>
                    <option value="OUT">Saída (OUT)</option>
                    <option value="NEUTRAL">Neutro</option>
                  </select>
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Ordem de Exibição</label>
                  <input [(ngModel)]="selectedType.sortOrder" type="number" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500">
                </div>
              </div>
            </div>

            <!-- Aparência -->
            <div class="border border-gray-300 rounded-lg p-4">
              <h4 class="font-semibold text-sm text-purple-700 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">palette</span>
                Aparência
              </h4>
              
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Ícone (Material Symbols)</label>
                  <div class="flex gap-2">
                    <input [(ngModel)]="selectedType.icon" type="text" class="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="Ex: inventory">
                    <span class="material-symbols-outlined text-[24px] px-2 py-1 border border-gray-300 rounded" [style.color]="selectedType.color">{{ selectedType.icon || 'help' }}</span>
                  </div>
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Cor</label>
                  <div class="flex gap-2">
                    <input [(ngModel)]="selectedType.color" type="color" class="w-16 h-8 border border-gray-300 rounded cursor-pointer">
                    <input [(ngModel)]="selectedType.color" type="text" class="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="#6366f1">
                  </div>
                </div>
                
                <div class="p-3 bg-gray-50 rounded border border-gray-200">
                  <div class="text-[10px] text-gray-600 mb-2">Pré-visualização:</div>
                  <div class="flex items-center gap-2 p-2 bg-white rounded border border-gray-300">
                    <span class="material-symbols-outlined text-[20px]" [style.color]="selectedType.color">{{ selectedType.icon || 'help' }}</span>
                    <div class="flex-1">
                      <div class="font-semibold text-xs">{{ selectedType.code || 'XX' }} - {{ selectedType.name || 'Nome do Documento' }}</div>
                      <div class="text-[10px] text-gray-500">{{ selectedType.description || 'Descrição' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Numeração -->
            <div class="border border-gray-300 rounded-lg p-4">
              <h4 class="font-semibold text-sm text-purple-700 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">tag</span>
                Numeração
              </h4>
              
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Série Padrão</label>
                  <input [(ngModel)]="selectedType.defaultSeries" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="Ex: A, 2025">
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Sequência de Numeração</label>
                  <input [(ngModel)]="selectedType.numberingSequence" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="Ex: AUTO, MANUAL">
                </div>
              </div>
            </div>

            <!-- Contabilidade -->
            <div class="border border-gray-300 rounded-lg p-4">
              <h4 class="font-semibold text-sm text-purple-700 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">account_balance</span>
                Integração Contabilística
              </h4>
              
              <div class="space-y-3">
                <label class="flex items-center gap-2">
                  <input [(ngModel)]="selectedType.accountingIntegration" type="checkbox" class="rounded border-gray-300">
                  <span class="text-xs text-gray-700">Integrar com Contabilidade</span>
                </label>
                
                <div *ngIf="selectedType.accountingIntegration">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Conta Débito Padrão</label>
                  <input [(ngModel)]="selectedType.defaultDebitAccount" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="Ex: 22">
                </div>
                
                <div *ngIf="selectedType.accountingIntegration">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Conta Crédito Padrão</label>
                  <input [(ngModel)]="selectedType.defaultCreditAccount" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500" placeholder="Ex: 21">
                </div>
              </div>
            </div>

            <!-- Opções -->
            <div class="col-span-2 border border-gray-300 rounded-lg p-4">
              <h4 class="font-semibold text-sm text-purple-700 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">settings</span>
                Opções e Validações
              </h4>
              
              <div class="grid grid-cols-3 gap-3">
                <label class="flex items-center gap-2">
                  <input [(ngModel)]="selectedType.affectsStock" type="checkbox" class="rounded border-gray-300">
                  <span class="text-xs text-gray-700">Afeta Stock</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input [(ngModel)]="selectedType.requiresWarehouse" type="checkbox" class="rounded border-gray-300">
                  <span class="text-xs text-gray-700">Requer Armazém</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input [(ngModel)]="selectedType.requiresLocation" type="checkbox" class="rounded border-gray-300">
                  <span class="text-xs text-gray-700">Requer Localização</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input [(ngModel)]="selectedType.requiresBatch" type="checkbox" class="rounded border-gray-300">
                  <span class="text-xs text-gray-700">Requer Lote</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input [(ngModel)]="selectedType.allowsNegativeStock" type="checkbox" class="rounded border-gray-300">
                  <span class="text-xs text-gray-700">Permite Stock Negativo</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input [(ngModel)]="selectedType.requiresApproval" type="checkbox" class="rounded border-gray-300">
                  <span class="text-xs text-gray-700">Requer Aprovação</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input [(ngModel)]="selectedType.isActive" type="checkbox" class="rounded border-gray-300">
                  <span class="text-xs text-gray-700 font-semibold">Ativo</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-2 bg-[#DCE4F2] border-t border-gray-300 shrink-0 text-xs text-gray-600 flex justify-between items-center">
          <span>{{ selectedType?.id ? 'Editando tipo existente' : 'Criando novo tipo' }}</span>
          <span *ngIf="selectedType?.createdAt">Criado em: {{ selectedType.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
      </div>
    </div>
  `
})
export class StockDocumentTypesComponent implements OnInit {
  documentTypes: StockDocumentType[] = [];
  filteredTypes: StockDocumentType[] = [];
  selectedType: StockDocumentType | null = null;
  searchTerm = '';

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.loadDocumentTypes();
  }

  loadDocumentTypes() {
    this.dataService.getDocumentTypes('STOCK').subscribe(types => {
      this.documentTypes = types;
      this.filterTypes();
    });
  }

  getDefaultDocumentTypes(): StockDocumentType[] {
    const now = new Date();
    return [
      {
        id: 'SDT-001',
        code: 'FI',
        name: 'Entrada de Stock',
        description: 'Receção de mercadorias, compras, devoluções de clientes',
        category: 'ENTRY',
        movementType: 'IN',
        affectsStock: true,
        requiresWarehouse: true,
        requiresLocation: false,
        requiresBatch: false,
        allowsNegativeStock: false,
        requiresApproval: false,
        defaultSeries: 'A',
        numberingSequence: 'AUTO',
        accountingIntegration: true,
        defaultDebitAccount: '22',
        defaultCreditAccount: '21',
        icon: 'input',
        color: '#10b981',
        isActive: true,
        sortOrder: 1,
        createdAt: now
      },
      {
        id: 'SDT-002',
        code: 'FS',
        name: 'Saída de Stock',
        description: 'Vendas, consumos, transferências para produção',
        category: 'EXIT',
        movementType: 'OUT',
        affectsStock: true,
        requiresWarehouse: true,
        requiresLocation: false,
        requiresBatch: false,
        allowsNegativeStock: true,
        requiresApproval: false,
        defaultSeries: 'A',
        numberingSequence: 'AUTO',
        accountingIntegration: true,
        defaultDebitAccount: '61',
        defaultCreditAccount: '22',
        icon: 'output',
        color: '#ef4444',
        isActive: true,
        sortOrder: 2,
        createdAt: now
      },
      {
        id: 'SDT-003',
        code: 'SI',
        name: 'Stock Inicial',
        description: 'Abertura de exercício, inventário inicial',
        category: 'ADJUSTMENT',
        movementType: 'IN',
        affectsStock: true,
        requiresWarehouse: true,
        requiresLocation: false,
        requiresBatch: false,
        allowsNegativeStock: false,
        requiresApproval: true,
        defaultSeries: 'A',
        numberingSequence: 'AUTO',
        accountingIntegration: true,
        defaultDebitAccount: '22',
        defaultCreditAccount: '56',
        icon: 'inventory_2',
        color: '#3b82f6',
        isActive: true,
        sortOrder: 3,
        createdAt: now
      },
      {
        id: 'SDT-004',
        code: 'AIP',
        name: 'Acertos de Inventário Positivos',
        description: 'Correções positivas após contagem física',
        category: 'ADJUSTMENT',
        movementType: 'IN',
        affectsStock: true,
        requiresWarehouse: true,
        requiresLocation: false,
        requiresBatch: false,
        allowsNegativeStock: false,
        requiresApproval: true,
        defaultSeries: 'A',
        numberingSequence: 'AUTO',
        accountingIntegration: true,
        defaultDebitAccount: '22',
        defaultCreditAccount: '78',
        icon: 'add_circle',
        color: '#10b981',
        isActive: true,
        sortOrder: 4,
        createdAt: now
      },
      {
        id: 'SDT-005',
        code: 'AIN',
        name: 'Acertos de Inventário Negativos',
        description: 'Correções negativas após contagem física, quebras, perdas',
        category: 'ADJUSTMENT',
        movementType: 'OUT',
        affectsStock: true,
        requiresWarehouse: true,
        requiresLocation: false,
        requiresBatch: false,
        allowsNegativeStock: true,
        requiresApproval: true,
        defaultSeries: 'A',
        numberingSequence: 'AUTO',
        accountingIntegration: true,
        defaultDebitAccount: '68',
        defaultCreditAccount: '22',
        icon: 'remove_circle',
        color: '#ef4444',
        isActive: true,
        sortOrder: 5,
        createdAt: now
      },
      {
        id: 'SDT-006',
        code: 'LE',
        name: 'Lançamento de Encargos',
        description: 'Custos adicionais ao stock (transporte, seguros, etc.)',
        category: 'ADJUSTMENT',
        movementType: 'IN',
        affectsStock: true,
        requiresWarehouse: true,
        requiresLocation: false,
        requiresBatch: false,
        allowsNegativeStock: false,
        requiresApproval: false,
        defaultSeries: 'A',
        numberingSequence: 'AUTO',
        accountingIntegration: true,
        defaultDebitAccount: '22',
        defaultCreditAccount: '62',
        icon: 'local_shipping',
        color: '#f59e0b',
        isActive: true,
        sortOrder: 6,
        createdAt: now
      },
      {
        id: 'SDT-007',
        code: 'LD',
        name: 'Lançamento de Descontos',
        description: 'Descontos que reduzem o valor do stock',
        category: 'ADJUSTMENT',
        movementType: 'OUT',
        affectsStock: true,
        requiresWarehouse: true,
        requiresLocation: false,
        requiresBatch: false,
        allowsNegativeStock: false,
        requiresApproval: false,
        defaultSeries: 'A',
        numberingSequence: 'AUTO',
        accountingIntegration: true,
        defaultDebitAccount: '78',
        defaultCreditAccount: '22',
        icon: 'discount',
        color: '#8b5cf6',
        isActive: true,
        sortOrder: 7,
        createdAt: now
      },
      {
        id: 'SDT-008',
        code: 'TA',
        name: 'Transferência entre Armazéns',
        description: 'Movimentação de stock entre diferentes armazéns',
        category: 'TRANSFER',
        movementType: 'NEUTRAL',
        affectsStock: true,
        requiresWarehouse: true,
        requiresLocation: false,
        requiresBatch: false,
        allowsNegativeStock: false,
        requiresApproval: false,
        defaultSeries: 'A',
        numberingSequence: 'AUTO',
        accountingIntegration: false,
        icon: 'swap_horiz',
        color: '#06b6d4',
        isActive: true,
        sortOrder: 8,
        createdAt: now
      }
    ];
  }

  filterTypes() {
    if (!this.searchTerm) {
      this.filteredTypes = [...this.documentTypes].sort((a, b) => a.sortOrder - b.sortOrder);
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredTypes = this.documentTypes
        .filter(t =>
          t.code.toLowerCase().includes(term) ||
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  selectType(type: StockDocumentType) {
    this.selectedType = { ...type };
  }

  newDocumentType() {
    this.selectedType = {
      id: '',
      code: '',
      name: '',
      description: '',
      category: 'ENTRY',
      movementType: 'IN',
      affectsStock: true,
      requiresWarehouse: true,
      requiresLocation: false,
      requiresBatch: false,
      allowsNegativeStock: false,
      requiresApproval: false,
      defaultSeries: 'A',
      numberingSequence: 'AUTO',
      accountingIntegration: false,
      icon: 'description',
      color: '#6366f1',
      isActive: true,
      sortOrder: this.documentTypes.length + 1,
      createdAt: new Date()
    };
  }

  saveDocumentType() {
    if (!this.selectedType) return;

    if (!this.selectedType.code || !this.selectedType.name) {
      alert('Código e Nome são obrigatórios!');
      return;
    }

    if (!this.selectedType.id) {
      // New type
      this.selectedType.id = `SDT-${Date.now()}`;
      this.selectedType.createdAt = new Date();
      this.documentTypes.push(this.selectedType);
    } else {
      // Update existing
      const index = this.documentTypes.findIndex(t => t.id === this.selectedType!.id);
      if (index !== -1) {
        this.selectedType.updatedAt = new Date();
        this.documentTypes[index] = { ...this.selectedType };
      }
    }

    this.saveToLocalStorage();
    this.filterTypes();
    alert('Tipo de documento gravado com sucesso!');
  }

  deleteDocumentType() {
    if (!this.selectedType || !this.selectedType.id) return;

    if (!confirm(`Tem certeza que deseja eliminar o tipo "${this.selectedType.name}"?`)) {
      return;
    }

    this.documentTypes = this.documentTypes.filter(t => t.id !== this.selectedType!.id);
    this.saveToLocalStorage();
    this.filterTypes();
    this.selectedType = null;
    alert('Tipo de documento eliminado com sucesso!');
  }

  saveToLocalStorage() {
    this.dataService.saveDocumentTypes('STOCK', this.documentTypes).subscribe();
  }

  getActiveCount(): number {
    return this.documentTypes.filter(t => t.isActive).length;
  }
}
