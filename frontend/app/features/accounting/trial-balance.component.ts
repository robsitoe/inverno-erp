import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountingService, AccountingIssue } from '../../shared/accounting.service';
import { DataService } from '../../services/data.service';
import { NavigationService } from '../../services/navigation.service';
import { Account, JournalEntry } from '../../shared/models';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-[#f8fafc]">
      <!-- Header -->
      <div class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
              <h1 class="text-xl font-bold text-slate-800">Balancete Inteligente</h1>
              <p class="text-xs text-slate-500 mt-0.5">&#9744; Análise em tempo real da saúde financeira</p>
          </div>
          <div class="flex items-center gap-3">
              <button (click)="printTrialBalance()" title="Imprimir Balancete"
                      class="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-semibold transition-all">
                  <span class="material-symbols-outlined text-sm">print</span>
                  Imprimir
              </button>
              <button (click)="loadTrialBalance()" class="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-600">
                  <span class="material-symbols-outlined">refresh</span>
              </button>
              <button (click)="recalculateBalances()" title="Recalcular Todos os Saldos"
                      [disabled]="isRepairing"
                      class="flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 text-xs font-bold border border-rose-200 transition-all active:scale-95 disabled:opacity-50">
                  <span class="material-symbols-outlined text-sm">{{ isRepairing ? 'sync' : 'auto_fix_high' }}</span>
                  {{ isRepairing ? 'A processar...' : 'Reparar Dados' }}
              </button>
              <div [class]="'px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm ' + (isBalanced && issues.length === 0 && (totalDebit > 0 || totalCredit > 0) ? 'bg-emerald-100 text-emerald-700' : (issues.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'))">
                  <span class="material-symbols-outlined text-lg">{{ isBalanced && issues.length === 0 && (totalDebit > 0 || totalCredit > 0) ? 'check_circle' : (issues.length > 0 ? 'health_and_safety' : 'info') }}</span>
                  {{ isBalanced && issues.length === 0 && (totalDebit > 0 || totalCredit > 0) ? 'CONSISTENTE' : (issues.length > 0 ? 'DETETADOS ERROS' : (totalDebit === 0 && issues.length === 0 ? 'SEM MOVIMENTOS' : (totalDebit === 0 ? 'DADOS EM FALTA' : 'DESEQUILIBRADO'))) }}
              </div>
          </div>
      </div>

      <div class="flex-1 overflow-auto p-6 flex flex-col gap-4">

        <!-- Issues Panel -->
        <div *ngIf="issues.length > 0" class="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div class="p-4 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-rose-500">health_and_safety</span>
                    <p class="font-bold text-slate-700 text-sm">Diagnóstico Automático</p>
                </div>
                <div class="flex items-center gap-2">
                    <span *ngIf="missingPostingsCount > 0"
                          (click)="fixAllMissingPostings()"
                          class="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-700 flex items-center gap-1 transition-all">
                        <span class="material-symbols-outlined text-xs">sync</span>
                        Lançar Todos em Falta ({{ missingPostingsCount }})
                    </span>
                </div>
            </div>
            <div class="divide-y divide-slate-50 max-h-72 overflow-auto">
                <div *ngFor="let issue of issues" [class]="'p-4 ' + getIssueClass(issue.severity)">
                    <div class="flex items-start gap-3">
                        <div [class]="'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ' + getIconBg(issue.severity)">
                            <span class="material-symbols-outlined text-sm">{{ getIssueIcon(issue.severity) }}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-medium leading-relaxed bg-white/50 inline-block p-1.5 rounded"
                               [class.cursor-pointer]="true" 
                               [class.hover:text-indigo-600]="true" 
                               [class.hover:bg-indigo-50]="true"
                               (click)="viewIssueDetails(issue)">
                                {{ issue.description }}
                                <span class="material-symbols-outlined text-[10px] ml-1 align-baseline opacity-50">open_in_new</span>
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-3 mt-1 flex-wrap" *ngIf="issue.type === 'DATA_CORRUPTION'">
                        <button (click)="repairHierarchy()"
                                [disabled]="isRepairing"
                                class="bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-600 flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50">
                            <span class="material-symbols-outlined text-sm">{{ isRepairing ? 'sync' : 'account_tree' }}</span>
                            {{ isRepairing ? 'A reparar...' : 'Reparar Hierarquia' }}
                        </button>
                        <button (click)="recalculateBalances()"
                                [disabled]="isRepairing"
                                class="bg-rose-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-700 flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50">
                            <span class="material-symbols-outlined text-sm">{{ isRepairing ? 'sync' : 'auto_fix_high' }}</span>
                            {{ isRepairing ? 'A reconstruir...' : 'Reconstruir Tudo' }}
                        </button>
                        <button (click)="toggleDetailedLogs()"
                                class="bg-white text-slate-600 px-4 py-1.5 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50 flex items-center gap-2 transition-all active:scale-95">
                            <span class="material-symbols-outlined text-sm">history_edu</span>
                            {{ showDetailedLogs ? 'Esconder Log' : 'Ver Log de Erros' }}
                        </button>
                    </div>

                    <div class="flex gap-3 mt-1" *ngIf="issue.type === 'MISSING_POSTING'">
                        <button (click)="onGoToDocument(issue)"
                                class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md transition-all active:scale-95">
                            <span class="material-symbols-outlined text-sm">open_in_new</span>
                            Ir para Documento e Lançar
                        </button>
                        <button (click)="fixSingleMissingPosting(issue)"
                                [disabled]="isRepairing"
                                class="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-md transition-all active:scale-95">
                            <span class="material-symbols-outlined text-sm">auto_fix_normal</span>
                            Lançar Agora
                        </button>
                    </div>

                    <!-- Detailed Logs Section -->
                    <div *ngIf="showDetailedLogs" class="mt-4 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2 duration-300">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Log Técnico de Discrepâncias:</p>
                        <div class="bg-slate-50 rounded-xl p-4 font-mono text-[11px] text-slate-600 max-h-60 overflow-auto border border-slate-100 shadow-inner">
                            <div *ngFor="let logIssue of issues" class="mb-3 last:mb-0 border-b border-slate-200/50 pb-2 last:border-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <span [class]="'px-1.5 py-0.5 rounded text-[8px] font-bold ' + getIssueClass(logIssue.severity)">{{ logIssue.type }}</span>
                                    <span class="text-slate-400">{{ logIssue.severity }}</span>
                                </div>
                                <div class="text-slate-800 font-bold mb-1">{{ logIssue.description }}</div>
                                <div *ngIf="logIssue.details" class="bg-white/50 p-2 rounded border border-slate-200 mt-1 overflow-x-auto">
                                    <pre>{{ logIssue.details | json }}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Issue Details Modal -->
        <div *ngIf="selectedIssueDetails" class="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4" (click)="closeIssueDetails()">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200" (click)="$event.stopPropagation()">
                <div class="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                    <div class="flex items-center gap-3">
                        <div [class]="'w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ' + getIconBg(selectedIssueDetails.severity)">
                            <span class="material-symbols-outlined">{{ getIssueIcon(selectedIssueDetails.severity) }}</span>
                        </div>
                        <div>
                            <h2 class="text-lg font-bold text-slate-800">Detalhes do Diagnóstico</h2>
                            <p class="text-xs text-slate-500 capitalize">{{ selectedIssueDetails.type.replace('_', ' ').toLowerCase() }}</p>
                        </div>
                    </div>
                    <button (click)="closeIssueDetails()" class="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div class="p-6 overflow-y-auto bg-[#f8fafc] flex-1">
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-5">
                       <p class="text-sm text-slate-700 font-medium">{{ selectedIssueDetails.description }}</p>
                    </div>
                    
                    <div *ngIf="selectedIssueEntry" class="bg-white border text-sm border-slate-200 shadow-sm rounded-xl overflow-hidden mb-5">
                        <div class="bg-slate-50 p-3 text-xs font-bold text-slate-600 border-b border-slate-200 flex justify-between items-center">
                            <span>
                                Lançamento Contabilístico: 
                                <span *ngIf="!isEditingIssueEntry" class="font-mono text-indigo-600 ml-1">{{ selectedIssueEntry.id }}</span>
                                <span *ngIf="isEditingIssueEntry" class="text-indigo-600 ml-1 text-[10px] bg-indigo-100 px-2 py-0.5 rounded-full">Pré-visualização Automática</span>
                            </span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  [class.bg-emerald-100]="selectedIssueEntry.status === 'POSTED'"
                                  [class.text-emerald-700]="selectedIssueEntry.status === 'POSTED'"
                                  [class.bg-amber-100]="selectedIssueEntry.status !== 'POSTED'"
                                  [class.text-amber-700]="selectedIssueEntry.status !== 'POSTED'">
                                {{ selectedIssueEntry.status }}
                            </span>
                        </div>
                        <div class="divide-y divide-slate-100">
                            <div *ngFor="let line of selectedIssueEntry.lines; let i = index" class="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div class="flex flex-col flex-1 mr-4">
                                   <!-- Read Only Mode -->
                                   <ng-container *ngIf="!isEditingIssueEntry">
                                      <span class="font-bold text-slate-700 text-xs">{{ line.accountCode }} <span class="text-slate-500 font-normal mx-1">-</span> {{ line.accountName }}</span>
                                      <span class="text-[10px] text-slate-400 mt-0.5" *ngIf="line.accountId">Int ID: {{ line.accountId }}</span>
                                   </ng-container>

                                   <!-- Edit Mode -->
                                   <ng-container *ngIf="isEditingIssueEntry">
                                      <div class="flex gap-2 mb-1">
                                          <input [(ngModel)]="line.accountCode" class="text-xs font-mono font-bold text-slate-700 w-24 border border-slate-200 focus:border-indigo-500 rounded px-2 py-1 outline-none" placeholder="Cta (e.g 44)" />
                                          <input [(ngModel)]="line.accountName" class="text-xs text-slate-500 w-full border border-slate-200 focus:border-indigo-500 rounded px-2 py-1 outline-none" placeholder="Nome da Conta" />
                                      </div>
                                      <input [(ngModel)]="line.description" class="text-[10px] text-slate-400 border border-slate-200 focus:border-indigo-500 rounded px-2 py-1 outline-none w-full" placeholder="Descrição do movimento" />
                                   </ng-container>
                                </div>
                                <div class="flex gap-2 text-xs font-mono w-48 justify-end shrink-0" *ngIf="isEditingIssueEntry">
                                   <input type="number" [(ngModel)]="line.debit" class="w-16 text-right border border-slate-200 focus:border-indigo-500 rounded px-1 text-emerald-700 font-bold outline-none" placeholder="Déb." />
                                   <input type="number" [(ngModel)]="line.credit" class="w-16 text-right border border-slate-200 focus:border-indigo-500 rounded px-1 text-rose-600 font-bold outline-none" placeholder="Créd." />
                                   <button (click)="removeLine(i)" class="text-rose-500 hover:text-rose-700 ml-1"><span class="material-symbols-outlined text-sm pt-1">delete</span></button>
                                </div>
                                <div class="flex gap-4 text-xs font-mono w-40 justify-end shrink-0" *ngIf="!isEditingIssueEntry">
                                    <div class="text-right w-16" [class.text-slate-300]="!line.debit" [class.text-emerald-700]="line.debit > 0" [class.font-bold]="line.debit > 0">
                                       {{ line.debit > 0 ? (line.debit | number:'1.2-2') : '0,00' }} <span class="text-[8px] opacity-50" *ngIf="line.debit>0">D</span>
                                    </div>
                                    <div class="text-right w-16" [class.text-slate-300]="!line.credit" [class.text-rose-600]="line.credit > 0" [class.font-bold]="line.credit > 0">
                                       {{ line.credit > 0 ? (line.credit | number:'1.2-2') : '0,00' }} <span class="text-[8px] opacity-50" *ngIf="line.credit>0">C</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="bg-slate-50 p-2 flex justify-between items-center border-t border-slate-200" *ngIf="isEditingIssueEntry">
                            <button (click)="addLine()" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mx-2">
                                <span class="material-symbols-outlined text-sm">add</span> Adicionar Linha
                            </button>
                            <div class="flex gap-4 text-xs font-mono w-48 justify-end shrink-0 pr-8">
                                <div class="w-16 text-right font-bold" [class.text-emerald-700]="isPreviewBalanced" [class.text-rose-500]="!isPreviewBalanced">{{ previewDebitTotal | number:'1.2-2' }}</div>
                                <div class="w-16 text-right font-bold" [class.text-rose-600]="isPreviewBalanced" [class.text-rose-500]="!isPreviewBalanced">{{ previewCreditTotal | number:'1.2-2' }}</div>
                            </div>
                        </div>
                    </div>

                    <div *ngIf="selectedIssueDetails.details" class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                         <div class="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 border-b border-slate-200">
                            Dados Têcnicos Anexados
                         </div>
                         <div class="p-4 bg-slate-900 overflow-x-auto">
                            <pre class="text-[11px] font-mono text-emerald-400 w-full mb-0">{{ selectedIssueDetails.details | json }}</pre>
                         </div>
                    </div>
                </div>
                <div class="p-4 border-t border-slate-200 bg-white flex items-center gap-3 rounded-b-2xl" [class.justify-end]="!isEditingIssueEntry" [class.justify-between]="isEditingIssueEntry">
                    <div *ngIf="isEditingIssueEntry" class="text-[10px] text-rose-500 font-bold" [class.invisible]="isPreviewBalanced">
                        Os totais de débito e crédito devem ser iguais!
                    </div>
                    <div class="flex gap-2">
                        <button (click)="closeIssueDetails()" class="px-5 py-2 text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all active:scale-95">
                            Cancelar
                        </button>
                        <button *ngIf="isEditingIssueEntry" (click)="savePreviewEntry()" [disabled]="!isPreviewBalanced || isRepairing" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                            <span class="material-symbols-outlined text-[14px]">{{ isRepairing ? 'sync' : 'save' }}</span> Gravar Lançamento
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main layout: table + side detail panel -->
        <div class="flex gap-4">

          <!-- Trial Balance Table -->
          <div class="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table class="w-full text-sm border-collapse">
                <thead class="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th class="text-left p-4 font-semibold text-slate-600 w-32">Código</th>
                    <th class="text-left p-4 font-semibold text-slate-600">Conta</th>
                    <th class="text-left p-4 font-semibold text-slate-600 w-32 uppercase text-[10px] tracking-wider">Natureza</th>
                    <th class="text-right p-4 font-semibold text-slate-600 w-44">Débito</th>
                    <th class="text-right p-4 font-semibold text-slate-600 w-44">Crédito</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let item of trialBalance; trackBy: trackByAccount"
                      (click)="selectAccount(item)"
                      [class.bg-indigo-50]="selectedAccount?.id === item.account.id"
                      [class.ring-1]="selectedAccount?.id === item.account.id"
                      [class.ring-inset]="selectedAccount?.id === item.account.id"
                      [class.ring-indigo-300]="selectedAccount?.id === item.account.id"
                      [class.bg-slate-50]="item.account.level === 1 && selectedAccount?.id !== item.account.id"
                      class="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                    <td class="p-4 font-mono text-slate-500" [class.font-bold]="item.account.level === 1">{{ item.account.code }}</td>
                    <td class="p-4" [class.pl-8]="item.account.level === 2" [class.pl-12]="item.account.level > 2">
                      <div class="flex items-center gap-2">
                          <span *ngIf="item.account.level === 1" class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                          <span [class.font-bold]="item.account.level === 1" [class.text-slate-900]="item.account.level === 1" class="text-slate-600">
                              {{ item.account.name }}
                          </span>
                      </div>
                    </td>
                    <td class="p-4">
                      <span [class]="getTypeClass(item.account.type)">
                        {{ getTypeLabel(item.account.type) }}
                      </span>
                    </td>
                    <td class="p-4 text-right font-mono" [class.font-bold]="item.debit > 0" [class.text-slate-900]="item.debit > 0" [class.text-slate-300]="item.debit === 0">
                      {{ item.debit > 0 ? (item.debit | number:'1.2-2') : '0,00' }}
                    </td>
                    <td class="p-4 text-right font-mono" [class.font-bold]="item.credit > 0" [class.text-slate-900]="item.credit > 0" [class.text-slate-300]="item.credit === 0">
                      {{ item.credit > 0 ? (item.credit | number:'1.2-2') : '0,00' }}
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-indigo-900 text-white">
                  <tr class="font-bold">
                    <td colspan="3" class="p-6 text-right uppercase tracking-widest text-xs opacity-70">Totais do Balancete</td>
                    <td class="p-6 text-right font-mono text-lg">{{ totalDebit | number:'1.2-2' }} <span class="text-xs opacity-60">MT</span></td>
                    <td class="p-6 text-right font-mono text-lg">{{ totalCredit | number:'1.2-2' }} <span class="text-xs opacity-60">MT</span></td>
                  </tr>
                </tfoot>
              </table>
          </div>

          <!-- Account Detail Side Panel -->
          <div *ngIf="selectedAccount"
               class="w-96 shrink-0 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">

            <!-- Panel Header -->
            <div class="bg-indigo-900 text-white p-4 flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">Conta Selecionada</p>
                <p class="font-mono text-lg font-bold">{{ selectedAccount.code }}</p>
                <p class="text-sm text-indigo-200 truncate">{{ selectedAccount.name }}</p>
              </div>
              <button (click)="closePanel()" class="p-1.5 rounded-lg hover:bg-white/20 transition-colors ml-2">
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <!-- Balance Summary -->
            <div class="grid grid-cols-2 gap-px bg-slate-100">
              <div class="bg-white p-3 text-center">
                <p class="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Saldo Débito</p>
                <p class="font-mono font-bold text-slate-800 text-sm mt-0.5">
                  {{ selectedAccountDebit | number:'1.2-2' }} <span class="text-[9px] text-slate-400">MT</span>
                </p>
              </div>
              <div class="bg-white p-3 text-center">
                <p class="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Saldo Crédito</p>
                <p class="font-mono font-bold text-slate-800 text-sm mt-0.5">
                  {{ selectedAccountCredit | number:'1.2-2' }} <span class="text-[9px] text-slate-400">MT</span>
                </p>
              </div>
            </div>

            <!-- Entries List Header -->
            <div class="px-4 py-3 border-b border-slate-100">
              <p class="text-xs font-bold text-slate-600">
                <span class="material-symbols-outlined text-sm align-middle mr-1 text-indigo-500">receipt_long</span>
                {{ selectedAccountEntries.length }} lançamento(s) POSTED
              </p>
            </div>

            <!-- Entries Scrollable List -->
            <div class="flex-1 overflow-y-auto divide-y divide-slate-50">
              <div *ngIf="selectedAccountEntries.length === 0" class="flex flex-col items-center justify-center h-32 text-slate-400">
                <span class="material-symbols-outlined text-4xl mb-2 text-slate-200">inbox</span>
                <p class="text-xs">Nenhum lançamento nesta conta.</p>
              </div>

              <div *ngFor="let entry of selectedAccountEntries"
                   class="p-3 hover:bg-indigo-50/50 transition-colors">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-1">
                      <span class="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">{{ entry.id }}</span>
                      <span *ngIf="entry.sourceType"
                            [class]="getEntrySourceClass(entry.sourceType) + ' text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full'">
                        {{ entry.sourceType }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-700 truncate font-medium">{{ entry.description }}</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">{{ entry.date | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <ng-container *ngIf="getLineForAccount(entry) as line">
                      <p *ngIf="line.debit > 0" class="text-xs font-mono font-bold text-emerald-700">+{{ line.debit | number:'1.2-2' }}</p>
                      <p *ngIf="line.credit > 0" class="text-xs font-mono font-bold text-rose-600">-{{ line.credit | number:'1.2-2' }}</p>
                    </ng-container>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div> <!-- end flex row -->
      </div>
    </div>
  `
})
export class TrialBalanceComponent implements OnInit {
  trialBalance: { account: Account; debit: number; credit: number }[] = [];
  totalDebit = 0;
  totalCredit = 0;
  isBalanced = true;
  issues: AccountingIssue[] = [];
  showDetailedLogs = false;
  isRepairing = false;
  Math = Math;

  selectedAccount: Account | null = null;
  selectedAccountEntries: JournalEntry[] = [];
  selectedAccountDebit = 0;
  selectedAccountCredit = 0;

  selectedIssueDetails: AccountingIssue | null = null;
  selectedIssueEntry: JournalEntry | undefined = undefined;
  isEditingIssueEntry = false;

  constructor(
    private accountingService: AccountingService,
    private dataService: DataService,
    private navigationService: NavigationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadTrialBalance();
  }

  toggleDetailedLogs() {
    this.showDetailedLogs = !this.showDetailedLogs;
  }

  // ─── Account Selection & Side Panel ───────────────────────────────────────

  selectAccount(item: { account: Account; debit: number; credit: number }) {
    this.selectedAccount = item.account;
    this.selectedAccountDebit = item.debit;
    this.selectedAccountCredit = item.credit;

    // Find all posted entries touching this account
    const allEntries: JournalEntry[] = (this.accountingService as any)['allJournalEntries'] || [];
    this.selectedAccountEntries = allEntries.filter((e: JournalEntry) =>
      e.status === 'POSTED' &&
      e.lines?.some((l: any) => l.accountId === item.account.id)
    );

    // Collapse sidebar for more working space
    this.navigationService.collapseSidebar();
  }

  closePanel() {
    this.selectedAccount = null;
    this.selectedAccountEntries = [];
  }

  getLineForAccount(entry: JournalEntry): { debit: number; credit: number } | null {
    if (!this.selectedAccount) return null;
    return (entry.lines as any[])?.find((l: any) => l.accountId === this.selectedAccount!.id) || null;
  }

  getEntrySourceClass(sourceType: string): string {
    const map: Record<string, string> = {
      'SALES': 'bg-emerald-100 text-emerald-700',
      'PURCHASE': 'bg-blue-100 text-blue-700',
      'MANUAL': 'bg-slate-100 text-slate-600',
      'REVERSAL': 'bg-rose-100 text-rose-700',
    };
    return map[sourceType] || 'bg-gray-100 text-gray-600';
  }

  // ─── Issues Details & Modal ───────────────────────────────────────────────

  viewIssueDetails(issue: AccountingIssue) {
    this.selectedIssueDetails = issue;
    this.selectedIssueEntry = undefined;
    this.isEditingIssueEntry = false;

    // Se o issue tiver id relacionado, e NAO for um MISSING_POSTING
    if (issue.relatedId && issue.type !== 'MISSING_POSTING') {
      const entries: JournalEntry[] = (this.accountingService as any)['journalEntries'] || (this.accountingService as any)['allJournalEntries'] || [];
      const entry = entries.find(e => e.id === issue.relatedId);
      if (entry) {
        this.selectedIssueEntry = entry;
      }
    }

    if (issue.type === 'MISSING_POSTING' && issue.relatedId) {
      this.isEditingIssueEntry = true;
      if (issue.details && issue.details['docType'] === 'SALES') {
        this.dataService.getSalesDocuments().subscribe(docs => {
          const doc = docs.find((d: any) => d.id === issue.relatedId);
          if (doc) {
            try {
              this.selectedIssueEntry = (this.accountingService as any).createSalesJournalEntry(doc, null, [], 'PRONTO', undefined, true);
            } catch (error) {
              console.error('Failed to preview sales entry:', error);
            }
            this.cdr.detectChanges();
          }
        });
      } else if (issue.details && issue.details['docType'] === 'PURCHASES') {
        this.dataService.getPurchaseDocuments().subscribe(docs => {
          const doc = docs.find((d: any) => d.id === issue.relatedId);
          if (doc) {
            try {
              this.selectedIssueEntry = (this.accountingService as any).createPurchaseJournalEntry(doc, null, true);
            } catch (error) {
              console.error('Failed to preview purchase entry:', error);
            }
            this.cdr.detectChanges();
          }
        });
      }
    } else {
      if (!this.selectedIssueEntry && issue.details && issue.details['entry']) {
        this.selectedIssueEntry = issue.details['entry'];
      }
    }
  }

  get previewDebitTotal(): number {
    return this.selectedIssueEntry?.lines?.reduce((acc, l) => acc + (l.debit || 0), 0) || 0;
  }

  get previewCreditTotal(): number {
    return this.selectedIssueEntry?.lines?.reduce((acc, l) => acc + (l.credit || 0), 0) || 0;
  }

  get isPreviewBalanced(): boolean {
    const d = this.previewDebitTotal;
    const c = this.previewCreditTotal;
    return Math.abs(d - c) < 0.01 && d > 0;
  }

  addLine() {
    if (!this.selectedIssueEntry) return;
    this.selectedIssueEntry.lines.push({
      id: `TEMP-${Date.now()}-${Math.random()}`,
      accountId: '',
      accountCode: '',
      accountName: '',
      description: this.selectedIssueEntry.description || '',
      debit: 0,
      credit: 0
    });
  }

  removeLine(index: number) {
    if (!this.selectedIssueEntry) return;
    this.selectedIssueEntry.lines.splice(index, 1);
  }

  savePreviewEntry() {
    if (!this.selectedIssueEntry || !this.isPreviewBalanced) return;

    this.isRepairing = true;
    try {
      // Enforce account IDs from codes if possible (as manual lets them type loosely)
      // AccountingService has a fallback for this inside generate/saveEntryResiliently

      // Remove 'preview' status and save as POSTED
      this.selectedIssueEntry.status = 'POSTED';
      this.selectedIssueEntry.id = ''; // Let it auto-generate ID

      this.accountingService.createManualJournalEntry(this.selectedIssueEntry);

      (this.accountingService as any)['toasterService']?.showSuccess('Lançamento Guardado', 'O lançamento foi registado com sucesso a partir da previsão.');
      this.isRepairing = false;
      this.closeIssueDetails();
      this.loadTrialBalance();
    } catch (e: any) {
      this.isRepairing = false;
      (this.accountingService as any)['toasterService']?.showError('Erro', 'Ocorreu um erro ao gravar: ' + e.message);
    }
  }

  closeIssueDetails() {
    this.selectedIssueDetails = null;
    this.selectedIssueEntry = undefined;
    this.isEditingIssueEntry = false;
  }

  // ─── Print ────────────────────────────────────────────────────────────────

  printTrialBalance() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-MZ', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    const diff = (this.totalDebit - this.totalCredit).toFixed(2);
    const balanceStatus = this.isBalanced ? 'CONSISTENTE' : `DESEQUILIBRADO (Diff: ${diff} MT)`;
    const statusColor = this.isBalanced ? '#059669' : '#dc2626';
    const statusBg = this.isBalanced ? '#dcfce7' : '#fee2e2';

    const typeLabels: Record<string, string> = {
      ASSET: 'Ativo', LIABILITY: 'Passivo', EQUITY: 'Capital', REVENUE: 'Rendimento', EXPENSE: 'Gasto'
    };

    const rows = this.trialBalance.map(item => {
      const pl = item.account.level === 1 ? '4px' : item.account.level === 2 ? '20px' : '36px';
      const bold = item.account.level === 1 ? 'font-weight:700;' : '';
      const bg = item.account.level === 1 ? 'background:#f8fafc;' : '';
      const dStr = item.debit > 0 ? item.debit.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
      const cStr = item.credit > 0 ? item.credit.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
      const dc = item.debit > 0 ? '#1e293b' : '#cbd5e1';
      const cc = item.credit > 0 ? '#1e293b' : '#cbd5e1';
      return `<tr style="${bg}border-bottom:1px solid #e2e8f0;">
        <td style="padding:6px 8px;font-family:monospace;font-size:11px;color:#64748b;${bold}">${item.account.code}</td>
        <td style="padding:6px 8px;padding-left:${pl};font-size:11px;${bold}color:#334155;">${item.account.name}</td>
        <td style="padding:6px 8px;font-size:10px;color:#64748b;">${typeLabels[item.account.type] || item.account.type}</td>
        <td style="padding:6px 8px;text-align:right;font-family:monospace;font-size:11px;${bold}color:${dc};">${dStr}</td>
        <td style="padding:6px 8px;text-align:right;font-family:monospace;font-size:11px;${bold}color:${cc};">${cStr}</td>
      </tr>`;
    }).join('');

    const tdStr = this.totalDebit.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tcStr = this.totalCredit.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Balancete de Verificacao</title>
  <style>
    @page { size: A4; margin: 15mm 12mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; font-size:12px; }
    .header { border-bottom:3px solid #1e3a5f; padding-bottom:12px; margin-bottom:16px; }
    .header-top { display:flex; justify-content:space-between; align-items:flex-start; }
    .company-name { font-size:18px; font-weight:800; color:#1e3a5f; }
    .doc-title { font-size:13px; font-weight:600; color:#475569; margin-top:2px; }
    .meta { text-align:right; font-size:10px; color:#64748b; }
    .meta strong { display:block; font-size:12px; color:#334155; }
    .status-badge { display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px;
      font-size:10px; font-weight:700; letter-spacing:.05em; background:${statusBg}; color:${statusColor}; margin-top:8px; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    thead th { background:#1e3a5f; color:white; padding:8px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; }
    thead th:last-child, thead th:nth-last-child(2) { text-align:right; }
    tfoot td { background:#1e3a5f; color:white; padding:10px 8px; font-size:12px; font-weight:700; }
    tfoot td:last-child, tfoot td:nth-last-child(2) { text-align:right; font-family:monospace; font-size:13px; }
    .footer { margin-top:16px; border-top:1px solid #e2e8f0; padding-top:8px; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; }
    .sig { display:flex; justify-content:space-around; margin-top:32px; }
    .sig-line { text-align:center; }
    .sig-line div { border-top:1px solid #94a3b8; width:160px; padding-top:4px; font-size:9px; color:#64748b; margin-top:32px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company-name">Inverno ERP</div>
        <div class="doc-title">Balancete de Verificacao</div>
        <span class="status-badge">${balanceStatus}</span>
      </div>
      <div class="meta"><strong>Emitido em</strong>${dateStr} as ${timeStr}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;width:80px;">Codigo</th>
      <th style="text-align:left;">Designacao da Conta</th>
      <th style="text-align:left;width:80px;">Natureza</th>
      <th style="width:120px;">Debito (MT)</th>
      <th style="width:120px;">Credito (MT)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="3" style="text-align:right;letter-spacing:.06em;font-size:10px;opacity:.7;">TOTAIS DO BALANCETE</td>
      <td>${tdStr}</td>
      <td>${tcStr}</td>
    </tr></tfoot>
  </table>
  <div class="sig">
    <div class="sig-line"><div>Elaborado por</div></div>
    <div class="sig-line"><div>Revisto por</div></div>
    <div class="sig-line"><div>Aprovado por</div></div>
  </div>
  <div class="footer">
    <span>Inverno ERP - Sistema de Gestao Empresarial</span>
    <span>Documento gerado automaticamente em ${dateStr} as ${timeStr}</span>
  </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { alert('Nao foi possivel iniciar a impressao.'); document.body.removeChild(iframe); return; }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }, 500);
  }

  // ─── Load Trial Balance ────────────────────────────────────────────────────

  loadTrialBalance() {
    this.issues = []; // Limpar imediante para não dar falsa sensação de "Consistente"
    this.cdr.detectChanges();

    this.accountingService.loadJournalEntries().then(() => {
      // Use setTimeout to ensure we are in a new tick and avoid NG0100
      setTimeout(() => {
        this.trialBalance = this.accountingService.getTrialBalance();

        // Sum root accounts only (no parent or parent not in list) to avoid double-counting
        const accountIds = new Set(this.trialBalance.map(i => i.account.id));

        this.totalDebit = this.trialBalance
          .filter(item => !item.account.parentId || !accountIds.has(item.account.parentId))
          .reduce((sum, item) => sum + item.debit, 0);

        this.totalCredit = this.trialBalance
          .filter(item => !item.account.parentId || !accountIds.has(item.account.parentId))
          .reduce((sum, item) => sum + item.credit, 0);

        this.isBalanced = Math.abs(this.totalDebit - this.totalCredit) < 0.01;

        this.cdr.detectChanges();

        // LOG de Depuração
        console.log(`[TrialBalance] Fresh data loaded. Balanced: ${this.isBalanced}. Total Debit: ${this.totalDebit}`);

        forkJoin({
          sales: this.dataService.getSalesDocuments(this.accountingService.activeCompanyId || undefined),
          purchases: this.dataService.getPurchaseDocuments(this.accountingService.activeCompanyId || undefined),
          treasury: this.dataService.getTreasuryDocuments()
        }).subscribe({
          next: (data) => {
            const results = this.accountingService.runAccountingDiagnostics(data.sales, data.purchases, data.treasury);
            console.log(`[TrialBalance] Diagnostic Results: Found ${results.length} issues.`);
            if (results.length > 0) {
              console.log(`[TrialBalance] First issue: ${results[0].description}`);
            }
            this.issues = results;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('[TrialBalance] Failed to load documents for diagnostic:', err);
            this.issues = this.accountingService.runAccountingDiagnostics();
            this.cdr.detectChanges();
          }
        });
      });
    }).catch(err => {
      console.error('Error refreshing trial balance:', err);
    });
  }

  // ─── Computed helpers ─────────────────────────────────────────────────────

  get missingPostingsCount(): number {
    return this.issues.filter(i => i.type === 'MISSING_POSTING').length;
  }

  get hasCriticalCorruption(): boolean {
    return this.issues.some(i => i.type === 'DATA_CORRUPTION' || i.type === 'IMBALANCE');
  }

  get hasFixableIssues(): boolean {
    return this.issues.length > 0;
  }

  trackByAccount(index: number, item: any) {
    return item.account.id;
  }

  // ─── Navigation helpers ───────────────────────────────────────────────────

  onGoToDocument(issue: AccountingIssue) {
    if (!issue.details || !issue.details['docId']) return;
    const view = issue.details['docType'] === 'SALES' ? 'sales-form' : 'purchase-form';
    this.navigationService.navigate(view, { docId: issue.details['docId'] });
  }

  // ─── Repair actions ───────────────────────────────────────────────────────

  repairHierarchy() {
    setTimeout(() => {
      this.isRepairing = true;
      this.cdr.detectChanges();

      (this.accountingService as any)['toasterService']?.showSuccess('A reparar...', 'A analisar e corrigir hierarquia de contas orfas.');

      this.accountingService.repairOrphanHierarchy().then(count => {
        if (count > 0) {
          this.accountingService.recalculateAllBalances().subscribe({
            next: () => {
              setTimeout(() => {
                this.isRepairing = false;
                this.loadTrialBalance();
                this.cdr.detectChanges();
              });
              (this.accountingService as any)['toasterService']?.showSuccess(
                'Hierarquia Reparada',
                `${count} conta(s) re-vinculadas corretamente. Saldos recalculados.`
              );
            },
            error: () => {
              setTimeout(() => {
                this.isRepairing = false;
                this.loadTrialBalance();
                this.cdr.detectChanges();
              });
              (this.accountingService as any)['toasterService']?.showError('Atencao', 'Hierarquia reparada mas houve um erro ao recalcular saldos.');
            }
          });
        } else {
          setTimeout(() => {
            this.isRepairing = false;
            this.loadTrialBalance();
            this.cdr.detectChanges();
          });
          (this.accountingService as any)['toasterService']?.showSuccess('Sem Orfas', 'Nenhuma conta orfa detectada.');
        }
      }).catch(() => {
        setTimeout(() => {
          this.isRepairing = false;
          this.cdr.detectChanges();
        });
        (this.accountingService as any)['toasterService']?.showError('Erro', 'Falha ao reparar hierarquia.');
      });
    });
  }

  recalculateBalances() {
    if (!confirm('Esta operação irá:\n1. Adicionar lançamentos perdidos\n2. Reconfigurar lançamentos aos Tipos de Documentos recentes\n3. Recalcular todos os saldos do zero\n\nDeseja continuar?')) return;

    // Wrap start in setTimeout to avoid NG0100
    setTimeout(() => {
      this.isRepairing = true;
      this.cdr.detectChanges();

      (this.accountingService as any)['toasterService']?.showSuccess('A Reconstruir...', 'A analisar configurações e regerar lançamentos...');

      forkJoin({
        sales: this.dataService.getSalesDocuments(this.accountingService.activeCompanyId || undefined),
        purchases: this.dataService.getPurchaseDocuments(this.accountingService.activeCompanyId || undefined),
        treasury: this.dataService.getTreasuryDocuments()
      }).subscribe({
        next: (data) => {
          // Pass boolean "true" for forceRecreate as 4th argument. treasuryDocs is 3rd.
          this.accountingService.autoFixMissingPostings(data.sales, data.purchases, data.treasury, true).subscribe({
            next: (count) => {
              setTimeout(() => {
                this.isRepairing = false;
                this.loadTrialBalance();
                this.cdr.detectChanges();
              });
              (this.accountingService as any)['toasterService']?.showSuccess('Reparação Concluída', `Foram regerados ou recriados ${count} lançamentos a partir das configurações atuais.`);
            },
            error: (err: any) => {
              setTimeout(() => {
                this.isRepairing = false;
                this.cdr.detectChanges();
              });
              alert('Erro ao reconstruir integração: ' + (err.message || err));
            }
          });
        },
        error: (err) => {
          setTimeout(() => {
            this.isRepairing = false;
            this.cdr.detectChanges();
          });
          alert('Erro ao consultar documentos de faturação: ' + (err.message || err));
        }
      });
    });
  }

  fixAllMissingPostings() {
    setTimeout(() => {
      this.isRepairing = true;
      this.cdr.detectChanges();

      forkJoin({
        sales: this.dataService.getSalesDocuments(this.accountingService.activeCompanyId || undefined),
        purchases: this.dataService.getPurchaseDocuments(this.accountingService.activeCompanyId || undefined),
        treasury: this.dataService.getTreasuryDocuments()
      }).subscribe({
        next: (data) => {
          (this.accountingService as any)['toasterService']?.showSuccess(
            'A processar...',
            'A criar lancamentos em falta e a recalcular saldos. Aguarde...'
          );

          this.accountingService.autoFixMissingPostings(data.sales, data.purchases, data.treasury).subscribe({
            next: (count) => {
              setTimeout(() => {
                this.isRepairing = false;
                this.loadTrialBalance();
                this.cdr.detectChanges();
              });
              if (count > 0) {
                (this.accountingService as any)['toasterService']?.showSuccess(
                  'Sincronizacao Concluida',
                  `${count} documento(s) integrado(s) e saldos recalculados com sucesso.`
                );
              } else {
                (this.accountingService as any)['toasterService']?.showSuccess(
                  'Tudo em Ordem',
                  'Nao foram encontrados documentos sem integracao contabilistica.'
                );
              }
            },
            error: () => {
              setTimeout(() => {
                this.isRepairing = false;
                this.loadTrialBalance();
                this.cdr.detectChanges();
              });
              (this.accountingService as any)['toasterService']?.showError('Erro', 'Falha durante a sincronizacao automatica.');
            }
          });
        },
        error: () => {
          setTimeout(() => {
            this.isRepairing = false;
            this.loadTrialBalance();
            this.cdr.detectChanges();
          });
          (this.accountingService as any)['toasterService']?.showError('Erro', 'Erro ao carregar documentos para reparacao.');
        }
      });
    });
  }

  fixSingleMissingPosting(issue: AccountingIssue) {
    if (!issue.relatedId) return;

    this.isRepairing = true;
    if (issue.details && issue.details['docType'] === 'SALES') {
      this.dataService.getSalesDocuments().subscribe(docs => {
        const doc = docs.find((d: any) => d.id === issue.relatedId);
        if (doc) {
          this.accountingService.createSalesJournalEntry(doc, null, []);
          setTimeout(() => {
            this.isRepairing = false;
            this.loadTrialBalance();
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      this.dataService.getPurchaseDocuments().subscribe(docs => {
        const doc = docs.find((d: any) => d.id === issue.relatedId);
        if (doc) {
          this.accountingService.createPurchaseJournalEntry(doc, null);
          setTimeout(() => {
            this.isRepairing = false;
            this.loadTrialBalance();
            this.cdr.detectChanges();
          });
        }
      });
    }
  }

  // ─── Style helpers ────────────────────────────────────────────────────────

  getIssueClass(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-rose-50 border-rose-100 text-rose-800';
      case 'WARNING': return 'bg-amber-50 border-amber-100 text-amber-800';
      case 'INFO': return 'bg-indigo-50 border-indigo-100 text-indigo-800';
      default: return 'bg-slate-50 border-slate-100 text-slate-800';
    }
  }

  getIconBg(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-rose-200 text-rose-700';
      case 'WARNING': return 'bg-amber-200 text-amber-700';
      case 'INFO': return 'bg-indigo-200 text-indigo-700';
      default: return 'bg-slate-200 text-slate-700';
    }
  }

  getIssueIcon(severity: string): string {
    return severity === 'CRITICAL' ? 'emergency_home' :
      severity === 'WARNING' ? 'warning' : 'lightbulb';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'ASSET': 'Ativo', 'LIABILITY': 'Passivo', 'EQUITY': 'Capital',
      'REVENUE': 'Rendimento', 'EXPENSE': 'Gasto'
    };
    return labels[type] || type;
  }

  getTypeClass(type: string): string {
    const base = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ';
    const classes: Record<string, string> = {
      'ASSET': base + 'bg-blue-100 text-blue-700',
      'LIABILITY': base + 'bg-rose-100 text-rose-700',
      'EQUITY': base + 'bg-indigo-100 text-indigo-700',
      'REVENUE': base + 'bg-emerald-100 text-emerald-700',
      'EXPENSE': base + 'bg-amber-100 text-amber-700'
    };
    return classes[type] || base;
  }
}
