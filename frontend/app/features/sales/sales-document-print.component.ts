import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesDocument } from '../../shared/models';
import { PrintSettings } from '../../shared/components/print-settings-modal.component';

@Component({
  selector: 'app-sales-document-print',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="print-container" *ngIf="document">
      <div *ngFor="let copy of getCopies(); let i = index" class="page-container">
        
        <!-- Header: Logo and Company Info -->
        <div class="doc-header-top">
          <div class="company-branding">
            <div class="logo-area" *ngIf="companyInfo?.logoUrl">
              <img [src]="companyInfo.logoUrl" alt="Logo" class="print-logo">
            </div>
            <div class="company-details">
              <h1 class="comp-name-main">{{ companyInfo?.name || 'INVERNO ERP' }}</h1>
              <p class="comp-sub">{{ companyInfo?.description || 'Distribuição Geral, Lda' }}</p>
              <p>{{ companyInfo?.address }}</p>
              <p>{{ companyInfo?.city }} {{ companyInfo?.postalCode }}</p>
              <p>Telef: {{ companyInfo?.phone }} Fax: {{ companyInfo?.fax || '-' }}</p>
              <p>Contribuinte N.º: {{ companyInfo?.nif }}</p>
              <p>Capital Social: {{ companyInfo?.capital || '5 000,00 MT' }}</p>
              <p>Nº de Entidade Legal: {{ companyInfo?.legalId || '100138395' }}</p>
            </div>
          </div>

          <div class="doc-identifier">
            <div class="customer-envelope">
              <p class="envelope-label">Exmo.(s) Sr.(s)</p>
              <p class="envelope-name">{{ document.customerName }}</p>
              <p class="envelope-address">{{ document.customerAddress }}</p>
              <p class="envelope-city">{{ document.customerCity || 'Maputo' }}</p>
            </div>
            <h2 class="document-type-title">{{ getDocTitle() }} N.º {{ document.documentNumber }}</h2>
          </div>
        </div>

        <!-- Metadata Grids -->
        <div class="metadata-grid-container">
          <!-- Grid 1 -->
          <table class="metadata-table">
            <thead>
              <tr>
                <th>Requisição</th>
                <th>Moeda</th>
                <th>Câmbio</th>
                <th>Data</th>
                <th>Vencimento</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ document.notes?.substring(0, 10) || '' }}</td>
                <td>{{ document.currency || 'MZN' }}</td>
                <td>{{ (document.exchangeRate || 1.0) | number:'1.2-2' }}</td>
                <td>{{ document.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ document.dueDate | date:'dd/MM/yyyy' }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Grid 2 -->
          <table class="metadata-table secondary">
            <thead>
              <tr>
                <th>V/N.º Contrib.</th>
                <th>Desc. Cli.</th>
                <th>Condição Pagamento</th>
                <th>Desc. Fin.</th>
                <th>Zona</th>
                <th>Vend.</th>
                <th>Pag.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ document.customerNif }}</td>
                <td>{{ (document.clientDiscount || 0) | number:'1.2-2' }}</td>
                <td>{{ document.paymentCondition === 'PRONTO' ? 'Pronto Pagamento' : 'A Prazo (Crédito)' }}</td>
                <td>{{ (document.financialDiscount || 0) | number:'1.2-2' }}</td>
                <td>01</td>
                <td>01</td>
                <td>1/1</td>
              </tr>
            </tbody>
          </table>
          <div class="copy-indicator">{{ getCopyLabel(i) }}</div>
        </div>

        <!-- Lines Table -->
        <div class="main-content-table">
          <table class="lines-table-main">
            <thead>
              <tr>
                <th class="col-code">Artigo</th>
                <th class="col-desc">Descrição</th>
                <th class="col-qty">Qtd.</th>
                <th class="col-un">Un.</th>
                <th class="col-price">Pr. Unitário</th>
                <th class="col-disc">Desc.</th>
                <th class="col-tax">IVA</th>
                <th class="col-total">Total Líquido</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of document.lines" class="line-row">
                <td>{{ line.articleCode }}</td>
                <td>{{ line.articleName }}</td>
                <td class="text-right">{{ line.quantity | number:'1.2-2' }}</td>
                <td class="text-center">UN</td>
                <td class="text-right">{{ line.unitPrice | number:'1.2-2' }}</td>
                <td class="text-right">{{ (line.discount || 0) | number:'1.2-2' }}</td>
                <td class="text-right">{{ line.ivaRate | number:'1.1-1' }}</td>
                <td class="text-right">{{ line.subtotal | number:'1.2-2' }}</td>
              </tr>
              <!-- Empty rows to fill space and maintain layout -->
              <tr *ngFor="let empty of getEmptyRows()" class="empty-row">
                <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary and Totals -->
        <div class="footer-summary-container">
          <div class="tax-summary-box">
             <p class="summary-title">Quadro Resumo do IVA</p>
             <table class="tax-table">
               <thead>
                 <tr>
                   <th>Taxa</th>
                   <th>Incidência</th>
                   <th>Valor IVA</th>
                   <th>Motivo Isenção</th>
                 </tr>
               </thead>
               <tbody>
                 <tr *ngFor="let vat of getVatSummary()">
                   <td>{{ vat.rate | number:'1.2-2' }}</td>
                   <td>{{ vat.base | number:'1.2-2' }}</td>
                   <td>{{ (+vat.amount || 0) | number:'1.2-2' }}</td>
                   <td>{{ vat.rate === 0 ? 'Isento Art. 9' : '' }}</td>
                 </tr>
               </tbody>
             </table>

             <div class="bank-details-box">
               <p class="bank-title">DETALHES BANCÁRIOS:</p>
               <div class="bank-info-content">
                 <p><strong>{{ companyInfo?.bankName || 'BCI' }}</strong></p>
                 <p>CONTA: {{ companyInfo?.bankAccountNumber || '2988977510001' }}</p>
                 <p>NIB: {{ companyInfo?.nib || '0008 0000 29889775101 80' }}</p>
                 <p>IBAN: {{ companyInfo?.iban || 'MZ59 0008 0000 29889775101 80' }}</p>
                 <p>SWIFT: {{ companyInfo?.swift || 'CGDIMZMA' }}</p>
               </div>
             </div>
          </div>

          <div class="totals-panel">
            <table class="totals-table">
              <tr>
                <td>Mercadoria/Serviços</td>
                <td class="val">{{ document.subtotal + document.discounts | number:'1.2-2' }}</td>
              </tr>
              <tr>
                <td>Descontos</td>
                <td class="val">{{ document.discounts | number:'1.2-2' }}</td>
              </tr>
              <tr>
                <td>IVA</td>
                <td class="val">{{ document.totalIva | number:'1.2-2' }}</td>
              </tr>
              <tr>
                <td>Acerto</td>
                <td class="val">0,00</td>
              </tr>
              <tr class="grand-total-row">
                <td class="label">Total ( {{ document.currency || 'MZN' }} )</td>
                <td class="amount">{{ document.total | number:'1.2-2' }}</td>
              </tr>
            </table>
          </div>
            
            <div class="signature-area">
               <p class="sig-label">Conforme a Recepção no dia:</p>
               <div class="sig-date">......./......./...........</div>
            </div>
          </div>

        <div class="legal-footer">
          <p>Documento Processado por Computador | Licença N.º 103265</p>
          <div class="office-info">
            <p>Sistemas de Gás para residências, hotéis, quartéis, penitenciarias e restaurantes</p>
            <p>Assistência técnica: 841829890 / 820829890</p>
          </div>
        </div>

        <div class="page-break" *ngIf="i < getCopies().length - 1"></div>
      </div>
    </div>
  `,
  styles: [`
    /* Import Premium Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* Global Print Settings */
    @media print {
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-container { display: block !important; background: white !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .page-container { border: none !important; margin: 0 !important; width: 210mm !important; height: 296mm !important; padding: 10mm 12mm !important; box-shadow: none !important; overflow: hidden !important; }
    }

    .print-container {
      display: none;
      font-family: 'Inter', sans-serif;
      color: #1a1a1b;
      background: #f3f4f6;
      padding: 20px 0;
    }

    .page-container {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm;
      margin: 0 auto 20px auto;
      background: white;
      position: relative;
      box-sizing: border-box;
      border: 1px solid #d1d5db;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    /* Typography Defaults */
    p { margin: 0; line-height: 1.2; font-size: 8pt; }
    h1, h2, h3 { margin: 0; font-weight: 700; }

    .doc-header-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .company-branding {
      display: flex;
      gap: 12pt;
    }

    .print-logo {
      height: 48pt;
      width: auto;
      object-fit: contain;
    }

    .company-details p { color: #374151; margin-bottom: 1pt; }
    .comp-name-main { font-size: 11pt; color: #111827; text-transform: uppercase; }
    .comp-sub { font-size: 8.5pt; color: #4b5563; font-weight: 600; margin-bottom: 2pt !important; }

    .doc-identifier {
      text-align: right;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 50%;
    }

    .customer-envelope {
      border: 1pt solid #000;
      padding: 6pt 10pt;
      text-align: left;
      min-height: 65pt;
      margin-bottom: 12pt;
    }

    .envelope-label { font-size: 7pt; color: #6b7280; margin-bottom: 4pt; font-weight: 600; }
    .envelope-name { font-size: 10pt; font-weight: 700; margin-bottom: 2pt; }
    .envelope-address { font-size: 8.5pt; color: #374151; }

    .document-type-title {
      font-size: 13pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      border-bottom: 2pt solid #1a1a1b;
      padding-bottom: 4pt;
    }

    /* Metadata Grids */
    .metadata-grid-container {
      margin-bottom: 15pt;
      position: relative;
    }

    .metadata-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6pt;
    }

    .metadata-table th, .metadata-table td {
      border: 0.5pt solid #374151;
      padding: 3pt 6pt;
      text-align: center;
      font-size: 7.5pt;
    }

    .metadata-table th {
      background: #f9fafb;
      font-weight: 600;
      text-transform: uppercase;
      color: #111827;
    }

    .metadata-table td { font-weight: 400; font-family: 'Inter', sans-serif; height: 14pt; }

    .copy-indicator {
      position: absolute;
      right: 0;
      top: -12pt;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      text-decoration: underline;
    }

    /* Lines Table */
    .main-content-table {
      min-height: 250pt; /* Maintain consistent footer position */
    }

    .lines-table-main {
      width: 100%;
      border-collapse: collapse;
    }

    .lines-table-main th {
      border: 0.75pt solid #1a1a1b;
      padding: 5pt;
      font-size: 8pt;
      text-transform: uppercase;
      font-weight: 700;
      background: #f9fafb;
    }

    .lines-table-main td {
      border-left: 0.75pt solid #1a1a1b;
      border-right: 0.75pt solid #1a1a1b;
      padding: 4pt 6pt;
      font-size: 8pt;
    }

    .line-row td { border-bottom: 0.25pt solid #e5e7eb; }
    .empty-row td { height: 18pt; }
    .empty-row:last-child td { border-bottom: 0.75pt solid #1a1a1b; }

    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .col-code { width: 40pt; }
    .col-qty { width: 35pt; }
    .col-un { width: 25pt; }
    .col-price { width: 65pt; }
    .col-disc { width: 35pt; }
    .col-tax { width: 30pt; }
    .col-total { width: 75pt; }

    /* Footer Summary */
    .footer-summary-container {
      display: flex;
      justify-content: space-between;
      margin-top: 10pt;
      gap: 20pt;
    }

    .tax-summary-box { flex: 1; }
    .summary-title { font-size: 8pt; font-weight: 700; margin-bottom: 4pt; text-align: center; text-transform: uppercase; }

    .tax-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12pt;
    }

    .tax-table th, .tax-table td {
      border: 0.5pt solid #374151;
      padding: 3pt;
      font-size: 7.5pt;
      text-align: center;
    }

    .tax-table th { background: #f9fafb; }

    .bank-details-box { margin-top: 15pt; }
    .bank-title { font-size: 7.5pt; font-weight: 800; text-decoration: underline; margin-bottom: 4pt; }
    .bank-info-content p { font-size: 7pt; margin-bottom: 1pt; }

    .totals-panel { width: 230pt; }

    .totals-table {
      width: 100%;
      border-collapse: collapse;
      border: 1pt solid #000;
    }

    .totals-table td {
      padding: 4pt 8pt;
      font-size: 9pt;
      font-weight: 600;
      border: 0.75pt solid #000;
      color: #000;
    }

    .totals-table .val { text-align: right; font-weight: 800; }

    .grand-total-row td {
      background: #f3f4f6;
      border: 1.5pt solid #000;
      padding: 8pt;
    }

    .grand-total-row .label { font-size: 10pt; font-weight: 900; }
    .grand-total-row .amount { font-size: 14pt; font-weight: 900; text-align: right; border-bottom: 3pt double #000; }

    .signature-area {
      margin-top: 25pt;
      text-align: center;
      border-top: 0.75pt solid #111827;
      padding-top: 4pt;
    }

    .sig-label { font-size: 6.5pt; font-weight: 600; font-style: italic; margin-bottom: 8pt; }
    .sig-date { font-size: 9pt; font-weight: 400; letter-spacing: 1pt; }

    .legal-footer {
      position: absolute;
      bottom: 10mm;
      left: 12mm;
      right: 12mm;
      border-top: 1pt solid #000;
      padding-top: 6pt;
      background: white;
    }

    .legal-footer p { font-size: 7pt; color: #4b5563; }
    .office-info { margin-top: 6pt; font-style: italic; }
    .office-info p { font-size: 6.5pt; color: #9ca3af; }

    .page-break { page-break-after: always; }
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
      'FA': 'FACTURA',
      'VD': 'VENDA A DINHEIRO',
      'NC': 'NOTA DE CRÉDITO',
      'ND': 'NOTA DE DÉBITO',
      'GR': 'GUIA DE REMESSA',
      'FP': 'FACTURA PRÓ-FORMA'
    };
    return types[this.document.documentType] || this.document.documentType;
  }

  getCurrencySymbol(): string {
    return this.document?.currency || this.companyInfo?.currency || 'MT';
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

  getEmptyRows(): number[] {
    const lineCount = this.document?.lines?.length || 0;
    const target = 12; // Maintain stability but avoid overflow
    if (lineCount >= target) return [];
    return Array(target - lineCount).fill(0);
  }
}
