import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';

type StockMap = Record<string, { full?: number; empty?: number; damaged?: number }>;

@Component({
  selector: 'app-vehicle-reconciliation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full overflow-y-auto bg-gray-50">
      <div class="max-w-6xl mx-auto p-6 space-y-5">

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-gray-900">Reconciliação de Viaturas</h1>
            <p class="text-sm text-gray-500">Carga, retorno e conferência de vasilhame e dinheiro por viagem</p>
          </div>
          <button (click)="openNewTrip()"
                  class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Nova Viagem (Carga)
          </button>
        </div>

        <!-- Status filter -->
        <div class="flex gap-1.5 flex-wrap">
          <button *ngFor="let f of filters" (click)="activeFilter = f.value; load()"
                  class="px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors"
                  [ngClass]="activeFilter === f.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'">
            {{ f.label }}
          </button>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="flex items-center justify-center py-12 text-gray-400">
          <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          A carregar viagens...
        </div>

        <!-- Empty -->
        <div *ngIf="!loading && trips.length === 0" class="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <span class="material-symbols-outlined text-5xl text-gray-300 block mb-2">local_shipping</span>
          <p class="text-sm">Sem viagens {{ activeFilter ? 'neste estado' : '' }}.</p>
          <p class="text-xs mt-1">Clique em "Nova Viagem" para registar uma carga.</p>
        </div>

        <!-- Trip cards -->
        <div *ngIf="!loading" class="space-y-3">
          <div *ngFor="let t of trips" class="bg-white rounded-2xl border shadow-sm overflow-hidden"
               [ngClass]="t.reconciliation?.balanced ? 'border-green-200' : (t.status==='RETURNED' || t.status==='RECONCILED' ? 'border-amber-200' : 'border-gray-200')">

            <!-- Card header -->
            <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 cursor-pointer" (click)="toggle(t.id)">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <span class="material-symbols-outlined text-blue-600 text-[20px]">local_shipping</span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-gray-900 text-sm">{{ t.truckPlate }}</h3>
                    <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" [ngClass]="statusClass(t.status)">
                      {{ statusLabel(t.status) }}
                    </span>
                    <span *ngIf="t.reconciliation?.balanced" class="text-[10px] text-green-600 font-bold flex items-center gap-0.5">
                      <span class="material-symbols-outlined text-[13px]">verified</span> Conferida
                    </span>
                  </div>
                  <p class="text-[11px] text-gray-400">
                    Viagem #{{ t.tripNumber }} · {{ t.driverName || 'Motorista' }} · {{ t.salesCount }} venda(s)
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-black text-gray-900">{{ +t.expectedCash | number:'1.2-2' }} MZN</p>
                <p class="text-[10px] text-gray-400">esperado</p>
              </div>
            </div>

            <!-- Expanded detail -->
            <div *ngIf="expandedId === t.id" class="p-5 space-y-4">

              <!-- Cylinder reconciliation -->
              <div>
                <h4 class="text-xs font-bold text-gray-600 uppercase mb-2">Vasilhame</h4>
                <div class="overflow-x-auto border border-gray-100 rounded-xl">
                  <table class="w-full text-xs">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 py-2 text-left text-gray-500 font-semibold">Tipo</th>
                        <th class="px-3 py-2 text-right text-gray-500 font-semibold">Carregadas</th>
                        <th class="px-3 py-2 text-right text-gray-500 font-semibold">Vendidas</th>
                        <th class="px-3 py-2 text-right text-gray-500 font-semibold">Devolvidas (cheias)</th>
                        <th class="px-3 py-2 text-right text-gray-500 font-semibold">Vazias recebidas</th>
                        <th class="px-3 py-2 text-right text-gray-500 font-semibold">Vazias em falta</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let c of t.reconciliation?.cylinders" class="border-t border-gray-100">
                        <td class="px-3 py-1.5 font-bold text-gray-800">{{ c.type }}</td>
                        <td class="px-3 py-1.5 text-right font-mono">{{ c.loadedFull }}</td>
                        <td class="px-3 py-1.5 text-right font-mono text-blue-700">{{ c.soldFull }}</td>
                        <td class="px-3 py-1.5 text-right font-mono">{{ c.returnedFull }}</td>
                        <td class="px-3 py-1.5 text-right font-mono">{{ c.returnedEmpty }}</td>
                        <td class="px-3 py-1.5 text-right font-mono font-bold" [ngClass]="c.emptyGap === 0 ? 'text-green-600' : 'text-red-600'">
                          {{ c.emptyGap }}
                        </td>
                      </tr>
                      <tr *ngIf="!t.reconciliation?.cylinders?.length">
                        <td colspan="6" class="px-3 py-3 text-center text-gray-400 italic">Aguarda registo de retorno.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Cash reconciliation -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p class="text-[10px] text-gray-400 uppercase font-bold">Esperado (vendas)</p>
                  <p class="text-base font-black text-gray-800">{{ t.reconciliation?.cash?.expected | number:'1.2-2' }}</p>
                </div>
                <div class="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p class="text-[10px] text-gray-400 uppercase font-bold">Declarado</p>
                  <p class="text-base font-black text-gray-800">{{ t.reconciliation?.cash?.declared | number:'1.2-2' }}</p>
                </div>
                <div class="p-3 rounded-xl border" [ngClass]="(t.reconciliation?.cash?.cashDifference || 0) === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'">
                  <p class="text-[10px] uppercase font-bold" [ngClass]="(t.reconciliation?.cash?.cashDifference || 0) === 0 ? 'text-green-500' : 'text-red-500'">Diferença</p>
                  <p class="text-base font-black" [ngClass]="(t.reconciliation?.cash?.cashDifference || 0) === 0 ? 'text-green-700' : 'text-red-700'">
                    {{ t.reconciliation?.cash?.cashDifference | number:'1.2-2' }}
                  </p>
                </div>
                <div class="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p class="text-[10px] text-blue-400 uppercase font-bold">Depositado</p>
                  <p class="text-base font-black text-blue-700">{{ t.reconciliation?.cash?.deposited | number:'1.2-2' }}</p>
                </div>
              </div>

              <!-- Actions by status -->
              <div class="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button *ngIf="t.status === 'OUT'" (click)="openReturn(t)"
                        class="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors">
                  <span class="material-symbols-outlined text-[16px]">assignment_return</span>
                  Registar Retorno
                </button>
                <button *ngIf="t.status === 'RETURNED'" (click)="openCash(t)"
                        class="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors">
                  <span class="material-symbols-outlined text-[16px]">payments</span>
                  Conferir Dinheiro
                </button>
                <button *ngIf="t.status === 'RECONCILED' || t.status === 'DEPOSITED'" (click)="openDeposit(t)"
                        class="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                  <span class="material-symbols-outlined text-[16px]">account_balance</span>
                  Registar Depósito
                </button>
                <span *ngIf="t.notes" class="text-[11px] text-gray-400 italic self-center">Nota: {{ t.notes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== MODAL: NEW TRIP (LOAD) ===== -->
    <div *ngIf="modal === 'OPEN'" class="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" (click)="modal = null">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-bold text-gray-900">Nova Viagem — Carga da Viatura</h3>
          <p class="text-xs text-gray-400">O fiel regista os cilindros que saem na viatura</p>
        </div>
        <div class="p-5 space-y-3 overflow-y-auto">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Matrícula *</label>
              <input [(ngModel)]="form.truckPlate" placeholder="AAA-000-MC" class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Motorista</label>
              <input [(ngModel)]="form.driverName" placeholder="Nome" class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-semibold text-gray-600">Cilindros carregados (cheias)</label>
              <button (click)="addTypeRow()" class="text-xs text-blue-600 hover:underline">+ tipo</button>
            </div>
            <div *ngFor="let row of typeRows; let i = index" class="flex gap-2 mb-1.5">
              <input [(ngModel)]="row.type" placeholder="9KG" class="w-24 h-8 px-2 border border-gray-300 rounded-lg text-sm font-mono">
              <input type="number" [(ngModel)]="row.full" min="0" placeholder="qtd" class="flex-1 h-8 px-2 border border-gray-300 rounded-lg text-sm text-right">
              <button (click)="typeRows.splice(i,1)" class="text-gray-300 hover:text-red-500"><span class="material-symbols-outlined text-[18px]">close</span></button>
            </div>
          </div>
          <textarea [(ngModel)]="form.notes" rows="2" placeholder="Notas (opcional)" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
        </div>
        <div class="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button (click)="modal = null" class="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Cancelar</button>
          <button (click)="submitOpen()" [disabled]="saving" class="flex-1 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-300">
            {{ saving ? 'A guardar...' : 'Abrir Viagem' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== MODAL: RETURN ===== -->
    <div *ngIf="modal === 'RETURN'" class="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" (click)="modal = null">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-bold text-gray-900">Registar Retorno — {{ current?.truckPlate }}</h3>
          <p class="text-xs text-gray-400">O fiel confere o que voltou na viatura</p>
        </div>
        <div class="p-5 space-y-3 overflow-y-auto">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead><tr class="text-gray-500">
                <th class="text-left py-1">Tipo</th><th class="py-1">Cheias</th><th class="py-1">Vazias</th><th class="py-1">Avariadas</th>
              </tr></thead>
              <tbody>
                <tr *ngFor="let row of typeRows" class="border-t border-gray-100">
                  <td class="py-1.5 font-bold font-mono">{{ row.type }}</td>
                  <td class="py-1"><input type="number" [(ngModel)]="row.full" min="0" class="w-16 h-8 px-2 border border-gray-300 rounded text-right text-sm"></td>
                  <td class="py-1"><input type="number" [(ngModel)]="row.empty" min="0" class="w-16 h-8 px-2 border border-gray-300 rounded text-right text-sm"></td>
                  <td class="py-1"><input type="number" [(ngModel)]="row.damaged" min="0" class="w-16 h-8 px-2 border border-gray-300 rounded text-right text-sm"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Dinheiro declarado pelo motorista (MZN)</label>
            <input type="number" [(ngModel)]="form.declaredCash" min="0" class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500">
            <p class="text-[11px] text-gray-400 mt-1">Esperado pelas vendas: <strong>{{ +(current?.expectedCash||0) | number:'1.2-2' }} MZN</strong></p>
          </div>
        </div>
        <div class="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button (click)="modal = null" class="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Cancelar</button>
          <button (click)="submitReturn()" [disabled]="saving" class="flex-1 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:bg-amber-300">
            {{ saving ? 'A guardar...' : 'Confirmar Retorno' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== MODAL: CASH ===== -->
    <div *ngIf="modal === 'CASH'" class="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" (click)="modal = null">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm" (click)="$event.stopPropagation()">
        <div class="px-5 py-4 border-b border-gray-100"><h3 class="font-bold text-gray-900">Conferir Dinheiro</h3></div>
        <div class="p-5 space-y-3">
          <p class="text-xs text-gray-500">Esperado: <strong>{{ +(current?.expectedCash||0) | number:'1.2-2' }} MZN</strong></p>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Dinheiro recebido (MZN)</label>
          <input type="number" [(ngModel)]="form.declaredCash" min="0" class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button (click)="modal = null" class="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg font-medium">Cancelar</button>
          <button (click)="submitCash()" [disabled]="saving" class="flex-1 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:bg-green-300">Confirmar</button>
        </div>
      </div>
    </div>

    <!-- ===== MODAL: DEPOSIT ===== -->
    <div *ngIf="modal === 'DEPOSIT'" class="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" (click)="modal = null">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm" (click)="$event.stopPropagation()">
        <div class="px-5 py-4 border-b border-gray-100"><h3 class="font-bold text-gray-900">Registar Depósito Bancário</h3></div>
        <div class="p-5 space-y-3">
          <p class="text-xs text-gray-500">Pendente: <strong>{{ +(current?.reconciliation?.cash?.pendingDeposit||0) | number:'1.2-2' }} MZN</strong></p>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Valor depositado (MZN)</label>
          <input type="number" [(ngModel)]="form.depositAmount" min="0" class="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button (click)="modal = null" class="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg font-medium">Cancelar</button>
          <button (click)="submitDeposit()" [disabled]="saving" class="flex-1 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-300">Confirmar</button>
        </div>
      </div>
    </div>
  `
})
export class VehicleReconciliationComponent implements OnInit {
  trips: any[] = [];
  loading = true;
  saving = false;
  expandedId: string | null = null;
  activeFilter = '';
  modal: 'OPEN' | 'RETURN' | 'CASH' | 'DEPOSIT' | null = null;
  current: any = null;

  typeRows: Array<{ type: string; full: number; empty: number; damaged: number }> = [];
  form: any = {};

  filters = [
    { label: 'Todas', value: '' },
    { label: 'Em Rota', value: 'OUT' },
    { label: 'Retornadas', value: 'RETURNED' },
    { label: 'Conferidas', value: 'RECONCILED' },
    { label: 'Depositadas', value: 'DEPOSITED' },
  ];

  constructor(
    private dataService: DataService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.dataService.getTrips(this.activeFilter || undefined).subscribe({
      next: (trips) => { this.trips = trips || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.trips = []; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  toggle(id: string) { this.expandedId = this.expandedId === id ? null : id; }

  statusLabel(s: string): string {
    return { OUT: 'Em Rota', RETURNED: 'Retornada', RECONCILED: 'Conferida', DEPOSITED: 'Depositada', LOADED: 'Carregada' }[s] || s;
  }
  statusClass(s: string): string {
    return {
      OUT: 'bg-blue-100 text-blue-700',
      RETURNED: 'bg-amber-100 text-amber-700',
      RECONCILED: 'bg-green-100 text-green-700',
      DEPOSITED: 'bg-purple-100 text-purple-700',
      LOADED: 'bg-gray-100 text-gray-600',
    }[s] || 'bg-gray-100 text-gray-600';
  }

  // ── New trip ──
  openNewTrip() {
    this.form = { truckPlate: '', driverName: '', notes: '' };
    this.typeRows = [
      { type: '9KG', full: 0, empty: 0, damaged: 0 },
      { type: '14KG', full: 0, empty: 0, damaged: 0 },
    ];
    this.modal = 'OPEN';
  }
  addTypeRow() { this.typeRows.push({ type: '', full: 0, empty: 0, damaged: 0 }); }

  private buildSnapshot(): StockMap {
    const snap: StockMap = {};
    for (const r of this.typeRows) {
      if (!r.type?.trim()) continue;
      snap[r.type.trim().toUpperCase()] = {
        full: Number(r.full) || 0,
        empty: Number(r.empty) || 0,
        damaged: Number(r.damaged) || 0,
      };
    }
    return snap;
  }

  submitOpen() {
    if (!this.form.truckPlate?.trim()) { this.toaster.showWarning('Campo Obrigatório', 'Indique a matrícula.'); return; }
    this.saving = true;
    this.dataService.openTrip({
      truckPlate: this.form.truckPlate.trim().toUpperCase(),
      driverName: this.form.driverName,
      loadedOut: this.buildSnapshot(),
      notes: this.form.notes,
    }).subscribe({
      next: () => { this.saving = false; this.modal = null; this.toaster.showSuccess('Viagem Aberta', 'Carga registada e viatura abastecida.'); this.load(); },
      error: (e) => { this.saving = false; this.toaster.showError('Erro', e.error?.message || 'Falha ao abrir viagem.'); this.cdr.markForCheck(); },
    });
  }

  // ── Return ──
  openReturn(t: any) {
    this.current = t;
    const loaded = t.loadedOut || {};
    this.typeRows = Object.keys(loaded).map(type => ({ type, full: 0, empty: 0, damaged: 0 }));
    if (this.typeRows.length === 0) this.typeRows = [{ type: '9KG', full: 0, empty: 0, damaged: 0 }];
    this.form = { declaredCash: t.expectedCash || 0 };
    this.modal = 'RETURN';
  }
  submitReturn() {
    this.saving = true;
    this.dataService.returnTrip(this.current.id, {
      returnedStock: this.buildSnapshot(),
      declaredCash: Number(this.form.declaredCash) || 0,
    }).subscribe({
      next: (res) => {
        this.saving = false; this.modal = null;
        const bal = res?.reconciliation?.balanced;
        if (bal) this.toaster.showSuccess('Retorno Conferido', 'Vasilhame e dinheiro batem certo.');
        else this.toaster.showWarning('Retorno com Diferenças', 'Verifique vasilhame/dinheiro em falta.');
        this.load();
      },
      error: (e) => { this.saving = false; this.toaster.showError('Erro', e.error?.message || 'Falha ao registar retorno.'); this.cdr.markForCheck(); },
    });
  }

  // ── Cash ──
  openCash(t: any) { this.current = t; this.form = { declaredCash: t.reconciliation?.cash?.declared || t.expectedCash || 0 }; this.modal = 'CASH'; }
  submitCash() {
    this.saving = true;
    this.dataService.reconcileTripCash(this.current.id, { declaredCash: Number(this.form.declaredCash) || 0 }).subscribe({
      next: () => { this.saving = false; this.modal = null; this.toaster.showSuccess('Caixa Conferido', 'Dinheiro confirmado.'); this.load(); },
      error: (e) => { this.saving = false; this.toaster.showError('Erro', e.error?.message || 'Falha.'); this.cdr.markForCheck(); },
    });
  }

  // ── Deposit ──
  openDeposit(t: any) { this.current = t; this.form = { depositAmount: t.reconciliation?.cash?.pendingDeposit || 0 }; this.modal = 'DEPOSIT'; }
  submitDeposit() {
    this.saving = true;
    this.dataService.depositTrip(this.current.id, Number(this.form.depositAmount) || 0).subscribe({
      next: () => { this.saving = false; this.modal = null; this.toaster.showSuccess('Depósito Registado', 'Depósito bancário registado.'); this.load(); },
      error: (e) => { this.saving = false; this.toaster.showError('Erro', e.error?.message || 'Falha.'); this.cdr.markForCheck(); },
    });
  }
}
