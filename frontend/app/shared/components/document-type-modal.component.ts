import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-document-type-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="onClose()">
      <div class="bg-white rounded-sm shadow-xl w-[600px] max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-300 bg-gray-100">
          <h3 class="text-sm font-semibold text-gray-700">{{ modalTitle }}</h3>
          <button (click)="onClose()" class="text-gray-400 hover:text-red-500 transition-colors">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- List -->
        <div class="overflow-y-auto p-2">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-gray-50 text-gray-600 font-medium sticky top-0">
              <tr>
                <th class="px-2 py-1.5 text-left border border-gray-200 w-24">Código</th>
                <th class="px-2 py-1.5 text-left border border-gray-200">Descrição</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let type of documentTypes" 
                  class="hover:bg-blue-50 cursor-pointer transition-colors group"
                  (click)="onSelect(type)">
                <td class="px-2 py-2 border border-gray-100 font-bold text-blue-600 group-hover:text-blue-700">{{ type.code }}</td>
                <td class="px-2 py-2 border border-gray-100 text-gray-700">{{ type.name || type.description }}</td>
              </tr>
              <tr *ngIf="documentTypes?.length === 0">
                <td colspan="2" class="px-4 py-8 text-center text-gray-400 italic bg-gray-50">
                   Nenhum tipo de documento encontrado para este módulo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button (click)="onClose()" class="px-4 py-1.5 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50 active:bg-gray-100 transition-all font-medium text-gray-600">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `
})
export class DocumentTypeModalComponent implements OnInit {
  @Input() module: 'SALES' | 'PURCHASES' | 'STOCK' | 'TREASURY' = 'SALES';
  @Input() documentTypes: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<any>();

  constructor(private dataService: DataService) { }

  ngOnInit() {
    if (!this.documentTypes || this.documentTypes.length === 0) {
      this.loadTypes();
    }
  }

  loadTypes() {
    this.dataService.getDocumentTypes(this.module).subscribe(types => {
      if (!this.documentTypes || this.documentTypes.length === 0) {
        this.documentTypes = types || [];
      }
    });
  }

  get modalTitle(): string {
    switch (this.module) {
      case 'SALES': return 'Tipos de Documento de Venda';
      case 'PURCHASES': return 'Tipos de Documento de Compra';
      case 'STOCK': return 'Tipos de Documento de Stock';
      case 'TREASURY': return 'Tipos de Documento de Tesouraria';
      default: return 'Tipos de Documento';
    }
  }

  onClose() {
    this.close.emit();
  }

  onSelect(type: any) {
    this.select.emit(type);
  }
}
