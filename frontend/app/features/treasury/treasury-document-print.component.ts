import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreasuryDocument, WorkflowStatus } from '../../shared/models';
import { PrintSettings } from '../../shared/components/print-settings-modal.component';

@Component({
  selector: 'app-treasury-document-print',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="print-container receipt-format" *ngIf="document">
      <div *ngFor="let copy of getCopies(); let i = index" class="page-container">
        
        <!-- Header Section -->
        <div class="header-section">
          <div class="company-column">
            <div class="logo-wrapper">
               <img *ngIf="companyInfo?.logoUrl" [src]="companyInfo.logoUrl" class="receipt-logo">
               <div *ngIf="!companyInfo?.logoUrl" class="logo-placeholder">
                  <span class="material-symbols-outlined">payments</span>
                  <span class="logo-text">{{ companyInfo?.name }}</span>
               </div>
            </div>
            
            <div class="company-details">
              <h2 class="company-legal-name">{{ companyInfo?.name }}</h2>
              <p>{{ companyInfo?.address }}</p>
              <p>{{ companyInfo?.city || 'Maputo' }}, {{ companyInfo?.country || 'Moçambique' }}</p>
              <div class="contact-grid">
                <span>Telef: {{ companyInfo?.phone || '-' }}</span>
                <span>Fax: {{ companyInfo?.fax || '-' }}</span>
              </div>
              <p>Contribuinte N.º: {{ companyInfo?.nif }}</p>
              <p>Capital Social: {{ (companyInfo?.capitalSocial || 0) | number:'1.2-2' }} MT</p>
              <p>Cons. Reg. Com. {{ companyInfo?.regCom || '-' }}</p>
              <p>Matrícula N.º {{ companyInfo?.matricula || '-' }}</p>
              <p>E-mail: {{ companyInfo?.email }}</p>
            </div>
          </div>

          <div class="customer-column text-right">
             <div class="customer-address-box">
                <p class="salutation">Exmo.(s) Sr.(s)</p>
                <p class="customer-name"><strong>{{ document.entityName }}</strong></p>
                <p>{{ document.entityAddress || 'Endereço não disponível' }}</p>
                <p>{{ document.entityCity || '' }}</p>
             </div>
             
             <div class="document-title-meta">
                <h1 class="document-type-title">{{ getDocTitle() }} N.º {{ document.number }}</h1>
                
                <table class="meta-data-table">
                   <thead>
                      <tr>
                        <th>Moeda</th>
                        <th>Data Doc.</th>
                        <th>V/N.º Contrib.</th>
                        <th>Entidade</th>
                        <th>Pág.</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr>
                        <td>{{ getCurrencySymbol() }}</td>
                        <td>{{ document.date | date:'dd/MM/yyyy' }}</td>
                        <td>{{ document.entityNif || '-' }}</td>
                        <td>{{ document.entityCode }}</td>
                        <td>1</td>
                      </tr>
                   </tbody>
                </table>
                <div class="copy-indicator">{{ getCopyLabel(i) }}</div>
             </div>
          </div>
        </div>

        <!-- Narrative Section -->
        <div class="narrative-section">
          <p>
            Recebemos de V. Exas. a quantia de {{ document.amount | number:'1.2-2' }} 
            ({{ getAmountInWords(document.amount) }}).
            Pago em {{ getPaymentMethodDisplay() }} no dia {{ document.date | date:'dd.MM.yyyy' }}
          </p>
          <p class="mt-4">Recebemos de V. Exas. para pagamento do(s) seguinte(s) documento(s):</p>
        </div>

        <!-- Details Table -->
        <div class="items-table-section">
          <table class="receipt-items-table">
            <thead>
              <tr>
                <th>Documento:</th>
                <th>N.º Doc.</th>
                <th>N.º Prt.</th>
                <th class="text-right">Valor Documento</th>
                <th class="text-right">Valor Atribuído</th>
                <th class="text-right">Valor Desconto</th>
                <th class="text-right">Valor Pendente</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of document.lines">
                <td>{{ line.docType || 'FA' }}</td>
                <td>{{ line.docNumber }}</td>
                <td>1</td>
                <td class="text-right">{{ (line.originalAmount || line.amount) | number:'1.2-2' }}</td>
                <td class="text-right">{{ line.amount | number:'1.2-2' }}</td>
                <td class="text-right">{{ (line.discount || 0) | number:'1.2-2' }}</td>
                <td class="text-right">{{ (line.pendingAfter || 0) | number:'1.2-2' }}</td>
              </tr>
              <!-- Filler rows to maintain height if needed -->
              <tr *ngIf="document.lines.length < 3">
                <td colspan="7" class="empty-line">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals Section -->
        <div class="summary-section">
          <div class="summary-row">
            <span class="summary-label">Total</span>
            <div class="summary-value-box text-right">{{ getTotalOriginal() | number:'1.2-2' }}</div>
            <div class="summary-value-box text-right">{{ getTotalAllocated() | number:'1.2-2' }}</div>
            <div class="summary-value-box text-right">{{ getTotalDiscount() | number:'1.2-2' }}</div>
            <div class="summary-value-box text-right">{{ getTotalPending() | number:'1.2-2' }}</div>
          </div>
          
          <div class="final-row">
             <div class="processed-by">Documento Processado por Computador</div>
             <div class="grand-total-receiving">
                <span class="label">Total Recebido ({{ getCurrencySymbol() }})</span>
                <div class="value-box">{{ document.amount | number:'1.2-2' }}</div>
             </div>
          </div>
        </div>

        <!-- Footer / Signature / Stamps -->
        <div class="footer-sign-section">
           <div class="payment-note">
              Pago em {{ getPaymentMethodDisplay() }} no dia {{ document.date | date:'dd.MM.yyyy' }}
           </div>
           
           <div class="signature-area">
              <p>Respeitosos Cumprimentos,</p>
              <div class="stamp-placeholder">
                 <div class="manual-signature-line"></div>
              </div>
           </div>
        </div>

        <div class="page-break" *ngIf="i < getCopies().length - 1"></div>
      </div>
    </div>
  `,
  styles: [`
    @media print {
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-container { display: block !important; background: white !important; }
      .no-print { display: none !important; }
    }
    .print-container {
      display: none;
    }

    .receipt-format {
      font-family: 'Inter', Arial, sans-serif;
      color: #000;
      font-size: 11px;
      line-height: 1.3;
    }

    .page-container {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      margin: 0 auto;
      background: white;
      position: relative;
      box-sizing: border-box;
    }

    /* Header Layout */
    .header-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .company-column { width: 45%; }
    .customer-column { width: 50%; }

    .logo-wrapper { margin-bottom: 10px; }
    .receipt-logo { height: 60px; object-fit: contain; }
    .logo-placeholder { display: flex; align-items: center; gap: 8px; font-weight: bold; color: #444; }
    .logo-placeholder .material-symbols-outlined { font-size: 32px; }

    .company-legal-name { font-size: 13px; font-weight: bold; margin: 0 0 5px 0; text-transform: uppercase; }
    .company-details p, .contact-grid span { margin: 0; color: #333; }
    .contact-grid { display: flex; gap: 15px; margin-top: 5px; }

    .customer-address-box {
      margin-top: 50px;
      margin-bottom: 40px;
      padding-right: 10px;
    }
    .customer-name { font-size: 13px; display: block; margin: 5px 0; }
    .salutation { color: #555; font-style: italic; }

    .document-title-meta {
       display: flex;
       flex-direction: column;
       align-items: flex-end;
    }

    .document-type-title { font-size: 16px; font-weight: bold; margin: 0 0 5px 0; }
    
    .meta-data-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      margin-bottom: 2px;
    }
    .meta-data-table th, .meta-data-table td {
      border: 1px solid #000;
      padding: 3px 5px;
      text-align: center;
      font-size: 10px;
    }
    .meta-data-table th { background: #f0f0f0; font-weight: normal; }
    
    .copy-indicator { font-size: 9px; font-weight: bold; text-transform: uppercase; }

    /* Narrative */
    .narrative-section { margin-bottom: 25px; font-size: 11px; text-align: justify; }

    /* Items Table */
    .receipt-items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }
    .receipt-items-table th {
      border: 1px solid #000;
      background: #fdfdfd;
      padding: 6px 4px;
      font-weight: bold;
      font-size: 10px;
      text-align: left;
    }
    .receipt-items-table td {
      border: 1px solid #000;
      padding: 5px 4px;
      font-size: 10px;
    }
    .empty-line { height: 40px; border-bottom: none; }

    /* Summary */
    .summary-section { margin-top: 0; }
    .summary-row { display: flex; justify-content: flex-end; align-items: center; border: 1px solid #000; border-top: none; }
    .summary-label { width: 120px; text-align: center; font-weight: bold; }
    .summary-value-box {
      border-left: 1px solid #000;
      width: 105px;
      padding: 4px;
      font-family: 'Courier New', monospace;
      font-weight: bold;
    }

    .final-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; }
    .processed-by { font-size: 8px; color: #666; margin-top: 10px; }

    .grand-total-receiving { display: flex; align-items: center; gap: 10px; }
    .grand-total-receiving .label { font-weight: bold; }
    .grand-total-receiving .value-box {
      border: 1px solid #000;
      width: 105px;
      padding: 4px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      background: #fdfdfd;
    }

    /* Footer Sign */
    .footer-sign-section { margin-top: 100px; }
    .payment-note { margin-bottom: 20px; font-style: italic; }
    .signature-area { margin-left: 50px; }
    .manual-signature-line { border-bottom: 1px solid #000; width: 250px; margin-top: 60px; }
  `]
})
export class TreasuryDocumentPrintComponent implements OnInit {
  @Input() document: TreasuryDocument | null = null;
  @Input() settings: PrintSettings | null = null;

  companyInfo: any = null;
  currentUser: any = null;

  ngOnInit() {
    this.refreshCompanyInfo();
  }

  refreshCompanyInfo() {
    const storedCompany = localStorage.getItem('erp_company_info');
    if (storedCompany) this.companyInfo = JSON.parse(storedCompany);
    const storedUser = localStorage.getItem('erp_current_user');
    if (storedUser) this.currentUser = JSON.parse(storedUser);
  }

  getCopies(): number[] {
    if (!this.settings) return [1];
    return Array(this.settings.copies).fill(0);
  }

  getCopyLabel(index: number): string {
    const labels = ['ORIGINAL', 'DUPLICADO', 'TRIPLICADO'];
    return labels[index] || 'CÓPIA';
  }

  getDocTitle(): string {
    if (!this.document) return '';
    return this.document.type === 'RECEIPT' ? 'Recibo' : 'Ordem de Pagamento';
  }

  getCurrencySymbol(): string {
    return this.companyInfo?.currency || 'MT';
  }

  getPaymentMethodDisplay(): string {
    if (!this.document) return 'numerário';
    const pm = this.document.paymentMethod || 'numerário';
    return String(pm).toLowerCase();
  }

  getAmountInWords(amount: any): string {
    const numValue = Number(amount);
    if (isNaN(numValue) || numValue === 0) return 'zero meticais';

    const units = ['', 'UM', 'DOIS', 'TRÊS', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO', 'NOVE'];
    const teens = ['DEZ', 'ONZE', 'DOZE', 'TREZE', 'CATORZE', 'QUINZE', 'DEZASSEIS', 'DEZASSETE', 'DEZOITO', 'DEZANOVE'];
    const tens = ['', '', 'VINTE', 'TRINTA', 'QUARENTA', 'CINQUENTA', 'SESSENTA', 'SETENTA', 'OITENTA', 'NOVENTA'];
    const hundreds = ['', 'CEM', 'DUZENTOS', 'TREZENTOS', 'QUATROCENTOS', 'QUINHENTOS', 'SEISCENTOS', 'SETECENTOS', 'OITOCENTOS', 'NOVECENTOS'];

    const parts = numValue.toFixed(2).split('.');
    let integrals = parseInt(parts[0]);
    let decimals = parseInt(parts[1]);

    const convertChunk = (num: number): string => {
      let str = '';
      if (num >= 100) {
        if (num === 100) return 'CEM';
        str += num > 100 && num < 200 ? 'CENTO' : hundreds[Math.floor(num / 100)];
        num %= 100;
        if (num > 0) str += ' E ';
      }
      if (num >= 20) {
        str += tens[Math.floor(num / 10)];
        num %= 10;
        if (num > 0) str += ' E ';
      }
      if (num >= 10) {
        str += teens[num - 10];
        num = 0;
      }
      if (num > 0) {
        str += units[num];
      }
      return str;
    };

    let result = '';

    // Millions
    if (integrals >= 1000000) {
      const millions = Math.floor(integrals / 1000000);
      result += convertChunk(millions) + (millions === 1 ? ' MILHÃO' : ' MILHÕES');
      integrals %= 1000000;
      if (integrals > 0) result += ' ';
    }

    // Thousands
    if (integrals >= 1000) {
      const thousands = Math.floor(integrals / 1000);
      if (thousands > 1) result += convertChunk(thousands) + ' ';
      result += 'MIL';
      integrals %= 1000;
      if (integrals > 0) result += ' ';
    }

    // Hundreds
    if (integrals > 0) {
      if (result !== '' && integrals < 100) result += ' E ';
      result += convertChunk(integrals);
    }

    result += ' METICAIS';

    if (decimals > 0) {
      result += ' E ' + convertChunk(decimals) + ' CENTAVOS';
    }

    return result.trim();
  }

  getTotalOriginal(): number {
    if (!this.document || !this.document.lines) return 0;
    return this.document.lines.reduce((sum, line) => sum + (line.originalAmount || line.amount || 0), 0);
  }

  getTotalAllocated(): number {
    if (!this.document || !this.document.lines) return 0;
    return this.document.lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  }

  getTotalDiscount(): number {
    if (!this.document || !this.document.lines) return 0;
    return this.document.lines.reduce((sum, line) => sum + (line.discount || 0), 0);
  }

  getTotalPending(): number {
    if (!this.document || !this.document.lines) return 0;
    return this.document.lines.reduce((sum, line) => sum + (line.pendingAfter || 0), 0);
  }
}
