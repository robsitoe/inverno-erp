import { Component, EventEmitter, Output, OnInit } from '@angular/core';
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
    selector: 'app-bank-reconciliation-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded shadow-lg w-[1200px] max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="bg-purple-600 text-white px-4 py-3 flex justify-between items-center shrink-0">
          <h2 class="font-bold text-sm">Reconciliação Bancária</h2>
          <button (click)="close.emit()" class="hover:bg-purple-700 rounded p-1">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Account Selection -->
        <div class="p-3 bg-gray-50 border-b border-gray-300 shrink-0">
          <div class="grid grid-cols-4 gap-3">
            <div class="col-span-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Conta Bancária *</label>
              <select 
                [(ngModel)]="selectedBankAccount"
                (ngModelChange)="loadMovements()"
                class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione a conta...</option>
                <option *ngFor="let acc of bankAccounts" [value]="acc.id">
                  {{ acc.code }} - {{ acc.name }} (Saldo: {{ acc.balance | number:'1.2-2' }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Data do Extrato</label>
              <input 
                type="date" 
                [(ngModel)]="statementDate"
                class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Saldo do Extrato</label>
              <input 
                type="number" 
                [(ngModel)]="statementBalance"
                step="0.01"
                class="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto">
          <div class="grid grid-cols-2 h-full">
            <!-- Left: System Movements -->
            <div class="border-r border-gray-300 flex flex-col">
              <div class="p-2 bg-blue-50 border-b border-gray-300">
                <h3 class="font-semibold text-xs text-gray-700">Movimentos no Sistema</h3>
              </div>
              <div class="flex-1 overflow-auto">
                <table class="w-full text-xs border-collapse">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr>
                      <th class="border-b border-gray-300 px-2 py-1 text-left w-8">
                        <input 
                          type="checkbox" 
                          (change)="toggleAllSystem($event)"
                          class="rounded"
                        />
                      </th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left w-20">Data</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left">Descrição</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-right w-24">Débito</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-right w-24">Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngIf="systemMovements.length === 0">
                      <td colspan="5" class="p-4 text-center text-gray-400 italic">
                        Nenhum movimento encontrado para esta conta.
                      </td>
                    </tr>
                    <tr 
                      *ngFor="let mov of systemMovements"
                      [class.bg-green-50]="mov.reconciled"
                      class="hover:bg-blue-50 border-b border-gray-100"
                    >
                      <td class="px-2 py-1">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="mov.reconciled"
                          [disabled]="mov.reconciled"
                          class="rounded"
                        />
                      </td>
                      <td class="px-2 py-1">{{ mov.date | date:'dd/MM/yy' }}</td>
                      <td class="px-2 py-1 text-[11px]">{{ mov.description }}</td>
                      <td class="px-2 py-1 text-right font-mono text-green-600">
                        {{ mov.debit > 0 ? (mov.debit | number:'1.2-2') : '' }}
                      </td>
                      <td class="px-2 py-1 text-right font-mono text-red-600">
                        {{ mov.credit > 0 ? (mov.credit | number:'1.2-2') : '' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Right: Bank Statement -->
            <div class="flex flex-col">
              <div class="p-2 bg-green-50 border-b border-gray-300 flex justify-between items-center">
                <h3 class="font-semibold text-xs text-gray-700">Extrato Bancário</h3>
                <button 
                  *ngIf="bankStatementMovements.length === 0"
                  (click)="importSampleStatement()"
                  class="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700"
                >
                  Carregar Exemplo
                </button>
              </div>
              <div class="flex-1 overflow-auto">
                <table class="w-full text-xs border-collapse">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr>
                      <th class="border-b border-gray-300 px-2 py-1 text-left w-8">
                        <input 
                          type="checkbox" 
                          (change)="toggleAllBank($event)"
                          class="rounded"
                        />
                      </th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left w-20">Data</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-left">Descrição</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-right w-24">Débito</th>
                      <th class="border-b border-gray-300 px-2 py-1 text-right w-24">Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngIf="bankStatementMovements.length === 0">
                      <td colspan="5" class="p-4 text-center text-gray-400 italic">
                        Nenhum extrato importado.
                      </td>
                    </tr>
                    <tr 
                      *ngFor="let mov of bankStatementMovements"
                      [class.bg-green-50]="mov.reconciled"
                      class="hover:bg-blue-50 border-b border-gray-100"
                    >
                      <td class="px-2 py-1">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="mov.reconciled"
                          class="rounded"
                        />
                      </td>
                      <td class="px-2 py-1">{{ mov.date | date:'dd/MM/yy' }}</td>
                      <td class="px-2 py-1 text-[11px]">{{ mov.description }}</td>
                      <td class="px-2 py-1 text-right font-mono text-green-600">
                        {{ mov.debit > 0 ? (mov.debit | number:'1.2-2') : '' }}
                      </td>
                      <td class="px-2 py-1 text-right font-mono text-red-600">
                        {{ mov.credit > 0 ? (mov.credit | number:'1.2-2') : '' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="p-3 bg-gray-50 border-t border-gray-300 shrink-0">
          <div class="grid grid-cols-3 gap-4 text-xs">
            <!-- System Summary -->
            <div class="bg-blue-50 p-2 rounded border border-blue-200">
              <div class="font-semibold text-gray-700 mb-2">Sistema</div>
              <div class="space-y-1">
                <div class="flex justify-between">
                  <span class="text-gray-600">Saldo Contabilístico:</span>
                  <span class="font-mono font-bold">{{ getSystemBalance() | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Movimentos Selecionados:</span>
                  <span class="font-mono">{{ getSystemSelectedCount() }}</span>
                </div>
              </div>
            </div>

            <!-- Bank Summary -->
            <div class="bg-green-50 p-2 rounded border border-green-200">
              <div class="font-semibold text-gray-700 mb-2">Extrato Bancário</div>
              <div class="space-y-1">
                <div class="flex justify-between">
                  <span class="text-gray-600">Saldo do Extrato:</span>
                  <span class="font-mono font-bold">{{ statementBalance | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Movimentos Selecionados:</span>
                  <span class="font-mono">{{ getBankSelectedCount() }}</span>
                </div>
              </div>
            </div>

            <!-- Difference -->
            <div 
              class="p-2 rounded border"
              [class.bg-green-50]="getDifference() === 0"
              [class.border-green-200]="getDifference() === 0"
              [class.bg-red-50]="getDifference() !== 0"
              [class.border-red-200]="getDifference() !== 0"
            >
              <div class="font-semibold text-gray-700 mb-2">Diferença</div>
              <div class="space-y-1">
                <div class="flex justify-between">
                  <span class="text-gray-600">Diferença:</span>
                  <span 
                    class="font-mono font-bold text-lg"
                    [class.text-green-600]="getDifference() === 0"
                    [class.text-red-600]="getDifference() !== 0"
                  >
                    {{ getDifference() | number:'1.2-2' }}
                  </span>
                </div>
                <div *ngIf="getDifference() === 0" class="text-green-600 text-center font-medium">
                  ✓ Reconciliado
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-gray-300 bg-gray-50 flex justify-between items-center shrink-0">
          <div class="text-xs text-gray-600">
            <span class="material-symbols-outlined text-sm inline-block mr-1">info</span>
            Selecione os movimentos correspondentes em ambos os lados para reconciliar
          </div>
          <div class="flex gap-2">
            <button 
              (click)="close.emit()"
              class="px-4 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button 
              (click)="saveReconciliation()"
              [disabled]="getDifference() !== 0"
              class="px-4 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-outlined text-sm inline-block mr-1">check_circle</span>
              Gravar Reconciliação
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BankReconciliationModalComponent implements OnInit {
    @Output() close = new EventEmitter<void>();
    @Output() saved = new EventEmitter<any>();

    selectedBankAccount = '';
    statementDate = '';
    statementBalance = 0;

    bankAccounts: any[] = [];
    systemMovements: BankMovement[] = [];
    bankStatementMovements: BankMovement[] = [];

    constructor(private accountingService: AccountingService) { }

    ngOnInit() {
        this.statementDate = new Date().toISOString().split('T')[0];
        this.loadBankAccounts();
    }

    loadBankAccounts() {
        const allAccounts = this.accountingService.getAccounts();
        this.bankAccounts = allAccounts.filter(a => a.code.startsWith('12') && a.allowPosting);
    }

    loadMovements() {
        if (!this.selectedBankAccount) return;

        // Load REAL system movements from accounting
        const allEntries = this.accountingService.getJournalEntries();
        this.systemMovements = [];

        allEntries.forEach(entry => {
            // Find lines affecting the selected account
            const accountLines = entry.lines.filter(line => line.accountId === this.selectedBankAccount);

            accountLines.forEach(line => {
                // Only add if not already reconciled (logic to be implemented, assuming all open for now)
                this.systemMovements.push({
                    id: line.id,
                    date: new Date(entry.date),
                    description: line.description || entry.description,
                    reference: entry.reference,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    reconciled: false
                });
            });
        });

        // Sort by date descending
        this.systemMovements.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Clear bank movements (user must import or load sample)
        this.bankStatementMovements = [];
    }

    importSampleStatement() {
        this.bankStatementMovements = this.generateSampleBankMovements();
    }

    generateSampleBankMovements(): BankMovement[] {
        return [
            {
                id: 'B1',
                date: new Date('2025-12-01'),
                description: 'DEPOSITO - CLIENTE ABC',
                reference: 'DEP001',
                debit: 15000,
                credit: 0,
                reconciled: false
            },
            {
                id: 'B2',
                date: new Date('2025-12-02'),
                description: 'TRANSFERENCIA - FORNECEDOR XYZ',
                reference: 'TRF001',
                debit: 0,
                credit: 5000,
                reconciled: false
            },
            {
                id: 'B3',
                date: new Date('2025-12-03'),
                description: 'DEPOSITO',
                reference: 'DEP002',
                debit: 10000,
                credit: 0,
                reconciled: false
            },
            {
                id: 'B4',
                date: new Date('2025-12-04'),
                description: 'TAXA BANCARIA',
                reference: 'TAXA',
                debit: 0,
                credit: 50,
                reconciled: false
            }
        ];
    }

    toggleAllSystem(event: any) {
        const checked = event.target.checked;
        this.systemMovements.forEach(m => {
            if (!m.reconciled) m.reconciled = checked;
        });
    }

    toggleAllBank(event: any) {
        const checked = event.target.checked;
        this.bankStatementMovements.forEach(m => m.reconciled = checked);
    }

    getSystemBalance(): number {
        return this.systemMovements.reduce((sum, m) => sum + m.debit - m.credit, 0);
    }

    getSystemSelectedCount(): number {
        return this.systemMovements.filter(m => m.reconciled).length;
    }

    getBankSelectedCount(): number {
        return this.bankStatementMovements.filter(m => m.reconciled).length;
    }

    getDifference(): number {
        const systemSelected = this.systemMovements
            .filter(m => m.reconciled)
            .reduce((sum, m) => sum + m.debit - m.credit, 0);

        const bankSelected = this.bankStatementMovements
            .filter(m => m.reconciled)
            .reduce((sum, m) => sum + m.debit - m.credit, 0);

        return Math.abs(systemSelected - bankSelected);
    }

    saveReconciliation() {
        if (this.getDifference() !== 0) {
            alert('A diferença deve ser zero para gravar a reconciliação');
            return;
        }

        const reconciliation = {
            id: `RECON${Date.now()}`,
            accountId: this.selectedBankAccount,
            date: new Date(this.statementDate),
            statementBalance: this.statementBalance,
            systemMovements: this.systemMovements.filter(m => m.reconciled),
            bankMovements: this.bankStatementMovements.filter(m => m.reconciled),
            reconciledBy: 'user',
            reconciledAt: new Date()
        };

        // Save reconciliation
        const stored = localStorage.getItem('erp_reconciliations');
        const reconciliations = stored ? JSON.parse(stored) : [];
        reconciliations.push(reconciliation);
        localStorage.setItem('erp_reconciliations', JSON.stringify(reconciliations));

        alert('Reconciliação gravada com sucesso!');
        this.saved.emit(reconciliation);
        this.close.emit();
    }
}
