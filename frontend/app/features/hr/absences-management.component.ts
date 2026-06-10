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
        <div class="flex items-center gap-2 p-3 border-b bg-gray-50 flex-wrap">
          <label class="text-xs font-bold text-gray-500 uppercase">Ano:</label>
          <select [(ngModel)]="planYear" class="border rounded px-2 py-1 text-xs">
            <option *ngFor="let y of planYears" [value]="y">{{ y }}</option>
          </select>
          <button (click)="generateSuggestions()" class="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700">
            <app-icon name="auto_awesome" [size]="14"></app-icon> Sugerir Todos
          </button>
          <button *ngIf="suggestions.length > 0" (click)="submitPlan()" [disabled]="submittingPlan"
            class="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-700 disabled:bg-gray-400">
            <app-icon name="send" [size]="14"></app-icon> {{ submittingPlan ? 'A submeter...' : 'Submeter Plano (' + suggestions.length + ')' }}
          </button>
          <button *ngIf="suggestions.length > 0" (click)="suggestions = []" class="text-xs text-gray-400 hover:text-red-500 font-bold px-2">Limpar Tudo</button>
          <button (click)="printPlan()" class="flex items-center gap-1 bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-900">
            <app-icon name="print" [size]="14"></app-icon> Imprimir
          </button>
          <div class="ml-auto flex items-center gap-3 text-[10px] font-bold">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-sky-300 inline-block"></span> Aprovado</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-300 inline-block"></span> Pendente</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-100 border border-dashed border-blue-500 inline-block"></span> Sugestão</span>
          </div>
        </div>
        <div class="px-3 py-1.5 border-b text-[11px] font-bold text-gray-600 bg-white">
          PLANO ANUAL DE FÉRIAS DOS COLABORADORES — ANO DE {{ planYear }} · Duração: 30 dias (15/15), 24 dias (12/12) ou 12 dias conforme antiguidade
        </div>
        <div class="overflow-auto flex-1">
          <table class="w-full text-[11px] border-collapse">
            <thead class="bg-slate-700 text-white uppercase font-bold sticky top-0 z-10">
              <tr>
                <th class="p-2 text-left min-w-[170px] sticky left-0 bg-slate-700">Nome</th>
                <th class="p-1 text-center w-8">Ord.</th>
                <th class="p-1 text-center w-10">Dias</th>
                <th *ngFor="let m of monthsShort" class="p-1 text-center min-w-[78px] border-l border-slate-600">{{ m }}/{{ planYear }}</th>
                <th class="p-1 text-center min-w-[90px] border-l border-slate-600">Observ.</th>
                <th class="p-1 w-20"></th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr *ngFor="let e of activeEmployees; let i = index" class="hover:bg-orange-50" [class.bg-orange-50]="i % 2 === 1">
                <td class="p-2 font-bold sticky left-0 bg-inherit cursor-pointer hover:text-indigo-600" (click)="openHistory(e)" title="Ver histórico de férias">{{ e.name }}</td>
                <td class="p-1 text-center text-gray-500">{{ i + 1 }}</td>
                <td class="p-1 text-center text-gray-500" [title]="carryPrev(e) > 0 ? (entitledDays(e) + ' - ' + carryPrev(e) + ' descontados de férias anteriores') : ''">{{ entitledAdj(e) }}<span *ngIf="carryPrev(e) > 0" class="text-red-500 text-[8px]">*</span></td>
                <td *ngFor="let m of monthIdx" (click)="openVacEditor(e, m)" class="p-0.5 text-center align-middle border-l border-gray-100 cursor-pointer hover:bg-indigo-50" title="Clique para marcar férias neste mês">
                  <div *ngFor="let c of cellChips(e, m)"
                    [class]="'rounded px-1 py-0.5 my-0.5 text-[9px] font-bold leading-tight ' + (c.state === 'APPROVED' ? 'bg-sky-300 text-sky-900' : c.state === 'PENDING' ? 'bg-yellow-300 text-yellow-900' : 'bg-blue-100 text-blue-800 border border-dashed border-blue-500 cursor-pointer hover:bg-red-100')"
                    [title]="c.state === 'SUGGESTED' ? 'Clique para remover esta sugestão' : c.label"
                    (click)="onChipClick(c, $event)">
                    {{ c.label }}
                  </div>
                </td>
                <td class="p-1 text-[9px] text-gray-500 border-l border-gray-100">{{ rowObs(e) }}</td>
                <td class="p-1 text-center whitespace-nowrap">
                  <button (click)="suggestForEmployee(e)" class="p-1 text-blue-500 hover:text-blue-700" title="Sugerir férias para este trabalhador"><app-icon name="auto_awesome" [size]="14"></app-icon></button>
                  <button (click)="clearSuggestionsFor(e)" *ngIf="hasSuggestion(e)" class="p-1 text-gray-400 hover:text-red-500" title="Limpar sugestões deste trabalhador"><app-icon name="close" [size]="14"></app-icon></button>
                  <button (click)="openHistory(e)" class="p-1 text-gray-400 hover:text-indigo-600" title="Histórico"><app-icon name="history" [size]="14"></app-icon></button>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-100 border-t font-bold sticky bottom-0">
              <tr>
                <td class="p-2 text-gray-500 uppercase sticky left-0 bg-gray-100" colspan="3">Em férias / mês</td>
                <td *ngFor="let m of monthIdx" class="p-1 text-center border-l border-gray-200"
                  [class.text-red-600]="monthCount(m) > maxSimultaneous"
                  [title]="monthCount(m) > maxSimultaneous ? 'Acima do limite (' + maxSimultaneous + ') — risco para a operação' : ''">
                  {{ monthCount(m) || '-' }}<span *ngIf="monthCount(m) > maxSimultaneous"> ⚠</span>
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
          <div *ngIf="activeEmployees.length === 0" class="p-8 text-center text-gray-400 text-xs">Sem funcionários ativos.</div>
        </div>
        <div class="p-2 border-t bg-gray-50 text-[10px] text-gray-500">
          Direito (Lei do Trabalho MZ): 1.º ano 12 dias · 2.º ano 24 · 3.º+ 30. Férias de 30/24 dias são repartidas em 2 períodos em meses distintos. Limite simultâneo recomendado: {{ maxSimultaneous }}. Clique no nome para ver o histórico; clique numa sugestão para a remover.
        </div>
      </div>

      <!-- Vacation History Modal -->
      <div *ngIf="historyEmp" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" (click)="historyEmp = null">
        <div class="bg-white rounded-lg shadow-2xl w-[560px] max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-4 border-b">
            <div>
              <h3 class="font-bold text-gray-800 text-sm">Histórico de Férias — {{ historyEmp.name }}</h3>
              <p class="text-[10px] text-gray-500">Admissão: {{ historyEmp.hireDate | date:'dd/MM/yyyy' }} · Direito atual: {{ entitledDays(historyEmp) }} dias/ano</p>
            </div>
            <button (click)="historyEmp = null" class="text-gray-400 hover:text-gray-700"><app-icon name="close" [size]="18"></app-icon></button>
          </div>
          <div class="overflow-auto p-4">
            <table class="w-full text-xs">
              <thead class="text-gray-500 uppercase font-bold border-b"><tr><th class="p-2 text-left">Ano</th><th class="p-2 text-left">Período</th><th class="p-2 text-center">Dias</th><th class="p-2 text-center">Estado</th></tr></thead>
              <tbody class="divide-y">
                <tr *ngFor="let h of historyList">
                  <td class="p-2 font-bold">{{ h.year }}</td>
                  <td class="p-2">{{ h.range }}<div *ngIf="h.excess" class="text-[9px] font-bold text-red-600 mt-0.5">+{{ h.excess.n }} dias excedentes · {{ h.excess.mode === 'SALARIO' ? 'desconto no salário' : 'desconto nas próximas férias' }}</div></td>
                  <td class="p-2 text-center">{{ h.days }}</td>
                  <td class="p-2 text-center"><span [class]="'px-2 py-0.5 rounded-full text-[10px] font-bold ' + statusMap[h.status]?.color">{{ statusMap[h.status]?.label }}</span></td>
                </tr>
                <tr *ngIf="historyList.length === 0"><td colspan="4" class="p-6 text-center text-gray-400">Sem registos de férias.</td></tr>
              </tbody>
            </table>
            <div class="mt-3 p-2 bg-gray-50 rounded text-[10px] text-gray-600 font-bold" *ngIf="historyList.length > 0">
              Total gozado (aprovado): {{ historyApprovedDays }} dias
            </div>
          </div>
        </div>
      </div>
      <!-- Vacation Editor Modal -->
      <div *ngIf="vacEd" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" (click)="vacEd = null">
        <div class="bg-white rounded-xl shadow-2xl w-[600px] max-h-[90vh] overflow-auto" (click)="$event.stopPropagation()">
          <div class="bg-gradient-to-r from-indigo-600 to-blue-500 text-white p-4 rounded-t-xl">
            <h3 class="font-bold text-sm">{{ vacEd.editing ? 'Alterar' : 'Marcar' }} Férias — {{ vacEd.emp.name }}</h3>
            <p *ngIf="vacEd.wasApproved" class="text-[10px] bg-amber-400/30 rounded px-2 py-0.5 mt-1 inline-block">⚠ Já aprovadas — a alteração exige nova aprovação</p>
            <p class="text-[10px] opacity-80">Ano {{ planYear }} · Direito: {{ entitledAdj(vacEd.emp) }} dias<span *ngIf="carryPrev(vacEd.emp) > 0"> ({{ entitledDays(vacEd.emp) }} − {{ carryPrev(vacEd.emp) }} de férias anteriores)</span></p>
          </div>
          <div class="p-5 space-y-4">
            <!-- Balance meter -->
            <div>
              <div class="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                <span>SALDO DE FÉRIAS</span>
                <span [class.text-red-600]="vacEdExcess > 0">{{ availableAfter }} dias disponíveis após esta marcação</span>
              </div>
              <div class="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div class="bg-sky-400 h-full" [style.width.%]="meter.booked" title="Já marcado"></div>
                <div class="bg-blue-300 h-full" [style.width.%]="meter.sug" title="Sugestões"></div>
                <div class="bg-indigo-500 h-full" [style.width.%]="meter.novo" title="Esta marcação"></div>
                <div class="bg-red-500 h-full" [style.width.%]="meter.over" title="Excesso"></div>
              </div>
              <div class="flex gap-3 mt-1 text-[9px] text-gray-500">
                <span><span class="inline-block w-2 h-2 bg-sky-400 rounded-full"></span> Marcado: {{ bookedDays(vacEd.emp) }}d</span>
                <span><span class="inline-block w-2 h-2 bg-blue-300 rounded-full"></span> Sugerido: {{ suggestedDaysOf(vacEd.emp) }}d</span>
                <span><span class="inline-block w-2 h-2 bg-indigo-500 rounded-full"></span> Esta marcação: {{ vacEdDays }}d</span>
                <span *ngIf="vacEdExcess > 0" class="text-red-600 font-bold"><span class="inline-block w-2 h-2 bg-red-500 rounded-full"></span> Excesso: {{ vacEdExcess }}d</span>
              </div>
            </div>
            <!-- Dates -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Início</label>
                <input type="date" [(ngModel)]="vacEd.start" class="w-full border rounded px-2 py-1.5 text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fim</label>
                <input type="date" [(ngModel)]="vacEd.end" class="w-full border rounded px-2 py-1.5 text-xs">
              </div>
              <div class="flex flex-col justify-end">
                <div class="text-center bg-indigo-50 border border-indigo-200 rounded px-2 py-1.5">
                  <span class="text-lg font-black text-indigo-700">{{ vacEdDays }}</span>
                  <span class="text-[9px] text-indigo-400 font-bold uppercase block -mt-1">dias</span>
                </div>
              </div>
            </div>
            <!-- Excess policy -->
            <div *ngIf="vacEdExcess > 0" class="border-2 border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
              <p class="text-xs font-bold text-red-700">⚠ Excede o direito em {{ vacEdExcess }} dia(s). Decisão do gestor:</p>
              <label class="flex items-start gap-2 p-2 rounded-lg cursor-pointer border-2 transition-all" [class.border-indigo-500]="vacEd.policy === 'PROXIMAS'" [class.bg-white]="vacEd.policy === 'PROXIMAS'" [class.border-transparent]="vacEd.policy !== 'PROXIMAS'">
                <input type="radio" name="expolicy" value="PROXIMAS" [(ngModel)]="vacEd.policy" class="mt-0.5">
                <span class="text-xs"><b>Descontar nas próximas férias</b><br><span class="text-gray-500 text-[10px]">No próximo ano o direito será reduzido em {{ vacEdExcess }} dia(s) automaticamente.</span></span>
              </label>
              <label class="flex items-start gap-2 p-2 rounded-lg cursor-pointer border-2 transition-all" [class.border-indigo-500]="vacEd.policy === 'SALARIO'" [class.bg-white]="vacEd.policy === 'SALARIO'" [class.border-transparent]="vacEd.policy !== 'SALARIO'">
                <input type="radio" name="expolicy" value="SALARIO" [(ngModel)]="vacEd.policy" class="mt-0.5">
                <span class="text-xs"><b>Descontar no salário</b><br><span class="text-gray-500 text-[10px]">{{ vacEdExcess }} dia(s) não pagos, deduzidos automaticamente na folha do mês em que as férias terminam.</span></span>
              </label>
            </div>
            <div *ngIf="vacEdExcess === 0 && vacEdDays > 0" class="text-[10px] text-emerald-600 font-bold">✓ Dentro do direito de férias.</div>
          </div>
          <div class="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
            <button *ngIf="vacEd.editing" (click)="deleteVacEdit()" [disabled]="savingVac" class="mr-auto px-4 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 font-bold">Eliminar</button>
            <button (click)="vacEd = null" class="px-4 py-1.5 text-xs border rounded hover:bg-gray-100">Cancelar</button>
            <button (click)="saveVacEdit()" [disabled]="vacEdDays <= 0 || savingVac" class="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 font-bold shadow">
              {{ savingVac ? 'A gravar...' : ((vacEd.editing ? 'Guardar Alteração (' : 'Criar Pedido (') + vacEdDays + ' dias)') }}
            </button>
          </div>
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
  monthsLong = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  monthIdx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  suggestions: any[] = [];
  submittingPlan = false;
  historyEmp: any = null;

  get activeEmployees(): any[] {
    return (this.employees || []).filter((e: any) => e.status !== 'INACTIVE' && e.status !== 'TERMINATED');
  }

  get maxSimultaneous(): number {
    return Math.max(1, Math.ceil(this.activeEmployees.length * 0.25));
  }

  /** Lei do Trabalho MZ art.99: 12 dias no 1.º ano, 24 no 2.º, 30 do 3.º em diante. */
  entitledDays(e: any): number {
    if (!e.hireDate) return 30;
    const years = (new Date(+this.planYear, 11, 31).getTime() - new Date(e.hireDate).getTime()) / (365.25 * 86400000);
    if (years < 1) return 12;
    if (years < 2) return 24;
    return 30;
  }

  /** 30 -> 15/15, 24 -> 12/12, 12 -> bloco único. */
  private blocksFor(e: any): number[] {
    const d = this.entitledDays(e);
    return d >= 24 ? [d / 2, d / 2] : [d];
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

  private fmtRange(startDate: string, endDate: string): string {
    const sd = new Date(startDate), ed = new Date(endDate);
    const dd = (d: Date) => String(d.getDate()).padStart(2, '0');
    const mon = (d: Date) => this.monthsShort[d.getMonth()];
    if (sd.getMonth() === ed.getMonth()) return dd(sd) + ' a ' + dd(ed) + '/' + mon(sd);
    return dd(sd) + '/' + mon(sd) + ' a ' + dd(ed) + '/' + mon(ed);
  }

  /** Chips são colocados no mês de INÍCIO de cada período (como no mapa clássico). */
  cellChips(e: any, m: number): any[] {
    const chips: any[] = [];
    this.vacationsOf(e).forEach((a: any) => {
      const sd = new Date(a.startDate);
      if (sd.getFullYear() === +this.planYear && sd.getMonth() === m) {
        const ex = (a.reason || '').includes('[EXCESSO:') ? ' ⚠' : '';
        chips.push({ label: this.fmtRange(a.startDate, a.endDate) + ex, state: a.status, ref: a });
      }
    });
    this.suggestions.forEach(sg => {
      const sd = new Date(sg.startDate);
      if (sg.employeeId === e.id && sd.getMonth() === m) {
        chips.push({ label: this.fmtRange(sg.startDate, sg.endDate), state: 'SUGGESTED', ref: sg });
      }
    });
    return chips;
  }

  rowObs(e: any): string {
    const vacs = this.vacationsOf(e);
    const sgs = this.suggestions.filter(sg => sg.employeeId === e.id);
    const used = vacs.reduce((s2: number, a: any) => s2 + (Number(a.days) || 0), 0);
    const sug = sgs.reduce((s2: number, a: any) => s2 + (Number(a.days) || 0), 0);
    if (!used && !sug) return '';
    const parts: string[] = [];
    if (used) parts.push(used + 'd marcados');
    if (sug) parts.push(sug + 'd sugeridos');
    return parts.join(' · ');
  }

  hasSuggestion(e: any): boolean { return this.suggestions.some(sg => sg.employeeId === e.id); }
  removeSuggestion(sg: any) { this.suggestions = this.suggestions.filter(x => x !== sg); }
  clearSuggestionsFor(e: any) { this.suggestions = this.suggestions.filter(sg => sg.employeeId !== e.id); }

  monthCount(m: number): number {
    return this.activeEmployees.filter(e =>
      this.vacationsOf(e).some((a: any) => this.overlapsMonth(a.startDate, a.endDate, m)) ||
      this.suggestions.some(sg => sg.employeeId === e.id && this.overlapsMonth(sg.startDate, sg.endDate, m))
    ).length;
  }

  /** Carga por mês (marcadas + sugeridas) usada para escolher os meses menos ocupados. */
  private monthLoads(): number[] { return this.monthIdx.map(m => this.monthCount(m)); }

  /** Sugere blocos para UM trabalhador nos meses menos carregados (Fev–Nov), blocos afastados >= 2 meses. */
  suggestForEmployee(e: any) {
    if (this.vacationsOf(e).length > 0) { alert(e.name + ' já tem férias marcadas/pedidas em ' + this.planYear + '.'); return; }
    this.clearSuggestionsFor(e);
    this.suggestForEmployeeInternal(e);
  }

  /** Sugere para todos os trabalhadores sem férias no ano, por antiguidade. */
  generateSuggestions() {
    this.suggestions = [];
    const candidates = this.activeEmployees
      .filter(e => this.vacationsOf(e).length === 0)
      .sort((a: any, b: any) => new Date(a.hireDate || '2100-01-01').getTime() - new Date(b.hireDate || '2100-01-01').getTime());
    if (candidates.length === 0) { alert('Todos os funcionários ativos já têm férias marcadas/pedidas em ' + this.planYear + '.'); return; }
    candidates.forEach(e => {
      this.suggestForEmployeeInternal(e);
    });
  }

  private suggestForEmployeeInternal(e: any) {
    const blocks = this.blocksFor(e);
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const loads = this.monthLoads();
    const chosen: number[] = [];
    blocks.forEach(() => {
      const candidates = pool
        .filter(m => chosen.every(c => Math.abs(c - m) >= 2))
        .sort((a, b) => (loads[a] - loads[b]) || (a - b));
      const m = candidates.length ? candidates[0] : pool[0];
      chosen.push(m); loads[m]++;
    });
    chosen.sort((a, b) => a - b);
    const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    chosen.forEach((m, bi) => {
      const days = blocks[bi];
      const start = new Date(+this.planYear, m, 2);
      const end = new Date(start.getTime() + (days - 1) * 86400000);
      this.suggestions.push({ employeeId: e.id, employeeCode: e.code, employeeName: e.name, startDate: iso(start), endDate: iso(end), days });
    });
  }

  // ── Histórico por trabalhador ─────────────────────────────────────────────
  openHistory(e: any) { this.historyEmp = e; }

  get historyList(): any[] {
    if (!this.historyEmp) return [];
    return (this.absences || [])
      .filter((a: any) => a.employeeId === this.historyEmp.id && a.type === 'VACATION')
      .map((a: any) => {
        const exm = /\[EXCESSO:(\d+)\|(PROXIMAS|SALARIO)\]/.exec(a.reason || '');
        return { year: new Date(a.startDate).getFullYear(), range: this.fmtRange(a.startDate, a.endDate) + '/' + new Date(a.endDate).getFullYear(), days: a.days, status: a.status, excess: exm ? { n: +exm[1], mode: exm[2] } : null };
      })
      .sort((a: any, b: any) => b.year - a.year);
  }

  get historyApprovedDays(): number {
    return this.historyList.filter(h => h.status === 'APPROVED').reduce((s2, h) => s2 + (Number(h.days) || 0), 0);
  }

  // ── Editor de Férias (clique no mês) ──────────────────────────────────────
  vacEd: any = null;
  savingVac = false;

  /** Excesso do ano anterior marcado para descontar nas próximas férias. */
  carryPrev(e: any): number {
    return (this.absences || []).filter((a: any) =>
      a.employeeId === e.id && a.type === 'VACATION' && a.status !== 'REJECTED' &&
      new Date(a.startDate).getFullYear() === +this.planYear - 1)
      .reduce((s2: number, a: any) => {
        const m = /\[EXCESSO:(\d+)\|PROXIMAS\]/.exec(a.reason || '');
        return s2 + (m ? parseInt(m[1], 10) || 0 : 0);
      }, 0);
  }

  entitledAdj(e: any): number { return Math.max(0, this.entitledDays(e) - this.carryPrev(e)); }
  bookedDays(e: any): number {
    const editingId = this.vacEd && this.vacEd.editing ? this.vacEd.editing.id : null;
    return this.vacationsOf(e).filter((a: any) => a.id !== editingId).reduce((s2: number, a: any) => s2 + (Number(a.days) || 0), 0);
  }
  suggestedDaysOf(e: any): number { return this.suggestions.filter(sg => sg.employeeId === e.id).reduce((s2, sg) => s2 + (Number(sg.days) || 0), 0); }
  availableDays(e: any): number { return this.entitledAdj(e) - this.bookedDays(e) - this.suggestedDaysOf(e); }

  get vacEdDays(): number {
    if (!this.vacEd || !this.vacEd.start || !this.vacEd.end) return 0;
    const d = Math.round((new Date(this.vacEd.end).getTime() - new Date(this.vacEd.start).getTime()) / 86400000) + 1;
    return d > 0 ? d : 0;
  }

  get vacEdExcess(): number {
    if (!this.vacEd) return 0;
    return Math.max(0, this.vacEdDays - Math.max(0, this.availableDays(this.vacEd.emp)));
  }

  get availableAfter(): number {
    if (!this.vacEd) return 0;
    return Math.max(0, this.availableDays(this.vacEd.emp) - this.vacEdDays);
  }

  /** Segmentos da barra de saldo (percentagens do direito ajustado). */
  get meter(): any {
    if (!this.vacEd) return { booked: 0, sug: 0, novo: 0, over: 0 };
    const ent = Math.max(1, this.entitledAdj(this.vacEd.emp));
    const total = Math.max(ent, this.bookedDays(this.vacEd.emp) + this.suggestedDaysOf(this.vacEd.emp) + this.vacEdDays);
    const pct = (v: number) => Math.min(100, Math.round((v / total) * 100));
    const within = Math.min(this.vacEdDays, Math.max(0, this.availableDays(this.vacEd.emp)));
    return {
      booked: pct(this.bookedDays(this.vacEd.emp)),
      sug: pct(this.suggestedDaysOf(this.vacEd.emp)),
      novo: pct(within),
      over: pct(this.vacEdExcess)
    };
  }

  onChipClick(c: any, ev: Event) {
    ev.stopPropagation();
    if (c.state === 'SUGGESTED') { this.removeSuggestion(c.ref); return; }
    // PENDING/APPROVED: open the editor pre-filled for changes
    const a = c.ref;
    const emp = this.activeEmployees.find(e2 => e2.id === a.employeeId);
    if (!emp) return;
    const exm = /\[EXCESSO:(\d+)\|(PROXIMAS|SALARIO)\]/.exec(a.reason || '');
    this.vacEd = {
      emp, start: a.startDate, end: a.endDate,
      policy: exm ? exm[2] : 'PROXIMAS',
      editing: a, wasApproved: a.status === 'APPROVED'
    };
  }

  openVacEditor(e: any, m: number) {
    const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const start = new Date(+this.planYear, m, 2);
    const avail = Math.max(0, this.availableDays(e));
    const defDays = Math.min(15, avail > 0 ? avail : 15);
    const end = new Date(start.getTime() + (defDays - 1) * 86400000);
    this.vacEd = { emp: e, start: iso(start), end: iso(end), policy: 'PROXIMAS' };
  }

  saveVacEdit() {
    if (!this.vacEd || this.vacEdDays <= 0 || this.savingVac) return;
    if (new Date(this.vacEd.end) < new Date(this.vacEd.start)) { alert('A data de fim deve ser posterior ao início.'); return; }
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    if (!company.id) return;
    let reason = 'Férias ' + this.planYear;
    if (this.vacEdExcess > 0) {
      reason += ' [EXCESSO:' + this.vacEdExcess + '|' + this.vacEd.policy + ']';
    }
    this.savingVac = true;
    if (this.vacEd.editing) {
      // Changing a booking always returns it to PENDING for re-approval.
      if (this.vacEd.wasApproved && !confirm('Estas férias já estavam APROVADAS.\n\nA alteração volta a colocar o pedido como PENDENTE para nova aprovação. Continuar?')) {
        this.savingVac = false; return;
      }
      const upd = { startDate: this.vacEd.start, endDate: this.vacEd.end, days: this.vacEdDays, reason, status: 'PENDING' };
      this.sub.add(this.http.patch(this.apiUrl + '/absences/' + this.vacEd.editing.id + '?companyId=' + company.id, upd).subscribe({
        next: () => { this.savingVac = false; this.vacEd = null; this.loadAbsences(company.id); },
        error: () => { this.savingVac = false; alert('Erro ao alterar as férias.'); }
      }));
      return;
    }
    const payload = {
      id: 'ABS' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      companyId: company.id, employeeId: this.vacEd.emp.id, type: 'VACATION',
      startDate: this.vacEd.start, endDate: this.vacEd.end, days: this.vacEdDays,
      reason, status: 'PENDING'
    };
    this.sub.add(this.http.post(this.apiUrl + '/absences', payload).subscribe({
      next: () => {
        this.savingVac = false; this.vacEd = null;
        this.loadAbsences(company.id);
      },
      error: () => { this.savingVac = false; alert('Erro ao gravar o pedido de férias.'); }
    }));
  }

  deleteVacEdit() {
    if (!this.vacEd || !this.vacEd.editing || this.savingVac) return;
    if (!confirm('Eliminar estas férias (' + this.fmtRange(this.vacEd.editing.startDate, this.vacEd.editing.endDate) + ', ' + this.vacEd.editing.days + ' dias)?')) return;
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    if (!company.id) return;
    this.savingVac = true;
    this.sub.add(this.http.delete(this.apiUrl + '/absences/' + this.vacEd.editing.id + '?companyId=' + company.id).subscribe({
      next: () => { this.savingVac = false; this.vacEd = null; this.loadAbsences(company.id); },
      error: () => { this.savingVac = false; alert('Erro ao eliminar as férias.'); }
    }));
  }
  /** Impressão no formato clássico do mapa anual (cabeçalho da empresa + grelha). */
  printPlan() {
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    const fmtCell = (e: any, m: number) => this.cellChips(e, m).map(c => '<div class="chip ' + c.state.toLowerCase() + '">' + c.label + '/' + this.planYear + '</div>').join('');
    let rows = '';
    this.activeEmployees.forEach((e: any, i: number) => {
      rows += '<tr><td class="name">' + e.name + '</td><td class="c">' + (i + 1) + '</td>';
      this.monthIdx.forEach(m => { rows += '<td class="c">' + fmtCell(e, m) + '</td>'; });
      rows += '<td class="c obs">' + this.rowObs(e) + '</td></tr>';
    });
    let heads = '';
    this.monthsLong.forEach(ml => { heads += '<th>' + ml + '/' + this.planYear + '</th>'; });
    const html = '<html><head><title>Plano de Férias ' + this.planYear + '</title><style>' +
      '@page{size:A4 landscape;margin:12mm} body{font-family:Arial,sans-serif;font-size:9px;margin:0}' +
      'h1{font-size:13px;color:#0ea5e9;margin:10px 0 2px;text-transform:uppercase} h2{font-size:10px;margin:0 0 8px;font-weight:bold}' +
      '.comp{font-weight:bold;font-size:11px} .sub{color:#555;font-size:8px}' +
      'table{width:100%;border-collapse:collapse;margin-top:6px} th,td{border:1px solid #999;padding:2px 3px}' +
      'th{background:#475569;color:#fff;font-size:7.5px;text-transform:uppercase}' +
      'tr:nth-child(even) td{background:#fde8d8} .name{font-weight:bold;min-width:120px} .c{text-align:center} .obs{font-size:7px}' +
      '.chip{border-radius:3px;padding:1px 2px;margin:1px 0;font-weight:bold;font-size:7px}' +
      '.chip.approved{background:#7dd3fc} .chip.pending{background:#fde047} .chip.suggested{background:#dbeafe;border:1px dashed #3b82f6}' +
      '.foot{display:flex;justify-content:space-between;margin-top:8px;font-size:8px;color:#555}' +
      '</style></head><body>' +
      '<div class="comp">' + (company.name || 'Empresa') + '</div>' +
      '<div class="sub">' + (company.address || '') + ' · NUIT: ' + (company.nif || '—') + '</div>' +
      '<div class="sub">Local: ' + (company.city || 'Maputo') + ' · Ano: ' + this.planYear + '</div>' +
      '<h1>Plano Anual de Férias dos Colaboradores — Ano de ' + this.planYear + '</h1>' +
      '<h2>Duração das Férias: 30 dias (15/15) · 24 dias (12/12) · 12 dias (1.º ano)</h2>' +
      '<table><thead><tr><th>Nome</th><th>Ord.</th>' + heads + '<th>Observ.</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="foot"><span>Plano de Férias - ' + this.planYear + '</span><span>' + new Date().toLocaleString('pt-PT') + '</span></div>' +
      '</body></html>';
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document; if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => iframe.remove(), 2000); }, 400);
  }

  submitPlan() {
    if (this.suggestions.length === 0 || this.submittingPlan) return;
    if (!confirm('Submeter o plano anual de férias?\n\n' + this.suggestions.length + ' pedido(s) PENDENTE(s) serão criados para aprovação.')) return;
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    if (!company.id) return;
    this.submittingPlan = true;
    let done = 0; const total = this.suggestions.length;
    this.suggestions.forEach(sg => {
      const payload = {
        id: 'ABS' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        companyId: company.id, employeeId: sg.employeeId, type: 'VACATION',
        startDate: sg.startDate, endDate: sg.endDate, days: sg.days,
        reason: 'Plano Anual de Férias ' + this.planYear, status: 'PENDING'
      };
      this.sub.add(this.http.post(this.apiUrl + '/absences', payload).subscribe({
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

