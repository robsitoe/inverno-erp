import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PurchaseDocument, WorkflowStatus } from '../../shared/models';
import { PrintSettings } from '../../shared/components/print-settings-modal.component';

@Component({
  selector: 'app-purchase-document-print',
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
                <span class="material-symbols-outlined logo-icon">apartment</span>
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
              <p><strong>Data:</strong> {{ document.date | date:'dd/MM/yyyy' }}</p>
              <p class="copy-label">{{ getCopyLabel(i) }}</p>
            </div>
          </div>
        </div>

        <!-- Supplier Info -->
        <div class="entity-section">
          <div class="entity-box">
            <h3>Fornecedor:</h3>
            <p class="entity-name">{{ document.supplierName }}</p>
            <p><strong>NIF:</strong> {{ document.supplierNif }}</p>
            <p>{{ document.supplierAddress }}</p>
          </div>
          <div class="meta-box text-right text-xs">
            <p><strong>Referência:</strong> {{ document.reference || '-' }}</p>
            <p><strong>Moeda:</strong> {{ document.currency }}</p>
          </div>
        </div>

        <!-- Detail Table -->
        <div class="details-section mt-8">
          <table class="lines-table">
            <thead>
              <tr>
                <th class="text-left w-24">Artigo</th>
                <th class="text-left">Descrição</th>
                <th class="text-center w-12">Qtd</th>
                <th class="text-center w-12">UN</th>
                <th class="text-right w-24">Pr. Unit.</th>
                <th class="text-right w-16">Desc %</th>
                <th class="text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of getValidLines()">
                <td class="font-mono">{{ line.articleCode }}</td>
                <td>{{ line.description || line.articleName }}</td>
                <td class="text-center">{{ line.quantity | number:'1.2-2' }}</td>
                <td class="text-center">{{ line.unit }}</td>
                <td class="text-right">{{ line.unitPrice | number:'1.2-2' }}</td>
                <td class="text-right">{{ line.discount | number:'1.0-2' }}%</td>
                <td class="text-right">{{ line.totalValue | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="totals-section mt-4 flex justify-end">
          <div class="totals-box w-64 text-sm">
            <div class="flex justify-between border-b py-1">
              <span>Total Mercadoria:</span>
              <span class="font-mono">{{ document.merchandiseTotal | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between border-b py-1">
              <span>Total Descontos:</span>
              <span class="font-mono">{{ document.discountValue | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between border-b py-1">
              <span>Total IVA:</span>
              <span class="font-mono">{{ document.taxTotal | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between font-bold text-lg pt-2 text-blue-800">
              <span>TOTAL (MT):</span>
              <span class="font-mono">{{ document.totalValue | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Observations -->
        <div class="observations mt-8" *ngIf="settings?.showObservations && document.notes">
          <h4 class="font-bold border-b text-xs mb-2">OBSERVAÇÕES</h4>
          <p class="text-sm italic text-gray-600">{{ document.notes }}</p>
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
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #059669; padding-bottom: 20px; }
    .company-name { font-size: 24px; font-weight: bold; color: #065f46; margin: 0; }
    .doc-title { font-size: 22px; font-weight: bold; color: #374151; margin: 0; }
    .copy-label { font-weight: bold; text-transform: uppercase; color: #9ca3af; font-size: 11px; margin-top: 5px; }
    .entity-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .entity-box { width: 60%; padding: 15px; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; }
    .entity-name { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
    .lines-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    .lines-table th { background: #f3f4f6; padding: 10px 8px; border-top: 2px solid #065f46; border-bottom: 1px solid #d1d5db; }
    .lines-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 5px; }
  `]
})
export class PurchaseDocumentPrintComponent implements OnInit {
  @Input() document: PurchaseDocument | null = null;
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
      'FC': 'FATURA DE COMPRA',
      'NC': 'NOTA DE CRÉDITO',
      'ND': 'NOTA DE DÉBITO',
      'GR': 'GUIA DE RECEÇÃO',
      'EF': 'ENCOMENDA A FORNECEDOR',
      'DC': 'DEVOLUÇÃO A FORNECEDOR'
    };
    return types[this.document.type] || 'DOCUMENTO DE COMPRA';
  }

  getValidLines() {
    return this.document?.lines.filter(l => l.articleCode && l.quantity > 0) || [];
  }
}
