import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

interface FiscalYear {
  year: number;
  status: 'OPEN' | 'CLOSED';
  isCurrent: boolean;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-admin-fiscal-years',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-600">calendar_month</span>
            Exercícios Económicos
          </h2>
          <button (click)="openNewYearModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
            <span class="material-symbols-outlined text-[18px]">add_circle</span>
            Novo Exercício
          </button>
        </div>

        <div class="p-6">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th class="px-4 py-3">Ano</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Início</th>
                <th class="px-4 py-3">Fim</th>
                <th class="px-4 py-3 text-center">Atual</th>
                <th class="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let year of fiscalYears" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-medium text-gray-900">{{ year.year }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 rounded-full text-xs font-medium" 
                    [ngClass]="year.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                    {{ year.status === 'OPEN' ? 'Aberto' : 'Fechado' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ year.startDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ year.endDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-4 py-3 text-center">
                  <span *ngIf="year.isCurrent" class="material-symbols-outlined text-green-600">check_circle</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button *ngIf="!year.isCurrent && year.status === 'OPEN'" (click)="setAsCurrent(year)" class="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3">
                    Definir como Atual
                  </button>
                  <button *ngIf="year.status === 'OPEN'" (click)="closeYear(year)" class="text-red-600 hover:text-red-800 text-xs font-medium">
                    Fechar Ano
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- New Year Modal -->
    <div *ngIf="showNewYearModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-96 overflow-hidden transform transition-all scale-100">
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">Abertura de Novo Ano</h3>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <input type="number" [(ngModel)]="newYearModel.year" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" min="2000" max="2100">
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <p class="font-medium mb-1">ℹ️ Ações Automáticas:</p>
            <ul class="list-disc list-inside space-y-1">
              <li>Criação de séries para todos os documentos</li>
              <li>Definição como ano corrente</li>
              <li>Inicialização de contadores</li>
            </ul>
          </div>
        </div>
        <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="showNewYearModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors">Cancelar</button>
          <button (click)="createYear()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors">Confirmar Abertura</button>
        </div>
      </div>
    </div>
  `
})
export class AdminFiscalYearsComponent implements OnInit {
  fiscalYears: FiscalYear[] = [];
  showNewYearModal = false;
  newYearModel = { year: new Date().getFullYear() + 1 };
  activeCompanyId: string | null = null;

  constructor(private dataService: DataService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadActiveCompany();
  }

  loadActiveCompany() {
    this.dataService.getCompanyInfo().subscribe(info => {
      this.activeCompanyId = info.id;
      this.loadFiscalYears();
    });
  }

  loadFiscalYears() {
    if (!this.activeCompanyId) return;

    this.dataService.getFiscalYears(this.activeCompanyId).subscribe(years => {
      this.fiscalYears = years;
      if (this.fiscalYears.length === 0) {
        const currentYear = new Date().getFullYear();
        const initialYear: any = {
          year: currentYear,
          status: 'OPEN',
          isCurrent: true,
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`,
          companyId: this.activeCompanyId
        };
        this.dataService.saveFiscalYear(initialYear).subscribe(saved => {
          this.fiscalYears = [saved];
          this.cdr.detectChanges();
        });
      } else {
        this.cdr.detectChanges();
      }
    });
  }

  openNewYearModal() {
    const maxYear = Math.max(...this.fiscalYears.map(y => y.year));
    this.newYearModel.year = maxYear + 1;
    this.showNewYearModal = true;
  }

  createYear() {
    const year = this.newYearModel.year;

    if (this.fiscalYears.find(y => y.year === year)) {
      alert('Este exercício já existe!');
      return;
    }

    const newYear: any = {
      year: year,
      status: 'OPEN',
      isCurrent: true,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      companyId: this.activeCompanyId
    };

    // First set others as not current (locally for UI, backend handles it via setAsCurrentYear logic usually, but here we are creating new as current)
    // Actually, let's save the new year first.
    this.dataService.saveFiscalYear(newYear).subscribe(saved => {
      // If we want it to be current, we might need to call setAsCurrent or ensure backend handles "isCurrent: true" on create by unsetting others.
      // Our DataService.saveFiscalYear just saves.
      // Let's explicitly set as current to be safe.
      this.dataService.setAsCurrentYear(year, this.activeCompanyId!).subscribe(() => {
        this.loadFiscalYears();
        this.createSeriesForYear(year.toString());
        this.showNewYearModal = false;
        alert(`Exercício de ${year} aberto com sucesso! As séries de documentos foram criadas.`);
      });
    });
  }

  setAsCurrent(targetYear: FiscalYear) {
    if (!this.activeCompanyId) return;
    this.dataService.setAsCurrentYear(targetYear.year, this.activeCompanyId).subscribe(() => {
      this.loadFiscalYears();
    });
  }

  closeYear(targetYear: FiscalYear) {
    if (confirm(`Tem certeza que deseja fechar o exercício de ${targetYear.year}?`)) {
      const updated = { ...targetYear, status: 'CLOSED' };
      this.dataService.saveFiscalYear(updated).subscribe(() => {
        this.loadFiscalYears();
      });
    }
  }

  createSeriesForYear(yearCode: string) {
    // Create Global Series Definition via DataService
    if (this.activeCompanyId) {
      const globalSeries = {
        code: yearCode,
        description: `Série ${yearCode}`,
        startDate: `${yearCode}-01-01`,
        endDate: `${yearCode}-12-31`,
        companyId: this.activeCompanyId,
        active: true,
        module: 'GLOBAL',
        id: `SERIES_${yearCode}_${this.activeCompanyId}_${Date.now()}`
      };
      this.dataService.saveSeries(globalSeries).subscribe();
    }

    // Propagate to Document Types (Legacy/LocalStorage for now)
    const modules = [
      { key: 'erp_sales_document_types', name: 'Vendas' },
      { key: 'erp_purchase_document_types', name: 'Compras' },
      { key: 'erp_stock_document_types', name: 'Stock' },
      { key: 'erp_treasury_document_types', name: 'Tesouraria' }
    ];

    modules.forEach(mod => {
      const stored = localStorage.getItem(mod.key);
      if (stored) {
        const docTypes = JSON.parse(stored);
        let updated = false;

        docTypes.forEach((dt: any) => {
          if (!dt.series) dt.series = [];
          // Check if series exists for this company
          if (!dt.series.find((s: any) => s.code === yearCode && s.companyId === this.activeCompanyId)) {
            dt.series.unshift({
              code: yearCode,
              description: `Série ${yearCode}`,
              active: true,
              startDate: `${yearCode}-01-01`,
              endDate: `${yearCode}-12-31`,
              companyId: this.activeCompanyId
            });
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem(mod.key, JSON.stringify(docTypes));
        }
      }
    });
  }
}
