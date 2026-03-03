import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HRService, TaxBracket, HRSettings } from '../../shared/hr.service';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tax-tables',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="h-full flex flex-col bg-[#F3F4F6]">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm relative z-10 transition-all duration-300">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <app-icon name="table_rows" [size]="28"></app-icon>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Tabelas de IRPS/INSS</h1>
            <p class="text-xs text-gray-500">Configuração de impostos e encargos sobre salários</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="loadData()" class="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white">
            <app-icon name="refresh" [size]="20"></app-icon>
            <span class="text-xs font-semibold">Atualizar</span>
          </button>
          <button (click)="saveAll()" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95">
            <app-icon name="save" [size]="20"></app-icon>
            <span class="text-xs font-bold uppercase tracking-wider">Gravar Alterações</span>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-auto p-6 space-y-6">
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- INSS & Settings Card -->
          <div class="lg:col-span-1 space-y-6">
             <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
                  <app-icon name="settings" [size]="20" color="#4338ca"></app-icon>
                  <h3 class="font-bold text-gray-800 text-sm italic">Configurações Gerais</h3>
                </div>
                <div class="p-4 space-y-4" *ngIf="settings">
                  <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Taxa INSS (Funcionário) %</label>
                    <div class="relative">
                      <input type="number" [(ngModel)]="settings.inssEmployeeRate" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-semibold text-gray-800" placeholder="3.00">
                    </div>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Taxa INSS (Entidade) %</label>
                    <div class="relative">
                      <input type="number" [(ngModel)]="settings.inssEmployerRate" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-semibold text-gray-800" placeholder="4.00">
                    </div>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Moeda do Módulo</label>
                    <div class="relative">
                      <select [(ngModel)]="settings.currency" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-semibold text-gray-800">
                        <option value="MT">Metical (MT)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="ZAR">Rand (ZAR)</option>
                      </select>
                    </div>
                  </div>
                </div>
             </div>

             <div class="bg-amber-50 rounded-xl p-4 border border-amber-200 flex gap-3">
                <div class="text-amber-500">
                  <app-icon name="info" [size]="24"></app-icon>
                </div>
                <div class="text-xs text-amber-800 space-y-1">
                  <p class="font-bold">Nota sobre INSS:</p>
                  <p>A taxa total recomendada para Moçambique é de 7% (3% retido ao funcionário e 4% de encargo para a empresa).</p>
                </div>
             </div>
          </div>

          <!-- IRPS Table Card -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
              <div class="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <app-icon name="receipt_long" [size]="20" color="#4338ca"></app-icon>
                  <h3 class="font-bold text-gray-800 text-sm italic">Tabela de IRPS (Progressiva)</h3>
                </div>
                <div class="flex items-center gap-2">
                  <button (click)="loadOfficialTable()" class="text-[9px] font-black bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors uppercase tracking-widest flex items-center gap-1 border border-emerald-200">
                    <app-icon name="auto_fix_high" [size]="14"></app-icon>
                    Carregar Tabela Oficial 2024 (MZ)
                  </button>
                  <button (click)="addBracket()" class="text-[9px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors uppercase tracking-widest flex items-center gap-1 shadow-sm">
                    <app-icon name="add" [size]="14"></app-icon>
                    Novo Escalão
                  </button>
                </div>
              </div>
              
              <div class="flex-1 overflow-auto">
                <table class="w-full">
                  <thead>
                    <tr class="bg-gray-50 border-b border-gray-100">
                      <th class="px-3 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Escalão Mínimo</th>
                      <th class="px-3 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Escalão Máximo</th>
                      <th class="px-3 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Taxa %</th>
                      <th class="px-3 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-orange-50/50">Abater (0)</th>
                      <th class="px-3 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-orange-50/50">Abater (1)</th>
                      <th class="px-3 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-orange-50/50">Abater (2)</th>
                      <th class="px-3 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-orange-50/50">Abater (3)</th>
                      <th class="px-3 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-orange-50/50">Abater (4+)</th>
                      <th class="px-3 py-3 text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest w-12">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr *ngFor="let bracket of brackets; let i = index" class="hover:bg-gray-50 transition-colors">
                      <td class="px-3 py-2 text-center">
                        <input type="number" [(ngModel)]="bracket.minAmount" class="w-full px-2 py-1 border border-transparent focus:border-indigo-300 focus:bg-white bg-transparent rounded text-sm text-gray-700 font-medium">
                      </td>
                      <td class="px-3 py-2">
                        <input type="number" [(ngModel)]="bracket.maxAmount" class="w-full px-2 py-1 border border-transparent focus:border-indigo-300 focus:bg-white bg-transparent rounded text-sm text-gray-700 font-medium" placeholder="Ilimitado">
                      </td>
                      <td class="px-3 py-2">
                        <div class="flex items-center gap-1">
                           <input type="number" [(ngModel)]="bracket.rate" class="w-12 px-2 py-1 border border-transparent focus:border-indigo-300 focus:bg-white bg-transparent rounded text-sm text-indigo-600 font-bold">
                           <span class="text-[9px] text-gray-400 uppercase font-black">%</span>
                        </div>
                      </td>
                      <td class="px-3 py-2 bg-orange-50/20">
                        <input type="number" [(ngModel)]="bracket.deduction0" class="w-full px-1 py-1 border border-transparent focus:border-orange-300 focus:bg-white bg-transparent rounded text-[11px] text-gray-700 font-bold tracking-tighter">
                      </td>
                      <td class="px-3 py-2 bg-orange-50/20">
                        <input type="number" [(ngModel)]="bracket.deduction1" class="w-full px-1 py-1 border border-transparent focus:border-orange-300 focus:bg-white bg-transparent rounded text-[11px] text-gray-700 font-bold tracking-tighter">
                      </td>
                      <td class="px-3 py-2 bg-orange-50/20">
                        <input type="number" [(ngModel)]="bracket.deduction2" class="w-full px-1 py-1 border border-transparent focus:border-orange-300 focus:bg-white bg-transparent rounded text-[11px] text-gray-700 font-bold tracking-tighter">
                      </td>
                      <td class="px-3 py-2 bg-orange-50/20">
                        <input type="number" [(ngModel)]="bracket.deduction3" class="w-full px-1 py-1 border border-transparent focus:border-orange-300 focus:bg-white bg-transparent rounded text-[11px] text-gray-700 font-bold tracking-tighter">
                      </td>
                      <td class="px-3 py-2 bg-orange-50/20">
                        <input type="number" [(ngModel)]="bracket.deduction4Plus" class="w-full px-1 py-1 border border-transparent focus:border-orange-300 focus:bg-white bg-transparent rounded text-[11px] text-gray-700 font-bold tracking-tighter">
                      </td>
                      <td class="px-3 py-2 text-center">
                        <button (click)="removeBracket(i)" class="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remover">
                          <app-icon name="delete" [size]="16"></app-icon>
                        </button>
                      </td>
                    </tr>
                    <tr *ngIf="brackets.length === 0">
                      <td colspan="5" class="px-4 py-12 text-center">
                        <div class="flex flex-col items-center opacity-30">
                          <app-icon name="table_chart" [size]="48"></app-icon>
                          <p class="mt-2 font-semibold">Nenhum escalão configurado</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="p-4 border-t border-gray-100 bg-gray-50/50">
                <p class="text-[10px] text-gray-400 italic">Dica: Os valores devem refletir os limites de rendimento mensal tributável.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class TaxTablesComponent implements OnInit {
  brackets: TaxBracket[] = [];
  settings!: HRSettings;
  private sub = new Subscription();

  constructor(
    private hrService: HRService,
    private dataService: DataService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.sub.add(
      this.dataService.activeCompany$.subscribe(company => {
        if (company) {
          this.loadData();
        }
      })
    );
  }

  loadData() {
    const cid = this.dataService.getCompanyId();
    if (!cid) return;

    this.hrService.getTaxBrackets(cid).subscribe({
      next: (data) => {
        this.brackets = data;
        this.cdr.detectChanges();
      },
      error: (err) => this.toaster.showError('Ocorreu um erro', 'Não foi possível carregar os escalões.')
    });

    this.hrService.getHRSettings(cid).subscribe({
      next: (data) => {
        this.settings = data;
        this.cdr.detectChanges();
      },
      error: (err) => this.toaster.showError('Ocorreu um erro', 'Não foi possível carregar as configurações.')
    });
  }

  addBracket() {
    this.brackets.push({
      minAmount: 0,
      maxAmount: null,
      rate: 0,
      deduction0: 0,
      deduction1: 0,
      deduction2: 0,
      deduction3: 0,
      deduction4Plus: 0
    });
  }

  removeBracket(index: number) {
    const b = this.brackets[index];
    if (b.id) {
      if (confirm('Tem a certeza que deseja remover este escalão definitivamente?')) {
        this.hrService.deleteTaxBracket(b.id, this.dataService.getCompanyId()).subscribe(() => {
          this.brackets.splice(index, 1);
          this.toaster.showSuccess('Sucesso', 'Escalão removido.');
        });
      }
    } else {
      this.brackets.splice(index, 1);
    }
  }

  saveAll() {
    const cid = this.dataService.getCompanyId();
    if (!cid) return;

    // Save Settings
    this.hrService.updateHRSettings(this.settings, cid).subscribe({
      error: (err) => this.toaster.showError('Erro ao gravar configurações', err.message)
    });

    // Save Brackets
    // For simplicity, we save each one (ideal would be a bulk endpoint)
    let savedCount = 0;
    this.brackets.forEach(b => {
      this.hrService.saveTaxBracket(b, cid).subscribe(() => {
        savedCount++;
        if (savedCount === this.brackets.length) {
          this.toaster.showSuccess('Sucesso', 'Tabelas gravadas com sucesso.');
          this.loadData();
        }
      });
    });
  }

  loadOfficialTable() {
    if (!confirm('Esta ação irá limpar os escalões atuais e carregar os valores oficiais de 2024 para Moçambique. Deseja continuar?')) return;

    const cid = this.dataService.getCompanyId();
    if (!cid) return;

    const official = [
      { minAmount: 0, maxAmount: 20250, rate: 0, deduction0: 0, deduction1: 0, deduction2: 0, deduction3: 0, deduction4Plus: 0 },
      { minAmount: 20250.01, maxAmount: 32400, rate: 10, deduction0: 2025, deduction1: 2045, deduction2: 2065, deduction3: 2085, deduction4Plus: 2105 },
      { minAmount: 32400.01, maxAmount: 60750, rate: 15, deduction0: 3645, deduction1: 3685, deduction2: 3725, deduction3: 3765, deduction4Plus: 3805 },
      { minAmount: 60750.01, maxAmount: 145800, rate: 20, deduction0: 6682.50, deduction1: 6762.50, deduction2: 6842.50, deduction3: 6922.50, deduction4Plus: 7002.50 },
      { minAmount: 145800.01, maxAmount: 437400, rate: 25, deduction0: 13972.50, deduction1: 14132.50, deduction2: 14292.50, deduction3: 14452.50, deduction4Plus: 14612.50 },
      { minAmount: 437400.01, maxAmount: null, rate: 32, deduction0: 44590.50, deduction1: 45030.50, deduction2: 45470.50, deduction3: 45910.50, deduction4Plus: 46350.50 }
    ];

    // Delete existing
    const deletePromises = this.brackets.filter(b => b.id).map(b => this.hrService.deleteTaxBracket(b.id!, cid).toPromise());

    Promise.all(deletePromises).then(() => {
      this.brackets = [];
      let saved = 0;
      official.forEach(b => {
        this.hrService.saveTaxBracket(b as any, cid).subscribe(() => {
          saved++;
          if (saved === official.length) {
            this.loadData();
            this.toaster.showSuccess('Sucesso', 'Tabela Oficial 2024 carregada com sucesso.');
          }
        });
      });
    });
  }
}
