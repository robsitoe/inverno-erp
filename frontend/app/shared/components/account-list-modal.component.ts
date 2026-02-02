import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../accounting.service';
import { Account } from '../models';

@Component({
    selector: 'app-account-list-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" (click)="onClose()">
      <div class="bg-white rounded-sm shadow-xl w-[800px] max-h-[85vh] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
          <h3 class="text-sm font-medium text-gray-700">Plano de Contas - Seleção</h3>
          <button (click)="onClose()" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="px-3 py-2 border-b border-gray-200 bg-white shrink-0">
          <div class="relative">
            <input 
              type="text"
              [(ngModel)]="searchQuery"
              (input)="filterAccounts()"
              placeholder="Pesquisar por código ou nome de conta..."
              class="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              #searchInput
            />
            <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          </div>
        </div>

        <!-- List -->
        <div class="overflow-y-auto p-1 flex-1 bg-gray-50">
          <table class="w-full text-xs border-collapse bg-white">
            <thead class="bg-gray-100 text-gray-600 font-medium sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th class="px-3 py-2 text-left w-32 font-bold">Código</th>
                <th class="px-3 py-2 text-left font-bold">Descrição da Conta</th>
                <th class="px-3 py-2 text-center w-20 font-bold">Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let acc of filteredAccounts" 
                  (click)="onSelect(acc)"
                  [class.opacity-50]="!acc.allowPosting"
                  [class.bg-blue-50]="acc.id === selectedId"
                  class="hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition-colors group">
                <td class="px-3 py-1.5 font-mono font-bold text-blue-700">{{ acc.code }}</td>
                <td class="px-3 py-1.5 text-gray-800">
                    <span [style.padding-left.px]="(acc.code.split('.').length - 1) * 10">{{ acc.name }}</span>
                    <span *ngIf="!acc.allowPosting" class="ml-2 text-[9px] uppercase bg-gray-200 text-gray-500 px-1 rounded">Agregadora</span>
                </td>
                <td class="px-3 py-1.5 text-center text-[10px] text-gray-500 uppercase">{{ acc.type }}</td>
              </tr>
              <tr *ngIf="filteredAccounts.length === 0">
                <td colspan="3" class="px-2 py-8 text-center text-gray-400 italic">
                  Nenhuma conta encontrada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
          <span class="text-[10px] text-gray-500 uppercase font-bold">{{ filteredAccounts.length }} conta(s) listada(s)</span>
          <div class="flex gap-2">
            <button (click)="onClose()" class="px-4 py-1.5 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50 font-bold">
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AccountListModalComponent implements OnInit {
    @Input() selectedId: string = '';
    @Output() close = new EventEmitter<void>();
    @Output() select = new EventEmitter<Account>();

    allAccounts: Account[] = [];
    filteredAccounts: Account[] = [];
    searchQuery = '';

    constructor(private accountingService: AccountingService) { }

    ngOnInit() {
        this.allAccounts = this.accountingService.getAccounts()
            .sort((a, b) => a.code.localeCompare(b.code));
        this.filteredAccounts = [...this.allAccounts];
    }

    filterAccounts() {
        if (!this.searchQuery) {
            this.filteredAccounts = [...this.allAccounts];
            return;
        }
        const q = this.searchQuery.toLowerCase().trim();
        this.filteredAccounts = this.allAccounts.filter(a =>
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q)
        );
    }

    onClose() {
        this.close.emit();
    }

    onSelect(acc: Account) {
        if (!acc.allowPosting) return; // Only allow selecting leaf accounts
        this.select.emit(acc);
    }
}
