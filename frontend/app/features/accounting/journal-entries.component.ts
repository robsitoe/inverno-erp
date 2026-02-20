import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../shared/accounting.service';
import { JournalEntry, JournalLine, Journal, Account } from '../../shared/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-white">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 class="text-lg font-semibold text-gray-800">Lançamentos Contabilísticos</h2>
          <p class="text-xs text-gray-600 mt-0.5">Total: {{ filteredEntries.length }} lançamento(s)</p>
          <div *ngIf="isLoading" class="text-[10px] text-blue-500 font-bold animate-pulse">A carregar dados do servidor...</div>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Journal Filter -->
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-600">Diário:</label>
            <select 
              [(ngModel)]="selectedJournalId" 
              (change)="filterEntries()"
              class="text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
            >
              <option value="ALL">Todos os Diários</option>
              <option *ngFor="let journal of journals" [value]="journal.id">
                {{ journal.code }} - {{ journal.name }}
              </option>
            </select>
          </div>

          <button (click)="initiateCreate()" class="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">add</span>
            Novo Lançamento
          </button>

          <button (click)="runCleanup()" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs font-medium flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">cleaning_services</span>
            Limpar Vazios
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <table class="w-full text-sm border-collapse">
          <thead class="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th class="text-left p-2 border">Data</th>
              <th class="text-left p-2 border">Diário</th>
              <th class="text-left p-2 border">Nº</th>
              <th class="text-left p-2 border">Descrição</th>
              <th class="text-left p-2 border">Referência</th>
              <th class="text-left p-2 border">Origem</th>
              <th class="text-right p-2 border">Débito</th>
              <th class="text-right p-2 border">Crédito</th>
              <th class="text-center p-2 border">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of filteredEntries" 
                class="hover:bg-gray-50 cursor-pointer transition-colors border-b" 
                [class.opacity-50]="!entry.id"
                (click)="onSelectEntry(entry)">
              <td class="p-2 border">{{ formatDate(entry.date) }}</td>
              <td class="p-2 border">
                <span class="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold border border-gray-200">
                  {{ getJournalCode(entry.journalId) }}
                </span>
              </td>
              <td class="p-2 border font-mono text-blue-600">{{ entry.id }}</td>
              <td class="p-2 border">{{ entry.description }}</td>
              <td class="p-2 border font-mono">{{ entry.reference }}</td>
              <td class="p-2 border">
                <span [class]="getSourceClass(entry.sourceType)">
                  {{ getSourceLabel(entry.sourceType) }}
                </span>
              </td>
              <td class="p-2 border text-right font-mono font-semibold text-green-700">
                {{ getTotalDebit(entry) | number:'1.2-2' }}
              </td>
              <td class="p-2 border text-right font-mono font-semibold text-red-700">
                {{ getTotalCredit(entry) | number:'1.2-2' }}
              </td>
              <td class="p-2 border text-center">
                <span [class]="getStatusClass(entry.status)">
                  {{ getStatusLabel(entry.status) }}
                </span>
              </td>
            </tr>
            <tr *ngIf="filteredEntries.length === 0">
              <td colspan="9" class="p-8 text-center text-gray-500">
                <span class="material-symbols-outlined text-[48px] text-gray-300 block mb-2">receipt_long</span>
                Nenhum lançamento encontrado neste diário
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail Modal -->
      <div *ngIf="selectedEntry && !showCorrectionModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="selectedEntry = null">
        <div class="bg-white rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between px-4 py-3 border-b bg-gray-50 sticky top-0">
            <div>
              <h3 class="text-lg font-semibold">Detalhes do Lançamento</h3>
              <p class="text-xs text-gray-600">{{ selectedEntry.id }}</p>
            </div>
            <button (click)="selectedEntry = null" class="text-gray-400 hover:text-gray-600">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div class="p-4 space-y-4">
            <div class="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
              <div>
                <span class="text-xs text-gray-600">Data:</span>
                <p class="font-medium">{{ formatDate(selectedEntry.date) }}</p>
              </div>
              <div>
                <span class="text-xs text-gray-600">Diário:</span>
                <p class="font-medium">{{ getJournalName(selectedEntry.journalId) }}</p>
              </div>
              <div>
                <span class="text-xs text-gray-600">Referência:</span>
                <p class="font-medium font-mono">{{ selectedEntry.reference }}</p>
              </div>
              <div class="col-span-2">
                <span class="text-xs text-gray-600">Descrição:</span>
                <p class="font-medium">{{ selectedEntry.description }}</p>
              </div>
              <div>
                <span class="text-xs text-gray-600">Origem:</span>
                <p><span [class]="getSourceClass(selectedEntry.sourceType)">{{ getSourceLabel(selectedEntry.sourceType) }}</span></p>
              </div>
              <div>
                <span class="text-xs text-gray-600">Estado:</span>
                <p><span [class]="getStatusClass(selectedEntry.status)">{{ getStatusLabel(selectedEntry.status) }}</span></p>
              </div>
              <div *ngIf="selectedEntry.correctionReason" class="col-span-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                <span class="text-xs text-yellow-800 font-bold">Motivo da Correção:</span>
                <p class="text-sm text-yellow-900">{{ selectedEntry.correctionReason }}</p>
              </div>
              <div *ngIf="selectedEntry.relatedEntryId" class="col-span-2">
                <span class="text-xs text-gray-600">Lançamento Relacionado:</span>
                <p class="font-mono text-blue-600">{{ selectedEntry.relatedEntryId }}</p>
              </div>
            </div>

            <div>
              <h4 class="font-semibold mb-2">Linhas do Lançamento</h4>
              <table class="w-full text-sm border-collapse">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="text-left p-2 border">Conta</th>
                    <th class="text-left p-2 border">Descrição</th>
                    <th class="text-right p-2 border">Débito</th>
                    <th class="text-right p-2 border">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of selectedEntry.lines">
                    <td class="p-2 border">
                      <span class="font-mono text-xs text-gray-600">{{ line.accountCode }}</span>
                      <br>
                      <span class="text-sm">{{ line.accountName }}</span>
                    </td>
                    <td class="p-2 border">{{ line.description }}</td>
                    <td class="p-2 border text-right font-mono font-semibold text-green-700">
                      {{ line.debit > 0 ? (line.debit | number:'1.2-2') : '-' }}
                    </td>
                    <td class="p-2 border text-right font-mono font-semibold text-red-700">
                      {{ line.credit > 0 ? (line.credit | number:'1.2-2') : '-' }}
                    </td>
                  </tr>
                  <tr class="bg-gray-100 font-bold">
                    <td colspan="2" class="p-2 border text-right">TOTAL:</td>
                    <td class="p-2 border text-right font-mono text-green-700">{{ getTotalDebit(selectedEntry) | number:'1.2-2' }}</td>
                    <td class="p-2 border text-right font-mono text-red-700">{{ getTotalCredit(selectedEntry) | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-end gap-2 pt-4 border-t">
              <button 
                *ngIf="selectedEntry.status === 'POSTED'"
                (click)="initiateCorrection()" 
                class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-2"
              >
                <span class="material-symbols-outlined text-[18px]">edit_document</span>
                Corrigir Lançamento
              </button>
              <button (click)="selectedEntry = null" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create New Entry Modal -->
      <div *ngIf="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl w-[900px] max-h-[90vh] overflow-auto p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">Novo Lançamento Manual</h3>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Diário</label>
              <select [(ngModel)]="newEntry.journalId" class="w-full border border-gray-300 rounded p-1.5 text-sm">
                <option *ngFor="let journal of journals" [value]="journal.id">
                  {{ journal.code }} - {{ journal.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Data</label>
              <input type="date" [(ngModel)]="newEntryDate" class="w-full border border-gray-300 rounded p-1.5 text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <input [(ngModel)]="newEntry.description" class="w-full border border-gray-300 rounded p-1.5 text-sm" placeholder="Descrição do lançamento">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Referência</label>
              <input [(ngModel)]="newEntry.reference" class="w-full border border-gray-300 rounded p-1.5 text-sm" placeholder="Ref. Documento">
            </div>
          </div>

          <div class="mb-4 border-t pt-4">
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-semibold text-gray-700">Linhas do Lançamento</h4>
              <button (click)="addNewLine()" class="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">add</span>
                Adicionar Linha
              </button>
            </div>

            <table class="w-full text-sm border-collapse mb-2">
              <thead class="bg-gray-100">
                <tr>
                  <th class="text-left p-2 border w-1/3">Conta</th>
                  <th class="text-left p-2 border">Descrição da Linha</th>
                  <th class="text-right p-2 border w-32">Débito</th>
                  <th class="text-right p-2 border w-32">Crédito</th>
                  <th class="w-8 border"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let line of newEntry.lines; let i = index">
                  <td class="p-2 border">
                    <select 
                      [(ngModel)]="line.accountId" 
                      (change)="onAccountChange(line)"
                      class="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent text-xs"
                    >
                      <option value="">Selecione a conta...</option>
                      <option *ngFor="let acc of accounts" [value]="acc.id">
                        {{ acc.code }} - {{ acc.name }}
                      </option>
                    </select>
                  </td>
                  <td class="p-2 border">
                    <input [(ngModel)]="line.description" class="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent" placeholder="Descrição da linha">
                  </td>
                  <td class="p-2 border">
                    <input 
                      type="number" 
                      [(ngModel)]="line.debit" 
                      (ngModelChange)="onValueChange(line, 'debit')"
                      class="w-full text-right border border-gray-200 rounded px-1 py-0.5 focus:border-blue-500 outline-none"
                    />
                  </td>
                  <td class="p-2 border">
                    <input 
                      type="number" 
                      [(ngModel)]="line.credit" 
                      (ngModelChange)="onValueChange(line, 'credit')"
                      class="w-full text-right border border-gray-200 rounded px-1 py-0.5 focus:border-blue-500 outline-none"
                    />
                  </td>
                  <td class="p-2 border text-center">
                    <button (click)="removeLine(i)" class="text-red-500 hover:text-red-700">
                      <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
                <tr class="bg-gray-50 font-bold">
                  <td colspan="2" class="p-2 border text-right">TOTAIS:</td>
                  <td class="p-2 border text-right font-mono" [class.text-red-600]="!isNewEntryBalanced">{{ newEntryTotalDebit | number:'1.2-2' }}</td>
                  <td class="p-2 border text-right font-mono" [class.text-red-600]="!isNewEntryBalanced">{{ newEntryTotalCredit | number:'1.2-2' }}</td>
                  <td class="border"></td>
                </tr>
              </tbody>
            </table>
            
            <div *ngIf="!isNewEntryBalanced" class="text-red-600 text-xs font-bold text-right">
              O lançamento não está balanceado (Diferença: {{ (newEntryTotalDebit - newEntryTotalCredit) | number:'1.2-2' }})
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t">
            <button (click)="cancelCreate()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
              Cancelar
            </button>
            <button 
              (click)="saveNewEntry()" 
              [disabled]="!isNewEntryValid"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Gravar Lançamento
            </button>
          </div>
        </div>
      </div>

      <!-- Correction Modal -->
      <div *ngIf="showCorrectionModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl w-[900px] max-h-[90vh] overflow-auto p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">Corrigir Lançamento</h3>
          
          <div class="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
            <p class="text-sm text-blue-800">
              <strong>Atenção:</strong> Este processo criará um estorno (anulação) do lançamento original e um novo lançamento com as correções abaixo.
              O registo original permanecerá no histórico como "Corrigido".
            </p>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Motivo da Correção (Obrigatório)</label>
            <textarea 
              [(ngModel)]="correctionReason" 
              class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows="2"
              placeholder="Descreva o motivo da correção..."
            ></textarea>
          </div>

          <div class="mb-4 border-t pt-4">
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-semibold text-gray-700">Dados do Novo Lançamento</h4>
              <button (click)="addCorrectionLine()" class="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">add</span>
                Adicionar Linha
              </button>
            </div>
            
            <div class="mb-3">
              <label class="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <input 
                [(ngModel)]="editingEntry.description" 
                class="w-full border border-gray-300 rounded p-1.5 text-sm"
              />
            </div>

            <table class="w-full text-sm border-collapse mb-2">
              <thead class="bg-gray-100">
                <tr>
                  <th class="text-left p-2 border w-1/3">Conta</th>
                  <th class="text-left p-2 border">Descrição da Linha</th>
                  <th class="text-right p-2 border w-32">Débito</th>
                  <th class="text-right p-2 border w-32">Crédito</th>
                  <th class="w-8 border"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let line of editingEntry.lines; let i = index">
                  <td class="p-2 border">
                    <select 
                      [(ngModel)]="line.accountId" 
                      (change)="onAccountChange(line)"
                      class="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent text-xs"
                    >
                      <option value="">Selecione a conta...</option>
                      <option *ngFor="let acc of accounts" [value]="acc.id">
                        {{ acc.code }} - {{ acc.name }}
                      </option>
                    </select>
                  </td>
                  <td class="p-2 border">
                    <input [(ngModel)]="line.description" class="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent" />
                  </td>
                  <td class="p-2 border">
                    <input 
                      type="number" 
                      [(ngModel)]="line.debit" 
                      (ngModelChange)="onValueChange(line, 'debit')"
                      class="w-full text-right border border-gray-200 rounded px-1 py-0.5 focus:border-blue-500 outline-none"
                    />
                  </td>
                  <td class="p-2 border">
                    <input 
                      type="number" 
                      [(ngModel)]="line.credit" 
                      (ngModelChange)="onValueChange(line, 'credit')"
                      class="w-full text-right border border-gray-200 rounded px-1 py-0.5 focus:border-blue-500 outline-none"
                    />
                  </td>
                  <td class="p-2 border text-center">
                    <button (click)="removeCorrectionLine(i)" class="text-red-500 hover:text-red-700">
                      <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
                <tr class="bg-gray-50 font-bold">
                  <td colspan="2" class="p-2 border text-right">TOTAIS (Novo Lançamento):</td>
                  <td class="p-2 border text-right font-mono" [class.text-red-600]="!isBalanced">{{ editingTotalDebit | number:'1.2-2' }}</td>
                  <td class="p-2 border text-right font-mono" [class.text-red-600]="!isBalanced">{{ editingTotalCredit | number:'1.2-2' }}</td>
                  <td class="border"></td>
                </tr>
              </tbody>
            </table>
            
            <div *ngIf="!isBalanced" class="text-red-600 text-xs font-bold text-right">
              O lançamento não está balanceado (Diferença: {{ (editingTotalDebit - editingTotalCredit) | number:'1.2-2' }})
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t">
            <button (click)="cancelCorrection()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
              Cancelar
            </button>
            <button 
              (click)="confirmCorrection()" 
              [disabled]="!correctionReason || !isBalanced || editingEntry.lines.length < 2"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Correção
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class JournalEntriesComponent implements OnInit {
  entries: JournalEntry[] = [];
  filteredEntries: JournalEntry[] = [];
  journals: Journal[] = [];
  accounts: Account[] = [];
  selectedEntry: JournalEntry | null = null;
  selectedJournalId: string = 'ALL';

  // Correction State
  showCorrectionModal = false;
  correctionReason = '';
  editingEntry: Partial<JournalEntry> & { lines: JournalLine[] } = { lines: [] };

  showCreateModal = false;
  newEntry: Partial<JournalEntry> & { lines: JournalLine[] } = { lines: [] };
  newEntryDate: string = new Date().toISOString().split('T')[0];
  isLoading = false;

  private subs = new Subscription();

  constructor(
    private accountingService: AccountingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.isLoading = true;

    // Subscribe to Journals
    this.subs.add(
      this.accountingService.journalsChanged$.subscribe(journals => {
        this.journals = journals;
        this.cdr.detectChanges();
      })
    );

    // Subscribe to Accounts
    this.subs.add(
      this.accountingService.accountsChanged$.subscribe(accounts => {
        this.accounts = accounts;
        this.cdr.detectChanges();
      })
    );

    // Subscribe to Entries
    this.subs.add(
      this.accountingService.entriesChanged$.subscribe(entries => {
        this.entries = entries;
        this.filterEntries();
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    );

    // Initial check (in case data is already there)
    this.journals = this.accountingService.getJournals();
    this.accounts = this.accountingService.getAccounts().sort((a, b) => a.code.localeCompare(b.code));
    this.loadEntries();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadEntries() {
    this.entries = this.accountingService.getJournalEntries();
    this.filterEntries();
  }

  filterEntries() {
    // Filter out logically deleted records and entries that are completely empty/incomplete
    let entries = this.entries.filter(e =>
      e.id &&
      e.status !== 'CANCELLED' &&
      e.status !== 'VOIDED'
    );

    // Sort by date (descending)
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (this.selectedJournalId === 'ALL') {
      this.filteredEntries = [...entries];
    } else {
      this.filteredEntries = entries.filter(e => e.journalId === this.selectedJournalId);
    }

    this.cdr.detectChanges();
  }

  onSelectEntry(entry: JournalEntry) {
    if (!entry.id) return;
    this.selectedEntry = entry;
  }

  getJournalCode(journalId: string): string {
    const journal = this.journals.find(j => j.id === journalId);
    return journal ? journal.code : 'N/A';
  }

  getJournalName(journalId: string): string {
    const journal = this.journals.find(j => j.id === journalId);
    return journal ? journal.name : 'Desconhecido';
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('pt-PT');
  }

  getTotalDebit(entry: JournalEntry | { lines: JournalLine[] }): number {
    if (!entry || !entry.lines) return 0;
    return entry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  }

  getTotalCredit(entry: JournalEntry | { lines: JournalLine[] }): number {
    if (!entry || !entry.lines) return 0;
    return entry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  }

  getSourceLabel(type?: string): string {
    const labels: any = {
      'SALE': 'Venda',
      'PURCHASE': 'Compra',
      'PAYMENT': 'Pagamento',
      'RECEIPT': 'Recebimento',
      'MANUAL': 'Manual',
      'REVERSAL': 'Estorno',
      'CORRECTION': 'Correção'
    };
    return type ? labels[type] || type : 'Manual';
  }

  getSourceClass(type?: string): string {
    const classes: any = {
      'SALE': 'px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium',
      'PURCHASE': 'px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium',
      'PAYMENT': 'px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium',
      'RECEIPT': 'px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium',
      'MANUAL': 'px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium',
      'REVERSAL': 'px-2 py-0.5 bg-gray-200 text-gray-800 rounded text-xs font-medium border border-gray-300',
      'CORRECTION': 'px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-medium'
    };
    return type ? classes[type] || classes['MANUAL'] : classes['MANUAL'];
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'DRAFT': 'Rascunho',
      'POSTED': 'Lançado',
      'CANCELLED': 'Cancelado',
      'REVERSED': 'Estornado',
      'CORRECTED': 'Corrigido',
      'VOIDED': 'Anulado'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'DRAFT': 'px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium',
      'POSTED': 'px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium',
      'CANCELLED': 'px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium',
      'REVERSED': 'px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium line-through',
      'CORRECTED': 'px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium opacity-75',
      'VOIDED': 'px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-medium border border-red-100'
    };
    return classes[status] || '';
  }

  // Correction Logic
  initiateCorrection() {
    if (!this.selectedEntry) return;

    this.showCorrectionModal = true;
    this.correctionReason = '';

    // Clone entry for editing (deep copy of lines to avoid reference issues)
    this.editingEntry = {
      ...this.selectedEntry,
      description: this.selectedEntry.description + ' (Corrigido)',
      lines: this.selectedEntry.lines.map(line => ({ ...line }))
    };
  }

  cancelCorrection() {
    this.showCorrectionModal = false;
    this.correctionReason = '';
    this.editingEntry = { lines: [] };
  }

  addCorrectionLine() {
    this.editingEntry.lines.push({
      id: `TEMP-CORR-${Date.now()}-${Math.random()}`,
      accountId: '',
      accountCode: '',
      accountName: '',
      description: this.editingEntry.description || '',
      debit: 0,
      credit: 0
    });
  }

  removeCorrectionLine(index: number) {
    this.editingEntry.lines.splice(index, 1);
  }

  onValueChange(line: JournalLine, field: 'debit' | 'credit') {
    // Ensure only one has value if desired, or allow both but usually mutually exclusive
    if (field === 'debit' && line.debit > 0) line.credit = 0;
    if (field === 'credit' && line.credit > 0) line.debit = 0;
  }

  get editingTotalDebit(): number {
    return this.getTotalDebit(this.editingEntry);
  }

  get editingTotalCredit(): number {
    return this.getTotalCredit(this.editingEntry);
  }

  get isBalanced(): boolean {
    return Math.abs(this.editingTotalDebit - this.editingTotalCredit) < 0.01;
  }

  confirmCorrection() {
    if (!this.selectedEntry || !this.correctionReason || !this.isBalanced) return;

    try {
      this.accountingService.correctJournalEntry(
        this.selectedEntry.id,
        this.editingEntry,
        this.correctionReason,
        'CURRENT_USER' // Placeholder
      );

      this.showCorrectionModal = false;
      this.selectedEntry = null;
      this.loadEntries();
      alert('Lançamento corrigido com sucesso.');
    } catch (error: any) {
      alert(error.message);
    }
  }

  runCleanup() {
    if (confirm('Deseja limpar lançamentos com valor zero?\n\n- Rascunhos serão apagados.\n- Lançamentos postados serão anulados (VOIDED).')) {
      const result = this.accountingService.cleanupZeroValueEntries('CURRENT_USER');
      this.loadEntries();
      alert(`Limpeza concluída:\n- ${result.deleted} rascunhos apagados\n- ${result.voided} lançamentos anulados`);
    }
  }

  // Create New Entry Logic
  initiateCreate() {
    this.showCreateModal = true;
    this.newEntryDate = new Date().toISOString().split('T')[0];
    this.newEntry = {
      journalId: this.journals[0]?.id || '',
      description: '',
      reference: '',
      lines: []
    };
    // Add two initial lines for convenience
    this.addNewLine();
    this.addNewLine();
  }

  cancelCreate() {
    this.showCreateModal = false;
    this.newEntry = { lines: [] };
  }

  addNewLine() {
    this.newEntry.lines.push({
      id: `TEMP-${Date.now()}-${Math.random()}`,
      accountId: '',
      accountCode: '',
      accountName: '',
      description: this.newEntry.description || '',
      debit: 0,
      credit: 0
    });
  }

  removeLine(index: number) {
    this.newEntry.lines.splice(index, 1);
  }

  onAccountChange(line: JournalLine) {
    const account = this.accounts.find(a => a.id === line.accountId);
    if (account) {
      line.accountCode = account.code;
      line.accountName = account.name;
    }
  }

  get newEntryTotalDebit(): number {
    return this.getTotalDebit(this.newEntry);
  }

  get newEntryTotalCredit(): number {
    return this.getTotalCredit(this.newEntry);
  }

  get isNewEntryBalanced(): boolean {
    return Math.abs(this.newEntryTotalDebit - this.newEntryTotalCredit) < 0.01 && this.newEntryTotalDebit > 0;
  }

  get isNewEntryValid(): boolean {
    return !!this.newEntry.journalId &&
      !!this.newEntry.description &&
      this.newEntry.lines.length >= 2 &&
      this.newEntry.lines.every(l => !!l.accountId) &&
      this.isNewEntryBalanced;
  }

  saveNewEntry() {
    if (!this.isNewEntryValid) return;

    try {
      const entry: JournalEntry = {
        id: '', // Will be generated by service
        journalId: this.newEntry.journalId!,
        date: new Date(this.newEntryDate),
        description: this.newEntry.description!,
        reference: this.newEntry.reference || '',
        sourceType: 'MANUAL',
        status: 'POSTED',
        lines: this.newEntry.lines,
        createdBy: 'CURRENT_USER',
        createdAt: new Date()
      };

      this.accountingService.createManualJournalEntry(entry);

      this.showCreateModal = false;
      this.loadEntries();
      alert('Lançamento criado com sucesso.');
    } catch (error: any) {
      alert('Erro ao criar lançamento: ' + error.message);
    }
  }
}
