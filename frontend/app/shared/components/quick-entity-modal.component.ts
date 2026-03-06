import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../customer.service';
import { SupplierService } from '../supplier.service';
import { AccountingService } from '../accounting.service';
import { Customer, Supplier, Account } from '../models';
import { ToasterService } from '../../services/toaster.service';

@Component({
    selector: 'app-quick-entity-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" (click)="onClose()">
      <div class="bg-white rounded-lg shadow-2xl w-[450px] overflow-hidden transform transition-all" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div [class]="type === 'CUSTOMER' ? 'bg-blue-600' : 'bg-orange-600'" class="px-6 py-4 flex items-center justify-between text-white">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span class="material-symbols-outlined">{{ type === 'CUSTOMER' ? 'person_add' : 'local_shipping' }}</span>
            Registo Rápido: {{ type === 'CUSTOMER' ? 'Cliente' : 'Fornecedor' }}
          </h3>
          <button (click)="onClose()" class="hover:bg-white/20 rounded-full p-1 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Nome -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo / Instituição</label>
            <input type="text" [(ngModel)]="entity.name" 
                   class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                   placeholder="Ex: João da Silva ou Instituição X">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- NIF -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">NIF/NUIT</label>
              <input type="text" [(ngModel)]="entity.nif" 
                     class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                     placeholder="9 dígitos">
            </div>
            <!-- Telemóvel -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Telemóvel</label>
              <input type="text" [(ngModel)]="entity.phone" 
                     class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                     placeholder="+258...">
            </div>
          </div>

          <!-- Conta Contabilística -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Conta Contabilística Sugerida</label>
            <select [(ngModel)]="selectedAccountId" 
                    class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
              <option *ngFor="let acc of availableAccounts" [value]="acc.id">
                {{ acc.code }} - {{ acc.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3 mt-4">
          <button (click)="onClose()" 
                  class="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-all font-medium">
            Cancelar
          </button>
          <button (click)="onSave()" 
                  [disabled]="!entity.name"
                  [class]="type === 'CUSTOMER' ? 'bg-blue-600' : 'bg-orange-600'"
                  class="px-6 py-2 text-white rounded-md shadow-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold">
            Cadastrar Agora
          </button>
        </div>
      </div>
    </div>
  `
})
export class QuickEntityModalComponent {
    @Input() type: 'CUSTOMER' | 'SUPPLIER' = 'CUSTOMER';
    @Input() initialName: string = '';
    @Output() close = new EventEmitter<void>();
    @Output() saved = new EventEmitter<any>();

    entity: any = {
        name: '',
        nif: '',
        phone: '',
        address: 'Maputo',
        city: 'Maputo',
        postalCode: '0000',
        country: 'Moçambique',
        paymentTerms: 30,
        creditLimit: 0,
        isActive: true
    };

    availableAccounts: Account[] = [];
    selectedAccountId: string = '';

    constructor(
        private customerService: CustomerService,
        private supplierService: SupplierService,
        private accountingService: AccountingService,
        private toaster: ToasterService
    ) { }

    ngOnInit() {
        this.entity.name = this.initialName;

        // Load accounts
        const prefix = this.type === 'CUSTOMER' ? '2.1' : '2.2';
        this.availableAccounts = this.accountingService.getAccounts()
            .filter(a => a.allowPosting && a.code.startsWith(prefix))
            .sort((a, b) => a.code.localeCompare(b.code));

        if (this.availableAccounts.length > 0) {
            this.selectedAccountId = this.availableAccounts[0].id;
        }
    }

    onSave() {
        if (!this.entity.name) return;

        // Generate a code (simple logic for now)
        const timestamp = Date.now().toString().slice(-6);
        this.entity.code = (this.type === 'CUSTOMER' ? 'CL-' : 'FR-') + timestamp;

        if (this.type === 'CUSTOMER') {
            this.entity.receivableAccountId = this.selectedAccountId;
            this.customerService.createCustomer(this.entity as Customer);
        } else {
            this.entity.payableAccountId = this.selectedAccountId;
            this.supplierService.createSupplier(this.entity as Supplier);
        }

        this.toaster.showSuccess('Sucesso', `${this.type === 'CUSTOMER' ? 'Cliente' : 'Fornecedor'} cadastrado com sucesso.`);
        this.saved.emit(this.entity);
        this.onClose();
    }

    onClose() {
        this.close.emit();
    }
}
