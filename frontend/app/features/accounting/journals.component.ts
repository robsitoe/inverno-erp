import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../shared/accounting.service';
import { Journal } from '../../shared/models';

@Component({
    selector: 'app-journals',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="flex flex-col h-full bg-white">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 class="text-lg font-semibold text-gray-800">Diários</h2>
          <p class="text-xs text-gray-600 mt-0.5">Gestão de Diários Contabilísticos</p>
        </div>
        <button (click)="openModal()" class="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px]">add</span>
          Novo Diário
        </button>
      </div>

      <div class="flex-1 overflow-auto p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let journal of journals" class="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white relative group">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                  {{ journal.code }}
                </span>
                <h3 class="font-semibold text-gray-800 mt-2">{{ journal.name }}</h3>
              </div>
              <div class="flex gap-1">
                <button (click)="editJournal(journal)" class="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
                  <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>
            </div>
            
            <div class="text-xs text-gray-500 space-y-1 mt-3">
              <div class="flex justify-between">
                <span>Tipo:</span>
                <span class="font-medium text-gray-700">{{ getJournalTypeLabel(journal.type) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Estado:</span>
                <span [class]="journal.isActive ? 'text-green-600' : 'text-red-600'">
                  {{ journal.isActive ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div *ngIf="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl w-[500px] p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            {{ isEditing ? 'Editar Diário' : 'Novo Diário' }}
          </h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input [(ngModel)]="currentJournal.code" class="w-full border border-gray-300 rounded p-2 text-sm uppercase" placeholder="Ex: VENDAS" [disabled]="isEditing">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input [(ngModel)]="currentJournal.name" class="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Ex: Diário de Vendas">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select [(ngModel)]="currentJournal.type" class="w-full border border-gray-300 rounded p-2 text-sm bg-white">
                <option value="SALES">Vendas</option>
                <option value="PURCHASES">Compras</option>
                <option value="CASH">Caixa</option>
                <option value="BANK">Bancos</option>
                <option value="GENERAL">Geral</option>
                <option value="OPERATIONS">Operações Diversas</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="currentJournal.isActive" id="isActive" class="rounded border-gray-300 text-blue-600">
              <label for="isActive" class="text-sm text-gray-700">Ativo</label>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-6 border-t mt-6">
            <button (click)="closeModal()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
              Cancelar
            </button>
            <button (click)="saveJournal()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Gravar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class JournalsComponent implements OnInit {
    journals: Journal[] = [];
    showModal = false;
    isEditing = false;

    currentJournal: Partial<Journal> = {
        isActive: true,
        type: 'GENERAL'
    };

    constructor(private accountingService: AccountingService) { }

    ngOnInit() {
        this.loadJournals();
    }

    loadJournals() {
        this.journals = this.accountingService.getJournals();
    }

    getJournalTypeLabel(type: string): string {
        const types: any = {
            'SALES': 'Vendas',
            'PURCHASES': 'Compras',
            'CASH': 'Caixa',
            'BANK': 'Bancos',
            'GENERAL': 'Geral',
            'OPERATIONS': 'Operações Diversas'
        };
        return types[type] || type;
    }

    openModal() {
        this.isEditing = false;
        this.currentJournal = {
            isActive: true,
            type: 'GENERAL'
        };
        this.showModal = true;
    }

    editJournal(journal: Journal) {
        this.isEditing = true;
        this.currentJournal = { ...journal };
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
    }

    saveJournal() {
        if (!this.currentJournal.code || !this.currentJournal.name || !this.currentJournal.type) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        if (this.isEditing && this.currentJournal.id) {
            this.accountingService.updateJournal(this.currentJournal as Journal);
        } else {
            this.accountingService.addJournal(this.currentJournal as Journal);
        }

        this.loadJournals();
        this.closeModal();
    }
}
