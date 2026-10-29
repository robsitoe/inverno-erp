import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

/** Utilitários contabilísticos: verificação de integridade, reparações e registo de auditoria. */
@Component({
  selector: 'app-accounting-utilities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 class="text-lg font-bold text-gray-800">Utilitários de Contabilidade</h1>
        <p class="text-xs text-gray-500">Verificação da integridade dos dados contabilísticos, reparações e registo de auditoria.</p>
      </div>

      <div class="bg-white border border-gray-200 rounded shadow-sm">
        <div class="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold text-gray-800">Verificação de integridade</h3>
            <p *ngIf="integrity" class="text-xs" [class.text-green-700]="integrity.ok" [class.text-red-600]="!integrity.ok">
              {{ integrity.ok ? 'Todos os controlos estão corretos.' : 'Há controlos com problemas.' }} Verificado às {{ integrity.checkedAt | date:'HH:mm:ss' }}.</p>
          </div>
          <div class="flex gap-2 text-xs">
            <button (click)="check()" [disabled]="busy" class="px-3 py-2 rounded bg-blue-600 text-white font-bold">Verificar agora</button>
            <button (click)="recalc()" [disabled]="busy" class="px-3 py-2 rounded border border-gray-300" title="Volta a calcular os saldos de todas as contas a partir dos lançamentos">Recalcular saldos</button>
            <button (click)="orphans()" [disabled]="busy" class="px-3 py-2 rounded border border-gray-300" title="Anula os lançamentos de documentos que já não existem (faz cópia de segurança antes)">Corrigir órfãos</button>
          </div>
        </div>
        <div *ngIf="integrity" class="divide-y divide-gray-100">
          <div *ngFor="let c of integrity.checks" class="px-4 py-2 text-xs">
            <button (click)="open[c.key] = !open[c.key]" [disabled]="!c.items.length" class="w-full flex items-center gap-2 text-left">
              <span class="w-5 text-center font-bold" [class.text-green-600]="c.ok" [class.text-red-600]="!c.ok">{{ c.ok ? '✓' : '✗' }}</span>
              <span class="flex-1 text-gray-800">{{ c.label }}</span>
              <span class="text-gray-500">{{ c.detail }}</span>
              <span *ngIf="c.items.length" class="text-blue-700">{{ open[c.key] ? 'ocultar' : 'ver' }}</span>
            </button>
            <table *ngIf="open[c.key]" class="mt-2 w-full text-[11px] bg-gray-50">
              <tr *ngFor="let it of c.items" class="border-t border-gray-200">
                <td class="px-2 py-1 font-mono">{{ it.id || it.code }}</td>
                <td class="px-2 py-1">{{ it.date ? (it.date | date:'dd/MM/yyyy') : (it.name || '') }}</td>
                <td class="px-2 py-1">{{ it.description || it.code || it.sourceType || '' }}</td>
                <td class="px-2 py-1 text-right">{{ itemValue(c.key, it) }}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded shadow-sm">
        <div class="px-4 py-3 border-b border-gray-200 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold text-gray-800">Registo de auditoria</h3>
            <p class="text-xs text-gray-500">Lançamentos criados, anulados e estornados, fechos e reaberturas de período e apuramentos.</p>
          </div>
          <div class="flex flex-wrap gap-2 items-end text-xs">
            <label class="block"><span class="text-gray-600">De</span><input type="date" [(ngModel)]="from" class="mt-1 block border border-gray-300 rounded px-2 py-1"></label>
            <label class="block"><span class="text-gray-600">Até</span><input type="date" [(ngModel)]="to" class="mt-1 block border border-gray-300 rounded px-2 py-1"></label>
            <button (click)="page = 1; loadAudit()" class="px-3 py-1.5 rounded border border-gray-300">Filtrar</button>
            <button (click)="exportCsv()" class="px-3 py-1.5 rounded border border-gray-300">Exportar CSV</button>
          </div>
        </div>
        <table class="w-full text-xs">
          <thead class="bg-gray-50 text-gray-600"><tr><th class="text-left px-3 py-1.5">Quando</th><th class="text-left px-3 py-1.5">Origem</th><th class="text-left px-3 py-1.5">Ação</th><th class="text-left px-3 py-1.5">Descrição</th><th class="text-left px-3 py-1.5">Utilizador</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of audit?.records" class="border-t border-gray-100">
              <td class="px-3 py-1.5 whitespace-nowrap">{{ r.quando | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="px-3 py-1.5">{{ r.origem === 'PERIODO' ? 'Período' : 'Lançamento' }}</td>
              <td class="px-3 py-1.5"><span class="px-1.5 py-0.5 rounded" [ngClass]="actionClass(r.acao)">{{ actionLabel(r.acao) }}</span></td>
              <td class="px-3 py-1.5">{{ r.descricao }}</td>
              <td class="px-3 py-1.5">{{ r.utilizador || '—' }}</td>
            </tr>
            <tr *ngIf="!audit?.records?.length"><td colspan="5" class="px-3 py-3 text-gray-400">Sem registos.</td></tr>
          </tbody>
        </table>
        <div *ngIf="audit" class="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <span>{{ audit.total }} registo(s)</span>
          <div class="flex gap-2 items-center">
            <button (click)="go(-1)" [disabled]="page <= 1" class="px-2 py-1 rounded border border-gray-300 disabled:opacity-40">Anterior</button>
            <span>Página {{ page }} de {{ pages }}</span>
            <button (click)="go(1)" [disabled]="page >= pages" class="px-2 py-1 rounded border border-gray-300 disabled:opacity-40">Seguinte</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class AccountingUtilitiesComponent implements OnInit {
  integrity: any = null;
  audit: any = null;
  open: Record<string, boolean> = {};
  busy = false;
  page = 1;
  limit = 50;
  from = '';
  to = '';
  private api = `${environment.apiUrl}/accounting/tools`;

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  get pages() { return Math.max(1, Math.ceil((this.audit?.total || 0) / this.limit)); }

  ngOnInit() { this.check(); this.loadAudit(); }

  itemValue(key: string, it: any) {
    if (key === 'unbalanced') return `D ${it.d} · C ${it.c}`;
    if (key === 'drift') return `guardado ${it.stored} · lançamentos ${it.computed}`;
    return '';
  }
  actionLabel(a: string) {
    return ({ CRIACAO: 'Criação', ANULACAO: 'Anulação', ESTORNO: 'Estorno', CLOSE: 'Fecho do exercício', REOPEN: 'Reabertura do exercício',
      CLOSE_MONTH: 'Fecho de mês', REOPEN_MONTH: 'Reabertura de mês', RESULTS: 'Apuramento de resultados' } as any)[a] || a;
  }
  actionClass(a: string) {
    return ['ANULACAO', 'REOPEN', 'REOPEN_MONTH'].includes(a) ? 'bg-amber-100 text-amber-800'
      : ['CLOSE', 'CLOSE_MONTH', 'RESULTS'].includes(a) ? 'bg-slate-200 text-slate-800' : 'bg-gray-100 text-gray-700';
  }

  async check() {
    this.busy = true;
    try { this.integrity = await firstValueFrom(this.http.get<any>(`${this.api}/integrity`)); }
    catch (e: any) { this.toaster.showError('Integridade', e?.error?.message || 'Falhou.'); }
    this.busy = false; this.cdr.detectChanges();
  }

  async recalc() {
    if (!confirm('Recalcular os saldos de todas as contas a partir dos lançamentos?')) return;
    this.busy = true;
    try {
      const r = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/accounting/accounts/recalculate`, {}));
      this.toaster.showSuccess('Saldos', `Saldos recalculados (${r?.processedEntries ?? ''} lançamentos).`);
    } catch (e: any) { this.toaster.showError('Saldos', e?.error?.message || 'Falhou.'); }
    this.busy = false; await this.check();
  }

  async orphans() {
    if (!confirm('Anular os lançamentos de documentos que já não existem? É feita uma cópia de segurança antes.\n\nDepois recalcule os saldos.')) return;
    this.busy = true;
    try {
      const r = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/admin/maintenance/integrity/repair-orphans`, {}));
      this.toaster.showSuccess('Órfãos', `${r.cancelled} lançamento(s) anulado(s). Cópia: ${r.safetyBackup}`);
    } catch (e: any) { this.toaster.showError('Órfãos', e?.error?.message || 'Falhou.'); }
    this.busy = false; await this.check(); await this.loadAudit();
  }

  async loadAudit() {
    const params: any = { page: String(this.page), limit: String(this.limit) };
    if (this.from) params.from = this.from;
    if (this.to) params.to = this.to;
    try { this.audit = await firstValueFrom(this.http.get<any>(`${this.api}/audit`, { params })); }
    catch (e: any) { this.toaster.showError('Auditoria', e?.error?.message || 'Falhou.'); }
    this.cdr.detectChanges();
  }
  go(d: number) { this.page = Math.min(this.pages, Math.max(1, this.page + d)); this.loadAudit(); }

  async exportCsv() {
    const params: any = { page: '1', limit: '500' };
    if (this.from) params.from = this.from;
    if (this.to) params.to = this.to;
    const all = await firstValueFrom(this.http.get<any>(`${this.api}/audit`, { params }));
    const rows = [['Quando', 'Origem', 'Ação', 'Descrição', 'Utilizador', 'Referência'].join(';'),
      ...all.records.map((r: any) => [r.quando, r.origem, this.actionLabel(r.acao), r.descricao, r.utilizador, r.referencia].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))];
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `auditoria-contabilidade.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
