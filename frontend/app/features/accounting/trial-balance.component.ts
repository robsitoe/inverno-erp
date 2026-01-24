import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountingService } from '../../shared/accounting.service';
import { Account } from '../../shared/models';

@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full bg-white">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 class="text-lg font-semibold text-gray-800">Balancete</h2>
        <p class="text-sm text-gray-600 mt-1">Saldos de todas as contas</p>
      </div>

      <!-- Trial Balance Table -->
      <div class="flex-1 overflow-auto p-4">
        <table class="w-full text-sm border-collapse">
          <thead class="bg-gray-100 sticky top-0">
            <tr>
              <th class="text-left p-2 border">Código</th>
              <th class="text-left p-2 border">Conta</th>
              <th class="text-left p-2 border">Tipo</th>
              <th class="text-right p-2 border">Débito</th>
              <th class="text-right p-2 border">Crédito</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of trialBalance" class="hover:bg-gray-50">
              <td class="p-2 border font-mono">{{ item.account.code }}</td>
              <td class="p-2 border">{{ item.account.name }}</td>
              <td class="p-2 border">
                <span [class]="getTypeClass(item.account.type)">
                  {{ getTypeLabel(item.account.type) }}
                </span>
              </td>
              <td class="p-2 border text-right font-mono" [class.font-bold]="item.debit > 0">
                {{ item.debit > 0 ? (item.debit | number:'1.2-2') : '-' }}
              </td>
              <td class="p-2 border text-right font-mono" [class.font-bold]="item.credit > 0">
                {{ item.credit > 0 ? (item.credit | number:'1.2-2') : '-' }}
              </td>
            </tr>
            <tr class="bg-gray-100 font-bold">
              <td colspan="3" class="p-2 border text-right">TOTAL:</td>
              <td class="p-2 border text-right font-mono">{{ totalDebit | number:'1.2-2' }} MT</td>
              <td class="p-2 border text-right font-mono">{{ totalCredit | number:'1.2-2' }} MT</td>
            </tr>
            <tr [class.bg-green-50]="isBalanced" [class.bg-red-50]="!isBalanced">
              <td colspan="3" class="p-2 border text-right font-semibold">
                {{ isBalanced ? '✓ Balancete Equilibrado' : '⚠ Balancete Desequilibrado' }}
              </td>
              <td colspan="2" class="p-2 border text-right font-mono">
                Diferença: {{ Math.abs(totalDebit - totalCredit) | number:'1.2-2' }} MT
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class TrialBalanceComponent implements OnInit {
  trialBalance: { account: Account; debit: number; credit: number }[] = [];
  totalDebit = 0;
  totalCredit = 0;
  isBalanced = true;
  Math = Math;

  constructor(private accountingService: AccountingService) { }

  ngOnInit() {
    this.loadTrialBalance();
  }

  loadTrialBalance() {
    this.trialBalance = this.accountingService.getTrialBalance();

    // Calcular totais somando APENAS contas de nível 1 para evitar duplicação
    this.totalDebit = this.trialBalance
      .filter(item => item.account.level === 1)
      .reduce((sum, item) => sum + item.debit, 0);

    this.totalCredit = this.trialBalance
      .filter(item => item.account.level === 1)
      .reduce((sum, item) => sum + item.credit, 0);

    this.isBalanced = Math.abs(this.totalDebit - this.totalCredit) < 0.01;
  }

  getTypeLabel(type: string): string {
    const labels: any = {
      'ASSET': 'Ativo',
      'LIABILITY': 'Passivo',
      'EQUITY': 'Capital',
      'REVENUE': 'Rendimento',
      'EXPENSE': 'Gasto'
    };
    return labels[type] || type;
  }

  getTypeClass(type: string): string {
    const classes: any = {
      'ASSET': 'px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs',
      'LIABILITY': 'px-2 py-1 bg-red-100 text-red-800 rounded text-xs',
      'EQUITY': 'px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs',
      'REVENUE': 'px-2 py-1 bg-green-100 text-green-800 rounded text-xs',
      'EXPENSE': 'px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs'
    };
    return classes[type] || '';
  }
}
