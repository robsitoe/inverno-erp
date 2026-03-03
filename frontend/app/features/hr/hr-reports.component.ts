import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';
import { HRService } from '../../shared/hr.service';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-hr-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="h-full flex flex-col bg-[#F3F4F6]">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm relative z-10">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-pink-50 rounded-lg text-pink-600 shadow-inner">
            <app-icon name="assessment" [size]="28"></app-icon>
          </div>
          <div>
            <h1 class="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Central de Relatórios</h1>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Gestão de Conformidade e Performance</p>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-auto p-6">
        
        <!-- Filter Bar -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8 flex flex-wrap items-center gap-6">
          <div class="flex flex-col">
            <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Período de Referência</label>
            <div class="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              <select [(ngModel)]="selectedYear" class="px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm font-black text-gray-700 shadow-sm outline-none w-28">
                <option *ngFor="let y of years" [value]="y">{{ y }}</option>
              </select>
              <select [(ngModel)]="selectedMonth" class="px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm font-black text-gray-700 shadow-sm outline-none w-36">
                <option *ngFor="let m of months; let i = index" [value]="i+1">{{ m }}</option>
              </select>
            </div>
          </div>
          
          <div class="h-12 w-px bg-gray-100 hidden md:block"></div>
          
          <div class="flex-1">
            <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <div class="p-1.5 bg-blue-600 text-white rounded-full">
                <app-icon name="info" [size]="16"></app-icon>
              </div>
              <p class="text-xs font-semibold text-blue-800 leading-tight">
                Os relatórios são gerados em tempo real com base nos dados registados no sistema para o mês de <span class="font-black italic underline">{{ months[selectedMonth-1] }}</span>.
              </p>
            </div>
          </div>
        </div>

        <!-- Report Categories -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          <!-- Report Card: Relação Nominal -->
          <div (click)="generateReport('REL_NOMINAL')" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer border-l-[6px] border-l-blue-600">
             <div class="flex items-center justify-between mb-6">
                <div class="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <app-icon name="assignment_ind" [size]="32"></app-icon>
                </div>
                <div class="bg-gray-100 px-3 py-1 rounded-full">
                   <span class="text-[9px] uppercase font-black text-gray-400 tracking-widest leading-none">Legal / RH</span>
                </div>
             </div>
             <h3 class="text-xl font-black text-gray-800 mb-2 tracking-tight">Relação Nominal</h3>
             <p class="text-xs font-medium text-gray-400 mb-8 leading-relaxed">Listagem oficial de todos os funcionários ativos para submissão às autoridades do trabalho (Inspecção do Trabalho).</p>
             <div class="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all mt-auto">
               Visualizar e Imprimir
               <app-icon name="arrow_forward" [size]="14"></app-icon>
             </div>
          </div>

          <!-- Report Card: Folha de Salários -->
          <div (click)="generateReport('PAYROLL_SHEET')" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer border-l-[6px] border-l-emerald-500">
             <div class="flex items-center justify-between mb-6">
                <div class="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                  <app-icon name="payments" [size]="32"></app-icon>
                </div>
                <div class="bg-gray-100 px-3 py-1 rounded-full">
                   <span class="text-[9px] uppercase font-black text-gray-400 tracking-widest leading-none">Financeiro</span>
                </div>
             </div>
             <h3 class="text-xl font-black text-gray-800 mb-2 tracking-tight">Folha de Salários</h3>
             <p class="text-xs font-medium text-gray-400 mb-8 leading-relaxed">Resumo analítico dos pagamentos, descontos de INSS/IRPS e subsídios. Base para a contabilização e tesouraria.</p>
             <div class="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all mt-auto">
               Gerar Mapa Detalhado
               <app-icon name="arrow_forward" [size]="14"></app-icon>
             </div>
          </div>

          <!-- Report Card: Guia INSS -->
          <div (click)="generateReport('INSS_GUIDE')" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer border-l-[6px] border-l-rose-500">
             <div class="flex items-center justify-between mb-6">
                <div class="p-4 bg-rose-50 rounded-2xl text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
                  <app-icon name="account_balance" [size]="32"></app-icon>
                </div>
                <div class="bg-gray-100 px-3 py-1 rounded-full">
                   <span class="text-[9px] uppercase font-black text-gray-400 tracking-widest leading-none">Impostos</span>
                </div>
             </div>
             <h3 class="text-xl font-black text-gray-800 mb-2 tracking-tight">Guia de INSS (SISSMO)</h3>
             <p class="text-xs font-medium text-gray-400 mb-8 leading-relaxed">Resumo consolidado das contribuições (Trabalhador + Empresa) pronto para preenchimento no Portal SISSMO.</p>
             <div class="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all mt-auto">
               Gerar Guia de Pagamento
               <app-icon name="arrow_forward" [size]="14"></app-icon>
             </div>
          </div>

          <!-- Report Card: Resumo IRPS -->
          <div (click)="generateReport('IRPS_RESUME')" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer border-l-[6px] border-l-orange-500">
             <div class="flex items-center justify-between mb-6">
                <div class="p-4 bg-orange-50 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                  <app-icon name="request_quote" [size]="32"></app-icon>
                </div>
                <div class="bg-gray-100 px-3 py-1 rounded-full">
                   <span class="text-[9px] uppercase font-black text-gray-400 tracking-widest leading-none">Direcção de Impostos</span>
                </div>
             </div>
             <h3 class="text-xl font-black text-gray-800 mb-2 tracking-tight">Resumo de IRPS M/20</h3>
             <p class="text-xs font-medium text-gray-400 mb-8 leading-relaxed">Cálculo cumulativo de retenções na fonte efetuadas. Documento de suporte para a guia de pagamento de impostos.</p>
             <div class="flex items-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all mt-auto">
               Visualizar Declaração
               <app-icon name="arrow_forward" [size]="14"></app-icon>
             </div>
          </div>

          <!-- Report Card: Mapa de Antiguidade -->
          <div (click)="generateReport('SENIORITY_MAP')" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer border-l-[6px] border-l-cyan-500">
             <div class="flex items-center justify-between mb-6">
                <div class="p-4 bg-cyan-50 rounded-2xl text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-sm">
                  <app-icon name="history" [size]="32"></app-icon>
                </div>
                <div class="bg-gray-100 px-3 py-1 rounded-full">
                   <span class="text-[9px] uppercase font-black text-gray-400 tracking-widest leading-none">Estatística</span>
                </div>
             </div>
             <h3 class="text-xl font-black text-gray-800 mb-2 tracking-tight">Mapa de Antiguidade</h3>
             <p class="text-xs font-medium text-gray-400 mb-8 leading-relaxed">Controlo de tempo de serviço e datas de aniversário de contrato. Essencial para gestão de progressões e bónus.</p>
             <div class="flex items-center gap-2 text-cyan-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all mt-auto">
               Visualizar Mapa
               <app-icon name="arrow_forward" [size]="14"></app-icon>
             </div>
          </div>

          <!-- Report Card: Plano de Férias -->
          <div (click)="generateReport('VACATION_PLAN')" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer border-l-[6px] border-l-purple-500">
             <div class="flex items-center justify-between mb-6">
                <div class="p-4 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-sm">
                  <app-icon name="event_available" [size]="32"></app-icon>
                </div>
                <div class="bg-gray-100 px-3 py-1 rounded-full">
                   <span class="text-[9px] uppercase font-black text-gray-400 tracking-widest leading-none">Operacional</span>
                </div>
             </div>
             <h3 class="text-xl font-black text-gray-800 mb-2 tracking-tight">Plano de Férias Anual</h3>
             <p class="text-xs font-medium text-gray-400 mb-8 leading-relaxed">Cronograma consolidado de ausências planeadas para o ano civil. Facilita a gestão de equipas e substituições.</p>
             <div class="flex items-center gap-2 text-purple-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all mt-auto">
               Ver Escala de Férias
               <app-icon name="arrow_forward" [size]="14"></app-icon>
             </div>
          </div>

        </div>

      </div>

      <!-- Preview Modal -->
      <div *ngIf="showModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
         <div class="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <!-- Modal Header -->
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div class="flex items-center gap-3">
                   <div class="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                      <app-icon name="print" [size]="20"></app-icon>
                   </div>
                   <div>
                      <h2 class="text-sm font-black text-gray-800 uppercase tracking-tighter">{{ modalTitle }}</h2>
                      <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pré-visualização do Relatório</p>
                   </div>
                </div>
                <div class="flex items-center gap-3">
                   <button (click)="printFromModal()" class="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all uppercase tracking-widest">
                      <app-icon name="print" [size]="14"></app-icon>
                      <span>Imprimir / PDF</span>
                   </button>
                   <button (click)="showModal = false" class="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-all">
                      <app-icon name="close" [size]="20"></app-icon>
                   </button>
                </div>
            </div>
            <!-- Modal Body (Iframe for preview) -->
            <div class="flex-1 bg-gray-100 overflow-hidden relative">
               <iframe id="previewIframe" class="w-full h-full border-none bg-white"></iframe>
            </div>
         </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .animate-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class HRReportsComponent implements OnInit {
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  years = [2023, 2024, 2025, 2026];
  months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  showModal = false;
  modalTitle = '';

  constructor(
    private hrService: HRService,
    private dataService: DataService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() { }

  async generateReport(type: string) {
    const companyId = this.dataService.getCompanyId();
    if (!companyId) return;

    this.toaster.showInfo('A processar...', 'A extrair dados para o relatório...');

    try {
      let html = '';
      if (type === 'REL_NOMINAL') {
        const data = await firstValueFrom(this.hrService.getNominalRelationReport(companyId));
        this.modalTitle = 'Relação Nominal de Trabalhadores';
        html = this.getNominalRelationHTML(data);
      } else if (type === 'PAYROLL_SHEET' || type === 'INSS_GUIDE' || type === 'IRPS_RESUME') {
        const data = await firstValueFrom(this.hrService.getPayrollSheetReport(this.selectedYear, this.selectedMonth, companyId));
        if (!data.records || data.records.length === 0) {
          this.toaster.showWarning('Sem dados', 'Não foram encontrados processamentos de salários para este período.');
          return;
        }

        if (type === 'PAYROLL_SHEET') {
          this.modalTitle = 'Folha de Salários Detalhada';
          html = this.getPayrollSheetHTML(data);
        } else if (type === 'INSS_GUIDE') {
          this.modalTitle = 'Guia de Pagamento INSS';
          html = this.getINSSGuideHTML(data);
        } else if (type === 'IRPS_RESUME') {
          this.modalTitle = 'Resumo de IRPS M/20';
          html = this.getIRPSResumeHTML(data);
        }
      } else if (type === 'SENIORITY_MAP') {
        const data = await firstValueFrom(this.hrService.getSeniorityReport(companyId));
        this.modalTitle = 'Mapa de Antiguidade';
        html = this.getSeniorityMapHTML(data);
      } else if (type === 'VACATION_PLAN') {
        const data = await firstValueFrom(this.hrService.getVacationPlanReport(this.selectedYear, companyId));
        this.modalTitle = 'Plano de Férias Anual';
        html = this.getVacationPlanHTML(data);
      } else {
        this.toaster.showInfo('Em breve', 'Este relatório será ativado na próxima atualização.');
        return;
      }

      if (html) {
        this.openPreviewModal(html);
      }

    } catch (err) {
      this.toaster.showError('Erro ao gerar', 'Ocorreu um problema ao comunicar com o servidor.');
    }
  }

  private openPreviewModal(html: string) {
    this.showModal = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      const iframe = document.getElementById('previewIframe') as HTMLIFrameElement;
      if (iframe) {
        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
        }
      }
    }, 100);
  }

  printFromModal() {
    const iframe = document.getElementById('previewIframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
  }

  private getNominalRelationHTML(employees: any[]) {
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '' };
    return `
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Arial; padding: 40px; color: #333; }
              .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: 900; text-transform: uppercase; }
              .report-title { font-size: 18px; font-weight: bold; color: #666; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background: #f8f9fa; text-transform: uppercase; font-size: 10px; }
              .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">${company.name}</div>
              <div class="report-title">RELAÇÃO NOMINAL DE TRABALHADORES</div>
              <div style="font-size: 12px; margin-top: 10px;"><b>NUIT:</b> ${company.nif || '---'} | <b>Data:</b> ${new Date().toLocaleDateString()}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Cod.</th><th>Nome Completo</th><th>Cargo / Função</th><th>Data Admissão</th><th>Contrato</th><th>Nacionalidade</th>
                </tr>
              </thead>
              <tbody>
                ${employees.map(e => `
                  <tr><td><b>${e.code}</b></td><td>${e.name}</td><td>${e.position || '---'}</td><td>${e.hireDate || '---'}</td><td>${e.contractType}</td><td>Moçambicana</td></tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">Gerado sistematicamente por INVERNO ERP</div>
          </body>
        </html>
    `;
  }

  private getPayrollSheetHTML(data: any) {
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '', address: '' };
    const monthName = this.months[this.selectedMonth - 1];
    const totalAbonos = data.totals.transportSubsidy + data.totals.foodSubsidy + (data.totals.bonusAmount || 0);

    return `
      <html>
        <head>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; font-size: 10px; background: white; }
            .report-container { width: 100%; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px; }
            .company-info h1 { margin: 0; font-size: 18px; color: #1e3a8a; text-transform: uppercase; }
            .company-info p { margin: 2px 0; color: #64748b; font-size: 10px; }
            .report-title { text-align: right; }
            .report-title h2 { margin: 0; font-size: 16px; color: #1e293b; font-weight: 300; }
            .report-title .period { font-size: 12px; font-weight: 900; color: #1e40af; }
            
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .card { border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; background: #f8fafc; }
            .card-label { font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .card-value { font-size: 14px; font-weight: 900; color: #1e293b; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #cbd5e1; }
            th { background: #f1f5f9; padding: 8px 4px; border: 1px solid #cbd5e1; font-size: 8px; text-transform: uppercase; color: #475569; }
            td { padding: 6px 4px; border: 1px solid #e2e8f0; text-align: right; }
            .left { text-align: left; }
            .center { text-align: center; }
            .bg-row { background: #f8fafc; }
            .font-bold { font-weight: bold; }
            
            .totals-row { background: #1e3a8a !important; color: white !important; font-weight: 900; }
            .totals-row td { border-color: #1e3a8a; }
            
            .footer { margin-top: 40px; display: flex; justify-content: space-between; gap: 50px; }
            .signature-box { flex: 1; border-top: 1px solid #000; text-align: center; padding-top: 8px; font-size: 9px; margin-top: 30px; }
            
            .badge { display: inline-block; padding: 2px 6px; border-radius: 99px; font-size: 8px; font-weight: bold; }
            .badge-success { background: #dcfce7; color: #166534; }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div class="company-info">
                <h1>${company.name}</h1>
                <p>NUIT: ${company.nif || '---'} | ${company.address || ''}</p>
              </div>
              <div class="report-title">
                <h2>MAPA NOMINAL DE REMUNERAÇÕES</h2>
                <div class="period">${monthName?.toUpperCase()} ${this.selectedYear}</div>
                <p style="font-size: 8px; color: #94a3b8; margin: 2px 0;">Processado em: ${new Date().toLocaleString()}</p>
              </div>
            </div>

            <div class="summary-cards">
              <div class="card">
                <div class="card-label">Massa Salarial Total</div>
                <div class="card-value">${data.totals.grossSalary.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</div>
              </div>
              <div class="card">
                <div class="card-label">Total Abonos / Subsídios</div>
                <div class="card-value">${totalAbonos.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</div>
              </div>
              <div class="card">
                <div class="card-label">Total Retenções (IRS+INSS)</div>
                <div class="card-value">${(data.totals.inssEmployee + data.totals.irps).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</div>
              </div>
              <div class="card" style="border-right: 4px solid #10b981;">
                <div class="card-label">Salários Líquidos</div>
                <div class="card-value" style="color: #059669;">${data.totals.netSalary.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="left" rowspan="2">Cod.</th>
                  <th class="left" rowspan="2">Nome do Colaborador</th>
                  <th rowspan="2">Dias</th>
                  <th colspan="4" class="center">Abonos e Rendimentos (MT)</th>
                  <th colspan="2" class="center">Descontos Legais</th>
                  <th rowspan="2">Líquido a Receber</th>
                </tr>
                <tr>
                  <th>Salário Base</th>
                  <th>Sub. Transp.</th>
                  <th>Sub. Alim.</th>
                  <th>Outros/Bónus</th>
                  <th>INSS (3%)</th>
                  <th>IRPS</th>
                </tr>
              </thead>
              <tbody>
                ${data.records.map((p: any, idx: number) => `
                  <tr class="${idx % 2 === 0 ? 'bg-row' : ''}">
                    <td class="left font-bold">${p.employeeCode}</td>
                    <td class="left">${p.employeeName}</td>
                    <td class="center">${p.daysWorked || 30}</td>
                    <td>${Number(p.grossSalary).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                    <td>${Number(p.transportSubsidy || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                    <td>${Number(p.foodSubsidy || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                    <td>${Number(p.bonusAmount || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                    <td style="color: #dc2626;">${Number(p.inssEmployee).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                    <td style="color: #dc2626;">${Number(p.irps).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                    <td class="font-bold" style="background: #f0fdf4;">${Number(p.netSalary).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <td colspan="2" class="left">TOTAIS TÉCNICOS DA FOLHA</td>
                  <td class="center">---</td>
                  <td>${data.totals.grossSalary.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                  <td>${data.totals.transportSubsidy.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                  <td>${data.totals.foodSubsidy.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                  <td>${(data.totals.bonusAmount || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                  <td>${data.totals.inssEmployee.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                  <td>${data.totals.irps.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                  <td>${data.totals.netSalary.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>

            <div class="footer">
              <div class="signature-box">O Técnico Responsável (RH)</div>
              <div class="signature-box">O Contabilista Certificado</div>
              <div class="signature-box">A Direcção Financeira / Administração</div>
            </div>
            
            <div style="margin-top: 20px; text-align: right; font-size: 7px; color: #94a3b8;">
              Documento Processado por INVERNO ERP - Sistema Certificado de Gestão de Recursos Humanos
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getINSSGuideHTML(data: any) {
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '' };
    return `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 40px; }
              .box { border: 2px solid #000; padding: 20px; max-width: 600px; margin: auto; }
              .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
              .bold { font-weight: bold; }
              .header { text-align: center; border-bottom: 3px double #000; margin-bottom: 20px; padding-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="header"><h2>GUIA DE PAGAMENTO INSS (SISSMO)</h2><p>${this.months[this.selectedMonth - 1]} / ${this.selectedYear}</p></div>
              <div class="row"><span>Empresa:</span><span class="bold">${company.name}</span></div>
              <div class="row"><span>NUIT:</span><span class="bold">${company.nif || '---'}</span></div>
              <div class="row"><span>Total de Segurados:</span><span class="bold">${data.records.length}</span></div>
              <br>
              <div class="row"><span>Massa Salarial:</span><span class="bold">${data.totals.grossSalary.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span></div>
              <div class="row"><span>Trabalhador (3%):</span><span class="bold">${data.totals.inssEmployee.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span></div>
              <div class="row"><span>Empresa (4%):</span><span class="bold">${data.totals.inssEmployer.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span></div>
              <hr>
              <div class="row" style="font-size: 1.2em"><span><b>TOTAL A PAGAR:</b></span><span class="bold">${(data.totals.inssEmployee + data.totals.inssEmployer).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span></div>
            </div>
          </body>
        </html>
    `;
  }

  private getIRPSResumeHTML(data: any) {
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '' };
    return `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 40px; }
              .header { text-align: center; border-bottom: 2px solid #f97316; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background: #fff7ed; color: #ea580c; text-transform: uppercase; font-size: 11px; }
              .total { background: #fef2f2; font-weight: bold; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="color: #ea580c; margin: 0;">RECAPEAMENTO DE IRPS (MODELO M/20)</h1>
              <p>Período: ${this.months[this.selectedMonth - 1]} ${this.selectedYear} | Empresa: ${company.name}</p>
            </div>
            <table>
              <thead>
                <tr><th>Cod.</th><th>Funcionário</th><th>Rendimento Coletável</th><th>Retenção na Fonte</th></tr>
              </thead>
              <tbody>
                ${data.records.map((p: any) => `
                  <tr><td>${p.employeeCode}</td><td>${p.employeeName}</td><td>${(p.grossSalary - p.inssEmployee).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td><td><b>${Number(p.irps).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</b></td></tr>
                `).join('')}
                <tr class="total"><td colspan="3" style="text-align: right">IMPOSTO TOTAL A PAGAR:</td><td>${data.totals.irps.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td></tr>
              </tbody>
            </table>
          </body>
        </html>
    `;
  }

  private getSeniorityMapHTML(employees: any[]) {
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '' };
    const calculateTenure = (hireDate: string) => {
      if (!hireDate) return '---';
      const start = new Date(hireDate);
      const now = new Date();
      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();
      if (months < 0) { years--; months += 12; }
      return `${years} anos, ${months} meses`;
    };
    return `
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Arial; padding: 40px; }
              .header { border-bottom: 2px solid #06b6d4; padding-bottom: 15px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
              th { background: #ecfeff; color: #0891b2; text-transform: uppercase; font-size: 10px; font-weight: 800; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="color: #0891b2; margin: 0; font-size: 20px;">MAPA DE ANTIGUIDADE</h1>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">Posição em ${new Date().toLocaleDateString()} | Empresa: ${company.name}</p>
            </div>
            <table>
              <thead>
                <tr><th>Cod.</th><th>Funcionário</th><th>Cargo</th><th>Data Admissão</th><th>Tempo de Casa</th></tr>
              </thead>
              <tbody>
                ${employees.map(e => `
                  <tr><td><b>${e.code}</b></td><td>${e.name}</td><td>${e.position || '---'}</td><td>${e.hireDate ? new Date(e.hireDate).toLocaleDateString() : '---'}</td><td><b>${calculateTenure(e.hireDate)}</b></td></tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
    `;
  }

  private getVacationPlanHTML(absences: any[]) {
    const company = this.dataService.getCurrentCompany() || { name: 'Empresa', nif: '' };
    return `
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Arial; padding: 40px; }
              .header { border-bottom: 2px solid #a855f7; padding-bottom: 15px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #f3e8ff; padding: 12px; text-align: left; }
              th { background: #faf5ff; color: #7e22ce; text-transform: uppercase; font-size: 10px; font-weight: 800; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="color: #7e22ce; margin: 0; font-size: 20px;">PLANO ANUAL DE FÉRIAS - ${this.selectedYear}</h1>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">Empresa: ${company.name}</p>
            </div>
            <table>
              <thead>
                <tr><th>Funcionário</th><th>Data Início</th><th>Data Fim</th><th>Duração</th><th>Observações</th></tr>
              </thead>
              <tbody>
                ${absences.map(a => `
                  <tr><td><b>${a.employee?.name || '---'}</b></td><td>${new Date(a.startDate).toLocaleDateString()}</td><td>${new Date(a.endDate).toLocaleDateString()}</td><td>${a.days} dias</td><td>${a.reason || 'Conforme plano'}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
    `;
  }
}
