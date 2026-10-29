import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

/** Apuramento do IVA por período, a partir dos lançamentos (IVA liquidado, dedutível e regularizações). */
@Component({
  selector: 'app-vat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold text-gray-800">IVA — Apuramento</h1>
          <p class="text-xs text-gray-500">Calculado a partir dos lançamentos nas contas 4.4.3 (liquidado, dedutível e regularizações) no período.</p>
        </div>
        <div class="flex flex-wrap items-end gap-2 text-xs">
          <label class="block"><span class="font-semibold text-gray-600">Período</span>
            <select [(ngModel)]="mode" (ngModelChange)="applyMode()" class="mt-1 block border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option value="month">Mensal</option><option value="quarter">Trimestral</option><option value="custom">Personalizado</option></select></label>
          <label *ngIf="mode !== 'custom'" class="block"><span class="font-semibold text-gray-600">{{ mode === 'month' ? 'Mês' : 'Mês inicial' }}</span>
            <input type="month" [(ngModel)]="month" (ngModelChange)="applyMode()" class="mt-1 block border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">De</span><input type="date" [(ngModel)]="from" [disabled]="mode !== 'custom'" class="mt-1 block border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Até</span><input type="date" [(ngModel)]="to" [disabled]="mode !== 'custom'" class="mt-1 block border border-gray-300 rounded px-2 py-1.5"></label>
          <button (click)="load()" [disabled]="busy" class="px-4 py-2 font-bold rounded bg-blue-600 text-white">Calcular</button>
        </div>
      </div>

      <ng-container *ngIf="s">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">IVA liquidado (vendas)</div><div class="text-lg font-bold">{{ s.liquidado | number:'1.2-2' }}</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">IVA dedutível (compras)</div><div class="text-lg font-bold">{{ s.dedutivel | number:'1.2-2' }}</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Regularizações (Estado − empresa)</div><div class="text-lg font-bold">{{ s.regFavorEstado - s.regFavorEmpresa | number:'1.2-2' }}</div></div>
          <div class="bg-white border rounded p-3" [ngClass]="s.toPay ? 'border-red-200' : 'border-green-200'">
            <div class="text-[11px] text-gray-500">{{ s.toPay ? 'IVA a pagar ao Estado' : 'IVA a recuperar' }}</div>
            <div class="text-lg font-bold" [class.text-red-700]="s.toPay" [class.text-green-700]="!s.toPay">{{ (s.toPay || s.toRecover) | number:'1.2-2' }}</div></div>
          <div class="bg-white border border-gray-200 rounded p-3 text-xs">
            <div class="text-[11px] text-gray-500 mb-1">Apuramento</div>
            <div *ngIf="s.settlement" class="text-green-700 font-semibold">Lançado em {{ s.settlement.date | date:'dd/MM/yyyy' }}</div>
            <button *ngIf="!s.settlement" (click)="settle()" [disabled]="busy || (!s.liquidado && !s.dedutivel)" class="px-3 py-1.5 font-bold rounded bg-slate-700 text-white disabled:bg-gray-300">Lançar apuramento</button>
          </div>
        </div>
        <p class="text-[11px] text-gray-500">O apuramento salda as contas de IVA liquidado, dedutível e regularizações do período e regista o resultado em 4.4.3.7 (a pagar) ou 4.4.3.8 (a recuperar), com a data do fim do período.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div *ngFor="let side of sides" class="bg-white border border-gray-200 rounded shadow-sm">
            <div class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700">{{ side.label }} — por taxa</div>
            <table class="w-full text-xs">
              <thead class="bg-gray-50 text-gray-600"><tr><th class="text-left px-3 py-1.5">Taxa</th><th class="text-right px-3 py-1.5">Base tributável</th><th class="text-right px-3 py-1.5">IVA</th></tr></thead>
              <tbody>
                <tr *ngFor="let r of side.data.byRate" class="border-t border-gray-100"><td class="px-3 py-1.5">{{ r.rate }}%</td><td class="px-3 py-1.5 text-right">{{ r.base | number:'1.2-2' }}</td><td class="px-3 py-1.5 text-right">{{ r.iva | number:'1.2-2' }}</td></tr>
                <tr *ngIf="!side.data.byRate.length"><td colspan="3" class="px-3 py-2 text-gray-400">Sem documentos.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded shadow-sm">
          <div class="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <span class="text-xs font-bold text-gray-700">Documentos do período</span>
            <div class="flex gap-2 text-xs">
              <button *ngFor="let side of sides" (click)="docSide = side.key" class="px-2 py-1 rounded border" [ngClass]="docSide === side.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'">{{ side.label }} ({{ side.data.documents.length }})</button>
              <button (click)="exportCsv()" class="px-2 py-1 rounded border border-gray-300">Exportar CSV</button>
            </div>
          </div>
          <div class="max-h-[420px] overflow-y-auto">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 text-gray-600 sticky top-0"><tr><th class="text-left px-3 py-1.5">Data</th><th class="text-left px-3 py-1.5">Documento</th><th class="text-left px-3 py-1.5">Entidade</th><th class="text-left px-3 py-1.5">NUIT</th><th class="text-right px-3 py-1.5">Base</th><th class="text-right px-3 py-1.5">IVA</th></tr></thead>
              <tbody>
                <tr *ngFor="let d of docs" class="border-t border-gray-100">
                  <td class="px-3 py-1.5">{{ d.date | date:'dd/MM/yyyy' }}</td><td class="px-3 py-1.5">{{ d.number }}</td><td class="px-3 py-1.5">{{ d.entity }}</td><td class="px-3 py-1.5">{{ d.nif || '—' }}</td>
                  <td class="px-3 py-1.5 text-right">{{ d.base | number:'1.2-2' }}</td><td class="px-3 py-1.5 text-right">{{ d.iva | number:'1.2-2' }}</td></tr>
                <tr *ngIf="!docs.length"><td colspan="6" class="px-3 py-2 text-gray-400">Sem documentos.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded shadow-sm">
          <div class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700">Movimento das contas de IVA no período</div>
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600"><tr><th class="text-left px-3 py-1.5">Conta</th><th class="text-left px-3 py-1.5">Designação</th><th class="text-right px-3 py-1.5">Débito</th><th class="text-right px-3 py-1.5">Crédito</th><th class="text-right px-3 py-1.5">Saldo</th></tr></thead>
            <tbody>
              <tr *ngFor="let a of s.accounts" class="border-t border-gray-100"><td class="px-3 py-1.5 font-mono">{{ a.code }}</td><td class="px-3 py-1.5">{{ a.name }}</td>
                <td class="px-3 py-1.5 text-right">{{ a.debit | number:'1.2-2' }}</td><td class="px-3 py-1.5 text-right">{{ a.credit | number:'1.2-2' }}</td><td class="px-3 py-1.5 text-right">{{ a.balance | number:'1.2-2' }}</td></tr>
              <tr *ngIf="!s.accounts.length"><td colspan="5" class="px-3 py-2 text-gray-400">Sem movimentos de IVA no período.</td></tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  </div>
  `,
})
export class VatComponent implements OnInit {
  mode: 'month' | 'quarter' | 'custom' = 'month';
  month = new Date().toISOString().slice(0, 7);
  from = ''; to = '';
  s: any = null;
  busy = false;
  docSide: 'sales' | 'purchases' = 'sales';
  private api = `${environment.apiUrl}/accounting/tools`;

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  get sides() { return this.s ? [{ key: 'sales', label: 'Vendas (liquidado)', data: this.s.sales }, { key: 'purchases', label: 'Compras (dedutível)', data: this.s.purchases }] as any[] : []; }
  get docs() { return this.s ? (this.docSide === 'sales' ? this.s.sales.documents : this.s.purchases.documents) : []; }

  ngOnInit() { this.applyMode(); this.load(); }

  applyMode() {
    if (this.mode === 'custom') return;
    const [y, m] = this.month.split('-').map(Number);
    const months = this.mode === 'quarter' ? 3 : 1;
    this.from = `${y}-${String(m).padStart(2, '0')}-01`;
    this.to = new Date(Date.UTC(y, m - 1 + months, 0)).toISOString().slice(0, 10);
  }

  async load() {
    this.busy = true;
    try { this.s = await firstValueFrom(this.http.get<any>(`${this.api}/vat`, { params: { from: this.from, to: this.to } })); }
    catch (e: any) { this.toaster.showError('IVA', e?.error?.message || 'Não foi possível calcular.'); }
    this.busy = false; this.cdr.detectChanges();
  }

  async settle() {
    const msg = this.s.toPay ? `IVA a pagar: ${this.s.toPay}` : `IVA a recuperar: ${this.s.toRecover}`;
    if (!confirm(`Lançar o apuramento do IVA de ${this.from} a ${this.to}?\n\n${msg}`)) return;
    this.busy = true;
    try {
      this.s = await firstValueFrom(this.http.post<any>(`${this.api}/vat/settle`, { from: this.from, to: this.to }));
      this.toaster.showSuccess('IVA', 'Apuramento lançado.');
    } catch (e: any) { this.toaster.showError('IVA', e?.error?.message || 'Falhou.'); }
    this.busy = false; this.cdr.detectChanges();
  }

  exportCsv() {
    const rows = [['Tipo', 'Data', 'Documento', 'Entidade', 'NUIT', 'Base', 'IVA'].join(';')];
    for (const side of this.sides) for (const d of side.data.documents) rows.push([side.label, d.date, d.number, d.entity, d.nif || '', d.base, d.iva].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `iva-${this.from}-${this.to}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
