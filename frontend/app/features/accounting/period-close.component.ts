import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Fecho mensal (bloqueia lançamentos), apuramento de resultados e fecho do exercício. */
@Component({
  selector: 'app-period-close',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold text-gray-800">Fecho de Período</h1>
          <p class="text-xs text-gray-500">Um mês fechado não aceita lançamentos nem documentos com datas desse mês. Reabrir exige motivo e fica registado.</p>
        </div>
        <label class="text-xs"><span class="font-semibold text-gray-600">Exercício</span>
          <input type="number" [(ngModel)]="year" (change)="load()" class="mt-1 block border border-gray-300 rounded px-2 py-1.5 w-24"></label>
      </div>

      <div *ngIf="data" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div *ngFor="let m of data.months" class="bg-white border rounded p-3 text-xs space-y-1"
             [ngClass]="m.status === 'CLOSED' ? 'border-gray-400 bg-gray-50' : 'border-gray-200'">
          <div class="flex items-center justify-between">
            <b class="text-sm text-gray-800">{{ monthName(m.month) }}</b>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" [ngClass]="m.status === 'CLOSED' ? 'bg-gray-700 text-white' : 'bg-green-100 text-green-800'">{{ m.status === 'CLOSED' ? 'FECHADO' : 'ABERTO' }}</span>
          </div>
          <div class="text-gray-500">{{ m.postedEntries }} lançamento(s)</div>
          <div *ngIf="pending(m)" class="text-amber-700">{{ pending(m) }}</div>
          <div *ngIf="m.unbalancedEntries" class="text-red-600">{{ m.unbalancedEntries }} desequilibrado(s)</div>
          <div *ngIf="m.status === 'CLOSED'" class="text-gray-400">por {{ m.closedBy || '—' }} em {{ m.closedAt | date:'dd/MM/yyyy' }}</div>
          <button *ngIf="m.status === 'OPEN'" (click)="close(m)" [disabled]="busy || isFuture(m)" class="w-full mt-1 px-2 py-1 rounded bg-slate-700 text-white font-semibold disabled:bg-gray-300">Fechar</button>
          <button *ngIf="m.status === 'CLOSED'" (click)="reopen(m)" [disabled]="busy" class="w-full mt-1 px-2 py-1 rounded border border-gray-400 font-semibold">Reabrir</button>
        </div>
      </div>

      <div *ngIf="results" class="bg-white border border-gray-200 rounded shadow-sm p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold text-gray-800">Apuramento de resultados {{ year }}</h3>
            <p class="text-xs text-gray-500">Salda as contas de gastos (classe 6) e de rendimentos (classe 7) contra 8.8 Resultado líquido, com a data de {{ results.to | date:'dd/MM/yyyy' }}.</p>
          </div>
          <div class="text-right text-xs">
            <div>Rendimentos {{ results.totalRevenues | number:'1.2-2' }} · Gastos {{ results.totalExpenses | number:'1.2-2' }}</div>
            <div class="text-base font-bold" [class.text-green-700]="results.result >= 0" [class.text-red-600]="results.result < 0">{{ results.result >= 0 ? 'Lucro' : 'Prejuízo' }} {{ (results.result < 0 ? -results.result : results.result) | number:'1.2-2' }}</div>
          </div>
        </div>
        <div class="flex gap-2 items-center text-xs">
          <span *ngIf="results.posted" class="text-green-700 font-semibold">Apuramento lançado ({{ results.posted.date | date:'dd/MM/yyyy' }}).</span>
          <button *ngIf="!results.posted" (click)="postResults()" [disabled]="busy || (!results.expenses.length && !results.revenues.length)" class="px-4 py-2 font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Lançar apuramento de resultados</button>
          <button (click)="showResultLines = !showResultLines" class="px-3 py-2 rounded border border-gray-300">{{ showResultLines ? 'Ocultar contas' : 'Ver contas' }}</button>
        </div>
        <table *ngIf="showResultLines" class="w-full text-xs">
          <thead class="bg-gray-50 text-gray-600"><tr><th class="text-left px-3 py-1.5">Conta</th><th class="text-left px-3 py-1.5">Designação</th><th class="text-right px-3 py-1.5">Saldo a apurar</th></tr></thead>
          <tbody>
            <tr *ngFor="let a of results.revenues.concat(results.expenses)" class="border-t border-gray-100">
              <td class="px-3 py-1.5 font-mono">{{ a.code }}</td><td class="px-3 py-1.5">{{ a.name }}</td><td class="px-3 py-1.5 text-right">{{ (a.balance < 0 ? -a.balance : a.balance) | number:'1.2-2' }} {{ a.balance < 0 ? 'C' : 'D' }}</td></tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="data?.fiscalYear" class="bg-white border border-gray-200 rounded shadow-sm p-4 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold text-gray-800">Fecho do exercício {{ year }}</h3>
            <p class="text-xs text-gray-500">Fecha o ano inteiro. Verifica o balancete, documentos por aprovar e reconciliações.</p>
          </div>
          <span class="px-2 py-1 rounded text-xs font-bold" [ngClass]="data.fiscalYear.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-700 text-white'">{{ data.fiscalYear.status === 'OPEN' ? 'ABERTO' : 'FECHADO' }}</span>
        </div>
        <div class="flex gap-2 text-xs">
          <button (click)="checklist()" [disabled]="busy" class="px-3 py-2 rounded border border-gray-300">Verificar checklist</button>
          <button *ngIf="data.fiscalYear.status === 'OPEN'" (click)="closeYear()" [disabled]="busy" class="px-3 py-2 rounded bg-slate-700 text-white font-semibold">Fechar exercício</button>
          <button *ngIf="data.fiscalYear.status !== 'OPEN'" (click)="reopenYear()" [disabled]="busy" class="px-3 py-2 rounded border border-gray-400 font-semibold">Reabrir exercício</button>
        </div>
        <ul *ngIf="check" class="text-xs space-y-1">
          <li [class.text-green-700]="check.trialBalance.ok" [class.text-red-600]="!check.trialBalance.ok">{{ check.trialBalance.ok ? '✓' : '✗' }} Balancete equilibrado (diferença {{ check.trialBalance.difference | number:'1.2-2' }})</li>
          <li [class.text-green-700]="check.pendingDocuments.ok" [class.text-red-600]="!check.pendingDocuments.ok">{{ check.pendingDocuments.ok ? '✓' : '✗' }} Documentos por aprovar: {{ check.pendingDocuments.total }}</li>
          <li [class.text-green-700]="check.reconciliations.ok" [class.text-amber-700]="!check.reconciliations.ok">{{ check.reconciliations.ok ? '✓' : '!' }} Documentos de tesouraria sem documento relacionado: {{ check.reconciliations.pending }}</li>
        </ul>
      </div>
    </div>
  </div>
  `,
})
export class PeriodCloseComponent implements OnInit {
  year = new Date().getFullYear();
  data: any = null;
  results: any = null;
  check: any = null;
  busy = false;
  showResultLines = false;
  private api = `${environment.apiUrl}/accounting/tools`;

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  ngOnInit() { this.load(); }

  monthName(m: number) { return MONTHS[m - 1]; }
  isFuture(m: any) { return m.from > new Date().toISOString().slice(0, 10); }
  pending(m: any) {
    const p: string[] = [];
    if (m.draftEntries) p.push(`${m.draftEntries} lançamento(s) em rascunho`);
    if (m.draftSales + m.draftPurchases) p.push(`${m.draftSales + m.draftPurchases} documento(s) por aprovar`);
    return p.join(' · ');
  }

  private err(e: any) { return (e?.error?.errors?.length ? e.error.errors.join(' ') : '') || e?.error?.message || 'Falhou.'; }

  async load() {
    this.busy = true; this.check = null;
    try {
      this.data = await firstValueFrom(this.http.get<any>(`${this.api}/months`, { params: { year: String(this.year) } }));
      this.results = await firstValueFrom(this.http.get<any>(`${this.api}/results`, { params: { year: String(this.year) } })).catch(() => null);
    } catch (e: any) { this.toaster.showError('Fecho de período', this.err(e)); }
    this.busy = false; this.cdr.detectChanges();
  }

  async close(m: any) {
    const reason = prompt(`Fechar ${this.monthName(m.month)} de ${this.year}?\n\nMotivo / observação (opcional):`, `Fecho de ${this.monthName(m.month).toLowerCase()}`);
    if (reason === null) return;
    this.busy = true;
    try {
      await firstValueFrom(this.http.post(`${this.api}/months/close`, { year: this.year, month: m.month, reason }));
      this.toaster.showSuccess('Fecho de período', `${this.monthName(m.month)} fechado.`);
    } catch (e: any) {
      const errs = e?.error?.errors;
      if (e?.status === 400 && errs?.length && confirm(`${e.error.message}\n\n• ${errs.join('\n• ')}\n\nFechar mesmo assim?`)) {
        try { await firstValueFrom(this.http.post(`${this.api}/months/close`, { year: this.year, month: m.month, reason, force: true })); this.toaster.showSuccess('Fecho de período', `${this.monthName(m.month)} fechado.`); }
        catch (e2: any) { this.toaster.showError('Fecho de período', this.err(e2)); }
      } else if (!errs?.length) this.toaster.showError('Fecho de período', this.err(e));
    }
    this.busy = false; await this.load();
  }

  async reopen(m: any) {
    const reason = prompt(`Reabrir ${this.monthName(m.month)} de ${this.year}?\n\nMotivo (obrigatório, fica no registo de auditoria):`);
    if (!reason?.trim()) return;
    this.busy = true;
    try { await firstValueFrom(this.http.post(`${this.api}/months/reopen`, { year: this.year, month: m.month, reason })); this.toaster.showSuccess('Fecho de período', `${this.monthName(m.month)} reaberto.`); }
    catch (e: any) { this.toaster.showError('Fecho de período', this.err(e)); }
    this.busy = false; await this.load();
  }

  async postResults() {
    const r = this.results;
    if (!confirm(`Lançar o apuramento de resultados de ${this.year}?\n\n${r.result >= 0 ? 'Lucro' : 'Prejuízo'}: ${Math.abs(r.result).toLocaleString('pt-PT')} MT\n\nAs contas das classes 6 e 7 ficam saldadas contra 8.8.`)) return;
    this.busy = true;
    try { this.results = await firstValueFrom(this.http.post<any>(`${this.api}/results/post`, { year: this.year })); this.toaster.showSuccess('Resultados', 'Apuramento lançado.'); }
    catch (e: any) { this.toaster.showError('Resultados', this.err(e)); }
    this.busy = false; this.cdr.detectChanges();
  }

  async checklist() {
    try { this.check = (await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/fiscal-years/${this.data.fiscalYear.id}/checklist`))).checklist; }
    catch (e: any) { this.toaster.showError('Exercício', this.err(e)); }
    this.cdr.detectChanges();
  }

  private user() { try { return JSON.parse(localStorage.getItem('erp_current_user') || '{}'); } catch { return {}; } }

  async closeYear() {
    const reason = prompt(`Fechar o exercício ${this.year}? Depois disso não se lança nada neste ano.\n\nMotivo:`, `Fecho do exercício ${this.year}`);
    if (!reason?.trim()) return;
    const u = this.user();
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/fiscal-years/${this.data.fiscalYear.id}/close`, { reason, userId: u.id, username: u.username }));
      this.toaster.showSuccess('Exercício', `Exercício ${this.year} fechado.`);
    } catch (e: any) {
      this.check = e?.error?.checklist || this.check;
      this.toaster.showError('Exercício', this.err(e));
    }
    await this.load();
  }

  async reopenYear() {
    const reason = prompt(`Reabrir o exercício ${this.year}?\n\nMotivo (obrigatório):`);
    if (!reason?.trim()) return;
    const u = this.user();
    try { await firstValueFrom(this.http.post(`${environment.apiUrl}/fiscal-years/${this.data.fiscalYear.id}/reopen`, { reason, userId: u.id, username: u.username })); this.toaster.showSuccess('Exercício', `Exercício ${this.year} reaberto.`); }
    catch (e: any) { this.toaster.showError('Exercício', this.err(e)); }
    await this.load();
  }
}
