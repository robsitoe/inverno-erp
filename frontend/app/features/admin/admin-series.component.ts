import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Series } from '../../shared/models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-admin-series',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto">
      <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span class="material-symbols-outlined text-blue-600">format_list_numbered</span>
              Séries Globais
            </h2>
            
            <!-- Company Selector -->
            <select 
              [(ngModel)]="selectedCompanyId" 
              (change)="onCompanyChange()"
              class="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[200px]"
            >
              <option value="" disabled>Selecione a Empresa</option>
              <option *ngFor="let company of companies" [value]="company.id">{{ company.name }}</option>
            </select>
          </div>

          <button (click)="openModal()" [disabled]="!selectedCompanyId" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Nova Série
          </button>
        </div>

        <div class="p-6">
          <div *ngIf="seriesList.length === 0" class="text-center py-8 text-gray-500">
            <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">folder_off</span>
            <p>Nenhuma série configurada.</p>
          </div>

          <table *ngIf="seriesList.length > 0" class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 w-32">Código</th>
                <th class="px-4 py-3">Descrição</th>
                <th class="px-4 py-3 w-32">Início</th>
                <th class="px-4 py-3 w-32">Fim</th>
                <th class="px-4 py-3 w-24 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let series of seriesList" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-mono font-medium text-blue-600">{{ series.code }}</td>
                <td class="px-4 py-3 text-gray-900">{{ series.description }}</td>
                <td class="px-4 py-3 text-gray-600">{{ series.startDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ series.endDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-4 py-3 text-right flex justify-end gap-1">
                  <button (click)="editSeries(series)" class="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors" title="Editar">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button (click)="deleteSeries(series)" class="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Remover">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div *ngIf="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-[500px] overflow-hidden transform transition-all scale-100 animate-fade-in">
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-800">{{ isEditing ? 'Editar Série' : 'Nova Série' }}</h3>
          <button (click)="showModal = false" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input [(ngModel)]="currentSeries.code" [disabled]="isEditing" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 uppercase" placeholder="Ex: 2024">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input [(ngModel)]="currentSeries.description" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: Série 2024">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input type="date" [(ngModel)]="currentSeries.startDate" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input type="date" [(ngModel)]="currentSeries.endDate" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
          </div>

          <div *ngIf="errorMsg" class="bg-red-50 text-red-700 p-3 rounded text-sm flex items-center gap-2">
            <span class="material-symbols-outlined text-base">error</span>
            {{ errorMsg }}
          </div>
        </div>

        <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="showModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors">Cancelar</button>
          <button (click)="saveSeries()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors">
            {{ isEditing ? 'Atualizar' : 'Criar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in {
      animation: fadeIn 0.15s ease-out forwards;
    }
  `]
})
export class AdminSeriesComponent implements OnInit {
  seriesList: Series[] = [];
  showModal = false;
  isEditing = false;
  errorMsg = '';

  currentSeries: Series = this.getEmptySeries();

  companies: any[] = [];
  selectedCompanyId: string = '';

  constructor(private dataService: DataService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.dataService.getCompanies().subscribe(companies => {
      this.companies = companies;

      // Try to select active company first, otherwise select first available
      const activeStored = localStorage.getItem('erp_company_info');
      if (activeStored) {
        const active = JSON.parse(activeStored);
        this.selectedCompanyId = active.id;
      } else if (this.companies.length > 0) {
        this.selectedCompanyId = this.companies[0].id;
      }

      this.loadSeries();
    });
  }

  onCompanyChange() {
    this.loadSeries();
  }

  get activeCompanyId(): string | null {
    return this.selectedCompanyId || null;
  }

  getEmptySeries(): Series {
    const year = new Date().getFullYear();
    return {
      id: '',
      companyId: this.activeCompanyId || '',
      code: year.toString(),
      description: `Série ${year}`,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      active: true,
      module: 'GLOBAL'
    };
  }

  loadSeries() {
    if (!this.activeCompanyId) return;

    this.dataService.getSeries(this.activeCompanyId).subscribe(series => {
      this.seriesList = series;
      // Sort by code descending (assuming years)
      this.seriesList.sort((a, b) => b.code.localeCompare(a.code));
      this.cdr.detectChanges();
    });
  }

  openModal() {
    this.isEditing = false;
    this.currentSeries = this.getEmptySeries();
    this.errorMsg = '';
    this.showModal = true;
  }

  editSeries(series: Series) {
    this.isEditing = true;
    this.currentSeries = { ...series };
    this.errorMsg = '';
    this.showModal = true;
  }

  validate(): boolean {
    // 1. Mandatory Fields
    if (!this.currentSeries.code || !this.currentSeries.description) {
      this.errorMsg = 'Código e Descrição são obrigatórios.';
      return false;
    }
    if (!this.currentSeries.startDate || !this.currentSeries.endDate) {
      this.errorMsg = 'Datas de início e fim são obrigatórias.';
      return false;
    }

    // 2. Code Format (Professional Rules)
    // Uppercase, Alphanumeric, Hyphens, Underscores. No spaces. Max 20 chars.
    const codeRegex = /^[A-Z0-9-_]+$/;
    this.currentSeries.code = this.currentSeries.code.toUpperCase().trim(); // Auto-format

    if (!codeRegex.test(this.currentSeries.code)) {
      this.errorMsg = 'O código da série deve conter apenas letras maiúsculas, números, hífens (-) ou underscores (_).';
      return false;
    }
    if (this.currentSeries.code.length > 20) {
      this.errorMsg = 'O código da série não pode exceder 20 caracteres.';
      return false;
    }

    // 3. Date Logic
    const start = new Date(this.currentSeries.startDate);
    const end = new Date(this.currentSeries.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      this.errorMsg = 'Datas inválidas.';
      return false;
    }

    if (start > end) {
      this.errorMsg = 'A data de início não pode ser superior à data de fim.';
      return false;
    }

    // 4. Uniqueness Check
    // Check for duplicates if creating new (only for this company)
    if (!this.isEditing) {
      if (this.seriesList.some(s => s.code === this.currentSeries.code)) {
        this.errorMsg = 'Já existe uma série com este código nesta empresa.';
        return false;
      }
    }

    return true;
  }

  saveSeries() {
    if (!this.validate() || !this.activeCompanyId) return;

    this.currentSeries.companyId = this.activeCompanyId;

    // Generate ID if new
    if (!this.currentSeries.id) {
      this.currentSeries.id = `SERIES_${this.currentSeries.code}_${this.activeCompanyId}_${Date.now()}`;
    }

    this.dataService.saveSeries(this.currentSeries).subscribe(() => {
      // Propagate to Document Types
      this.propagateToDocumentTypes(this.currentSeries);

      this.showModal = false;
      this.loadSeries(); // Reload to update UI
    });
  }

  deleteSeries(series: Series) {
    if (!this.activeCompanyId) return;

    if (confirm(`Tem a certeza que deseja eliminar a série ${series.code}?`)) {
      this.dataService.deleteSeries(series.id).subscribe(() => {
        // Remove from Document Types
        this.removeFromDocumentTypes(series);
        this.loadSeries();
      });
    }
  }

  private propagateToDocumentTypes(series: Series) {
    const modules = [
      { key: 'erp_sales_document_types' },
      { key: 'erp_purchase_document_types' },
      { key: 'erp_stock_document_types' },
      { key: 'erp_treasury_document_types' }
    ];

    modules.forEach(mod => {
      const stored = localStorage.getItem(mod.key);
      if (stored) {
        const docTypes = JSON.parse(stored);
        let updated = false;

        docTypes.forEach((dt: any) => {
          if (!dt.series) dt.series = [];

          // Check if exists (match by code and company)
          const existing = dt.series.find((s: any) => s.code === series.code && s.companyId === series.companyId);

          if (existing) {
            // Update details
            existing.description = series.description;
            existing.startDate = series.startDate;
            existing.endDate = series.endDate;
            existing.active = series.active;
            // Don't reset currentNumber if it exists
          } else {
            // Add new
            dt.series.unshift({
              code: series.code,
              description: series.description,
              startDate: series.startDate,
              endDate: series.endDate,
              active: series.active,
              companyId: series.companyId,
              currentNumber: 1 // Initialize counter
            });
          }
          updated = true;
        });

        if (updated) {
          localStorage.setItem(mod.key, JSON.stringify(docTypes));
        }
      }
    });
  }

  private removeFromDocumentTypes(series: Series) {
    const modules = [
      { key: 'erp_sales_document_types' },
      { key: 'erp_purchase_document_types' },
      { key: 'erp_stock_document_types' },
      { key: 'erp_treasury_document_types' }
    ];

    modules.forEach(mod => {
      const stored = localStorage.getItem(mod.key);
      if (stored) {
        const docTypes = JSON.parse(stored);
        let updated = false;

        docTypes.forEach((dt: any) => {
          if (dt.series) {
            const initialLength = dt.series.length;
            dt.series = dt.series.filter((s: any) => !(s.code === series.code && s.companyId === series.companyId));
            if (dt.series.length !== initialLength) updated = true;
          }
        });

        if (updated) {
          localStorage.setItem(mod.key, JSON.stringify(docTypes));
        }
      }
    });
  }
}
