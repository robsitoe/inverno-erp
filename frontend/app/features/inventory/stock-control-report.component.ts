import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';

interface StockRow {
  code: string;
  name: string;
  unit: string;
  stock: number;
  min: number;
  max: number;
  purchasePrice: number;
  value: number;
  status: 'OUT' | 'LOW' | 'OVER' | 'OK';
}

@Component({
  selector: 'app-stock-control-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full overflow-y-auto bg-[#f8fafc]">
      <div class="max-w-7xl mx-auto p-6 space-y-5">

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-slate-900">Controlo de Stocks</h1>
            <p class="text-xs text-slate-500">Níveis de stock, alertas de ruptura e valorização do inventário</p>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="exportCsv()" class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-semibold transition-all">
              <span class="material-symbols-outlined text-sm">download</span> Exportar CSV
            </button>
            <button (click)="reload()" class="p-2 hover:bg-slate-100 rounded-full text-slate-600">
              <span class="material-symbols-outlined">refresh</span>
            </button>
          </div>
        </div>

        <!-- KPI cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Artigos com Stock</p>
            <p class="text-2xl font-black text-slate-800">{{ rows.length }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-rose-200 shadow-sm p-4">
            <p class="text-[10px] uppercase tracking-widest text-rose-400 font-bold">Em Ruptura</p>
            <p class="text-2xl font-black text-rose-600">{{ countOut }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
            <p class="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Abaixo do Mínimo</p>
            <p class="text-2xl font-black text-amber-600">{{ countLow }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
            <p class="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Valor do Inventário</p>
            <p class="text-2xl font-black text-emerald-700">{{ totalValue | number:'1.2-2' }} <span class="text-xs">MT</span></p>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[220px]">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input [(ngModel)]="search" placeholder="Pesquisar artigo por código ou nome..."
                   class="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          </div>
          <div class="flex gap-1 flex-wrap">
            <button (click)="filter = ''" [class]="chip('')">Todos</button>
            <button (click)="filter = 'OUT'" [class]="chip('OUT')">Ruptura</button>
            <button (click)="filter = 'LOW'" [class]="chip('LOW')">Stock Baixo</button>
            <button (click)="filter = 'OVER'" [class]="chip('OVER')">Excesso</button>
          </div>
          <span class="text-[11px] text-slate-400 font-medium ml-auto">{{ filtered.length }} artigo(s)</span>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="flex items-center justify-center py-12 text-slate-400">
          <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          A calcular stocks...
        </div>

        <!-- Table -->
        <div *ngIf="!loading" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left p-3 font-semibold text-slate-600 w-28">Código</th>
                <th class="text-left p-3 font-semibold text-slate-600">Artigo</th>
                <th class="text-right p-3 font-semibold text-slate-600 w-24">Stock</th>
                <th class="text-right p-3 font-semibold text-slate-600 w-20">Mín.</th>
                <th class="text-right p-3 font-semibold text-slate-600 w-20">Máx.</th>
                <th class="text-right p-3 font-semibold text-slate-600 w-28">Custo Unit.</th>
                <th class="text-right p-3 font-semibold text-slate-600 w-32">Valor Stock</th>
                <th class="text-center p-3 font-semibold text-slate-600 w-32">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let r of filtered" class="hover:bg-blue-50/40 transition-colors">
                <td class="p-3 font-mono text-slate-500">{{ r.code }}</td>
                <td class="p-3 text-slate-800">{{ r.name }} <span class="text-[10px] text-slate-400">({{ r.unit }})</span></td>
                <td class="p-3 text-right font-mono font-bold" [class.text-rose-600]="r.status==='OUT'" [class.text-amber-600]="r.status==='LOW'" [class.text-slate-800]="r.status==='OK'||r.status==='OVER'">
                  {{ r.stock | number:'1.0-2' }}
                </td>
                <td class="p-3 text-right font-mono text-slate-400">{{ r.min | number:'1.0-0' }}</td>
                <td class="p-3 text-right font-mono text-slate-400">{{ r.max ? (r.max | number:'1.0-0') : '—' }}</td>
                <td class="p-3 text-right font-mono text-slate-600">{{ r.purchasePrice | number:'1.2-2' }}</td>
                <td class="p-3 text-right font-mono font-semibold text-slate-800">{{ r.value | number:'1.2-2' }}</td>
                <td class="p-3 text-center">
                  <span [class]="badge(r.status)">{{ label(r.status) }}</span>
                </td>
              </tr>
              <tr *ngIf="filtered.length === 0">
                <td colspan="8" class="p-8 text-center text-slate-400">Nenhum artigo encontrado.</td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-900 text-white">
              <tr class="font-bold">
                <td colspan="6" class="p-4 text-right uppercase tracking-widest text-xs opacity-70">Valor Total do Inventário</td>
                <td class="p-4 text-right font-mono text-base">{{ totalValue | number:'1.2-2' }}</td>
                <td class="p-4 text-center text-xs opacity-70">MT</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `
})
export class StockControlReportComponent implements OnInit {
  rows: StockRow[] = [];
  loading = true;
  search = '';
  filter: '' | 'OUT' | 'LOW' | 'OVER' = '';

  constructor(private inventoryService: InventoryService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.inventoryService.loadData().then(() => {
      this.build();
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => { this.build(); this.loading = false; this.cdr.detectChanges(); });
  }

  private num(v: any): number { const n = parseFloat(String(v)); return isNaN(n) ? 0 : n; }

  private build() {
    const articles = this.inventoryService.getArticles().filter(a => a.stockControl !== false && a.isActive !== false);
    this.rows = articles.map(a => {
      const stock = this.num(a.currentStock);
      const min = this.num(a.minStock);
      const max = this.num(a.maxStock);
      const purchasePrice = this.num(a.purchasePrice);
      let status: StockRow['status'] = 'OK';
      if (stock <= 0) status = 'OUT';
      else if (min > 0 && stock <= min) status = 'LOW';
      else if (max > 0 && stock > max) status = 'OVER';
      return { code: a.code, name: a.name, unit: a.unit, stock, min, max, purchasePrice, value: stock * purchasePrice, status };
    }).sort((x, y) => {
      const rank = { OUT: 0, LOW: 1, OVER: 2, OK: 3 } as Record<string, number>;
      return rank[x.status] - rank[y.status] || x.code.localeCompare(y.code);
    });
  }

  get filtered(): StockRow[] {
    const t = this.search.toLowerCase().trim();
    return this.rows.filter(r => {
      if (this.filter && r.status !== this.filter) return false;
      if (t && !(r.code + ' ' + r.name).toLowerCase().includes(t)) return false;
      return true;
    });
  }

  get countOut(): number { return this.rows.filter(r => r.status === 'OUT').length; }
  get countLow(): number { return this.rows.filter(r => r.status === 'LOW').length; }
  get totalValue(): number { return this.rows.reduce((s, r) => s + r.value, 0); }

  chip(f: string): string {
    const base = 'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ';
    return this.filter === f ? base + 'bg-blue-600 text-white' : base + 'bg-slate-100 text-slate-600 hover:bg-slate-200';
  }
  label(s: string): string {
    return { OUT: 'Ruptura', LOW: 'Stock Baixo', OVER: 'Excesso', OK: 'Normal' }[s] || s;
  }
  badge(s: string): string {
    const base = 'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ';
    return {
      OUT: base + 'bg-rose-100 text-rose-700',
      LOW: base + 'bg-amber-100 text-amber-700',
      OVER: base + 'bg-blue-100 text-blue-700',
      OK: base + 'bg-emerald-100 text-emerald-700',
    }[s] || base;
  }

  exportCsv() {
    const header = 'codigo,nome,unidade,stock,minimo,maximo,custo_unit,valor_stock,estado';
    const lines = this.filtered.map(r =>
      [r.code, r.name, r.unit, r.stock, r.min, r.max, r.purchasePrice.toFixed(2), r.value.toFixed(2), this.label(r.status)]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const bom = '﻿';
    const blob = new Blob([bom + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'controlo_stock.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}
