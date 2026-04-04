import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';
import { valorPorExtenso } from '../../shared/utils';

@Component({
  selector: 'app-petty-cash-vouchers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0] text-xs font-sans">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-3 py-2 flex justify-between items-center shrink-0 shadow-sm">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">receipt_long</span>
          <span class="font-bold">Vales de Caixa / Adiantamentos</span>
        </div>
        <div class="flex items-center gap-2">
           <button (click)="openAddModal()" class="flex items-center gap-1 bg-white text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-sm text-xs font-bold transition-colors shadow-sm">
            <span class="material-symbols-outlined text-[16px]">add</span>
            Novo Vale
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 p-3 overflow-hidden flex flex-col">
        <div class="bg-white border border-gray-300 rounded-sm shadow-sm flex-1 flex flex-col overflow-hidden">
          <div class="overflow-auto flex-1">
            <table class="w-full text-left border-collapse">
              <thead class="bg-gray-100 text-gray-600 sticky top-0 border-b border-gray-300 shadow-sm z-10">
                <tr>
                  <th class="px-3 py-2 font-bold w-20">Nº Vale</th>
                  <th class="px-3 py-2 font-bold w-24">Data</th>
                  <th class="px-3 py-2 font-bold">Titular</th>
                  <th class="px-3 py-2 font-bold w-24">Emissor</th>
                  <th class="px-3 py-2 font-bold">Motivo</th>
                  <th class="px-3 py-2 font-bold w-32 text-center">Tipo</th>
                  <th class="px-3 py-2 font-bold w-24 text-center">Desconto</th>
                  <th class="px-3 py-2 font-bold w-32 text-right">Valor</th>
                  <th class="px-3 py-2 font-bold w-24 text-center">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let v of vouchers" class="hover:bg-blue-50 transition-colors">
                  <td class="px-3 py-2 font-medium text-gray-700">{{ v.number }}</td>
                  <td class="px-3 py-2">{{ v.date | date:'dd/MM/yyyy' }}</td>
                  <td class="px-3 py-2 font-medium">{{ v.titularName }}</td>
                  <td class="px-3 py-2 text-[10px] text-gray-500">{{ v.issuedBy || '-' }}</td>
                  <td class="px-3 py-2 text-gray-600 truncate max-w-[150px]" [title]="v.reason">{{ v.reason }}</td>
                  <td class="px-3 py-2 text-center">
                    <span *ngIf="v.isPersonalAdvance" class="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Adiantamento</span>
                    <span *ngIf="!v.isPersonalAdvance" class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Despesa Empresa</span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span *ngIf="v.isPersonalAdvance && v.isDeducted" class="text-green-600 font-bold material-symbols-outlined text-[16px]">check_circle</span>
                    <span *ngIf="v.isPersonalAdvance && !v.isDeducted" class="text-gray-400 material-symbols-outlined text-[16px]">pending</span>
                    <span *ngIf="!v.isPersonalAdvance">-</span>
                  </td>
                  <td class="px-3 py-2 text-right font-bold text-gray-800">{{ v.amount | number:'1.2-2' }} MT</td>
                  <td class="px-3 py-2 text-center">
                    <div class="flex justify-center gap-2">
                       <button (click)="printVoucher(v)" class="text-gray-500 hover:text-blue-600 transition-colors" title="Imprimir">
                         <span class="material-symbols-outlined text-[16px]">print</span>
                       </button>
                       <button (click)="deleteVoucher(v.id)" class="text-gray-500 hover:text-red-600 transition-colors" title="Eliminar">
                         <span class="material-symbols-outlined text-[16px]">delete</span>
                       </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="vouchers.length === 0">
                  <td colspan="9" class="px-3 py-8 text-center text-gray-500 italic">
                    Nenhum vale de caixa registado. Clique em "Novo Vale" para adicionar.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div *ngIf="showModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-gray-200">
          <div class="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-4 py-3 flex justify-between items-center">
            <h3 class="font-bold text-sm">Novo Vale de Caixa</h3>
            <button (click)="closeModal()" class="text-white hover:text-red-200 transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div class="p-6 bg-gray-50 flex-1 overflow-auto">
             <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="flex flex-col gap-1">
                   <label class="text-xs font-bold text-gray-700">Data *</label>
                   <input type="date" [(ngModel)]="currentDoc.date" class="border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                </div>
                <div class="flex flex-col gap-1">
                   <label class="text-xs font-bold text-gray-700">Valor (MT) *</label>
                   <input type="number" [(ngModel)]="currentDoc.amount" (input)="onAmountChange()" min="0" step="0.01" class="border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-right font-mono">
                </div>
             </div>
             
             <div class="mb-4">
                <label class="text-xs font-bold text-gray-700 mb-1 block">A quantia de: (por extenso)</label>
                <input type="text" [(ngModel)]="currentDoc.amountInWords" class="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none italic placeholder-gray-400" placeholder="Ex: Mil e quinhentos meticais...">
             </div>

             <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="flex flex-col gap-1">
                   <label class="text-xs font-bold text-gray-700">Tipo de Saída *</label>
                   <select [(ngModel)]="currentDoc.isPersonalAdvance" class="border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                     <option [ngValue]="false">Despesa da Empresa (Não desconta no salário)</option>
                     <option [ngValue]="true">Adiantamento Temporário / Pessoal (Desconta no salário)</option>
                   </select>
                </div>
                
                <div class="flex flex-col gap-1 relative">
                   <label class="text-xs font-bold text-gray-700">Funcionário/Titular (Opcional se Despesa Empresa)</label>
                   <select *ngIf="currentDoc.isPersonalAdvance" [(ngModel)]="currentDoc.employeeId" (change)="onEmployeeSelect()" class="border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                     <option value="">Selecione um funcionário...</option>
                     <option *ngFor="let e of employees" [value]="e.id">{{ e.code }} - {{ e.name }}</option>
                   </select>
                   <div *ngIf="!currentDoc.isPersonalAdvance" class="relative">
                      <input type="text" [(ngModel)]="currentDoc.titularName" (input)="onTitularInputChange()" (blur)="onTitularBlur()" class="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Nome do Titular">
                      
                      <!-- Suggestions Dropdown -->
                      <div *ngIf="showSuggestions && filteredEntities.length > 0" class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-[110] max-h-48 overflow-auto">
                        <div *ngFor="let entity of filteredEntities" (mousedown)="selectEntity(entity)" class="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center">
                          <span class="font-medium text-gray-800">{{ entity.name }}</span>
                          <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase font-bold">{{ entity.type }}</span>
                        </div>
                      </div>
                   </div>
                </div>
             </div>

             <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-700">Motivo do Adiantamento/Despesa *</label>
                <textarea [(ngModel)]="currentDoc.reason" rows="2" class="border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none resize-none" placeholder="Ex: Transporte para finanças..."></textarea>
             </div>
          </div>
          
          <div class="bg-white border-t border-gray-200 p-3 flex justify-end gap-2">
            <button (click)="closeModal()" class="px-4 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium transition-colors border border-gray-200">Cancelar</button>
            <button (click)="saveVoucher()" [disabled]="isSaving" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-6 rounded shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
              <span *ngIf="isSaving" class="material-symbols-outlined text-[16px] animate-spin">refresh</span>
              Gravar
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class PettyCashVouchersComponent implements OnInit {
  vouchers: any[] = [];
  employees: any[] = [];
  customers: any[] = [];
  suppliers: any[] = [];
  filteredEntities: any[] = [];
  showSuggestions = false;
  noResultsFound = false;
  showModal = false;
  isSaving = false;

  currentDoc: any = {
    date: new Date().toISOString().split('T')[0],
    amount: null,
    amountInWords: '',
    titularName: '',
    employeeId: '',
    reason: '',
    isPersonalAdvance: false
  };

  constructor(
    private dataService: DataService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.loadVouchers();
    this.loadAllEntities();
  }

  loadVouchers() {
    const cid = this.dataService.getCurrentCompany()?.id || '';
    const baseUrl = 'http://192.168.88.25:3000'; // Standard for this project
    const url = `${baseUrl}/treasury/vouchers?companyId=${cid}`;

    this.http.get<any[]>(url, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    }).subscribe({
      next: (data) => {
        this.vouchers = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Failed to load vouchers:', e);
        this.vouchers = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadAllEntities() {
    const cid = this.dataService.getCurrentCompany()?.id || '';
    const baseUrl = 'http://192.168.88.25:3000';
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` };

    // Load Employees
    this.http.get<any[]>(`${baseUrl}/hr/employees?companyId=${cid}`, { headers }).subscribe({
      next: (data) => this.employees = Array.isArray(data) ? data : [],
      error: (e) => console.error('Error loading employees', e)
    });

    // Load Customers
    this.http.get<any[]>(`${baseUrl}/customers?companyId=${cid}`, { headers }).subscribe({
      next: (data) => this.customers = Array.isArray(data) ? data : [],
      error: (e) => console.error('Error loading customers', e)
    });

    // Load Suppliers
    this.http.get<any[]>(`${baseUrl}/suppliers?companyId=${cid}`, { headers }).subscribe({
      next: (data) => this.suppliers = Array.isArray(data) ? data : [],
      error: (e) => console.error('Error loading suppliers', e)
    });
  }

  onTitularInputChange() {
    const term = this.currentDoc.titularName?.toLowerCase() || '';
    if (term.length < 2) {
      this.filteredEntities = [];
      this.showSuggestions = false;
      return;
    }

    const results: any[] = [];

    this.employees.filter(e => e.name.toLowerCase().includes(term))
      .forEach(e => results.push({ id: e.id, name: e.name, type: 'Funcionário', entityType: 'EMPLOYEE' }));

    this.customers.filter(c => c.name.toLowerCase().includes(term))
      .forEach(c => results.push({ id: c.id, name: c.name, type: 'Cliente', entityType: 'CUSTOMER' }));

    this.suppliers.filter(s => s.name.toLowerCase().includes(term))
      .forEach(s => results.push({ id: s.id, name: s.name, type: 'Fornecedor', entityType: 'SUPPLIER' }));

    this.filteredEntities = results.slice(0, 10);
    this.showSuggestions = results.length > 0;
    this.noResultsFound = results.length === 0 && term.length >= 3;
  }

  selectEntity(entity: any) {
    this.currentDoc.titularName = `${entity.type}: ${entity.name}`;
    if (entity.entityType === 'EMPLOYEE') {
      this.currentDoc.employeeId = entity.id;
    } else {
      this.currentDoc.employeeId = '';
    }
    this.showSuggestions = false;
    this.noResultsFound = false;
    this.filteredEntities = [];
  }

  onAmountChange() {
    if (this.currentDoc.amount) {
      this.currentDoc.amountInWords = valorPorExtenso(this.currentDoc.amount);
    } else {
      this.currentDoc.amountInWords = '';
    }
  }

  onTitularBlur() {
    // Delay hide to allow mousedown on suggestions to trigger first
    setTimeout(() => {
      const val = this.currentDoc.titularName || '';

      // If it's a manual name (not selected from entity) and no results were found, suggest registration
      if (this.noResultsFound && val.length > 3 && !val.includes(':')) {
        this.suggestRegistration();
      }
      this.showSuggestions = false;
      this.noResultsFound = false;
    }, 200);
  }

  suggestRegistration() {
    const name = this.currentDoc.titularName;
    const type = prompt(
      `A entidade "${name}" não foi encontrada no sistema.\n\n` +
      `Para que tipo de entidade deseja sugerir o cadastro?\n` +
      `1 - Funcionário\n` +
      `2 - Cliente\n` +
      `3 - Fornecedor\n` +
      `4 - Eventual (Não precisa de registo)\n\n` +
      `Digite o número correspondente:`,
      "4"
    );

    if (type === '1') {
      this.toaster.showInfo('Informação', 'Sugestão: Realize o cadastro no módulo de Recursos Humanos.');
    } else if (type === '2') {
      this.toaster.showInfo('Informação', 'Sugestão: Realize o cadastro no módulo de Vendas (Clientes).');
    } else if (type === '3') {
      this.toaster.showInfo('Informação', 'Sugestão: Realize o cadastro no módulo de Compras (Fornecedores).');
    }
  }

  openAddModal() {
    const cid = this.dataService.getCurrentCompany()?.id || '';
    const baseUrl = 'http://192.168.88.25:3000';

    this.currentDoc = {
      companyId: cid,
      date: new Date().toISOString().split('T')[0],
      amount: null,
      amountInWords: '',
      titularName: '',
      employeeId: '',
      reason: '',
      isPersonalAdvance: false,
      number: 'Gerando...'
    };

    // Fetch next number suggestion using http (Zone-aware)
    this.http.get<any>(`${baseUrl}/treasury/vouchers/next-number?companyId=${cid}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    }).subscribe({
      next: (data) => {
        this.currentDoc.number = data.number;
        this.showModal = true;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Error getting next number', e);
        this.currentDoc.number = '';
        this.showModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeModal() {
    this.showModal = false;
  }

  onEmployeeSelect() {
    if (this.currentDoc.employeeId) {
      const emp = this.employees.find(e => e.id === this.currentDoc.employeeId);
      if (emp) this.currentDoc.titularName = emp.name;
    }
  }

  saveVoucher() {
    if (!this.currentDoc.amount || !this.currentDoc.reason) {
      this.toaster.showError('Erro', 'Preencha os campos obrigatórios (Valor e Motivo)');
      return;
    }

    if (this.currentDoc.isPersonalAdvance && !this.currentDoc.employeeId) {
      this.toaster.showError('Erro', 'Selecione o funcionário para o adiantamento.');
      return;
    }

    if (!this.currentDoc.isPersonalAdvance && !this.currentDoc.titularName) {
      this.toaster.showError('Erro', 'Informe o nome do titular (quem levantou o valor).');
      return;
    }

    this.isSaving = true;

    const baseUrl = window.location.hostname === 'localhost' ? 'http://192.168.88.25:3000' : '';
    this.http.post(`${baseUrl}/treasury/vouchers`, this.currentDoc).subscribe({
      next: (data: any) => {
        this.toaster.showSuccess('Sucesso', 'Vale gravado e descontos programados (se aplicável).');
        this.isSaving = false;
        this.closeModal();
        this.loadVouchers();

        if (confirm('Deseja imprimir o vale agora?')) {
          this.printVoucher(data);
        }
      },
      error: (e) => {
        console.error(e);
        this.isSaving = false;
        this.toaster.showError('Erro', 'Não foi possível gravar.');
      }
    });
  }

  deleteVoucher(id: string) {
    if (!confirm('Tem a certeza que deseja eliminar este vale? Se já foi descontado no salário não deve ser eliminado.')) return;

    const baseUrl = window.location.hostname === 'localhost' ? 'http://192.168.88.25:3000' : '';
    this.http.delete(`${baseUrl}/treasury/vouchers/${id}`).subscribe({
      next: () => {
        this.toaster.showSuccess('Eliminado', 'Vale eliminado com sucesso.');
        this.loadVouchers();
      },
      error: (e) => console.error('Error deleting voucher', e)
    });
  }

  printVoucher(v: any) {
    const comp = this.dataService.getCurrentCompany() || {};
    const dateParts = (v.date || '').split('-');
    const [year, month, day] = dateParts.length === 3 ? dateParts : ['', '', ''];

    const singleVoucherHtml = (titleExtras: string) => `
         <div class="container">
            <div class="header">
               <div class="company">
                  <h1>${comp?.name || 'EMPRESA'}</h1>
                  <p>${comp?.address || ''}</p>
                  <p><b>NUIT: ${comp?.nif || ''}</b></p>
               </div>
               <div>
                  <span class="title">VALE DE CAIXA Nº. ${v.number || '_______'}</span>
                  <div style="text-align: right; margin-top: 5px;">
                    <span style="font-size: 10px; font-style: italic; color: #666;">Emitido por: ${v.issuedBy || 'Sistema'}</span>
                  </div>
                  <div style="text-align: right; margin-top: 5px;">
                    <span style="font-size: 10px; font-style: italic; color: #666;">${titleExtras}</span>
                  </div>
                  <div style="clear: both"></div>
                  <div style="text-align: right; margin-top: 10px;">
                    <b>MT:</b> <span class="amount-box">#${Number(v.amount).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}MT</span>
                  </div>
               </div>
            </div>
            
            <div class="flex-row">
               <span class="label">Requisito a quantia de: </span>
               <span class="value" style="width: 70%;">${v.amountInWords || '________________________'}</span>
            </div>
            <div class="row" style="border-bottom: 1px solid #000; height: 20px;"></div>
            <div class="row" style="border-bottom: 1px solid #000; height: 20px;"></div>
            
            <div class="flex-row">
               <span class="label">Nome do titular: </span>
               <span class="value" style="width: 80%;">${v.titularName}</span>
            </div>
            
            <div class="flex-row">
               <span class="label">Assinatura: </span>
               <span class="value" style="width: 85%; color: transparent;">-</span>
            </div>
            
            <div class="flex-row">
               <span class="label">Motivo do Adiantamento </span>
               <span class="value" style="width: 70%;">${v.reason}</span>
            </div>
            
            <table class="footer-table">
               <tr>
                  <th width="25%">Data de Emissão</th>
                  <th width="25%">Autorização:</th>
                  <th width="25%">Obs:</th>
                  <th width="25%">O Caixa</th>
               </tr>
               <tr>
                  <td height="60px" style="vertical-align: bottom;">
                     <div class="date-box">${day} / ${month} / ${year}</div>
                  </td>
                  <td style="vertical-align: bottom;">
                     _____ / _____ / _________
                  </td>
                  <td></td>
                  <td style="vertical-align: bottom;">
                     <div class="date-box">${day} / ${month} / ${year}</div>
                  </td>
               </tr>
            </table>
         </div>
    `;

    const html = `
      <html>
      <head>
         <title>Vale de Caixa</title>
         <style>
            @page { size: A4 landscape; margin: 0; }
            body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background: #fff; }
            .a4-landscape-page {
               width: 297mm;
               height: 210mm;
               display: flex;
               box-sizing: border-box;
               padding: 5mm;
            }
            .half-page {
               flex: 1;
               display: flex;
               flex-direction: column;
               padding: 5mm;
               box-sizing: border-box;
            }
            .cut-line {
               width: 0;
               border-right: 1px dashed #999;
               margin: 5mm 0;
            }

            .container { width: 100%; max-width: 100%; padding: 0; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .company h1 { font-size: 14px; margin: 0 0 5px 0; }
            .company p { font-size: 12px; margin: 2px 0; }
            .title { font-size: 16px; font-weight: bold; margin-left: 20px; }
            .amount-box { border: 1px solid #000; padding: 5px 20px; font-size: 16px; margin-top: 10px; display: inline-block; float: right; color: blue; }
            
            .row { margin-bottom: 20px; line-height: 20px; }
            .label { font-size: 14px; font-weight: bold; display: inline-block; cursor: default; }
            .value { border-bottom: 1px solid #000; flex-grow: 1; padding: 0 10px; color: blue; min-width: 150px; display: inline-block; font-size: 14px; }
            .flex-row { display: flex; align-items: flex-end; margin-bottom: 20px; }
            
            table.footer-table { width: 100%; border-collapse: collapse; margin-top: 30px; border: 1px solid #000; }
            table.footer-table th, table.footer-table td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px; }
            table.footer-table th { font-weight: bold; height: 20px; background: #f9f9f9; }
            .date-box { color: blue; margin-top: 15px; }
         </style>
      </head>
      <body>
         <div class="a4-landscape-page">
           <div class="half-page">
             ${singleVoucherHtml('Original')}
           </div>
           <div class="cut-line"></div>
           <div class="half-page">
             ${singleVoucherHtml('Duplicado')}
           </div>
         </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(html);
    iframe.contentWindow?.document.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  }
}
