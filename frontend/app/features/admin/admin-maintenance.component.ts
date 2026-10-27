import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

type Tab = 'plans' | 'runs' | 'integrity' | 'files';

/** Planos de manutenção: cópias automáticas, verificação de integridade e limpeza (modo servidor, só administradores). */
@Component({
  selector: 'app-admin-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-[#F0F0F0] text-[12px] text-gray-800">
      <div class="px-4 py-2 bg-slate-700 text-white"><h1 class="text-sm font-semibold tracking-wide">Planos de Manutenção</h1></div>

      <div *ngIf="offline" class="m-4 p-3 border border-amber-400 bg-amber-50 text-amber-900">Esta área exige ligação ao servidor.</div>

      <ng-container *ngIf="!offline">
        <div class="flex border-b border-gray-300 bg-[#E8E8E8] px-2">
          <button *ngFor="let t of tabs" type="button" (click)="setTab(t.id)"
                  [class]="'px-4 py-2 border-x border-t -mb-px ' + (tab === t.id ? 'bg-white border-gray-300 font-semibold text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')">{{ t.label }}</button>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <div *ngIf="error" class="mb-3 p-2 border border-red-300 bg-red-50 text-red-700">{{ error }}</div>
          <div *ngIf="notice" class="mb-3 p-2 border border-green-300 bg-green-50 text-green-800">{{ notice }}</div>

          <!-- PLANOS -->
          <div *ngIf="tab === 'plans'" class="space-y-3">
            <div *ngIf="!loading && plans.length === 0" class="bg-white border border-gray-300 p-4 space-y-2">
              <p>Ainda não há planos para esta empresa. O conjunto recomendado cria: <b>cópia diária às 22:00</b> (mantém as últimas 14), <b>verificação de integridade semanal</b> (domingo às 03:00) e <b>limpeza mensal</b> (histórico com mais de 180 dias).</p>
              <button type="button" (click)="createDefaults()" class="px-4 py-1.5 border border-blue-700 bg-blue-600 text-white hover:bg-blue-700">Criar plano recomendado</button>
            </div>

            <div *ngFor="let p of plans" class="bg-white border border-gray-300">
              <div class="px-3 py-2 border-b border-gray-300 bg-[#E1E1E1] flex items-center justify-between">
                <span class="font-semibold">{{ typeLabel(p.type) }}</span>
                <span [class]="p.enabled ? 'text-green-700' : 'text-gray-500'">{{ p.enabled ? 'Activo' : 'Desactivado' }}</span>
              </div>
              <div class="p-3 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                <label class="flex flex-col gap-0.5">Frequência
                  <select [(ngModel)]="p.frequency" class="border border-gray-400 bg-white px-1 py-0.5">
                    <option value="DAILY">Diária</option><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option>
                  </select></label>
                <label class="flex flex-col gap-0.5">Hora (servidor)
                  <input type="time" [(ngModel)]="p.timeOfDay" class="border border-gray-400 bg-white px-1 py-0.5" /></label>
                <label *ngIf="p.frequency === 'WEEKLY'" class="flex flex-col gap-0.5">Dia da semana
                  <select [(ngModel)]="p.dayOfWeek" class="border border-gray-400 bg-white px-1 py-0.5">
                    <option *ngFor="let d of weekdays; let i = index" [ngValue]="i">{{ d }}</option></select></label>
                <label *ngIf="p.frequency === 'MONTHLY'" class="flex flex-col gap-0.5">Dia do mês
                  <input type="number" min="1" max="28" [(ngModel)]="p.dayOfMonth" class="border border-gray-400 bg-white px-1 py-0.5" /></label>
                <label *ngIf="p.type !== 'INTEGRITY'" class="flex flex-col gap-0.5">{{ p.type === 'BACKUP' ? 'Cópias a manter' : 'Dias de histórico' }}
                  <input type="number" min="1" [(ngModel)]="p.retention" class="border border-gray-400 bg-white px-1 py-0.5" /></label>
                <label class="flex items-center gap-1"><input type="checkbox" [(ngModel)]="p.enabled" /> Activo</label>
              </div>
              <div class="px-3 pb-3 flex flex-wrap items-center gap-2">
                <button type="button" (click)="save(p)" class="px-3 py-1 border border-blue-700 bg-blue-600 text-white hover:bg-blue-700">Guardar</button>
                <button type="button" (click)="runNow(p)" [disabled]="busyId === p.id" class="px-3 py-1 border border-gray-500 bg-white hover:bg-gray-100 disabled:opacity-50">{{ busyId === p.id ? 'A executar…' : 'Executar agora' }}</button>
                <button type="button" (click)="remove(p)" class="px-3 py-1 border border-gray-400 bg-white text-red-700 hover:bg-red-50">Apagar</button>
                <span class="text-gray-500 ml-auto">
                  Última: {{ p.lastRunAt ? (p.lastRunAt | date:'dd/MM/yyyy HH:mm') : 'nunca' }}
                  <b *ngIf="p.lastStatus" [class]="statusClass(p.lastStatus)">{{ p.lastStatus }}</b>
                  · Próxima: {{ p.enabled && p.nextRunAt ? (p.nextRunAt | date:'dd/MM/yyyy HH:mm') : '—' }}
                </span>
              </div>
              <div *ngIf="p.lastMessage" class="px-3 pb-3 text-gray-600">{{ p.lastMessage }}</div>
            </div>
            <p class="text-gray-500" *ngIf="plans.length">Os planos correm no servidor, mesmo sem ninguém ligado, e a hora é a do servidor.</p>
          </div>

          <!-- HISTORICO -->
          <div *ngIf="tab === 'runs'">
            <div class="bg-white border border-gray-300 overflow-auto">
              <table class="w-full">
                <thead class="bg-[#E1E1E1]"><tr>
                  <th class="px-2 py-1 text-left w-36">Início</th><th class="px-2 py-1 text-left w-28">Plano</th><th class="px-2 py-1 text-left w-20">Origem</th><th class="px-2 py-1 text-left w-20">Estado</th><th class="px-2 py-1 text-left">Resultado</th></tr></thead>
                <tbody>
                  <tr *ngFor="let r of runs" class="border-t border-gray-100">
                    <td class="px-2 py-1 whitespace-nowrap">{{ r.startedAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-2 py-1">{{ typeLabel(r.type) }}</td>
                    <td class="px-2 py-1">{{ r.trigger === 'AUTO' ? 'Agendado' : 'Manual' }}</td>
                    <td class="px-2 py-1"><b [class]="statusClass(r.status)">{{ r.status }}</b></td>
                    <td class="px-2 py-1 text-gray-600">{{ r.message }}</td>
                  </tr>
                  <tr *ngIf="!loading && runs.length === 0"><td colspan="5" class="px-2 py-6 text-center text-gray-500 italic">Ainda não houve execuções.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- INTEGRIDADE -->
          <div *ngIf="tab === 'integrity'" class="space-y-3">
            <div class="flex items-center gap-2">
              <button type="button" (click)="runIntegrity()" [disabled]="loading" class="px-4 py-1.5 border border-blue-700 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{{ loading ? 'A verificar…' : 'Verificar agora' }}</button>
              <span *ngIf="integrity" class="text-gray-500">Verificado em {{ integrity.checkedAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
            </div>
            <div *ngIf="integrity && integrity.issues.length === 0" class="p-3 border border-green-300 bg-green-50 text-green-800">Tudo em ordem: sem problemas de integridade.</div>
            <div *ngFor="let i of integrity?.issues" class="bg-white border border-gray-300">
              <div class="px-3 py-2 border-b border-gray-300 flex items-center justify-between" [class]="i.severity === 'CRITICAL' ? 'bg-red-50' : 'bg-amber-50'">
                <span class="font-semibold">{{ i.title }}</span>
                <span [class]="i.severity === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'">{{ i.count }}{{ i.count >= 200 ? '+' : '' }} · {{ i.severity === 'CRITICAL' ? 'Crítico' : 'Aviso' }}</span>
              </div>
              <pre class="p-2 text-[11px] overflow-auto max-h-40">{{ sample(i.samples) }}</pre>
              <div *ngIf="i.repairable" class="px-3 pb-3">
                <button type="button" (click)="repairOrphans()" [disabled]="busyRepair" class="px-3 py-1 border border-red-800 bg-red-700 text-white hover:bg-red-800 disabled:opacity-50">
                  {{ busyRepair ? 'A corrigir…' : 'Anular lançamentos órfãos' }}</button>
                <span class="ml-2 text-gray-500">Faz antes uma cópia de segurança. Os lançamentos ficam em estado CANCELLED, sem serem apagados.</span>
              </div>
            </div>
            <p *ngIf="integrity && integrity.issues.length" class="text-gray-500">Avisos de "sem lançamento" corrigem-se em Contabilidade → Balancete (reparar dados), depois de uma cópia de segurança.</p>
          </div>

          <!-- FICHEIROS -->
          <div *ngIf="tab === 'files'">
            <div class="bg-white border border-gray-300 overflow-auto">
              <table class="w-full">
                <thead class="bg-[#E1E1E1]"><tr>
                  <th class="px-2 py-1 text-left w-36">Data</th><th class="px-2 py-1 text-left w-28">Tipo</th><th class="px-2 py-1 text-left">Ficheiro</th><th class="px-2 py-1 text-right w-24">Tamanho</th><th class="w-24"></th></tr></thead>
                <tbody>
                  <tr *ngFor="let f of files" class="border-t border-gray-100">
                    <td class="px-2 py-1 whitespace-nowrap">{{ f.at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-2 py-1">{{ f.kind }}</td>
                    <td class="px-2 py-1 break-all">{{ f.name }}</td>
                    <td class="px-2 py-1 text-right">{{ size(f.size) }}</td>
                    <td class="px-2 py-1 text-right"><button type="button" (click)="download(f)" class="underline text-blue-700">Descarregar</button></td>
                  </tr>
                  <tr *ngIf="!loading && files.length === 0"><td colspan="5" class="px-2 py-6 text-center text-gray-500 italic">Sem cópias guardadas no servidor.</td></tr>
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-gray-500">As cópias automáticas ficam comprimidas (.json.gz) no servidor. Descarregue-as regularmente para fora da máquina. Para restaurar, descomprima o ficheiro e use Backups → Restaurar.</p>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class AdminMaintenanceComponent implements OnInit {
  tabs: { id: Tab; label: string }[] = [
    { id: 'plans', label: 'Planos' }, { id: 'runs', label: 'Histórico' },
    { id: 'integrity', label: 'Verificação de Integridade' }, { id: 'files', label: 'Cópias no Servidor' }
  ];
  weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  tab: Tab = 'plans';
  offline = false; loading = false; busyId: number | null = null; busyRepair = false;
  error = ''; notice = '';
  plans: any[] = []; runs: any[] = []; files: any[] = []; integrity: any = null;
  private companyId: string | undefined;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.offline = this.dataService.isLocalBrowser();
    if (this.offline) return;
    this.dataService.activeCompany$.subscribe(c => {
      const id = c?.id || undefined;
      if (id !== this.companyId) { this.companyId = id; this.integrity = null; this.setTab(this.tab); }
    });
  }

  setTab(t: Tab) {
    this.tab = t; this.error = ''; this.notice = '';
    if (this.offline) return;
    if (t === 'plans') this.loadPlans();
    if (t === 'runs') this.loadRuns();
    if (t === 'files') this.loadFiles();
  }

  private fail(e: any) {
    this.loading = false; this.busyId = null; this.busyRepair = false;
    this.error = e?.status === 403 ? 'Sem permissão: apenas administradores.' : (e?.error?.message || 'Não foi possível contactar o servidor.');
  }

  typeLabel(t: string) { return t === 'BACKUP' ? 'Cópia de segurança' : t === 'INTEGRITY' ? 'Verificação de integridade' : t === 'CLEANUP' ? 'Limpeza' : t; }
  statusClass(s: string) { return s === 'OK' ? 'text-green-700' : s === 'AVISO' ? 'text-amber-700' : s === 'RUNNING' ? 'text-blue-700' : 'text-red-700'; }
  size(b: number) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  sample(rows: any[]) { return (rows || []).map(r => Object.entries(r).map(([k, v]) => `${k}: ${v ?? ''}`).join('  ·  ')).join('\n'); }

  loadPlans() { this.loading = true; this.dataService.maintenanceListPlans(this.companyId).subscribe({ next: r => { this.plans = r || []; this.loading = false; }, error: e => this.fail(e) }); }
  loadRuns() { this.loading = true; this.dataService.maintenanceListRuns(this.companyId).subscribe({ next: r => { this.runs = r || []; this.loading = false; }, error: e => this.fail(e) }); }
  loadFiles() { this.loading = true; this.dataService.maintenanceListFiles(this.companyId).subscribe({ next: r => { this.files = r || []; this.loading = false; }, error: e => this.fail(e) }); }

  createDefaults() { this.dataService.maintenanceCreateDefaults(this.companyId).subscribe({ next: r => { this.plans = r || []; this.notice = 'Plano recomendado criado.'; }, error: e => this.fail(e) }); }
  save(p: any) { this.error = ''; this.dataService.maintenanceSavePlan(p, this.companyId).subscribe({ next: () => { this.notice = 'Plano guardado.'; this.loadPlans(); }, error: e => this.fail(e) }); }
  remove(p: any) { if (!confirm('Apagar este plano?')) return; this.dataService.maintenanceDeletePlan(p.id, this.companyId).subscribe({ next: () => this.loadPlans(), error: e => this.fail(e) }); }

  runNow(p: any) {
    this.busyId = p.id; this.error = ''; this.notice = '';
    this.dataService.maintenanceRunPlan(p.id, this.companyId).subscribe({
      next: r => { this.busyId = null; this.notice = `${this.typeLabel(p.type)}: ${r?.status} — ${r?.message || ''}`; this.loadPlans(); },
      error: e => this.fail(e)
    });
  }

  runIntegrity() { this.loading = true; this.error = ''; this.notice = ''; this.dataService.maintenanceIntegrity(this.companyId).subscribe({ next: r => { this.integrity = r; this.loading = false; }, error: e => this.fail(e) }); }

  repairOrphans() {
    if (!confirm('Anular os lançamentos órfãos?\n\nÉ feita antes uma cópia de segurança. Os lançamentos ficam CANCELLED (não são apagados).')) return;
    this.busyRepair = true; this.error = '';
    this.dataService.maintenanceRepairOrphans(this.companyId).subscribe({
      next: r => { this.busyRepair = false; this.notice = `${r.cancelled} lançamento(s) anulado(s). Cópia prévia: ${r.safetyBackup}.`; this.runIntegrity(); },
      error: e => this.fail(e)
    });
  }

  download(f: any) {
    this.dataService.maintenanceDownloadFile(f.name, this.companyId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = f.name.split('/').pop(); a.click();
        URL.revokeObjectURL(url);
      },
      error: e => this.fail(e)
    });
  }
}
