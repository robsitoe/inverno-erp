import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-purchase-document-type-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="close.emit()">
      <div class="bg-white w-[600px] shadow-lg rounded-sm flex flex-col max-h-[90vh]" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-300">
          <h2 class="text-sm font-semibold text-gray-700">Tipos de Documento de Compra</h2>
          <button (click)="close.emit()" class="text-gray-500 hover:text-red-600">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-2">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="border border-gray-300 px-2 py-1 text-left w-16">Documento</th>
                <th class="border border-gray-300 px-2 py-1 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of documentTypes" 
                  class="hover:bg-blue-50 cursor-pointer"
                  (click)="select.emit(doc)">
                <td class="border border-gray-300 px-2 py-1 font-medium">{{ doc.code }}</td>
                <td class="border border-gray-300 px-2 py-1">{{ doc.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-2 border-t border-gray-300 bg-gray-50 flex justify-end">
          <button (click)="close.emit()" class="px-4 py-1 bg-gray-200 hover:bg-gray-300 border border-gray-400 rounded-sm text-xs">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `
})
export class PurchaseDocumentTypeModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<any>();

  documentTypes: any[] = [];

  ngOnInit() {
    this.loadTypes();
  }

  loadTypes() {
    const stored = localStorage.getItem('erp_purchase_document_types');
    if (stored) {
      this.documentTypes = JSON.parse(stored);
    } else {
      // Fallback to defaults if not configured
      this.documentTypes = [
        { code: 'FC', description: 'Fatura de Compra' },
        { code: 'NC', description: 'Nota de Crédito de Fornecedor' },
        { code: 'ND', description: 'Nota de Débito de Fornecedor' },
        { code: 'GR', description: 'Guia de Receção' },
        { code: 'EF', description: 'Encomenda a Fornecedor' },
        { code: 'DC', description: 'Devolução a Fornecedor' },
        { code: 'VGP', description: 'Vossa Guia de Transporte' }
      ];
      // Optionally save defaults to storage so user can edit them later
      localStorage.setItem('erp_purchase_document_types', JSON.stringify(this.documentTypes));
    }
  }
}
