import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { DataService } from '../../services/data.service';
import { NavigationService } from '../../services/navigation.service';

type Side = 'CUSTOMER' | 'SUPPLIER';
type Payment = 'PAGO' | 'PARCIAL' | 'POR_PAGAR' | 'NA';

interface Row {
  number: string; type: string; date: string; partyName: string; partyTaxId: string; reference: string;
  netTotal: number; taxTotal: number; grossTotal: number;
  state: 'EMITIDO' | 'ANULADO'; voidReason: string; voidedAt: string | null;
  paid: number; pending: number; payment: Payment;
}
interface Group { count: number; total: number; }
interface Listing {
  company: { name: string; nif: string }; from: string; to: string; rows: Row[];
  summary: { invoices: Group & { paid: number; pending: number; paidCount: number }; voided: Group; creditNotes: Group; debitNotes: Group };
}

const INVOICE_TYPES = ['FA', 'FR', 'VD', 'FT', 'FC', 'VDC'];
const CREDIT_TYPES = ['NC', 'NCC'];
const DEBIT_TYPES = ['ND', 'NDC'];
const PAYMENT_LABEL: Record<Payment, string> = { PAGO: 'Paga', PARCIAL: 'Parcial', POR_PAGAR: 'Por pagar', NA: '—' };

/**
 * Mapa de documentos fiscais: faturas emitidas, pagas e anuladas e notas de crédito e de débito,
 * com os valores (Despacho do Ministro das Finanças de 22/12/2011, n.º 10, alíneas g) e h)).
 */
@Component({
  selector: 'app-fiscal-documents-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-gray-100 text-sm">
      <div class="flex flex-wrap items-end gap-3 px-4 py-2 bg-white border-b border-gray-300">
        <h2 class="text-base font-semibold text-gray-800 mr-2 self-center">Mapa de Documentos Fiscais</h2>
        <div class="inline-flex rounded border border-gray-300 overflow-hidden self-center">
          <button type="button" (click)="setSide('CUSTOMER')" [class]="side === 'CUSTOMER' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-white text-gray-700 hover:bg-gray-50'">Vendas</button>
          <button type="button" (click)="setSide('SUPPLIER')" [class]="side === 'SUPPLIER' ? 'px-3 py-1 bg-blue-600 text-white' : 'px-3 py-1 bg-white text-gray-700 hover:bg-gray-50'">Compras</button>
        </div>
        <label class="text-xs text-gray-600">De<input type="date" [(ngModel)]="from" class="mt-0.5 block border border-gray-300 rounded px-2 py-1 bg-white"></label>
        <label class="text-xs text-gray-600">Até<input type="date" [(ngModel)]="to" class="mt-0.5 block border border-gray-300 rounded px-2 py-1 bg-white"></label>
        <label class="text-xs text-gray-600">Documentos
          <select [(ngModel)]="typeFilter" class="mt-0.5 block border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="">Todos</option><option value="INV">Faturas</option><option value="NC">Notas de crédito</option><option value="ND">Notas de débito</option>
          </select></label>
        <label class="text-xs text-gray-600">Estado
          <select [(ngModel)]="stateFilter" class="mt-0.5 block border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="">Todos</option><option value="EMITIDO">Emitidos</option><option value="ANULADO">Anulados</option>
          </select></label>
        <label class="text-xs text-gray-600">Pagamento
          <select [(ngModel)]="paymentFilter" class="mt-0.5 block border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="">Todos</option><option value="PAGO">Pagas</option><option value="PARCIAL">Parciais</option><option value="POR_PAGAR">Por pagar</option>
          </select></label>
        <button type="button" (click)="load()" [disabled]="loading" class="px-3 py-1.5 rounded bg-blue-600 text-white font-semibold disabled:opacity-50">Atualizar</button>
        <button type="button" (click)="exportCsv()" [disabled]="!rows.length" class="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40">Exportar CSV</button>
        <button type="button" (click)="print()" [disabled]="!data" class="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40">Imprimir</button>
      </div>

      <div *ngIf="offline" class="m-4 p-3 rounded border border-amber-300 bg-amber-50 text-amber-800">Este mapa precisa de ligação ao servidor.</div>
      <div *ngIf="error" class="m-4 p-3 rounded border border-red-300 bg-red-50 text-red-800">{{ error }}</div>

      <div class="flex-1 overflow-auto p-4 space-y-3" *ngIf="!offline && data">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Faturas emitidas</div><div class="text-lg font-bold">{{ data.summary.invoices.total | number:'1.2-2' }}</div><div class="text-[11px] text-gray-500">{{ data.summary.invoices.count }} documento(s)</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Pago</div><div class="text-lg font-bold text-green-700">{{ data.summary.invoices.paid | number:'1.2-2' }}</div><div class="text-[11px] text-gray-500">{{ data.summary.invoices.paidCount }} paga(s) na totalidade</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Por pagar</div><div class="text-lg font-bold" [class.text-red-700]="data.summary.invoices.pending > 0">{{ data.summary.invoices.pending | number:'1.2-2' }}</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Notas de crédito / débito</div><div class="text-lg font-bold">{{ data.summary.creditNotes.total | number:'1.2-2' }} / {{ data.summary.debitNotes.total | number:'1.2-2' }}</div><div class="text-[11px] text-gray-500">{{ data.summary.creditNotes.count }} / {{ data.summary.debitNotes.count }} documento(s)</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Anulados</div><div class="text-lg font-bold">{{ data.summary.voided.total | number:'1.2-2' }}</div><div class="text-[11px] text-gray-500">{{ data.summary.voided.count }} documento(s)</div></div>
        </div>

        <div class="bg-white border border-gray-300 rounded overflow-auto">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-gray-100 text-gray-700 sticky top-0">
              <tr>
                <th class="px-2 py-1.5 text-left">Documento</th><th class="px-2 py-1.5 text-left">Data</th>
                <th class="px-2 py-1.5 text-left">{{ side === 'CUSTOMER' ? 'Cliente' : 'Fornecedor' }}</th><th class="px-2 py-1.5 text-left">NUIT</th>
                <th class="px-2 py-1.5 text-right">Base</th><th class="px-2 py-1.5 text-right">IVA</th><th class="px-2 py-1.5 text-right">Total</th>
                <th class="px-2 py-1.5 text-left">Estado</th><th class="px-2 py-1.5 text-right">Pago</th><th class="px-2 py-1.5 text-right">Por pagar</th><th class="px-2 py-1.5 text-left">Pagamento</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of rows" class="border-t border-gray-100" [class.text-gray-400]="r.state === 'ANULADO'">
                <td class="px-2 py-1 font-mono whitespace-nowrap">{{ r.number }}</td><td class="px-2 py-1 whitespace-nowrap">{{ r.date | date:'dd/MM/yyyy' }}</td>
                <td class="px-2 py-1">{{ r.partyName }}</td><td class="px-2 py-1">{{ r.partyTaxId || '—' }}</td>
                <td class="px-2 py-1 text-right">{{ r.netTotal | number:'1.2-2' }}</td><td class="px-2 py-1 text-right">{{ r.taxTotal | number:'1.2-2' }}</td>
                <td class="px-2 py-1 text-right font-semibold">{{ r.grossTotal | number:'1.2-2' }}</td>
                <td class="px-2 py-1"><span *ngIf="r.state === 'EMITIDO'">Emitido</span>
                  <span *ngIf="r.state === 'ANULADO'" class="text-red-700" [title]="r.voidReason">Anulado{{ r.voidedAt ? ' em ' + (r.voidedAt | date:'dd/MM/yyyy') : '' }}{{ r.voidReason ? ': ' + r.voidReason : '' }}</span></td>
                <td class="px-2 py-1 text-right">{{ r.payment === 'NA' ? '—' : (r.paid | number:'1.2-2') }}</td>
                <td class="px-2 py-1 text-right">{{ r.payment === 'NA' ? '—' : (r.pending | number:'1.2-2') }}</td>
                <td class="px-2 py-1" [class.text-green-700]="r.payment === 'PAGO'" [class.text-amber-700]="r.payment === 'PARCIAL'" [class.text-red-700]="r.payment === 'POR_PAGAR'">{{ paymentLabel(r) }}</td>
              </tr>
              <tr *ngIf="!rows.length"><td colspan="11" class="px-2 py-3 text-gray-400">Sem documentos no período.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="text-[11px] text-gray-500">Documentos emitidos (aprovados ou lançados) e anulados com data no período. O pago resulta dos recibos ou pagamentos que liquidam cada documento; vendas a dinheiro e faturas-recibo são pagas no ato.</p>
      </div>
    </div>
  `,
})
export class FiscalDocumentsReportComponent implements OnInit, OnDestroy {
  side: Side = 'CUSTOMER';
  from = ''; to = '';
  typeFilter = ''; stateFilter = ''; paymentFilter = '';
  data: Listing | null = null;
  loading = false; error = ''; offline = false;
  private companyId: string | undefined;
  private sub?: Subscription;
  private ctxSub?: Subscription;

  constructor(private http: HttpClient, private dataService: DataService, private navService: NavigationService, private cdr: ChangeDetectorRef) {
    const d = new Date();
    this.from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    this.to = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().slice(0, 10);
  }

  ngOnInit() {
    this.offline = this.dataService.isLocalBrowser();
    // Abre no lado (vendas/compras) do menu de onde veio
    this.ctxSub = this.navService.viewContext$.subscribe(ctx => {
      if (ctx && ctx.view === 'fiscal-documents' && ctx.side !== this.side) {
        if (this.companyId !== undefined) this.setSide(ctx.side as Side); else this.side = ctx.side as Side;
      }
    });
    this.sub = this.dataService.activeCompany$.subscribe(info => {
      const id = info?.id || undefined;
      if (id !== this.companyId) { this.companyId = id; this.load(); }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); this.ctxSub?.unsubscribe(); }

  setSide(side: Side) { if (this.side === side) return; this.side = side; this.load(); }

  get rows(): Row[] {
    return (this.data?.rows || []).filter(r =>
      (!this.stateFilter || r.state === this.stateFilter) &&
      (!this.paymentFilter || r.payment === this.paymentFilter) &&
      (!this.typeFilter || (this.typeFilter === 'INV' ? INVOICE_TYPES : this.typeFilter === 'NC' ? CREDIT_TYPES : DEBIT_TYPES).includes(r.type)));
  }

  paymentLabel(r: Row) { return r.state === 'ANULADO' ? '—' : CREDIT_TYPES.includes(r.type) ? 'Nota de crédito' : PAYMENT_LABEL[r.payment]; }

  async load() {
    if (this.offline) return;
    this.loading = true; this.error = '';
    try {
      this.data = await firstValueFrom(this.http.get<Listing>(`${environment.apiUrl}/accounting/fiscal-export/listing`, {
        params: { kind: this.side === 'CUSTOMER' ? 'SALES' : 'PURCHASES', from: this.from, to: this.to },
      }));
    } catch (e: any) {
      this.data = null;
      this.error = e?.error?.message || 'Não foi possível carregar o mapa de documentos fiscais.';
    }
    this.loading = false; this.cdr.detectChanges();
  }

  private fmt(n: number) { return (Number(n) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  private dmy(d: string | null) { return d ? d.slice(0, 10).split('-').reverse().join('/') : ''; }
  private stateText(r: Row) { return r.state === 'ANULADO' ? `Anulado ${this.dmy(r.voidedAt)}${r.voidReason ? ': ' + r.voidReason : ''}` : 'Emitido'; }

  exportCsv() {
    const head = ['Documento', 'Tipo', 'Data', this.side === 'CUSTOMER' ? 'Cliente' : 'Fornecedor', 'NUIT', 'Base', 'IVA', 'Total', 'Estado', 'Pago', 'Por pagar', 'Pagamento'];
    const lines = [head.join(';')];
    const num = (n: number) => (Number(n) || 0).toFixed(2).replace('.', ',');
    for (const r of this.rows) {
      const na = r.payment === 'NA';
      lines.push([r.number, r.type, this.dmy(r.date), r.partyName, r.partyTaxId, num(r.netTotal), num(r.taxTotal), num(r.grossTotal),
        this.stateText(r), na ? '' : num(r.paid), na ? '' : num(r.pending), this.paymentLabel(r)]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `mapa-documentos-${this.side === 'CUSTOMER' ? 'vendas' : 'compras'}-${this.from}-${this.to}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  print() {
    if (!this.data) return;
    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const s = this.data.summary;
    const body = this.rows.map(r => {
      const na = r.payment === 'NA';
      return `<tr${r.state === 'ANULADO' ? ' class="anulado"' : ''}><td>${esc(r.number)}</td><td>${this.dmy(r.date)}</td><td>${esc(r.partyName)}</td><td>${esc(r.partyTaxId)}</td>`
        + `<td class="n">${this.fmt(r.netTotal)}</td><td class="n">${this.fmt(r.taxTotal)}</td><td class="n">${this.fmt(r.grossTotal)}</td>`
        + `<td>${esc(this.stateText(r))}</td><td class="n">${na ? '—' : this.fmt(r.paid)}</td><td class="n">${na ? '—' : this.fmt(r.pending)}</td><td>${esc(this.paymentLabel(r))}</td></tr>`;
    }).join('');
    const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Mapa de Documentos Fiscais</title><style>
      @page { size: A4 landscape; margin: 12mm; } body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
      h1 { font-size: 15px; margin: 0 0 2px; } .sub { color: #444; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #bbb; padding: 3px 4px; text-align: left; }
      th { background: #eee; } td.n, th.n { text-align: right; white-space: nowrap; } tr.anulado td { color: #888; }
      .resumo td { border: none; padding: 1px 12px 1px 0; } footer { margin-top: 8px; color: #555; font-size: 9px; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }</style></head><body>
      <h1>Mapa de Documentos Fiscais — ${this.side === 'CUSTOMER' ? 'Vendas' : 'Compras'}</h1>
      <div class="sub">${esc(this.data.company.name)} · NUIT ${esc(this.data.company.nif)} · Período ${this.dmy(this.data.from)} a ${this.dmy(this.data.to)}</div>
      <table class="resumo"><tr><td>Faturas emitidas: <b>${s.invoices.count}</b> · ${this.fmt(s.invoices.total)}</td><td>Pago: <b>${this.fmt(s.invoices.paid)}</b></td>
        <td>Por pagar: <b>${this.fmt(s.invoices.pending)}</b></td><td>Notas de crédito: <b>${s.creditNotes.count}</b> · ${this.fmt(s.creditNotes.total)}</td>
        <td>Notas de débito: <b>${s.debitNotes.count}</b> · ${this.fmt(s.debitNotes.total)}</td><td>Anulados: <b>${s.voided.count}</b> · ${this.fmt(s.voided.total)}</td></tr></table>
      <table><thead><tr><th>Documento</th><th>Data</th><th>${this.side === 'CUSTOMER' ? 'Cliente' : 'Fornecedor'}</th><th>NUIT</th><th class="n">Base</th><th class="n">IVA</th>
        <th class="n">Total</th><th>Estado</th><th class="n">Pago</th><th class="n">Por pagar</th><th>Pagamento</th></tr></thead><tbody>${body}</tbody></table>
      <footer>Documento processado por computador · Inverno ERP · ${new Date().toLocaleString('pt-PT')}</footer></body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 300);
  }
}
