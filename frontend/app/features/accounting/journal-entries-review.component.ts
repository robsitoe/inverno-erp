import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../shared/accounting.service';
import { JournalEntry, JournalLine, Account } from '../../shared/models';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-journal-entries-review',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="flex flex-col h-full bg-white">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-gray-50">
            <div>
                <h2 class="text-lg font-semibold text-gray-800">Revisão de Lançamentos Contabilísticos</h2>
                <p class="text-xs text-gray-500 mt-0.5">Validação de lançamentos em rascunho</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-sm">
                    <span class="text-gray-600">Rascunhos pendentes:</span>
                    <span class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 font-semibold rounded">
                        {{ draftEntries.length }}
                    </span>
                </div>
                <button 
                    *ngIf="selectedEntries.length > 0"
                    (click)="postSelectedEntries()"
                    class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                    <span class="material-symbols-outlined text-lg">check_circle</span>
                    <span>Validar Selecionados ({{ selectedEntries.length }})</span>
                </button>
            </div>
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
            <button 
                *ngFor="let filter of filters"
                (click)="currentFilter = filter.value"
                [class]="'px-3 py-1.5 text-xs font-medium rounded transition-colors ' + 
                    (currentFilter === filter.value 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300')"
            >
                {{ filter.label }}
                <span *ngIf="filter.count > 0" class="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {{ filter.count }}
                </span>
            </button>
        </div>

        <!-- Entries List -->
        <div class="flex-1 overflow-auto">
            <table class="w-full text-xs">
                <thead class="bg-gray-100 sticky top-0 z-10">
                    <tr>
                        <th class="px-3 py-2 text-left border-b">
                            <input 
                                type="checkbox" 
                                (change)="toggleSelectAll($event)"
                                [checked]="selectedEntries.length === filteredEntries.length && filteredEntries.length > 0"
                                class="w-4 h-4"
                            />
                        </th>
                        <th class="px-3 py-2 text-left border-b font-medium text-gray-700">ID</th>
                        <th class="px-3 py-2 text-left border-b font-medium text-gray-700">Data</th>
                        <th class="px-3 py-2 text-left border-b font-medium text-gray-700">Diário</th>
                        <th class="px-3 py-2 text-left border-b font-medium text-gray-700">Descrição</th>
                        <th class="px-3 py-2 text-left border-b font-medium text-gray-700">Referência</th>
                        <th class="px-3 py-2 text-right border-b font-medium text-gray-700">Débito</th>
                        <th class="px-3 py-2 text-right border-b font-medium text-gray-700">Crédito</th>
                        <th class="px-3 py-2 text-center border-b font-medium text-gray-700">Status</th>
                        <th class="px-3 py-2 text-center border-b font-medium text-gray-700">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <ng-container *ngFor="let entry of filteredEntries">
                        <tr 
                            class="hover:bg-blue-50 cursor-pointer transition-colors"
                            [class.bg-blue-50]="selectedEntries.includes(entry.id)"
                            (click)="toggleSelection(entry.id)"
                        >
                            <td class="px-3 py-2 border-b" (click)="$event.stopPropagation()">
                                <input 
                                    type="checkbox" 
                                    [checked]="selectedEntries.includes(entry.id)"
                                    (change)="toggleSelection(entry.id)"
                                    class="w-4 h-4"
                                />
                            </td>
                            <td class="px-3 py-2 border-b font-mono text-blue-600 font-semibold">{{ entry.id }}</td>
                            <td class="px-3 py-2 border-b text-gray-700">{{ entry.date | date:'dd/MM/yyyy' }}</td>
                            <td class="px-3 py-2 border-b text-gray-600">{{ getJournalName(entry.journalId) }}</td>
                            <td class="px-3 py-2 border-b text-gray-800">{{ entry.description }}</td>
                            <td class="px-3 py-2 border-b text-gray-600">{{ entry.reference }}</td>
                            <td class="px-3 py-2 border-b text-right font-mono">{{ getTotalDebit(entry) | number:'1.2-2' }}</td>
                            <td class="px-3 py-2 border-b text-right font-mono">{{ getTotalCredit(entry) | number:'1.2-2' }}</td>
                            <td class="px-3 py-2 border-b text-center">
                                <span [class]="getStatusClass(entry.status)">
                                    {{ getStatusLabel(entry.status) }}
                                </span>
                            </td>
                            <td class="px-3 py-2 border-b text-center" (click)="$event.stopPropagation()">
                                <div class="flex items-center justify-center gap-1">
                                    <button 
                                        *ngIf="entry.status === 'DRAFT'"
                                        (click)="viewEntry(entry)"
                                        class="p-1 hover:bg-blue-100 rounded transition-colors"
                                        title="Ver detalhes"
                                    >
                                        <span class="material-symbols-outlined text-lg text-blue-600">visibility</span>
                                    </button>
                                    <button 
                                        *ngIf="entry.status === 'DRAFT'"
                                        (click)="editEntry(entry)"
                                        class="p-1 hover:bg-yellow-100 rounded transition-colors"
                                        title="Editar / Corrigir"
                                    >
                                        <span class="material-symbols-outlined text-lg text-yellow-600">edit</span>
                                    </button>
                                    <button 
                                        *ngIf="entry.status === 'DRAFT'"
                                        (click)="postSingleEntry(entry.id)"
                                        class="p-1 hover:bg-green-100 rounded transition-colors"
                                        title="Validar e postar"
                                    >
                                        <span class="material-symbols-outlined text-lg text-green-600">check_circle</span>
                                    </button>
                                    <button 
                                        *ngIf="canReverse(entry)"
                                        (click)="reverseEntry(entry.id)"
                                        class="p-1 hover:bg-red-100 rounded transition-colors"
                                        title="Estornar (Anular)"
                                    >
                                        <span class="material-symbols-outlined text-lg text-red-600">history_toggle_off</span>
                                    </button>
                                    <button 
                                        *ngIf="entry.status === 'DRAFT'"
                                        (click)="cancelEntry(entry.id)"
                                        class="p-1 hover:bg-red-100 rounded transition-colors"
                                        title="Cancelar"
                                    >
                                        <span class="material-symbols-outlined text-lg text-red-600">cancel</span>
                                    </button>
                                    <button 
                                        *ngIf="entry.status === 'CANCELLED' || entry.status === 'VOIDED'"
                                        (click)="reuseEntry(entry)"
                                        class="p-1 hover:bg-blue-100 rounded transition-colors"
                                        title="Reutilizar (Criar Rascunho)"
                                    >
                                        <span class="material-symbols-outlined text-lg text-blue-600">content_copy</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <!-- Expandable Details -->
                        <tr *ngIf="expandedEntry === entry.id" class="bg-gray-50">
                            <td colspan="10" class="px-6 py-4">
                                <div class="space-y-3">
                                    <h4 class="font-semibold text-gray-800 mb-2">Linhas do Lançamento:</h4>
                                    <table class="w-full text-xs">
                                        <thead class="bg-gray-200">
                                            <tr>
                                                <th class="px-2 py-1 text-left">Conta</th>
                                                <th class="px-2 py-1 text-left">Nome da Conta</th>
                                                <th class="px-2 py-1 text-left">Descrição</th>
                                                <th class="px-2 py-1 text-right">Débito</th>
                                                <th class="px-2 py-1 text-right">Crédito</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr *ngFor="let line of entry.lines" class="border-b">
                                                <td class="px-2 py-1 font-mono text-blue-600">{{ line.accountCode }}</td>
                                                <td class="px-2 py-1 text-gray-700">{{ line.accountName }}</td>
                                                <td class="px-2 py-1 text-gray-600">{{ line.description }}</td>
                                                <td class="px-2 py-1 text-right font-mono">{{ line.debit | number:'1.2-2' }}</td>
                                                <td class="px-2 py-1 text-right font-mono">{{ line.credit | number:'1.2-2' }}</td>
                                            </tr>
                                        </tbody>
                                        <tfoot class="bg-gray-100 font-semibold">
                                            <tr>
                                                <td colspan="3" class="px-2 py-1 text-right">Total:</td>
                                                <td class="px-2 py-1 text-right font-mono">{{ getTotalDebit(entry) | number:'1.2-2' }}</td>
                                                <td class="px-2 py-1 text-right font-mono">{{ getTotalCredit(entry) | number:'1.2-2' }}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    <div class="flex items-center gap-2 text-xs text-gray-600 mt-2">
                                        <span><strong>Criado por:</strong> {{ entry.createdBy }}</span>
                                        <span>•</span>
                                        <span><strong>Em:</strong> {{ entry.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                                        <span *ngIf="entry.sourceType">•</span>
                                        <span *ngIf="entry.sourceType"><strong>Origem:</strong> {{ entry.sourceType }}</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </ng-container>
                    <tr *ngIf="filteredEntries.length === 0">
                        <td colspan="10" class="px-3 py-8 text-center text-gray-400 italic">
                            Nenhum lançamento encontrado
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Status Messages -->
        <div *ngIf="statusMessage" 
             [class]="'px-4 py-3 border-t ' + (statusMessage.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200')">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined">
                    {{ statusMessage.type === 'success' ? 'check_circle' : 'error' }}
                </span>
                <span>{{ statusMessage.text }}</span>
            </div>
        </div>

        <!-- Edit Modal -->
        <div *ngIf="showEditModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl w-[900px] max-h-[90vh] overflow-auto p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Editar Lançamento ({{ editingEntry.id }})</h3>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Data</label>
                        <input type="date" [(ngModel)]="editingEntryDate" class="w-full border border-gray-300 rounded p-1.5 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Referência</label>
                        <input [(ngModel)]="editingEntry.reference" class="w-full border border-gray-300 rounded p-1.5 text-sm">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                        <input [(ngModel)]="editingEntry.description" class="w-full border border-gray-300 rounded p-1.5 text-sm">
                    </div>
                </div>

                <div class="mb-4 border-t pt-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-semibold text-gray-700">Linhas do Lançamento</h4>
                        <button (click)="addEditLine()" class="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">
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
                                        (ngModelChange)="onEditValueChange(line, 'debit')"
                                        class="w-full text-right border border-gray-200 rounded px-1 py-0.5 focus:border-blue-500 outline-none"
                                    />
                                </td>
                                <td class="p-2 border">
                                    <input 
                                        type="number" 
                                        [(ngModel)]="line.credit" 
                                        (ngModelChange)="onEditValueChange(line, 'credit')"
                                        class="w-full text-right border border-gray-200 rounded px-1 py-0.5 focus:border-blue-500 outline-none"
                                    />
                                </td>
                                <td class="p-2 border text-center">
                                    <button (click)="removeEditLine(i)" class="text-red-500 hover:text-red-700">
                                        <span class="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                </td>
                            </tr>
                            <tr class="bg-gray-50 font-bold">
                                <td colspan="2" class="p-2 border text-right">TOTAIS:</td>
                                <td class="p-2 border text-right font-mono" [class.text-red-600]="!isEditingBalanced">{{ editingTotalDebit | number:'1.2-2' }}</td>
                                <td class="p-2 border text-right font-mono" [class.text-red-600]="!isEditingBalanced">{{ editingTotalCredit | number:'1.2-2' }}</td>
                                <td class="border"></td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div *ngIf="!isEditingBalanced" class="text-red-600 text-xs font-bold text-right">
                        O lançamento não está balanceado (Diferença: {{ (editingTotalDebit - editingTotalCredit) | number:'1.2-2' }})
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button (click)="cancelEdit()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                        Cancelar
                    </button>
                    <button 
                        (click)="saveEdit()" 
                        [disabled]="!isEditingValid"
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Gravar Alterações
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,
    styles: [`
        :host {
            display: block;
            height: 100%;
        }
    `]
})
export class JournalEntriesReviewComponent implements OnInit {
    draftEntries: JournalEntry[] = [];
    allEntries: JournalEntry[] = [];
    selectedEntries: string[] = [];
    expandedEntry: string | null = null;
    currentFilter: 'all' | 'draft' | 'posted' | 'cancelled' = 'draft';
    statusMessage: { type: 'success' | 'error'; text: string } | null = null;
    accounts: Account[] = [];

    // Edit State
    showEditModal = false;
    editingEntry: Partial<JournalEntry> & { lines: JournalLine[] } = { lines: [] };
    editingEntryDate: string = '';

    filters = [
        { label: 'Rascunhos', value: 'draft' as const, count: 0 },
        { label: 'Validados', value: 'posted' as const, count: 0 },
        { label: 'Cancelados', value: 'cancelled' as const, count: 0 },
        { label: 'Todos', value: 'all' as const, count: 0 }
    ];

    private subs = new Subscription();

    constructor(
        private accountingService: AccountingService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        // Subscribe to Entries
        this.subs.add(
            this.accountingService.entriesChanged$.subscribe(entries => {
                this.allEntries = entries;
                this.draftEntries = entries.filter(e => e.status === 'DRAFT');
                this.updateFilterCounts();
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

        this.loadEntries();
        this.loadAccounts();
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
    }

    loadEntries() {
        this.allEntries = this.accountingService.getJournalEntries();
        this.draftEntries = this.allEntries.filter(e => e.status === 'DRAFT');
        this.updateFilterCounts();
    }

    private updateFilterCounts() {
        this.filters[0].count = this.draftEntries.length;
        this.filters[1].count = this.allEntries.filter(e => e.status === 'POSTED').length;
        this.filters[2].count = this.allEntries.filter(e => e.status === 'CANCELLED' || e.status === 'VOIDED').length;
        this.filters[3].count = this.allEntries.length;
    }

    loadAccounts() {
        this.accounts = this.accountingService.getAccounts().sort((a, b) => a.code.localeCompare(b.code));
    }

    get filteredEntries(): JournalEntry[] {
        let entries: JournalEntry[] = [];
        switch (this.currentFilter) {
            case 'draft':
                entries = this.draftEntries;
                break;
            case 'posted':
                entries = this.allEntries.filter(e => e.status === 'POSTED');
                break;
            case 'cancelled':
                entries = this.allEntries.filter(e => e.status === 'CANCELLED' || e.status === 'VOIDED');
                break;
            default:
                entries = this.allEntries;
        }
        // Strict filter for valid entries
        return entries.filter(e => e.id && e.date);
    }

    toggleSelection(entryId: string) {
        const index = this.selectedEntries.indexOf(entryId);
        if (index > -1) {
            this.selectedEntries.splice(index, 1);
        } else {
            this.selectedEntries.push(entryId);
        }
    }

    toggleSelectAll(event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        if (checked) {
            this.selectedEntries = this.filteredEntries.map(e => e.id);
        } else {
            this.selectedEntries = [];
        }
    }

    viewEntry(entry: JournalEntry) {
        this.expandedEntry = this.expandedEntry === entry.id ? null : entry.id;
    }

    postSingleEntry(entryId: string) {
        try {
            this.accountingService.postJournalEntry(entryId, 'Contabilista'); // TODO: Get real user
            this.showSuccess(`Lançamento ${entryId} validado e postado com sucesso!`);
            this.loadEntries();
            this.selectedEntries = this.selectedEntries.filter(id => id !== entryId);
        } catch (error: any) {
            this.showError(`Erro ao validar lançamento: ${error.message}`);
        }
    }

    postSelectedEntries() {
        if (this.selectedEntries.length === 0) return;

        const result = this.accountingService.postMultipleEntries(this.selectedEntries, 'Contabilista');

        if (result.success.length > 0) {
            this.showSuccess(`${result.success.length} lançamento(s) validado(s) com sucesso!`);
        }

        if (result.failed.length > 0) {
            const errors = result.failed.map(f => `${f.id}: ${f.error}`).join('; ');
            this.showError(`Falha ao validar ${result.failed.length} lançamento(s): ${errors}`);
        }

        this.loadEntries();
        this.selectedEntries = [];
    }

    cancelEntry(entryId: string) {
        const reason = prompt('Motivo do cancelamento:');
        if (!reason) return;

        try {
            this.accountingService.cancelDraftEntry(entryId, 'Contabilista', reason);
            this.showSuccess(`Lançamento ${entryId} cancelado.`);
            this.loadEntries();
        } catch (error: any) {
            this.showError(`Erro ao cancelar: ${error.message}`);
        }
    }

    canReverse(entry: JournalEntry): boolean {
        if (entry.status !== 'POSTED') return false;
        if (entry.sourceType === 'REVERSAL') return false; // Cannot reverse a reversal

        // Check if there is already a reversal (draft or posted) for this entry
        const hasReversal = this.allEntries.some(e =>
            e.relatedEntryId === entry.id &&
            e.sourceType === 'REVERSAL' &&
            e.status !== 'CANCELLED' &&
            e.status !== 'VOIDED'
        );

        return !hasReversal;
    }

    reverseEntry(entryId: string) {
        const reason = prompt('Motivo do estorno (Obrigatório):');
        if (!reason) return;

        try {
            this.accountingService.reverseJournalEntry(entryId, reason, 'Contabilista');
            this.showSuccess(`Lançamento ${entryId} estornado com sucesso.`);
            this.loadEntries();
        } catch (error: any) {
            this.showError(`Erro ao estornar: ${error.message}`);
        }
    }

    reuseEntry(entry: JournalEntry) {
        try {
            const newEntry: JournalEntry = {
                ...entry,
                id: '', // Service will generate
                date: new Date(),
                description: entry.description + ' (Cópia)',
                status: 'DRAFT',
                sourceType: 'MANUAL',
                createdBy: 'Contabilista',
                createdAt: new Date(),
                updatedBy: undefined,
                updatedAt: undefined,
                correctionReason: undefined,
                relatedEntryId: undefined,
                lines: entry.lines.map(l => ({
                    ...l,
                    id: `LINE-${Date.now()}-${Math.random()}`
                }))
            };

            this.accountingService.createManualJournalEntry(newEntry);
            this.showSuccess('Rascunho criado a partir do lançamento cancelado.');
            this.loadEntries();
        } catch (error: any) {
            this.showError(`Erro ao reutilizar: ${error.message}`);
        }
    }

    // Edit Logic
    editEntry(entry: JournalEntry) {
        this.editingEntry = {
            ...entry,
            lines: entry.lines.map(line => ({ ...line })) // Deep copy lines
        };
        this.editingEntryDate = new Date(entry.date).toISOString().split('T')[0];
        this.showEditModal = true;
    }

    cancelEdit() {
        this.showEditModal = false;
        this.editingEntry = { lines: [] };
    }

    addEditLine() {
        this.editingEntry.lines.push({
            id: `TEMP-${Date.now()}-${Math.random()}`,
            accountId: '',
            accountCode: '',
            accountName: '',
            description: this.editingEntry.description || '',
            debit: 0,
            credit: 0
        });
    }

    removeEditLine(index: number) {
        this.editingEntry.lines.splice(index, 1);
    }

    onAccountChange(line: JournalLine) {
        const account = this.accounts.find(a => a.id === line.accountId);
        if (account) {
            line.accountCode = account.code;
            line.accountName = account.name;
        }
    }

    onEditValueChange(line: JournalLine, field: 'debit' | 'credit') {
        if (field === 'debit' && line.debit > 0) line.credit = 0;
        if (field === 'credit' && line.credit > 0) line.debit = 0;
    }

    get editingTotalDebit(): number {
        return this.editingEntry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    }

    get editingTotalCredit(): number {
        return this.editingEntry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    }

    get isEditingBalanced(): boolean {
        return Math.abs(this.editingTotalDebit - this.editingTotalCredit) < 0.01 && this.editingTotalDebit > 0;
    }

    get isEditingValid(): boolean {
        return !!this.editingEntry.description &&
            this.editingEntry.lines.length >= 2 &&
            this.editingEntry.lines.every(l => !!l.accountId) &&
            this.isEditingBalanced;
    }

    saveEdit() {
        if (!this.isEditingValid || !this.editingEntry.id) return;

        try {
            this.accountingService.updateJournalEntry(
                this.editingEntry.id,
                {
                    ...this.editingEntry,
                    date: new Date(this.editingEntryDate)
                },
                'Contabilista'
            );

            this.showSuccess(`Lançamento ${this.editingEntry.id} atualizado com sucesso.`);
            this.showEditModal = false;
            this.loadEntries();
        } catch (error: any) {
            this.showError(`Erro ao atualizar: ${error.message}`);
        }
    }

    getTotalDebit(entry: JournalEntry): number {
        if (!entry || !entry.lines) return 0;
        return entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    }

    getTotalCredit(entry: JournalEntry): number {
        if (!entry || !entry.lines) return 0;
        return entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    }

    getJournalName(journalId: string): string {
        const journal = this.accountingService.getJournal(journalId);
        return journal ? journal.name : journalId;
    }

    getStatusClass(status: string): string {
        const baseClasses = 'px-2 py-1 rounded text-xs font-medium ';
        switch (status) {
            case 'DRAFT':
                return baseClasses + 'bg-yellow-100 text-yellow-800';
            case 'POSTED':
                return baseClasses + 'bg-green-100 text-green-800';
            case 'CANCELLED':
                return baseClasses + 'bg-red-100 text-red-800';
            case 'CORRECTED':
                return baseClasses + 'bg-blue-100 text-blue-800';
            default:
                return baseClasses + 'bg-gray-100 text-gray-800';
        }
    }

    getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            'DRAFT': 'Rascunho',
            'POSTED': 'Validado',
            'CANCELLED': 'Cancelado',
            'CORRECTED': 'Corrigido',
            'REVERSED': 'Estornado',
            'VOIDED': 'Anulado'
        };
        return labels[status] || status;
    }

    private showSuccess(message: string) {
        this.statusMessage = { type: 'success', text: message };
        setTimeout(() => this.statusMessage = null, 5000);
    }

    private showError(message: string) {
        this.statusMessage = { type: 'error', text: message };
        setTimeout(() => this.statusMessage = null, 8000);
    }
}
