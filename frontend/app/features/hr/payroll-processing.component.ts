import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HRService, PayrollRecord } from '../../shared/hr.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-payroll-processing',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0] p-4">
      <div class="max-w-6xl mx-auto w-full space-y-4">
        <!-- Header -->
        <div class="flex justify-between items-center bg-white p-4 rounded shadow-sm border-l-4 border-blue-600">
           <div>
              <h1 class="text-xl font-bold text-gray-800">Processamento de Salários</h1>
              <p class="text-xs text-gray-500 uppercase tracking-wider">Folha de Pagamento Mensal</p>
           </div>
           
           <div class="flex gap-4 items-center">
              <div class="flex flex-col">
                <label class="text-[10px] text-gray-400 font-bold uppercase">Mês/Ano</label>
                <div class="flex gap-2">
                  <select [(ngModel)]="selectedMonth" class="px-2 py-1 border rounded text-xs">
                    <option *ngFor="let m of months; let i = index" [value]="i+1">{{ m }}</option>
                  </select>
                  <select [(ngModel)]="selectedYear" class="px-2 py-1 border rounded text-xs">
                    <option *ngFor="let y of years" [value]="y">{{ y }}</option>
                  </select>
                </div>
              </div>
              
              <button 
                (click)="processPayroll()" 
                [disabled]="processing"
                class="bg-blue-600 text-white px-6 py-2 rounded text-xs font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 disabled:bg-gray-400"
              >
                <app-icon name="sync" [size]="18" [class.animate-spin]="processing"></app-icon>
                <span>{{ processing ? 'A PROCESSAR...' : 'GERAR FOLHA' }}</span>
              </button>
              <button 
                *ngIf="payrollData.length > 0 && hasDraftRecords"
                (click)="postToAccounting()" 
                [disabled]="posting"
                class="bg-emerald-600 text-white px-5 py-2 rounded text-xs font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2 disabled:bg-gray-400"
              >
                <app-icon name="account_balance" [size]="18"></app-icon>
                <span>{{ posting ? 'A LANÇAR...' : 'LANÇAR NA CONTABILIDADE' }}</span>
              </button>
           </div>
        </div>

        <!-- Dashboard / Summary -->
        <div *ngIf="payrollData.length > 0" class="grid grid-cols-4 gap-4">
           <div class="bg-white p-4 rounded shadow-sm">
              <p class="text-[10px] text-gray-400 font-bold uppercase">Total Bruto</p>
              <p class="text-lg font-bold text-gray-800">{{ totals.gross | number:'1.2-2' }} MT</p>
           </div>
           <div class="bg-white p-4 rounded shadow-sm">
              <p class="text-[10px] text-gray-400 font-bold uppercase text-red-500">Total IRPS (4.2.1)</p>
              <p class="text-lg font-bold text-red-600">{{ totals.irm | number:'1.2-2' }} MT</p>
           </div>
           <div class="bg-white p-4 rounded shadow-sm">
              <p class="text-[10px] text-gray-400 font-bold uppercase text-orange-500">Total INSS (7%)</p>
              <p class="text-lg font-bold text-orange-600">{{ totals.inssTotal | number:'1.2-2' }} MT</p>
           </div>
           <div class="bg-white p-4 rounded shadow-sm border-r-4 border-green-500">
              <p class="text-[10px] text-gray-400 font-bold uppercase text-green-600">Total Líquido</p>
              <p class="text-xl font-black text-green-700">{{ totals.net | number:'1.2-2' }} MT</p>
           </div>
        </div>

        <!-- Table -->
        <div class="bg-white rounded shadow-sm overflow-hidden flex-1 border border-gray-200">
           <div class="bg-gray-50 border-b p-3 flex justify-between items-center">
              <h2 class="text-sm font-bold text-gray-700">Detalhes da Folha</h2>
              <div class="flex gap-2" *ngIf="payrollData.length > 0">
                 <button class="text-xs text-blue-600 hover:underline flex items-center gap-1">
                   <app-icon name="download" [size]="14"></app-icon> Excel
                 </button>
                 <button class="text-xs text-blue-600 hover:underline flex items-center gap-1">
                   <app-icon name="print" [size]="14"></app-icon> Imprimir Todos
                 </button>
              </div>
           </div>
           
           <div class="overflow-x-auto min-h-[300px]">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-100 text-gray-500 uppercase font-bold sticky top-0">
                  <tr>
                    <th class="p-3">Código</th>
                    <th class="p-3">Nome</th>
                    <th class="p-3 text-right">Bruto</th>
                    <th class="p-3 text-right">INSS (4%)</th>
                    <th class="p-3 text-right">IRPS</th>
                    <th class="p-3 text-right">Líquido</th>
                    <th class="p-3 text-center">Estado</th>
                    <th class="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr *ngFor="let r of payrollData" class="hover:bg-blue-50 transition-colors">
                    <td class="p-3 font-medium">{{ r.employeeCode }}</td>
                    <td class="p-3 font-bold">{{ r.employeeName }}</td>
                    <td class="p-3 text-right font-mono">{{ r.grossSalary | number:'1.2-2' }}</td>
                    <td class="p-3 text-right text-orange-600 font-mono">-{{ r.inssEmployee | number:'1.2-2' }}</td>
                    <td class="p-3 text-right text-red-600 font-mono">-{{ r.irm | number:'1.2-2' }}</td>
                    <td class="p-3 text-right font-black text-gray-800 font-mono">{{ r.netSalary | number:'1.2-2' }}</td>
                    <td class="p-3 text-center">
                      <span [class]="r.status === 'POSTED' ? 'bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full text-[10px]' : 'bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full text-[10px]'">
                        {{ r.status === 'POSTED' ? 'Lançado' : 'Rascunho' }}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                       <button class="p-1 hover:bg-white rounded shadow-sm border border-transparent hover:border-gray-200" title="Ver Recibo">
                         <app-icon name="visibility" [size]="18" color="#3b82f6"></app-icon>
                       </button>
                    </td>
                  </tr>
                  
                  <tr *ngIf="payrollData.length === 0" class="h-64">
                    <td colspan="8" class="text-center text-gray-400 italic">
                       Nenhum dado processado para este período.<br>Clique em "Gerar Folha" para iniciar.
                    </td>
                  </tr>
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  `
})
export class PayrollProcessingComponent implements OnInit, OnDestroy {
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  years = [2024, 2025, 2026];
  
  payrollData: PayrollRecord[] = [];
  processing = false;
  posting = false;
  totals = { gross: 0, inssTotal: 0, irm: 0, net: 0 };

  get hasDraftRecords() {
    return this.payrollData.some(r => r.status !== 'POSTED');
  }
  
  private sub = new Subscription();

  constructor(private hrService: HRService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {}

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  processPayroll() {
    this.processing = true;
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    
    this.sub.add(this.hrService.processPayroll(this.selectedYear, this.selectedMonth, company.id).subscribe({
      next: (data) => {
        this.payrollData = data;
        this.calculateTotals();
        this.processing = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        alert('Erro ao processar: ' + e.message);
        this.processing = false;
        this.cdr.detectChanges();
      }
    }));
  }

  calculateTotals() {
    this.totals = this.payrollData.reduce((acc, r) => ({
      gross: acc.gross + Number(r.grossSalary),
      inssTotal: acc.inssTotal + Number(r.inssEmployee) + Number(r.inssEmployer),
      irm: acc.irm + Number(r.irm),
      net: acc.net + Number(r.netSalary)
    }), { gross: 0, inssTotal: 0, irm: 0, net: 0 });
  }

  postToAccounting() {
    if (this.posting) return;
    this.posting = true;
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    this.sub.add(this.hrService.postPayrollToAccounting(this.selectedYear, this.selectedMonth, company.id).subscribe({
      next: (res) => {
        this.posting = false;
        if (res.success) {
          alert(`Lançamento criado com sucesso! ID: ${res.entryId}`);
          // Refresh to show POSTED status
          this.processPayroll();
        } else {
          alert('Erro ao lançar: ' + (res.message || res.error || 'Verifique os logs'));
        }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.posting = false;
        alert('Erro: ' + e.message);
        this.cdr.detectChanges();
      }
    }));
  }
}
