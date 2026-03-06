import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JournalEntry, JournalLine, Journal, Account } from '../../shared/models';
import { AccountingService } from '../../shared/accounting.service';

@Component({
  selector: 'app-accounting-confirmation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in" (click)="onCancel()">
      <div class="bg-white rounded-lg shadow-2xl w-[900px] max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 shadow-blue-900/10 animate-slide-up" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <span class="material-symbols-outlined font-light">account_balance</span>
            </div>
            <div>
              <h3 class="text-xl font-bold text-blue-900 tracking-tight">Movimentos para a Contabilidade e Bancos</h3>
              <p class="text-xs text-blue-600/60 font-medium font-mono uppercase tracking-widest mt-0.5">Confirmação de Lançamento Automático</p>
            </div>
          </div>
          <button (click)="onCancel()" class="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-full">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-6 bg-gray-50/30">
          
          <!-- Document Info -->
          <div class="grid grid-cols-4 gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div class="space-y-1">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Documento</span>
              <p class="text-sm font-bold text-gray-900 leading-none">{{ documentInfo?.type }} {{ documentInfo?.number }}</p>
            </div>
            <div class="space-y-1 border-l pl-4 border-gray-100">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Entidade</span>
              <p class="text-sm font-semibold text-gray-900 truncate leading-none" [title]="documentInfo?.customerName">{{ documentInfo?.customerName }}</p>
            </div>
            <div class="space-y-1 border-l pl-4 border-gray-100">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Data Lançamento</span>
              <p class="text-sm font-mono font-medium text-gray-700 leading-none">{{ formatDate(entry?.date) }}</p>
            </div>
            <div class="space-y-1 border-l pl-4 border-gray-100">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Diário Sugerido</span>
              <div class="flex items-center gap-2">
                <select 
                  [(ngModel)]="selectedJournalId" 
                  class="text-xs font-bold text-blue-700 bg-blue-50 border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 transition-shadow"
                >
                  <option *ngFor="let j of journals" [value]="j.id">{{ j.code }} - {{ j.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Lines Table -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50 text-gray-500">
                  <th class="p-3 text-left font-bold text-[10px] uppercase tracking-wider border-b w-[20%]">Conta</th>
                  <th class="p-3 text-left font-bold text-[10px] uppercase tracking-wider border-b">Descrição</th>
                  <th class="p-3 text-right font-bold text-[10px] uppercase tracking-wider border-b w-28">Débito (MT)</th>
                  <th class="p-3 text-right font-bold text-[10px] uppercase tracking-wider border-b w-28">Crédito (MT)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let line of editingLines; let i = index" class="hover:bg-blue-50/30 transition-colors group">
                  <td class="p-2 align-top">
                    <div class="relative">
                      <input 
                        type="text" 
                        [(ngModel)]="line.accountCode" 
                        (input)="onAccountCodeInput(line)"
                        (focus)="line.showSuggestions = true"
                        (blur)="onAccountBlur(line)"
                        placeholder="Escreva a conta..."
                        class="w-full border rounded px-3 py-1.5 font-mono text-xs focus:ring-2 outline-none transition-all group-hover:border-blue-300"
                        [class.border-red-500]="line.accountCode && !isAccountValid(line)"
                        [class.bg-red-50]="line.accountCode && !isAccountValid(line)"
                        [class.border-gray-200]="!line.accountCode || isAccountValid(line)"
                        id="acc_input_{{i}}"
                      />
                      <div *ngIf="line.accountCode && !isAccountValid(line)" class="text-[9px] text-red-500 font-bold mt-0.5 px-1 animate-pulse">
                        Conta sintética ou inválida
                      </div>
                      <!-- Suggestions Dropdown -->
                      <div *ngIf="line.showSuggestions" class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-auto animate-fade-in">
                        <div 
                          *ngFor="let acc of getFilteredAccounts(line.accountCode)" 
                          (mousedown)="selectAccount(line, acc)"
                          class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs border-b last:border-b-0"
                        >
                          <span class="font-bold text-blue-700 font-mono">{{ acc.code }}</span> - 
                          <span class="text-gray-600">{{ acc.name }}</span>
                        </div>
                        <div *ngIf="getFilteredAccounts(line.accountCode).length === 0" class="px-3 py-3 text-gray-400 text-xs italic text-center">
                          Nenhuma conta encontrada
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="p-2">
                    <input 
                      [(ngModel)]="line.description" 
                      class="w-full border-none px-3 py-1.5 bg-transparent focus:ring-2 focus:ring-blue-500/10 rounded outline-none text-xs text-gray-700 font-medium transition-all"
                    />
                  </td>
                  <td class="p-2 align-top">
                    <input 
                      type="number" 
                      [(ngModel)]="line.debit" 
                      (ngModelChange)="onValueChange(line, 'debit')"
                      class="w-full text-right border-none px-3 py-1.5 bg-transparent font-mono font-bold text-sm text-emerald-700 focus:ring-2 focus:ring-emerald-500/10 rounded outline-none"
                    />
                  </td>
                  <td class="p-2 align-top">
                    <input 
                      type="number" 
                      [(ngModel)]="line.credit" 
                      (ngModelChange)="onValueChange(line, 'credit')"
                      class="w-full text-right border-none px-3 py-1.5 bg-transparent font-mono font-bold text-sm text-red-600 focus:ring-2 focus:ring-red-500/10 rounded outline-none"
                    />
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-blue-900 text-white font-bold">
                <tr>
                  <td colspan="2" class="p-4 text-right text-[10px] uppercase tracking-widest opacity-80">Totais (MT)</td>
                  <td class="p-4 text-right font-mono text-lg" [class.text-emerald-300]="isBalanced" [class.text-red-300]="!isBalanced">
                    {{ totalDebit | number:'1.2-2' }}
                  </td>
                  <td class="p-4 text-right font-mono text-lg" [class.text-emerald-300]="isBalanced" [class.text-red-300]="!isBalanced">
                    {{ totalCredit | number:'1.2-2' }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Validation Message -->
          <div *ngIf="!isBalanced" class="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-fade-in shadow-sm shadow-red-100/50">
            <span class="material-symbols-outlined text-[20px]">warning</span>
            <span class="text-xs font-bold leading-none">O lançamento não está balanceado. A diferença é de <span class="underline font-mono">{{ (totalDebit - totalCredit) | number:'1.2-2' }} MT</span>.</span>
          </div>
          
          <div *ngIf="hasInvalidAccounts" class="mt-2 flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100 animate-fade-in shadow-sm shadow-orange-100/50">
            <span class="material-symbols-outlined text-[20px]">report_problem</span>
            <span class="text-xs font-bold leading-none">Contas inválidas ou sintéticas: por favor utilize apenas contas de nível final (movimentáveis).</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-5 border-t bg-gray-50/50 flex items-center justify-between">
          <div class="text-[10px] text-gray-400 leading-tight">
            Verifique as contas e valores <br/> sugeridos antes de gravar.
          </div>
          <div class="flex items-center gap-3">
            <button 
              (click)="onCancel()" 
              class="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-bold text-xs uppercase tracking-widest transition-colors rounded-lg hover:bg-white"
            >
              Cancelar
            </button>
            <button 
              (click)="onConfirm()" 
              [disabled]="!isBalanced || hasInvalidAccounts"
              class="px-10 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-400/30 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 transition-all text-xs font-bold uppercase tracking-widest active:scale-95"
            >
              Gravar e Lançar
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AccountingConfirmationModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() entry: JournalEntry | null = null;
  @Input() documentInfo: { type: string, number: string, customerName: string } | null = null;

  @Output() confirmed = new EventEmitter<JournalEntry>();
  @Output() cancelled = new EventEmitter<void>();

  journals: Journal[] = [];
  accounts: Account[] = [];
  selectedJournalId: string = '';
  editingLines: (JournalLine & { showSuggestions?: boolean })[] = [];

  constructor(private accountingService: AccountingService) { }

  ngOnInit() {
    this.journals = this.accountingService.getJournals();
    this.accounts = this.accountingService.getAccounts().filter(a => a.allowPosting);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue && this.entry) {
      this.selectedJournalId = this.entry.journalId;
      this.editingLines = (this.entry.lines || []).map(line => ({
        ...line,
        showSuggestions: false
      }));
    }
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-PT');
  }

  onAccountCodeInput(line: any) {
    line.showSuggestions = true;
    const account = this.accounts.find(a => a.code === line.accountCode);
    if (account) {
      line.accountId = account.id;
      line.accountName = account.name;
    }
  }

  onAccountBlur(line: any) {
    // Delay hiding suggestions to allow mousedown on options
    setTimeout(() => {
      line.showSuggestions = false;
    }, 200);
  }

  getFilteredAccounts(query: string): Account[] {
    if (!query) return this.accounts.slice(0, 50);
    const q = query.toLowerCase();
    return this.accounts.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
    ).slice(0, 50);
  }

  selectAccount(line: any, account: Account) {
    line.accountId = account.id;
    line.accountCode = account.code;
    line.accountName = account.name;
    line.showSuggestions = false;
  }

  onValueChange(line: JournalLine, field: 'debit' | 'credit') {
    if (field === 'debit' && line.debit > 0) line.credit = 0;
    if (field === 'credit' && line.credit > 0) line.debit = 0;
  }

  get totalDebit(): number {
    return this.editingLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  }

  get totalCredit(): number {
    return this.editingLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  }

  get isBalanced(): boolean {
    return Math.abs(this.totalDebit - this.totalCredit) < 0.01 && this.totalDebit > 0;
  }

  isAccountValid(line: any): boolean {
    return !!line.accountId && !!this.accounts.find(a => a.id === line.accountId && a.allowPosting);
  }

  get hasInvalidAccounts(): boolean {
    return this.editingLines.some(line => !this.isAccountValid(line));
  }

  onConfirm() {
    if (!this.isBalanced || !this.entry) return;

    const confirmedEntry: JournalEntry = {
      ...this.entry,
      journalId: this.selectedJournalId,
      status: 'POSTED' as any, // Finalize entry upon manual confirmation
      lines: this.editingLines.map(l => {
        const { showSuggestions, ...restLine } = l as any;
        return restLine;
      })
    };

    this.confirmed.emit(confirmedEntry);
  }

  onCancel() {
    this.cancelled.emit();
  }
}
