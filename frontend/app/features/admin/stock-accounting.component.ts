import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

interface PostingRule { module: 'SALES' | 'PURCHASES' | 'STOCK'; docType: string; label: string; enabled: boolean; debitAccount: string; creditAccount: string; }
interface Settings { enabled: boolean; valuation: 'AVERAGE' | 'FIFO'; inventoryAccount: string; rules: PostingRule[]; }

const INV = '{INVENTARIO}';
const MODULE_LABEL: Record<string, string> = { SALES: 'Vendas', PURCHASES: 'Compras', STOCK: 'Stock' };

/**
 * Integração stock–contabilidade: cada movimento de stock guarda quantidade e valor (custo médio ou FIFO)
 * e o servidor gera o lançamento do documento com as contas configuradas por tipo de documento.
 */
@Component({
  selector: 'app-stock-accounting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div *ngIf="s" class="space-y-4">
    <div class="bg-white border border-gray-200 rounded shadow-sm p-4 space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-sm font-bold text-gray-800">Integração Stock — Contabilidade</h3>
          <p class="text-xs text-gray-500 max-w-2xl">Com a integração ligada, cada documento que movimenta stock gera automaticamente o lançamento do seu custo
            (custo das vendas, entradas de compras, quebras e sobras), ao valor do movimento de stock. Desligada, o stock não gera lançamentos.</p>
        </div>
        <label class="flex items-center gap-2 text-sm font-semibold shrink-0 cursor-pointer">
          <input type="checkbox" [(ngModel)]="s.enabled" class="w-4 h-4"> {{ s.enabled ? 'Ligada' : 'Desligada' }}
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="text-xs font-semibold text-gray-600 mb-1">Método de valorização do stock</div>
          <label class="flex items-start gap-2 text-xs text-gray-700 mb-1">
            <input type="radio" name="val" value="AVERAGE" [(ngModel)]="s.valuation"> <span><b>Custo médio ponderado</b> — cada entrada recalcula o custo médio; as saídas saem a esse custo.</span>
          </label>
          <label class="flex items-start gap-2 text-xs text-gray-700">
            <input type="radio" name="val" value="FIFO" [(ngModel)]="s.valuation"> <span><b>FIFO</b> — as saídas consomem primeiro os lotes mais antigos, ao custo de cada lote.</span>
          </label>
          <div *ngIf="s.valuation === 'FIFO' && original?.valuation !== 'FIFO'" class="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            Ao gravar, o stock existente de cada artigo entra como primeiro lote, ao custo médio atual. Os movimentos já registados não são revalorizados.
          </div>
        </div>
        <label class="block">
          <span class="text-xs font-semibold text-gray-600">Conta de inventário (mercadorias)</span>
          <input [(ngModel)]="s.inventoryAccount" list="sa-accounts" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono">
          <span class="text-[11px] text-gray-500">Usada onde as regras dizem «Inventário». Por omissão 2.2.9 Mercadorias em armazém (criada automaticamente se não existir).</span>
        </label>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded shadow-sm">
      <div class="px-4 py-3 border-b border-gray-200">
        <h3 class="text-sm font-bold text-gray-800">Contas por tipo de documento</h3>
        <p class="text-xs text-gray-500">O valor lançado é o custo dos movimentos de stock do documento. Numa anulação, o lançamento é estornado com as contas trocadas.</p>
      </div>
      <table class="w-full text-xs">
        <thead class="bg-gray-50 text-gray-600">
          <tr><th class="text-left px-3 py-2">Módulo</th><th class="text-left px-3 py-2">Documento</th><th class="px-3 py-2">Lançar</th><th class="text-left px-3 py-2">Débito</th><th class="text-left px-3 py-2">Crédito</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of s.rules" class="border-t border-gray-100" [class.opacity-50]="!r.enabled">
            <td class="px-3 py-1.5 text-gray-500">{{ moduleLabel(r.module) }}</td>
            <td class="px-3 py-1.5"><b>{{ r.docType === 'INV-' ? 'INV' : r.docType }}</b> — {{ r.label }}</td>
            <td class="px-3 py-1.5 text-center"><input type="checkbox" [(ngModel)]="r.enabled"></td>
            <td class="px-3 py-1.5">
              <input [ngModel]="show(r.debitAccount)" (ngModelChange)="r.debitAccount = store($event)" list="sa-accounts" class="w-full border border-gray-300 rounded px-2 py-1 font-mono">
              <div class="text-[10px] text-gray-400 truncate">{{ accountName(r.debitAccount) }}</div>
            </td>
            <td class="px-3 py-1.5">
              <input [ngModel]="show(r.creditAccount)" (ngModelChange)="r.creditAccount = store($event)" list="sa-accounts" class="w-full border border-gray-300 rounded px-2 py-1 font-mono">
              <div class="text-[10px] text-gray-400 truncate">{{ accountName(r.creditAccount) }}</div>
            </td>
          </tr>
        </tbody>
      </table>
      <datalist id="sa-accounts">
        <option value="Inventário">Conta de inventário da empresa</option>
        <option *ngFor="let a of postingAccounts" [value]="a.code">{{ a.code }} — {{ a.name }}</option>
      </datalist>
    </div>

    <div *ngIf="errors.length" class="rounded border border-red-200 bg-red-50 p-3">
      <ul class="list-disc pl-5 text-xs text-red-700 space-y-0.5"><li *ngFor="let e of errors">{{ e }}</li></ul>
    </div>

    <div class="flex flex-wrap gap-2 items-center">
      <button (click)="save()" [disabled]="busy" class="px-4 py-2 text-xs font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Gravar configuração</button>
      <button (click)="resetDefaults()" [disabled]="busy" class="px-4 py-2 text-xs font-semibold rounded border border-gray-300">Repor contas por omissão</button>
      <button (click)="postPending()" [disabled]="busy || !original?.enabled" class="px-4 py-2 text-xs font-semibold rounded border border-gray-300 disabled:opacity-50"
              title="Gera os lançamentos dos movimentos de stock que ainda não estão contabilizados">Contabilizar movimentos pendentes</button>
      <span *ngIf="pendingResult" class="text-xs text-gray-600">{{ pendingResult }}</span>
    </div>
  </div>
  `,
})
export class StockAccountingComponent implements OnInit {
  s: Settings | null = null;
  original: Settings | null = null;
  accounts: any[] = [];
  errors: string[] = [];
  busy = false;
  pendingResult = '';
  private api = `${environment.apiUrl}/stock-accounting`;

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  async ngOnInit() {
    try {
      const [settings, accounts] = await Promise.all([
        firstValueFrom(this.http.get<Settings>(`${this.api}/settings`)),
        firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/accounting/accounts`)).catch(() => []),
      ]);
      this.original = JSON.parse(JSON.stringify(settings));
      this.s = settings;
      this.accounts = accounts || [];
    } catch (e: any) {
      this.toaster.showError('Integração stock', e?.error?.message || 'Não foi possível carregar a configuração.');
    }
    this.cdr.detectChanges();
  }

  get postingAccounts() { return this.accounts.filter(a => a.allowPosting !== false).sort((a, b) => String(a.code).localeCompare(String(b.code))); }
  moduleLabel(m: string) { return MODULE_LABEL[m] || m; }
  show(code: string) { return code === INV ? 'Inventário' : code; }
  store(v: string) { const t = String(v || '').trim(); return /^invent/i.test(t) ? INV : t; }
  accountName(code: string) {
    const real = code === INV ? this.s?.inventoryAccount : code;
    const a = this.accounts.find(x => x.code === real);
    return code === INV ? `Inventário (${real}${a ? ' — ' + a.name : ''})` : (a ? a.name : (real ? 'conta não encontrada' : ''));
  }

  async resetDefaults() {
    if (!this.s) return;
    const d = await firstValueFrom(this.http.get<PostingRule[]>(`${this.api}/defaults`));
    this.s.rules = d;
    this.cdr.detectChanges();
  }

  async save() {
    if (!this.s) return;
    this.busy = true; this.errors = [];
    try {
      const saved = await firstValueFrom(this.http.put<Settings>(`${this.api}/settings`, this.s));
      this.s = saved; this.original = JSON.parse(JSON.stringify(saved));
      this.toaster.showSuccess('Integração stock', saved.enabled ? 'Configuração gravada. Os próximos documentos geram o lançamento do custo.' : 'Configuração gravada. A integração está desligada.');
      if (saved.enabled) this.accounts = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/accounting/accounts`)).catch(() => this.accounts);
    } catch (e: any) {
      this.errors = e?.error?.errors || [e?.error?.message || 'Não foi possível gravar.'];
    }
    this.busy = false; this.cdr.detectChanges();
  }

  async postPending() {
    if (!confirm('Gerar os lançamentos de custo dos movimentos de stock que ainda não estão contabilizados?')) return;
    this.busy = true; this.pendingResult = '';
    try {
      const r = await firstValueFrom(this.http.post<any>(`${this.api}/post-pending`, {}));
      this.pendingResult = `${r.posted} lançamento(s) gerado(s); ${r.skipped} sem valor, sem regra ou já tratados.`;
    } catch (e: any) {
      this.toaster.showError('Integração stock', e?.error?.message || 'Falhou.');
    }
    this.busy = false; this.cdr.detectChanges();
  }
}
