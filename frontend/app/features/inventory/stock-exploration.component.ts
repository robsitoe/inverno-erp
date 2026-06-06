import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';

interface StockExplorationFilter {
  articleCode: string;
  articleName: string;
  warehouse: string;
  location: string;
  batch: string;
  minStock: number | null;
  maxStock: number | null;
  onlyWithStock: boolean;
  onlyBelowMinimum: boolean;
}

@Component({
  selector: 'app-stock-exploration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="search()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">search</span>
          <span>Pesquisar</span>
        </button>
        <button (click)="clearFilters()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">filter_alt_off</span>
          <span>Limpar Filtros</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button (click)="exportToExcel()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">table_view</span>
          <span>Exportar</span>
        </button>
        <button (click)="print()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">print</span>
          <span>Imprimir</span>
        </button>
      </div>

      <!-- Filters -->
      <div class="p-3 bg-white border-b border-gray-300 shrink-0">
        <div class="grid grid-cols-4 gap-3 text-xs mb-3">
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-24">Cód. Artigo:</label>
            <input [(ngModel)]="filters.articleCode" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="Código" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-24">Descrição:</label>
            <input [(ngModel)]="filters.articleName" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="Nome do artigo" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-24">Armazém:</label>
            <select [(ngModel)]="filters.warehouse" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500">
              <option value="">Todos</option>
              <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-24">Localização:</label>
            <input [(ngModel)]="filters.location" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="Localização" />
          </div>
        </div>
        <div class="grid grid-cols-4 gap-3 text-xs">
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-24">Lote:</label>
            <input [(ngModel)]="filters.batch" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="Lote" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-24">Stock Mín:</label>
            <input type="number" [(ngModel)]="filters.minStock" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="0" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-24">Stock Máx:</label>
            <input type="number" [(ngModel)]="filters.maxStock" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="999999" />
          </div>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1">
              <input type="checkbox" [(ngModel)]="filters.onlyWithStock" class="rounded border-gray-300" />
              <span>Apenas com Stock</span>
            </label>
            <label class="flex items-center gap-1">
              <input type="checkbox" [(ngModel)]="filters.onlyBelowMinimum" class="rounded border-gray-300" />
              <span>Abaixo Mínimo</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Results Grid -->
      <div class="flex-1 overflow-auto bg-white">
        <table class="w-full text-xs border-collapse">
          <thead class="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold text-blue-700">Código</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold">Descrição</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Armazém</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Localização</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Lote</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Un.</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-right font-semibold text-green-700">Stock Atual</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-right font-semibold">Stock Mínimo</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-right font-semibold">Stock Máximo</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-right font-semibold">Custo Médio</th>
              <th class="border-b border-gray-300 px-2 py-2 text-right font-semibold text-blue-700">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredResults" 
                [class.bg-red-50]="item.currentStock < item.minimumStock"
                [class.bg-yellow-50]="item.currentStock === 0"
                class="hover:bg-blue-50">
              <td class="border-b border-r border-gray-200 px-2 py-1 font-medium">{{ item.code }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1">{{ item.description }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">{{ item.warehouse }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">{{ item.location }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">{{ item.batch }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">{{ item.unit }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-right font-semibold"
                  [class.text-red-600]="item.currentStock < item.minimumStock"
                  [class.text-orange-600]="item.currentStock === 0">
                {{ item.currentStock | number:'1.2-2' }}
              </td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-right">{{ item.minimumStock | number:'1.2-2' }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-right">{{ item.maximumStock | number:'1.2-2' }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-right">{{ item.averageCost | number:'1.2-2' }} MT</td>
              <td class="border-b border-gray-200 px-2 py-1 text-right font-semibold text-blue-600">{{ item.totalValue | number:'1.2-2' }} MT</td>
            </tr>
            <tr *ngIf="filteredResults.length === 0">
              <td colspan="11" class="border-b border-gray-200 px-2 py-8 text-center text-gray-400 italic">
                Nenhum resultado encontrado. Ajuste os filtros e clique em "Pesquisar".
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div class="px-3 py-2 bg-[#DCE4F2] border-t border-gray-300 shrink-0">
        <div class="flex justify-between items-center text-xs">
          <div class="flex gap-6">
            <span class="font-medium">Total Artigos: {{ filteredResults.length }}</span>
            <span class="text-red-600 font-medium">Abaixo Mínimo: {{ getBelowMinimum() }}</span>
            <span class="text-orange-600 font-medium">Sem Stock: {{ getZeroStock() }}</span>
          </div>
          <div class="flex gap-4">
            <span class="text-green-600 font-semibold">Stock Total: {{ getTotalStock() | number:'1.2-2' }}</span>
            <span class="text-blue-600 font-semibold">Valor Total: {{ getTotalValue() | number:'1.2-2' }} MT</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StockExplorationComponent implements OnInit {
  filters: StockExplorationFilter = {
    articleCode: '',
    articleName: '',
    warehouse: '',
    location: '',
    batch: '',
    minStock: null,
    maxStock: null,
    onlyWithStock: false,
    onlyBelowMinimum: false
  };

  allResults: any[] = [];
  filteredResults: any[] = [];
  warehouses: any[] = [];

  constructor(private inventoryService: InventoryService) { }

  ngOnInit() {
    this.loadWarehouses();
    this.loadAllStock();
  }

  loadWarehouses() {
    const stored = localStorage.getItem('erp_warehouses');
    if (stored) {
      this.warehouses = JSON.parse(stored);
    }
  }

  loadAllStock() {
    const articles = this.inventoryService.getArticles();
    this.allResults = articles
      .filter(a => a.stockControl)
      .map(article => ({
        code: article.code,
        description: article.description,
        warehouse: 'ARM01',
        location: '',
        batch: '',
        unit: article.unit,
        currentStock: article.currentStock || 0,
        minimumStock: article.minStock || 0,
        maximumStock: article.maxStock || 0,
        averageCost: article.purchasePrice || 0,
        totalValue: (article.currentStock || 0) * (article.purchasePrice || 0)
      }));
  }

  search() {
    this.filteredResults = this.allResults.filter(item => {
      // Article code filter
      if (this.filters.articleCode && !item.code.toLowerCase().includes(this.filters.articleCode.toLowerCase())) {
        return false;
      }

      // Article name filter
      if (this.filters.articleName && !item.description.toLowerCase().includes(this.filters.articleName.toLowerCase())) {
        return false;
      }

      // Warehouse filter
      if (this.filters.warehouse && item.warehouse !== this.filters.warehouse) {
        return false;
      }

      // Location filter
      if (this.filters.location && !item.location.toLowerCase().includes(this.filters.location.toLowerCase())) {
        return false;
      }

      // Batch filter
      if (this.filters.batch && !item.batch.toLowerCase().includes(this.filters.batch.toLowerCase())) {
        return false;
      }

      // Min stock filter
      if (this.filters.minStock !== null && item.currentStock < this.filters.minStock) {
        return false;
      }

      // Max stock filter
      if (this.filters.maxStock !== null && item.currentStock > this.filters.maxStock) {
        return false;
      }

      // Only with stock
      if (this.filters.onlyWithStock && item.currentStock <= 0) {
        return false;
      }

      // Only below minimum
      if (this.filters.onlyBelowMinimum && item.currentStock >= item.minimumStock) {
        return false;
      }

      return true;
    });
  }

  clearFilters() {
    this.filters = {
      articleCode: '',
      articleName: '',
      warehouse: '',
      location: '',
      batch: '',
      minStock: null,
      maxStock: null,
      onlyWithStock: false,
      onlyBelowMinimum: false
    };
    this.filteredResults = [];
  }

  getBelowMinimum(): number {
    return this.filteredResults.filter(r => r.currentStock < r.minimumStock).length;
  }

  getZeroStock(): number {
    return this.filteredResults.filter(r => r.currentStock === 0).length;
  }

  getTotalStock(): number {
    return this.filteredResults.reduce((sum, r) => sum + r.currentStock, 0);
  }

  getTotalValue(): number {
    return this.filteredResults.reduce((sum, r) => sum + r.totalValue, 0);
  }

  exportToExcel() {
    const header = 'codigo,descricao,armazem,localizacao,lote,unidade,stock_actual,minimo,maximo,custo_medio,valor_total';
        const rows = this.filteredResults.map((r: any) => [r.code, r.description, r.warehouse, r.location, r.batch, r.unit, r.currentStock, r.minimumStock, r.maximumStock, r.averageCost, r.totalValue].map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
        const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'exploracao_stock.csv'; a.click();
        URL.revokeObjectURL(url);
  }

  print() {
    window.print();
  }
}
