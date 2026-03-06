import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';
import { Article } from '../../shared/models';

@Component({
  selector: 'app-article-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded shadow-lg w-[800px] max-h-[80vh] flex flex-col">
        <!-- Header -->
        <div class="bg-blue-600 text-white px-4 py-2 flex justify-between items-center shrink-0">
          <h2 class="font-bold text-sm">Pesquisar Artigos</h2>
          <button (click)="closeModal()" class="hover:bg-blue-700 rounded p-1">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="p-2 bg-gray-50 border-b border-gray-300 flex gap-2">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (ngModelChange)="filterArticles()"
            placeholder="Pesquisar por código ou descrição..." 
            class="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            autofocus
          >
          <button (click)="filterArticles()" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
            Pesquisar
          </button>
        </div>

        <!-- Grid -->
        <div class="flex-1 overflow-auto">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="border-b border-gray-300 px-2 py-1 text-left w-24">Código</th>
                <th class="border-b border-gray-300 px-2 py-1 text-left">Descrição</th>
                <th class="border-b border-gray-300 px-2 py-1 text-center w-16">Unidade</th>
                <th class="border-b border-gray-300 px-2 py-1 text-right w-24">Preço</th>
                <th class="border-b border-gray-300 px-2 py-1 text-right w-24">Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                *ngFor="let article of filteredArticles" 
                (click)="selectArticle(article)"
                class="hover:bg-blue-50 cursor-pointer border-b border-gray-100"
              >
                <td class="px-2 py-1 font-medium text-blue-700">{{ article.code }}</td>
                <td class="px-2 py-1">{{ article.name || article.description }}</td>
                <td class="px-2 py-1 text-center">{{ article.unit }}</td>
                <td class="px-2 py-1 text-right">{{ (article.salePrice || 0) | number:'1.2-2' }}</td>
                <td class="px-2 py-1 text-right font-bold" [class.text-red-600]="article.currentStock <= 0" [class.text-green-600]="article.currentStock > 0">
                  {{ article.currentStock }}
                </td>
              </tr>
              <tr *ngIf="filteredArticles.length === 0">
                <td colspan="5" class="p-4 text-center text-gray-400 italic">
                  Nenhum artigo encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="p-2 border-t border-gray-300 bg-gray-50 text-right text-xs text-gray-500">
          {{ filteredArticles.length }} artigos encontrados
        </div>
      </div>
    </div>
  `
})
export class ArticleSearchModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<Article>();

  searchTerm = '';
  articles: Article[] = [];
  filteredArticles: Article[] = [];

  private subscription = new Subscription();

  constructor(private inventoryService: InventoryService) { }

  ngOnInit() {
    this.loadArticles();
    this.subscription.add(
      this.inventoryService.articlesUpdated$.subscribe(() => {
        this.loadArticles();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadArticles() {
    this.articles = this.inventoryService.getArticles();
    this.filteredArticles = [...this.articles];
  }

  filterArticles() {
    if (!this.searchTerm) {
      this.filteredArticles = [...this.articles];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredArticles = this.articles.filter(a =>
      (a.code || '').toLowerCase().includes(term) ||
      (a.name || '').toLowerCase().includes(term) ||
      (a.description || '').toLowerCase().includes(term)
    );
  }

  selectArticle(article: Article) {
    this.select.emit(article);
    this.closeModal();
  }

  closeModal() {
    this.isOpen = false;
    this.close.emit();
  }
}
