import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';
import { environment } from '../../shared/config';

@Pipe({ name: 'activeCount', standalone: true, pure: false })
export class ActiveCountPipe implements PipeTransform {
  transform(list: CostCenter[]): number {
    return (list || []).filter(c => c.isActive).length;
  }
}

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  isActive: boolean;
}

const TYPES = [
  { value: 'OPERATIONAL',    label: 'Operacional' },
  { value: 'ADMINISTRATIVE', label: 'Administrativo' },
  { value: 'COMMERCIAL',     label: 'Comercial' },
  { value: 'INVESTMENT',     label: 'Investimento' },
];

@Component({
  selector: 'app-cost-centers',
  standalone: true,
  imports: [CommonModule, FormsModule, ActiveCountPipe],
  template: `
<div class="flex flex-col h-full bg-[#F0F0F0] overflow-hidden font-sans text-sm">

  <!-- Toolbar -->
  <div class="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-300 shrink-0 flex-wrap">
    <span class="material-symbols-outlined text-blue-600 text-[20px]">business_center</span>
    <span class="font-semibold text-gray-800">Centros de Custo</span>
    <span class="text-gray-300">|</span>

    <button (click)="openNew()"
      class="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors">
      <span class="material-symbols-outlined text-[15px]">add</span>
      Novo
    </button>

    <div class="ml-auto flex items-center gap-2">
      <select [(ngModel)]="filterType" (ngModelChange)="applyFilter()"
        class="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400">
        <option value="">Todos os tipos</option>
        <option *ngFor="let t of types" [value]="t.value">{{ t.label }}</option>
      </select>

      <select [(ngModel)]="filterActive" (ngModelChange)="applyFilter()"
        class="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400">
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Inactivos</option>
      </select>

      <input [(ngModel)]="searchTerm" (ngModelChange)="applyFilter()"
        placeholder="Pesquisar..."
        class="border border-gray-300 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:border-blue-400">
    </div>
  </div>

  <!-- Main body -->
  <div class="flex flex-1 overflow-hidden">

    <!-- List -->
    <div class="flex-1 overflow-y-auto">
      <div *ngIf="loading" class="flex items-center justify-center h-32 text-gray-400 text-xs gap-2">
        <span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
        A carregar...
      </div>

      <div *ngIf="!loading && !filtered.length"
        class="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
        <span class="material-symbols-outlined text-[40px]">business_center</span>
        <span>Sem centros de custo</span>
        <button (click)="openNew()"
          class="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors">
          Criar primeiro centro
        </button>
      </div>

      <table *ngIf="!loading && filtered.length" class="w-full text-xs">
        <thead class="bg-gray-100 text-gray-500 uppercase text-[10px] sticky top-0">
          <tr>
            <th class="px-4 py-2.5 text-left border-b border-gray-200">Código</th>
            <th class="px-4 py-2.5 text-left border-b border-gray-200">Nome</th>
            <th class="px-4 py-2.5 text-left border-b border-gray-200">Tipo</th>
            <th class="px-4 py-2.5 text-left border-b border-gray-200">Descrição</th>
            <th class="px-4 py-2.5 text-center border-b border-gray-200">Estado</th>
            <th class="px-4 py-2.5 text-center border-b border-gray-200">Acções</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let cc of filtered; let odd = odd"
            [class.bg-white]="!odd" [class.bg-gray-50]="odd"
            class="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
            (click)="openEdit(cc)">
            <td class="px-4 py-2.5 font-mono font-semibold text-blue-700">{{ cc.code }}</td>
            <td class="px-4 py-2.5 text-gray-900 font-medium">{{ cc.name }}</td>
            <td class="px-4 py-2.5">
              <span [class]="typeBadge(cc.type)" class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                {{ typeLabel(cc.type) }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-gray-500 truncate max-w-[240px]">{{ cc.description || '—' }}</td>
            <td class="px-4 py-2.5 text-center">
              <span [class]="cc.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                {{ cc.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-center" (click)="$event.stopPropagation()">
              <button (click)="openEdit(cc)" class="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors" title="Editar">
                <span class="material-symbols-outlined text-[16px]">edit</span>
              </button>
              <button (click)="toggleActive(cc)" class="p-1 hover:bg-amber-100 rounded text-amber-600 transition-colors ml-1"
                [title]="cc.isActive ? 'Desactivar' : 'Activar'">
                <span class="material-symbols-outlined text-[16px]">{{ cc.isActive ? 'toggle_on' : 'toggle_off' }}</span>
              </button>
              <button (click)="confirmDelete(cc)" class="p-1 hover:bg-red-100 rounded text-red-500 transition-colors ml-1" title="Eliminar">
                <span class="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form panel (slide in from right) -->
    <div *ngIf="showForm"
      class="w-[380px] shrink-0 bg-white border-l border-gray-300 flex flex-col overflow-hidden shadow-lg">

      <!-- Form header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-blue-600 text-[18px]">{{ editingId ? 'edit' : 'add_circle' }}</span>
          <span class="font-semibold text-gray-800">{{ editingId ? 'Editar Centro' : 'Novo Centro de Custo' }}</span>
        </div>
        <button (click)="closeForm()" class="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <!-- Form body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">

        <!-- Código -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">
            Código <span class="text-red-500">*</span>
          </label>
          <input [(ngModel)]="form.code" [disabled]="!!editingId"
            placeholder="Ex: CC01, ADMIN, VENDAS"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 uppercase"
            (input)="form.code = form.code.toUpperCase()">
          <p *ngIf="editingId" class="text-[10px] text-gray-400 mt-0.5">O código não pode ser alterado após criação.</p>
        </div>

        <!-- Nome -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">
            Nome <span class="text-red-500">*</span>
          </label>
          <input [(ngModel)]="form.name"
            placeholder="Ex: Departamento Comercial"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
        </div>

        <!-- Tipo -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Tipo</label>
          <select [(ngModel)]="form.type"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
            <option *ngFor="let t of types" [value]="t.value">{{ t.label }}</option>
          </select>
        </div>

        <!-- Descrição -->
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
          <textarea [(ngModel)]="form.description" rows="3"
            placeholder="Descrição opcional do centro de custo..."
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"></textarea>
        </div>

        <!-- Estado -->
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" [(ngModel)]="form.isActive" class="sr-only peer">
            <div class="w-9 h-5 bg-gray-300 peer-checked:bg-blue-600 rounded-full transition-colors"></div>
            <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow"></div>
          </label>
          <span class="text-sm text-gray-700">{{ form.isActive ? 'Activo' : 'Inactivo' }}</span>
        </div>

      </div>

      <!-- Form footer -->
      <div class="flex gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
        <button (click)="save()" [disabled]="saving || !form.code || !form.name"
          class="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50 transition-colors">
          <span class="material-symbols-outlined text-[16px]">{{ saving ? 'hourglass_empty' : 'save' }}</span>
          {{ saving ? 'A gravar...' : 'Gravar' }}
        </button>
        <button (click)="closeForm()"
          class="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </div>

  </div>

  <!-- Stats bar -->
  <div class="flex items-center gap-4 px-4 py-1.5 bg-white border-t border-gray-200 text-[11px] text-gray-500 shrink-0">
    <span>Total: <strong class="text-gray-800">{{ all.length }}</strong></span>
    <span>Activos: <strong class="text-green-700">{{ all | activeCount }}</strong></span>
    <span class="ml-auto">Filtrados: <strong class="text-blue-700">{{ filtered.length }}</strong></span>
  </div>

</div>
  `,
})
export class CostCentersComponent implements OnInit {
  private baseUrl = environment.apiUrl;

  types = TYPES;
  all: CostCenter[] = [];
  filtered: CostCenter[] = [];

  loading = false;
  saving = false;
  showForm = false;
  editingId: string | null = null;

  searchTerm = '';
  filterType = '';
  filterActive = '';

  form: Partial<CostCenter> = this.emptyForm();

  constructor(
    private http: HttpClient,
    private dataService: DataService,
    private toaster: ToasterService,
  ) {}

  ngOnInit() {
    this.load();
  }

  private get companyId(): string | undefined {
    return this.dataService.getCurrentCompany()?.id;
  }

  load() {
    this.loading = true;
    const params: any = {};
    if (this.companyId) params.companyId = this.companyId;
    this.http.get<CostCenter[]>(`${this.baseUrl}/accounting/cost-centers`, { params }).subscribe({
      next: data => { this.all = data; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    this.filtered = this.all.filter(cc => {
      const s = this.searchTerm.toLowerCase();
      const matchSearch = !s || cc.code.toLowerCase().includes(s) || cc.name.toLowerCase().includes(s) || (cc.description || '').toLowerCase().includes(s);
      const matchType = !this.filterType || cc.type === this.filterType;
      const matchActive = !this.filterActive || String(cc.isActive) === this.filterActive;
      return matchSearch && matchType && matchActive;
    });
  }

  openNew() {
    this.editingId = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(cc: CostCenter) {
    this.editingId = cc.id;
    this.form = { ...cc };
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
    this.form = this.emptyForm();
  }

  save() {
    if (!this.form.code?.trim() || !this.form.name?.trim()) {
      this.toaster.showError('Validação', 'Código e nome são obrigatórios.');
      return;
    }
    this.saving = true;
    const params: any = {};
    if (this.companyId) params.companyId = this.companyId;

    const req = this.editingId
      ? this.http.patch<CostCenter>(`${this.baseUrl}/accounting/cost-centers/${this.editingId}`, this.form, { params })
      : this.http.post<CostCenter>(`${this.baseUrl}/accounting/cost-centers`, this.form, { params });

    req.subscribe({
      next: () => {
        this.toaster.showSuccess('Sucesso', this.editingId ? 'Centro actualizado.' : 'Centro criado.');
        this.saving = false;
        this.closeForm();
        this.load();
      },
      error: err => {
        this.saving = false;
        this.toaster.showError('Erro', err.error?.message || 'Erro ao gravar centro de custo.');
      }
    });
  }

  toggleActive(cc: CostCenter) {
    const params: any = {};
    if (this.companyId) params.companyId = this.companyId;
    this.http.patch(`${this.baseUrl}/accounting/cost-centers/${cc.id}`, { isActive: !cc.isActive }, { params }).subscribe({
      next: () => { cc.isActive = !cc.isActive; this.applyFilter(); },
      error: err => this.toaster.showError('Erro', err.error?.message || 'Erro ao actualizar estado.')
    });
  }

  confirmDelete(cc: CostCenter) {
    if (!confirm(`Eliminar centro "${cc.code} — ${cc.name}"?`)) return;
    const params: any = {};
    if (this.companyId) params.companyId = this.companyId;
    this.http.delete(`${this.baseUrl}/accounting/cost-centers/${cc.id}`, { params }).subscribe({
      next: () => { this.toaster.showSuccess('Eliminado', 'Centro de custo eliminado.'); this.load(); },
      error: err => this.toaster.showError('Erro', err.error?.message || 'Erro ao eliminar.')
    });
  }

  private emptyForm(): Partial<CostCenter> {
    return { code: '', name: '', description: '', type: 'OPERATIONAL', isActive: true };
  }

  typeLabel(type: string): string {
    return TYPES.find(t => t.value === type)?.label || type;
  }

  typeBadge(type: string): string {
    const map: Record<string, string> = {
      OPERATIONAL:    'bg-blue-100 text-blue-700',
      ADMINISTRATIVE: 'bg-purple-100 text-purple-700',
      COMMERCIAL:     'bg-green-100 text-green-700',
      INVESTMENT:     'bg-amber-100 text-amber-700',
    };
    return map[type] || 'bg-gray-100 text-gray-600';
  }
}

