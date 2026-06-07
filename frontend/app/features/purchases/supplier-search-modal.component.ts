import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplierService } from '../../shared/supplier.service';
import { Supplier } from '../../shared/models';

@Component({
  selector: 'app-supplier-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="close.emit()">
      <div class="bg-white w-[800px] shadow-lg rounded-sm flex flex-col max-h-[90vh]" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-300">
          <h2 class="text-sm font-semibold text-gray-700">Selecionar Fornecedor</h2>
          <button (click)="close.emit()" class="text-gray-500 hover:text-red-600">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="p-2 bg-gray-50 border-b border-gray-300 flex gap-2">
          <div class="relative flex-1">
            <span class="material-symbols-outlined absolute left-2 top-1.5 text-gray-400 text-lg">search</span>
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              (ngModelChange)="filterSuppliers()"
              class="w-full pl-8 pr-2 py-1 border border-gray-300 rounded-sm text-xs focus:outline-none focus:border-blue-500"
              placeholder="Pesquisar por código, nome ou NIF..."
              autofocus
            />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-2">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="border border-gray-300 px-2 py-1 text-left w-24">Código</th>
                <th class="border border-gray-300 px-2 py-1 text-left">Nome</th>
                <th class="border border-gray-300 px-2 py-1 text-left w-32">NIF</th>
                <th class="border border-gray-300 px-2 py-1 text-left">Morada</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let supplier of filteredSuppliers" 
                  class="hover:bg-blue-50 cursor-pointer"
                  (click)="select.emit(supplier)">
                <td class="border border-gray-300 px-2 py-1 font-medium">{{ supplier.code }}</td>
                <td class="border border-gray-300 px-2 py-1">{{ supplier.name }}</td>
                <td class="border border-gray-300 px-2 py-1">{{ supplier.nif }}</td>
                <td class="border border-gray-300 px-2 py-1 text-gray-500 truncate max-w-[200px]">{{ supplier.address }}</td>
              </tr>
              <tr *ngIf="filteredSuppliers.length === 0">
                <td colspan="4" class="p-4 text-center text-gray-500 italic">
                  Nenhum fornecedor encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-2 border-t border-gray-300 bg-gray-50 flex justify-between items-center">
          <div class="text-xs text-gray-500">
            {{ filteredSuppliers.length }} registos encontrados.
          </div>
          <div class="flex gap-2">
            <button (click)="ngOnInit()" class="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm text-xs flex items-center gap-1" title="Atualizar Lista">
              <span class="material-symbols-outlined text-[14px]">refresh</span>
              Atualizar
            </button>
            <button (click)="close.emit()" class="px-4 py-1 bg-gray-200 hover:bg-gray-300 border border-gray-400 rounded-sm text-xs">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SupplierSearchModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<Supplier>();

  searchTerm = '';
  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];

  constructor(private supplierService: SupplierService) { }

  ngOnInit() {
    this.suppliers = this.supplierService.getSuppliers();
    this.filteredSuppliers = [...this.suppliers];
    if (!this.suppliers.length) {
      this.supplierService.loadSuppliers().then(() => { this.suppliers = this.supplierService.getSuppliers(); this.filterSuppliers(); });
    }
  }

  filterSuppliers() {
    const term = this.searchTerm.toLowerCase();
    this.filteredSuppliers = this.suppliers.filter(s =>
      s.code.toLowerCase().includes(term) ||
      s.name.toLowerCase().includes(term) ||
      s.nif.includes(term)
    );
  }
}
