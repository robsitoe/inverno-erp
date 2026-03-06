import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Location {
    id: string;
    code: string;
    description: string;
    warehouse: string;
    aisle: string;
    shelf: string;
    level: string;
    isActive: boolean;
}

@Component({
    selector: 'app-location-search-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-lg shadow-xl w-[800px] max-h-[600px] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[24px]">place</span>
            <h3 class="font-semibold text-lg">Selecionar Localização</h3>
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
              (ngModelChange)="filterLocations()"
              type="text"
              placeholder="Procurar por código ou descrição..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
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

        <!-- New Location Form -->
        <div *ngIf="showNewForm" class="p-4 bg-purple-50 border-b border-purple-200">
          <h4 class="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Nova Localização
          </h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input [(ngModel)]="newLocation.code" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500" placeholder="Ex: A-01-15">
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <input [(ngModel)]="newLocation.description" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500" placeholder="Corredor A - Prateleira 01 - Nível 15">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Corredor</label>
              <input [(ngModel)]="newLocation.aisle" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500" placeholder="A">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Prateleira</label>
              <input [(ngModel)]="newLocation.shelf" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500" placeholder="01">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nível</label>
              <input [(ngModel)]="newLocation.level" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500" placeholder="15">
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button (click)="createLocation()" class="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors">
              Criar e Selecionar
            </button>
            <button (click)="cancelNew()" class="px-4 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>

        <!-- Locations List -->
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Código</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Descrição</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Corredor</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Prateleira</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Nível</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let location of filteredLocations"
                (click)="selectLocation(location)"
                (dblclick)="selectLocation(location); close.emit()"
                class="hover:bg-purple-50 cursor-pointer transition-colors border-b border-gray-200">
                <td class="px-4 py-2 font-medium text-purple-600">{{ location.code }}</td>
                <td class="px-4 py-2">{{ location.description }}</td>
                <td class="px-4 py-2 text-center text-gray-600">{{ location.aisle }}</td>
                <td class="px-4 py-2 text-center text-gray-600">{{ location.shelf }}</td>
                <td class="px-4 py-2 text-center text-gray-600">{{ location.level }}</td>
              </tr>
              <tr *ngIf="filteredLocations.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-gray-400 italic">
                  Nenhuma localização encontrada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center text-xs text-gray-600">
          <span>Total: {{ locations.length }} localizações | Filtradas: {{ filteredLocations.length }}</span>
          <span class="text-gray-500">Duplo clique para selecionar e fechar</span>
        </div>
      </div>
    </div>
  `
})
export class LocationSearchModalComponent {
    @Input() isOpen = false;
    @Input() warehouseFilter = '';
    @Output() close = new EventEmitter<void>();
    @Output() select = new EventEmitter<Location>();

    locations: Location[] = [];
    filteredLocations: Location[] = [];
    searchTerm = '';
    showNewForm = false;

    newLocation: Location = {
        id: '',
        code: '',
        description: '',
        warehouse: '',
        aisle: '',
        shelf: '',
        level: '',
        isActive: true
    };

    ngOnInit() {
        this.loadLocations();
    }

    ngOnChanges() {
        if (this.isOpen) {
            this.loadLocations();
            this.searchTerm = '';
            this.showNewForm = false;
            this.newLocation.warehouse = this.warehouseFilter;
        }
    }

    loadLocations() {
        const stored = localStorage.getItem('erp_locations');
        if (stored) {
            this.locations = JSON.parse(stored);
        } else {
            // Default locations
            this.locations = [
                { id: 'LOC-001', code: 'A-01-15', description: 'Corredor A - Prateleira 01 - Nível 15', warehouse: 'ARM-01', aisle: 'A', shelf: '01', level: '15', isActive: true },
                { id: 'LOC-002', code: 'A-02-10', description: 'Corredor A - Prateleira 02 - Nível 10', warehouse: 'ARM-01', aisle: 'A', shelf: '02', level: '10', isActive: true },
                { id: 'LOC-003', code: 'B-01-05', description: 'Corredor B - Prateleira 01 - Nível 05', warehouse: 'ARM-01', aisle: 'B', shelf: '01', level: '05', isActive: true }
            ];
            this.saveLocations();
        }
        this.filterLocations();
    }

    filterLocations() {
        let filtered = this.locations.filter(l => l.isActive);

        // Filter by warehouse if specified
        if (this.warehouseFilter) {
            filtered = filtered.filter(l => l.warehouse === this.warehouseFilter);
        }

        // Filter by search term
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(l =>
                l.code.toLowerCase().includes(term) ||
                l.description.toLowerCase().includes(term) ||
                l.aisle.toLowerCase().includes(term) ||
                l.shelf.toLowerCase().includes(term) ||
                l.level.toLowerCase().includes(term)
            );
        }

        this.filteredLocations = filtered;
    }

    selectLocation(location: Location) {
        this.select.emit(location);
    }

    createLocation() {
        if (!this.newLocation.code) {
            alert('Código é obrigatório!');
            return;
        }

        // Check if code already exists
        if (this.locations.some(l => l.code === this.newLocation.code)) {
            alert('Já existe uma localização com este código!');
            return;
        }

        // Auto-generate description if not provided
        if (!this.newLocation.description && this.newLocation.aisle && this.newLocation.shelf && this.newLocation.level) {
            this.newLocation.description = `Corredor ${this.newLocation.aisle} - Prateleira ${this.newLocation.shelf} - Nível ${this.newLocation.level}`;
        }

        this.newLocation.id = `LOC-${Date.now()}`;
        this.newLocation.warehouse = this.warehouseFilter || '';
        this.locations.push({ ...this.newLocation });
        this.saveLocations();

        this.select.emit(this.newLocation);
        this.cancelNew();
        this.filterLocations();
    }

    cancelNew() {
        this.showNewForm = false;
        this.newLocation = {
            id: '',
            code: '',
            description: '',
            warehouse: this.warehouseFilter || '',
            aisle: '',
            shelf: '',
            level: '',
            isActive: true
        };
    }

    saveLocations() {
        localStorage.setItem('erp_locations', JSON.stringify(this.locations));
    }

    onBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            this.close.emit();
        }
    }
}
