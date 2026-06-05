import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';

interface PresetMeta {
  key: string;
  name: string;
  description: string;
  country: string;
  standard: string;
  accountCount: number;
  isDefault: boolean;
}

interface CsvRow {
  code: string;
  name: string;
  type: string;
  allowPosting: boolean;
  level: number;
  parentCode: string;
  description: string;
}

type ActiveTab = 'presets' | 'import' | 'export';
type MergeMode = 'MERGE' | 'REPLACE';

@Component({
  selector: 'app-account-plan-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <!-- Overlay -->
    <div class="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
         (click)="close()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <span class="material-symbols-outlined text-blue-600 text-[20px]">account_balance</span>
            </div>
            <div>
              <h2 class="font-bold text-gray-900 text-base">Gerir Plano de Contas</h2>
              <p class="text-xs text-gray-400">{{ currentCount }} contas activas</p>
            </div>
          </div>
          <button (click)="close()" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-100 px-6">
          <button *ngFor="let tab of tabs" (click)="activeTab = tab.id"
                  class="px-4 py-3 text-sm font-semibold border-b-2 transition-colors mr-1"
                  [ngClass]="activeTab === tab.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'">
            <span class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">{{ tab.icon }}</span>
              {{ tab.label }}
            </span>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">

          <!-- ===== PRESETS TAB ===== -->
          <div *ngIf="activeTab === 'presets'">
            <p class="text-sm text-gray-500 mb-4">
              Seleccione um plano de contas pré-definido. Se já tiver contas carregadas, pode escolher entre <strong>adicionar/actualizar</strong> (recomendado) ou <strong>substituir totalmente</strong>.
            </p>

            <!-- Loading -->
            <div *ngIf="loadingPresets" class="flex items-center justify-center py-10 text-gray-400">
              <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              A carregar presets...
            </div>

            <!-- Preset Cards -->
            <div *ngIf="!loadingPresets" class="grid grid-cols-1 gap-3">
              <div *ngFor="let preset of presets"
                   class="border-2 rounded-xl p-4 cursor-pointer transition-all"
                   [ngClass]="selectedPreset?.key === preset.key
                     ? 'border-blue-500 bg-blue-50'
                     : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'"
                   (click)="selectedPreset = preset">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-lg font-black text-blue-700">
                      {{ preset.country }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-bold text-gray-900 text-sm">{{ preset.name }}</p>
                        <span *ngIf="preset.isDefault" class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">Recomendado</span>
                        <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{{ preset.standard }}</span>
                      </div>
                      <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">{{ preset.description }}</p>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-lg font-black text-blue-600">{{ preset.accountCount }}</p>
                    <p class="text-[10px] text-gray-400">contas</p>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div *ngIf="presets.length === 0 && !loadingPresets"
                   class="text-center py-8 text-gray-400">
                <span class="material-symbols-outlined text-4xl text-gray-300 block mb-2">cloud_off</span>
                <p class="text-sm">Não foi possível carregar os presets do servidor.</p>
                <p class="text-xs mt-1">Verifique se o backend está em execução.</p>
              </div>
            </div>

            <!-- Merge Options -->
            <div *ngIf="selectedPreset" class="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p class="text-xs font-semibold text-gray-700 mb-2">Modo de importação:</p>
              <div class="flex gap-3">
                <label class="flex items-start gap-2 cursor-pointer flex-1 p-3 rounded-lg border-2 transition-all"
                       [ngClass]="mergeMode === 'MERGE' ? 'border-green-500 bg-green-50' : 'border-gray-200'"
                       (click)="mergeMode = 'MERGE'">
                  <input type="radio" [checked]="mergeMode === 'MERGE'" class="mt-0.5 shrink-0">
                  <div>
                    <p class="text-xs font-bold text-gray-800">Adicionar / Actualizar</p>
                    <p class="text-[10px] text-gray-500">Cria contas novas e actualiza existentes. Não apaga dados.</p>
                  </div>
                </label>
                <label class="flex items-start gap-2 cursor-pointer flex-1 p-3 rounded-lg border-2 transition-all"
                       [ngClass]="mergeMode === 'REPLACE' ? 'border-red-500 bg-red-50' : 'border-gray-200'"
                       (click)="mergeMode = 'REPLACE'">
                  <input type="radio" [checked]="mergeMode === 'REPLACE'" class="mt-0.5 shrink-0">
                  <div>
                    <p class="text-xs font-bold text-red-700">Substituir Tudo</p>
                    <p class="text-[10px] text-gray-500">Apaga o plano actual e carrega o novo. Bloqueado se existirem lançamentos.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- ===== IMPORT CSV TAB ===== -->
          <div *ngIf="activeTab === 'import'">
            <p class="text-sm text-gray-500 mb-4">
              Importe um ficheiro CSV com o seu plano de contas personalizado.
              <a (click)="downloadTemplate()" class="text-blue-600 hover:underline cursor-pointer ml-1">Descarregue o template</a> para ver o formato esperado.
            </p>

            <!-- Drop Zone -->
            <div class="border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-4 cursor-pointer"
                 [ngClass]="csvDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'"
                 (dragover)="$event.preventDefault(); csvDragOver = true"
                 (dragleave)="csvDragOver = false"
                 (drop)="onFileDrop($event)"
                 (click)="csvFileInput.click()">
              <span class="material-symbols-outlined text-[48px] mb-2 block"
                    [ngClass]="csvDragOver ? 'text-blue-500' : 'text-gray-400'">upload_file</span>
              <p class="font-semibold text-gray-700 text-sm">Arraste o ficheiro CSV ou clique para seleccionar</p>
              <p class="text-xs text-gray-400 mt-1">Formato: código, nome, tipo, permite_lancamentos, nivel, conta_pai, descricao</p>
              <input #csvFileInput type="file" accept=".csv,.txt" class="hidden" (change)="onFileSelect($event)">
            </div>

            <!-- Preview -->
            <div *ngIf="csvRows.length > 0" class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-gray-700">
                  <span class="text-green-600">{{ csvRows.length }}</span> contas detectadas
                  <span *ngIf="csvErrors.length > 0" class="text-red-500 ml-2">• {{ csvErrors.length }} erro(s)</span>
                </p>
                <button (click)="csvRows = []; csvErrors = []"
                        class="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">delete</span> Limpar
                </button>
              </div>

              <!-- Error List -->
              <div *ngIf="csvErrors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1">
                <p class="font-bold mb-1">Erros encontrados (linhas ignoradas):</p>
                <p *ngFor="let e of csvErrors">{{ e }}</p>
              </div>

              <!-- Preview Table -->
              <div class="border border-gray-200 rounded-xl overflow-hidden">
                <table class="w-full text-xs">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-3 py-2 text-left text-gray-600 font-semibold">Código</th>
                      <th class="px-3 py-2 text-left text-gray-600 font-semibold">Nome</th>
                      <th class="px-3 py-2 text-left text-gray-600 font-semibold">Tipo</th>
                      <th class="px-3 py-2 text-center text-gray-600 font-semibold">Lançamentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of csvPreview" class="border-t border-gray-100 hover:bg-gray-50">
                      <td class="px-3 py-1.5 font-mono text-blue-700">{{ row.code }}</td>
                      <td class="px-3 py-1.5 text-gray-800">{{ row.name }}</td>
                      <td class="px-3 py-1.5 text-gray-500">{{ row.type }}</td>
                      <td class="px-3 py-1.5 text-center">
                        <span [ngClass]="row.allowPosting ? 'text-green-600' : 'text-gray-400'">
                          {{ row.allowPosting ? '✓' : '—' }}
                        </span>
                      </td>
                    </tr>
                    <tr *ngIf="csvRows.length > 8" class="border-t border-gray-100 bg-gray-50">
                      <td colspan="4" class="px-3 py-1.5 text-center text-gray-400 italic">
                        ... e mais {{ csvRows.length - 8 }} conta(s)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Merge Mode for CSV -->
              <div class="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p class="text-xs font-semibold text-gray-700 mb-2">Modo de importação:</p>
                <div class="flex gap-2">
                  <label class="flex items-center gap-1.5 cursor-pointer text-xs px-3 py-2 rounded-lg border-2 transition-all"
                         [ngClass]="mergeMode === 'MERGE' ? 'border-green-500 bg-green-50 font-semibold text-green-800' : 'border-gray-200 text-gray-600'"
                         (click)="mergeMode = 'MERGE'">
                    <input type="radio" [checked]="mergeMode === 'MERGE'" class="mr-1">
                    Adicionar / Actualizar
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer text-xs px-3 py-2 rounded-lg border-2 transition-all"
                         [ngClass]="mergeMode === 'REPLACE' ? 'border-red-500 bg-red-50 font-semibold text-red-700' : 'border-gray-200 text-gray-600'"
                         (click)="mergeMode = 'REPLACE'">
                    <input type="radio" [checked]="mergeMode === 'REPLACE'" class="mr-1">
                    Substituir Tudo
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== EXPORT TAB ===== -->
          <div *ngIf="activeTab === 'export'" class="space-y-4">
            <p class="text-sm text-gray-500">
              Exporte o plano de contas actual ou descarregue um template vazio para criar o seu próprio plano.
            </p>

            <button (click)="exportCurrentPlan()"
                    class="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group">
              <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <span class="material-symbols-outlined text-blue-600 text-[20px]">download</span>
              </div>
              <div>
                <p class="font-semibold text-gray-800 text-sm">Exportar Plano Actual</p>
                <p class="text-xs text-gray-400">Descarrega todas as {{ currentCount }} contas em formato CSV</p>
              </div>
            </button>

            <button (click)="downloadTemplate()"
                    class="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left group">
              <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <span class="material-symbols-outlined text-green-600 text-[20px]">description</span>
              </div>
              <div>
                <p class="font-semibold text-gray-800 text-sm">Template CSV em Branco</p>
                <p class="text-xs text-gray-400">Ficheiro com os cabeçalhos e 3 exemplos para começar</p>
              </div>
            </button>

            <!-- CSV Format Info -->
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p class="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">info</span>
                Formato do CSV
              </p>
              <code class="text-[11px] text-gray-600 font-mono block leading-relaxed">
                codigo,nome,tipo,permite_lancamentos,nivel,conta_pai,descricao<br>
                1.1,Caixa,ASSET,true,1,,Valores em numerário<br>
                1.2,Bancos,ASSET,false,1,,Contas bancárias<br>
                1.2.1,Depósitos à ordem,ASSET,true,2,1.2,
              </code>
              <div class="mt-2 grid grid-cols-2 gap-1 text-[10px] text-gray-500">
                <span><strong>tipo:</strong> ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE</span>
                <span><strong>permite_lancamentos:</strong> true / false</span>
                <span><strong>nivel:</strong> 1, 2, 3, 4...</span>
                <span><strong>conta_pai:</strong> código da conta pai (opcional)</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button (click)="close()" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">
            Cancelar
          </button>
          <button *ngIf="activeTab !== 'export'"
                  (click)="confirm()"
                  [disabled]="!canConfirm() || saving"
                  class="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all"
                  [ngClass]="canConfirm() && !saving
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'">
            <span class="material-symbols-outlined text-[16px]" [class.animate-spin]="saving">
              {{ saving ? 'refresh' : 'check' }}
            </span>
            {{ saving ? 'A importar...' : getConfirmLabel() }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class AccountPlanManagerComponent implements OnInit {
  @Output() closed = new EventEmitter<boolean>(); // true = changes made

  activeTab: ActiveTab = 'presets';
  mergeMode: MergeMode = 'MERGE';
  saving = false;
  loadingPresets = false;

  presets: PresetMeta[] = [];
  selectedPreset: PresetMeta | null = null;

  csvRows: CsvRow[] = [];
  csvErrors: string[] = [];
  csvDragOver = false;

  currentCount = 0;
  companyId = '';

  tabs = [
    { id: 'presets' as ActiveTab, label: 'Presets', icon: 'library_books' },
    { id: 'import' as ActiveTab, label: 'Importar CSV', icon: 'upload_file' },
    { id: 'export' as ActiveTab, label: 'Exportar / Template', icon: 'download' },
  ];

  constructor(
    private dataService: DataService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('erp_company_info');
    if (stored) { try { const c = JSON.parse(stored); this.companyId = c.id || ''; } catch { } }

    this.loadPresets();
    this.loadCurrentCount();
  }

  get csvPreview(): CsvRow[] {
    return this.csvRows.slice(0, 8);
  }

  canConfirm(): boolean {
    if (this.activeTab === 'presets') return !!this.selectedPreset;
    if (this.activeTab === 'import') return this.csvRows.length > 0;
    return false;
  }

  getConfirmLabel(): string {
    if (this.activeTab === 'presets' && this.selectedPreset) {
      return `Carregar ${this.selectedPreset.accountCount} Contas`;
    }
    if (this.activeTab === 'import') {
      return `Importar ${this.csvRows.length} Contas`;
    }
    return 'Confirmar';
  }

  close() { this.closed.emit(false); }

  confirm() {
    if (this.activeTab === 'presets' && this.selectedPreset) {
      this.loadPreset();
    } else if (this.activeTab === 'import' && this.csvRows.length > 0) {
      this.importCsv();
    }
  }

  private loadPresets() {
    this.loadingPresets = true;
    this.dataService.getAccountPresets().subscribe({
      next: (presets) => {
        this.presets = presets || [];
        if (this.presets.length > 0) {
          this.selectedPreset = this.presets.find(p => p.isDefault) || this.presets[0];
        }
        this.loadingPresets = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPresets = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadCurrentCount() {
    this.dataService.getAccounts(this.companyId).subscribe({
      next: (accounts) => { this.currentCount = accounts?.length || 0; this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  private loadPreset() {
    if (!this.selectedPreset) return;
    this.saving = true;
    this.dataService.loadAccountsPreset(this.selectedPreset.key, this.companyId).subscribe({
      next: (result: any) => {
        this.saving = false;
        const count = Array.isArray(result) ? result.length : result?.imported || 0;
        this.toaster.showSuccess('Plano Carregado', `${count} contas do ${this.selectedPreset!.name} carregadas com sucesso.`);
        this.closed.emit(true);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.toaster.showError('Erro ao Carregar', err.error?.message || err.message || 'Erro desconhecido.');
        this.cdr.markForCheck();
      }
    });
  }

  private importCsv() {
    this.saving = true;
    this.dataService.importAccountsCsv(this.csvRows, this.companyId, this.mergeMode).subscribe({
      next: (result) => {
        this.saving = false;
        this.toaster.showSuccess('Importação Concluída', `${result.imported} contas importadas com sucesso (modo: ${result.mode}).`);
        this.closed.emit(true);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.toaster.showError('Erro na Importação', err.error?.message || err.message || 'Erro desconhecido.');
        this.cdr.markForCheck();
      }
    });
  }

  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.parseFile(file);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.csvDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.parseFile(file);
  }

  private parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.parseCsvText(text);
      this.cdr.markForCheck();
    };
    reader.readAsText(file, 'UTF-8');
  }

  private parseCsvText(text: string) {
    this.csvRows = [];
    this.csvErrors = [];
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return;

    // Detect separator (, or ;)
    const sep = lines[0].includes(';') ? ';' : ',';
    const startLine = lines[0].toLowerCase().includes('codigo') || lines[0].toLowerCase().includes('code') ? 1 : 0;

    for (let i = startLine; i < lines.length; i++) {
      const parts = lines[i].split(sep).map(p => p.trim().replace(/^"|"$/g, ''));
      const [code, name, type, allowPosting, level, parentCode, description] = parts;

      if (!code || !name) {
        if (code || name) this.csvErrors.push(`Linha ${i + 1}: código e nome são obrigatórios.`);
        continue;
      }

      const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
      const t = (type || 'ASSET').toUpperCase();
      if (!validTypes.includes(t)) {
        this.csvErrors.push(`Linha ${i + 1}: tipo '${type}' inválido. Use: ${validTypes.join(', ')}`);
      }

      this.csvRows.push({
        code,
        name,
        type: validTypes.includes(t) ? t : 'ASSET',
        allowPosting: allowPosting?.toLowerCase() !== 'false' && allowPosting?.toLowerCase() !== '0',
        level: parseInt(level) || 1,
        parentCode: parentCode || '',
        description: description || '',
      });
    }
  }

  downloadTemplate() {
    const header = 'codigo,nome,tipo,permite_lancamentos,nivel,conta_pai,descricao';
    const rows = [
      '1.1,Caixa,ASSET,true,1,,Valores em numerário',
      '1.2,Bancos,ASSET,false,1,,Contas bancárias',
      '1.2.1,Depósitos à ordem,ASSET,true,2,1.2,Depósitos bancários em conta à ordem',
    ];
    this.downloadCsv('template_plano_contas.csv', [header, ...rows].join('\n'));
    this.toaster.showSuccess('Template', 'Ficheiro template descarregado.');
  }

  exportCurrentPlan() {
    this.dataService.getAccounts(this.companyId).subscribe({
      next: (accounts: any[]) => {
        if (!accounts || accounts.length === 0) {
          this.toaster.showWarning('Sem Dados', 'Não há contas para exportar.');
          return;
        }
        const header = 'codigo,nome,tipo,permite_lancamentos,nivel,conta_pai,descricao';
        const rows = accounts.map(a =>
          [a.code, a.name, a.type, a.allowPosting, a.level || 1, a.parentCode || '', a.description || '']
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        );
        this.downloadCsv('plano_contas_export.csv', [header, ...rows].join('\n'));
        this.toaster.showSuccess('Exportado', `${accounts.length} contas exportadas com sucesso.`);
      },
      error: () => this.toaster.showError('Erro', 'Não foi possível exportar o plano de contas.')
    });
  }

  private downloadCsv(filename: string, content: string) {
    const bom = '﻿'; // UTF-8 BOM for Excel
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
