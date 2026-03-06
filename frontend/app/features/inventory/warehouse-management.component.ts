import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';

interface Warehouse {
    id: string;
    code: string;
    name: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
    fax: string;
    options: string;
    isGAR: boolean;
    apaCode: string;
    remittanceType: string;
    pglNumber: string;
    blockedForEntry: boolean;
    blockedForExit: boolean;
    isDefault: boolean;
}

@Component({
    selector: 'app-warehouse-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="saveWarehouse()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">save</span>
          <span>Gravar</span>
        </button>
        <button (click)="newWarehouse()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Novo</span>
        </button>
        <button (click)="deleteWarehouse()" [disabled]="!currentWarehouse.id" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs disabled:opacity-50">
          <span class="material-symbols-outlined text-[18px]">delete</span>
          <span>Anular</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">list</span>
          <span>Listar</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">settings</span>
          <span>Contexto</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">help</span>
          <span>Ajuda</span>
        </button>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">close</span>
          <span>Cancelar</span>
        </button>
      </div>

      <!-- Form Content -->
      <div class="flex-1 overflow-auto p-4">
        <div class="bg-white border border-gray-300 rounded shadow-sm max-w-2xl mx-auto">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">warehouse</span>
            <h2 class="font-semibold text-sm">Armazém</h2>
          </div>

          <!-- Form Fields -->
          <div class="p-4 space-y-3">
            <!-- Armazém -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-700 w-24">Armazém:</label>
              <div class="flex gap-1 flex-1">
                <input 
                  type="text" 
                  [(ngModel)]="currentWarehouse.code"
                  class="w-32 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Código"
                />
                <button class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-xs">
                  <span class="material-symbols-outlined text-[14px]">search</span>
                </button>
              </div>
            </div>

            <!-- Endereço -->
            <div class="flex items-start gap-2">
              <label class="text-xs font-medium text-gray-700 w-24 pt-1">Endereço:</label>
              <div class="flex-1 space-y-2">
                <input 
                  type="text" 
                  [(ngModel)]="currentWarehouse.name"
                  class="w-full px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Nome do armazém"
                />
                <input 
                  type="text" 
                  [(ngModel)]="currentWarehouse.address"
                  class="w-full px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Morada"
                />
                <div class="flex gap-2">
                  <input 
                    type="text" 
                    [(ngModel)]="currentWarehouse.postalCode"
                    class="w-32 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="Cód. Postal"
                  />
                  <button class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-xs">
                    <span class="material-symbols-outlined text-[14px]">search</span>
                  </button>
                  <input 
                    type="text" 
                    [(ngModel)]="currentWarehouse.city"
                    class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="Localidade"
                  />
                  <button class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 text-xs">
                    <span class="material-symbols-outlined text-[14px]">search</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Telefone / Fax -->
            <div class="flex gap-4">
              <div class="flex items-center gap-2 flex-1">
                <label class="text-xs font-medium text-gray-700 w-24">Telefone:</label>
                <input 
                  type="text" 
                  [(ngModel)]="currentWarehouse.phone"
                  class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div class="flex items-center gap-2 flex-1">
                <label class="text-xs font-medium text-gray-700 w-16">Fax:</label>
                <input 
                  type="text" 
                  [(ngModel)]="currentWarehouse.fax"
                  class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <!-- Opções -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-700 w-24">Opções:</label>
              <input 
                type="text" 
                [(ngModel)]="currentWarehouse.options"
                class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <!-- Bloqueios -->
            <div class="flex gap-4 pl-24">
              <label class="flex items-center gap-2 text-xs text-gray-700">
                <input 
                  type="checkbox" 
                  [(ngModel)]="currentWarehouse.blockedForEntry"
                  class="rounded border-gray-300"
                />
                <span>Bloqueado para entradas</span>
              </label>
              <label class="flex items-center gap-2 text-xs text-gray-700">
                <input 
                  type="checkbox" 
                  [(ngModel)]="currentWarehouse.blockedForExit"
                  class="rounded border-gray-300"
                />
                <span>Bloqueado para saídas</span>
              </label>
            </div>

            <!-- e-GAR Section -->
            <div class="border-t border-gray-300 pt-3 mt-3">
              <div class="flex gap-4">
                <div class="flex-1 space-y-2">
                  <div class="flex items-center gap-2">
                    <label class="text-xs font-medium text-gray-700 w-24">e-GAR</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-xs font-medium text-gray-700 w-24">Código APA:</label>
                    <input 
                      type="text" 
                      [(ngModel)]="currentWarehouse.apaCode"
                      class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-xs font-medium text-gray-700 w-24">Tipo Remitente:</label>
                    <select 
                      [(ngModel)]="currentWarehouse.remittanceType"
                      class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="PRODUTOR">Produtor</option>
                      <option value="DISTRIBUIDOR">Distribuidor</option>
                      <option value="RETALHISTA">Retalhista</option>
                    </select>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-xs font-medium text-gray-700 w-24">Número PGL:</label>
                    <input 
                      type="text" 
                      [(ngModel)]="currentWarehouse.pglNumber"
                      class="flex-1 px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Default Warehouse -->
            <div class="border-t border-gray-300 pt-3 mt-3">
              <label class="flex items-center gap-2 text-xs text-gray-700">
                <input 
                  type="checkbox" 
                  [(ngModel)]="currentWarehouse.isDefault"
                  class="rounded border-gray-300"
                />
                <span class="font-medium">Armazém Padrão</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="px-3 py-1.5 bg-[#DCE4F2] border-t border-gray-300 shrink-0 flex justify-between items-center text-xs">
        <span class="text-gray-600">{{ warehouses.length }} armazém(ns) cadastrado(s)</span>
        <span class="text-gray-600" *ngIf="currentWarehouse.id">ID: {{ currentWarehouse.id }}</span>
      </div>
    </div>
  `
})
export class WarehouseManagementComponent implements OnInit {
    warehouses: Warehouse[] = [];
    currentWarehouse: Warehouse = this.getEmptyWarehouse();

    constructor(private inventoryService: InventoryService) { }

    ngOnInit() {
        this.loadWarehouses();
        if (this.warehouses.length === 0) {
            this.newWarehouse();
        } else {
            this.currentWarehouse = { ...this.warehouses[0] };
        }
    }

    getEmptyWarehouse(): Warehouse {
        return {
            id: '',
            code: '',
            name: '',
            address: '',
            city: '',
            postalCode: '',
            phone: '',
            fax: '',
            options: '',
            isGAR: false,
            apaCode: '',
            remittanceType: '',
            pglNumber: '',
            blockedForEntry: false,
            blockedForExit: false,
            isDefault: false
        };
    }

    loadWarehouses() {
        const stored = localStorage.getItem('erp_warehouses');
        if (stored) {
            this.warehouses = JSON.parse(stored);
        }
    }

    newWarehouse() {
        this.currentWarehouse = this.getEmptyWarehouse();
        // Auto-generate code
        const nextNumber = this.warehouses.length + 1;
        this.currentWarehouse.code = `ARM${nextNumber.toString().padStart(2, '0')}`;
    }

    saveWarehouse() {
        if (!this.currentWarehouse.code || !this.currentWarehouse.name) {
            alert('Preencha o código e nome do armazém.');
            return;
        }

        // If setting as default, remove default from others
        if (this.currentWarehouse.isDefault) {
            this.warehouses.forEach(w => w.isDefault = false);
        }

        if (this.currentWarehouse.id) {
            // Update existing
            const index = this.warehouses.findIndex(w => w.id === this.currentWarehouse.id);
            if (index !== -1) {
                this.warehouses[index] = { ...this.currentWarehouse };
            }
        } else {
            // Create new
            this.currentWarehouse.id = `WH${Date.now()}`;
            this.warehouses.push({ ...this.currentWarehouse });
        }

        localStorage.setItem('erp_warehouses', JSON.stringify(this.warehouses));
        alert('Armazém gravado com sucesso!');
        this.loadWarehouses();
    }

    deleteWarehouse() {
        if (!this.currentWarehouse.id) return;

        if (confirm(`Tem certeza que deseja eliminar o armazém ${this.currentWarehouse.code}?`)) {
            this.warehouses = this.warehouses.filter(w => w.id !== this.currentWarehouse.id);
            localStorage.setItem('erp_warehouses', JSON.stringify(this.warehouses));
            alert('Armazém eliminado com sucesso!');
            this.loadWarehouses();
            this.newWarehouse();
        }
    }
}
