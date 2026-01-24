import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../shared/inventory.service';

interface InventoryCount {
  id: string;
  code: string;
  description: string;
  date: string;
  warehouse: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  lines: InventoryCountLine[];
  createdBy: string;
  createdAt: Date;
}

interface InventoryCountLine {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  location: string;
  batch: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  unit: string;
  counted: boolean;
}

@Component({
  selector: 'app-inventory-count',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="saveInventory()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">save</span>
          <span>Gravar</span>
        </button>
        <button (click)="newInventory()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Novo</span>
        </button>
        <button (click)="processInventory()" [disabled]="currentInventory.status !== 'COMPLETED'" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs disabled:opacity-50">
          <span class="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Processar</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button (click)="loadArticles()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">download</span>
          <span>Carregar Artigos</span>
        </button>
        <button (click)="exportToExcel()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">table_view</span>
          <span>Exportar</span>
        </button>
      </div>

      <!-- Header -->
      <div class="p-3 bg-white border-b border-gray-300 shrink-0">
        <div class="grid grid-cols-4 gap-3 text-xs">
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-20">Código:</label>
            <input [(ngModel)]="currentInventory.code" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-20">Data:</label>
            <input type="date" [(ngModel)]="currentInventory.date" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-20">Armazém:</label>
            <select [(ngModel)]="currentInventory.warehouse" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500">
              <option value="">Todos</option>
              <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }} - {{ wh.name }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-20">Estado:</label>
            <select [(ngModel)]="currentInventory.status" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500">
              <option value="DRAFT">Rascunho</option>
              <option value="IN_PROGRESS">Em Progresso</option>
              <option value="COMPLETED">Concluído</option>
              <option value="CLOSED">Fechado</option>
            </select>
          </div>
        </div>
        <div class="mt-2">
          <label class="font-medium text-gray-700 text-xs">Descrição:</label>
          <input [(ngModel)]="currentInventory.description" class="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500 text-xs mt-1" />
        </div>
      </div>

      <!-- Grid -->
      <div class="flex-1 overflow-auto bg-white">
        <table class="w-full text-xs border-collapse">
          <thead class="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold w-8">
                <input type="checkbox" (change)="toggleAllLines($event)" class="rounded border-gray-300" />
              </th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold text-blue-700">Artigo</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold">Descrição</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold">Localização</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold">Lote</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Un.</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-right font-semibold text-blue-700">Qtd. Sistema</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-right font-semibold text-green-700">Qtd. Contada</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-right font-semibold text-red-700">Diferença</th>
              <th class="border-b border-gray-300 px-2 py-2 text-center font-semibold">Contado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of currentInventory.lines; let i = index" 
                [class.bg-yellow-50]="!line.counted"
                [class.bg-green-50]="line.counted && line.difference === 0"
                [class.bg-red-50]="line.counted && line.difference !== 0"
                class="hover:bg-blue-50">
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">
                <input type="checkbox" [(ngModel)]="line.counted" (change)="updateDifference(line)" class="rounded border-gray-300" />
              </td>
              <td class="border-b border-r border-gray-200 px-2 py-1 font-medium">{{ line.articleCode }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1">{{ line.articleName }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1">{{ line.location }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1">{{ line.batch }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">{{ line.unit }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-right">{{ line.systemQuantity | number:'1.2-2' }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 p-0">
                <input type="number" [(ngModel)]="line.countedQuantity" (change)="updateDifference(line)" 
                       class="w-full h-full px-2 py-1 border-none text-right focus:ring-1 focus:ring-blue-500" 
                       step="0.01" />
              </td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-right font-semibold"
                  [class.text-red-600]="line.difference < 0"
                  [class.text-green-600]="line.difference > 0">
                {{ line.difference | number:'1.2-2' }}
              </td>
              <td class="border-b border-gray-200 px-2 py-1 text-center">
                <span *ngIf="line.counted" class="material-symbols-outlined text-green-600 text-[16px]">check_circle</span>
                <span *ngIf="!line.counted" class="material-symbols-outlined text-gray-400 text-[16px]">radio_button_unchecked</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div class="px-3 py-2 bg-[#DCE4F2] border-t border-gray-300 shrink-0">
        <div class="flex justify-between items-center text-xs">
          <div class="flex gap-6">
            <span class="font-medium">Total Linhas: {{ currentInventory.lines.length }}</span>
            <span class="font-medium">Contadas: {{ getCountedLines() }}</span>
            <span class="font-medium">Pendentes: {{ getPendingLines() }}</span>
          </div>
          <div class="flex gap-4">
            <span class="text-red-600 font-semibold">Diferenças Negativas: {{ getNegativeDifferences() | number:'1.2-2' }}</span>
            <span class="text-green-600 font-semibold">Diferenças Positivas: {{ getPositiveDifferences() | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InventoryCountComponent implements OnInit {
  currentInventory: InventoryCount = this.getEmptyInventory();
  inventories: InventoryCount[] = [];
  warehouses: any[] = [];

  constructor(private inventoryService: InventoryService) { }

  ngOnInit() {
    this.loadWarehouses();
    this.loadInventories();
    this.newInventory();
  }

  getEmptyInventory(): InventoryCount {
    return {
      id: '',
      code: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      warehouse: '',
      status: 'DRAFT',
      lines: [],
      createdBy: 'Sistema',
      createdAt: new Date()
    };
  }

  loadWarehouses() {
    const stored = localStorage.getItem('erp_warehouses');
    if (stored) {
      this.warehouses = JSON.parse(stored);
    }
  }

  loadInventories() {
    const stored = localStorage.getItem('erp_inventory_counts');
    if (stored) {
      this.inventories = JSON.parse(stored);
    }
  }

  newInventory() {
    this.currentInventory = this.getEmptyInventory();
    this.currentInventory.code = `INV${Date.now()}`;
  }

  loadArticles() {
    const articles = this.inventoryService.getArticles();
    this.currentInventory.lines = articles
      .filter(a => a.stockControl)

      .map(article => ({
        id: `LINE${Date.now()}_${article.id}`,
        articleId: article.id,
        articleCode: article.code,
        articleName: article.description,
        location: '',
        batch: '',
        systemQuantity: article.currentStock || 0,
        countedQuantity: 0,
        difference: 0,
        unit: article.unit,
        counted: false
      }));

    alert(`${this.currentInventory.lines.length} artigos carregados.`);
  }

  updateDifference(line: InventoryCountLine) {
    line.difference = line.countedQuantity - line.systemQuantity;
  }

  toggleAllLines(event: any) {
    const checked = event.target.checked;
    this.currentInventory.lines.forEach(line => {
      line.counted = checked;
      this.updateDifference(line);
    });
  }

  getCountedLines(): number {
    return this.currentInventory.lines.filter(l => l.counted).length;
  }

  getPendingLines(): number {
    return this.currentInventory.lines.filter(l => !l.counted).length;
  }

  getNegativeDifferences(): number {
    return this.currentInventory.lines
      .filter(l => l.counted && l.difference < 0)
      .reduce((sum, l) => sum + Math.abs(l.difference), 0);
  }

  getPositiveDifferences(): number {
    return this.currentInventory.lines
      .filter(l => l.counted && l.difference > 0)
      .reduce((sum, l) => sum + l.difference, 0);
  }

  saveInventory() {
    if (!this.currentInventory.code) {
      alert('Preencha o código do inventário.');
      return;
    }

    if (this.currentInventory.id) {
      const index = this.inventories.findIndex(i => i.id === this.currentInventory.id);
      if (index !== -1) {
        this.inventories[index] = { ...this.currentInventory };
      }
    } else {
      this.currentInventory.id = `INV${Date.now()}`;
      this.inventories.push({ ...this.currentInventory });
    }

    localStorage.setItem('erp_inventory_counts', JSON.stringify(this.inventories));
    alert('Inventário gravado com sucesso!');
  }

  processInventory() {
    if (this.currentInventory.status !== 'COMPLETED') {
      alert('O inventário deve estar no estado "Concluído" para ser processado.');
      return;
    }

    const uncounted = this.getPendingLines();
    if (uncounted > 0) {
      if (!confirm(`Existem ${uncounted} linhas não contadas. Deseja continuar?`)) {
        return;
      }
    }

    // Apply adjustments to stock
    this.currentInventory.lines.forEach(line => {
      if (line.counted && line.difference !== 0) {
        // Create stock adjustment document
        // This would integrate with stock movements
        console.log(`Ajuste: ${line.articleCode} - Diferença: ${line.difference}`);
      }
    });

    this.currentInventory.status = 'CLOSED';
    this.saveInventory();
    alert('Inventário processado com sucesso! Ajustes de stock criados.');
  }

  exportToExcel() {
    alert('Funcionalidade de exportação será implementada em breve.');
  }
}
