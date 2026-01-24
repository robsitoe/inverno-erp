import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesDocument } from '../../shared/models';
import { PrintSettings } from './print-settings-modal.component';

@Component({
  selector: 'app-sales-document-print',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="print-container" *ngIf="document">
      <div *ngFor="let copy of getCopies(); let i = index" class="page-container">
        
        <!-- Page Header -->
        <div class="header">
          <div class="company-info">
            <div class="logo-container" *ngIf="companyInfo?.logoUrl">
                <img [src]="companyInfo.logoUrl" alt="Logo" class="company-logo">
            </div>
            <div class="logo-placeholder" *ngIf="!companyInfo?.logoUrl">
                <!-- Placeholder for logo -->
                <span class="material-symbols-outlined logo-icon">apartment</span>
            </div>
            <h1 class="company-name">{{ companyInfo?.name || 'INVERNO ERP' }}</h1>
            <p>{{ companyInfo?.address || 'Rua Exemplo, 123' }}</p>
            <p>{{ companyInfo?.city || '1000-001 Lisboa' }}</p>
            <p>NIF: {{ companyInfo?.nif || '500 000 000' }}</p>
          </div>
          <div class="doc-info">
            <h2 class="doc-title">{{ getDocTitle() }}</h2>
            <div class="doc-meta">
              <p><strong>Nº Doc:</strong> {{ document.documentNumber }}</p>
              <p><strong>Data:</strong> {{ document.date | date:'dd/MM/yyyy' }}</p>
              <p><strong>Vencimento:</strong> {{ document.dueDate | date:'dd/MM/yyyy' }}</p>
              <p class="copy-label">{{ getCopyLabel(i) }}</p>
            </div>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="customer-section">
          <div class="customer-box">
            <h3>Exmo.(s) Sr.(s)</h3>
            <p class="customer-name">{{ document.customerName }}</p>
            <p>{{ document.customerAddress }}</p>
            <p><strong>NIF:</strong> {{ document.customerNif }}</p>
          </div>
        </div>

        <!-- Lines Table -->
        <table class="lines-table">
          <thead>
            <tr>
              <th class="text-left">Artigo</th>
              <th class="text-left">Descrição</th>
              <th class="text-right">Qtd</th>
              <th class="text-right">Preço Unit.</th>
              <th class="text-right">Desc. %</th>
              <th class="text-right">IVA</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of document.lines">
              <td>{{ line.articleCode }}</td>
              <td>{{ line.articleName }}</td>
              <td class="text-right">{{ line.quantity }}</td>
              <td class="text-right">{{ line.unitPrice | number:'1.2-2' }} {{ getCurrencySymbol() }}</td>
              <td class="text-right">{{ line.discount }}%</td>
              <td class="text-right">{{ line.ivaRate }}%</td>
              <td class="text-right">{{ line.total | number:'1.2-2' }} {{ getCurrencySymbol() }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <div class="vat-summary">
            <h4>Resumo de IVA</h4>
            <table>
              <thead>
                <tr>
                  <th>Taxa</th>
                  <th>Incidência</th>
                  <th>Valor IVA</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let vat of getVatSummary()">
                  <td>{{ vat.rate }}%</td>
                  <td>{{ vat.base | number:'1.2-2' }} {{ getCurrencySymbol() }}</td>
                  <td>{{ vat.amount | number:'1.2-2' }} {{ getCurrencySymbol() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="final-totals">
            <div class="total-row">
              <span>Mercadoria:</span>
              <span>{{ document.subtotal | number:'1.2-2' }} {{ getCurrencySymbol() }}</span>
            </div>
            <div class="total-row">
              <span>Descontos:</span>
              <span>{{ document.discounts | number:'1.2-2' }} {{ getCurrencySymbol() }}</span>
            </div>
            <div class="total-row">
              <span>Total IVA:</span>
              <span>{{ document.totalIva | number:'1.2-2' }} {{ getCurrencySymbol() }}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL A PAGAR:</span>
              <span>{{ document.total | number:'1.2-2' }} {{ getCurrencySymbol() }}</span>
            </div>
          </div>
        </div>

        <!-- Banking Info -->
        <div class="banking-info" *ngIf="settings?.showBankingInfo">
          <h4>Dados para Pagamento</h4>
          <p><strong>IBAN:</strong> {{ companyInfo?.iban || 'PT50 0000 0000 0000 0000 0000 0' }}</p>
          <p><strong>SWIFT:</strong> {{ companyInfo?.swift || 'BANKPTPL' }}</p>
        </div>

        <!-- Observations -->
        <div class="observations" *ngIf="settings?.showObservations && document.notes">
          <h4>Observações</h4>
          <p>{{ document.notes }}</p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Processado por computador © Inverno ERP {{ currentUser ? '- Operador: ' + currentUser.name : '' }}</p>
          <p>Pág. 1/1</p>
        </div>

        <div class="page-break" *ngIf="i < getCopies().length - 1"></div>
      </div>
    </div>
  `,
  styles: [`
    /* Print Styles */
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      
      body {
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-container {
        display: block !important;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 9999;
        background: white;
      }
    }

    /* Screen Styles (Hide by default) */
    .print-container {
      display: none;
      font-family: 'Inter', sans-serif;
      color: #1f2937;
      line-height: 1.5;
    }

    /* Layout */
    .page-container {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      margin: 0 auto;
      background: white;
      position: relative;
      box-sizing: border-box;
    }

    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
    }

    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin: 10px 0 10px 0;
    }

    .logo-container {
        margin-bottom: 15px;
    }

    .company-logo {
        max-height: 80px;
        max-width: 200px;
        object-fit: contain;
    }

    .logo-placeholder {
        width: 80px;
        height: 80px;
        background-color: #f3f4f6;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 15px;
    }

    .logo-icon {
        font-size: 40px;
        color: #9ca3af;
    }

    .doc-title {
      font-size: 20px;
      font-weight: bold;
      text-align: right;
      margin: 0 0 10px 0;
    }

    .doc-meta p {
      text-align: right;
      margin: 2px 0;
    }

    .copy-label {
      font-weight: bold;
      text-transform: uppercase;
      color: #6b7280;
      margin-top: 5px !important;
      font-size: 12px;
    }

    .customer-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .customer-box {
      width: 50%;
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      background: #f9fafb;
    }

    .customer-name {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 5px;
    }

    .lines-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .lines-table th {
      background: #f3f4f6;
      padding: 10px;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
      font-size: 12px;
      text-transform: uppercase;
    }

    .lines-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }

    .text-right { text-align: right; }
    .text-left { text-align: left; }

    .totals-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .vat-summary table {
      width: 300px;
      font-size: 12px;
      border-collapse: collapse;
    }

    .vat-summary th, .vat-summary td {
      text-align: right;
      padding: 4px;
      border-bottom: 1px solid #e5e7eb;
    }

    .final-totals {
      width: 300px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .grand-total {
      font-weight: bold;
      font-size: 16px;
      border-top: 2px solid #000;
      border-bottom: double 4px #000;
      margin-top: 10px;
      padding: 10px 0;
    }

    .banking-info, .observations {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
    }

    .footer {
      position: absolute;
      bottom: 15mm;
      left: 15mm;
      right: 15mm;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }

    .page-break {
      page-break-after: always;
    }
  `]
})
export class SalesDocumentPrintComponent {
  @Input() document: SalesDocument | null = null;
  @Input() settings: PrintSettings | null = null;

  companyInfo: any = null;
  currentUser: any = null;

  ngOnInit() {
    this.refreshCompanyInfo();
  }

  refreshCompanyInfo() {
    const storedCompany = localStorage.getItem('erp_company_info');
    if (storedCompany) {
      this.companyInfo = JSON.parse(storedCompany);
    }

    const storedUser = localStorage.getItem('erp_current_user');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }
  }

  getCopies(): number[] {
    if (!this.settings) return [1];
    return Array(this.settings.copies).fill(0);
  }

  getCopyLabel(index: number): string {
    const labels = ['ORIGINAL', 'DUPLICADO', 'TRIPLICADO', 'QUADRUPLICADO'];
    return labels[index] || 'CÓPIA';
  }

  getDocTitle(): string {
    if (!this.document) return '';
    const types: { [key: string]: string } = {
      'FA': 'FATURA',
      'VD': 'VENDA A DINHEIRO',
      'NC': 'NOTA DE CRÉDITO',
      'ND': 'NOTA DE DÉBITO',
      'GR': 'GUIA DE REMESSA'
    };
    return types[this.document.documentType] || this.document.documentType;
  }

  getCurrencySymbol(): string {
    return this.companyInfo?.currency || '€';
  }

  getVatSummary() {
    if (!this.document) return [];

    const summary = new Map<number, { rate: number, base: number, amount: number }>();

    this.document.lines.forEach(line => {
      const rate = line.ivaRate;
      const current = summary.get(rate) || { rate, base: 0, amount: 0 };

      current.base += line.subtotal;
      current.amount += line.ivaAmount;

      summary.set(rate, current);
    });

    return Array.from(summary.values()).sort((a, b) => a.rate - b.rate);
  }
}
