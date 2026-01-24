import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Batch {
    id: string;
    code: string;
    description: string;
    articleCode: string;
    expiryDate?: string;
    manufactureDate?: string;
    quantity?: number;
    isActive: boolean;
}

@Component({
    selector: 'app-batch-search-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-lg shadow-xl w-[900px] max-h-[600px] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[24px]">qr_code_2</span>
            <h3 class="font-semibold text-lg">Selecionar Lote</h3>
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
              (ngModelChange)="filterBatches()"
              type="text"
              placeholder="Procurar por código ou descrição..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
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

        <!-- New Batch Form -->
        <div *ngIf="showNewForm" class="p-4 bg-orange-50 border-b border-orange-200">
          <h4 class="font-semibold text-orange-900 mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Novo Lote
          </h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input [(ngModel)]="newBatch.code" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-orange-500" placeholder="Ex: LOTE-2025-001">
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <input [(ngModel)]="newBatch.description" type="text" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-orange-500" placeholder="Descrição do lote">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Data Fabrico</label>
              <input [(ngModel)]="newBatch.manufactureDate" type="date" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-orange-500">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Data Validade</label>
              <input [(ngModel)]="newBatch.expiryDate" type="date" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-orange-500">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
              <input [(ngModel)]="newBatch.quantity" type="number" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-orange-500" placeholder="0">
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button (click)="createBatch()" class="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors">
              Criar e Selecionar
            </button>
            <button (click)="cancelNew()" class="px-4 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>

        <!-- Batches List -->
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Código</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Descrição</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Data Fabrico</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Data Validade</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">Quantidade</th>
                <th class="px-4 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let batch of filteredBatches"
                (click)="selectBatch(batch)"
                (dblclick)="selectBatch(batch); close.emit()"
                class="hover:bg-orange-50 cursor-pointer transition-colors border-b border-gray-200"
                [class.bg-red-50]="isExpired(batch)"
                [class.bg-yellow-50]="isExpiringSoon(batch)">
                <td class="px-4 py-2 font-medium text-orange-600">{{ batch.code }}</td>
                <td class="px-4 py-2">{{ batch.description }}</td>
                <td class="px-4 py-2 text-center text-gray-600 text-xs">{{ batch.manufactureDate ? (batch.manufactureDate | date:'dd/MM/yyyy') : '-' }}</td>
                <td class="px-4 py-2 text-center text-xs" [class.text-red-600]="isExpired(batch)" [class.text-yellow-600]="isExpiringSoon(batch)">
                  {{ batch.expiryDate ? (batch.expiryDate | date:'dd/MM/yyyy') : '-' }}
                </td>
                <td class="px-4 py-2 text-right text-gray-600">{{ batch.quantity || '-' }}</td>
                <td class="px-4 py-2 text-center">
                  <span *ngIf="isExpired(batch)" class="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-semibold">EXPIRADO</span>
                  <span *ngIf="!isExpired(batch) && isExpiringSoon(batch)" class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-semibold">A EXPIRAR</span>
                  <span *ngIf="!isExpired(batch) && !isExpiringSoon(batch)" class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-semibold">VÁLIDO</span>
                </td>
              </tr>
              <tr *ngIf="filteredBatches.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-400 italic">
                  Nenhum lote encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center text-xs text-gray-600">
          <span>Total: {{ batches.length }} lotes | Filtrados: {{ filteredBatches.length }}</span>
          <span class="text-gray-500">Duplo clique para selecionar e fechar</span>
        </div>
      </div>
    </div>
  `
})
export class BatchSearchModalComponent {
    @Input() isOpen = false;
    @Input() articleFilter = '';
    @Output() close = new EventEmitter<void>();
    @Output() select = new EventEmitter<Batch>();

    batches: Batch[] = [];
    filteredBatches: Batch[] = [];
    searchTerm = '';
    showNewForm = false;

    newBatch: Batch = {
        id: '',
        code: '',
        description: '',
        articleCode: '',
        expiryDate: '',
        manufactureDate: '',
        quantity: 0,
        isActive: true
    };

    ngOnInit() {
        this.loadBatches();
    }

    ngOnChanges() {
        if (this.isOpen) {
            this.loadBatches();
            this.searchTerm = '';
            this.showNewForm = false;
            this.newBatch.articleCode = this.articleFilter;
        }
    }

    loadBatches() {
        const stored = localStorage.getItem('erp_batches');
        if (stored) {
            this.batches = JSON.parse(stored);
        } else {
            // Default batches
            const today = new Date();
            const futureDate = new Date(today.setMonth(today.getMonth() + 6));
            this.batches = [
                {
                    id: 'BAT-001',
                    code: 'LOTE-2025-001',
                    description: 'Lote Janeiro 2025',
                    articleCode: '',
                    manufactureDate: '2025-01-01',
                    expiryDate: futureDate.toISOString().split('T')[0],
                    quantity: 1000,
                    isActive: true
                }
            ];
            this.saveBatches();
        }
        this.filterBatches();
    }

    filterBatches() {
        let filtered = this.batches.filter(b => b.isActive);

        // Filter by article if specified
        if (this.articleFilter) {
            filtered = filtered.filter(b => b.articleCode === this.articleFilter);
        }

        // Filter by search term
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(b =>
                b.code.toLowerCase().includes(term) ||
                b.description.toLowerCase().includes(term)
            );
        }

        this.filteredBatches = filtered;
    }

    selectBatch(batch: Batch) {
        this.select.emit(batch);
    }

    createBatch() {
        if (!this.newBatch.code) {
            alert('Código é obrigatório!');
            return;
        }

        // Check if code already exists
        if (this.batches.some(b => b.code === this.newBatch.code)) {
            alert('Já existe um lote com este código!');
            return;
        }

        this.newBatch.id = `BAT-${Date.now()}`;
        this.newBatch.articleCode = this.articleFilter || '';
        this.batches.push({ ...this.newBatch });
        this.saveBatches();

        this.select.emit(this.newBatch);
        this.cancelNew();
        this.filterBatches();
    }

    cancelNew() {
        this.showNewForm = false;
        this.newBatch = {
            id: '',
            code: '',
            description: '',
            articleCode: this.articleFilter || '',
            expiryDate: '',
            manufactureDate: '',
            quantity: 0,
            isActive: true
        };
    }

    saveBatches() {
        localStorage.setItem('erp_batches', JSON.stringify(this.batches));
    }

    isExpired(batch: Batch): boolean {
        if (!batch.expiryDate) return false;
        return new Date(batch.expiryDate) < new Date();
    }

    isExpiringSoon(batch: Batch): boolean {
        if (!batch.expiryDate) return false;
        const expiryDate = new Date(batch.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30; // Expiring in 30 days
    }

    onBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            this.close.emit();
        }
    }
}
