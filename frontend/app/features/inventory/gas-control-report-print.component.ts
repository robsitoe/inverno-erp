import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GasCylinderType, GasDailyEntry } from '../../services/gas.service';

@Component({
   selector: 'app-gas-control-report-print',
   standalone: true,
   imports: [CommonModule],
   encapsulation: ViewEncapsulation.None,
   template: `
    <div class="gas-report-print-container print-only">
      <!-- HEADER -->
      <div class="mb-2 text-[10px] font-bold">
         <div class="flex justify-between items-start">
            <div>
               <div class="text-blue-700 underline mb-1">Voltar para Analises</div>
               <div>{{ selectedDate | date:'dd.MM.yyyy' }}</div>
            </div>
            <div class="text-center">
               <h1 class="text-sm font-bold uppercase">Movimento Geral Diário do Armazém</h1>
            </div>
            <div class="w-32"></div>
         </div>
      </div>

      <!-- STOCK SUMMARY -->
      <div class="flex justify-between gap-16 mb-6 relative">
         <div class="flex-1 relative">
            <div class="absolute -top-4 left-0 badge bg-type-green text-[7pt]">9KG</div>
            <div class="absolute -top-4 left-16 font-bold text-[7pt]">Stock Inicial</div>
            <table class="report-table">
               <thead>
                  <tr class="bg-header-grey">
                     <th class="w-12 bg-white">{{ currentYear }}</th>
                     <th *ngFor="let t of cylinderTypes" class="font-bold">{{ t.name === '9KG' ? '9kg.' : t.name }}</th>
                  </tr>
               </thead>
               <tbody class="font-bold">
                  <tr><td>Kit/Redut</td><td *ngFor="let t of cylinderTypes">0</td></tr>
                  <tr><td>Avariadas-</td><td *ngFor="let t of cylinderTypes" class="text-rose-500">{{ initialStock[t.name]?.damaged || 0 }}</td></tr>
                  <tr><td>Vazias-</td><td *ngFor="let t of cylinderTypes">{{ initialStock[t.name]?.empty || 0 }}</td></tr>
                  <tr><td>GPL</td><td *ngFor="let t of cylinderTypes" class="text-blue-700">{{ initialStock[t.name]?.gpl || 0 }}</td></tr>
               </tbody>
               <tfoot class="bg-footer-green font-black">
                  <tr><td class="text-left uppercase">TOTAL</td><td *ngFor="let t of cylinderTypes">{{ totals?.initial[t.name] }}</td></tr>
               </tfoot>
            </table>
         </div>

         <div class="flex-1 relative">
            <div class="absolute -top-4 right-0 font-bold text-[7pt]">Stock Final</div>
            <table class="report-table">
               <thead>
                  <tr class="bg-header-grey">
                     <th class="w-12 bg-white"></th>
                     <th *ngFor="let t of cylinderTypes" class="font-bold">{{ t.name === '9KG' ? '9kg.' : t.name }}</th>
                  </tr>
               </thead>
               <tbody class="font-bold">
                  <tr><td>Kit/Redut</td><td *ngFor="let t of cylinderTypes">0</td></tr>
                  <tr><td>Avariadas-</td><td *ngFor="let t of cylinderTypes" class="text-rose-500">{{ totals?.final[t.name]?.damaged }}</td></tr>
                  <tr><td>Vazias-</td><td *ngFor="let t of cylinderTypes">{{ totals?.final[t.name]?.empty }}</td></tr>
                  <tr><td>Gpl-</td><td *ngFor="let t of cylinderTypes" class="text-blue-700">{{ totals?.final[t.name]?.gpl }}</td></tr>
               </tbody>
               <tfoot class="bg-footer-green font-black">
                  <tr><td class="text-left uppercase">TOTAL</td><td *ngFor="let t of cylinderTypes">{{ totals?.finalSum[t.name] }}</td></tr>
               </tfoot>
            </table>
         </div>
      </div>

      <!-- MOVEMENTS BY TYPE -->
      <div *ngFor="let t of cylinderTypes; let first = first" class="mb-4 page-break-inside-avoid">
         <div class="mb-1">
            <div class="flex items-center gap-4">
               <div class="badge bg-type-green text-[7pt] w-12 text-center">{{ t.name }}</div>
               <div class="flex items-center bg-header-grey border border-black px-4 ml-[150px]">
                  <span class="font-bold text-[7pt] mr-8">Preço</span>
                  <span class="badge bg-price-blue text-[7pt] w-20 text-center">{{ t.priceRevendedor }}</span>
               </div>
            </div>
         </div>

         <table class="report-table movement-table uppercase">
            <thead>
               <tr class="bg-header-grey text-[7pt]">
                  <th class="p-1 w-48">CLIENTE/ENTIDADE</th>
                  <th class="p-1 w-8">S/GPL</th>
                  <th class="p-1 w-8">S/VAZ</th>
                  <th class="p-1 w-8">S/AV</th>
                  <th class="p-1 w-8">VZ-VEND</th>
                  <th class="p-1 w-8">ADC/Caucao</th>
                  <th class="p-1 w-8">E./GPL</th>
                  <th class="p-1 w-8">E/VAZ</th>
                  <th class="p-1 w-8">E./AV</th>
                  <th class="p-1 w-8">P.Divida</th>
                  <th class="p-1 w-12">VD,s</th>
               </tr>
            </thead>
            <tbody>
               <tr *ngFor="let e of getEntriesForType(t.id!)" [class.bg-orange-row]="e.customerName && (e.customerName.includes('PALETA') || e.customerName.includes('Petrogas'))">
                  <td class="text-left font-bold px-1">{{ e.customerName }}</td>
                  <td>{{ e.s_gpl }}</td>
                  <td>{{ e.s_vaz }}</td>
                  <td class="text-rose-500">{{ e.s_av }}</td>
                  <td>{{ e.vz_vend }}</td>
                  <td class="italic">{{ e.adc_caucao }}</td>
                  <td class="font-bold text-blue-900">{{ e.e_gpl }}</td>
                  <td class="font-bold">{{ e.e_vaz }}</td>
                  <td class="text-rose-600">{{ e.e_av }}</td>
                  <td class="text-emerald-600 font-mono">{{ e.p_divida }}</td>
                  <td class="font-mono text-right italic">{{ e.totalAmount | number:'1.2-2' }}</td>
               </tr>
               <tr *ngFor="let i of getEmptyRows(t.id!)" class="h-5">
                  <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
               </tr>
            </tbody>
            <tfoot class="bg-header-grey font-black text-[7pt]">
               <tr>
                  <td>TOTAIS</td>
                  <td>{{ sum(t.id!, 's_gpl') }}</td>
                  <td>{{ sum(t.id!, 's_vaz') }}</td>
                  <td>{{ sum(t.id!, 's_av') }}</td>
                  <td>{{ sum(t.id!, 'vz_vend') }}</td>
                  <td>{{ sum(t.id!, 'adc_caucao') }}</td>
                  <td>{{ sum(t.id!, 'e_gpl') }}</td>
                  <td>{{ sum(t.id!, 'e_vaz') }}</td>
                  <td>{{ sum(t.id!, 'e_av') }}</td>
                  <td>-</td>
                  <td class="text-right text-rose-600">{{ sumVDs(t.id!) | number:'1.2-2' }}</td>
               </tr>
            </tfoot>
         </table>

         <div *ngIf="first" class="summary-block">
            <div class="summary-row">
               <span class="font-bold">Total Recebido</span>
               <div class="summary-value">{{ globalTotal | number:'1.2-2' }}</div>
            </div>
            <div class="summary-row">
               <span class="font-bold">Total de vendas Gerais</span>
               <div class="summary-value"></div>
            </div>
            <div class="summary-row">
               <span class="font-bold">Total de Saidas</span>
               <div class="summary-value"></div>
            </div>
         </div>
      </div>

      <!-- Signatures -->
      <div class="signature-area mt-8">
         <div class="sig-box italic">O Conferente: ___________________________</div>
         <div class="sig-box italic">Supervisor / Visto: ___________________________</div>
      </div>
    </div>
  `,
   styles: [`
    .print-only { display: none !important; }
    @media print {
      .print-only { display: block !important; }
      .no-print { display: none !important; }
      @page { size: landscape; margin: 10mm; }
      
      .gas-report-print-container {
        font-family: Arial, sans-serif !important;
        color: black !important;
        font-size: 9pt !important;
        width: 100%;
      }

      .report-table {
        border-collapse: collapse !important;
        width: 100% !important;
        border: 1pt solid #444 !important;
        margin-bottom: 2mm;
      }

      .report-table th, .report-table td {
        border: 0.5pt solid #444 !important;
        padding: 2px 4px !important;
        text-align: center;
      }

      .bg-type-green { background-color: #70AD47 !important; color: white !important; -webkit-print-color-adjust: exact; }
      .bg-price-blue { background-color: #4472C4 !important; color: white !important; -webkit-print-color-adjust: exact; }
      .bg-header-grey { background-color: #D9D9D9 !important; -webkit-print-color-adjust: exact; }
      .bg-footer-green { background-color: #C6E0B4 !important; -webkit-print-color-adjust: exact; }
      .bg-orange-row { background-color: #F4B084 !important; -webkit-print-color-adjust: exact; }

      .badge { display: inline-block; padding: 2px 8px; font-weight: bold; font-size: 8pt; text-transform: uppercase; }

      .summary-block { margin-top: 5mm; margin-left: auto; width: 300px; text-align: right; font-size: 8pt; }
      .summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
      .summary-value { border: 0.5pt solid black; width: 80px; padding: 2px; background: #BDD7EE; font-weight: bold; text-align: right; -webkit-print-color-adjust: exact; }
      
      .page-break-inside-avoid { page-break-inside: avoid; }

      .signature-area { display: flex !important; justify-content: space-around; margin-top: 15mm; }
      .sig-box { border-top: 1pt solid black; width: 60mm; text-align: center; padding-top: 2mm; font-size: 8pt; font-weight: bold; }
    }
  `]
})
export class GasControlReportPrintComponent {
   @Input() selectedDate: string = '';
   @Input() cylinderTypes: GasCylinderType[] = [];
   @Input() initialStock: any = {};
   @Input() entries: GasDailyEntry[] = [];
   @Input() currentYear: number = new Date().getFullYear();
   @Input() totals: any = {};
   @Input() globalTotal: number = 0;

   getEntriesForType(typeId: string) {
      return this.entries.filter(e => e.cylinderTypeId === typeId);
   }

   getEmptyRows(typeId: string) {
      const count = this.getEntriesForType(typeId).length;
      return count < 8 ? Array(8 - count).fill(0) : [];
   }

   sum(typeId: string, field: string) {
      return this.getEntriesForType(typeId).reduce((acc, e) => acc + (Number((e as any)[field]) || 0), 0);
   }

   sumVDs(typeId: string) {
      return this.getEntriesForType(typeId).reduce((acc, e) => acc + (e.totalAmount || 0), 0);
   }
}
