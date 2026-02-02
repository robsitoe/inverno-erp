import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SALES_DOCUMENT_TYPES, PURCHASE_DOCUMENT_TYPES, TREASURY_DOCUMENT_TYPES } from '../../shared/constants';
import { DataService } from '../../services/data.service';

interface DocumentType {
  code: string;
  description: string;
  module: 'SALES' | 'PURCHASES' | 'TREASURY';
  series?: DocumentSeries[];
  nature?: string;
}

interface DocumentSeries {
  code: string;
  description: string;
  active: boolean;
  companyId?: string;
}

@Component({
  selector: 'app-document-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-gray-100 p-4">
      <div class="bg-white rounded shadow p-4 flex flex-col h-full">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Configuração de Tipos de Documento</h2>

        <!-- Module Selector -->
        <div class="flex gap-4 mb-4 border-b border-gray-200 pb-4">
          <button 
            (click)="activeModule = 'SALES'"
            [class]="'px-4 py-2 rounded font-medium transition-colors ' + (activeModule === 'SALES' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')"
          >
            Vendas
          </button>
          <button 
            (click)="activeModule = 'PURCHASES'"
            [class]="'px-4 py-2 rounded font-medium transition-colors ' + (activeModule === 'PURCHASES' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')"
          >
            Compras
          </button>
          <button 
            (click)="activeModule = 'TREASURY'"
            [class]="'px-4 py-2 rounded font-medium transition-colors ' + (activeModule === 'TREASURY' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')"
          >
            Tesouraria
          </button>
        </div>

        <!-- Toolbar -->
        <div class="flex gap-2 mb-4">
          <button (click)="startNew()" class="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
            <span class="material-symbols-outlined text-sm">add</span>
            Novo
          </button>
          <button (click)="deleteSelected()" [disabled]="!selectedType" class="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-sm">delete</span>
            Eliminar
          </button>
        </div>

        <!-- Grid -->
        <div class="flex-1 overflow-auto border border-gray-200 rounded mb-4">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-700 font-semibold sticky top-0">
              <tr>
                <th class="px-4 py-2 border-b">Código</th>
                <th class="px-4 py-2 border-b">Descrição</th>
                <th *ngIf="activeModule === 'TREASURY'" class="px-4 py-2 border-b">Natureza</th>
                <th class="px-4 py-2 border-b">Séries</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let type of filteredTypes" 
                  (click)="selectType(type)"
                  [class]="'cursor-pointer hover:bg-gray-50 border-b ' + (selectedType === type ? 'bg-blue-50' : '')">
                <td class="px-4 py-2 font-medium">{{ type.code }}</td>
                <td class="px-4 py-2">{{ type.description }}</td>
                <td *ngIf="activeModule === 'TREASURY'" class="px-4 py-2 text-gray-600">{{ type.nature }}</td>
                <td class="px-4 py-2 text-gray-500 text-xs">
                  {{ type.series?.length || 0 }} séries
                </td>
              </tr>
              <tr *ngIf="filteredTypes.length === 0">
                <td [attr.colspan]="activeModule === 'TREASURY' ? 4 : 3" class="px-4 py-8 text-center text-gray-500">
                  Nenhum tipo de documento encontrado para este módulo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Editor (Bottom Panel) -->
        <div class="border-t border-gray-200 pt-4" *ngIf="isEditing || selectedType">
          <div class="flex justify-between items-start mb-4">
             <h3 class="font-semibold text-gray-700">{{ isEditing ? 'Novo Tipo de Documento' : 'Editar Tipo de Documento' }}</h3>
             <div class="flex gap-2">
                <button *ngIf="isEditing" (click)="cancelEdit()" class="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-sm">Cancelar</button>
                <button (click)="save()" class="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Gravar</button>
             </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Código</label>
              <input type="text" [(ngModel)]="editingType.code" [disabled]="!isEditing" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 uppercase" maxlength="3">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <input type="text" [(ngModel)]="editingType.description" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500">
            </div>
            <div *ngIf="activeModule === 'TREASURY'">
              <label class="block text-xs font-medium text-gray-700 mb-1">Natureza</label>
              <select [(ngModel)]="editingType.nature" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500">
                <option value="RECEIVE">Recebimento (Clientes)</option>
                <option value="PAY">Pagamento (Fornecedores)</option>
                <option value="INTERNAL">Interno (Bancos/Caixa)</option>
              </select>
            </div>
          </div>

          <!-- Series Management Section -->
          <div *ngIf="!isEditing && selectedType" class="border-t border-gray-200 pt-4">
            <h4 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">list_alt</span>
              Séries Disponíveis
            </h4>
            
            <div class="border border-gray-200 rounded overflow-hidden">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 text-gray-700 font-semibold">
                  <tr>
                    <th class="px-4 py-2 border-b w-16 text-center">Usar</th>
                    <th class="px-4 py-2 border-b w-32">Série</th>
                    <th class="px-4 py-2 border-b">Descrição</th>
                    <th class="px-4 py-2 border-b w-32">Validade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let serie of globalSeries" class="border-b last:border-0 hover:bg-gray-50">
                    <td class="px-4 py-2 text-center">
                      <input type="checkbox" 
                             [checked]="isAssociated(serie)" 
                             (change)="toggleAssociation(serie)"
                             class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer">
                    </td>
                    <td class="px-4 py-2 font-medium">{{ serie.code }}</td>
                    <td class="px-4 py-2">{{ serie.description }}</td>
                    <td class="px-4 py-2 text-gray-500 text-xs">
                      {{ serie.startDate | date:'dd/MM/yyyy' }} - {{ serie.endDate | date:'dd/MM/yyyy' }}
                    </td>
                  </tr>
                  <tr *ngIf="globalSeries.length === 0">
                    <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                      Nenhuma série global encontrada para esta empresa.
                      <br>
                      <span class="text-xs">Crie séries no menu "Empresas > Séries".</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class DocumentTypesComponent implements OnInit {
  activeModule: 'SALES' | 'PURCHASES' | 'TREASURY' = 'SALES';

  salesTypes: DocumentType[] = [];
  purchaseTypes: DocumentType[] = [];
  treasuryTypes: DocumentType[] = [];

  selectedType: DocumentType | null = null;
  editingType: DocumentType = { code: '', description: '', module: 'SALES', series: [] };
  isEditing = false;

  activeCompanyId: string | null = null;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.loadActiveCompany();
    this.loadTypes();
  }

  loadActiveCompany() {
    this.dataService.getCompanyInfo().subscribe(info => {
      this.activeCompanyId = info.id;
      this.loadGlobalSeries(); // Reload series when company is loaded
    });
  }

  get filteredTypes() {
    if (this.activeModule === 'SALES') return this.salesTypes;
    if (this.activeModule === 'PURCHASES') return this.purchaseTypes;
    return this.treasuryTypes;
  }

  loadTypes() {
    this.dataService.getDocumentTypes('SALES').subscribe(types => this.salesTypes = types);
    this.dataService.getDocumentTypes('PURCHASES').subscribe(types => this.purchaseTypes = types);
    this.dataService.getDocumentTypes('TREASURY').subscribe(types => this.treasuryTypes = types);
  }

  saveToStorage(module: 'SALES' | 'PURCHASES' | 'TREASURY') {
    const list = module === 'SALES' ? this.salesTypes : (module === 'PURCHASES' ? this.purchaseTypes : this.treasuryTypes);
    this.dataService.saveDocumentTypes(module, list).subscribe();
  }

  selectType(type: DocumentType) {
    this.selectedType = type;
    this.isEditing = false;
    this.editingType = { ...type, series: type.series || [] };
    this.loadGlobalSeries();
  }

  startNew() {
    this.selectedType = null;
    this.isEditing = true;
    this.editingType = { code: '', description: '', module: this.activeModule, series: [] };
    if (this.activeModule === 'TREASURY') {
      this.editingType.nature = 'RECEIVE';
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.selectedType = null;
    this.editingType = { code: '', description: '', module: this.activeModule, series: [] };
  }

  save() {
    if (!this.editingType.code || !this.editingType.description) {
      alert('Preencha o código e a descrição.');
      return;
    }

    const list = this.activeModule === 'SALES' ? this.salesTypes : (this.activeModule === 'PURCHASES' ? this.purchaseTypes : this.treasuryTypes);

    if (this.isEditing) {
      // Check duplicate code
      if (list.some(t => t.code === this.editingType.code)) {
        alert('Já existe um documento com este código.');
        return;
      }
      list.push({ ...this.editingType, module: this.activeModule });
    } else {
      // Update existing
      const index = list.findIndex(t => t.code === this.editingType.code);
      if (index !== -1) {
        list[index] = { ...this.editingType, module: this.activeModule };
      }
    }

    this.saveToStorage(this.activeModule);

    if (this.isEditing) {
      this.isEditing = false;
      this.selectedType = null;
    } else {
      const updated = list.find(t => t.code === this.editingType.code);
      if (updated) this.selectedType = updated;
    }

    // Refresh list reference
    if (this.activeModule === 'SALES') this.salesTypes = [...this.salesTypes];
    else if (this.activeModule === 'PURCHASES') this.purchaseTypes = [...this.purchaseTypes];
    else this.treasuryTypes = [...this.treasuryTypes];
  }

  deleteSelected() {
    if (!this.selectedType) return;
    if (!confirm(`Tem a certeza que deseja eliminar o documento ${this.selectedType.code}?`)) return;

    if (this.activeModule === 'SALES') {
      this.salesTypes = this.salesTypes.filter(t => t.code !== this.selectedType!.code);
      this.saveToStorage('SALES');
    } else if (this.activeModule === 'PURCHASES') {
      this.purchaseTypes = this.purchaseTypes.filter(t => t.code !== this.selectedType!.code);
      this.saveToStorage('PURCHASES');
    } else {
      this.treasuryTypes = this.treasuryTypes.filter(t => t.code !== this.selectedType!.code);
      this.saveToStorage('TREASURY');
    }
    this.selectedType = null;
    this.isEditing = false;
  }

  // Global Series Loading
  globalSeries: any[] = [];

  loadGlobalSeries() {
    if (this.activeCompanyId) {
      this.dataService.getSeries(this.activeCompanyId).subscribe(series => {
        this.globalSeries = series;
        this.globalSeries.sort((a, b) => b.code.localeCompare(a.code));
      });
    } else {
      this.globalSeries = [];
    }
  }

  isAssociated(globalSerie: any): boolean {
    if (!this.editingType.series) return false;
    return this.editingType.series.some(s => s.code === globalSerie.code && s.companyId === this.activeCompanyId);
  }

  toggleAssociation(globalSerie: any) {
    if (!this.editingType.series) this.editingType.series = [];

    const index = this.editingType.series.findIndex(s => s.code === globalSerie.code && s.companyId === this.activeCompanyId);

    if (index !== -1) {
      // Remove
      this.editingType.series.splice(index, 1);
    } else {
      // Add
      this.editingType.series.push({
        code: globalSerie.code,
        description: globalSerie.description,
        active: true,
        companyId: this.activeCompanyId
      });
    }
    this.save();
  }
}
