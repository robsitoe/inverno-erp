import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Calculadoras financeiras: empréstimos, juros, desconto de letras, IVA, taxas e câmbio. */
@Component({
  selector: 'app-financial-calculators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 class="text-lg font-bold text-gray-800">Calculadoras Financeiras</h1>
        <p class="text-xs text-gray-500">Simulações rápidas. Os cálculos são feitos no momento e nada é gravado.</p>
      </div>
      <div class="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit text-xs font-bold">
        <button *ngFor="let t of tabs" (click)="tab = t.key" class="px-3 py-1.5 rounded flex items-center gap-1"
                [ngClass]="tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'">
          <span class="material-symbols-outlined text-[16px]">{{ t.icon }}</span>{{ t.label }}</button>
      </div>

      <!-- EMPRÉSTIMO -->
      <div *ngIf="tab === 'loan'" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="bg-white border border-gray-200 rounded-lg p-4 space-y-3 text-xs">
          <div class="font-bold text-gray-800 text-sm">Plano de um empréstimo</div>
          <label class="block"><span class="font-semibold text-gray-600">Capital (MT)</span><input type="number" [(ngModel)]="loan.capital" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Taxa de juro anual (%)</span><input type="number" step="0.01" [(ngModel)]="loan.rate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Prazo (meses)</span><input type="number" [(ngModel)]="loan.months" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Carência de capital (meses, só juros)</span><input type="number" [(ngModel)]="loan.grace" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Sistema</span>
            <select [(ngModel)]="loan.system" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
              <option value="FRENCH">Prestação constante (francês)</option><option value="CONSTANT">Amortização constante</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Comissões e encargos iniciais (MT)</span><input type="number" [(ngModel)]="loan.fees" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Primeira prestação em</span><input type="date" [(ngModel)]="loan.start" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <div *ngIf="loanPlan.rows.length" class="bg-blue-50 border border-blue-100 rounded p-2 space-y-1">
            <div class="flex justify-between"><span>{{ loan.system === 'FRENCH' ? 'Prestação mensal' : '1.ª prestação' }}</span><b class="font-mono">{{ loanPlan.firstPayment | number:'1.2-2' }}</b></div>
            <div class="flex justify-between"><span>Total de juros</span><b class="font-mono">{{ loanPlan.interest | number:'1.2-2' }}</b></div>
            <div class="flex justify-between"><span>Total pago (com encargos)</span><b class="font-mono">{{ loanPlan.total + (+loan.fees || 0) | number:'1.2-2' }}</b></div>
            <div class="flex justify-between" title="Taxa anual efetiva global: inclui os encargos iniciais"><span>TAEG aproximada</span><b class="font-mono">{{ loanPlan.taeg | number:'1.2-2' }}%</b></div>
          </div>
        </div>
        <div class="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div class="px-3 py-2 border-b border-gray-200 flex justify-between items-center text-xs"><b class="text-gray-700">Quadro de amortização</b>
            <button (click)="exportLoan()" [disabled]="!loanPlan.rows.length" class="px-2 py-1 font-bold rounded border border-gray-300">Exportar CSV</button></div>
          <div class="max-h-[560px] overflow-y-auto">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 text-gray-600 sticky top-0"><tr><th class="px-2 py-1.5 text-left">N.º</th><th class="px-2 py-1.5 text-left">Data</th><th class="px-2 py-1.5 text-right">Prestação</th>
                <th class="px-2 py-1.5 text-right">Juros</th><th class="px-2 py-1.5 text-right">Amortização</th><th class="px-2 py-1.5 text-right">Capital em dívida</th></tr></thead>
              <tbody class="divide-y divide-gray-100 font-mono">
                <tr *ngFor="let r of loanPlan.rows" [class.bg-amber-50]="r.grace"><td class="px-2 py-1">{{ r.n }}</td><td class="px-2 py-1">{{ r.date | date:'dd/MM/yyyy' }}</td>
                  <td class="px-2 py-1 text-right">{{ r.payment | number:'1.2-2' }}</td><td class="px-2 py-1 text-right">{{ r.interest | number:'1.2-2' }}</td>
                  <td class="px-2 py-1 text-right">{{ r.principal | number:'1.2-2' }}</td><td class="px-2 py-1 text-right">{{ r.balance | number:'1.2-2' }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- JUROS -->
      <div *ngIf="tab === 'interest'" class="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-3xl">
        <div class="space-y-3">
          <div class="font-bold text-gray-800 text-sm">Juros de uma aplicação ou dívida</div>
          <label class="block"><span class="font-semibold text-gray-600">Capital (MT)</span><input type="number" [(ngModel)]="int.capital" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Taxa anual (%)</span><input type="number" step="0.01" [(ngModel)]="int.rate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="font-semibold text-gray-600">Prazo</span><input type="number" [(ngModel)]="int.term" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
            <label class="block"><span class="font-semibold text-gray-600">em</span><select [(ngModel)]="int.unit" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white"><option value="DAYS">dias</option><option value="MONTHS">meses</option><option value="YEARS">anos</option></select></label>
          </div>
          <label class="block"><span class="font-semibold text-gray-600">Regime</span><select [(ngModel)]="int.mode" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option value="SIMPLE">Juro simples</option><option value="MONTHLY">Composto, capitalização mensal</option><option value="ANNUAL">Composto, capitalização anual</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Retenção sobre os juros (%)</span><input type="number" step="0.01" [(ngModel)]="int.tax" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded p-3 space-y-2 self-start">
          <div class="flex justify-between"><span>Juro bruto</span><b class="font-mono">{{ interestRes.gross | number:'1.2-2' }}</b></div>
          <div class="flex justify-between"><span>Retenção</span><b class="font-mono">−{{ interestRes.tax | number:'1.2-2' }}</b></div>
          <div class="flex justify-between"><span>Juro líquido</span><b class="font-mono">{{ interestRes.net | number:'1.2-2' }}</b></div>
          <div class="flex justify-between border-t border-blue-200 pt-2 text-sm"><span>Montante final</span><b class="font-mono">{{ interestRes.final | number:'1.2-2' }}</b></div>
          <div class="text-[10px] text-gray-500">Base de cálculo: ano de 365 dias.</div>
        </div>
      </div>

      <!-- DESCONTO DE LETRA -->
      <div *ngIf="tab === 'discount'" class="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-3xl">
        <div class="space-y-3">
          <div class="font-bold text-gray-800 text-sm">Desconto bancário de uma letra</div>
          <label class="block"><span class="font-semibold text-gray-600">Valor nominal da letra (MT)</span><input type="number" [(ngModel)]="disc.nominal" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="font-semibold text-gray-600">Data do desconto</span><input type="date" [(ngModel)]="disc.date" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
            <label class="block"><span class="font-semibold text-gray-600">Vencimento</span><input type="date" [(ngModel)]="disc.due" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          </div>
          <label class="block"><span class="font-semibold text-gray-600">Taxa de desconto anual (%)</span><input type="number" step="0.01" [(ngModel)]="disc.rate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="font-semibold text-gray-600">Comissão de cobrança (MT)</span><input type="number" [(ngModel)]="disc.fee" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
            <label class="block"><span class="font-semibold text-gray-600">Imposto de selo s/ juro (%)</span><input type="number" step="0.01" [(ngModel)]="disc.stamp" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          </div>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded p-3 space-y-2 self-start">
          <div class="flex justify-between"><span>Dias até ao vencimento</span><b class="font-mono">{{ discRes.days }}</b></div>
          <div class="flex justify-between"><span>Juro de desconto</span><b class="font-mono">−{{ discRes.interest | number:'1.2-2' }}</b></div>
          <div class="flex justify-between"><span>Imposto de selo</span><b class="font-mono">−{{ discRes.stamp | number:'1.2-2' }}</b></div>
          <div class="flex justify-between"><span>Comissão</span><b class="font-mono">−{{ (+disc.fee || 0) | number:'1.2-2' }}</b></div>
          <div class="flex justify-between border-t border-blue-200 pt-2 text-sm"><span>Valor líquido recebido</span><b class="font-mono">{{ discRes.net | number:'1.2-2' }}</b></div>
          <div class="flex justify-between"><span>Custo efetivo anual</span><b class="font-mono">{{ discRes.effective | number:'1.2-2' }}%</b></div>
        </div>
      </div>

      <!-- IVA -->
      <div *ngIf="tab === 'vat'" class="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-3xl">
        <div class="space-y-3">
          <div class="font-bold text-gray-800 text-sm">Calcular o IVA</div>
          <label class="block"><span class="font-semibold text-gray-600">Valor (MT)</span><input type="number" [(ngModel)]="vat.amount" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">O valor indicado é</span><select [(ngModel)]="vat.mode" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option value="NET">sem IVA (acrescentar o IVA)</option><option value="GROSS">com IVA (retirar o IVA)</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Taxa de IVA (%)</span>
            <input type="number" step="0.01" [(ngModel)]="vat.rate" list="vat-rates" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <datalist id="vat-rates"><option value="16"></option><option value="5"></option><option value="0"></option></datalist>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded p-3 space-y-2 self-start">
          <div class="flex justify-between"><span>Base tributável</span><b class="font-mono">{{ vatRes.base | number:'1.2-2' }}</b></div>
          <div class="flex justify-between"><span>IVA ({{ vat.rate }}%)</span><b class="font-mono">{{ vatRes.vat | number:'1.2-2' }}</b></div>
          <div class="flex justify-between border-t border-blue-200 pt-2 text-sm"><span>Total com IVA</span><b class="font-mono">{{ vatRes.total | number:'1.2-2' }}</b></div>
        </div>
      </div>

      <!-- TAXAS -->
      <div *ngIf="tab === 'rates'" class="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-3xl">
        <div class="space-y-3">
          <div class="font-bold text-gray-800 text-sm">Converter taxas de juro</div>
          <label class="block"><span class="font-semibold text-gray-600">Taxa (%)</span><input type="number" step="0.0001" [(ngModel)]="rates.value" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">A taxa indicada é</span><select [(ngModel)]="rates.from" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option value="NOMINAL">nominal anual (capitalização mensal)</option><option value="EFFECTIVE">efetiva anual</option><option value="MONTHLY">mensal</option></select></label>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded p-3 space-y-2 self-start">
          <div class="flex justify-between"><span>Taxa mensal</span><b class="font-mono">{{ ratesRes.monthly | number:'1.4-4' }}%</b></div>
          <div class="flex justify-between"><span>Taxa nominal anual</span><b class="font-mono">{{ ratesRes.nominal | number:'1.4-4' }}%</b></div>
          <div class="flex justify-between"><span>Taxa efetiva anual</span><b class="font-mono">{{ ratesRes.effective | number:'1.4-4' }}%</b></div>
          <div class="flex justify-between"><span>Taxa diária (365)</span><b class="font-mono">{{ ratesRes.daily | number:'1.6-6' }}%</b></div>
        </div>
      </div>

      <!-- CÂMBIO -->
      <div *ngIf="tab === 'fx'" class="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-3xl">
        <div class="space-y-3">
          <div class="font-bold text-gray-800 text-sm">Conversão cambial</div>
          <label class="block"><span class="font-semibold text-gray-600">Valor</span><input type="number" [(ngModel)]="fx.amount" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="font-semibold text-gray-600">Moeda</span><input [(ngModel)]="fx.currency" list="fx-cur" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 uppercase"></label>
            <label class="block"><span class="font-semibold text-gray-600">Câmbio (MT por 1 {{ fx.currency }})</span><input type="number" step="0.0001" [(ngModel)]="fx.rate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          </div>
          <label class="block"><span class="font-semibold text-gray-600">Sentido</span><select [(ngModel)]="fx.dir" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option value="TO_MZN">{{ fx.currency }} → MZN</option><option value="FROM_MZN">MZN → {{ fx.currency }}</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Comissão bancária (%)</span><input type="number" step="0.01" [(ngModel)]="fx.fee" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <datalist id="fx-cur"><option value="USD"></option><option value="ZAR"></option><option value="EUR"></option><option value="GBP"></option><option value="CNY"></option></datalist>
          <p class="text-[10px] text-gray-500">Indique o câmbio do dia do seu banco ou do Banco de Moçambique.</p>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded p-3 space-y-2 self-start">
          <div class="flex justify-between"><span>Valor convertido</span><b class="font-mono">{{ fxRes.converted | number:'1.2-2' }} {{ fx.dir === 'TO_MZN' ? 'MZN' : fx.currency }}</b></div>
          <div class="flex justify-between"><span>Comissão</span><b class="font-mono">−{{ fxRes.fee | number:'1.2-2' }}</b></div>
          <div class="flex justify-between border-t border-blue-200 pt-2 text-sm"><span>Líquido</span><b class="font-mono">{{ fxRes.net | number:'1.2-2' }} {{ fx.dir === 'TO_MZN' ? 'MZN' : fx.currency }}</b></div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class FinancialCalculatorsComponent {
  tabs = [
    { key: 'loan', label: 'Empréstimo', icon: 'request_quote' }, { key: 'interest', label: 'Juros', icon: 'percent' },
    { key: 'discount', label: 'Desconto de letra', icon: 'description' }, { key: 'vat', label: 'IVA', icon: 'receipt_long' },
    { key: 'rates', label: 'Taxas', icon: 'swap_vert' }, { key: 'fx', label: 'Câmbio', icon: 'currency_exchange' },
  ];
  tab = 'loan';

  loan = { capital: 1000000, rate: 18, months: 24, grace: 0, system: 'FRENCH', fees: 0, start: iso(new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())) };
  int = { capital: 100000, rate: 10, term: 12, unit: 'MONTHS', mode: 'SIMPLE', tax: 20 };
  disc = { nominal: 100000, date: iso(new Date()), due: iso(new Date(Date.now() + 90 * 86400000)), rate: 20, fee: 0, stamp: 4 };
  vat = { amount: 1000, mode: 'NET', rate: 16 };
  rates = { value: 18, from: 'NOMINAL' };
  fx = { amount: 1000, currency: 'USD', rate: 63.9, dir: 'TO_MZN', fee: 0 };

  get loanPlan() {
    const P = Number(this.loan.capital) || 0, n = Math.max(0, Math.round(Number(this.loan.months) || 0)), g = Math.min(Math.max(0, Math.round(Number(this.loan.grace) || 0)), n);
    const i = (Number(this.loan.rate) || 0) / 100 / 12;
    const rows: any[] = [];
    if (!(P > 0) || !n) return { rows, firstPayment: 0, interest: 0, total: 0, taeg: 0 };
    const [y, m, d] = (this.loan.start || iso(new Date())).split('-').map(Number);
    let balance = P;
    const amortN = n - g;
    const french = amortN > 0 ? (i ? balance * i / (1 - Math.pow(1 + i, -amortN)) : balance / amortN) : 0;
    for (let k = 1; k <= n; k++) {
      const interest = balance * i;
      const grace = k <= g;
      let principal = grace ? 0 : this.loan.system === 'FRENCH' ? french - interest : P / amortN;
      if (k === n) principal = balance;
      balance = balance - principal;
      rows.push({ n: k, date: iso(new Date(y, m - 1 + k - 1, d)), payment: r2(principal + interest), interest: r2(interest), principal: r2(principal), balance: r2(Math.max(0, balance)), grace });
    }
    const interest = r2(rows.reduce((s, r) => s + r.interest, 0));
    const total = r2(rows.reduce((s, r) => s + r.payment, 0));
    // TAEG: taxa mensal que iguala o capital líquido (capital − encargos) às prestações (bisseção)
    const netCap = P - (Number(this.loan.fees) || 0);
    let lo = 0, hi = 1;
    for (let it = 0; it < 100; it++) {
      const mid = (lo + hi) / 2;
      const pv = rows.reduce((s, r) => s + r.payment / Math.pow(1 + mid, r.n), 0);
      if (pv > netCap) lo = mid; else hi = mid;
    }
    return { rows, firstPayment: rows[g]?.payment ?? rows[0].payment, interest, total, taeg: r2((Math.pow(1 + lo, 12) - 1) * 100) };
  }

  get interestRes() {
    const C = Number(this.int.capital) || 0, rate = (Number(this.int.rate) || 0) / 100, t = Number(this.int.term) || 0;
    const years = this.int.unit === 'DAYS' ? t / 365 : this.int.unit === 'MONTHS' ? t / 12 : t;
    let gross = 0;
    if (this.int.mode === 'SIMPLE') gross = C * rate * years;
    else if (this.int.mode === 'MONTHLY') gross = C * (Math.pow(1 + rate / 12, years * 12) - 1);
    else gross = C * (Math.pow(1 + rate, years) - 1);
    const tax = gross * (Number(this.int.tax) || 0) / 100;
    return { gross: r2(gross), tax: r2(tax), net: r2(gross - tax), final: r2(C + gross - tax) };
  }

  get discRes() {
    const N = Number(this.disc.nominal) || 0;
    const days = Math.max(0, Math.round((new Date(this.disc.due + 'T12:00:00').getTime() - new Date(this.disc.date + 'T12:00:00').getTime()) / 86400000));
    const interest = N * (Number(this.disc.rate) || 0) / 100 * days / 365;
    const stamp = interest * (Number(this.disc.stamp) || 0) / 100;
    const net = N - interest - stamp - (Number(this.disc.fee) || 0);
    const effective = days && net > 0 ? (Math.pow(N / net, 365 / days) - 1) * 100 : 0;
    return { days, interest: r2(interest), stamp: r2(stamp), net: r2(net), effective: r2(effective) };
  }

  get vatRes() {
    const v = Number(this.vat.amount) || 0, rate = (Number(this.vat.rate) || 0) / 100;
    const base = this.vat.mode === 'NET' ? v : v / (1 + rate);
    return { base: r2(base), vat: r2(base * rate), total: r2(base * (1 + rate)) };
  }

  get ratesRes() {
    const v = (Number(this.rates.value) || 0) / 100;
    const monthly = this.rates.from === 'MONTHLY' ? v : this.rates.from === 'NOMINAL' ? v / 12 : Math.pow(1 + v, 1 / 12) - 1;
    const effective = Math.pow(1 + monthly, 12) - 1;
    return { monthly: monthly * 100, nominal: monthly * 12 * 100, effective: effective * 100, daily: (Math.pow(1 + effective, 1 / 365) - 1) * 100 };
  }

  get fxRes() {
    const a = Number(this.fx.amount) || 0, rate = Number(this.fx.rate) || 0;
    const converted = this.fx.dir === 'TO_MZN' ? a * rate : rate ? a / rate : 0;
    const fee = converted * (Number(this.fx.fee) || 0) / 100;
    return { converted: r2(converted), fee: r2(fee), net: r2(converted - fee) };
  }

  exportLoan() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['N.º', 'Data', 'Prestação', 'Juros', 'Amortização', 'Capital em dívida'], ...this.loanPlan.rows.map(r => [r.n, r.date, r.payment, r.interest, r.principal, r.balance])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'plano-emprestimo.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
