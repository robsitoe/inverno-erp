import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../shared/accounting.service';
import { Account } from '../../shared/models';

@Component({
  selector: 'app-chart-of-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-semibold text-gray-800">Plano de Contas</h2>
          
          <div class="flex items-center gap-2 ml-4 border-l pl-4">
            <span class="text-xs text-gray-500 font-bold uppercase">Ações Rápidas:</span>
            <button 
              (click)="loadPreset('PGC-PE')"
              class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors"
              title="Carregar ou Restaurar Contas PGC-PE"
            >
              Atualizar p/ PGC-PE
            </button>
            <button 
              (click)="triggerCsvUpload()"
              class="px-2 py-1 text-xs border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[14px]">upload_file</span>
              Importar CSV
            </button>
            <div class="flex items-center gap-1 ml-2 border-l pl-2">
              <button 
                (click)="exportAccounts(false)"
                class="px-2 py-1 text-xs bg-gray-100 border border-gray-300 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                title="Exportar apenas estrutura"
              >
                <span class="material-symbols-outlined text-[14px]">table_rows</span>
                Exportar (Estrutura)
              </button>
              <button 
                (click)="exportAccounts(true)"
                class="px-2 py-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                title="Exportar com saldos e estados"
              >
                <span class="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                Exportar (Saldos)
              </button>
            </div>
            <input type="file" #csvInput class="hidden" (change)="onCsvFileSelected($event)" accept=".csv">
          </div>
        </div>

        <button 
          (click)="openAddAccountModal()"
          class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2 shadow-sm shadow-blue-200"
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
          Nova Conta Raiz
        </button>
      </div>

      <!-- Accounts Table -->
      <div class="flex-1 overflow-auto p-4">
        <table class="w-full text-sm border-collapse">
          <thead class="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th class="text-left p-2 border">Código</th>
              <th class="text-left p-2 border">Nome da Conta</th>
              <th class="text-left p-2 border">Tipo</th>
              <th class="text-right p-2 border">Saldo</th>
              <th class="text-center p-2 border">Estado</th>
              <th class="text-center p-2 border w-24">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let account of accounts" class="hover:bg-gray-50">
              <td class="p-2 border font-mono" [style.padding-left.px]="(account.level - 1) * 20 + 8">
                <div class="flex items-center gap-1">
                  <span *ngIf="!account.allowPosting" class="material-symbols-outlined text-[14px] text-gray-400">folder</span>
                  <span *ngIf="account.allowPosting" class="material-symbols-outlined text-[14px] text-gray-400">description</span>
                  {{ account.code }}
                </div>
              </td>
              <td class="p-2 border">
                <span [class.font-bold]="!account.allowPosting">{{ account.name }}</span>
              </td>
              <td class="p-2 border">
                <span [class]="getTypeClass(account.type)">
                  {{ getTypeLabel(account.type) }}
                </span>
              </td>
              <td class="p-2 border text-right font-mono" [class.font-bold]="!account.allowPosting">
                {{ account.balance | number:'1.2-2' }} MT
              </td>
              <td class="p-2 border text-center">
                <span [class]="account.isActive ? 'text-green-600' : 'text-red-600'">
                  {{ account.isActive ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="p-2 border text-center">
                <div class="flex items-center justify-center gap-1">
                  <button 
                    (click)="openEditAccountModal(account)"
                    class="text-gray-600 hover:text-blue-600"
                    title="Editar Conta"
                  >
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button 
                    (click)="toggleAccountStatus(account)"
                    [class]="account.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'"
                    [title]="account.isActive ? 'Desativar Conta' : 'Ativar Conta'"
                  >
                    <span class="material-symbols-outlined text-[18px]">{{ account.isActive ? 'block' : 'check_circle' }}</span>
                  </button>
                  <button 
                    (click)="openAddSubAccountModal(account)"
                    class="text-blue-600 hover:text-blue-800"
                    title="Adicionar Subconta"
                  >
                    <span class="material-symbols-outlined text-[18px]">add_circle</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add/Edit Account Modal -->
      <div *ngIf="showAddAccount" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAddAccount = false">
        <div class="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between px-4 py-3 border-b">
            <h3 class="text-lg font-semibold">
              {{ isEditing ? 'Editar Conta' : (newAccount.parentId ? 'Nova Subconta' : 'Nova Conta') }}
            </h3>
            <button (click)="showAddAccount = false" class="text-gray-400 hover:text-gray-600">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-4 space-y-4">
            <div *ngIf="parentAccount" class="bg-blue-50 p-3 rounded border border-blue-100 mb-4">
              <span class="text-xs text-blue-600 font-bold uppercase">Conta Pai</span>
              <div class="flex items-center gap-2 text-blue-800">
                <span class="font-mono font-bold">{{ parentAccount.code }}</span>
                <span>{{ parentAccount.name }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Código</label>
                <div class="flex items-center">
                  <span *ngIf="parentAccount" class="text-gray-500 font-mono mr-1">{{ parentAccount.code }}.</span>
                  <input 
                    [(ngModel)]="newAccountCodeSuffix" 
                    class="w-full border rounded px-3 py-2" 
                    placeholder="Ex: 1"
                    [disabled]="isEditing"
                    [class.bg-gray-100]="isEditing"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Tipo</label>
                <select 
                  [(ngModel)]="newAccount.type" 
                  class="w-full border rounded px-3 py-2" 
                  [disabled]="!!newAccount.parentId || isEditing"
                  [class.bg-gray-100]="!!newAccount.parentId || isEditing"
                >
                  <option value="ASSET">Ativo</option>
                  <option value="LIABILITY">Passivo</option>
                  <option value="EQUITY">Capital Próprio</option>
                  <option value="REVENUE">Rendimento</option>
                  <option value="EXPENSE">Gasto</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Nome da Conta</label>
              <input [(ngModel)]="newAccount.name" class="w-full border rounded px-3 py-2" />
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="newAccount.allowPosting" id="allowPosting" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              <label for="allowPosting" class="text-sm text-gray-700">Permitir lançamentos (Conta de Movimento)</label>
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <button (click)="showAddAccount = false" class="px-4 py-2 border rounded hover:bg-gray-50">
                Cancelar
              </button>
              <button (click)="saveAccount()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                {{ isEditing ? 'Atualizar' : 'Adicionar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: []
})
export class ChartOfAccountsComponent implements OnInit {
  @ViewChild('csvInput') csvInput!: ElementRef;

  accounts: Account[] = [];
  showAddAccount = false;
  parentAccount: Account | null = null;
  newAccountCodeSuffix = '';

  isEditing = false;
  editingAccountId = '';

  newAccount: Partial<Account> = {
    code: '',
    name: '',
    type: 'ASSET',
    level: 1,
    balance: 0,
    allowPosting: true,
    isActive: true
  };

  constructor(
    private accountingService: AccountingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadAccounts();
  }

  async loadPreset(name: string) {
    if (confirm(`Tem a certeza que deseja SUBSTITUIR todo o plano de contas pelo modelo ${name}? \n\nATENÇÃO: Todas as contas atuais serão apagadas e substituídas pelas novas definições do PGC-PE.`)) {
      try {
        await this.accountingService.resetAccounts();
        await this.accountingService.loadAccountsPreset(name);
        this.loadAccounts();
        alert('Plano de contas substituído com sucesso pelo novo padrão PGC-PE!');
      } catch (e: any) {
        alert('Erro ao carregar plano: ' + (e.error?.message || e.message));
      }
    }
  }

  triggerCsvUpload() {
    this.csvInput.nativeElement.click();
  }

  onCsvFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        const text = e.target.result;
        await this.processCsv(text);
      };
      reader.readAsText(file);
    }
  }

  async processCsv(text: string) {
    const lines = text.split('\n');
    const accountsToImport: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [code, name, type, allowPosting] = line.split(',');
      if (code && name) {
        accountsToImport.push({
          code: code.trim(),
          name: name.trim(),
          type: type?.trim() || 'ASSET',
          allowPosting: allowPosting?.trim().toLowerCase() === 'true',
          isActive: true
        });
      }
    }

    if (accountsToImport.length > 0) {
      if (confirm(`Deseja importar ${accountsToImport.length} contas do arquivo CSV?`)) {
        try {
          for (const acc of accountsToImport) {
            this.accountingService.addAccount(acc);
          }
          setTimeout(() => this.loadAccounts(), 1000);
          alert('Importação concluída!');
        } catch (err: any) {
          alert('Erro na importação: ' + err.message);
        }
      }
    }

    this.csvInput.nativeElement.value = '';
  }

  exportAccounts(withInfo: boolean) {
    const headers = withInfo
      ? ['Código', 'Nome', 'Tipo', 'Saldo (MT)', 'Estado']
      : ['Código', 'Nome', 'Tipo'];

    const csvRows = [headers.join(';')];

    this.accounts.forEach(acc => {
      const row = withInfo
        ? [
          acc.code,
          acc.name,
          this.getTypeLabel(acc.type),
          Number(acc.balance).toFixed(2),
          acc.isActive ? 'Ativo' : 'Inativo'
        ]
        : [
          acc.code,
          acc.name,
          this.getTypeLabel(acc.type)
        ];
      csvRows.push(row.join(';'));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    const fileName = withInfo ? `plano_contas_saldos_${date}.csv` : `plano_contas_estrutura_${date}.csv`;

    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  }

  loadAccounts() {
    this.accounts = this.accountingService.getAccounts().sort((a, b) => a.code.localeCompare(b.code));
    this.cdr.detectChanges();
  }

  openAddAccountModal() {
    this.isEditing = false;
    this.editingAccountId = '';
    this.parentAccount = null;
    this.newAccountCodeSuffix = '';
    this.newAccount = {
      code: '',
      name: '',
      type: 'ASSET',
      level: 1,
      balance: 0,
      allowPosting: true,
      isActive: true
    };
    this.showAddAccount = true;
  }

  openAddSubAccountModal(parent: Account) {
    this.isEditing = false;
    this.editingAccountId = '';
    this.parentAccount = parent;
    this.newAccountCodeSuffix = '';
    this.newAccount = {
      parentId: parent.id,
      code: '',
      name: '',
      type: parent.type,
      level: parent.level + 1,
      balance: 0,
      allowPosting: true,
      isActive: true
    };
    this.showAddAccount = true;
  }

  openEditAccountModal(account: Account) {
    this.isEditing = true;
    this.editingAccountId = account.id;
    this.parentAccount = account.parentId ? this.accounts.find(a => a.id === account.parentId) || null : null;
    this.newAccountCodeSuffix = account.code.split('.').pop() || account.code;
    this.newAccount = { ...account };
    this.showAddAccount = true;
  }

  saveAccount() {
    if (this.isEditing) {
      if (this.newAccount.name) {
        const account = this.accounts.find(a => a.id === this.editingAccountId);
        if (account) {
          account.name = this.newAccount.name;
          account.allowPosting = this.newAccount.allowPosting || false;
          this.accountingService.updateAccount(account);
          this.loadAccounts();
          this.showAddAccount = false;
        }
      }
    } else {
      if (this.newAccount.name && this.newAccount.type && this.newAccountCodeSuffix) {
        const fullCode = this.parentAccount
          ? `${this.parentAccount.code}.${this.newAccountCodeSuffix}`
          : this.newAccountCodeSuffix;

        const account: Account = {
          id: `ACC${Date.now()}`,
          code: fullCode,
          name: this.newAccount.name,
          type: this.newAccount.type as any,
          level: this.newAccount.level || 1,
          parentId: this.newAccount.parentId,
          balance: 0,
          allowPosting: this.newAccount.allowPosting || false,
          isActive: true
        };

        this.accountingService.addAccount(account);
        this.loadAccounts();
        this.showAddAccount = false;
      }
    }
  }

  toggleAccountStatus(account: Account) {
    const action = account.isActive ? 'desativar' : 'ativar';
    const warning = account.isActive
      ? `\n\nContas desativadas deixam de poder ser usadas em novos lançamentos, mas permanecem no histórico.`
      : '';

    if (confirm(`Tem a certeza que deseja ${action} a conta ${account.code} - ${account.name}?${warning}`)) {
      account.isActive = !account.isActive;
      this.accountingService.updateAccount(account);
      this.loadAccounts();
    }
  }

  getTypeLabel(type: string): string {
    const labels: any = {
      'ASSET': 'Ativo',
      'LIABILITY': 'Passivo',
      'EQUITY': 'Capital Próprio',
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
