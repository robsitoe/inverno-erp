import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';

interface MovRow {
  date: string;
  documentNumber: string;
  documentType: string;
  description: string;
  warehouse: string;
  qtyIn: number;
  qtyOut: number;
  unitCost: number;
  balance: number;
}

@Component({
  selector: 'app-stock-movements-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full overflow-y-auto bg-[#f8fafc]">
      <div class="max-w-7xl mx-auto p-6 space-y-5">

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-slate-900">Entradas / Saídas de Stock</h1>
            <p class="text-xs text-slate-500">Livro de movimentos com saldo acumulado por artigo</p>
          </div>
          <button (click)="exportCsv()" [disabled]="!filtered.length"
                  class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg text-slate-600 text-xs font-semibold transition-all">
            <span class="material-symbols-outlined text-sm">download</span> Exportar CSV
          </button>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="md:col-span-2">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Artigo *</label>
            <select [(ngModel)]="articleCode" (change)="load()"
                    class="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">— Seleccione um artigo —</option>
              <option *ngFor="let a of articles" [value]="a.code">{{ a.code }} — {{ a.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">De</label>
            <input type="date" [(ngModel)]="dateFrom" (change)="applyFilters()"
                   class="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Até</label>
            <input type="date" [(ngModel)]="dateTo" (change)="applyFilters()"
                   class="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          </div>
        </div>

        <!-- Summary -->
        <div *ngIf="articleCode" class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Entradas</p>
            <p class="text-xl font-black text-emerald-600">{{ totalIn | number:'1.0-2' }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Saídas</p>
            <p class="text-xl font-black text-rose-600">{{ totalOut | number:'1.0-2' }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Saldo Final</p>
            <p class="text-xl font-black text-slate-800">{{ finalBalance | number:'1.0-2' }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Nº Movimentos</p>
            <p class="text-xl font-black text-slate-800">{{ filtered.length }}</p>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="flex items-center justify-center py-12 text-slate-400">
          <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          A carregar movimentos...
        </div>

        <!-- Empty state -->
        <div *ngIf="!loading && !articleCode" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
          <span class="material-symbols-outlined text-5xl text-slate-300 block mb-2">sync_alt</span>
          Seleccione um artigo para ver as entradas e saídas.
        </div>

        <!-- Table -->
        <div *ngIf="!loading && articleCode" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left p-3 font-semibold text-slate-600 w-28">Data</th>
                <th class="text-left p-3 font-semibold text-slate-600 w-32">Documento</th>
                <th class="text-left p-3 font-semibold text-slate-600">Descrição</th>
                <th class="text-left p-3 font-semibold text-slate-600 w-28">Armazém</th>
                <th class="text-right p-3 font-semibold text-emerald-600 w-24">Entrada</th>
                <th class="text-right p-3 font-semibold text-rose-600 w-24">Saída</th>
                <th class="text-right p-3 font-semibold text-slate-600 w-28">Saldo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let m of filtered" class="hover:bg-blue-50/40 transition-colors">
                <td class="p-3 text-slate-500">{{ m.date | date:'dd/MM/yyyy' }}</td>
                <td class="p-3 font-mono text-blue-700 text-xs">{{ m.documentNumber }}</td>
                <td class="p-3 text-slate-700">{{ m.description }}</td>
                <td class="p-3 text-slate-500 text-xs">{{ m.warehouse || '—' }}</td>
                <td class="p-3 text-right font-mono" [class.text-emerald-700]="m.qtyIn>0" [class.text-slate-300]="!m.qtyIn">{{ m.qtyIn ? (m.qtyIn | number:'1.0-2') : '—' }}</td>
                <td class="p-3 text-right font-mono" [class.text-rose-600]="m.qtyOut>0" [class.text-slate-300]="!m.qtyOut">{{ m.qtyOut ? (m.qtyOut | number:'1.0-2') : '—' }}</td>
                <td class="p-3 text-right font-mono font-bold text-slate-800">{{ m.balance | number:'1.0-2' }}</td>
              </tr>
              <tr *ngIf="filtered.length === 0">
                <td colspan="7" class="p-8 text-center text-slate-400">Sem movimentos para o período seleccionado.</td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-900 text-white">
              <tr class="font-bold">
                <td colspan="4" class="p-3 text-right uppercase tracking-widest text-xs opacity-70">Totais</td>
                <td class="p-3 text-right font-mono text-emerald-400">{{ totalIn | number:'1.0-2' }}</td>
                <td class="p-3 text-right font-mono text-rose-400">{{ totalOut | number:'1.0-2' }}</td>
                <td class="p-3 text-right font-mono">{{ finalBalance | number:'1.0-2' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `
})
export class StockMovementsReportComponent implements OnInit {
  articles: { code: string; name: string }[] = [];
  all: MovRow[] = [];       // all movements for selected article (with running balance)
  loading = false;
  articleCode = '';
  dateFrom = '';
  dateTo = '';

  constructor(private inventoryService: InventoryService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loading = true;
    this.inventoryService.loadData().then(() => {
      this.articles = this.inventoryService.getArticles()
        .map(a => ({ code: a.code, name: a.name }))
        .sort((x, y) => x.code.localeCompare(y.code));
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  private num(v: any): number { const n = parseFloat(String(v)); return isNaN(n) ? 0 : n; }

  load() {
    this.all = [];
    if (!this.articleCode) { this.cdr.detectChanges(); return; }
    this.loading = true;
    // calculateStockMovements is synchronous against loaded data
    const movs = this.inventoryService.calculateStockMovements(this.articleCode) || [];
    let balance = 0;
    this.all = movs.map((m: any) => {
      const qtyIn = this.num(m.quantityIn);
      const qtyOut = this.num(m.quantityOut);
      balance += qtyIn - qtyOut;
      return {
        date: m.date,
        documentNumber: m.documentNumber || m.documentType || '',
        documentType: m.documentType || '',
        description: m.description || '',
        warehouse: m.warehouse || '',
        qtyIn, qtyOut,
        unitCost: this.num(m.unitCost),
        balance,
      };
    });
    this.loading = false;
    this.cdr.detectChanges();
  }

  applyFilters() { this.cdr.detectChanges(); }

  get filtered(): MovRow[] {
    return this.all.filter(m => {
      if (this.dateFrom && m.date < this.dateFrom) return false;
      if (this.dateTo && m.date > this.dateTo) return false;
      return true;
    });
  }

  get totalIn(): number { return this.filtered.reduce((s, m) => s + m.qtyIn, 0); }
  get totalOut(): number { return this.filtered.reduce((s, m) => s + m.qtyOut, 0); }
  get finalBalance(): number {
    const f = this.filtered;
    return f.length ? f[f.length - 1].balance : 0;
  }

  exportCsv() {
    const header = 'data,documento,descricao,armazem,entrada,saida,saldo';
    const lines = this.filtered.map(m =>
      [m.date, m.documentNumber, m.description, m.warehouse, m.qtyIn, m.qtyOut, m.balance]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const bom = '﻿';
    const blob = new Blob([bom + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `movimentos_${this.articleCode}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
}
