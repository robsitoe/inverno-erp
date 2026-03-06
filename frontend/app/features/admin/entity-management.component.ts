import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../shared/customer.service';
import { SupplierService } from '../../shared/supplier.service';
import { AccountingService } from '../../shared/accounting.service';
import { Customer, Supplier, Account } from '../../shared/models';

type EntityType = 'CUSTOMER' | 'SUPPLIER';

@Component({
  selector: 'app-entity-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="newEntity()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Novo</span>
        </button>
        <button (click)="saveEntity()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">save</span>
          <span>Gravar</span>
        </button>
        <button (click)="deleteEntity()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">delete</span>
          <span>Eliminar</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">search</span>
          <span>Procurar</span>
        </button>
      </div>

      <!-- Main Content -->
      <div class="flex flex-1 overflow-hidden">
        <!-- List (Left Panel) -->
        <div class="w-80 border-r border-gray-300 bg-white flex flex-col">
          <!-- Search -->
          <div class="p-2 border-b border-gray-200">
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              (ngModelChange)="filterEntities()"
              [placeholder]="'Procurar ' + (type === 'CUSTOMER' ? 'cliente' : 'fornecedor') + '...'"
              class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <!-- List -->
          <div class="flex-1 overflow-auto">
            <div 
              *ngFor="let entity of filteredEntities"
              (click)="selectEntity(entity)"
              [class.bg-blue-50]="selectedEntity?.id === entity.id"
              [class.border-l-4]="selectedEntity?.id === entity.id"
              [class.border-l-blue-600]="selectedEntity?.id === entity.id"
              class="p-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div class="font-medium text-xs text-gray-800">{{ entity.code }}</div>
              <div class="text-xs text-gray-600 truncate">{{ entity.name }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ entity.nif }}</div>
            </div>
          </div>
        </div>

        <!-- Details (Right Panel) -->
        <div class="flex-1 overflow-auto p-4 bg-[#F0F0F0]">
          <div *ngIf="selectedEntity" class="max-w-4xl">
            <!-- Tabs -->
            <div class="flex border-b border-gray-300 mb-4">
              <button 
                *ngFor="let tab of tabs; let i = index"
                (click)="activeTab = i"
                [class.bg-white]="activeTab === i"
                [class.border-t-2]="activeTab === i"
                [class.border-t-blue-600]="activeTab === i"
                [class.bg-gray-100]="activeTab !== i"
                class="px-4 py-2 text-xs font-medium border-r border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {{ tab }}
              </button>
            </div>

            <!-- Tab Content: Geral -->
            <div *ngIf="activeTab === 0" class="bg-white p-4 rounded shadow-sm space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <!-- Código -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Código *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedEntity.code"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Nome -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedEntity.name"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- NIF -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">NIF</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedEntity.nif"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Morada -->
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Morada</label>
                  <textarea 
                    [(ngModel)]="selectedEntity.address"
                    rows="2"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  ></textarea>
                </div>

                <!-- Cidade -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedEntity.city"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Código Postal -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Código Postal</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedEntity.postalCode"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- País -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">País</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedEntity.country"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Telefone -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                  <input 
                    type="text" 
                    [(ngModel)]="selectedEntity.phone"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Email -->
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    [(ngModel)]="selectedEntity.email"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <!-- Tab Content: Financeiro -->
            <div *ngIf="activeTab === 1" class="bg-white p-4 rounded shadow-sm space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <!-- Prazo de Pagamento -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Prazo de Pagamento (Dias)</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedEntity.paymentTerms"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Limite de Crédito -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Limite de Crédito</label>
                  <input 
                    type="number" 
                    [(ngModel)]="selectedEntity.creditLimit"
                    step="0.01"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Conta Contábil -->
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    {{ type === 'CUSTOMER' ? 'Conta de Cliente' : 'Conta de Fornecedor' }}
                  </label>
                  <select 
                    [ngModel]="type === 'CUSTOMER' ? selectedEntity.receivableAccountId : selectedEntity.payableAccountId"
                    (ngModelChange)="updateAccount($event)"
                    class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione uma conta...</option>
                    <option *ngFor="let acc of availableAccounts" [value]="acc.id">
                      {{ acc.code }} - {{ acc.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!selectedEntity" class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <span class="material-symbols-outlined text-6xl mb-2">
                {{ type === 'CUSTOMER' ? 'person' : 'local_shipping' }}
              </span>
              <p class="text-sm">Selecione um {{ type === 'CUSTOMER' ? 'cliente' : 'fornecedor' }} para ver os detalhes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EntityManagementComponent implements OnInit, OnChanges {
  @Input() viewMode: 'customer-management' | 'supplier-management' = 'customer-management';

  type: EntityType = 'CUSTOMER';
  entities: any[] = [];
  filteredEntities: any[] = [];
  selectedEntity: any | null = null;
  searchTerm = '';
  activeTab = 0;
  tabs = ['Geral', 'Financeiro'];
  availableAccounts: Account[] = [];

  constructor(
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private accountingService: AccountingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.updateType();
    this.loadEntities();
    this.loadAccounts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['viewMode']) {
      this.updateType();
      this.loadEntities();
      this.loadAccounts();
      this.selectedEntity = null;
    }
  }

  updateType() {
    this.type = this.viewMode === 'customer-management' ? 'CUSTOMER' : 'SUPPLIER';
  }

  async loadEntities() {
    if (this.type === 'CUSTOMER') {
      await this.customerService.loadCustomers();
      this.entities = this.customerService.getCustomers();
    } else {
      await this.supplierService.loadSuppliers();
      this.entities = this.supplierService.getSuppliers();
    }
    this.filterEntities();
    this.cdr.detectChanges();
  }

  loadAccounts() {
    const allAccounts = this.accountingService.getAccounts();
    if (this.type === 'CUSTOMER') {
      // Load Asset accounts (Class 21 usually)
      this.availableAccounts = allAccounts
        .filter(a => a.allowPosting && (a.code.startsWith('21') || a.type === 'ASSET'))
        .sort((a, b) => a.code.localeCompare(b.code));
    } else {
      // Load Liability accounts (Class 22 usually)
      this.availableAccounts = allAccounts
        .filter(a => a.allowPosting && (a.code.startsWith('22') || a.type === 'LIABILITY'))
        .sort((a, b) => a.code.localeCompare(b.code));
    }
  }

  filterEntities() {
    if (!this.searchTerm) {
      this.filteredEntities = [...this.entities];
      return;
    }

    const query = this.searchTerm.toLowerCase();
    this.filteredEntities = this.entities.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.code.toLowerCase().includes(query) ||
      e.nif.includes(query)
    );
  }

  selectEntity(entity: any) {
    this.selectedEntity = { ...entity }; // Clone to avoid direct mutation
    this.activeTab = 0;
  }

  newEntity() {
    const newCode = this.generateNextCode();

    const baseEntity = {
      id: `NEW_${Date.now()}`,
      code: newCode,
      name: 'Nova Entidade',
      nif: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'PT',
      phone: '',
      email: '',
      paymentTerms: 30,
      creditLimit: 0,
      currentBalance: 0,
      isActive: true
    };

    if (this.type === 'CUSTOMER') {
      this.selectedEntity = {
        ...baseEntity,
        receivableAccountId: ''
      };
    } else {
      this.selectedEntity = {
        ...baseEntity,
        payableAccountId: ''
      };
    }

    this.activeTab = 0;
  }

  generateNextCode(): string {
    const prefix = this.type === 'CUSTOMER' ? 'C' : 'F';
    const maxCode = this.entities
      .filter(e => e.code.startsWith(prefix))
      .map(e => parseInt(e.code.substring(1)) || 0)
      .reduce((max, current) => Math.max(max, current), 0);

    return `${prefix}${(maxCode + 1).toString().padStart(3, '0')}`;
  }

  saveEntity() {
    if (!this.selectedEntity) return;

    if (!this.selectedEntity.code || !this.selectedEntity.name) {
      alert('Código e Nome são obrigatórios.');
      return;
    }

    if (this.type === 'CUSTOMER') {
      if (this.selectedEntity.id.startsWith('NEW_')) {
        this.customerService.createCustomer(this.selectedEntity);
      } else {
        this.customerService.updateCustomer(this.selectedEntity);
      }
    } else {
      if (this.selectedEntity.id.startsWith('NEW_')) {
        this.supplierService.createSupplier(this.selectedEntity);
      } else {
        this.supplierService.updateSupplier(this.selectedEntity);
      }
    }

    // Reload list from backend after a short delay to reflect saved changes
    setTimeout(() => this.loadEntities(), 500);
    this.selectedEntity = null;
    alert('Gravado com sucesso!');
  }

  deleteEntity() {
    if (!this.selectedEntity) return;

    if (confirm('Tem a certeza que deseja eliminar esta entidade?')) {
      // Note: Actual deletion logic might need to check for dependencies (documents, etc.)
      // For now, we'll just toggle isActive to false (soft delete) or implement delete in service
      // Since services don't have delete method yet, let's just alert
      alert('Funcionalidade de eliminar ainda não implementada nos serviços. (Recomendado: Inativar)');
    }
  }

  updateAccount(accountId: string) {
    if (this.type === 'CUSTOMER') {
      this.selectedEntity.receivableAccountId = accountId;
    } else {
      this.selectedEntity.payableAccountId = accountId;
    }
  }
}
