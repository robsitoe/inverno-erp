import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AccountingService } from '../accounting.service';
import { GenericEntity, Account } from '../models';

@Component({
    selector: 'app-generic-entity-list-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" (click)="onClose()">
      <div class="bg-white rounded-sm shadow-lg w-[850px] max-h-[85vh] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
          <h3 class="text-sm font-medium text-gray-700">Lista de {{ entityTypeLabel }}s</h3>
          <button (click)="onClose()" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Toolbar & Search -->
        <div class="px-3 py-2 border-b border-gray-200 bg-white flex justify-between items-center gap-4 shrink-0">
          <div class="relative flex-1">
            <input 
              type="text"
              [(ngModel)]="searchQuery"
              (input)="filterEntities()"
              [placeholder]="'Pesquisar ' + (entityTypeLabel | lowercase) + 's...'"
              class="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          </div>
          <button (click)="startCreate()" class="bg-green-600 text-white px-3 py-1.5 rounded-sm text-xs hover:bg-green-700 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">add</span> Novo {{ entityTypeLabel }}
          </button>
        </div>

        <!-- Grid -->
        <div class="overflow-y-auto p-1 flex-1">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-gray-50 text-gray-600 font-medium sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th class="px-2 py-1 text-left w-20">Código</th>
                <th class="px-2 py-1 text-left">Nome</th>
                <th class="px-2 py-1 text-left w-24">NIF</th>
                <th class="px-2 py-1 text-left">Conta Contábil</th>
                <th class="px-2 py-1 text-center w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              <!-- Inline Create/Edit Row -->
              <tr *ngIf="isCreating || editingEntity" class="bg-blue-50 border-b border-blue-200">
                <td class="px-1 py-1">
                  <input [(ngModel)]="tempEntity.code" class="w-full border border-blue-300 rounded-sm px-1 py-0.5" placeholder="Código">
                </td>
                <td class="px-1 py-1">
                  <input [(ngModel)]="tempEntity.name" class="w-full border border-blue-300 rounded-sm px-1 py-0.5" placeholder="Nome">
                </td>
                <td class="px-1 py-1">
                  <input [(ngModel)]="tempEntity.nif" class="w-full border border-blue-300 rounded-sm px-1 py-0.5" placeholder="NIF">
                </td>
                <td class="px-1 py-1">
                  <select [(ngModel)]="tempEntity.accountId" class="w-full border border-blue-300 rounded-sm px-1 py-0.5">
                    <option value="">Selecione a conta...</option>
                    <option *ngFor="let acc of availableAccounts" [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
                  </select>
                </td>
                <td class="px-1 py-1 text-center">
                  <div class="flex justify-center gap-1">
                    <button (click)="saveEntity()" class="text-green-600 hover:text-green-800"><span class="material-symbols-outlined text-[18px]">check</span></button>
                    <button (click)="cancelEdit()" class="text-red-500 hover:text-red-700"><span class="material-symbols-outlined text-[18px]">close</span></button>
                  </div>
                </td>
              </tr>

              <tr *ngFor="let entity of filteredEntities" 
                  class="hover:bg-gray-50 border-b border-gray-100 group">
                <td class="px-2 py-1.5 font-medium text-blue-600 cursor-pointer" (click)="onSelect(entity)">{{ entity.code }}</td>
                <td class="px-2 py-1.5 text-gray-700 cursor-pointer" (click)="onSelect(entity)">{{ entity.name }}</td>
                <td class="px-2 py-1.5 text-gray-600 cursor-pointer" (click)="onSelect(entity)">{{ entity.nif }}</td>
                <td class="px-2 py-1.5 text-gray-500">
                  <span class="font-mono">{{ getAccountCode(entity.accountId) }}</span>
                  <span class="ml-1 text-[10px] opacity-70">{{ getAccountName(entity.accountId) }}</span>
                </td>
                <td class="px-2 py-1.5 text-center">
                  <button (click)="startEdit(entity)" class="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100">
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredEntities.length === 0 && !isCreating">
                <td colspan="5" class="px-2 py-8 text-center text-gray-400 italic">
                  Nenhuma entidade encontrada para {{ entityTypeLabel }}.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
          <span class="text-[10px] text-gray-500">{{ filteredEntities.length }} {{ entityTypeLabel }}(s) encontrado(s)</span>
          <button (click)="onClose()" class="px-4 py-1 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  `
})
export class GenericEntityListModalComponent implements OnInit {
    @Input() entityType: string = '';
    @Input() entityTypeLabel: string = 'Entidade';
    @Output() close = new EventEmitter<void>();
    @Output() select = new EventEmitter<GenericEntity>();

    entities: GenericEntity[] = [];
    filteredEntities: GenericEntity[] = [];
    searchQuery = '';

    availableAccounts: Account[] = [];
    currentCompanyId: string | null = null;
    isCreating = false;
    editingEntity: GenericEntity | null = null;
    tempEntity: any = {};

    constructor(
        private dataService: DataService,
        private accountingService: AccountingService
    ) { }

    ngOnInit() {
        this.loadCompanyInfo();
        this.loadEntities();
        this.loadAccounts();
    }

    loadCompanyInfo() {
        this.dataService.getCompanyInfo().subscribe(info => {
            if (info) this.currentCompanyId = info.id;
        });
    }

    loadEntities() {
        this.dataService.getGenericEntities(this.entityType).subscribe(data => {
            this.entities = data;
            this.filterEntities();
        });
    }

    loadAccounts() {
        // Usually "Other" entities use Class 2 (State, Employees, etc) or Class 3 (Partners)
        // We'll load all accounts allowed to post for now
        this.availableAccounts = this.accountingService.getAccounts()
            .filter(a => a.allowPosting)
            .sort((a, b) => a.code.localeCompare(b.code));
    }

    filterEntities() {
        if (!this.searchQuery) {
            this.filteredEntities = [...this.entities];
            return;
        }
        const query = this.searchQuery.toLowerCase().trim();
        this.filteredEntities = this.entities.filter(e =>
            e.name.toLowerCase().includes(query) ||
            e.code.toLowerCase().includes(query) ||
            e.nif.toLowerCase().includes(query)
        );
    }

    getAccountCode(id: string): string {
        const acc = this.availableAccounts.find(a => a.id === id);
        return acc ? acc.code : '';
    }

    getAccountName(id: string): string {
        const acc = this.availableAccounts.find(a => a.id === id);
        return acc ? acc.name : '';
    }

    startCreate() {
        this.isCreating = true;
        this.editingEntity = null;
        this.tempEntity = {
            id: '',
            companyId: this.currentCompanyId,
            code: '',
            name: '',
            nif: '',
            type: this.entityType,
            accountId: '',
            isActive: true
        };
    }

    startEdit(entity: GenericEntity) {
        this.editingEntity = entity;
        this.isCreating = false;
        this.tempEntity = { ...entity };
    }

    cancelEdit() {
        this.isCreating = false;
        this.editingEntity = null;
    }

    saveEntity() {
        if (!this.tempEntity.code || !this.tempEntity.name) {
            alert('Por favor preencha o código e o nome.');
            return;
        }

        if (!this.tempEntity.id) {
            this.tempEntity.id = Date.now().toString();
        }

        this.dataService.saveGenericEntity(this.tempEntity).subscribe(() => {
            this.loadEntities();
            this.cancelEdit();
        });
    }

    onClose() {
        this.close.emit();
    }

    onSelect(entity: GenericEntity) {
        if (this.isCreating || this.editingEntity) return;
        this.select.emit(entity);
    }
}
