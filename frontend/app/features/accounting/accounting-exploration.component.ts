import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { DataService } from '../../services/data.service';
import { environment } from '../../shared/config';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
  allowPosting: boolean;
  level: number;
}

interface Movement {
  date: string;
  docType: string;
  docNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AccountStatement {
  initialBalance: number;
  movements: Movement[];
}

interface TopVariation {
  accountId: string;
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  net: number;
  movements: number;
}

@Component({
  selector: 'app-accounting-exploration',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  template: `
<div class="flex flex-col h-full bg-[#F0F0F0] overflow-hidden font-sans text-sm">

  <!-- Toolbar -->
  <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-300 bg-white shrink-0 flex-wrap">
    <span class="material-symbols-outlined text-blue-600 text-[20px]">explore</span>
    <span class="font-semibold text-gray-800">Exploração Contabilística</span>
    <span class="text-gray-300">|</span>

    <label class="text-gray-600 text-xs">De:</label>
    <input type="date" [(ngModel)]="fromDate" (change)="onPeriodChange()"
      class="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400">

    <label class="text-gray-600 text-xs">Até:</label>
    <input type="date" [(ngModel)]="toDate" (change)="onPeriodChange()"
      class="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400">

    <button (click)="loadSummary()" [disabled]="loading"
      class="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50 transition-colors">
      <span class="material-symbols-outlined text-[15px]">refresh</span>
      {{ loading ? 'A carregar...' : 'Actualizar' }}
    </button>

    <div class="ml-auto flex items-center gap-2">
      <input [(ngModel)]="searchTerm" (ngModelChange)="filterAccounts()"
        placeholder="Pesquisar conta..."
        class="border border-gray-300 rounded px-2 py-1 text-xs w-44 focus:outline-none focus:border-blue-400">

      <select [(ngModel)]="typeFilter" (ngModelChange)="filterAccounts()"
        class="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400">
        <option value="">Todos os tipos</option>
        <option value="ASSET">Activo</option>
        <option value="LIABILITY">Passivo</option>
        <option value="EQUITY">Capital</option>
        <option value="REVENUE">Rendimento</option>
        <option value="EXPENSE">Gasto</option>
      </select>

      <button *ngIf="selectedAccount && statement" (click)="exportCsv()"
        class="flex items-center gap-1 px-3 py-1 border border-gray-300 hover:bg-gray-50 rounded text-xs text-gray-700 transition-colors">
        <span class="material-symbols-outlined text-[15px]">download</span>
        CSV
      </button>
    </div>
  </div>

  <!-- Body -->
  <div class="flex flex-1 overflow-hidden">

    <!-- Left panel: account list -->
    <div class="w-72 shrink-0 border-r border-gray-300 bg-white flex flex-col overflow-hidden">
      <div class="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium flex justify-between">
        <span>Contas</span>
        <span class="text-gray-400">{{ filteredAccounts.length }}</span>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div *ngIf="!allAccounts.length && !loading" class="flex flex-col items-center justify-center h-32 text-gray-400 text-xs gap-2">
          <span class="material-symbols-outlined text-[32px]">account_balance</span>
          Sem plano de contas
        </div>
        <button *ngFor="let acc of filteredAccounts"
          (click)="selectAccount(acc)"
          [class.bg-blue-50]="selectedAccount?.id === acc.id"
          [class.border-l-4]="selectedAccount?.id === acc.id"
          [class.border-l-blue-600]="selectedAccount?.id === acc.id"
          class="w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-2 group">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1">
              <span class="font-mono text-[11px] text-gray-500">{{ acc.code }}</span>
              <span [class]="typeBadge(acc.type)"
                class="text-[9px] px-1 py-0.5 rounded font-semibold uppercase leading-none">
                {{ typeLabel(acc.type) }}
              </span>
            </div>
            <div class="text-gray-800 truncate text-xs leading-tight mt-0.5">{{ acc.name }}</div>
          </div>
          <div class="text-right shrink-0">
            <div [class]="acc.balance >= 0 ? 'text-gray-800' : 'text-red-600'"
              class="font-mono text-[11px] font-semibold">
              {{ acc.balance | number:'1.2-2' }}
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Right panel -->
    <div class="flex-1 flex flex-col overflow-hidden">

      <!-- No account selected: summary view -->
      <ng-container *ngIf="!selectedAccount">
        <div class="flex-1 overflow-y-auto p-4 space-y-4">

          <!-- KPI cards -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <div class="text-xs text-gray-500 mb-1">Total Débito</div>
              <div class="text-xl font-bold text-blue-700 font-mono">{{ summary?.totalDebit | number:'1.2-2' }}</div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <div class="text-xs text-gray-500 mb-1">Total Crédito</div>
              <div class="text-xl font-bold text-green-700 font-mono">{{ summary?.totalCredit | number:'1.2-2' }}</div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <div class="text-xs text-gray-500 mb-1">Diferença</div>
              <div [class]="(summary?.totalDebit || 0) - (summary?.totalCredit || 0) === 0 ? 'text-gray-700' : 'text-red-600'"
                class="text-xl font-bold font-mono">
                {{ ((summary?.totalDebit || 0) - (summary?.totalCredit || 0)) | number:'1.2-2' }}
              </div>
            </div>
          </div>

          <!-- Top movimentos -->
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-gray-500">trending_up</span>
              <span class="font-semibold text-gray-800 text-sm">Contas com Maior Movimento no Período</span>
            </div>
            <div *ngIf="!summary?.topVariations?.length" class="p-6 text-center text-gray-400 text-xs">
              Sem movimentos no período seleccionado.
            </div>
            <table *ngIf="summary?.topVariations?.length" class="w-full text-xs">
              <thead class="bg-gray-50 text-gray-500 uppercase text-[10px]">
                <tr>
                  <th class="px-3 py-2 text-left">Conta</th>
                  <th class="px-3 py-2 text-right">Débito</th>
                  <th class="px-3 py-2 text-right">Crédito</th>
                  <th class="px-3 py-2 text-right">Mov.</th>
                  <th class="px-3 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let v of summary.topVariations"
                  (click)="selectAccountById(v.accountId)"
                  class="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors">
                  <td class="px-3 py-2">
                    <span class="font-mono text-gray-500">{{ v.accountCode }}</span>
                    <span class="ml-2 text-gray-800">{{ v.accountName }}</span>
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-blue-700">{{ v.totalDebit | number:'1.2-2' }}</td>
                  <td class="px-3 py-2 text-right font-mono text-green-700">{{ v.totalCredit | number:'1.2-2' }}</td>
                  <td class="px-3 py-2 text-right text-gray-500">{{ v.movements }}</td>
                  <td class="px-3 py-2 text-right font-mono font-semibold"
                    [class.text-gray-800]="v.net >= 0" [class.text-red-600]="v.net < 0">
                    {{ v.net | number:'1.2-2' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </ng-container>

      <!-- Account selected: statement view -->
      <ng-container *ngIf="selectedAccount">

        <!-- Statement header -->
        <div class="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button (click)="clearAccount()"
            class="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-800">
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-gray-500 text-sm">{{ selectedAccount.code }}</span>
              <span [class]="typeBadge(selectedAccount.type)"
                class="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase">
                {{ typeLabel(selectedAccount.type) }}
              </span>
            </div>
            <div class="font-semibold text-gray-900">{{ selectedAccount.name }}</div>
          </div>

          <!-- Statement KPIs -->
          <div class="ml-auto flex items-center gap-4 text-right">
            <div>
              <div class="text-[10px] text-gray-400 uppercase">Saldo Inicial</div>
              <div class="font-mono font-semibold text-gray-700 text-sm">
                {{ statement?.initialBalance | number:'1.2-2' }}
              </div>
            </div>
            <div>
              <div class="text-[10px] text-gray-400 uppercase">Débito</div>
              <div class="font-mono font-semibold text-blue-700 text-sm">
                {{ statementTotalDebit | number:'1.2-2' }}
              </div>
            </div>
            <div>
              <div class="text-[10px] text-gray-400 uppercase">Crédito</div>
              <div class="font-mono font-semibold text-green-700 text-sm">
                {{ statementTotalCredit | number:'1.2-2' }}
              </div>
            </div>
            <div class="border-l border-gray-200 pl-4">
              <div class="text-[10px] text-gray-400 uppercase">Saldo Final</div>
              <div class="font-mono font-bold text-lg"
                [class.text-gray-900]="statementFinalBalance >= 0"
                [class.text-red-600]="statementFinalBalance < 0">
                {{ statementFinalBalance | number:'1.2-2' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Movement table -->
        <div class="flex-1 overflow-y-auto">
          <div *ngIf="loadingStatement" class="flex items-center justify-center h-32 text-gray-400 text-xs gap-2">
            <span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            A carregar movimentos...
          </div>

          <div *ngIf="!loadingStatement && !statement?.movements?.length"
            class="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <span class="material-symbols-outlined text-[40px]">receipt_long</span>
            <span class="text-sm">Sem movimentos no período</span>
          </div>

          <table *ngIf="!loadingStatement && statement?.movements?.length" class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-500 uppercase text-[10px] sticky top-0 z-10 shadow-sm">
              <tr>
                <th class="px-3 py-2 text-left border-b border-gray-200">Data</th>
                <th class="px-3 py-2 text-left border-b border-gray-200">Tipo</th>
                <th class="px-3 py-2 text-left border-b border-gray-200">Ref.</th>
                <th class="px-3 py-2 text-left border-b border-gray-200">Descrição</th>
                <th class="px-3 py-2 text-right border-b border-gray-200">Débito</th>
                <th class="px-3 py-2 text-right border-b border-gray-200">Crédito</th>
                <th class="px-3 py-2 text-right border-b border-gray-200">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <!-- Initial balance row -->
              <tr class="bg-blue-50 border-b border-blue-100 font-medium">
                <td class="px-3 py-1.5 text-blue-700">{{ fromDate || '—' }}</td>
                <td colspan="5" class="px-3 py-1.5 text-blue-700">Saldo inicial</td>
                <td class="px-3 py-1.5 text-right font-mono text-blue-700">
                  {{ statement?.initialBalance | number:'1.2-2' }}
                </td>
              </tr>
              <tr *ngFor="let mv of statement.movements; let odd = odd"
                [class.bg-gray-50]="odd"
                class="border-b border-gray-100 hover:bg-yellow-50 transition-colors">
                <td class="px-3 py-1.5 text-gray-500 whitespace-nowrap">{{ mv.date | date:'dd/MM/yyyy' }}</td>
                <td class="px-3 py-1.5">
                  <span class="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {{ mv.docType }}
                  </span>
                </td>
                <td class="px-3 py-1.5 font-mono text-gray-500 text-[11px]">{{ mv.docNumber || '—' }}</td>
                <td class="px-3 py-1.5 text-gray-800 max-w-[280px] truncate">{{ mv.description }}</td>
                <td class="px-3 py-1.5 text-right font-mono">
                  <span *ngIf="mv.debit" class="text-blue-700">{{ mv.debit | number:'1.2-2' }}</span>
                </td>
                <td class="px-3 py-1.5 text-right font-mono">
                  <span *ngIf="mv.credit" class="text-green-700">{{ mv.credit | number:'1.2-2' }}</span>
                </td>
                <td class="px-3 py-1.5 text-right font-mono font-semibold"
                  [class.text-gray-800]="mv.balance >= 0"
                  [class.text-red-600]="mv.balance < 0">
                  {{ mv.balance | number:'1.2-2' }}
                </td>
              </tr>
              <!-- Final balance row -->
              <tr class="bg-blue-50 border-t-2 border-blue-200 font-bold">
                <td class="px-3 py-2 text-blue-700">{{ toDate || '—' }}</td>
                <td colspan="3" class="px-3 py-2 text-blue-700">Saldo final</td>
                <td class="px-3 py-2 text-right font-mono text-blue-700">{{ statementTotalDebit | number:'1.2-2' }}</td>
                <td class="px-3 py-2 text-right font-mono text-green-700">{{ statementTotalCredit | number:'1.2-2' }}</td>
                <td class="px-3 py-2 text-right font-mono text-lg"
                  [class.text-gray-900]="statementFinalBalance >= 0"
                  [class.text-red-600]="statementFinalBalance < 0">
                  {{ statementFinalBalance | number:'1.2-2' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

    </div>
  </div>
</div>
  `,
})
export class AccountingExplorationComponent implements OnInit, OnDestroy {
  private sub = new Subscription();
  private baseUrl = environment.apiUrl;

  fromDate = '';
  toDate = '';
  searchTerm = '';
  typeFilter = '';
  loading = false;
  loadingStatement = false;

  summary: any = null;
  allAccounts: Account[] = [];
  filteredAccounts: Account[] = [];

  selectedAccount: Account | null = null;
  statement: AccountStatement | null = null;

  constructor(private http: HttpClient, private dataService: DataService) {
    const now = new Date();
    this.toDate = now.toISOString().slice(0, 10);
    const start = new Date(now.getFullYear(), 0, 1);
    this.fromDate = start.toISOString().slice(0, 10);
  }

  ngOnInit() {
    this.sub.add(
      this.dataService.activeCompany$.subscribe(c => {
        if (c) this.loadSummary();
      })
    );
    this.loadSummary();
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  loadSummary() {
    this.loading = true;
    const companyId = this.dataService.getCurrentCompany()?.id;
    const params: any = {};
    if (this.fromDate) params.fromDate = this.fromDate;
    if (this.toDate) params.toDate = this.toDate;
    if (companyId) params.companyId = companyId;

    this.http.get<any>(`${this.baseUrl}/accounting/exploration/summary`, { params }).subscribe({
      next: data => {
        this.summary = data;
        this.allAccounts = data.accounts || [];
        this.filterAccounts();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPeriodChange() {
    this.statement = null;
    this.loadSummary();
    if (this.selectedAccount) this.loadStatement(this.selectedAccount);
  }

  filterAccounts() {
    const s = this.searchTerm.toLowerCase();
    this.filteredAccounts = this.allAccounts.filter(a => {
      const matchType = !this.typeFilter || a.type === this.typeFilter;
      const matchSearch = !s || a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s);
      return matchType && matchSearch;
    });
  }

  selectAccount(acc: Account) {
    this.selectedAccount = acc;
    this.loadStatement(acc);
  }

  selectAccountById(id: string) {
    const acc = this.allAccounts.find(a => a.id === id);
    if (acc) this.selectAccount(acc);
  }

  clearAccount() {
    this.selectedAccount = null;
    this.statement = null;
  }

  loadStatement(acc: Account) {
    this.loadingStatement = true;
    this.statement = null;
    const companyId = this.dataService.getCurrentCompany()?.id;
    const params: any = {};
    if (this.fromDate) params.fromDate = this.fromDate;
    if (this.toDate) params.toDate = this.toDate;
    if (companyId) params.companyId = companyId;

    this.http.get<AccountStatement>(`${this.baseUrl}/accounting/statements/${acc.id}`, { params }).subscribe({
      next: data => { this.statement = data; this.loadingStatement = false; },
      error: () => { this.loadingStatement = false; }
    });
  }

  get statementTotalDebit(): number {
    return (this.statement?.movements || []).reduce((s, m) => s + (m.debit || 0), 0);
  }

  get statementTotalCredit(): number {
    return (this.statement?.movements || []).reduce((s, m) => s + (m.credit || 0), 0);
  }

  get statementFinalBalance(): number {
    const mvs = this.statement?.movements;
    if (!mvs?.length) return this.statement?.initialBalance ?? 0;
    return mvs[mvs.length - 1].balance;
  }

  typeLabel(type: string): string {
    return { ASSET: 'Act', LIABILITY: 'Pas', EQUITY: 'Cap', REVENUE: 'Rend', EXPENSE: 'Gasto' }[type] || type;
  }

  typeBadge(type: string): string {
    return {
      ASSET: 'bg-blue-100 text-blue-700',
      LIABILITY: 'bg-orange-100 text-orange-700',
      EQUITY: 'bg-purple-100 text-purple-700',
      REVENUE: 'bg-green-100 text-green-700',
      EXPENSE: 'bg-red-100 text-red-700',
    }[type] || 'bg-gray-100 text-gray-600';
  }

  exportCsv() {
    if (!this.statement || !this.selectedAccount) return;
    const rows = [
      ['Data', 'Tipo', 'Referência', 'Descrição', 'Débito', 'Crédito', 'Saldo'],
      [`Saldo inicial`, '', '', '', '', '', String(this.statement.initialBalance)],
      ...this.statement.movements.map(m => [
        m.date, m.docType, m.docNumber || '', m.description,
        String(m.debit || ''), String(m.credit || ''), String(m.balance)
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato_${this.selectedAccount.code}_${this.fromDate}_${this.toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
