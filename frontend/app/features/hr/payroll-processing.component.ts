import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HRService, PayrollRecord } from '../../shared/hr.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { ToasterService } from '../../services/toaster.service';
import { DataService } from '../../services/data.service';
import { Subscription, firstValueFrom } from 'rxjs';

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
                class="bg-blue-600 text-white px-6 py-2 rounded text-xs font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 disabled:bg-gray-400 font-black transition-all"
              >
                <app-icon name="sync" [size]="18" [class.animate-spin]="processing"></app-icon>
                <span>{{ processing ? 'A PROCESSAR...' : 'GERAR FOLHA' }}</span>
              </button>
              <button 
                *ngIf="payrollData.length > 0 && hasDraftRecords"
                (click)="postToAccounting()" 
                [disabled]="posting"
                class="bg-emerald-600 text-white px-5 py-2 rounded text-xs font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2 disabled:bg-gray-400 font-black"
              >
                <app-icon name="account_balance" [size]="18"></app-icon>
                <span>{{ posting ? 'A LANÇAR...' : 'LANÇAR NA CONTABILIDADE' }}</span>
              </button>
           </div>
        </div>

        <!-- Dashboard / Summary -->
        <div *ngIf="payrollData.length > 0" class="grid grid-cols-4 gap-4">
           <div class="bg-white p-4 rounded shadow-sm border-b-2 border-gray-100">
              <p class="text-[10px] text-gray-400 font-bold uppercase">Total Bruto</p>
              <p class="text-lg font-bold text-gray-800">{{ totals.gross | number:'1.2-2' }} MT</p>
           </div>
            <div class="bg-white p-4 rounded shadow-sm border-b-2 border-red-100">
              <p class="text-[10px] text-gray-400 font-bold uppercase text-red-500">Total IRPS (4.2.1)</p>
              <p class="text-lg font-bold text-red-600">{{ (totals.irps || 0) | number:'1.2-2' }} MT</p>
            </div>
           <div class="bg-white p-4 rounded shadow-sm border-b-2 border-orange-100">
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
              <div class="flex gap-4" *ngIf="payrollData.length > 0">
                 <button (click)="exportToExcel()" class="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors">
                   <app-icon name="description" [size]="14"></app-icon> Excel
                 </button>
                 <button (click)="printMapa()" [disabled]="printing" class="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors">
                   <app-icon name="format_list_bulleted" [size]="14"></app-icon> Imprimir Mapa (A4 Folha Única)
                 </button>
                 <button (click)="printAllRecibos()" [disabled]="printing" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors">
                   <app-icon name="style" [size]="14"></app-icon> Todos os Recibos (Original/Duplo)
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
                    <td class="p-3 text-right text-red-600 font-mono">-{{ (r.irps || r['irm'] || 0) | number:'1.2-2' }}</td>
                    <td class="p-3 text-right font-black text-gray-800 font-mono">{{ r.netSalary | number:'1.2-2' }}</td>
                    <td class="p-3 text-center">
                      <span [class]="r.status === 'POSTED' ? 'bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full text-[10px]' : 'bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full text-[10px]'">
                        {{ r.status === 'POSTED' ? 'Lançado' : 'Rascunho' }}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                       <button (click)="viewRecibo(r)" class="p-1 hover:bg-white rounded shadow-sm border border-transparent hover:border-gray-200" title="Ver Recibo Individual (A4 Duplo)">
                         <app-icon name="print" [size]="18" color="#6366f1"></app-icon>
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

    <!-- Hidden Iframe for Direct Printing -->
    <iframe id="printIframe" style="position: absolute; width: 0; height: 0; border: none;"></iframe>
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
  printing = false;
  totals = { gross: 0, inssTotal: 0, irps: 0, net: 0 };

  get hasDraftRecords() {
    return this.payrollData.some(r => r.status !== 'POSTED');
  }

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
          this.payrollData = [];
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  processPayroll() {
    const cid = this.dataService.getCompanyId();
    if (!cid) return;
    this.processing = true;

    this.sub.add(this.hrService.processPayroll(this.selectedYear, this.selectedMonth, cid).subscribe({
      next: (data) => {
        this.payrollData = data;
        this.calculateTotals();
        this.processing = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        const msg = e?.error?.message || e?.message || 'Erro desconhecido';
        this.toaster.showError('Erro ao processar folha', msg);
        this.processing = false;
        this.cdr.detectChanges();
      }
    }));
  }

  calculateTotals() {
    this.totals = this.payrollData.reduce((acc, r) => {
      const rowIRPS = Number(r.irps || r['irm'] || 0);
      return {
        gross: acc.gross + Number(r.grossSalary || 0),
        inssTotal: acc.inssTotal + Number(r.inssEmployee || 0) + Number(r.inssEmployer || 0),
        irps: acc.irps + (isNaN(rowIRPS) ? 0 : rowIRPS),
        net: acc.net + Number(r.netSalary || 0)
      };
    }, { gross: 0, inssTotal: 0, irps: 0, net: 0 });
  }

  postToAccounting() {
    if (this.posting) return;
    const cid = this.dataService.getCompanyId();
    if (!cid) return;
    this.posting = true;
    this.sub.add(this.hrService.postPayrollToAccounting(this.selectedYear, this.selectedMonth, cid).subscribe({
      next: (res) => {
        this.posting = false;
        if (res.success) {
          this.toaster.showSuccess('Lançamento criado!', `Folha ${this.selectedMonth}/${this.selectedYear} lançada na contabilidade. ID: ${res.entryId}`);
          this.processPayroll();
        } else {
          this.toaster.showError('Erro ao lançar', res.message || res.error || 'Verifique os logs do servidor');
        }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.posting = false;
        const msg = e?.error?.message || e?.message || 'Erro desconhecido';
        this.toaster.showError('Erro ao lançar', msg);
        this.cdr.detectChanges();
      }
    }));
  }

  exportToExcel() {
    if (this.payrollData.length === 0) return;
    const headers = ['Codigo', 'Nome', 'Bruto', 'INSS_EE', 'IRPS', 'Sub_Transporte', 'Sub_Alimentacao', 'Liquido'];
    const rows = this.payrollData.map(r => [
      r.employeeCode,
      r.employeeName,
      r.grossSalary,
      r.inssEmployee,
      r.irps || r['irm'] || 0,
      r.transportSubsidy || 0,
      r.foodSubsidy || 0,
      r.netSalary
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Folha_Salarios_${this.selectedMonth}_${this.selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async viewRecibo(record: PayrollRecord) {
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '', address: '' };
    try {
      this.printing = true;
      const emp = await firstValueFrom(this.hrService.findOne(record.employeeId));
      const html = this.generateReceiptsPrintHTML([record], [emp], company);
      this.printDirectly(html);
      this.printing = false;
    } catch (err) {
      this.printing = false;
      this.toaster.showError('Erro ao carregar dados', 'Não foi possível obter detalhes do funcionário.');
    }
  }

  async printAllRecibos() {
    if (this.payrollData.length === 0) return;
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '', address: '' };
    this.printing = true;
    try {
      const employees = [];
      for (const r of this.payrollData) {
        employees.push(await firstValueFrom(this.hrService.findOne(r.employeeId)));
      }
      const html = this.generateReceiptsPrintHTML(this.payrollData, employees, company);
      this.printDirectly(html);
      this.printing = false;
    } catch (err) {
      this.printing = false;
      this.toaster.showError('Erro na geração', 'Falha ao processar alguns recibos.');
    }
  }

  printMapa() {
    if (this.payrollData.length === 0) return;
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '', address: '' };
    const html = this.generateMapaPrintHTML(this.payrollData, company);
    this.printDirectly(html);
  }

  private printDirectly(html: string) {
    const iframe = document.getElementById('printIframe') as HTMLIFrameElement;
    if (!iframe) return;
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  }

  private generateMapaPrintHTML(records: PayrollRecord[], company: any) {
    const monthName = this.months[this.selectedMonth - 1];
    let rowsHtml = '';
    records.forEach(r => {
      rowsHtml += `
        <tr>
          <td>${r.employeeCode}</td>
          <td>${r.employeeName}</td>
          <td class="text-right">${Number(r.grossSalary).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${Number(r.inssEmployee).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${Number(r.irps || r['irm'] || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${Number(r.transportSubsidy + r.foodSubsidy).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-bold">${Number(r.netSalary).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    return `
      <html>
        <head>
          <title>Mapa de Salários - ${monthName} ${this.selectedYear}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Arial; margin: 0; padding: 0; background: white; color: #333; }
            .header { border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { margin: 0; font-size: 18px; color: #1e3a8a; }
            .meta { font-size: 10px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #f1f5f9; text-align: left; padding: 8px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 9px; }
            td { padding: 8px; border: 1px solid #e2e8f0; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; }
            .totals { background: #1e3a8a; color: white; font-weight: bold; }
            .totals td { border-color: #1e3a8a; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>FOLHA DE PAGAMENTO - MAPA DE SALÁRIOS</h1>
              <div class="meta">${company.name} | NUIT: ${company.nif || '---'}</div>
            </div>
            <div style="text-align: right;">
              <div class="font-bold">${monthName.toUpperCase()} ${this.selectedYear}</div>
              <div class="meta">Emitido em: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Cód</th>
                <th>Nome do Colaborador</th>
                <th class="text-right">Salário Base</th>
                <th class="text-right">INSS (4%)</th>
                <th class="text-right">IRPS</th>
                <th class="text-right">Subsídios</th>
                <th class="text-right">Líquido a Receber</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tr class="totals">
              <td colspan="2">TOTAIS GERAIS</td>
              <td class="text-right">${this.totals.gross.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${(this.payrollData.reduce((p, c) => p + Number(c.inssEmployee), 0)).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${this.totals.irps.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${(this.payrollData.reduce((p, c) => p + Number(c.transportSubsidy + c.foodSubsidy), 0)).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${this.totals.net.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>

          <div class="footer">
            <div style="border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; margin-top: 40px;">Contabilidade / RH</div>
            <div style="border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; margin-top: 40px;">Administração</div>
          </div>
        </body>
      </html>
    `;
  }

  private generateReceiptsPrintHTML(records: PayrollRecord[], employees: any[], company: any) {
    const monthName = this.months[this.selectedMonth - 1];
    let bodyContent = '';
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const emp = employees[i];
      bodyContent += `
        <div class="a4-page">
          ${this.renderSingleRecibo(r, emp, company, monthName, 'Via Original')}
          <div class="divider"></div>
          ${this.renderSingleRecibo(r, emp, company, monthName, 'Via Duplicado')}
        </div>
      `;
    }

    return `
      <html>
        <head>
          <title>Recibos</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { font-family: 'Segoe UI', Arial; margin: 0; padding: 0; background: #eee; }
            .a4-page { width: 210mm; height: 297mm; background: white; margin: 0 auto; padding: 10mm; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; }
            .recibo-unit { height: 133mm; border: 1px solid #e2e8f0; padding: 6mm; border-radius: 4px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
            .watermark { position: absolute; right: 5mm; top: 5mm; font-size: 8px; color: #cbd5e1; border: 1px solid #cbd5e1; padding: 1px 4px; border-radius: 2px; text-transform: uppercase; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e40af; padding-bottom: 3mm; margin-bottom: 4mm; }
            .company-info h2 { margin: 0; font-size: 14px; color: #1e3a8a; }
            .company-info p { margin: 1px 0; font-size: 9px; color: #64748b; }
            .recibo-title { text-align: right; }
            .recibo-title h1 { margin: 0; font-size: 16px; font-weight: bold; color: #1e293b; }
            .info-grid { display: grid; grid-template-columns: 2fr 1fr; background: #f8fafc; padding: 3mm; border-radius: 4px; margin-bottom: 4mm; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 30px; }
            th { text-align: left; padding: 6px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
            td { padding: 6px; border-bottom: 1px solid #f1f5f9; }
            .text-right { text-align: right; }
            .total-bar { margin-top: auto; background: #1e3a8a; color: white; padding: 3mm; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
            .divider { border-top: 1px dashed #cbd5e1; height: 11mm; position: relative; width: 100%; }
            .divider::after { content: '\u2702'; position: absolute; left: 50%; top: -10px; background: white; padding: 0 10px; font-size: 12px; color: #cbd5e1; }
            @media print { body { background: white; } .a4-page { margin: 0; } }
          </style>
        </head>
        <body>
          ${bodyContent}
        </body>
      </html>
    `;
  }

  private renderSingleRecibo(r: PayrollRecord, emp: any, company: any, month: string, watermark: string) {
    const earnings = (Number(r.grossSalary) + Number(r.transportSubsidy + r.foodSubsidy) + Number(r.bonusAmount || 0));
    const deductions = (Number(r.inssEmployee) + Number(r.irps || r['irm'] || 0));

    return `
      <div class="recibo-unit">
        <div class="watermark">${watermark}</div>
        <div class="header">
          <div class="company-info">
            <h2>${company.name}</h2>
            <p>NUIT: ${company.nif || '---'} | ${company.address || ''}</p>
          </div>
          <div class="recibo-title">
            <h1>RECIBO DE VENCIMENTO</h1>
            <div style="font-size: 11px; font-weight: bold;">${month.toUpperCase()} ${r.year}</div>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <strong>Colaborador:</strong> ${r.employeeName}<br>
            <span style="color: #64748b;">Cargo: ${emp.position || '---'} | Cód: ${r.employeeCode}</span>
          </div>
          <div class="text-right">
            <strong>NUIT:</strong> ${emp.nif || '---'}<br>
            <span style="color: #64748b;">Emissão: ${new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr><th>Descrição</th><th class="text-right">Ganhos</th><th class="text-right">Descontos</th></tr>
          </thead>
          <tbody>
            <tr><td>Vencimento Base</td><td class="text-right">${Number(r.grossSalary).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td><td class="text-right">---</td></tr>
            ${(r.transportSubsidy + r.foodSubsidy) > 0 ? `<tr><td>Subsídios (Transporte/Alimentação)</td><td class="text-right">${Number(r.transportSubsidy + r.foodSubsidy).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td><td class="text-right">---</td></tr>` : ''}
            ${(r.bonusAmount || 0) > 0 ? `<tr><td>Bónus / Prêmios</td><td class="text-right">${Number(r.bonusAmount).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td><td class="text-right">---</td></tr>` : ''}
            <tr><td style="color: #64748b;">Segurança Social (INSS 3%)</td><td class="text-right">---</td><td class="text-right" style="color: #dc2626;">${Number(r.inssEmployee).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td style="color: #64748b;">Retenção na Fonte (IRPS)</td><td class="text-right">---</td><td class="text-right" style="color: #dc2626;">${Number(r.irps || r['irm'] || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td></tr>
            <tr style="font-weight: bold; border-top: 1px solid #1e3a8a;">
              <td>TOTAIS</td>
              <td class="text-right">${earnings.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${deductions.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-bar">
          <div style="font-size: 10px; font-weight: bold;">LÍQUIDO A RECEBER</div>
          <div style="font-size: 18px; font-weight: 900;">${Number(r.netSalary).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 6mm; border-top: 1px solid #eee; padding-top: 3mm;">
          <div style="width: 45%; border-top: 1px solid #000; text-align: center; font-size: 8px;">A Entidade Patronal</div>
          <div style="width: 45%; border-top: 1px solid #000; text-align: center; font-size: 8px;">O Colaborador</div>
        </div>
      </div>
    `;
  }
}
