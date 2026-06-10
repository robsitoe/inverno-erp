import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AccountingService } from '../../shared/accounting.service';
import { Account, FinancialReportConfig, FinancialReportSection, FinancialReportLine } from '../../shared/models';

interface ReportLineData {
  line: FinancialReportLine;
  balance: number;
}

interface ReportSectionData {
  section: FinancialReportSection;
  lines: ReportLineData[];
  total: number;
}

@Component({
  selector: 'app-financial-statements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-[#f8fafc]">
      <!-- Header -->
      <div class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 no-print">
        <div>
          <h1 class="text-xl font-bold text-slate-800">Demonstrações Financeiras</h1>
          <p class="text-xs text-slate-500 mt-0.5">Mapa oficial de acordo com o PGC-NIR Moçambique</p>
        </div>
        
        <div class="flex items-center gap-4">
            <div class="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button 
                    (click)="switchTab('BALANCE_SHEET')"
                    [class]="'px-4 py-1.5 text-xs font-bold rounded-md transition-all ' + (activeTab === 'BALANCE_SHEET' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800')"
                >
                    Balanço
                </button>
                <button 
                    (click)="switchTab('INCOME_STATEMENT')"
                    [class]="'px-4 py-1.5 text-xs font-bold rounded-md transition-all ' + (activeTab === 'INCOME_STATEMENT' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800')"
                >
                    Dem. de Resultados
                </button>
            </div>

            <div class="h-6 w-[1px] bg-slate-200 mx-1"></div>

            <button (click)="printReport()" class="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg shadow-slate-200">
                <span class="material-symbols-outlined text-sm">print</span>
                Imprimir
            </button>
            
            <button (click)="loadData()" class="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500">
                <span class="material-symbols-outlined">refresh</span>
            </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-auto p-4 md:p-8">
        
        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex flex-col items-center justify-center h-64 text-slate-400">
            <span class="material-symbols-outlined animate-spin text-4xl mb-2">sync</span>
            <p class="text-sm font-medium">A processar dados...</p>
        </div>

        <!-- View Mode (Official Standard) -->
        <div *ngIf="!isLoading" class="max-w-4xl mx-auto mb-10">
            
            <!-- Report Card -->
            <div class="bg-white rounded-2xl shadow-xl shadow-slate-200 overflow-hidden border border-slate-100 print:shadow-none print:border-none">
                
                <!-- Report Header -->
                <div class="bg-slate-50 px-8 py-10 border-b border-slate-100 text-center relative overflow-hidden print:bg-white">
                    <div class="absolute top-0 left-0 w-full h-[3px] bg-indigo-600"></div>
                    <h3 class="text-2xl font-black text-slate-800 tracking-tight uppercase">{{ activeTab === 'BALANCE_SHEET' ? 'Balanço Geral' : 'Demonstração de Resultados' }}</h3>
                    <p class="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">PGC-NIR • Moçambique</p>
                    <div class="mt-4 inline-flex items-center gap-6 px-4 py-2 bg-white/80 rounded-full border border-slate-200 shadow-sm text-[11px] font-bold text-slate-600 print:bg-white">
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm opacity-50">calendar_today</span>
                            Período: {{ periodStart | date:'dd/MM/yyyy' }} - {{ currentDate | date:'dd/MM/yyyy' }}
                        </div>
                        <div class="flex items-center gap-1.5 font-mono">
                            MT
                        </div>
                    </div>
                </div>
          
                <!-- Report Body -->
                <div class="px-8 py-10">
                    
                    <!-- BALANÇO -->
                    <div *ngIf="activeTab === 'BALANCE_SHEET' && balanceSheet" class="animate-fade-in">
                        
                        <!-- ATIVO -->
                        <div class="mb-12">
                            <div class="flex items-center gap-3 mb-6">
                                <span class="h-8 w-1 bg-indigo-600 rounded-full"></span>
                                <h4 class="text-lg font-black text-slate-800 uppercase tracking-tight">Ativo</h4>
                            </div>
                            <div class="space-y-4">
                                <div *ngFor="let line of balanceSheet.assets?.lines" [class]="'group transition-all ' + (line.isTotal ? 'mt-4 border-t border-slate-200 pt-4' : '')">
                                    <div class="flex justify-between items-baseline py-1">
                                        <span [class]="'text-slate-700 transition-colors ' + (line.level === 1 ? 'font-black text-sm uppercase' : (line.level === 2 ? 'font-bold text-sm pl-4' : 'text-xs pl-8 text-slate-500'))">
                                            {{ line.code }} {{ line.name }}
                                        </span>
                                        <div class="flex items-center gap-4">
                                            <span [class]="'font-mono transition-all ' + (line.isTotal ? 'text-sm font-black ' : 'text-xs ') + ((+line.balance || 0) < 0 ? 'text-rose-600' : (line.isTotal ? 'text-slate-900' : 'text-slate-600'))">
                                                {{ (+line.balance || 0) | number:'1.2-2' }}
                                            </span>
                                        </div>
                                    </div>
                                    <div *ngIf="!line.isTotal" class="h-[1px] w-full bg-slate-50 group-hover:bg-slate-100 transition-all"></div>
                                </div>
                                <div class="mt-8 p-6 bg-slate-900 text-white rounded-xl flex justify-between items-center shadow-lg shadow-slate-200 print:bg-slate-100 print:text-black print:shadow-none">
                                    <span class="text-sm font-black uppercase tracking-widest text-slate-400 print:text-slate-600">Total do Ativo</span>
                                    <span class="text-xl font-mono font-black">{{ (+balanceSheet.assets?.total || 0) | number:'1.2-2' }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- CAPITAIS PRÓPRIOS E PASSIVO -->
                        <div>
                            <div class="flex items-center gap-3 mb-6">
                                <span class="h-8 w-1 bg-indigo-600 rounded-full"></span>
                                <h4 class="text-lg font-black text-slate-800 uppercase tracking-tight">Capitais Próprios e Passivo</h4>
                            </div>
                            <div class="space-y-4">
                                <div *ngFor="let line of balanceSheet.equityAndLiabilities?.lines" [class]="'group transition-all ' + (line.isTotal ? 'mt-4 border-t border-slate-200 pt-4' : '')">
                                    <div class="flex justify-between items-baseline py-1">
                                         <span [class]="'text-slate-700 transition-colors ' + (line.level === 1 ? 'font-black text-sm uppercase' : (line.level === 2 ? 'font-bold text-sm pl-4' : 'text-xs pl-8 text-slate-500'))">
                                            {{ line.code }} {{ line.name }}
                                        </span>
                                        <div class="flex items-center gap-4">
                                            <span [class]="'font-mono transition-all ' + (line.isTotal ? 'text-sm font-black ' : 'text-xs ') + ((+line.balance || 0) < 0 ? 'text-rose-600' : (line.isTotal ? 'text-slate-900' : 'text-slate-600'))">
                                                {{ (+line.balance || 0) | number:'1.2-2' }}
                                            </span>
                                        </div>
                                    </div>
                                    <div *ngIf="!line.isTotal" class="h-[1px] w-full bg-slate-50 group-hover:bg-slate-100 transition-all"></div>
                                </div>
                                <div class="mt-8 p-6 bg-slate-900 text-white rounded-xl flex justify-between items-center shadow-lg shadow-slate-200 print:bg-slate-100 print:text-black print:shadow-none">
                                    <span class="text-sm font-black uppercase tracking-widest text-slate-400 print:text-slate-600">Total Capital Próprio e Passivo</span>
                                    <span class="text-xl font-mono font-black">{{ (+balanceSheet.equityAndLiabilities?.total || 0) | number:'1.2-2' }}</span>
                                </div>
                            </div>
                            
                            <!-- Balanced Check -->
                            <div class="mt-6 flex justify-center no-print">
                                <div [class]="'px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 ' + (Math.abs(balanceSheet.assets?.total - balanceSheet.equityAndLiabilities?.total) < 0.01 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')">
                                    <span class="material-symbols-outlined text-[16px]">{{ Math.abs(balanceSheet.assets?.total - balanceSheet.equityAndLiabilities?.total) < 0.01 ? 'verified' : 'error' }}</span>
                                    {{ Math.abs(balanceSheet.assets?.total - balanceSheet.equityAndLiabilities?.total) < 0.01 ? 'BALANCETE VERIFICADO E EQUILIBRADO' : 'DIFERENÇA DE EQUILÍBRIO DETETADA (' + (Math.abs(balanceSheet.assets?.total - balanceSheet.equityAndLiabilities?.total) | number:'1.2-2') + ')' }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- DEMONSTRAÇÃO DE RESULTADOS -->
                    <div *ngIf="activeTab === 'INCOME_STATEMENT' && incomeStatement" class="animate-fade-in">
                        <div class="space-y-4">
                            <div *ngFor="let line of incomeStatement.lines" [class]="'group transition-all ' + (line.isMainTotal ? 'mt-8 border-t-2 border-slate-800 pt-6' : (line.isSubTotal ? 'mt-4 border-t border-slate-200 pt-4' : ''))">
                                <div class="flex justify-between items-baseline py-1">
                                     <span [class]="'text-slate-700 transition-colors uppercase ' + (line.isMainTotal ? 'font-black text-lg' : (line.isSubTotal ? 'font-black text-sm' : 'font-bold text-xs pl-4'))">
                                        {{ line.name }}
                                    </span>
                                    <div class="flex items-center gap-4">
                                        <span [class]="'font-mono transition-all ' + (line.isMainTotal ? 'text-xl font-black ' : (line.isSubTotal ? 'text-sm font-black ' : 'text-xs font-bold ')) + ((+line.balance || 0) < 0 ? 'text-rose-600' : (line.isMainTotal ? 'text-slate-900' : 'text-slate-600'))">
                                            <ng-container *ngIf="(+line.balance || 0) >= 0">{{ (+line.balance || 0) | number:'1.2-2' }}</ng-container><ng-container *ngIf="(+line.balance || 0) < 0">({{ Math.abs(+line.balance || 0) | number:'1.2-2' }})</ng-container>
                                        </span>
                                    </div>
                                </div>
                                <div *ngIf="!line.isSubTotal && !line.isMainTotal" class="h-[1px] w-full bg-slate-50 group-hover:bg-slate-100 transition-all"></div>
                            </div>

                            <div class="mt-12 p-10 bg-indigo-50 border border-indigo-100 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden print:bg-white print:border-slate-800 print:rounded-none">
                                <div class="absolute top-0 right-0 p-4 opacity-5">
                                    <span class="material-symbols-outlined text-[120px]">account_balance</span>
                                </div>
                                <span class="text-[10px] uppercase font-black tracking-[0.3em] text-indigo-400 mb-2">Resultado Líquido do Exercício</span>
                                <span [class]="'text-5xl font-mono font-black ' + (incomeStatement.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600')">
                                    {{ (+incomeStatement.netIncome || 0) | number:'1.2-2' }}
                                </span>
                                <p class="text-xs font-bold mt-4 text-slate-500 uppercase">{{ incomeStatement.netIncome >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido' }}</p>
                            </div>
                        </div>
                    </div>

                    <div *ngIf="(!balanceSheet && activeTab === 'BALANCE_SHEET') || (!incomeStatement && activeTab === 'INCOME_STATEMENT')" class="text-center py-20">
                        <span class="material-symbols-outlined text-slate-200 text-6xl mb-4 text-center">data_alert</span>
                        <p class="text-slate-400 font-medium">Dados insuficientes para gerar o mapa.</p>
                    </div>
                </div>

                <!-- Footer Signatures -->
                <div class="px-8 py-12 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-20 print:bg-white">
                    <div class="text-center pt-8 border-t border-slate-300">
                        <p class="text-xs font-black text-slate-800 uppercase tracking-widest">O Contabilista</p>
                        <p class="text-[10px] text-slate-500 mt-1">Cédula Profissional nº _______</p>
                    </div>
                    <div class="text-center pt-8 border-t border-slate-300">
                        <p class="text-xs font-black text-slate-800 uppercase tracking-widest">O Gerente</p>
                        <p class="text-[10px] text-slate-500 mt-1">Assinatura Carimbada</p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
    `
})
export class FinancialStatementsComponent implements OnInit {
  activeTab: 'BALANCE_SHEET' | 'INCOME_STATEMENT' = 'BALANCE_SHEET';
  currentDate = new Date();
  periodStart = new Date(new Date().getFullYear(), 0, 1);
  isLoading = false;
  Math = Math;

  balanceSheet: any = null;
  incomeStatement: any = null;

  constructor(private accountingService: AccountingService) { }

  ngOnInit() {
    this.loadData();
  }

  switchTab(tab: 'BALANCE_SHEET' | 'INCOME_STATEMENT') {
    this.activeTab = tab;
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      bs: this.accountingService.getBalanceSheet(),
      is: this.accountingService.getIncomeStatement(),
    }).subscribe({
      next: ({ bs, is }: any) => {
        this.incomeStatement = this.buildIncomeStatement(is);
        this.balanceSheet = this.buildBalanceSheet(bs, this.incomeStatement.netIncome);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching financial statements:', err);
        this.balanceSheet = null;
        this.incomeStatement = null;
        this.isLoading = false;
      }
    });
  }

  private num(v: any): number { return parseFloat(String(v)) || 0; }

  private buildIncomeStatement(is: any) {
    const n = (v: any) => this.num(v);
    const fin = (is && is.financialResult && typeof is.financialResult === 'object') ? is.financialResult.total : (is ? is.financialResult : 0);
    const lines: any[] = [
      { name: 'Vendas e Servicos Prestados', balance: n(is && is.revenue) },
      { name: 'Custo das Mercadorias Vendidas', balance: -n(is && is.costOfGoods) },
      { name: 'Fornecimentos e Servicos de Terceiros', balance: -n(is && is.fse) },
      { name: 'Gastos com o Pessoal', balance: -n(is && is.personnelExpenses) },
      { name: 'Amortizacoes e Depreciacoes', balance: -n(is && is.depreciation) },
      { name: 'Provisoes do Periodo', balance: -n(is && is.provisions) },
      { name: 'Outros Rendimentos e Ganhos', balance: n(is && is.otherGains) },
      { name: 'Outros Gastos e Perdas', balance: -n(is && is.otherLosses) },
      { name: 'Resultado Operacional (EBIT)', balance: n(is && is.operatingResult), isSubTotal: true },
      { name: 'Resultado Financeiro', balance: n(fin) },
      { name: 'Resultado Antes de Impostos', balance: n(is && is.currentResult), isSubTotal: true },
      { name: 'Imposto sobre o Rendimento', balance: -n(is && is.taxes) },
      { name: 'Resultado Liquido do Exercicio', balance: n(is && is.netProfit), isMainTotal: true },
    ];
    return { lines, netIncome: n(is && is.netProfit) };
  }

  private buildBalanceSheet(bs: any, netIncome: number) {
    const n = (v: any) => this.num(v);
    const a = (bs && bs.assets) || {}; const nc = a.nonCurrent || {}; const cur = a.current || {};
    const el = (bs && bs.equityAndLiabilities) || {};
    const eq = el.equity || {}; const liab = el.liabilities || {};
    const liabCur = liab.current || {}; const liabNc = liab.nonCurrent || {};

    const assetsLines = [
      { name: 'Ativo Nao Corrente', level: 1, balance: n(nc.total) },
      { name: 'Ativos Tangiveis', level: 3, balance: n(nc.tangible) },
      { name: 'Ativos Intangiveis', level: 3, balance: n(nc.intangible) },
      { name: 'Investimentos Financeiros', level: 3, balance: n(nc.financial) },
      { name: 'Ativo Corrente', level: 1, balance: n(cur.total) },
      { name: 'Inventarios', level: 3, balance: n(cur.inventory) },
      { name: 'Clientes', level: 3, balance: n(cur.clients) },
      { name: 'Caixa e Depositos Bancarios', level: 3, balance: n(cur.cashAndBanks) },
    ];

    const equityTotal = n(eq.capital) + n(eq.reservas) + n(eq.retainedEarnings) + n(eq.netIncome) + netIncome;
    const liabTotal = n(liab.total);
    const elLines = [
      { name: 'Capital Proprio', level: 1, balance: equityTotal },
      { name: 'Capital Social', level: 3, balance: n(eq.capital) },
      { name: 'Reservas', level: 3, balance: n(eq.reservas) },
      { name: 'Resultados Transitados', level: 3, balance: n(eq.retainedEarnings) },
      { name: 'Resultado Liquido do Periodo', level: 3, balance: netIncome },
      { name: 'Passivo', level: 1, balance: liabTotal },
      { name: 'Fornecedores', level: 3, balance: n(liabCur.suppliers) },
      { name: 'Outros Credores (Salarios a Pagar, etc.)', level: 3, balance: n(liabCur.otherCreditors) },
      { name: 'Estado e Outros Entes Publicos', level: 3, balance: n(liabCur.taxes) },
      { name: 'Financiamentos Obtidos', level: 3, balance: n(liabCur.loans) },
      { name: 'Provisoes', level: 3, balance: n(liabNc.provisions) },
    ];

    return {
      assets: { lines: assetsLines, total: n(a.total) },
      equityAndLiabilities: { lines: elLines, total: equityTotal + liabTotal },
    };
  }

  printReport() {
    window.print();
  }
}
