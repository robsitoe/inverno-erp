import { ChangeDetectorRef, Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

const STATE_LABEL: Record<string, string> = { EXPIRED: 'Vencido', DUE: 'A vencer', OK: 'Em dia', RETIRED: 'Retirado' };
const STATE_CLASS: Record<string, string> = {
  EXPIRED: 'bg-red-100 text-red-700', DUE: 'bg-amber-100 text-amber-700', OK: 'bg-green-100 text-green-700', RETIRED: 'bg-gray-100 text-gray-500',
};

/** Controlo de validades e prazos: extintores, inspeções, licenças, seguros, contratos, documentos... */
@Component({
  selector: 'app-expiry-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-lg font-bold text-gray-800">{{ view === 'expiry-extinguishers' ? 'Extintores' : 'Controlo de Validades' }}</h1>
          <p class="text-xs text-gray-500">{{ view === 'expiry-extinguishers'
            ? 'Registo dos extintores por local, com a data da próxima recarga/inspeção e o histórico.'
            : 'Prazos que expiram (extintores, inspeções, licenças, seguros, contratos, documentos), com aviso antecipado.' }}</p>
        </div>
        <div class="flex gap-2">
          <button (click)="exportCsv()" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white hover:bg-gray-50">Exportar CSV</button>
          <button (click)="newItem()" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700">+ Novo registo</button>
        </div>
      </div>

      <!-- Resumo -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button (click)="stateFilter = 'EXPIRED'" class="bg-white border rounded shadow-sm p-3 text-left" [class.border-red-400]="stateFilter === 'EXPIRED'">
          <div class="text-[11px] font-semibold text-gray-500">Vencidos</div>
          <div class="text-2xl font-bold text-red-600">{{ count('EXPIRED') }}</div></button>
        <button (click)="stateFilter = 'DUE'" class="bg-white border rounded shadow-sm p-3 text-left" [class.border-amber-400]="stateFilter === 'DUE'">
          <div class="text-[11px] font-semibold text-gray-500">A vencer (dentro do aviso)</div>
          <div class="text-2xl font-bold text-amber-600">{{ count('DUE') }}</div></button>
        <button (click)="stateFilter = 'OK'" class="bg-white border rounded shadow-sm p-3 text-left" [class.border-green-400]="stateFilter === 'OK'">
          <div class="text-[11px] font-semibold text-gray-500">Em dia</div>
          <div class="text-2xl font-bold text-green-700">{{ count('OK') }}</div></button>
        <button (click)="stateFilter = ''" class="bg-white border rounded shadow-sm p-3 text-left" [class.border-blue-400]="!stateFilter">
          <div class="text-[11px] font-semibold text-gray-500">Total ativos</div>
          <div class="text-2xl font-bold text-gray-800">{{ items.length - count('RETIRED') }}</div></button>
      </div>

      <!-- Filtros e lista -->
      <div class="bg-white border border-gray-200 rounded shadow-sm">
        <div class="p-2 border-b border-gray-200 flex gap-2 flex-wrap items-center text-xs">
          <input [(ngModel)]="search" placeholder="Procurar descrição, código, local, n.º de série..." class="flex-1 min-w-[200px] border border-gray-300 rounded px-2 py-1">
          <select *ngIf="view !== 'expiry-extinguishers'" [(ngModel)]="categoryFilter" class="border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="">Todas as categorias</option>
            <option *ngFor="let c of categories" [value]="c.code">{{ c.label }}</option></select>
          <select [(ngModel)]="stateFilter" class="border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="">Todos os estados (sem retirados)</option><option value="ALERT">Vencidos e a vencer</option>
            <option value="EXPIRED">Vencidos</option><option value="DUE">A vencer</option><option value="OK">Em dia</option><option value="RETIRED">Retirados</option></select>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600"><tr>
              <th class="px-3 py-2 text-left">Estado</th><th class="px-3 py-2 text-left">Categoria</th><th class="px-3 py-2 text-left">Código</th>
              <th class="px-3 py-2 text-left">Descrição</th><th class="px-3 py-2 text-left">Local</th><th class="px-3 py-2 text-left">Responsável</th>
              <th class="px-3 py-2 text-left">Última</th><th class="px-3 py-2 text-left">Validade</th><th class="px-3 py-2 text-right">Dias</th><th class="px-3 py-2"></th></tr></thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let r of filtered" class="hover:bg-blue-50 cursor-pointer" (click)="open(r.id)">
                <td class="px-3 py-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="stateClass(r.state)">{{ stateLabel(r.state) }}</span></td>
                <td class="px-3 py-2 text-gray-600">{{ r.categoryLabel }}</td>
                <td class="px-3 py-2 font-mono">{{ r.code }}</td>
                <td class="px-3 py-2 font-semibold text-gray-800">{{ r.description }}
                  <div *ngIf="r.category === 'EXTINTOR' && (r.attributes?.agente || r.attributes?.capacidade)" class="text-[10px] font-normal text-gray-500">
                    {{ r.attributes?.agente }} {{ r.attributes?.capacidade ? '· ' + r.attributes.capacidade : '' }}</div></td>
                <td class="px-3 py-2 text-gray-600">{{ r.location }}</td>
                <td class="px-3 py-2 text-gray-600">{{ r.responsible }}</td>
                <td class="px-3 py-2 text-gray-600">{{ r.lastDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-3 py-2 font-semibold">{{ r.nextDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-3 py-2 text-right font-bold" [class.text-red-600]="r.daysLeft < 0" [class.text-amber-600]="r.state === 'DUE'">
                  {{ r.state === 'RETIRED' ? '' : r.daysLeft }}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button *ngIf="r.state !== 'RETIRED'" (click)="$event.stopPropagation(); openRenew(r)" class="px-2 py-1 rounded bg-green-600 text-white text-[10px] font-bold">Renovar</button></td>
              </tr>
              <tr *ngIf="!filtered.length"><td colspan="10" class="px-3 py-6 text-center text-gray-400">Sem registos{{ items.length ? ' com estes filtros' : '' }}.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Ficha -->
    <div *ngIf="form" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="form = null">
      <div class="bg-white rounded shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 class="font-bold text-gray-800 text-sm">{{ form.id ? form.description : 'Novo registo' }}
            <span *ngIf="form.state" class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="stateClass(form.state)">{{ stateLabel(form.state) }}</span></h2>
          <button (click)="form = null" class="text-gray-400 hover:text-gray-700"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Categoria *</span>
            <select [(ngModel)]="form.category" (ngModelChange)="onCategory()" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option *ngFor="let c of categories" [value]="c.code">{{ c.label }}</option></select></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Código / n.º interno</span>
            <input [(ngModel)]="form.code" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" placeholder="Ex.: EXT-001"></label>
          <label class="block col-span-2 md:col-span-4"><span class="font-semibold text-gray-600">Descrição *</span>
            <input [(ngModel)]="form.description" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" placeholder="Ex.: Extintor pó ABC 6 kg — Armazém"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Local</span>
            <input [(ngModel)]="form.location" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Responsável</span>
            <input [(ngModel)]="form.responsible" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Fornecedor / entidade</span>
            <input [(ngModel)]="form.supplier" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">N.º de série</span>
            <input [(ngModel)]="form.serialNumber" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>

          <label *ngFor="let a of categoryAttributes" class="block md:col-span-2"><span class="font-semibold text-gray-600">{{ a.label }}</span>
            <select *ngIf="a.options" [(ngModel)]="form.attributes[a.key]" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option value=""></option><option *ngFor="let o of a.options" [value]="o">{{ o }}</option></select>
            <input *ngIf="!a.options" [(ngModel)]="form.attributes[a.key]" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>

          <div class="col-span-2 md:col-span-4 border-t border-gray-200 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <label class="block"><span class="font-semibold text-gray-600">Última renovação</span>
              <input type="date" [(ngModel)]="form.lastDate" [disabled]="!!form.id" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
            <label class="block"><span class="font-semibold text-gray-600">Periodicidade (meses)</span>
              <input type="number" min="0" [(ngModel)]="form.intervalMonths" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
            <label class="block"><span class="font-semibold text-gray-600">Validade / próxima *</span>
              <input type="date" [(ngModel)]="form.nextDate" [disabled]="!!form.id" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                     [placeholder]="'calculada'"></label>
            <label class="block"><span class="font-semibold text-gray-600">Avisar com (dias)</span>
              <input type="number" min="0" [(ngModel)]="form.alertDays" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
            <p class="col-span-2 md:col-span-4 text-[11px] text-gray-500">
              {{ form.id ? 'As datas mudam através de "Renovar", para ficar o histórico.' : 'Se não indicar a validade, é calculada a partir da última renovação + periodicidade.' }}</p>
          </div>
          <label class="block col-span-2 md:col-span-4"><span class="font-semibold text-gray-600">Observações</span>
            <textarea [(ngModel)]="form.notes" rows="2" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></textarea></label>
        </div>

        <div *ngIf="form.events?.length" class="px-4 pb-4">
          <h3 class="text-xs font-bold text-gray-700 mb-2">Histórico</h3>
          <table class="w-full text-xs border border-gray-200">
            <thead class="bg-gray-50 text-gray-600"><tr><th class="px-2 py-1 text-left">Data</th><th class="px-2 py-1 text-left">Tipo</th><th class="px-2 py-1 text-left">Descrição</th>
              <th class="px-2 py-1 text-left">Documento</th><th class="px-2 py-1 text-right">Custo</th><th class="px-2 py-1 text-left">Validade anterior → nova</th><th class="px-2 py-1 text-left">Por</th></tr></thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let e of form.events">
                <td class="px-2 py-1">{{ e.date | date:'dd/MM/yyyy' }}</td><td class="px-2 py-1">{{ eventLabel(e.type) }}</td><td class="px-2 py-1">{{ e.description }}</td>
                <td class="px-2 py-1">{{ e.documentRef }}</td><td class="px-2 py-1 text-right">{{ +e.cost ? (+e.cost | number:'1.2-2') : '' }}</td>
                <td class="px-2 py-1">{{ e.previousDate | date:'dd/MM/yyyy' }}{{ e.previousDate ? ' → ' : '' }}{{ e.nextDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-2 py-1 text-gray-500">{{ e.createdBy }}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="px-4 py-3 border-t border-gray-200 flex justify-between gap-2">
          <div class="flex gap-2">
            <button *ngIf="form.id && form.status === 'ACTIVE'" (click)="openRenew(form)" class="px-3 py-1.5 text-xs font-bold rounded bg-green-600 text-white">Renovar</button>
            <button *ngIf="form.id && form.status === 'ACTIVE'" (click)="retire()" class="px-3 py-1.5 text-xs font-bold rounded border border-red-300 text-red-700 bg-white">Retirar de serviço</button>
          </div>
          <div class="flex gap-2">
            <button (click)="form = null" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white">Fechar</button>
            <button *ngIf="form.status !== 'RETIRED'" (click)="save()" [disabled]="busy" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white disabled:opacity-50">Gravar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Renovação -->
    <div *ngIf="renewing" class="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" (click)="renewing = null">
      <div class="bg-white rounded shadow-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-gray-200"><h2 class="font-bold text-gray-800 text-sm">Renovar — {{ renewing.item.description }}</h2>
          <p class="text-[11px] text-gray-500">Validade atual: {{ renewing.item.nextDate | date:'dd/MM/yyyy' }}</p></div>
        <div class="p-4 grid grid-cols-2 gap-3 text-xs">
          <label class="block"><span class="font-semibold text-gray-600">Tipo</span>
            <select [(ngModel)]="renewing.type" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option value="RENEWAL">Renovação / recarga</option><option value="INSPECTION">Inspeção</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Data *</span>
            <input type="date" [(ngModel)]="renewing.date" (ngModelChange)="suggestNext()" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Nova validade *</span>
            <input type="date" [(ngModel)]="renewing.nextDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Custo (MT)</span>
            <input type="number" min="0" step="0.01" [(ngModel)]="renewing.cost" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block col-span-2"><span class="font-semibold text-gray-600">Descrição</span>
            <input [(ngModel)]="renewing.description" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block col-span-2"><span class="font-semibold text-gray-600">Documento (fatura, certificado...)</span>
            <input [(ngModel)]="renewing.documentRef" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
        </div>
        <div class="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="renewing = null" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white">Cancelar</button>
          <button (click)="renew()" [disabled]="busy" class="px-3 py-1.5 text-xs font-bold rounded bg-green-600 text-white disabled:opacity-50">Confirmar renovação</button>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class ExpiryControlComponent implements OnInit, OnChanges {
  @Input() view = 'expiry-control';

  api = `${environment.apiUrl}/expiry-control`;
  categories: any[] = [];
  items: any[] = [];
  search = '';
  categoryFilter = '';
  stateFilter = '';
  form: any = null;
  renewing: any = null;
  busy = false;

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.http.get<any[]>(`${this.api}/categories`).subscribe({ next: c => { this.categories = c || []; this.cdr.detectChanges(); }, error: () => { } });
    this.load();
  }

  ngOnChanges() {
    this.categoryFilter = this.view === 'expiry-extinguishers' ? 'EXTINTOR' : '';
  }

  load() {
    this.http.get<any[]>(this.api).subscribe({
      next: r => { this.items = r || []; this.cdr.detectChanges(); },
      error: e => this.toaster.showError('Erro', e?.error?.message || 'Não foi possível carregar os registos.'),
    });
  }

  get filtered() {
    const s = this.search.trim().toLowerCase();
    return this.items.filter(r =>
      (!this.categoryFilter || r.category === this.categoryFilter) &&
      (this.stateFilter === 'ALERT' ? ['EXPIRED', 'DUE'].includes(r.state) : this.stateFilter ? r.state === this.stateFilter : r.state !== 'RETIRED') &&
      (!s || [r.description, r.code, r.location, r.responsible, r.serialNumber, r.supplier].some(v => String(v || '').toLowerCase().includes(s))));
  }

  count(state: string) {
    return this.items.filter(r => r.state === state && (!this.categoryFilter || r.category === this.categoryFilter)).length;
  }
  stateLabel(s: string) { return STATE_LABEL[s] || s; }
  stateClass(s: string) { return STATE_CLASS[s] || ''; }
  eventLabel(t: string) { return ({ CREATED: 'Registo', RENEWAL: 'Renovação', INSPECTION: 'Inspeção', RETIRED: 'Retirado' } as any)[t] || t; }

  get categoryAttributes() { return this.categories.find(c => c.code === this.form?.category)?.attributes || []; }

  newItem() {
    const cat = this.categories.find(c => c.code === (this.categoryFilter || 'EXTINTOR')) || this.categories[0];
    this.form = { category: cat?.code || 'OUTRO', intervalMonths: cat?.intervalMonths ?? 12, alertDays: cat?.alertDays ?? 30, attributes: {}, status: 'ACTIVE' };
  }

  onCategory() {
    if (this.form.id) return;
    const cat = this.categories.find(c => c.code === this.form.category);
    if (cat) { this.form.intervalMonths = cat.intervalMonths; this.form.alertDays = cat.alertDays; }
  }

  async open(id: string) {
    try { this.form = await firstValueFrom(this.http.get<any>(`${this.api}/${id}`)); this.form.attributes ||= {}; this.cdr.detectChanges(); }
    catch (e: any) { this.toaster.showError('Erro', e?.error?.message || 'Não foi possível abrir o registo.'); }
  }

  private errorText(e: any) {
    const errs = e?.error?.errors;
    return Array.isArray(errs) && errs.length ? errs.join(' ') : e?.error?.message || 'Não foi possível gravar.';
  }

  async save() {
    this.busy = true;
    try {
      this.form = await firstValueFrom(this.http.post<any>(this.api, this.form));
      this.form.attributes ||= {};
      this.toaster.showSuccess('Gravado', 'O registo foi gravado.');
      this.load();
      window.dispatchEvent(new Event('expiry-changed'));
    } catch (e: any) { this.toaster.showError('Erro', this.errorText(e)); }
    this.busy = false; this.cdr.detectChanges();
  }

  openRenew(item: any) {
    const date = new Date().toISOString().slice(0, 10);
    this.renewing = { item, type: 'RENEWAL', date, nextDate: '', cost: 0, description: item.category === 'EXTINTOR' ? 'Recarga e inspeção' : 'Renovação', documentRef: '' };
    this.suggestNext();
  }

  suggestNext() {
    const m = Number(this.renewing?.item?.intervalMonths);
    if (!this.renewing?.date || !m) return;
    const [y, mo, d] = this.renewing.date.split('-').map(Number);
    const t = new Date(y, mo - 1 + m, d);
    this.renewing.nextDate = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  async renew() {
    this.busy = true;
    try {
      const r = await firstValueFrom(this.http.post<any>(`${this.api}/${this.renewing.item.id}/renew`, this.renewing));
      this.toaster.showSuccess('Renovado', `Nova validade: ${r.nextDate.split('-').reverse().join('/')}.`);
      if (this.form?.id === r.id) { this.form = r; this.form.attributes ||= {}; }
      this.renewing = null;
      this.load();
      window.dispatchEvent(new Event('expiry-changed'));
    } catch (e: any) { this.toaster.showError('Erro', this.errorText(e)); }
    this.busy = false; this.cdr.detectChanges();
  }

  async retire() {
    const reason = prompt('Motivo (ex.: extintor abatido, licença cancelada):', 'Retirado de serviço');
    if (reason === null) return;
    try {
      this.form = await firstValueFrom(this.http.post<any>(`${this.api}/${this.form.id}/retire`, { reason }));
      this.form.attributes ||= {};
      this.toaster.showSuccess('Retirado', 'O registo deixou de gerar alertas.');
      this.load();
      window.dispatchEvent(new Event('expiry-changed'));
    } catch (e: any) { this.toaster.showError('Erro', this.errorText(e)); }
    this.cdr.detectChanges();
  }

  exportCsv() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Estado', 'Categoria', 'Código', 'Descrição', 'Local', 'Responsável', 'Fornecedor', 'N.º série', 'Última', 'Validade', 'Dias', 'Atributos'];
    const rows = this.filtered.map(r => [this.stateLabel(r.state), r.categoryLabel, r.code, r.description, r.location, r.responsible, r.supplier, r.serialNumber,
      r.lastDate, r.nextDate, r.daysLeft, Object.entries(r.attributes || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('; ')]);
    const csv = '﻿' + [head, ...rows].map(l => l.map(esc).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `validades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
