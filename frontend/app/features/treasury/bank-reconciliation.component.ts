import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../shared/accounting.service';

interface BankMovement {
    id: string;
    date: Date;
    description: string;
    reference: string;
    debit: number;
    credit: number;
    reconciled: boolean;
    reconciledDate?: Date;
}

@Component({
    selector: 'app-bank-reconciliation',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-indigo-700 text-white px-4 py-3 flex justify-between items-center shrink-0 shadow-md">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined">sync</span>
                <h2 class="font-bold text-sm uppercase tracking-wider">Reconciliação Bancária</h2>
            </div>
            <div class="flex gap-2">
                <button (click)="importSampleStatement()" class="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">upload_file</span>
                    Carregar Extrato
                </button>
            </div>
        </div>

        <!-- Toolbar & Selection -->
        <div class="p-4 bg-white border-b border-gray-300 shrink-0">
            <div class="grid grid-cols-4 gap-4 max-w-6xl">
                <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Conta Bancária</label>
                    <select 
                        [(ngModel)]="selectedBankAccount"
                        (ngModelChange)="loadMovements()"
                        class="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    >
                        <option value="">Selecione a conta...</option>
                        <option *ngFor="let acc of bankAccounts" [value]="acc.id">
                            {{ acc.code }} - {{ acc.name }} (Saldo: {{ acc.balance | number:'1.2-2' }})
                        </option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data do Extrato</label>
                    <input 
                        type="date" 
                        [(ngModel)]="statementDate"
                        class="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Saldo Final Extrato (MZN)</label>
                    <input 
                        type="number" 
                        [(ngModel)]="statementBalance"
                        step="0.01"
                        class="w-full px-3 py-1.5 border border-gray-300 rounded text-xs text-right font-mono font-bold focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                </div>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="flex-1 overflow-hidden p-4">
            <div class="grid grid-cols-2 gap-4 h-full">
                <!-- Left: System Movements -->
                <div class="bg-white rounded border border-gray-300 shadow-sm flex flex-col overflow-hidden">
                    <div class="p-2 bg-blue-50 border-b border-gray-300 flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-800 uppercase">Movimentos no Sistema</span>
                        <div class="flex items-center gap-4">
                            <span class="text-[10px] text-gray-500">Saldo: <span class="font-bold text-blue-700">{{ getSystemBalance() | number:'1.2-2' }}</span></span>
                            <input 
                                type="checkbox" 
                                (change)="toggleAllSystem($event)"
                                class="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                title="Selecionar todos"
                            />
                        </div>
                    </div>
                    <div class="flex-1 overflow-auto">
                        <table class="w-full text-[11px] border-collapse">
                            <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="border-b border-gray-200 px-2 py-2 text-left w-8">#</th>
                                    <th class="border-b border-gray-200 px-2 py-2 text-left w-20">Data</th>
                                    <th class="border-b border-gray-200 px-2 py-2 text-left">Descrição / Ref</th>
                                    <th class="border-b border-gray-200 px-2 py-2 text-right w-24">Débito (+)</th>
                                    <th class="border-b border-gray-200 px-2 py-2 text-right w-24">Crédito (-)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngIf="systemMovements.length === 0" class="h-32">
                                    <td colspan="5" class="text-center text-gray-400 italic">
                                        Selecione uma conta para ver os movimentos.
                                    </td>
                                </tr>
                                <tr 
                                    *ngFor="let mov of systemMovements"
                                    [class.bg-green-50]="mov.reconciled"
                                    (click)="!mov.reconciled && toggleMovement(mov, 'SYSTEM')"
                                    class="hover:bg-blue-50 border-b border-gray-100 transition-colors cursor-pointer group"
                                >
                                    <td class="px-2 py-1.5" (click)="$event.stopPropagation()">
                                        <input 
                                            type="checkbox" 
                                            [(ngModel)]="mov.reconciled"
                                            [disabled]="mov.reconciled && !isNewlySelected(mov)"
                                            class="rounded text-purple-600 cursor-pointer"
                                        />
                                    </td>
                                    <td class="px-2 py-1.5 text-gray-500">{{ mov.date | date:'dd/MM/yy' }}</td>
                                    <td class="px-2 py-1.5">
                                        <div class="font-medium">{{ mov.description }}</div>
                                        <div class="text-[9px] text-gray-400 uppercase">{{ mov.reference }}</div>
                                    </td>
                                    <td class="px-2 py-1.5 text-right font-mono font-bold text-green-600">
                                        {{ mov.debit > 0 ? (mov.debit | number:'1.2-2') : '' }}
                                    </td>
                                    <td class="px-2 py-1.5 text-right font-mono font-bold text-red-600">
                                        {{ mov.credit > 0 ? (mov.credit | number:'1.2-2') : '' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Right: Bank Statement Movements -->
                <div class="bg-white rounded border border-gray-300 shadow-sm flex flex-col overflow-hidden">
                    <div class="p-2 bg-green-50 border-b border-gray-300 flex justify-between items-center">
                        <span class="text-xs font-bold text-green-800 uppercase">Extrato Bancário</span>
                        <div class="flex items-center gap-4">
                            <span class="text-[10px] text-gray-500">Total Selecionado: <span class="font-bold text-green-700">{{ getBankSelectedTotal() | number:'1.2-2' }}</span></span>
                            <input 
                                type="checkbox" 
                                (change)="toggleAllBank($event)"
                                class="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                title="Selecionar todos"
                            />
                        </div>
                    </div>
                    <div class="flex-1 overflow-auto">
                        <table class="w-full text-[11px] border-collapse">
                            <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="border-b border-gray-200 px-2 py-2 text-left w-8">#</th>
                                    <th class="border-b border-gray-200 px-2 py-2 text-left w-20">Data</th>
                                    <th class="border-b border-gray-200 px-2 py-2 text-left">Descrição</th>
                                    <th class="border-b border-gray-200 px-2 py-2 text-right w-24">Débito (+)</th>
                                    <th class="border-b border-gray-200 px-2 py-2 text-right w-24">Crédito (-)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngIf="bankStatementMovements.length === 0" class="h-32">
                                    <td colspan="5" class="text-center text-gray-400 italic">
                                        Importe ou carregue um exemplo de extrato.
                                    </td>
                                </tr>
                                <tr 
                                    *ngFor="let mov of bankStatementMovements"
                                    [class.bg-green-50]="mov.reconciled"
                                    (click)="toggleMovement(mov, 'BANK')"
                                    class="hover:bg-blue-50 border-b border-gray-100 transition-colors cursor-pointer"
                                >
                                    <td class="px-2 py-1.5" (click)="$event.stopPropagation()">
                                        <input 
                                            type="checkbox" 
                                            [(ngModel)]="mov.reconciled"
                                            class="rounded text-purple-600 cursor-pointer"
                                        />
                                    </td>
                                    <td class="px-2 py-1.5 text-gray-500">{{ mov.date | date:'dd/MM/yy' }}</td>
                                    <td class="px-2 py-1.5 font-medium">{{ mov.description }}</td>
                                    <td class="px-2 py-1.5 text-right font-mono font-bold text-green-600">
                                        {{ mov.debit > 0 ? (mov.debit | number:'1.2-2') : '' }}
                                    </td>
                                    <td class="px-2 py-1.5 text-right font-mono font-bold text-red-600">
                                        {{ mov.credit > 0 ? (mov.credit | number:'1.2-2') : '' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Summary Bar -->
        <div class="p-4 bg-gray-50 border-t border-gray-300 shrink-0 shadow-inner">
            <div class="grid grid-cols-4 gap-6 text-xs max-w-6xl mx-auto">
                <div class="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-col justify-center">
                    <span class="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Sistema (A)</span>
                    <span class="font-mono font-bold text-lg text-blue-600">{{ getSystemBalance() | number:'1.2-2' }}</span>
                </div>
                <div class="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-col justify-center">
                    <span class="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Extrato (B)</span>
                    <span class="font-mono font-bold text-lg text-green-600">{{ statementBalance | number:'1.2-2' }}</span>
                </div>
                <div 
                    class="p-3 rounded border shadow-sm flex flex-col justify-center transition-all duration-500"
                    [class]="getDifference() === 0 ? 'bg-green-600 border-green-700 text-white' : 'bg-red-50 border-red-200 text-red-700'"
                >
                    <span class="text-[10px] uppercase font-bold opacity-80 mb-1">Diferença (A - B)</span>
                    <div class="flex justify-between items-center">
                        <span class="font-mono font-bold text-xl">{{ getDifference() | number:'1.2-2' }}</span>
                        <span *ngIf="getDifference() === 0" class="material-symbols-outlined">verified</span>
                    </div>
                </div>
                <div class="flex items-center justify-end">
                    <button 
                        (click)="saveReconciliation()"
                        [disabled]="getDifference() !== 0 || !selectedBankAccount"
                        class="px-6 py-3 bg-purple-600 text-white rounded shadow-lg hover:shadow-xl hover:bg-purple-700 active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center gap-2"
                    >
                        <span class="material-symbols-outlined">save</span>
                        EFETUAR RECONCILIAÇÃO
                    </button>
                </div>
            </div>
        </div>
    </div>
    `
})
export class BankReconciliationComponent implements OnInit {
    selectedBankAccount = '';
    statementDate = '';
    statementBalance = 0;

    bankAccounts: any[] = [];
    systemMovements: BankMovement[] = [];
    bankStatementMovements: BankMovement[] = [];
    newlySelectedIds = new Set<string>();

    constructor(private accountingService: AccountingService) { }

    ngOnInit() {
        this.statementDate = new Date().toISOString().split('T')[0];
        this.loadBankAccounts();
    }

    loadBankAccounts() {
        const allAccounts = this.accountingService.getAccounts();
        this.bankAccounts = allAccounts.filter(a => (a.code.startsWith('12') || a.code.startsWith('1.2') || a.code.startsWith('11.1.2') || a.code.startsWith('1.1')) && a.allowPosting);
    }

    loadMovements() {
        if (!this.selectedBankAccount) {
            this.systemMovements = [];
            return;
        }

        // Load REAL system movements from accounting
        const allEntries = this.accountingService.getJournalEntries();
        this.systemMovements = [];
        this.newlySelectedIds.clear();

        allEntries.forEach(entry => {
            const accountLines = entry.lines.filter(line => line.accountId === this.selectedBankAccount);

            accountLines.forEach(line => {
                // In a real system, we'd check if this line ID is in a table of reconciled movements
                const isAlreadyReconciled = false;

                this.systemMovements.push({
                    id: line.id,
                    date: new Date(entry.date),
                    description: line.description || entry.description,
                    reference: entry.reference || entry.id,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    reconciled: isAlreadyReconciled
                });
            });
        });

        this.systemMovements.sort((a, b) => b.date.getTime() - a.date.getTime());
        this.bankStatementMovements = [];
    }

    toggleMovement(mov: BankMovement, side: 'SYSTEM' | 'BANK') {
        mov.reconciled = !mov.reconciled;
        if (side === 'SYSTEM') {
            if (mov.reconciled) this.newlySelectedIds.add(mov.id);
            else this.newlySelectedIds.delete(mov.id);
        }
    }

    isNewlySelected(mov: BankMovement): boolean {
        return this.newlySelectedIds.has(mov.id);
    }

    importSampleStatement() {
        if (!this.selectedBankAccount) {
            alert('Por favor, selecione uma conta bancária primeiro.');
            return;
        }
        this.bankStatementMovements = this.generateSampleBankMovements();
        alert('Extrato de exemplo carregado com sucesso.');
    }

    generateSampleBankMovements(): BankMovement[] {
        return [
            { id: 'B1', date: new Date(), description: 'DEPÓSITO NUMERÁRIO', reference: 'DEP01', debit: 5000, credit: 0, reconciled: false },
            { id: 'B2', date: new Date(), description: 'PAGAMENTO SERVIÇOS', reference: 'TRF02', debit: 0, credit: 1250, reconciled: false },
            { id: 'B3', date: new Date(), description: 'ANUIDADE CARTÃO', reference: 'TAX', debit: 0, credit: 150, reconciled: false }
        ];
    }

    toggleAllSystem(event: any) {
        const checked = event.target.checked;
        this.systemMovements.forEach(m => {
            m.reconciled = checked;
            if (checked) this.newlySelectedIds.add(m.id);
            else this.newlySelectedIds.delete(m.id);
        });
    }

    toggleAllBank(event: any) {
        const checked = event.target.checked;
        this.bankStatementMovements.forEach(m => m.reconciled = checked);
    }

    getSystemBalance(): number {
        return this.systemMovements.reduce((sum, m) => sum + m.debit - m.credit, 0);
    }

    getBankSelectedTotal(): number {
        return this.bankStatementMovements
            .filter(m => m.reconciled)
            .reduce((sum, m) => sum + m.debit - m.credit, 0);
    }

    getDifference(): number {
        const sys = this.getSystemBalance();
        const diff = Math.abs(sys - this.statementBalance);
        return diff < 0.01 ? 0 : diff;
    }

    saveReconciliation() {
        if (this.getDifference() !== 0) {
            alert('A diferença deve ser zero para efetuar a reconciliação');
            return;
        }

        const reconciliation = {
            id: `RECON-${Date.now()}`,
            accountId: this.selectedBankAccount,
            date: new Date(this.statementDate),
            statementBalance: this.statementBalance,
            systemBalance: this.getSystemBalance(),
            reconciledItemsCount: this.systemMovements.filter(m => m.reconciled).length,
            status: 'COMPLETED',
            createdAt: new Date(),
            createdBy: 'admin'
        };

        // In a real system, we'd persist the link between movements and this RECON ID
        const stored = localStorage.getItem('erp_reconciliations');
        const list = stored ? JSON.parse(stored) : [];
        list.push(reconciliation);
        localStorage.setItem('erp_reconciliations', JSON.stringify(list));

        alert('Reconciliação Bancária efetuada e gravada com sucesso!');
        this.loadMovements(); // Refresh
    }
}
