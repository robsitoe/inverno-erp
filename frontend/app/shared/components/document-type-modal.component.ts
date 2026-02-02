import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-document-type-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="onClose()">
      <div class="bg-white rounded-sm shadow-lg w-[400px] max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h3 class="text-sm font-medium text-gray-700">Tipos de Documento</h3>
          <button (click)="onClose()" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- List -->
        <div class="overflow-y-auto p-1">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th class="px-2 py-1 text-left border-b">Código</th>
                <th class="px-2 py-1 text-left border-b">Descrição</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let type of documentTypes" 
                  class="hover:bg-blue-50 cursor-pointer transition-colors"
                  (click)="onSelect(type)">
                <td class="px-2 py-1.5 border-b border-gray-100 font-medium text-blue-600">{{ type.code }}</td>
                <td class="px-2 py-1.5 border-b border-gray-100 text-gray-700">{{ type.description }}</td>
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
export class DocumentTypeModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<any>();

  documentTypes: any[] = [];

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.loadTypes();
  }

  loadTypes() {
    this.dataService.getDocumentTypes('SALES').subscribe(types => {
      this.documentTypes = types;
    });
  }

  onClose() {
    this.close.emit();
  }

  onSelect(type: any) {
    this.select.emit(type);
  }
}
