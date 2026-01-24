import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PrintSettings {
    copies: number;
    showBankingInfo: boolean;
    showObservations: boolean;
    paperSize: 'A4';
}

@Component({
    selector: 'app-print-settings-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" *ngIf="isOpen">
      <div class="bg-white rounded-lg shadow-xl w-96 max-w-full">
        <!-- Header -->
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-semibold text-gray-800">Definições de Impressão</h3>
          <button (click)="close()" class="text-gray-500 hover:text-gray-700">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-4">
          <!-- Copies -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cópias</label>
            <select [(ngModel)]="settings.copies" class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option [ngValue]="1">Original</option>
              <option [ngValue]="2">Original + Duplicado</option>
              <option [ngValue]="3">Original + Duplicado + Triplicado</option>
            </select>
          </div>

          <!-- Options -->
          <div class="space-y-2">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" [(ngModel)]="settings.showBankingInfo" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm text-gray-700">Incluir Dados Bancários (IBAN)</span>
            </label>

            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" [(ngModel)]="settings.showObservations" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm text-gray-700">Incluir Observações</span>
            </label>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end space-x-2 p-4 border-t bg-gray-50">
          <button (click)="close()" 
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
            Cancelar
          </button>
          <button (click)="confirm()" 
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center">
            <span class="material-symbols-outlined text-lg mr-1">print</span>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class PrintSettingsModalComponent {
    @Input() isOpen = false;
    @Output() closeEvent = new EventEmitter<void>();
    @Output() confirmEvent = new EventEmitter<PrintSettings>();

    settings: PrintSettings = {
        copies: 1,
        showBankingInfo: true,
        showObservations: true,
        paperSize: 'A4'
    };

    close() {
        this.closeEvent.emit();
    }

    confirm() {
        this.confirmEvent.emit(this.settings);
    }
}
