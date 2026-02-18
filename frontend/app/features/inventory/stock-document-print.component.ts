import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockDocument } from '../../shared/models';
import { PrintSettings } from '../../shared/components/print-settings-modal.component';

@Component({
  selector: 'app-stock-document-print',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
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
                <span class="material-symbols-outlined logo-icon">inventory</span>
            </div>
            <h1 class="company-name">{{ companyInfo?.name || 'INVERNO ERP' }}</h1>
            <p>{{ companyInfo?.address || 'Rua Exemplo, 123' }}</p>
            <p>{{ companyInfo?.city || 'Maputo, Moçambique' }}</p>
            <p>NUIT: {{ companyInfo?.nif || '500 000 000' }}</p>
          </div>
          <div class="doc-info text-right">
            <h2 class="doc-title">{{ getDocTitle() }}</h2>
            <div class="doc-meta">
              <p><strong>Número:</strong> {{ getDocumentNumber() }}</p>
              <p><strong>Data:</strong> {{ document.date | date:'dd/MM/yyyy' }} {{ document.time }}</p>
              <p class="copy-label">{{ getCopyLabel(i) }}</p>
            </div>
          </div>
        </div>

        <!-- Document Details Header -->
        <div class="meta-section">
          <div class="meta-box">
            <p><strong>Armazém:</strong> {{ document.warehouse }}</p>
            <p *ngIf="document.originAccount"><strong>Conta Origem:</strong> {{ document.originAccount }}</p>
          </div>
          <div class="meta-box text-right">
            <p><strong>Estado:</strong> {{ document.status === 'POSTED' ? 'Confirmado' : 'Rascunho' }}</p>
          </div>
        </div>

        <!-- Detail Table -->
        <div class="details-section mt-8">
          <table class="lines-table">
            <thead>
              <tr>
                <th class="text-left w-24">Artigo</th>
                <th class="text-left">Descrição</th>
                <th class="text-center w-20">Armazém</th>
                <th class="text-center w-20">Localização</th>
                <th class="text-center w-20">Lote</th>
                <th class="text-center w-12">Qtd</th>
                <th class="text-center w-12">UN</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of getValidLines()">
                <td class="font-mono">{{ line.articleCode }}</td>
                <td>{{ line.description || line.articleName }}</td>
                <td class="text-center">{{ line.warehouse }}</td>
                <td class="text-center">{{ line.location || '-' }}</td>
                <td class="text-center">{{ line.batch || '-' }}</td>
                <td class="text-center font-bold">{{ line.quantity | number:'1.2-2' }}</td>
                <td class="text-center">{{ line.unit }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals Wrap-up (Optional for stock) -->
        <div class="totals-section mt-4 flex justify-between items-start">
           <div class="signatures flex gap-8 mt-12">
              <div class="sig-box">
                <p class="label">Entregue por</p>
                <div class="line"></div>
              </div>
              <div class="sig-box">
                <p class="label">Recebido por</p>
                <div class="line"></div>
              </div>
           </div>
           
           <div class="totals-box w-48 text-sm">
             <div class="flex justify-between font-bold border-t-2 border-orange-600 pt-2">
               <span>Total Itens:</span>
               <span class="font-mono">{{ getTotalQty() | number:'1.2-2' }}</span>
             </div>
           </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Processado por computador © Inverno ERP {{ currentUser ? '- Operador: ' + currentUser.username : '' }}</p>
          <p>Pág. 1/1</p>
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
    .print-container { display: none; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #374151; }
    .page-container { width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto; background: white; position: relative; box-sizing: border-box; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #f97316; padding-bottom: 20px; }
    .company-name { font-size: 24px; font-weight: bold; color: #c2410c; margin: 0; }
    .doc-title { font-size: 22px; font-weight: bold; color: #374151; margin: 0; }
    .copy-label { font-weight: bold; text-transform: uppercase; color: #9ca3af; font-size: 11px; margin-top: 5px; }
    .meta-section { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
    .meta-box { padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px; min-width: 200px; }
    .lines-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    .lines-table th { background: #fff7ed; padding: 10px 8px; border-top: 2px solid #f97316; border-bottom: 1px solid #fed7aa; }
    .lines-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .sig-box { text-align: center; width: 150px; }
    .sig-box .label { font-size: 10px; color: #9ca3af; margin-bottom: 40px; }
    .sig-box .line { border-bottom: 1px solid #374151; width: 100%; }
    .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 5px; }
  `]
})
export class StockDocumentPrintComponent implements OnInit {
  @Input() document: StockDocument | null = null;
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

  getDocumentNumber(): string {
    if (!this.document) return '';
    return `${this.document.type} ${this.document.series}/${this.document.number}`;
  }

  getDocTitle(): string {
    if (!this.document) return '';
    const types: any = {
      'ENT': 'ENTRADA DE STOCK',
      'SAI': 'SAÍDA DE STOCK',
      'TRF': 'TRANSFERÊNCIA DE ARMAZÉM',
      'INV': 'ACERTO DE INVENTÁRIO',
      'SI': 'SALDO INICIAL'
    };
    return types[this.document.type] || 'DOCUMENTO DE STOCK';
  }

  getValidLines() {
    return this.document?.lines.filter(l => l.articleCode && l.quantity > 0) || [];
  }

  getTotalQty(): number {
    return this.getValidLines().reduce((sum, l) => sum + (l.quantity || 0), 0);
  }
}
