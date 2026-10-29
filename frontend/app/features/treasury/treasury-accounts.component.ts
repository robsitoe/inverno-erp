import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Caixas e Bancos: fichas ligadas a contas do plano, com saldo, movimentos e transferências. */
@Component({
  selector: 'app-treasury-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-lg font-bold text-gray-800">{{ isBank ? 'Bancos' : 'Caixas' }}</h1>
          <p class="text-xs text-gray-500">{{ isBank
            ? 'Contas bancárias da empresa: dados do banco, saldo contabilístico, movimentos e transferências.'
            : 'Caixas da empresa: responsável, saldo contabilístico, movimentos, depósitos e levantamentos.' }}
            O saldo vem dos lançamentos da conta do plano ligada a cada ficha.</p>
        </div>
        <div class="flex gap-2">
          <button *ngIf="candidates.length" (click)="importFromChart()" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white hover:bg-gray-50"
                  [title]="'Contas do plano sem ficha: ' + candidateCodes">Criar fichas a partir do plano ({{ candidates.length }})</button>
          <button (click)="openTransfer()" [disabled]="accounts.length + others.length < 2" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40">
            {{ isBank ? 'Transferência / levantamento' : 'Depósito / transferência' }}</button>
          <button (click)="newAccount()" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700">+ {{ isBank ? 'Novo banco' : 'Nova caixa' }}</button>
        </div>
      </div>

      <!-- Fichas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div *ngFor="let a of accounts" (click)="select(a)" class="bg-white border rounded-lg shadow-sm p-3 cursor-pointer hover:border-blue-400"
             [ngClass]="selected?.id === a.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'" [class.opacity-60]="!a.active">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-[11px] font-mono text-gray-500">{{ a.code }} · conta {{ a.accountingAccount }}</div>
              <div class="font-bold text-gray-800 truncate">{{ a.name }}</div>
              <div class="text-[11px] text-gray-500 truncate">{{ isBank ? (a.bankName || 'Banco por indicar') + (a.accountNumber ? ' · ' + a.accountNumber : '') : (a.responsible ? 'Responsável: ' + a.responsible : 'Sem responsável') }}</div>
            </div>
            <button (click)="$event.stopPropagation(); edit(a)" class="text-gray-400 hover:text-blue-600" title="Editar ficha"><span class="material-symbols-outlined text-[18px]">edit</span></button>
          </div>
          <div class="mt-2 flex items-end justify-between">
            <div>
              <div class="text-[10px] uppercase font-bold text-gray-400">Saldo</div>
              <div class="text-xl font-bold font-mono" [ngClass]="a.balance < 0 ? 'text-red-600' : 'text-gray-900'">{{ a.balance | number:'1.2-2' }} <span class="text-xs text-gray-400">{{ a.currency }}</span></div>
            </div>
            <div class="text-right text-[10px] text-gray-400">
              <div *ngIf="!a.active" class="text-red-600 font-bold uppercase">Inativa</div>
              <div *ngIf="a.belowMinimum" class="text-amber-600 font-bold">Abaixo do mínimo ({{ a.minBalance | number:'1.0-0' }})</div>
              <div>{{ a.lastMovement ? 'Último mov. ' + (a.lastMovement | date:'dd/MM/yyyy') : 'Sem movimentos' }}</div>
            </div>
          </div>
        </div>
        <div *ngIf="!accounts.length" class="md:col-span-2 lg:col-span-3 bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
          Ainda não há {{ isBank ? 'bancos' : 'caixas' }} registados.
          <span *ngIf="candidates.length">Pode criar as fichas a partir das contas {{ candidateCodes }} do plano.</span>
        </div>
      </div>
      <div *ngIf="accounts.length > 1" class="text-right text-xs text-gray-600">Total {{ isBank ? 'em bancos' : 'em caixa' }}: <b class="font-mono">{{ total | number:'1.2-2' }}</b></div>

      <!-- Movimentos -->
      <div *ngIf="selected" class="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div class="p-3 border-b border-gray-200 flex flex-wrap items-end gap-3">
          <div class="flex-1 min-w-[200px]"><div class="text-xs text-gray-500">Movimentos de</div><div class="font-bold text-gray-800">{{ selected.code }} — {{ selected.name }}</div></div>
          <label class="text-xs"><span class="block text-gray-500 font-semibold">De</span><input type="date" [(ngModel)]="from" class="border border-gray-300 rounded px-2 py-1"></label>
          <label class="text-xs"><span class="block text-gray-500 font-semibold">Até</span><input type="date" [(ngModel)]="to" class="border border-gray-300 rounded px-2 py-1"></label>
          <button (click)="loadMovements()" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white">Ver</button>
          <button *ngIf="mov" (click)="exportCsv()" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white">Exportar CSV</button>
        </div>
        <div *ngIf="mov" class="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 text-xs">
          <div class="bg-white p-2"><div class="text-gray-500">Saldo inicial</div><div class="font-mono font-bold">{{ mov.opening | number:'1.2-2' }}</div></div>
          <div class="bg-white p-2"><div class="text-gray-500">Entradas</div><div class="font-mono font-bold text-green-700">{{ mov.inflows | number:'1.2-2' }}</div></div>
          <div class="bg-white p-2"><div class="text-gray-500">Saídas</div><div class="font-mono font-bold text-red-600">{{ mov.outflows | number:'1.2-2' }}</div></div>
          <div class="bg-white p-2"><div class="text-gray-500">Saldo final</div><div class="font-mono font-bold">{{ mov.closing | number:'1.2-2' }}</div></div>
        </div>
        <div *ngIf="mov" class="overflow-x-auto max-h-[460px]">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600 sticky top-0"><tr>
              <th class="px-3 py-2 text-left">Data</th><th class="px-3 py-2 text-left">Descrição</th><th class="px-3 py-2 text-left">Origem</th>
              <th class="px-3 py-2 text-right">Entrada</th><th class="px-3 py-2 text-right">Saída</th><th class="px-3 py-2 text-right">Saldo</th></tr></thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let l of mov.lines" class="hover:bg-blue-50">
                <td class="px-3 py-1.5 whitespace-nowrap">{{ l.date | date:'dd/MM/yyyy' }}</td>
                <td class="px-3 py-1.5">{{ l.description }}<div *ngIf="l.reference" class="text-[10px] text-gray-400">{{ l.reference }}</div></td>
                <td class="px-3 py-1.5 text-gray-500">{{ sourceLabel(l.sourceType) }}</td>
                <td class="px-3 py-1.5 text-right font-mono text-green-700">{{ l.debit ? (l.debit | number:'1.2-2') : '' }}</td>
                <td class="px-3 py-1.5 text-right font-mono text-red-600">{{ l.credit ? (l.credit | number:'1.2-2') : '' }}</td>
                <td class="px-3 py-1.5 text-right font-mono font-semibold">{{ l.balance | number:'1.2-2' }}</td>
              </tr>
              <tr *ngIf="!mov.lines.length"><td colspan="6" class="px-3 py-6 text-center text-gray-400">Sem movimentos no período.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Transferências recentes -->
      <div *ngIf="transfers.length" class="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700">Transferências recentes</div>
        <table class="w-full text-xs">
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let t of transfers.slice(0, 10)">
              <td class="px-3 py-1.5 whitespace-nowrap">{{ t.date | date:'dd/MM/yyyy' }}</td>
              <td class="px-3 py-1.5">{{ t.description }}</td>
              <td class="px-3 py-1.5 text-gray-500">{{ t.fromCode }} → {{ t.toCode }}</td>
              <td class="px-3 py-1.5 text-right font-mono">{{ t.amount | number:'1.2-2' }}</td>
              <td class="px-3 py-1.5 text-gray-400">{{ t.createdBy }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ficha -->
    <div *ngIf="form" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="form = null">
      <div class="bg-white rounded shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-gray-200 font-bold text-sm text-gray-800">{{ form.id ? 'Editar ' : 'Nova ' }}ficha de {{ isBank ? 'banco' : 'caixa' }}</div>
        <div class="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <label class="block"><span class="font-semibold text-gray-600">Código *</span>
            <input [(ngModel)]="form.code" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 uppercase" [placeholder]="isBank ? 'BC01' : 'CX01'"></label>
          <label class="block md:col-span-3"><span class="font-semibold text-gray-600">Descrição *</span>
            <input [(ngModel)]="form.name" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" [placeholder]="isBank ? 'BCI — conta à ordem' : 'Caixa principal'"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Conta do plano *</span>
            <input [(ngModel)]="form.accountingAccount" list="ta-accounts" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono" [placeholder]="isBank ? '1.2.1' : '1.1'">
            <span class="text-[10px] text-gray-500">{{ accountName(form.accountingAccount) }}</span></label>
          <label class="block"><span class="font-semibold text-gray-600">Moeda</span>
            <input [(ngModel)]="form.currency" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 uppercase"></label>
          <label class="block"><span class="font-semibold text-gray-600">Saldo mínimo (aviso)</span>
            <input type="number" [(ngModel)]="form.minBalance" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <ng-container *ngIf="isBank">
            <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Banco</span>
              <input [(ngModel)]="form.bankName" list="ta-banks" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
            <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Balcão / agência</span>
              <input [(ngModel)]="form.branch" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
            <label class="block md:col-span-2"><span class="font-semibold text-gray-600">N.º da conta</span>
              <input [(ngModel)]="form.accountNumber" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono"></label>
            <label class="block md:col-span-2"><span class="font-semibold text-gray-600">NIB</span>
              <input [(ngModel)]="form.nib" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono"></label>
            <label class="block md:col-span-3"><span class="font-semibold text-gray-600">IBAN</span>
              <input [(ngModel)]="form.iban" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono"></label>
            <label class="block"><span class="font-semibold text-gray-600">SWIFT</span>
              <input [(ngModel)]="form.swift" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono uppercase"></label>
          </ng-container>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">{{ isBank ? 'Gestor de conta' : 'Responsável' }}</span>
            <input [(ngModel)]="form.responsible" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="flex items-center gap-2 md:col-span-2 mt-5"><input type="checkbox" [(ngModel)]="form.active"> Ativa</label>
          <label class="block col-span-2 md:col-span-4"><span class="font-semibold text-gray-600">Observações</span>
            <textarea [(ngModel)]="form.notes" rows="2" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></textarea></label>
        </div>
        <datalist id="ta-accounts"><option *ngFor="let a of postingAccounts" [value]="a.code">{{ a.code }} — {{ a.name }}</option></datalist>
        <datalist id="ta-banks"><option *ngFor="let b of banks" [value]="b"></option></datalist>
        <div class="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="form = null" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white">Cancelar</button>
          <button (click)="save()" [disabled]="busy" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white disabled:opacity-50">Gravar</button>
        </div>
      </div>
    </div>

    <!-- Transferência -->
    <div *ngIf="trf" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="trf = null">
      <div class="bg-white rounded shadow-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-gray-200 font-bold text-sm text-gray-800">Transferência entre caixas e bancos</div>
        <div class="p-4 grid grid-cols-2 gap-3 text-xs">
          <label class="block col-span-2"><span class="font-semibold text-gray-600">De *</span>
            <select [(ngModel)]="trf.fromId" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option *ngFor="let a of allActive" [value]="a.id">{{ a.type === 'BANK' ? 'Banco' : 'Caixa' }} {{ a.code }} — {{ a.name }} ({{ a.balance | number:'1.2-2' }})</option></select></label>
          <label class="block col-span-2"><span class="font-semibold text-gray-600">Para *</span>
            <select [(ngModel)]="trf.toId" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option *ngFor="let a of allActive" [value]="a.id" [disabled]="a.id === trf.fromId">{{ a.type === 'BANK' ? 'Banco' : 'Caixa' }} {{ a.code }} — {{ a.name }}</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Data *</span>
            <input type="date" [(ngModel)]="trf.date" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Valor *</span>
            <input type="number" min="0" step="0.01" [(ngModel)]="trf.amount" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block col-span-2"><span class="font-semibold text-gray-600">Descrição</span>
            <input [(ngModel)]="trf.description" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" placeholder="(automática: Depósito / Levantamento / Transferência)"></label>
          <p class="col-span-2 text-[11px] text-gray-500">Gera o lançamento: débito da conta de destino, crédito da conta de origem.</p>
          <p *ngIf="trfWarning" class="col-span-2 text-[11px] text-amber-700 font-semibold">{{ trfWarning }}</p>
        </div>
        <div class="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="trf = null" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white">Cancelar</button>
          <button (click)="doTransfer()" [disabled]="busy" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white disabled:opacity-50">Lançar transferência</button>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class TreasuryAccountsComponent implements OnChanges {
  @Input() type: 'CASH' | 'BANK' = 'CASH';

  api = `${environment.apiUrl}/treasury`;
  accounts: any[] = [];
  others: any[] = [];
  candidates: any[] = [];
  chart: any[] = [];
  transfers: any[] = [];
  selected: any = null;
  mov: any = null;
  form: any = null;
  trf: any = null;
  busy = false;
  from = iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  to = iso(new Date());
  banks = ['BCI', 'BIM - Millennium bim', 'Standard Bank', 'Absa', 'Moza Banco', 'FNB', 'Nedbank', 'Access Bank', 'Ecobank', 'First Capital Bank', 'Banco Letshego', 'Socremo', 'UBA', 'BNI'];

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  get isBank() { return this.type === 'BANK'; }
  get total() { return this.accounts.filter(a => a.active).reduce((s, a) => s + (Number(a.balance) || 0), 0); }
  get allActive() { return [...this.accounts, ...this.others].filter(a => a.active); }
  get candidateCodes() { return this.candidates.map(c => c.code).join(', '); }
  get postingAccounts() { return this.chart.filter(a => a.allowPosting !== false && a.code.startsWith(this.isBank ? '1.2' : '1.1')); }
  get trfWarning() {
    const f = this.allActive.find(a => a.id === this.trf?.fromId);
    return f && Number(this.trf?.amount) > f.balance ? `O valor é maior que o saldo de ${f.code} (${f.balance.toFixed(2)}).` : '';
  }

  ngOnChanges() {
    this.selected = null; this.mov = null;
    this.load();
    this.http.get<any[]>(`${environment.apiUrl}/accounting/accounts`).subscribe({ next: a => { this.chart = Array.isArray(a) ? a : []; }, error: () => { } });
  }

  async load() {
    try {
      const all = await firstValueFrom(this.http.get<any[]>(`${this.api}/accounts`));
      this.accounts = all.filter(a => a.type === this.type);
      this.others = all.filter(a => a.type !== this.type);
      this.candidates = (await firstValueFrom(this.http.get<any[]>(`${this.api}/accounts/chart-candidates`))).filter(c => c.type === this.type);
      this.transfers = (await firstValueFrom(this.http.get<any[]>(`${this.api}/transfers`)))
        .filter(t => this.accounts.some(a => a.code === t.fromCode || a.code === t.toCode));
      if (this.selected) this.selected = this.accounts.find(a => a.id === this.selected.id) || null;
      if (!this.selected && this.accounts.length) this.select(this.accounts[0]);
    } catch (e: any) { this.toaster.showError('Erro', e?.error?.message || 'Não foi possível carregar as fichas.'); }
    this.cdr.detectChanges();
  }

  select(a: any) { this.selected = a; this.loadMovements(); }

  async loadMovements() {
    if (!this.selected) return;
    try { this.mov = await firstValueFrom(this.http.get<any>(`${this.api}/accounts/${this.selected.id}/movements`, { params: { from: this.from, to: this.to } })); }
    catch (e: any) { this.toaster.showError('Erro', e?.error?.message || 'Não foi possível carregar os movimentos.'); }
    this.cdr.detectChanges();
  }

  accountName(code: string) { const a = this.chart.find(x => x.code === code); return code ? (a ? a.name + (a.allowPosting === false ? ' (conta de resumo)' : '') : 'conta não encontrada') : ''; }
  sourceLabel(t: string) {
    return ({ SALE: 'Venda', PURCHASE: 'Compra', PAYMENT: 'Pagamento', RECEIPT: 'Recebimento', MANUAL: 'Manual/transferência', VOUCHER: 'Vale de caixa', REVERSAL: 'Estorno', REGULARIZATION: 'Regularização' } as any)[t] || t || '';
  }

  newAccount() {
    const n = this.accounts.length + 1;
    this.form = { type: this.type, code: (this.isBank ? 'BC' : 'CX') + String(n).padStart(2, '0'), name: '', accountingAccount: '', currency: 'MZN', active: true };
  }
  edit(a: any) { this.form = { ...a }; }

  private errorText(e: any) { const er = e?.error?.errors; return Array.isArray(er) && er.length ? er.join(' ') : e?.error?.message || 'Não foi possível gravar.'; }

  async save() {
    this.busy = true;
    try {
      const saved = await firstValueFrom(this.http.post<any>(`${this.api}/accounts`, this.form));
      this.toaster.showSuccess('Gravado', `Ficha ${saved.code} gravada.`);
      this.form = null; this.selected = saved;
      await this.load();
    } catch (e: any) { this.toaster.showError('Erro', this.errorText(e)); }
    this.busy = false; this.cdr.detectChanges();
  }

  async importFromChart() {
    if (!confirm(`Criar fichas para as contas ${this.candidateCodes}?`)) return;
    try {
      const r = await firstValueFrom(this.http.post<any>(`${this.api}/accounts/import-from-chart`, {}));
      this.toaster.showSuccess('Fichas criadas', `${r.created} ficha(s) criada(s) a partir do plano de contas.`);
      await this.load();
    } catch (e: any) { this.toaster.showError('Erro', this.errorText(e)); }
  }

  openTransfer() {
    const all = this.allActive;
    const from = this.selected?.active ? this.selected : all[0];
    const to = all.find(a => a.id !== from?.id && a.type !== from?.type) || all.find(a => a.id !== from?.id);
    this.trf = { fromId: from?.id, toId: to?.id, date: iso(new Date()), amount: null, description: '' };
  }

  async doTransfer() {
    this.busy = true;
    try {
      const r = await firstValueFrom(this.http.post<any>(`${this.api}/transfers`, this.trf));
      this.toaster.showSuccess('Transferência lançada', `${r.description}: ${Number(r.amount).toFixed(2)}`);
      this.trf = null;
      await this.load();
      await this.loadMovements();
    } catch (e: any) { this.toaster.showError('Erro', this.errorText(e)); }
    this.busy = false; this.cdr.detectChanges();
  }

  exportCsv() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Data', 'Descrição', 'Referência', 'Origem', 'Entrada', 'Saída', 'Saldo'], ['', 'Saldo inicial', '', '', '', '', this.mov.opening],
      ...this.mov.lines.map((l: any) => [l.date, l.description, l.reference, this.sourceLabel(l.sourceType), l.debit || '', l.credit || '', l.balance])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `movimentos-${this.selected.code}-${this.from}-a-${this.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
