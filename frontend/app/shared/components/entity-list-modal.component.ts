import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../customer.service';
import { AccountingService } from '../accounting.service';
import { Customer, Account } from '../models';

@Component({
  selector: 'app-entity-list-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="onClose()">
      <div class="bg-white rounded-sm shadow-lg w-[900px] max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h3 class="text-sm font-medium text-gray-700">Lista de Entidades (Clientes)</h3>
          <button (click)="onClose()" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="px-3 py-2 border-b border-gray-200 bg-white flex gap-2">
          <div class="relative flex-1">
            <input 
              type="text"
              [value]="searchQuery"
              (input)="onSearchChange($event)"
              placeholder="Pesquisar por nome, NIF ou morada..."
              class="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          </div>
        </div>

        <!-- List -->
        <div class="overflow-y-auto p-1 flex-1">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-gray-50 text-gray-600 font-medium sticky top-0 z-10">
              <tr>
                <th class="px-2 py-1 text-left border-b w-20">Código</th>
                <th class="px-2 py-1 text-left border-b">Nome</th>
                <th class="px-2 py-1 text-left border-b w-24">NIF</th>
                <th class="px-2 py-1 text-left border-b">Conta Contábil</th>
                <th class="px-2 py-1 text-center border-b w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let entity of filteredEntities" 
                  class="hover:bg-blue-50 transition-colors border-b border-gray-100">
                <td class="px-2 py-1.5 font-medium text-blue-600 cursor-pointer" (click)="onSelect(entity)">{{ entity.code }}</td>
                <td class="px-2 py-1.5 text-gray-700 cursor-pointer" (click)="onSelect(entity)">{{ entity.name }}</td>
                <td class="px-2 py-1.5 text-gray-600 cursor-pointer" (click)="onSelect(entity)">{{ entity.nif }}</td>
                <td class="px-2 py-1.5">
                    <div *ngIf="editingId !== entity.id" class="text-gray-600 flex items-center gap-1">
                        <span class="font-mono bg-gray-100 px-1 rounded">{{ getAccountCode(entity.receivableAccountId) }}</span>
                        <span class="truncate max-w-[150px]">{{ getAccountName(entity.receivableAccountId) }}</span>
                    </div>
                    <select *ngIf="editingId === entity.id" 
                            [(ngModel)]="tempAccountId"
                            class="w-full border border-blue-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none">
                        <option *ngFor="let acc of availableAccounts" [value]="acc.id">
                            {{ acc.code }} - {{ acc.name }}
                        </option>
                    </select>
                </td>
                <td class="px-2 py-1.5 text-center">
                    <button *ngIf="editingId !== entity.id" (click)="startEdit(entity)" class="text-gray-500 hover:text-blue-600" title="Editar Conta">
                        <span class="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <div *ngIf="editingId === entity.id" class="flex justify-center gap-1">
                        <button (click)="saveEdit(entity)" class="text-green-600 hover:text-green-800" title="Salvar">
                            <span class="material-symbols-outlined text-[16px]">check</span>
                        </button>
                        <button (click)="cancelEdit()" class="text-red-500 hover:text-red-700" title="Cancelar">
                            <span class="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                </td>
              </tr>
              <tr *ngIf="filteredEntities.length === 0">
                <td colspan="5" class="px-2 py-4 text-center text-gray-400 italic">
                  Nenhuma entidade encontrada
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <span class="text-xs text-gray-500">{{ filteredEntities.length }} entidade(s) encontrada(s)</span>
          <button (click)="onClose()" class="px-3 py-1 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `
})
export class EntityListModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<any>();

  entities: Customer[] = [];
  filteredEntities: Customer[] = [];
  searchQuery = '';

  availableAccounts: Account[] = [];
  editingId: string | null = null;
  tempAccountId: string = '';

  constructor(
    private customerService: CustomerService,
    private accountingService: AccountingService
  ) { }

  ngOnInit() {
    this.entities = this.customerService.getCustomers();
    this.filteredEntities = this.entities;

    // Load accounts that are Assets (Receivable) - usually class 21
    // For simplicity, loading all analytic accounts or filtering by code starts with '21'
    this.availableAccounts = this.accountingService.getAccounts()
      .filter(a => a.allowPosting && (a.code.startsWith('21') || a.type === 'ASSET'))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredEntities = this.entities;
      return;
    }

    this.filteredEntities = this.entities.filter(entity =>
      entity.name.toLowerCase().includes(query) ||
      entity.nif.toLowerCase().includes(query) ||
      entity.address.toLowerCase().includes(query) ||
      entity.code.toLowerCase().includes(query)
    );
  }

  getAccountCode(id: string): string {
    const acc = this.availableAccounts.find(a => a.id === id);
    return acc ? acc.code : id;
  }

  getAccountName(id: string): string {
    const acc = this.availableAccounts.find(a => a.id === id);
    return acc ? acc.name : 'Conta não encontrada';
  }

  startEdit(entity: Customer) {
    this.editingId = entity.id;
    this.tempAccountId = entity.receivableAccountId;
  }

  saveEdit(entity: Customer) {
    if (this.tempAccountId) {
      entity.receivableAccountId = this.tempAccountId;
      this.customerService.updateCustomer(entity);
      this.editingId = null;
    }
  }

  cancelEdit() {
    this.editingId = null;
  }

  onClose() {
    this.close.emit();
  }

  onSelect(entity: any) {
    if (this.editingId) return; // Prevent selection while editing
    this.select.emit(entity);
  }
}
