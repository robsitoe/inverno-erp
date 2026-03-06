import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TaxRate {
    id: string;
    code: string;
    description: string;
    rate: number;
    isDefault: boolean;
    isActive: boolean;
}

@Component({
    selector: 'app-tax-search-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-lg shadow-xl w-[700px] max-h-[600px] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[24px]">receipt_long</span>
            <h3 class="font-semibold text-lg">Selecionar Taxa IVA</h3>
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
              (ngModelChange)="filterTaxes()"
              type="text"
              placeholder="Procurar por código ou descrição..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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

        <!-- New Tax Form -->
        <div *ngIf="showNewForm" class="p-4 bg-green-50 border-b border-green-200">
          <h4 class="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Nova Taxa IVA
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input [(ngModel)]="newTax.code" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500" placeholder="Ex: 23">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Taxa (%) *</label>
              <input [(ngModel)]="newTax.rate" type="number" step="0.01" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500" placeholder="23.00">
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Descrição *</label>
              <input [(ngModel)]="newTax.description" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500" placeholder="IVA à taxa de 23%">
            </div>
            <div class="col-span-2 flex items-center gap-2">
              <input [(ngModel)]="newTax.isDefault" type="checkbox" class="rounded border-gray-300">
              <label class="text-sm text-gray-700">Taxa padrão</label>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button (click)="createTax()" class="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors">
              Criar e Selecionar
            </button>
            <button (click)="cancelNew()" class="px-4 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>

        <!-- Tax Rates List -->
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Código</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Descrição</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">Taxa (%)</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Padrão</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let tax of filteredTaxes"
                (click)="selectTax(tax)"
                (dblclick)="selectTax(tax); close.emit()"
                class="hover:bg-green-50 cursor-pointer transition-colors border-b border-gray-200"
                [class.bg-green-100]="tax.isDefault">
                <td class="px-4 py-2 font-medium text-green-600">{{ tax.code }}</td>
                <td class="px-4 py-2">{{ tax.description }}</td>
                <td class="px-4 py-2 text-right font-semibold">{{ tax.rate | number:'1.2-2' }}%</td>
                <td class="px-4 py-2 text-center">
                  <span *ngIf="tax.isDefault" class="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                </td>
              </tr>
              <tr *ngIf="filteredTaxes.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-gray-400 italic">
                  Nenhuma taxa encontrada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center text-xs text-gray-600">
          <span>Total: {{ taxes.length }} taxas | Filtradas: {{ filteredTaxes.length }}</span>
          <span class="text-gray-500">Duplo clique para selecionar e fechar</span>
        </div>
      </div>
    </div>
  `
})
export class TaxSearchModalComponent {
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();
    @Output() select = new EventEmitter<TaxRate>();

    taxes: TaxRate[] = [];
    filteredTaxes: TaxRate[] = [];
    searchTerm = '';
    showNewForm = false;

    newTax: TaxRate = {
        id: '',
        code: '',
        description: '',
        rate: 0,
        isDefault: false,
        isActive: true
    };

    ngOnInit() {
        this.loadTaxes();
    }

    ngOnChanges() {
        if (this.isOpen) {
            this.loadTaxes();
            this.searchTerm = '';
            this.showNewForm = false;
        }
    }

    loadTaxes() {
        const stored = localStorage.getItem('erp_tax_rates');
        if (stored) {
            this.taxes = JSON.parse(stored);
        } else {
            // Default Mozambique tax rates
            this.taxes = [
                { id: 'TAX-001', code: '00', description: 'Regime de isenção', rate: 0, isDefault: false, isActive: true },
                { id: 'TAX-002', code: '01', description: 'Isento (artº18)', rate: 0, isDefault: false, isActive: true },
                { id: 'TAX-003', code: '16', description: 'IVA à taxa de 16%', rate: 16, isDefault: true, isActive: true },
                { id: 'TAX-004', code: '17', description: 'IVA à taxa de 17%', rate: 17, isDefault: false, isActive: true },
                { id: 'TAX-005', code: 'BS', description: 'Bens em segunda mão', rate: 17, isDefault: false, isActive: true },
                { id: 'TAX-006', code: 'OA', description: 'Objectos de arte', rate: 17, isDefault: false, isActive: true }
            ];
            this.saveTaxes();
        }
        this.filterTaxes();
    }

    filterTaxes() {
        if (!this.searchTerm) {
            this.filteredTaxes = [...this.taxes].filter(t => t.isActive);
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredTaxes = this.taxes.filter(t =>
                t.isActive &&
                (t.code.toLowerCase().includes(term) ||
                    t.description.toLowerCase().includes(term) ||
                    t.rate.toString().includes(term))
            );
        }
    }

    selectTax(tax: TaxRate) {
        this.select.emit(tax);
    }

    createTax() {
        if (!this.newTax.code || !this.newTax.description) {
            alert('Código e Descrição são obrigatórios!');
            return;
        }

        if (this.newTax.rate < 0 || this.newTax.rate > 100) {
            alert('Taxa deve estar entre 0 e 100!');
            return;
        }

        // Check if code already exists
        if (this.taxes.some(t => t.code === this.newTax.code)) {
            alert('Já existe uma taxa com este código!');
            return;
        }

        // If this is set as default, remove default from others
        if (this.newTax.isDefault) {
            this.taxes.forEach(t => t.isDefault = false);
        }

        this.newTax.id = `TAX-${Date.now()}`;
        this.taxes.push({ ...this.newTax });
        this.saveTaxes();

        this.select.emit(this.newTax);
        this.cancelNew();
        this.filterTaxes();
    }

    cancelNew() {
        this.showNewForm = false;
        this.newTax = {
            id: '',
            code: '',
            description: '',
            rate: 0,
            isDefault: false,
            isActive: true
        };
    }

    saveTaxes() {
        localStorage.setItem('erp_tax_rates', JSON.stringify(this.taxes));
    }

    onBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            this.close.emit();
        }
    }
}
