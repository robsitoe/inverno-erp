import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataService } from '../../services/data.service';
import { NavigationService } from '../../services/navigation.service';

type Side = 'CUSTOMER' | 'SUPPLIER';

interface AgingRow {
  entityCode: string;
  entityName: string;
  A_VENCER: number;
  D0_30: number;
  D31_60: number;
  D61_90: number;
  D90_MAIS: number;
  total: number;
}

interface OpenItem {
  docType: string;
  docNumber: string;
  date: string;
  dueDate: string;
  total: number;
  paid: number;
  pending: number;
  daysOverdue: number;
  bucket: string;
}

/**
 * Mapa de antiguidade de saldos (clientes / fornecedores).
 * Os valores vêm do servidor (GET /treasury/aging e /treasury/open-items).
 */
@Component({
  selector: 'app-aging-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-gray-100 text-sm">
      <div class="flex flex-wrap items-center gap-3 px-4 py-2 bg-white border-b border-gray-300">
        <h2 class="text-base font-semibold text-gray-800 mr-4">Antiguidade de Saldos</h2>

        <div class="inline-flex rounded border border-gray-300 overflow-hidden">
          <button type="button" (click)="setSide('CUSTOMER')"
            [class]="side === 'CUSTOMER' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-white text-gray-700 hover:bg-gray-50'">
            Clientes
          </button>
          <button type="button" (click)="setSide('SUPPLIER')"
            [class]="side === 'SUPPLIER' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-white text-gray-700 hover:bg-gray-50'">
            Fornecedores
          </button>
        </div>

        <label class="flex items-center gap-2 text-gray-600">
          Data de referência
          <input type="date" [(ngModel)]="asOf" (change)="load()"
            class="border border-gray-300 rounded px-2 py-1 bg-white" />
        </label>

        <button type="button" (click)="load()" class="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50">
          Atualizar
        </button>
        <button type="button" (click)="exportCsv()" [disabled]="!rows.length"
          class="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40">
          Exportar CSV
        </button>
      </div>

      <div *ngIf="offline" class="m-4 p-3 rounded border border-amber-300 bg-amber-50 text-amber-800">
        Este relatório precisa de ligação ao servidor. Em modo local (dados no navegador) não está disponível.
      </div>
      <div *ngIf="error" class="m-4 p-3 rounded border border-red-300 bg-red-50 text-red-800">{{ error }}</div>

      <div class="flex-1 overflow-auto p-4" *ngIf="!offline">
        <div *ngIf="loading" class="text-gray-500">A carregar…</div>

        <table *ngIf="!loading" class="w-full bg-white border border-gray-300 border-collapse">
          <thead class="bg-gray-200 text-gray-700">
            <tr>
              <th class="px-2 py-1 text-left border border-gray-300">Código</th>
              <th class="px-2 py-1 text-left border border-gray-300">{{ side === 'CUSTOMER' ? 'Cliente' : 'Fornecedor' }}</th>
              <th class="px-2 py-1 text-right border border-gray-300">A vencer</th>
              <th class="px-2 py-1 text-right border border-gray-300">0–30 dias</th>
              <th class="px-2 py-1 text-right border border-gray-300">31–60 dias</th>
              <th class="px-2 py-1 text-right border border-gray-300">61–90 dias</th>
              <th class="px-2 py-1 text-right border border-gray-300">&gt; 90 dias</th>
              <th class="px-2 py-1 text-right border border-gray-300">Total</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let r of rows">
              <tr class="cursor-pointer hover:bg-blue-50" (click)="toggle(r)">
                <td class="px-2 py-1 border border-gray-200">{{ r.entityCode }}</td>
                <td class="px-2 py-1 border border-gray-200">
                  <span class="inline-block w-4 text-gray-400">{{ expanded === key(r) ? '▾' : '▸' }}</span>{{ r.entityName }}
                </td>
                <td class="px-2 py-1 text-right border border-gray-200">{{ r.A_VENCER | number:'1.2-2' }}</td>
                <td class="px-2 py-1 text-right border border-gray-200">{{ r.D0_30 | number:'1.2-2' }}</td>
                <td class="px-2 py-1 text-right border border-gray-200">{{ r.D31_60 | number:'1.2-2' }}</td>
                <td class="px-2 py-1 text-right border border-gray-200">{{ r.D61_90 | number:'1.2-2' }}</td>
                <td class="px-2 py-1 text-right border border-gray-200" [class.text-red-600]="r.D90_MAIS > 0">{{ r.D90_MAIS | number:'1.2-2' }}</td>
                <td class="px-2 py-1 text-right font-semibold border border-gray-200">{{ r.total | number:'1.2-2' }}</td>
              </tr>
              <tr *ngIf="expanded === key(r)">
                <td colspan="8" class="p-0 border border-gray-200 bg-gray-50">
                  <div *ngIf="detailLoading" class="px-6 py-2 text-gray-500">A carregar documentos…</div>
                  <table *ngIf="!detailLoading" class="w-full text-xs">
                    <thead class="text-gray-600">
                      <tr>
                        <th class="px-6 py-1 text-left">Documento</th>
                        <th class="px-2 py-1 text-left">Data</th>
                        <th class="px-2 py-1 text-left">Vencimento</th>
                        <th class="px-2 py-1 text-right">Total</th>
                        <th class="px-2 py-1 text-right">Liquidado</th>
                        <th class="px-2 py-1 text-right">Pendente</th>
                        <th class="px-2 py-1 text-right">Dias em atraso</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let d of detail">
                        <td class="px-6 py-1">{{ d.docNumber }}</td>
                        <td class="px-2 py-1">{{ d.date }}</td>
                        <td class="px-2 py-1">{{ d.dueDate }}</td>
                        <td class="px-2 py-1 text-right">{{ d.total | number:'1.2-2' }}</td>
                        <td class="px-2 py-1 text-right">{{ d.paid | number:'1.2-2' }}</td>
                        <td class="px-2 py-1 text-right font-medium">{{ d.pending | number:'1.2-2' }}</td>
                        <td class="px-2 py-1 text-right" [class.text-red-600]="d.daysOverdue > 0">{{ d.daysOverdue > 0 ? d.daysOverdue : 0 }}</td>
                      </tr>
                      <tr *ngIf="detail.length === 0">
                        <td colspan="7" class="px-6 py-2 text-gray-500">Sem documentos em aberto.</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </ng-container>
            <tr *ngIf="rows.length === 0">
              <td colspan="8" class="px-2 py-6 text-center text-gray-500 border border-gray-200">
                Sem saldos em aberto à data selecionada.
              </td>
            </tr>
          </tbody>
          <tfoot *ngIf="totals && rows.length > 0" class="bg-gray-200 font-semibold">
            <tr>
              <td class="px-2 py-1 border border-gray-300" colspan="2">TOTAL</td>
              <td class="px-2 py-1 text-right border border-gray-300">{{ totals.A_VENCER | number:'1.2-2' }}</td>
              <td class="px-2 py-1 text-right border border-gray-300">{{ totals.D0_30 | number:'1.2-2' }}</td>
              <td class="px-2 py-1 text-right border border-gray-300">{{ totals.D31_60 | number:'1.2-2' }}</td>
              <td class="px-2 py-1 text-right border border-gray-300">{{ totals.D61_90 | number:'1.2-2' }}</td>
              <td class="px-2 py-1 text-right border border-gray-300">{{ totals.D90_MAIS | number:'1.2-2' }}</td>
              <td class="px-2 py-1 text-right border border-gray-300">{{ totals.total | number:'1.2-2' }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
})
export class AgingReportComponent implements OnInit, OnDestroy {
  side: Side = 'CUSTOMER';
  asOf = this.today();
  rows: AgingRow[] = [];
  totals: AgingRow | null = null;
  loading = false;
  offline = false;
  error = '';

  expanded: string | null = null;
  detail: OpenItem[] = [];
  detailLoading = false;

  private companyId: string | undefined;
  private sub?: Subscription;
  private ctxSub?: Subscription;

  constructor(private dataService: DataService, private navService: NavigationService) { }

  ngOnInit() {
    this.offline = this.dataService.isLocalBrowser();
    // Abre já no lado (cliente/fornecedor) do menu de onde veio
    this.ctxSub = this.navService.viewContext$.subscribe(ctx => {
      if (ctx && ctx.view === 'aging-report' && ctx.side !== this.side) {
        if (this.companyId !== undefined) this.setSide(ctx.side); else this.side = ctx.side;
      }
    });
    this.sub = this.dataService.activeCompany$.subscribe(info => {
      const id = info?.id || undefined;
      if (id !== this.companyId) {
        this.companyId = id;
        this.load();
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.ctxSub?.unsubscribe();
  }

  setSide(side: Side) {
    if (this.side === side) return;
    this.side = side;
    this.load();
  }

  key(r: AgingRow) {
    return r.entityCode || r.entityName;
  }

  load() {
    if (this.offline) return;
    this.loading = true;
    this.error = '';
    this.expanded = null;
    this.detail = [];
    this.dataService.getAging(this.side, { companyId: this.companyId, asOf: this.asOf }).subscribe({
      next: res => {
        this.rows = res?.rows || [];
        this.totals = res?.totals || null;
        this.loading = false;
      },
      error: err => {
        this.rows = [];
        this.totals = null;
        this.loading = false;
        this.error = err?.error?.message || 'Não foi possível carregar o mapa de antiguidade.';
      },
    });
  }

  toggle(r: AgingRow) {
    const k = this.key(r);
    if (this.expanded === k) {
      this.expanded = null;
      return;
    }
    this.expanded = k;
    this.detail = [];
    this.detailLoading = true;
    // O servidor filtra por código ou nome exacto da entidade.
    this.dataService
      .getOpenItems(this.side, { companyId: this.companyId, entity: r.entityCode || r.entityName, asOf: this.asOf })
      .subscribe({
        next: items => {
          if (this.expanded !== k) return;
          this.detail = items || [];
          this.detailLoading = false;
        },
        error: () => {
          this.detail = [];
          this.detailLoading = false;
        },
      });
  }

  exportCsv() {
    const head = ['Codigo', 'Entidade', 'A vencer', '0-30', '31-60', '61-90', '>90', 'Total'];
    const lines = [head.join(';')];
    for (const r of this.rows) {
      lines.push([r.entityCode, r.entityName, r.A_VENCER, r.D0_30, r.D31_60, r.D61_90, r.D90_MAIS, r.total]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antiguidade-${this.side === 'CUSTOMER' ? 'clientes' : 'fornecedores'}-${this.asOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
