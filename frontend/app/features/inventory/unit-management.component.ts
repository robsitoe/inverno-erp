import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Unit {
    id: string;
    code: string;
    description: string;
    type: 'BASE' | 'DERIVED';
    baseUnit?: string;
    conversionFactor?: number;
}

@Component({
    selector: 'app-unit-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="saveUnit()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">save</span>
          <span>Gravar</span>
        </button>
        <button (click)="newUnit()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Novo</span>
        </button>
        <button (click)="deleteUnit()" [disabled]="!currentUnit.id" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs disabled:opacity-50">
          <span class="material-symbols-outlined text-[18px]">delete</span>
          <span>Anular</span>
        </button>
      </div>

      <!-- Form Content -->
      <div class="flex-1 overflow-auto p-4">
        <div class="bg-white border border-gray-300 rounded shadow-sm max-w-2xl mx-auto">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">straighten</span>
            <h2 class="font-semibold text-sm">Unidades de Medida</h2>
          </div>

          <!-- Form Fields -->
          <div class="p-4 space-y-3">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-700 w-32">Código:</label>
              <input 
                type="text" 
                [(ngModel)]="currentUnit.code"
                class="w-32 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                placeholder="Ex: UN, KG, L"
              />
            </div>

            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-700 w-32">Descrição:</label>
              <input 
                type="text" 
                [(ngModel)]="currentUnit.description"
                class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                placeholder="Ex: Unidade, Quilograma, Litro"
              />
            </div>

            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-700 w-32">Tipo:</label>
              <select 
                [(ngModel)]="currentUnit.type"
                class="px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="BASE">Base</option>
                <option value="DERIVED">Derivada</option>
              </select>
            </div>

            <div *ngIf="currentUnit.type === 'DERIVED'" class="space-y-3 pl-32">
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-700 w-32">Unidade Base:</label>
                <select 
                  [(ngModel)]="currentUnit.baseUnit"
                  class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  <option *ngFor="let unit of baseUnits" [value]="unit.code">{{ unit.code }} - {{ unit.description }}</option>
                </select>
              </div>

              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-700 w-32">Fator de Conversão:</label>
                <input 
                  type="number" 
                  [(ngModel)]="currentUnit.conversionFactor"
                  class="w-32 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="1.0"
                  step="0.001"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Units List -->
        <div class="bg-white border border-gray-300 rounded shadow-sm max-w-2xl mx-auto mt-4">
          <div class="bg-gray-100 px-3 py-2 border-b border-gray-300">
            <h3 class="font-semibold text-xs text-gray-700">Unidades Cadastradas</h3>
          </div>
          <div class="max-h-64 overflow-auto">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="px-3 py-2 text-left border-b border-gray-300">Código</th>
                  <th class="px-3 py-2 text-left border-b border-gray-300">Descrição</th>
                  <th class="px-3 py-2 text-left border-b border-gray-300">Tipo</th>
                  <th class="px-3 py-2 text-center border-b border-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let unit of units" class="hover:bg-blue-50 cursor-pointer" (click)="editUnit(unit)">
                  <td class="px-3 py-2 border-b border-gray-200">{{ unit.code }}</td>
                  <td class="px-3 py-2 border-b border-gray-200">{{ unit.description }}</td>
                  <td class="px-3 py-2 border-b border-gray-200">{{ unit.type === 'BASE' ? 'Base' : 'Derivada' }}</td>
                  <td class="px-3 py-2 border-b border-gray-200 text-center">
                    <button (click)="editUnit(unit); $event.stopPropagation()" class="text-blue-600 hover:text-blue-800">
                      <span class="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="px-3 py-1.5 bg-[#DCE4F2] border-t border-gray-300 shrink-0 flex justify-between items-center text-xs">
        <span class="text-gray-600">{{ units.length }} unidade(s) cadastrada(s)</span>
      </div>
    </div>
  `
})
export class UnitManagementComponent implements OnInit {
    units: Unit[] = [];
    currentUnit: Unit = this.getEmptyUnit();

    ngOnInit() {
        this.loadUnits();
        this.initializeDefaultUnits();
    }

    get baseUnits(): Unit[] {
        return this.units.filter(u => u.type === 'BASE');
    }

    getEmptyUnit(): Unit {
        return {
            id: '',
            code: '',
            description: '',
            type: 'BASE'
        };
    }

    loadUnits() {
        const stored = localStorage.getItem('erp_units');
        if (stored) {
            this.units = JSON.parse(stored);
        }
    }

    initializeDefaultUnits() {
        if (this.units.length === 0) {
            const defaultUnits: Unit[] = [
                { id: 'U1', code: 'UN', description: 'Unidade', type: 'BASE' },
                { id: 'U2', code: 'KG', description: 'Quilograma', type: 'BASE' },
                { id: 'U3', code: 'L', description: 'Litro', type: 'BASE' },
                { id: 'U4', code: 'M', description: 'Metro', type: 'BASE' },
                { id: 'U5', code: 'CX', description: 'Caixa', type: 'BASE' },
                { id: 'U6', code: 'PC', description: 'Peça', type: 'BASE' },
                { id: 'U7', code: 'G', description: 'Grama', type: 'DERIVED', baseUnit: 'KG', conversionFactor: 0.001 },
                { id: 'U8', code: 'ML', description: 'Mililitro', type: 'DERIVED', baseUnit: 'L', conversionFactor: 0.001 }
            ];
            this.units = defaultUnits;
            this.saveUnits();
        }
    }

    newUnit() {
        this.currentUnit = this.getEmptyUnit();
    }

    saveUnit() {
        if (!this.currentUnit.code || !this.currentUnit.description) {
            alert('Preencha o código e descrição da unidade.');
            return;
        }

        if (this.currentUnit.id) {
            const index = this.units.findIndex(u => u.id === this.currentUnit.id);
            if (index !== -1) {
                this.units[index] = { ...this.currentUnit };
            }
        } else {
            this.currentUnit.id = `U${Date.now()}`;
            this.units.push({ ...this.currentUnit });
        }

        this.saveUnits();
        alert('Unidade gravada com sucesso!');
        this.newUnit();
    }

    editUnit(unit: Unit) {
        this.currentUnit = { ...unit };
    }

    deleteUnit() {
        if (!this.currentUnit.id) return;

        if (confirm(`Tem certeza que deseja eliminar a unidade ${this.currentUnit.code}?`)) {
            this.units = this.units.filter(u => u.id !== this.currentUnit.id);
            this.saveUnits();
            alert('Unidade eliminada com sucesso!');
            this.newUnit();
        }
    }

    saveUnits() {
        localStorage.setItem('erp_units', JSON.stringify(this.units));
    }
}
