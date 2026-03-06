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
      <div *ngFor="let copy of getCopies(); let i = index" class="page-container Paper">
        
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
             <div class="flex justify-between font-bold border-t-2 border-[#1e3a8a] pt-2">
               <span>Total Itens:</span>
               <span class="font-mono">{{ getTotalQty() | number:'1.2-2' }}</span>
             </div>
           </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Processado por computador © Inverno ERP - Emitido por: {{ currentUser?.username || 'Sistema' }}</p>
          <p>Pág. 1/1</p>
        </div>

        <div class="page-break" *ngIf="i < getCopies().length - 1"></div>
      </div>
    </div>
  `,
  styles: [`
    @media print {
      @page { 
        size: A4; 
        margin: 0; 
      }
      body { 
        margin: 0 !important; 
        padding: 0 !important; 
        background: white !important;
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
      .print-container { 
        display: block !important; 
        background: white !important; 
      }
      .no-print, .no-print * { 
        display: none !important; 
      }
      
      /* Force Colors and Backgrounds in PDF/Paper */
      .header { border-bottom: 3px solid #1e3a8a !important; -webkit-print-color-adjust: exact; }
      .lines-table th { background: #f1f5f9 !important; border-top: 2px solid #1e3a8a !important; border-bottom: 1px solid #cbd5e1 !important; -webkit-print-color-adjust: exact; }
      .company-name { color: #1e3a8a !important; -webkit-print-color-adjust: exact; }
      .totals-box { border-top: 2px solid #1e3a8a !important; -webkit-print-color-adjust: exact; }
      .page-container { 
        box-shadow: none !important; 
        margin: 0 !important; 
        padding: 15mm !important;
        width: 100% !important;
        min-height: initial !important;
      }
    }

    /* Screen Preview Styling (Paper simulation) */
    .print-container { 
      display: none; /* Hidden on screen to avoid cluttering forms */
      font-family: 'Inter', system-ui, -apple-system, sans-serif; 
      color: #1f2937; 
      background: #f3f4f6;
      padding: 40px 0;
    }
    .page-container { 
      width: 210mm; 
      min-height: 297mm; 
      padding: 15mm; 
      margin: 0 auto 30px auto; 
      background: white; 
      position: relative; 
      box-sizing: border-box;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 2px;
    }
    
    .Paper {
      transition: all 0.3s ease;
    }

    .header { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 25px; 
      border-bottom: 3px solid #1e40af; 
      padding-bottom: 15px; 
    }
    .company-name { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
    .company-info p { margin: 2px 0; font-size: 11px; color: #4b5563; line-height: 1.4; }
    .logo-container img { max-height: 60px; margin-bottom: 10px; }
    .logo-placeholder { margin-bottom: 10px; color: #1e3a8a; }
    
    .doc-title { font-size: 22px; font-weight: 800; color: #111827; margin: 0; text-transform: uppercase; }
    .doc-meta { font-size: 11px; margin-top: 8px; color: #374151; }
    .doc-meta p { margin: 3px 0; }
    .copy-label { font-weight: 900; text-transform: uppercase; color: #9ca3af; font-size: 10px; margin-top: 5px; letter-spacing: 1.5px; }
    
    .meta-section { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 11px; gap: 15px; }
    .meta-box { padding: 12px; border: 1px solid #e5e7eb; border-radius: 4px; flex: 1; background: #f9fafb; }
    .meta-box p { margin: 4px 0; }
    
    .lines-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10.5px; }
    .lines-table th { background: #f8fafc; padding: 10px 8px; border-top: 2px solid #1e3a8a; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
    .lines-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #374151; }
    
    .sig-box { text-align: center; width: 180px; }
    .sig-box .label { font-size: 9px; font-weight: 700; color: #6b7280; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 0.5px; }
    .sig-box .line { border-bottom: 1px solid #9ca3af; width: 100%; }
    
    .footer { position: absolute; bottom: 10mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; border-top: 1px solid #f1f5f9; padding-top: 10px; }
    .totals-box { border-top: 2px solid #1e3a8a; padding-top: 12px; }
    
    .page-break { page-break-after: always; }
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
    return Array(this.settings.copies || 1).fill(0);
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
    return this.document?.lines.filter(l => l.articleCode && (l.quantity !== 0)) || [];
  }

  getTotalQty(): number {
    return this.getValidLines().reduce((sum, l) => sum + (l.quantity || 0), 0);
  }
}
