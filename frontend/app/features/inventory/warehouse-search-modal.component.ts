import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Warehouse {
    id: string;
    code: string;
    name: string;
    address: string;
    isDefault: boolean;
    isActive: boolean;
}

@Component({
    selector: 'app-warehouse-search-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-lg shadow-xl w-[800px] max-h-[600px] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[24px]">warehouse</span>
            <h3 class="font-semibold text-lg">Selecionar Armazém</h3>
          </div>
          <button (click)="close.emit()" class="hover:bg-white/20 p-1 rounded transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Search and New Button -->
        <div class="p-4 border-b border-gray-200 flex gap-2">
          <div class="flex-1 relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              [(ngModel)]="searchTerm"
              (ngModelChange)="filterWarehouses()"
              type="text"
              placeholder="Procurar por código ou nome..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              autofocus
            />
          </div>
          <button
            (click)="showNewForm = true"
            class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors">
            <span class="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Novo</span>
          </button>
        </div>

        <!-- New Warehouse Form -->
        <div *ngIf="showNewForm" class="p-4 bg-blue-50 border-b border-blue-200">
          <h4 class="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Novo Armazém
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input [(ngModel)]="newWarehouse.code" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" placeholder="Ex: ARM-01">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
              <input [(ngModel)]="newWarehouse.name" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" placeholder="Ex: Armazém Principal">
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Morada</label>
              <input [(ngModel)]="newWarehouse.address" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" placeholder="Morada completa">
            </div>
            <div class="col-span-2 flex items-center gap-2">
              <input [(ngModel)]="newWarehouse.isDefault" type="checkbox" class="rounded border-gray-300">
              <label class="text-sm text-gray-700">Armazém padrão</label>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button (click)="createWarehouse()" class="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors">
              Criar e Selecionar
            </button>
            <button (click)="cancelNew()" class="px-4 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>

        <!-- Warehouses List -->
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Código</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Nome</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Morada</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Padrão</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let warehouse of filteredWarehouses"
                (click)="selectWarehouse(warehouse)"
                (dblclick)="selectWarehouse(warehouse); close.emit()"
                class="hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-200"
                [class.bg-blue-100]="warehouse.isDefault">
                <td class="px-4 py-2 font-medium text-blue-600">{{ warehouse.code }}</td>
                <td class="px-4 py-2">{{ warehouse.name }}</td>
                <td class="px-4 py-2 text-gray-600 text-xs">{{ warehouse.address }}</td>
                <td class="px-4 py-2 text-center">
                  <span *ngIf="warehouse.isDefault" class="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                </td>
              </tr>
              <tr *ngIf="filteredWarehouses.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-gray-400 italic">
                  Nenhum armazém encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center text-xs text-gray-600">
          <span>Total: {{ warehouses.length }} armazéns | Filtrados: {{ filteredWarehouses.length }}</span>
          <span class="text-gray-500">Duplo clique para selecionar e fechar</span>
        </div>
      </div>
    </div>
  `
})
export class WarehouseSearchModalComponent {
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();
    @Output() select = new EventEmitter<Warehouse>();

    warehouses: Warehouse[] = [];
    filteredWarehouses: Warehouse[] = [];
    searchTerm = '';
    showNewForm = false;

    newWarehouse: Warehouse = {
        id: '',
        code: '',
        name: '',
        address: '',
        isDefault: false,
        isActive: true
    };

    ngOnInit() {
        this.loadWarehouses();
    }

    ngOnChanges() {
        if (this.isOpen) {
            this.loadWarehouses();
            this.searchTerm = '';
            this.showNewForm = false;
        }
    }

    loadWarehouses() {
        const stored = localStorage.getItem('erp_warehouses');
        if (stored) {
            this.warehouses = JSON.parse(stored);
        } else {
            // Default warehouses
            this.warehouses = [
                { id: 'WH-001', code: 'ARM-01', name: 'Armazém Principal', address: 'Rua Principal, 123', isDefault: true, isActive: true },
                { id: 'WH-002', code: 'ARM-02', name: 'Armazém Secundário', address: 'Av. Industrial, 456', isDefault: false, isActive: true }
            ];
            this.saveWarehouses();
        }
        this.filterWarehouses();
    }

    filterWarehouses() {
        if (!this.searchTerm) {
            this.filteredWarehouses = [...this.warehouses].filter(w => w.isActive);
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredWarehouses = this.warehouses.filter(w =>
                w.isActive &&
                (w.code.toLowerCase().includes(term) ||
                    w.name.toLowerCase().includes(term) ||
                    w.address.toLowerCase().includes(term))
            );
        }
    }

    selectWarehouse(warehouse: Warehouse) {
        this.select.emit(warehouse);
    }

    createWarehouse() {
        if (!this.newWarehouse.code || !this.newWarehouse.name) {
            alert('Código e Nome são obrigatórios!');
            return;
        }

        // Check if code already exists
        if (this.warehouses.some(w => w.code === this.newWarehouse.code)) {
            alert('Já existe um armazém com este código!');
            return;
        }

        // If this is set as default, remove default from others
        if (this.newWarehouse.isDefault) {
            this.warehouses.forEach(w => w.isDefault = false);
        }

        this.newWarehouse.id = `WH-${Date.now()}`;
        this.warehouses.push({ ...this.newWarehouse });
        this.saveWarehouses();

        this.select.emit(this.newWarehouse);
        this.cancelNew();
        this.filterWarehouses();
    }

    cancelNew() {
        this.showNewForm = false;
        this.newWarehouse = {
            id: '',
            code: '',
            name: '',
            address: '',
            isDefault: false,
            isActive: true
        };
    }

    saveWarehouses() {
        localStorage.setItem('erp_warehouses', JSON.stringify(this.warehouses));
    }

    onBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            this.close.emit();
        }
    }
}
