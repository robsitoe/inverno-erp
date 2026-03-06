import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../inventory.service';
import { Article } from '../models';

@Component({
  selector: 'app-article-list-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="onClose()">
      <div class="bg-white rounded-sm shadow-lg w-[800px] max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h3 class="text-sm font-medium text-gray-700">Lista de Artigos</h3>
          <button (click)="onClose()" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="px-3 py-2 border-b border-gray-200 bg-white">
          <div class="relative">
            <input 
              type="text"
              [value]="searchQuery"
              (input)="onSearchChange($event)"
              placeholder="Pesquisar por código ou descrição..."
              class="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          </div>
        </div>

        <!-- List -->
        <div class="overflow-y-auto p-1 flex-1">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600 font-medium sticky top-0">
              <tr>
                <th class="px-2 py-1 text-left border-b">Código</th>
                <th class="px-2 py-1 text-left border-b">Descrição</th>
                <th class="px-2 py-1 text-left border-b">UN</th>
                <th class="px-2 py-1 text-right border-b">Preço</th>
                <th class="px-2 py-1 text-right border-b">IVA</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let article of filteredArticles" 
                  class="hover:bg-blue-50 cursor-pointer transition-colors"
                  (click)="onSelect(article)">
                <td class="px-2 py-1.5 border-b border-gray-100 font-medium text-blue-600">{{ article.code }}</td>
                <td class="px-2 py-1.5 border-b border-gray-100 text-gray-700">{{ article.name || article.description }}</td>
                <td class="px-2 py-1.5 border-b border-gray-100 text-gray-600">{{ article.unit }}</td>
                <td class="px-2 py-1.5 border-b border-gray-100 text-gray-600 text-right">{{ (article.salePrice || 0) | number:'1.2-2' }}</td>
                <td class="px-2 py-1.5 border-b border-gray-100 text-gray-600 text-right">{{ (article.ivaRate || 0) }}%</td>
              </tr>
              <tr *ngIf="filteredArticles.length === 0">
                <td colspan="5" class="px-2 py-4 text-center text-gray-400 italic">
                  Nenhum artigo encontrado
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <span class="text-xs text-gray-500">{{ filteredArticles.length }} artigo(s) encontrado(s)</span>
          <button (click)="onClose()" class="px-3 py-1 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `
})
export class ArticleListModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<any>();

  articles: any[] = [];
  filteredArticles: any[] = [];
  searchQuery = '';

  constructor(private inventoryService: InventoryService) { }

  ngOnInit() {
    this.loadArticles();
  }

  loadArticles() {
    this.articles = this.inventoryService.getArticles();
    this.filteredArticles = [...this.articles];
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredArticles = this.articles;
      return;
    }

    this.filteredArticles = this.articles.filter(article =>
      article.code.toLowerCase().includes(query) ||
      article.description.toLowerCase().includes(query)
    );
  }

  onClose() {
    this.close.emit();
  }

  onSelect(article: any) {
    this.select.emit(article);
  }
}
