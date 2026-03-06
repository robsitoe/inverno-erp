import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface EntityType {
    id: string;
    code: string;
    description: string;
    category: 'CUSTOMER' | 'SUPPLIER' | 'OTHER';
    active: boolean;
}

@Component({
    selector: 'app-entity-type-config-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div class="bg-white rounded shadow-xl w-[600px] flex flex-col max-h-[80vh]">
        <!-- Header -->
        <div class="bg-blue-600 text-white px-4 py-2 flex justify-between items-center shrink-0">
          <h2 class="font-bold text-sm flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">engineering</span>
            Configurar Tipos de Entidade
          </h2>
          <button (click)="close.emit()" class="hover:bg-blue-700 rounded p-1 transition-colors">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Toolbar -->
        <div class="p-2 border-b border-gray-200 bg-gray-50 flex gap-2">
          <button (click)="createNew()" class="bg-green-600 text-white px-3 py-1 rounded-sm text-xs hover:bg-green-700 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">add</span> Novo Tipo
          </button>
          <div class="flex-1"></div>
          <button (click)="resetToDefaults()" class="text-blue-600 px-3 py-1 text-xs hover:bg-blue-50 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">history</span> Restaurar Padrões
          </button>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead class="bg-gray-100 sticky top-0 border-b border-gray-200">
              <tr>
                <th class="px-3 py-2 font-bold text-gray-600 w-24">Código</th>
                <th class="px-3 py-2 font-bold text-gray-600">Descrição</th>
                <th class="px-3 py-2 font-bold text-gray-600 w-32">Categoria</th>
                <th class="px-3 py-2 font-bold text-gray-600 w-16 text-center">Ativo</th>
                <th class="px-3 py-2 font-bold text-gray-600 w-16 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let type of entityTypes; let i = index" class="border-b border-gray-100 hover:bg-blue-50 group">
                <td class="px-3 py-2">
                  <input [(ngModel)]="type.code" class="w-full border-none bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-sm px-1 py-0.5" placeholder="Cód.">
                </td>
                <td class="px-3 py-2">
                  <input [(ngModel)]="type.description" class="w-full border-none bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-sm px-1 py-0.5" placeholder="Descrição">
                </td>
                <td class="px-3 py-2">
                  <select [(ngModel)]="type.category" class="w-full border-none bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-sm px-0.5 py-0.5 translate-y-[-1px]">
                    <option value="CUSTOMER">Cliente</option>
                    <option value="SUPPLIER">Fornecedor</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </td>
                <td class="px-3 py-2 text-center">
                  <input type="checkbox" [(ngModel)]="type.active" class="rounded-sm border-gray-300 text-blue-600">
                </td>
                <td class="px-3 py-2 text-center">
                  <button (click)="deleteType(i)" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="entityTypes.length === 0">
                <td colspan="5" class="py-8 text-center text-gray-400 italic">Nenhum tipo configurado.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button (click)="close.emit()" class="px-4 py-1.5 border border-gray-300 rounded-sm text-xs hover:bg-gray-100 font-medium">Cancelar</button>
          <button (click)="saveChanges()" class="px-6 py-1.5 bg-blue-600 text-white rounded-sm text-xs hover:bg-blue-700 font-medium shadow-sm">Gravar Alterações</button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; }
  `]
})
export class EntityTypeConfigModalComponent implements OnInit {
    @Output() close = new EventEmitter<void>();

    entityTypes: EntityType[] = [];

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        const stored = localStorage.getItem('erp_entity_types');
        if (stored) {
            this.entityTypes = JSON.parse(stored);
        } else {
            this.entityTypes = this.getDefaults();
        }
    }

    getDefaults(): EntityType[] {
        return [
            { id: '1', code: 'CLIENTE', description: 'Cliente', category: 'CUSTOMER', active: true },
            { id: '2', code: 'FORNECEDOR', description: 'Fornecedor', category: 'SUPPLIER', active: true },
            { id: '3', code: 'SOCIO', description: 'Sócio', category: 'OTHER', active: true },
            { id: '4', code: 'ESTADO', description: 'Estado/Ente Público', category: 'OTHER', active: true },
            { id: '5', code: 'OUTRO_CREDOR', description: 'Outro Credor', category: 'OTHER', active: true },
            { id: '6', code: 'OUTRO_DEVEDOR', description: 'Outro Devedor', category: 'OTHER', active: true },
            { id: '7', code: 'FORNEC_IMOB', description: 'Fornecedor de Imobilizado', category: 'SUPPLIER', active: true },
            { id: '8', code: 'SUBS_CAPITAL', description: 'Subscritor de Capital', category: 'OTHER', active: true },
            { id: '9', code: 'CREDOR_SUBS', description: 'Credor subs. n/liberadas', category: 'OTHER', active: true },
            { id: '10', code: 'OBRIGACIONISTA', description: 'Obrigacionista', category: 'OTHER', active: true },
            { id: '11', code: 'CONSULTOR', description: 'Consultor', category: 'OTHER', active: true },
            { id: '12', code: 'CONTA_BANCARIA', description: 'Conta bancária', category: 'OTHER', active: true },
            { id: '13', code: 'FUNCIONARIO', description: 'Funcionário', category: 'OTHER', active: true },
            { id: '14', code: 'SINDICATO', description: 'Sindicato', category: 'OTHER', active: true }
        ];
    }

    createNew() {
        this.entityTypes.push({
            id: Date.now().toString(),
            code: '',
            description: '',
            category: 'OTHER',
            active: true
        });
    }

    deleteType(index: number) {
        if (confirm('Deseja eliminar este tipo de entidade?')) {
            this.entityTypes.splice(index, 1);
        }
    }

    resetToDefaults() {
        if (confirm('Deseja restaurar os tipos de entidade padrão? Todas as alterações manuais serão perdidas.')) {
            this.entityTypes = this.getDefaults();
        }
    }

    saveChanges() {
        // Basic validation
        const invalid = this.entityTypes.some(t => !t.code || !t.description);
        if (invalid) {
            alert('Por favor preencha o código e a descrição de todos os tipos.');
            return;
        }

        localStorage.setItem('erp_entity_types', JSON.stringify(this.entityTypes));
        alert('Configurações gravadas com sucesso.');
        this.close.emit();
    }
}
