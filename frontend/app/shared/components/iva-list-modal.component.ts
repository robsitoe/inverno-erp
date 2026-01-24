import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IVA_RATES } from '../constants';

@Component({
    selector: 'app-iva-list-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="onClose()">
      <div class="bg-white rounded-sm shadow-lg w-[600px] max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h3 class="text-sm font-medium text-gray-700">Taxas de IVA</h3>
          <button (click)="onClose()" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- List -->
        <div class="overflow-y-auto p-1 flex-1">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600 font-medium sticky top-0">
              <tr>
                <th class="px-2 py-1 text-left border-b">Código</th>
                <th class="px-2 py-1 text-left border-b">Descrição</th>
                <th class="px-2 py-1 text-right border-b">Taxa (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let iva of ivaRates" 
                  class="hover:bg-blue-50 cursor-pointer transition-colors"
                  (click)="onSelect(iva)">
                <td class="px-2 py-1.5 border-b border-gray-100 font-medium text-blue-600">{{ iva.code }}</td>
                <td class="px-2 py-1.5 border-b border-gray-100 text-gray-700">{{ iva.description }}</td>
                <td class="px-2 py-1.5 border-b border-gray-100 text-gray-600 text-right">{{ iva.rate | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button (click)="onClose()" class="px-3 py-1 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `
})
export class IvaListModalComponent {
    @Output() close = new EventEmitter<void>();
    @Output() select = new EventEmitter<any>();

    ivaRates = IVA_RATES;

    onClose() {
        this.close.emit();
    }

    onSelect(iva: any) {
        this.select.emit(iva);
    }
}
