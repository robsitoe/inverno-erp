import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Tesouraria previsional: saldo atual + recebimentos − pagamentos previstos, por semana ou mês. */
@Component({
  selector: 'app-treasury-forecast',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-lg font-bold text-gray-800">Tesouraria Previsional</h1>
          <p class="text-xs text-gray-500">Saldo atual das caixas e bancos, mais o que está por receber, menos o que está por pagar: clientes e fornecedores em aberto,
            cheques e letras, e previsões manuais (salários, rendas, impostos...). O que já está vencido entra no primeiro período.</p>
        </div>
        <div class="flex items-end gap-2 text-xs">
          <label><span class="block font-semibold text-gray-500">Horizonte</span>
            <select [(ngModel)]="horizon" (ngModelChange)="load()" class="border border-gray-300 rounded px-2 py-1 bg-white">
              <option [ngValue]="30">30 dias</option><option [ngValue]="60">60 dias</option><option [ngValue]="90">90 dias</option><option [ngValue]="180">6 meses</option><option [ngValue]="365">12 meses</option></select></label>
          <label><span class="block font-semibold text-gray-500">Por</span>
            <select [(ngModel)]="granularity" (ngModelChange)="load()" class="border border-gray-300 rounded px-2 py-1 bg-white">
              <option value="WEEK">Semana</option><option value="MONTH">Mês</option></select></label>
          <button (click)="exportCsv()" [disabled]="!fc" class="px-3 py-1.5 font-bold rounded border border-gray-300 bg-white">Exportar CSV</button>
        </div>
      </div>

      <div *ngIf="fc" class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="bg-white border border-gray-200 rounded-lg p-3"><div class="text-[11px] font-semibold text-gray-500">Saldo atual</div>
          <div class="text-lg font-bold font-mono">{{ fc.opening | number:'1.2-2' }}</div>
          <div class="text-[10px] text-gray-400">{{ fc.accountsUsed ? fc.accountsUsed + ' caixa(s)/banco(s)' : 'contas 1.1 e 1.2 do plano' }}</div></div>
        <div class="bg-white border border-gray-200 rounded-lg p-3"><div class="text-[11px] font-semibold text-gray-500">A receber</div>
          <div class="text-lg font-bold font-mono text-green-700">+{{ fc.inflows | number:'1.2-2' }}</div>
          <div class="text-[10px] text-gray-400">{{ fc.overdueIn ? (fc.overdueIn | number:'1.0-0') + ' já vencido' : 'nada vencido' }}</div></div>
        <div class="bg-white border border-gray-200 rounded-lg p-3"><div class="text-[11px] font-semibold text-gray-500">A pagar</div>
          <div class="text-lg font-bold font-mono text-red-600">−{{ fc.outflows | number:'1.2-2' }}</div>
          <div class="text-[10px] text-gray-400">{{ fc.overdueOut ? (fc.overdueOut | number:'1.0-0') + ' já vencido' : 'nada vencido' }}</div></div>
        <div class="bg-white border rounded-lg p-3" [ngClass]="fc.closing < 0 ? 'border-red-300' : 'border-gray-200'"><div class="text-[11px] font-semibold text-gray-500">Saldo previsto em {{ fc.end | date:'dd/MM/yyyy' }}</div>
          <div class="text-lg font-bold font-mono" [ngClass]="fc.closing < 0 ? 'text-red-600' : 'text-gray-900'">{{ fc.closing | number:'1.2-2' }}</div></div>
        <div class="bg-white border rounded-lg p-3" [ngClass]="fc.minimum.balance < 0 ? 'border-red-400 bg-red-50' : 'border-gray-200'"><div class="text-[11px] font-semibold text-gray-500">Ponto mais baixo</div>
          <div class="text-lg font-bold font-mono" [ngClass]="fc.minimum.balance < 0 ? 'text-red-600' : 'text-gray-900'">{{ fc.minimum.balance | number:'1.2-2' }}</div>
          <div class="text-[10px]" [ngClass]="fc.minimum.balance < 0 ? 'text-red-600 font-bold' : 'text-gray-400'">{{ fc.minimum.period ? (fc.minimum.balance < 0 ? 'Falta de liquidez em ' : 'em ') + fc.minimum.period : 'hoje' }}</div></div>
      </div>

      <!-- Gráfico de saldos -->
      <div *ngIf="fc?.periods?.length" class="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
        <div class="text-xs font-bold text-gray-700 mb-2">Saldo previsto no fim de cada {{ granularity === 'WEEK' ? 'semana' : 'mês' }}</div>
        <div class="flex items-end gap-1 h-40 border-b border-gray-300 relative">
          <div *ngFor="let p of fc.periods" class="flex-1 flex flex-col justify-end items-center h-full group relative" [title]="p.label + ': ' + (p.closing | number:'1.2-2')">
            <div class="w-full rounded-t" [style.height.%]="barHeight(p.closing)" [ngClass]="p.closing < 0 ? 'bg-red-400' : 'bg-blue-500'"></div>
            <div class="absolute -top-4 text-[9px] font-mono text-gray-600 opacity-0 group-hover:opacity-100 whitespace-nowrap">{{ p.closing | number:'1.0-0' }}</div>
          </div>
        </div>
        <div class="flex gap-1 mt-1"><div *ngFor="let p of fc.periods" class="flex-1 text-center text-[9px] text-gray-500 truncate">{{ p.label }}</div></div>
      </div>

      <!-- Tabela por período -->
      <div *ngIf="fc" class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 text-gray-600"><tr>
            <th class="px-3 py-2 text-left">Período</th>
            <th *ngFor="let s of sources" class="px-3 py-2 text-right">{{ s }}</th>
            <th class="px-3 py-2 text-right">Entradas</th><th class="px-3 py-2 text-right">Saídas</th><th class="px-3 py-2 text-right">Líquido</th><th class="px-3 py-2 text-right">Saldo</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            <tr class="bg-gray-50 font-semibold"><td class="px-3 py-1.5">Saldo atual</td><td *ngFor="let s of sources"></td><td></td><td></td><td></td><td class="px-3 py-1.5 text-right font-mono">{{ fc.opening | number:'1.2-2' }}</td></tr>
            <tr *ngFor="let p of fc.periods" class="hover:bg-blue-50 cursor-pointer" (click)="detailPeriod = detailPeriod === p ? null : p" [class.bg-blue-50]="detailPeriod === p">
              <td class="px-3 py-1.5 whitespace-nowrap font-semibold">{{ p.label }}</td>
              <td *ngFor="let s of sources" class="px-3 py-1.5 text-right font-mono" [ngClass]="(p.bySource[s] || 0) < 0 ? 'text-red-600' : 'text-green-700'">{{ p.bySource[s] ? (p.bySource[s] | number:'1.2-2') : '' }}</td>
              <td class="px-3 py-1.5 text-right font-mono text-green-700">{{ p.inflows ? (p.inflows | number:'1.2-2') : '' }}</td>
              <td class="px-3 py-1.5 text-right font-mono text-red-600">{{ p.outflows ? (p.outflows | number:'1.2-2') : '' }}</td>
              <td class="px-3 py-1.5 text-right font-mono" [ngClass]="p.net < 0 ? 'text-red-600' : ''">{{ p.net | number:'1.2-2' }}</td>
              <td class="px-3 py-1.5 text-right font-mono font-bold" [ngClass]="p.closing < 0 ? 'text-red-600 bg-red-50' : ''">{{ p.closing | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="detailPeriod" class="border-t border-gray-200 p-3">
          <div class="text-xs font-bold text-gray-700 mb-1">Movimentos previstos em {{ detailPeriod.label }}</div>
          <table class="w-full text-[11px]">
            <tr *ngFor="let f of flowsOf(detailPeriod)" class="border-b border-gray-50">
              <td class="py-1 pr-2 whitespace-nowrap">{{ f.date | date:'dd/MM' }}<span *ngIf="f.overdue" class="ml-1 text-[9px] font-bold text-red-600">VENCIDO</span></td>
              <td class="py-1 pr-2 text-gray-500">{{ f.source }}</td><td class="py-1 pr-2">{{ f.description }}</td>
              <td class="py-1 text-right font-mono" [ngClass]="f.direction === 'IN' ? 'text-green-700' : 'text-red-600'">{{ f.direction === 'IN' ? '+' : '−' }}{{ f.amount | number:'1.2-2' }}</td></tr>
            <tr *ngIf="!flowsOf(detailPeriod).length"><td class="py-2 text-gray-400">Sem movimentos previstos.</td></tr>
          </table>
        </div>
      </div>

      <!-- Previsões manuais -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div class="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <div class="text-xs font-bold text-gray-700">Previsões manuais <span class="font-normal text-gray-400">(salários, rendas, impostos, empréstimos, vendas esperadas...)</span></div>
          <button (click)="newItem()" class="px-2 py-1 text-[11px] font-bold rounded bg-blue-600 text-white">+ Adicionar</button>
        </div>
        <table class="w-full text-xs">
          <thead class="bg-gray-50 text-gray-600"><tr><th class="px-3 py-1.5 text-left">Data</th><th class="px-3 py-1.5 text-left">Descrição</th><th class="px-3 py-1.5 text-left">Categoria</th>
            <th class="px-3 py-1.5 text-left">Repete</th><th class="px-3 py-1.5 text-right">Valor</th><th class="px-3 py-1.5"></th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let m of manual">
              <td class="px-3 py-1.5">{{ m.date | date:'dd/MM/yyyy' }}</td><td class="px-3 py-1.5">{{ m.description }}</td><td class="px-3 py-1.5 text-gray-500">{{ m.category }}</td>
              <td class="px-3 py-1.5 text-gray-500">{{ m.recurrence === 'MONTHLY' ? 'Mensal' : m.recurrence === 'WEEKLY' ? 'Semanal' : 'Não' }}{{ m.endDate ? ' até ' + (m.endDate | date:'dd/MM/yyyy') : '' }}</td>
              <td class="px-3 py-1.5 text-right font-mono" [ngClass]="m.direction === 'IN' ? 'text-green-700' : 'text-red-600'">{{ m.direction === 'IN' ? '+' : '−' }}{{ m.amount | number:'1.2-2' }}</td>
              <td class="px-3 py-1.5 text-right whitespace-nowrap"><button (click)="editItem(m)" class="text-blue-600 font-bold mr-2">Editar</button><button (click)="remove(m)" class="text-red-600 font-bold">Apagar</button></td>
            </tr>
            <tr *ngIf="!manual.length"><td colspan="6" class="px-3 py-4 text-center text-gray-400">Sem previsões manuais.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div *ngIf="item" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="item = null">
      <div class="bg-white rounded shadow-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-gray-200 font-bold text-sm text-gray-800">{{ item.id ? 'Editar' : 'Nova' }} previsão</div>
        <div class="p-4 grid grid-cols-2 gap-3 text-xs">
          <label class="block col-span-2"><span class="font-semibold text-gray-600">Descrição *</span>
            <input [(ngModel)]="item.description" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" placeholder="Ex.: Salários de novembro"></label>
          <label class="block"><span class="font-semibold text-gray-600">Tipo</span>
            <select [(ngModel)]="item.direction" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white"><option value="OUT">Pagamento</option><option value="IN">Recebimento</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Valor *</span>
            <input type="number" min="0" step="0.01" [(ngModel)]="item.amount" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Data *</span>
            <input type="date" [(ngModel)]="item.date" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Categoria</span>
            <input [(ngModel)]="item.category" list="tf-cats" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Repete</span>
            <select [(ngModel)]="item.recurrence" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white"><option value="NONE">Não</option><option value="MONTHLY">Todos os meses</option><option value="WEEKLY">Todas as semanas</option></select></label>
          <label class="block" *ngIf="item.recurrence !== 'NONE'"><span class="font-semibold text-gray-600">Até (opcional)</span>
            <input type="date" [(ngModel)]="item.endDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
        </div>
        <datalist id="tf-cats"><option value="Pessoal"></option><option value="Impostos"></option><option value="Rendas"></option><option value="Empréstimos"></option><option value="Fornecedores"></option><option value="Vendas previstas"></option><option value="Outros"></option></datalist>
        <div class="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="item = null" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white">Cancelar</button>
          <button (click)="saveItem()" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white">Gravar</button>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class TreasuryForecastComponent implements OnInit {
  api = `${environment.apiUrl}/treasury`;
  horizon = 90;
  granularity: 'WEEK' | 'MONTH' = 'WEEK';
  fc: any = null;
  manual: any[] = [];
  item: any = null;
  detailPeriod: any = null;

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  ngOnInit() { this.load(); }

  get sources(): string[] { return Object.keys(this.fc?.bySource || {}); }

  async load() {
    try {
      this.fc = await firstValueFrom(this.http.get<any>(`${this.api}/forecast`, { params: { horizon: String(this.horizon), granularity: this.granularity } }));
      this.manual = await firstValueFrom(this.http.get<any[]>(`${this.api}/forecast-items`));
      this.detailPeriod = null;
    } catch (e: any) { this.toaster.showError('Erro', e?.error?.message || 'Não foi possível calcular a previsão.'); }
    this.cdr.detectChanges();
  }

  barHeight(v: number) {
    const max = Math.max(1, ...this.fc.periods.map((p: any) => Math.abs(p.closing)), Math.abs(this.fc.opening));
    return Math.max(2, Math.abs(v) / max * 100);
  }

  flowsOf(p: any) { return (this.fc?.flows || []).filter((f: any) => f.date >= p.from && f.date <= p.to); }

  editItem(m: any) { this.item = { ...m }; }

  newItem() { this.item = { date: iso(new Date()), direction: 'OUT', recurrence: 'NONE', amount: null, description: '', category: '' }; }

  async saveItem() {
    try {
      await firstValueFrom(this.http.post(`${this.api}/forecast-items`, this.item));
      this.item = null;
      this.toaster.showSuccess('Gravado', 'Previsão gravada.');
      await this.load();
    } catch (e: any) {
      const er = e?.error?.errors;
      this.toaster.showError('Erro', Array.isArray(er) && er.length ? er.join(' ') : e?.error?.message || 'Não foi possível gravar.');
    }
  }

  async remove(m: any) {
    if (!confirm(`Apagar a previsão "${m.description}"?`)) return;
    await firstValueFrom(this.http.delete(`${this.api}/forecast-items/${m.id}`)).catch(() => null);
    await this.load();
  }

  exportCsv() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Data', 'Tipo', 'Origem', 'Descrição', 'Valor', 'Vencido'],
      ...this.fc.flows.map((f: any) => [f.date, f.direction === 'IN' ? 'Recebimento' : 'Pagamento', f.source, f.description, f.direction === 'IN' ? f.amount : -f.amount, f.overdue ? 'Sim' : ''])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `tesouraria-previsional-${this.fc.start}-a-${this.fc.end}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
