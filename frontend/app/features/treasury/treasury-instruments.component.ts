import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const STATUS_CLASS: Record<string, string> = {
  CARTEIRA: 'bg-blue-100 text-blue-700', ACEITE: 'bg-blue-100 text-blue-700', EMITIDO: 'bg-blue-100 text-blue-700',
  DEPOSITADO: 'bg-indigo-100 text-indigo-700', ENTREGUE: 'bg-indigo-100 text-indigo-700', DESCONTADA: 'bg-violet-100 text-violet-700',
  COBRADO: 'bg-green-100 text-green-700', COBRADA: 'bg-green-100 text-green-700', PAGO: 'bg-green-100 text-green-700', PAGA: 'bg-green-100 text-green-700',
  DEVOLVIDO: 'bg-red-100 text-red-700', PROTESTADA: 'bg-red-100 text-red-700', ANULADO: 'bg-gray-100 text-gray-500', REFORMADA: 'bg-gray-100 text-gray-500',
};

/** Cheques (recebidos e emitidos) e Letras (a receber e a pagar), com ciclo de vida e vencimentos. */
@Component({
  selector: 'app-treasury-instruments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-lg font-bold text-gray-800">{{ isCheque ? 'Cheques' : 'Letras' }}</h1>
          <p class="text-xs text-gray-500">{{ isCheque
            ? 'Carteira de cheques recebidos (pré-datados, depósito, cobrança, devolução) e controlo dos cheques emitidos.'
            : 'Letras a receber (desconto, cobrança, reforma, protesto) e letras a pagar (aceites), por vencimento.' }}</p>
        </div>
        <button (click)="newItem()" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700">+ {{ isCheque ? (direction === 'IN' ? 'Registar cheque recebido' : 'Registar cheque emitido') : (direction === 'IN' ? 'Nova letra a receber' : 'Nova letra a pagar') }}</button>
      </div>

      <div class="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit text-xs font-bold">
        <button (click)="setDirection('IN')" class="px-3 py-1.5 rounded" [ngClass]="direction === 'IN' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'">{{ isCheque ? 'Recebidos' : 'A receber' }}</button>
        <button (click)="setDirection('OUT')" class="px-3 py-1.5 rounded" [ngClass]="direction === 'OUT' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'">{{ isCheque ? 'Emitidos' : 'A pagar' }}</button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white border border-gray-200 rounded-lg p-3"><div class="text-[11px] font-semibold text-gray-500">Em aberto</div>
          <div class="text-xl font-bold font-mono">{{ sum(openItems) | number:'1.2-2' }}</div><div class="text-[10px] text-gray-400">{{ openItems.length }} {{ isCheque ? 'cheque(s)' : 'letra(s)' }}</div></div>
        <div class="bg-white border rounded-lg p-3" [ngClass]="overdue.length ? 'border-red-300' : 'border-gray-200'"><div class="text-[11px] font-semibold text-gray-500">Vencidos</div>
          <div class="text-xl font-bold font-mono" [ngClass]="overdue.length ? 'text-red-600' : 'text-gray-800'">{{ sum(overdue) | number:'1.2-2' }}</div><div class="text-[10px] text-gray-400">{{ overdue.length }}</div></div>
        <div class="bg-white border rounded-lg p-3" [ngClass]="dueSoon.length ? 'border-amber-300' : 'border-gray-200'"><div class="text-[11px] font-semibold text-gray-500">Vencem nos próximos 7 dias</div>
          <div class="text-xl font-bold font-mono text-amber-600">{{ sum(dueSoon) | number:'1.2-2' }}</div><div class="text-[10px] text-gray-400">{{ dueSoon.length }}</div></div>
        <div class="bg-white border border-gray-200 rounded-lg p-3" *ngIf="direction === 'IN'"><div class="text-[11px] font-semibold text-gray-500">{{ isCheque ? 'Devolvidos por resolver' : 'Protestadas' }}</div>
          <div class="text-xl font-bold font-mono text-red-600">{{ sum(problem) | number:'1.2-2' }}</div><div class="text-[10px] text-gray-400">{{ problem.length }}</div></div>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div class="p-2 border-b border-gray-200 flex gap-2 flex-wrap text-xs">
          <input [(ngModel)]="search" placeholder="Procurar número, entidade, banco, documento..." class="flex-1 min-w-[200px] border border-gray-300 rounded px-2 py-1">
          <select [(ngModel)]="statusFilter" class="border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="OPEN">Em aberto</option><option value="">Todos</option>
            <option *ngFor="let s of statusOptions" [value]="s.status">{{ s.label }}</option></select>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600"><tr>
              <th class="px-3 py-2 text-left">Número</th><th class="px-3 py-2 text-left">{{ direction === 'IN' ? (isCheque ? 'Sacador / cliente' : 'Aceitante') : 'Beneficiário' }}</th>
              <th class="px-3 py-2 text-left">Banco</th><th class="px-3 py-2 text-left">Emissão</th><th class="px-3 py-2 text-left">Vencimento</th>
              <th class="px-3 py-2 text-right">Valor</th><th class="px-3 py-2 text-left">Estado</th><th class="px-3 py-2 text-left">Documento</th><th class="px-3 py-2"></th></tr></thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let r of filtered" class="hover:bg-blue-50">
                <td class="px-3 py-2 font-mono font-semibold">{{ r.number }}</td>
                <td class="px-3 py-2">{{ r.entityName }}</td>
                <td class="px-3 py-2 text-gray-600">{{ r.bankName || '' }}{{ r.accountCode ? (r.bankName ? ' · ' : '') + r.accountCode : '' }}</td>
                <td class="px-3 py-2">{{ r.issueDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-3 py-2 whitespace-nowrap" [ngClass]="r.overdue ? 'text-red-600 font-bold' : r.open && r.daysToDue <= 7 ? 'text-amber-600 font-bold' : ''">
                  {{ r.dueDate | date:'dd/MM/yyyy' }}
                  <span *ngIf="r.open" class="text-[10px] font-normal">({{ r.daysToDue < 0 ? 'há ' + (-r.daysToDue) + ' d' : r.daysToDue === 0 ? 'hoje' : 'em ' + r.daysToDue + ' d' }})</span></td>
                <td class="px-3 py-2 text-right font-mono font-semibold">{{ r.amount | number:'1.2-2' }}</td>
                <td class="px-3 py-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="statusClass(r.status)">{{ r.statusLabel }}</span></td>
                <td class="px-3 py-2 text-gray-500">{{ r.documentRef }}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button *ngFor="let n of r.nextStatuses" (click)="openAction(r, n)" class="ml-1 px-2 py-0.5 rounded border text-[10px] font-bold"
                          [ngClass]="['ANULADO','DEVOLVIDO','PROTESTADA'].includes(n.status) ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-blue-200 text-blue-700 hover:bg-blue-50'">{{ actionLabel(n.status) }}</button>
                  <button (click)="openDetail(r)" class="ml-1 text-gray-400 hover:text-blue-600" title="Ficha e histórico"><span class="material-symbols-outlined text-[16px] align-middle">history</span></button>
                </td>
              </tr>
              <tr *ngIf="!filtered.length"><td colspan="9" class="px-3 py-6 text-center text-gray-400">Sem registos.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Registo -->
    <div *ngIf="form" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="form = null">
      <div class="bg-white rounded shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-gray-200 font-bold text-sm text-gray-800">{{ form.id ? 'Editar' : 'Registar' }} {{ isCheque ? 'cheque' : 'letra' }} {{ direction === 'IN' ? (isCheque ? 'recebido' : 'a receber') : (isCheque ? 'emitido' : 'a pagar') }}</div>
        <div class="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <label class="block"><span class="font-semibold text-gray-600">Número *</span>
            <input [(ngModel)]="form.number" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono"></label>
          <label class="block md:col-span-3"><span class="font-semibold text-gray-600">{{ direction === 'IN' ? (isCheque ? 'Recebido de (sacador / cliente) *' : 'Aceitante *') : 'Beneficiário *' }}</span>
            <input [(ngModel)]="form.entityName" list="ti-entities" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">{{ direction === 'IN' ? 'Banco sacado' : 'Banco' }}</span>
            <input [(ngModel)]="form.bankName" list="ti-banks" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">{{ direction === 'OUT' && isCheque ? 'Conta de onde sai *' : 'Conta da empresa (opcional)' }}</span>
            <select [(ngModel)]="form.treasuryAccountId" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option [ngValue]="null">—</option><option *ngFor="let a of bankAccounts" [ngValue]="a.id">{{ a.code }} — {{ a.name }}</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Valor *</span>
            <input type="number" min="0" step="0.01" [(ngModel)]="form.amount" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Data de emissão</span>
            <input type="date" [(ngModel)]="form.issueDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">{{ isCheque ? 'Data do cheque (pré-datado)' : 'Vencimento *' }}</span>
            <input type="date" [(ngModel)]="form.dueDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Documento (fatura, recibo...)</span>
            <input [(ngModel)]="form.documentRef" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block col-span-2 md:col-span-4"><span class="font-semibold text-gray-600">Observações</span>
            <textarea [(ngModel)]="form.notes" rows="2" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></textarea></label>
          <p class="col-span-2 md:col-span-4 text-[11px] text-gray-500">Se o documento indicado estiver em aberto, a Tesouraria Previsional usa a data deste {{ isCheque ? 'cheque' : 'título' }} em vez do vencimento do documento.</p>
        </div>
        <datalist id="ti-banks"><option *ngFor="let b of banks" [value]="b"></option></datalist>
        <datalist id="ti-entities"><option *ngFor="let e of entities" [value]="e"></option></datalist>
        <div class="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="form = null" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white">Cancelar</button>
          <button (click)="save()" [disabled]="busy" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white disabled:opacity-50">Gravar</button>
        </div>
      </div>
    </div>

    <!-- Mudança de estado -->
    <div *ngIf="action" class="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" (click)="action = null">
      <div class="bg-white rounded shadow-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-gray-200"><div class="font-bold text-sm text-gray-800">{{ actionLabel(action.status) }} — {{ action.item.number }}</div>
          <div class="text-[11px] text-gray-500">{{ action.item.entityName }} · {{ action.item.amount | number:'1.2-2' }} · {{ action.item.statusLabel }} → {{ action.label }}</div></div>
        <div class="p-4 grid grid-cols-2 gap-3 text-xs">
          <label class="block"><span class="font-semibold text-gray-600">Data *</span>
            <input type="date" [(ngModel)]="action.date" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label *ngIf="action.status === 'DEPOSITADO' || action.status === 'DESCONTADA'" class="block"><span class="font-semibold text-gray-600">Banco *</span>
            <select [(ngModel)]="action.treasuryAccountId" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option *ngFor="let a of bankAccounts" [ngValue]="a.id">{{ a.code }} — {{ a.name }}</option></select></label>
          <ng-container *ngIf="action.status === 'REFORMADA'">
            <label class="block"><span class="font-semibold text-gray-600">Novo vencimento *</span>
              <input type="date" [(ngModel)]="action.newDueDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
            <label class="block"><span class="font-semibold text-gray-600">Novo valor</span>
              <input type="number" [(ngModel)]="action.newAmount" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
            <label class="block"><span class="font-semibold text-gray-600">Número da nova letra</span>
              <input [(ngModel)]="action.newNumber" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono"></label>
          </ng-container>
          <label class="block col-span-2"><span class="font-semibold text-gray-600">{{ action.status === 'DEVOLVIDO' ? 'Motivo da devolução' : 'Observação' }}</span>
            <input [(ngModel)]="action.note" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" [placeholder]="action.status === 'DEVOLVIDO' ? 'Ex.: falta de provisão' : action.status === 'DEPOSITADO' ? 'Ex.: n.º do talão de depósito' : ''"></label>
          <p class="col-span-2 text-[11px] text-gray-500">{{ actionHelp(action.status) }}</p>
        </div>
        <div class="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="action = null" class="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white">Cancelar</button>
          <button (click)="doAction()" [disabled]="busy" class="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white disabled:opacity-50">Confirmar</button>
        </div>
      </div>
    </div>

    <!-- Ficha e histórico -->
    <div *ngIf="detail" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="detail = null">
      <div class="bg-white rounded shadow-xl w-full max-w-lg" (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div class="font-bold text-sm text-gray-800">{{ isCheque ? 'Cheque' : 'Letra' }} {{ detail.number }} <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="statusClass(detail.status)">{{ detail.statusLabel }}</span></div>
          <button *ngIf="detail.open" (click)="edit(detail)" class="text-xs font-bold text-blue-600">Editar</button>
        </div>
        <div class="p-4 text-xs space-y-1">
          <div><b>{{ detail.direction === 'IN' ? 'De' : 'Para' }}:</b> {{ detail.entityName }}</div>
          <div><b>Valor:</b> {{ detail.amount | number:'1.2-2' }} · <b>Vencimento:</b> {{ detail.dueDate | date:'dd/MM/yyyy' }}</div>
          <div *ngIf="detail.documentRef"><b>Documento:</b> {{ detail.documentRef }}</div>
          <div *ngIf="detail.replacesId" class="text-gray-500">Resulta da reforma de outra letra.</div>
          <div *ngIf="detail.notes" class="text-gray-600">{{ detail.notes }}</div>
          <table class="w-full mt-3 border border-gray-200">
            <thead class="bg-gray-50 text-gray-600"><tr><th class="px-2 py-1 text-left">Data</th><th class="px-2 py-1 text-left">Estado</th><th class="px-2 py-1 text-left">Observação</th><th class="px-2 py-1 text-left">Por</th></tr></thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let h of detail.history"><td class="px-2 py-1">{{ h.date | date:'dd/MM/yyyy' }}</td><td class="px-2 py-1">{{ labelOf(h.status) }}</td><td class="px-2 py-1">{{ h.note }}</td><td class="px-2 py-1 text-gray-500">{{ h.user }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class TreasuryInstrumentsComponent implements OnChanges {
  @Input() kind: 'CHEQUE' | 'LETRA' = 'CHEQUE';

  api = `${environment.apiUrl}/treasury`;
  direction: 'IN' | 'OUT' = 'IN';
  items: any[] = [];
  bankAccounts: any[] = [];
  entities: string[] = [];
  search = '';
  statusFilter = 'OPEN';
  form: any = null;
  action: any = null;
  detail: any = null;
  busy = false;
  banks = ['BCI', 'BIM - Millennium bim', 'Standard Bank', 'Absa', 'Moza Banco', 'FNB', 'Nedbank', 'Access Bank', 'Ecobank', 'First Capital Bank', 'Banco Letshego', 'Socremo', 'UBA', 'BNI'];
  labels: Record<string, string> = {
    CARTEIRA: 'Em carteira', DEPOSITADO: 'Depositado', COBRADO: 'Cobrado', DEVOLVIDO: 'Devolvido', ANULADO: 'Anulado', EMITIDO: 'Emitido', ENTREGUE: 'Entregue',
    PAGO: 'Pago', DESCONTADA: 'Descontada', COBRADA: 'Cobrada', REFORMADA: 'Reformada', PROTESTADA: 'Protestada', ACEITE: 'Aceite', PAGA: 'Paga',
  };

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  get isCheque() { return this.kind === 'CHEQUE'; }
  get openItems() { return this.items.filter(i => i.open && i.status !== 'DEVOLVIDO' && i.status !== 'PROTESTADA'); }
  get overdue() { return this.openItems.filter(i => i.overdue); }
  get dueSoon() { return this.openItems.filter(i => i.daysToDue >= 0 && i.daysToDue <= 7); }
  get problem() { return this.items.filter(i => i.status === 'DEVOLVIDO' || i.status === 'PROTESTADA'); }
  get statusOptions() {
    const by: Record<string, string[]> = {
      'CHEQUE:IN': ['CARTEIRA', 'DEPOSITADO', 'COBRADO', 'DEVOLVIDO', 'ANULADO'], 'CHEQUE:OUT': ['EMITIDO', 'ENTREGUE', 'PAGO', 'ANULADO'],
      'LETRA:IN': ['CARTEIRA', 'DESCONTADA', 'COBRADA', 'REFORMADA', 'PROTESTADA', 'ANULADO'], 'LETRA:OUT': ['ACEITE', 'PAGA', 'REFORMADA'],
    };
    return (by[`${this.kind}:${this.direction}`] || []).map(s => ({ status: s, label: this.labels[s] }));
  }
  get filtered() {
    const s = this.search.trim().toLowerCase();
    return this.items.filter(i =>
      (this.statusFilter === 'OPEN' ? i.open : !this.statusFilter || i.status === this.statusFilter) &&
      (!s || [i.number, i.entityName, i.bankName, i.documentRef, i.accountCode].some(v => String(v || '').toLowerCase().includes(s))));
  }
  sum(list: any[]) { return list.reduce((a, i) => a + (Number(i.amount) || 0), 0); }
  statusClass(s: string) { return STATUS_CLASS[s] || 'bg-gray-100 text-gray-600'; }
  labelOf(s: string) { return this.labels[s] || s; }
  actionLabel(s: string) {
    return ({ DEPOSITADO: 'Depositar', COBRADO: 'Cobrado', DEVOLVIDO: 'Devolvido', ANULADO: 'Anular', CARTEIRA: 'Reapresentar', ENTREGUE: 'Entregue', PAGO: 'Pago',
      DESCONTADA: 'Descontar', COBRADA: 'Cobrada', REFORMADA: 'Reformar', PROTESTADA: 'Protestar', PAGA: 'Paga' } as any)[s] || this.labelOf(s);
  }
  actionHelp(s: string) {
    return ({
      DEPOSITADO: 'O cheque sai da carteira e fica a aguardar boa cobrança no banco escolhido.',
      COBRADO: 'Confirma que o valor entrou na conta (veja no extrato bancário ou na Reconciliação Bancária).',
      DEVOLVIDO: 'O cheque foi devolvido pelo banco. Fica por resolver até ser reapresentado ou anulado.',
      CARTEIRA: 'Volta à carteira para ser depositado de novo.',
      DESCONTADA: 'A letra foi descontada no banco: o valor foi antecipado e deixa de entrar na previsão.',
      REFORMADA: 'Fecha esta letra e cria uma nova com o novo vencimento (e valor, se mudar).',
      PROTESTADA: 'Regista o protesto por falta de pagamento.',
      ANULADO: 'O registo deixa de contar na carteira e na previsão.',
    } as any)[s] || 'Regista a mudança no histórico.';
  }

  ngOnChanges() { this.direction = 'IN'; this.statusFilter = 'OPEN'; this.load(); this.loadRefs(); }
  setDirection(d: 'IN' | 'OUT') { this.direction = d; this.statusFilter = 'OPEN'; this.load(); }

  async load() {
    try { this.items = await firstValueFrom(this.http.get<any[]>(`${this.api}/instruments`, { params: { kind: this.kind, direction: this.direction } })); }
    catch (e: any) { this.toaster.showError('Erro', e?.error?.message || 'Não foi possível carregar os registos.'); }
    this.cdr.detectChanges();
  }

  loadRefs() {
    this.http.get<any[]>(`${this.api}/accounts`, { params: { type: 'BANK' } }).subscribe({ next: a => this.bankAccounts = a.filter(x => x.active), error: () => { } });
    const names = new Set<string>();
    this.http.get<any[]>(`${environment.apiUrl}/customers`).subscribe({ next: c => { (c || []).forEach(x => x.name && names.add(x.name)); this.entities = [...names].sort(); }, error: () => { } });
    this.http.get<any[]>(`${environment.apiUrl}/suppliers`).subscribe({ next: c => { (c || []).forEach(x => x.name && names.add(x.name)); this.entities = [...names].sort(); }, error: () => { } });
  }

  newItem() {
    const today = iso(new Date());
    this.form = { kind: this.kind, direction: this.direction, issueDate: today, dueDate: today, treasuryAccountId: this.direction === 'OUT' && this.isCheque ? this.bankAccounts[0]?.id || null : null };
  }
  edit(r: any) { this.detail = null; this.form = { ...r }; }
  openDetail(r: any) { this.detail = r; }

  openAction(item: any, n: any) {
    this.action = { item, status: n.status, label: n.label, date: iso(new Date()), note: '',
      treasuryAccountId: item.treasuryAccountId || this.bankAccounts[0]?.id || null, newDueDate: '', newAmount: item.amount, newNumber: item.number + '-R' };
  }

  private errorText(e: any) { const er = e?.error?.errors; return Array.isArray(er) && er.length ? er.join(' ') : e?.error?.message || 'Não foi possível gravar.'; }

  async save() {
    this.busy = true;
    try {
      const r = await firstValueFrom(this.http.post<any>(`${this.api}/instruments`, this.form));
      this.toaster.showSuccess('Gravado', `${this.isCheque ? 'Cheque' : 'Letra'} ${r.number} — ${r.statusLabel}.`);
      this.form = null;
      await this.load();
    } catch (e: any) { this.toaster.showError('Erro', this.errorText(e)); }
    this.busy = false; this.cdr.detectChanges();
  }

  async doAction() {
    this.busy = true;
    try {
      const r = await firstValueFrom(this.http.post<any>(`${this.api}/instruments/${this.action.item.id}/status`, this.action));
      this.toaster.showSuccess(r.instrument.statusLabel, r.replacement ? `Criada a letra ${r.replacement.number} com vencimento ${r.replacement.dueDate.split('-').reverse().join('/')}.` : `${r.instrument.number}: ${r.instrument.statusLabel.toLowerCase()}.`);
      this.action = null;
      await this.load();
    } catch (e: any) { this.toaster.showError('Erro', this.errorText(e)); }
    this.busy = false; this.cdr.detectChanges();
  }
}
