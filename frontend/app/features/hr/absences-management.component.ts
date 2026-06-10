import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { HRService, Employee } from '../../shared/hr.service';

import { AppIconComponent } from '../../shared/components/app-icon.component';

import { Subscription } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../shared/config';



const API_BASE = environment.apiUrl;



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

  VACATION: { label: 'Férias', color: 'bg-blue-100 text-blue-700' },

  SICKNESS: { label: 'Baixa Médica', color: 'bg-red-100 text-red-700' },

  JUSTIFIED: { label: 'Falta Justificada', color: 'bg-yellow-100 text-yellow-700' },

  UNJUSTIFIED: { label: 'Falta Injustificada', color: 'bg-gray-200 text-gray-700' },

  MATERNITY: { label: 'Licença Maternidade', color: 'bg-pink-100 text-pink-700' },

  OTHER: { label: 'Outro', color: 'bg-purple-100 text-purple-700' },

};



const STATUS_MAP: Record<string, { label: string; color: string }> = {

  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },

  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },

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

        <div class="flex bg-gray-100 rounded-lg p-1 border border-gray-200 mr-2">
          <button (click)="viewMode = 'LIST'" [class]="'px-3 py-1.5 text-xs font-bold rounded-md transition-all ' + (viewMode === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500')">Lista</button>
          <button (click)="viewMode = 'PLAN'" [class]="'px-3 py-1.5 text-xs font-bold rounded-md transition-all ' + (viewMode === 'PLAN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500')">Plano Anual</button>
        </div>
        <button (click)="openForm()"

          class="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-700 shadow-md">

          <app-icon name="add_circle" [size]="18"></app-icon>

          Nova Ausência

        </button>

      </div>



      <!-- Filters -->

      <div *ngIf="viewMode === 'LIST'" class="flex gap-3 items-center bg-white px-4 py-2 rounded shadow-sm text-xs">

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



      <!-- Annual Vacation Plan -->
      <div *ngIf="viewMode === 'PLAN'" class="bg-white rounded shadow-sm flex-1 flex flex-col overflow-hidden">
        <div class="flex items-center gap-3 p-3 border-b bg-gray-50">
          <label class="text-xs font-bold text-gray-500 uppercase">Ano:</label>
          <select [(ngModel)]="planYear" class="border rounded px-2 py-1 text-xs">
            <option *ngFor="let y of planYears" [value]="y">{{ y }}</option>
          </select>
          <button (click)="generateSuggestions()" class="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700">
            <app-icon name="auto_awesome" [size]="14"></app-icon> Gerar Sugestões
          </button>
          <button *ngIf="suggestions.length > 0" (click)="submitPlan()" [disabled]="submittingPlan"
            class="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-700 disabled:bg-gray-400">
            <app-icon name="send" [size]="14"></app-icon> {{ submittingPlan ? 'A submeter...' : 'Submeter Plano (' + suggestions.length + ' pedidos)' }}
          </button>
          <button *ngIf="suggestions.length > 0" (click)="suggestions = []" class="text-xs text-gray-400 hover:text-red-500 font-bold">Limpar</button>
          <div class="ml-auto flex items-center gap-3 text-[10px] font-bold">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Aprovado</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-400 inline-block"></span> Pendente</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-400 border border-dashed border-blue-700 inline-block"></span> Sugestão</span>
          </div>
        </div>
        <div class="overflow-auto flex-1">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-gray-50 text-gray-500 uppercase font-bold border-b sticky top-0">
              <tr>
                <th class="p-2 text-left min-w-[180px]">Funcionário</th>
                <th class="p-2 text-center w-14">Direito</th>
                <th *ngFor="let m of monthsShort" class="p-2 text-center w-14">{{ m }}</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr *ngFor="let e of activeEmployees" class="hover:bg-blue-50">
                <td class="p-2 font-bold">{{ e.code }} - {{ e.name }}</td>
                <td class="p-2 text-center text-gray-500">{{ entitledDays(e) }}d</td>
                <td *ngFor="let m of monthIdx" class="p-1 text-center">
                  <span *ngIf="cellState(e, m) as st"
                    [class]="'inline-block w-9 h-5 rounded text-[9px] font-bold leading-5 text-white ' +
                      (st === 'APPROVED' ? 'bg-emerald-500' : st === 'PENDING' ? 'bg-amber-400' : 'bg-blue-400 border border-dashed border-blue-700')"
                    [title]="cellTitle(e, m)">{{ cellDays(e, m) }}d</span>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50 border-t font-bold sticky bottom-0">
              <tr>
                <td class="p-2 text-gray-500 uppercase" colspan="2">Em férias / mês</td>
                <td *ngFor="let m of monthIdx" class="p-2 text-center"
                  [class.text-red-600]="monthCount(m) > maxSimultaneous"
                  [title]="monthCount(m) > maxSimultaneous ? 'Acima do limite recomendado (' + maxSimultaneous + ') - risco para a operação' : ''">
                  {{ monthCount(m) || '-' }}<span *ngIf="monthCount(m) > maxSimultaneous"> ⚠</span>
                </td>
              </tr>
            </tfoot>
          </table>
          <div *ngIf="activeEmployees.length === 0" class="p-8 text-center text-gray-400 text-xs">Sem funcionários ativos.</div>
        </div>
        <div class="p-2 border-t bg-gray-50 text-[10px] text-gray-500">
          Direito a férias (Lei do Trabalho MZ): 1.º ano 12 dias · 2.º ano 24 dias · 3.º ano+ 30 dias. As sugestões são escalonadas para manter a operação (máx. {{ maxSimultaneous }} em simultâneo). Ao submeter, cada sugestão cria um pedido PENDENTE que pode ser aprovado/rejeitado na Lista.
        </div>
      </div>

      <!-- Table -->

      <div *ngIf="viewMode === 'LIST'" class="bg-white rounded shadow-sm overflow-hidden flex-1">

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

  ) { }



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



  // ── Plano Anual de Férias ──────────────────────────────────────────────────
  viewMode: 'LIST' | 'PLAN' = 'LIST';
  planYear = new Date().getFullYear();
  planYears = [new Date().getFullYear(), new Date().getFullYear() + 1];
  monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  monthIdx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  suggestions: any[] = [];
  submittingPlan = false;

  get activeEmployees(): any[] {
    return (this.employees || []).filter((e: any) => e.status !== 'INACTIVE' && e.status !== 'TERMINATED');
  }

  /** Max employees on vacation at once while keeping the company running (25%, min 1). */
  get maxSimultaneous(): number {
    return Math.max(1, Math.ceil(this.activeEmployees.length * 0.25));
  }

  /** Lei do Trabalho MZ art.99: 12 days in 1st year, 24 in 2nd, 30 from the 3rd on. */
  entitledDays(e: any): number {
    if (!e.hireDate) return 30;
    const years = (new Date(this.planYear, 11, 31).getTime() - new Date(e.hireDate).getTime()) / (365.25 * 86400000);
    if (years < 1) return 12;
    if (years < 2) return 24;
    return 30;
  }

  private vacationsOf(e: any): any[] {
    return (this.absences || []).filter((a: any) =>
      a.employeeId === e.id && a.type === 'VACATION' && a.status !== 'REJECTED' &&
      (new Date(a.startDate).getFullYear() === +this.planYear || new Date(a.endDate).getFullYear() === +this.planYear));
  }

  private overlapsMonth(startDate: string, endDate: string, m: number): boolean {
    const mStart = new Date(+this.planYear, m, 1);
    const mEnd = new Date(+this.planYear, m + 1, 0);
    return new Date(startDate) <= mEnd && new Date(endDate) >= mStart;
  }

  cellState(e: any, m: number): string | null {
    const vacs = this.vacationsOf(e);
    const ap = vacs.find((a: any) => a.status === 'APPROVED' && this.overlapsMonth(a.startDate, a.endDate, m));
    if (ap) return 'APPROVED';
    const pe = vacs.find((a: any) => a.status === 'PENDING' && this.overlapsMonth(a.startDate, a.endDate, m));
    if (pe) return 'PENDING';
    const sg = this.suggestions.find(sug => sug.employeeId === e.id && this.overlapsMonth(sug.startDate, sug.endDate, m));
    if (sg) return 'SUGGESTED';
    return null;
  }

  cellDays(e: any, m: number): number {
    const all = [...this.vacationsOf(e), ...this.suggestions.filter(sg => sg.employeeId === e.id)];
    const mStart = new Date(+this.planYear, m, 1).getTime();
    const mEnd = new Date(+this.planYear, m + 1, 0).getTime();
    let days = 0;
    all.forEach((a: any) => {
      const st = Math.max(new Date(a.startDate).getTime(), mStart);
      const en = Math.min(new Date(a.endDate).getTime(), mEnd);
      if (en >= st) days += Math.round((en - st) / 86400000) + 1;
    });
    return days;
  }

  cellTitle(e: any, m: number): string {
    const sg = this.suggestions.find(sug => sug.employeeId === e.id && this.overlapsMonth(sug.startDate, sug.endDate, m));
    if (sg) return `Sugestão: ${sg.startDate} a ${sg.endDate} (${sg.days} dias)`;
    const v = this.vacationsOf(e).find((a: any) => this.overlapsMonth(a.startDate, a.endDate, m));
    return v ? `${v.startDate} a ${v.endDate}` : '';
  }

  monthCount(m: number): number {
    return this.activeEmployees.filter(e => this.cellState(e, m) !== null).length;
  }

  /** Staggers one vacation block per employee across Feb-Nov so the operation never stops. */
  generateSuggestions() {
    const candidates = this.activeEmployees
      .filter(e => this.vacationsOf(e).length === 0)
      .sort((a: any, b: any) => new Date(a.hireDate || '2100-01-01').getTime() - new Date(b.hireDate || '2100-01-01').getTime());
    if (candidates.length === 0) {
      alert('Todos os funcionários ativos já têm férias marcadas/pedidas em ' + this.planYear + '.');
      return;
    }
    // Months pool Feb(1)..Nov(10): avoids January (fecho de contas) and December (época alta).
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.suggestions = candidates.map((e: any, i: number) => {
      const days = this.entitledDays(e);
      const m = pool[i % pool.length];
      const start = new Date(+this.planYear, m, 1);
      const end = new Date(start.getTime() + (days - 1) * 86400000);
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { employeeId: e.id, employeeCode: e.code, employeeName: e.name, startDate: iso(start), endDate: iso(end), days };
    });
  }

  submitPlan() {
    if (this.suggestions.length === 0 || this.submittingPlan) return;
    if (!confirm(`Submeter o plano anual de férias?\n\n${this.suggestions.length} pedido(s) PENDENTE(s) serão criados para aprovação.`)) return;
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    if (!company.id) return;
    this.submittingPlan = true;
    let done = 0; const total = this.suggestions.length;
    this.suggestions.forEach(sg => {
      const payload = {
        id: `ABS${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        companyId: company.id, employeeId: sg.employeeId, type: 'VACATION',
        startDate: sg.startDate, endDate: sg.endDate, days: sg.days,
        reason: `Plano Anual de Férias ${this.planYear}`, status: 'PENDING'
      };
      this.sub.add(this.http.post(`${this.apiUrl}/absences`, payload).subscribe({
        next: () => { if (++done === total) this.finishPlanSubmit(); },
        error: () => { if (++done === total) this.finishPlanSubmit(); }
      }));
    });
  }

  private finishPlanSubmit() {
    this.submittingPlan = false;
    this.suggestions = [];
    const c = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    if (c.id) this.loadAbsences(c.id);
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

