import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HRService, Employee } from '../../shared/hr.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const API_BASE = 'http://localhost:3000';

interface Absence {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: string;
}

const ABSENCE_TYPES: Record<string, { label: string; color: string }> = {
  VACATION:   { label: 'Férias',         color: 'bg-blue-100 text-blue-700' },
  SICKNESS:   { label: 'Baixa Médica',   color: 'bg-red-100 text-red-700' },
  JUSTIFIED:  { label: 'Falta Justificada', color: 'bg-yellow-100 text-yellow-700' },
  UNJUSTIFIED:{ label: 'Falta Injustificada', color: 'bg-gray-200 text-gray-700' },
  MATERNITY:  { label: 'Licença Maternidade', color: 'bg-pink-100 text-pink-700' },
  OTHER:      { label: 'Outro',          color: 'bg-purple-100 text-purple-700' },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Pendente',  color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovado',  color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
};

@Component({
  selector: 'app-absences-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0] p-4 gap-4">

      <!-- Header & Actions -->
      <div class="flex justify-between items-center bg-white p-4 rounded shadow-sm border-l-4 border-indigo-600">
        <div>
          <h1 class="text-xl font-bold text-gray-800">Férias e Ausências</h1>
          <p class="text-xs text-gray-500 uppercase tracking-wider">Gestão de Presenças</p>
        </div>
        <button (click)="openForm()"
          class="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-700 shadow-md">
          <app-icon name="add_circle" [size]="18"></app-icon>
          Nova Ausência
        </button>
      </div>

      <!-- Filters -->
      <div class="flex gap-3 items-center bg-white px-4 py-2 rounded shadow-sm text-xs">
        <label class="font-bold text-gray-500 uppercase">Filtrar:</label>
        <select [(ngModel)]="filterType" (ngModelChange)="applyFilters()" class="border rounded px-2 py-1">
          <option value="">Todos os tipos</option>
          <option *ngFor="let t of typeKeys" [value]="t">{{ absenceTypes[t].label }}</option>
        </select>
        <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" class="border rounded px-2 py-1">
          <option value="">Todos os estados</option>
          <option *ngFor="let s of statusKeys" [value]="s">{{ statusMap[s].label }}</option>
        </select>
        <div class="ml-auto text-gray-400">{{ filtered.length }} registo(s)</div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded shadow-sm overflow-hidden flex-1">
        <div class="overflow-x-auto h-full">
          <table class="w-full text-xs text-left">
            <thead class="bg-gray-50 text-gray-500 uppercase font-bold border-b">
              <tr>
                <th class="p-3">Funcionário</th>
                <th class="p-3">Tipo</th>
                <th class="p-3">Início</th>
                <th class="p-3">Fim</th>
                <th class="p-3 text-center">Dias</th>
                <th class="p-3">Motivo</th>
                <th class="p-3 text-center">Estado</th>
                <th class="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr *ngFor="let a of filtered" class="hover:bg-indigo-50 transition-colors">
                <td class="p-3 font-bold">{{ a.employeeName || a.employeeId }}</td>
                <td class="p-3">
                  <span [class]="'px-2 py-0.5 rounded-full text-[10px] font-bold ' + absenceTypes[a.type]?.color">
                    {{ absenceTypes[a.type]?.label }}
                  </span>
                </td>
                <td class="p-3 font-mono">{{ a.startDate | date:'dd/MM/yyyy' }}</td>
                <td class="p-3 font-mono">{{ a.endDate | date:'dd/MM/yyyy' }}</td>
                <td class="p-3 text-center font-bold">{{ a.days }}</td>
                <td class="p-3 text-gray-600 truncate max-w-[180px]">{{ a.reason || '-' }}</td>
                <td class="p-3 text-center">
                  <span [class]="'px-2 py-0.5 rounded-full text-[10px] font-bold ' + statusMap[a.status]?.color">
                    {{ statusMap[a.status]?.label }}
                  </span>
                </td>
                <td class="p-3 text-center flex gap-1 justify-center">
                  <button *ngIf="a.status === 'PENDING'" (click)="updateStatus(a, 'APPROVED')"
                    class="p-1 hover:bg-green-100 rounded border border-transparent hover:border-green-300 transition-colors" title="Aprovar">
                    <app-icon name="check_circle" [size]="18" color="#16a34a"></app-icon>
                  </button>
                  <button *ngIf="a.status === 'PENDING'" (click)="updateStatus(a, 'REJECTED')"
                    class="p-1 hover:bg-red-100 rounded border border-transparent hover:border-red-300 transition-colors" title="Rejeitar">
                    <app-icon name="cancel" [size]="18" color="#dc2626"></app-icon>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filtered.length === 0" class="h-40">
                <td colspan="8" class="text-center text-gray-400 italic">
                  Nenhuma ausência registada. Clique em "Nova Ausência" para registar.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Form -->
      <div *ngIf="showForm" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
          <h2 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
            <app-icon name="event_busy" [size]="22" color="#4338ca"></app-icon>
            Registar Ausência
          </h2>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Funcionário</label>
              <select [(ngModel)]="form.employeeId" class="w-full px-3 py-2 border rounded text-xs focus:outline-none focus:border-indigo-500">
                <option value="">-- Selecione --</option>
                <option *ngFor="let e of employees" [value]="e.id">{{ e.code }} - {{ e.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
              <select [(ngModel)]="form.type" class="w-full px-3 py-2 border rounded text-xs">
                <option *ngFor="let t of typeKeys" [value]="t">{{ absenceTypes[t].label }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Data Início</label>
                <input type="date" [(ngModel)]="form.startDate" (change)="calcDays()" class="w-full px-3 py-2 border rounded text-xs">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fim</label>
                <input type="date" [(ngModel)]="form.endDate" (change)="calcDays()" class="w-full px-3 py-2 border rounded text-xs">
              </div>
            </div>

            <div class="bg-indigo-50 rounded px-3 py-2 text-xs text-indigo-700 font-bold">
              Dias calculados: {{ form.days }} dia(s)
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo / Observação</label>
              <textarea [(ngModel)]="form.reason" rows="2" class="w-full px-3 py-2 border rounded text-xs resize-none"></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6 border-t pt-4">
            <button (click)="showForm = false" class="px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
            <button (click)="saveAbsence()" class="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-md">Guardar</button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class AbsencesManagementComponent implements OnInit, OnDestroy {
  absences: Absence[] = [];
  filtered: Absence[] = [];
  employees: Employee[] = [];
  showForm = false;
  filterType = '';
  filterStatus = '';

  form: any = { employeeId: '', type: 'VACATION', startDate: '', endDate: '', days: 0, reason: '' };

  absenceTypes = ABSENCE_TYPES;
  statusMap = STATUS_MAP;
  typeKeys = Object.keys(ABSENCE_TYPES);
  statusKeys = Object.keys(STATUS_MAP);

  private sub = new Subscription();
  private apiUrl = `${API_BASE}/hr`;

  constructor(
    private hrService: HRService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    this.sub.add(this.hrService.loadEmployees(company.id).subscribe(e => { this.employees = e; }));
    this.loadAbsences(company.id);
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  loadAbsences(companyId: string) {
    this.sub.add(this.http.get<Absence[]>(`${this.apiUrl}/absences?companyId=${companyId}`).subscribe({
      next: (data) => {
        this.absences = data.map(a => ({
          ...a,
          employeeName: this.employees.find(e => e.id === a.employeeId)?.name
        }));
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => this.absences = []
    }));
  }

  applyFilters() {
    this.filtered = this.absences.filter(a =>
      (!this.filterType || a.type === this.filterType) &&
      (!this.filterStatus || a.status === this.filterStatus)
    );
  }

  openForm() {
    this.form = { employeeId: '', type: 'VACATION', startDate: '', endDate: '', days: 0, reason: '' };
    this.showForm = true;
  }

  calcDays() {
    if (this.form.startDate && this.form.endDate) {
      const start = new Date(this.form.startDate);
      const end = new Date(this.form.endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      this.form.days = Math.max(0, diff);
    }
  }

  saveAbsence() {
    if (!this.form.employeeId || !this.form.startDate || !this.form.endDate) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    const payload = { ...this.form, companyId: company.id, status: 'PENDING' };
    this.sub.add(this.http.post<Absence>(`${this.apiUrl}/absences`, payload).subscribe({
      next: () => {
        this.showForm = false;
        this.loadAbsences(company.id);
      },
      error: (e) => alert('Erro: ' + e.message)
    }));
  }

  updateStatus(absence: Absence, status: string) {
    this.sub.add(this.http.patch(`${this.apiUrl}/absences/${absence.id}/status`, { status }).subscribe({
      next: () => {
        const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
        this.loadAbsences(company.id);
      },
      error: (e) => alert('Erro ao actualizar: ' + e.message)
    }));
  }
}
