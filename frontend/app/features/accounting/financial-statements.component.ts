import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    <div class="flex flex-col h-full bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 class="text-lg font-semibold text-gray-800">Demonstrações Financeiras</h2>
          <p class="text-xs text-gray-600 mt-0.5">Relatórios Configuráveis</p>
        </div>
        
        <div class="flex items-center gap-4">
            <div class="flex bg-gray-200 rounded p-1">
                <button 
                    (click)="switchTab('BALANCE_SHEET')"
                    [class]="'px-4 py-1.5 text-xs font-medium rounded transition-colors ' + (activeTab === 'BALANCE_SHEET' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800')"
                >
                    Balanço
                </button>
                <button 
                    (click)="switchTab('INCOME_STATEMENT')"
                    [class]="'px-4 py-1.5 text-xs font-medium rounded transition-colors ' + (activeTab === 'INCOME_STATEMENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800')"
                >
                    Demonstração de Resultados
                </button>
            </div>

            <button 
                (click)="toggleConfiguration()"
                [class]="'p-2 rounded transition-colors ' + (isConfiguring ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600')"
                title="Configurar Relatório"
            >
                <span class="material-symbols-outlined">settings</span>
            </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6">
        
        <!-- View Mode -->
        <div *ngIf="!isConfiguring && currentConfig" class="max-w-4xl mx-auto bg-white border shadow-sm rounded-lg overflow-hidden">
            <div class="bg-gray-50 px-6 py-4 border-b text-center">
                <h3 class="text-xl font-bold text-gray-800">{{ currentConfig.name }}</h3>
                <p class="text-sm text-gray-500">Em {{ currentDate | date:'dd/MM/yyyy' }}</p>
            </div>
          
            <div class="p-6">
                <!-- Sections -->
                <div *ngFor="let sectionData of reportData" class="mb-8 last:mb-0">
                    <h4 class="font-bold text-lg mb-4 text-gray-800 border-b pb-2">{{ sectionData.section.name }}</h4>
                    
                    <div class="space-y-2">
                        <div *ngFor="let lineData of sectionData.lines" class="flex justify-between text-sm hover:bg-gray-50 p-1 rounded">
                            <span class="text-gray-700">{{ lineData.line.name }}</span>
                            <span class="font-mono font-medium">{{ lineData.balance | number:'1.2-2' }}</span>
                        </div>
                        <div *ngIf="sectionData.lines.length === 0" class="text-gray-400 italic text-sm">Sem registos</div>
                    </div>

                    <div class="mt-4 pt-2 border-t border-gray-300 flex justify-between font-bold text-gray-900 bg-gray-50 p-2 rounded">
                        <span>{{ sectionData.section.totalLabel || 'Total' }}</span>
                        <span>{{ sectionData.total | number:'1.2-2' }}</span>
                    </div>
                </div>

                <!-- Net Income Calculation (Specific to Income Statement or Balance Sheet Equity) -->
                <div *ngIf="activeTab === 'INCOME_STATEMENT'" class="mt-8 pt-4 border-t-2 border-gray-800 flex justify-between items-center bg-blue-50 p-4 rounded">
                    <span class="text-lg font-bold text-gray-900">Resultado Líquido</span>
                    <span [class]="'text-xl font-mono font-bold ' + (netIncome >= 0 ? 'text-green-600' : 'text-red-600')">
                        {{ netIncome | number:'1.2-2' }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Configuration Mode -->
        <div *ngIf="isConfiguring && currentConfig" class="max-w-5xl mx-auto">
            <div class="bg-white border shadow-sm rounded-lg overflow-hidden">
                <div class="bg-blue-50 px-6 py-4 border-b flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-bold text-blue-900">Configurar: {{ currentConfig.name }}</h3>
                        <p class="text-xs text-blue-700">Defina as linhas e as contas associadas a cada secção.</p>
                    </div>
                    <div class="flex gap-2">
                        <button (click)="cancelConfiguration()" class="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-sm">Cancelar</button>
                        <button (click)="saveConfiguration()" class="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">Gravar Alterações</button>
                    </div>
                </div>

                <div class="p-6 space-y-8">
                    <div *ngFor="let section of currentConfig.sections" class="border rounded-lg p-4 bg-gray-50">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="font-bold text-gray-800">{{ section.name }}</h4>
                            <button (click)="addLine(section)" class="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">
                                <span class="material-symbols-outlined text-[16px]">add</span>
                                Adicionar Linha
                            </button>
                        </div>

                        <table class="w-full text-sm bg-white border rounded">
                            <thead class="bg-gray-100 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th class="px-3 py-2 text-left w-1/3">Nome da Linha</th>
                                    <th class="px-3 py-2 text-left">Contas (Inicia com...)</th>
                                    <th class="px-3 py-2 text-center w-20">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                <tr *ngFor="let line of section.lines; let i = index">
                                    <td class="p-2">
                                        <input [(ngModel)]="line.name" class="w-full border-gray-300 rounded text-sm p-1 border focus:border-blue-500 outline-none">
                                    </td>
                                    <td class="p-2">
                                        <input 
                                            [ngModel]="line.accountRanges.join(', ')"
                                            (ngModelChange)="updateAccountRanges(line, $event)"
                                            placeholder="Ex: 43, 44 (Separado por vírgula)"
                                            class="w-full border-gray-300 rounded text-sm p-1 border focus:border-blue-500 outline-none font-mono text-xs"
                                        >
                                    </td>
                                    <td class="p-2 text-center">
                                        <button (click)="removeLine(section, i)" class="text-red-500 hover:text-red-700 p-1">
                                            <span class="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </td>
                                </tr>
                                <tr *ngIf="section.lines.length === 0">
                                    <td colspan="3" class="p-4 text-center text-gray-400 italic text-xs">
                                        Nenhuma linha configurada nesta secção.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
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
  isConfiguring = false;

  currentConfig: FinancialReportConfig | undefined;
  reportData: ReportSectionData[] = [];
  netIncome = 0;

  accounts: Account[] = [];

  constructor(private accountingService: AccountingService) { }

  ngOnInit() {
    this.accounts = this.accountingService.getAccounts();
    this.loadConfig();
  }

  switchTab(tab: 'BALANCE_SHEET' | 'INCOME_STATEMENT') {
    this.activeTab = tab;
    this.isConfiguring = false;
    this.loadConfig();
  }

  loadConfig() {
    const configCode = this.activeTab;
    // Clone to avoid mutating service state directly until save
    const config = this.accountingService.getReportConfig(configCode);
    if (config) {
      this.currentConfig = JSON.parse(JSON.stringify(config));
      this.calculateReport();
    }
  }

  calculateReport() {
    if (!this.currentConfig) return;

    this.reportData = this.currentConfig.sections.map(section => {
      const linesData = section.lines
        .filter(line => line.visible)
        .map(line => {
          const balance = this.calculateLineBalance(line, section.type);
          return { line, balance };
        });

      const total = linesData.reduce((sum, item) => sum + item.balance, 0);

      return {
        section,
        lines: linesData,
        total
      };
    });

    // Calculate Net Income (Revenue - Expenses)
    // This logic might need to be more robust or configurable too, but for now:
    const revenueSection = this.reportData.find(s => s.section.type === 'REVENUE');
    const expenseSection = this.reportData.find(s => s.section.type === 'EXPENSE');

    const totalRevenue = revenueSection ? revenueSection.total : 0;
    const totalExpense = expenseSection ? expenseSection.total : 0;

    this.netIncome = totalRevenue - totalExpense;
  }

  calculateLineBalance(line: FinancialReportLine, sectionType: string): number {
    let balance = 0;

    // Find accounts matching ranges
    const matchingAccounts = this.accounts.filter(acc => {
      if (acc.balance === 0) return false; // Optimization
      return line.accountRanges.some(range => acc.code.startsWith(range.trim()));
    });

    const rawBalance = matchingAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Adjust sign based on section type
    // Assets and Expenses are naturally Debit (+), so we keep positive
    // Liabilities, Equity, Revenue are naturally Credit (-), so we negate to show positive
    if (['LIABILITY', 'EQUITY', 'REVENUE'].includes(sectionType)) {
      return -rawBalance;
    }
    return rawBalance;
  }

  // Configuration Methods
  toggleConfiguration() {
    this.isConfiguring = !this.isConfiguring;
    if (!this.isConfiguring) {
      // Reload to discard unsaved changes if cancelling via toggle
      this.loadConfig();
    }
  }

  cancelConfiguration() {
    this.isConfiguring = false;
    this.loadConfig();
  }

  saveConfiguration() {
    if (this.currentConfig) {
      this.accountingService.updateReportConfig(this.currentConfig);
      this.isConfiguring = false;
      this.calculateReport();
    }
  }

  addLine(section: FinancialReportSection) {
    section.lines.push({
      id: `L${Date.now()}`,
      name: 'Nova Linha',
      order: section.lines.length + 1,
      accountRanges: [],
      visible: true
    });
  }

  removeLine(section: FinancialReportSection, index: number) {
    section.lines.splice(index, 1);
  }

  updateAccountRanges(line: FinancialReportLine, value: string) {
    line.accountRanges = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
}
