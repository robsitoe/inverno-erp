import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesDocument } from '../../shared/models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-sales-document-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded shadow-lg w-[800px] h-[500px] flex flex-col text-xs">
        <!-- Header -->
        <div class="bg-blue-600 text-white px-3 py-2 flex justify-between items-center shrink-0">
          <span class="font-bold">Procurar Documentos de Venda</span>
          <button (click)="close.emit()" class="hover:bg-blue-700 rounded p-1">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <!-- Filters -->
        <div class="p-2 bg-gray-100 border-b border-gray-300 flex gap-2 shrink-0">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (ngModelChange)="filterDocuments()"
            placeholder="Filtrar por entidade, número ou total..." 
            class="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          />
        </div>

        <!-- Grid -->
        <div class="flex-1 overflow-auto">
          <table class="w-full border-collapse">
            <thead class="bg-gray-50 sticky top-0 shadow-sm">
              <tr>
                <th class="border-b border-r border-gray-300 px-2 py-1 text-left w-16">Doc.</th>
                <th class="border-b border-r border-gray-300 px-2 py-1 text-left w-16">Série</th>
                <th class="border-b border-r border-gray-300 px-2 py-1 text-right w-16">Num.</th>
                <th class="border-b border-r border-gray-300 px-2 py-1 text-left w-24">Data</th>
                <th class="border-b border-r border-gray-300 px-2 py-1 text-left">Entidade</th>
                <th class="border-b border-gray-300 px-2 py-1 text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of filteredDocuments" 
                  (click)="selectDocument(doc)"
                  class="hover:bg-blue-50 cursor-pointer border-b border-gray-100">
                <td class="px-2 py-1 border-r border-gray-100">{{ doc.documentType }}</td>
                <td class="px-2 py-1 border-r border-gray-100">{{ doc.series }}</td>
                <td class="px-2 py-1 border-r border-gray-100 text-right">{{ doc.seriesNumber }}</td>
                <td class="px-2 py-1 border-r border-gray-100">{{ doc.date | date:'dd/MM/yyyy' }}</td>
                <td class="px-2 py-1 border-r border-gray-100">{{ doc.customerName }}</td>
                <td class="px-2 py-1 text-right font-mono">{{ doc.total | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-2 border-t border-gray-300 bg-gray-50 flex justify-end shrink-0">
          <button (click)="close.emit()" class="px-4 py-1 border border-gray-300 rounded hover:bg-gray-100">Fechar</button>
        </div>
      </div>
    </div>
  `
})
export class SalesDocumentSearchModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<SalesDocument>();

  documents: any[] = [];
  filteredDocuments: any[] = [];
  searchTerm = '';

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.dataService.getSalesDocuments().subscribe(docs => {
      this.documents = docs;
      // Sort by date desc
      this.documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.filterDocuments();
    });
  }

  filterDocuments() {
    if (!this.searchTerm) {
      this.filteredDocuments = this.documents;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDocuments = this.documents.filter(doc =>
      doc.customerName?.toLowerCase().includes(term) ||
      doc.documentNumber?.toLowerCase().includes(term) ||
      doc.total?.toString().includes(term)
    );
  }

  selectDocument(doc: SalesDocument) {
    this.select.emit(doc);
  }
}
