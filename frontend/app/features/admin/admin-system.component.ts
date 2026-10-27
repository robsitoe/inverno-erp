import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

type Tab = 'info' | 'backup' | 'events';

/** Gestão do sistema: estado, cópia de segurança e eventos de auditoria (só administradores, modo servidor). */
@Component({
  selector: 'app-admin-system',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-[#F0F0F0] text-[12px] text-gray-800">
      <div class="px-4 py-2 bg-slate-700 text-white flex items-center justify-between">
        <h1 class="text-sm font-semibold tracking-wide">Sistema, Cópias de Segurança e Eventos</h1>
        <span class="text-[11px] text-slate-300">Versão {{ info?.version || '—' }}</span>
      </div>

      <div *ngIf="offline" class="m-4 p-3 border border-amber-400 bg-amber-50 text-amber-900">
        Esta área exige ligação ao servidor. Em modo local (dados no navegador) use <b>Ferramentas</b> para exportar os dados.
      </div>

      <ng-container *ngIf="!offline">
        <div class="flex border-b border-gray-300 bg-[#E8E8E8] px-2">
          <button *ngFor="let t of tabs" type="button" (click)="setTab(t.id)"
                  [class]="'px-4 py-2 border-x border-t -mb-px ' + (tab === t.id ? 'bg-white border-gray-300 font-semibold text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')">
            {{ t.label }}
          </button>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <div *ngIf="error" class="mb-3 p-2 border border-red-300 bg-red-50 text-red-700">{{ error }}</div>

          <!-- ESTADO -->
          <div *ngIf="tab === 'info'">
            <div *ngIf="loading" class="text-gray-500 italic">A carregar…</div>
            <div *ngIf="info" class="space-y-4">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-white border border-gray-300 p-3"><div class="text-gray-500">Base de dados</div><div class="font-semibold break-all">{{ info.database?.name || '—' }}</div></div>
                <div class="bg-white border border-gray-300 p-3"><div class="text-gray-500">Tamanho</div><div class="font-semibold">{{ size(info.database?.sizeBytes) }}</div></div>
                <div class="bg-white border border-gray-300 p-3"><div class="text-gray-500">Registos</div><div class="font-semibold">{{ info.totalRows | number }}</div></div>
                <div class="bg-white border border-gray-300 p-3"><div class="text-gray-500">Servidor activo há</div><div class="font-semibold">{{ uptime(info.uptimeSeconds) }}</div></div>
              </div>
              <div class="bg-white border border-gray-300">
                <div class="px-3 py-2 border-b border-gray-300 font-semibold bg-[#E1E1E1]">Registos por tabela</div>
                <table class="w-full">
                  <tbody>
                    <tr *ngFor="let t of info.tables" class="border-b border-gray-100">
                      <td class="px-3 py-1">{{ t.table }}</td>
                      <td class="px-3 py-1 text-right tabular-nums">{{ t.rows | number }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="text-gray-500">Node {{ info.node }} · memória {{ info.memoryMb }} MB · hora do servidor {{ info.serverTime | date:'dd/MM/yyyy HH:mm:ss' }}</p>
            </div>
          </div>

          <!-- BACKUP -->
          <div *ngIf="tab === 'backup'" class="max-w-2xl space-y-4">
            <div class="bg-white border border-gray-300 p-4 space-y-3">
              <h2 class="font-semibold text-sm">Cópia de segurança da empresa activa</h2>
              <p class="text-gray-600">Descarrega um ficheiro com <b>todos</b> os dados da empresa (documentos, contabilidade, stock, tesouraria, utilizadores, configurações). Guarde-o fora do servidor (disco externo ou nuvem).</p>
              <button type="button" (click)="download()" [disabled]="busy"
                      class="px-4 py-1.5 border border-blue-700 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {{ busy ? 'A gerar cópia…' : 'Descarregar cópia de segurança' }}
              </button>
              <div *ngIf="lastBackup" class="p-2 border border-green-300 bg-green-50 text-green-800">
                Cópia gerada às {{ lastBackup.at | date:'dd/MM/yyyy HH:mm' }} — {{ lastBackup.name }}
                <div class="text-[11px] break-all">SHA-256: {{ lastBackup.checksum }}</div>
              </div>
            </div>
            <div class="bg-white border border-red-300 p-4 space-y-3">
              <h2 class="font-semibold text-sm text-red-800">Restaurar uma cópia de segurança</h2>
              <p class="text-gray-600">Substitui <b>todos</b> os dados da empresa activa pelo conteúdo do ficheiro. Antes de substituir, o servidor guarda automaticamente uma cópia do estado actual, e se algo falhar nada é alterado.</p>
              <input type="file" accept=".json,application/json" (change)="onRestoreFile($event)" class="block text-[12px]" />
              <div *ngIf="restore.checking" class="text-gray-500 italic">A validar ficheiro…</div>
              <div *ngIf="restore.summary" class="p-2 border border-gray-300 bg-gray-50">
                Cópia de {{ restore.summary.createdAt | date:'dd/MM/yyyy HH:mm' }} por {{ restore.summary.createdBy || '—' }} ·
                {{ restore.summary.tables }} tabelas · {{ restore.summary.rows | number }} registos
              </div>
              <div *ngIf="restore.summary" class="space-y-2">
                <label class="block">Para confirmar, escreva o id da empresa (<b>{{ companyId }}</b>):
                  <input type="text" [(ngModel)]="restore.confirm" class="ml-2 border border-gray-400 bg-white px-2 py-0.5 w-56" />
                </label>
                <button type="button" (click)="doRestore()" [disabled]="busy || restore.confirm !== companyId"
                        class="px-4 py-1.5 border border-red-800 bg-red-700 text-white hover:bg-red-800 disabled:opacity-40">
                  {{ busy ? 'A restaurar…' : 'Restaurar agora' }}
                </button>
              </div>
              <div *ngIf="restore.error" class="p-2 border border-red-300 bg-red-50 text-red-700">{{ restore.error }}</div>
              <div *ngIf="restore.done" class="p-2 border border-green-300 bg-green-50 text-green-800">
                Restauro concluído ({{ restore.done.rows | number }} registos). Cópia anterior guardada no servidor: <span class="break-all">{{ restore.done.safetyBackup }}</span>.
                <button type="button" (click)="reload()" class="ml-2 underline">Recarregar a aplicação</button>
              </div>
            </div>
            <div class="bg-white border border-gray-300 p-4 space-y-2">
              <h2 class="font-semibold text-sm">Boas práticas</h2>
              <ul class="list-disc pl-5 text-gray-600 space-y-1">
                <li>Faça uma cópia <b>antes</b> de qualquer reparação, fecho de exercício ou actualização.</li>
                <li>Mantenha pelo menos 3 cópias recentes, uma delas fora do local.</li>
                <li>O ficheiro contém dados sensíveis (utilizadores e valores): proteja-o.</li>
                <li>Para cópias automáticas diárias use o script <code>scripts/backup.bat</code> (ver Manual de Instalação).</li>
              </ul>
            </div>
          </div>

          <!-- EVENTOS -->
          <div *ngIf="tab === 'events'">
            <div class="flex items-center gap-2 mb-2">
              <select [(ngModel)]="eventCategory" class="border border-gray-400 bg-white px-1 py-0.5">
                <option value="">Todas as categorias</option>
                <option value="DOCUMENTO">Documentos</option>
                <option value="PERÍODO">Períodos</option>
                <option value="ACESSO">Acessos</option>
                <option value="UTILIZADOR">Utilizadores</option>
                <option value="CONFIGURAÇÃO">Configuração</option>
                <option value="SISTEMA">Sistema e cópias</option>
              </select>
              <input type="text" [(ngModel)]="eventSearch" placeholder="Pesquisar utilizador ou texto…" class="flex-1 border border-gray-400 bg-white px-2 py-0.5" />
              <button type="button" (click)="loadEvents()" class="px-3 py-0.5 border border-gray-500 bg-white hover:bg-gray-100">Actualizar</button>
            </div>
            <div class="bg-white border border-gray-300 overflow-auto">
              <table class="w-full">
                <thead class="bg-[#E1E1E1] sticky top-0">
                  <tr>
                    <th class="px-2 py-1 text-left border-r border-gray-300 w-36">Data/hora</th>
                    <th class="px-2 py-1 text-left border-r border-gray-300 w-24">Categoria</th>
                    <th class="px-2 py-1 text-left border-r border-gray-300 w-32">Utilizador</th>
                    <th class="px-2 py-1 text-left border-r border-gray-300">Acção</th>
                    <th class="px-2 py-1 text-left">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let e of filteredEvents" class="border-t border-gray-100">
                    <td class="px-2 py-1 whitespace-nowrap">{{ e.at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-2 py-1">{{ e.category }}</td>
                    <td class="px-2 py-1">{{ e.user }}</td>
                    <td class="px-2 py-1">{{ e.action }}</td>
                    <td class="px-2 py-1 text-gray-600">{{ e.detail }}</td>
                  </tr>
                  <tr *ngIf="!loading && filteredEvents.length === 0"><td colspan="5" class="px-2 py-6 text-center text-gray-500 italic">Sem eventos registados.</td></tr>
                </tbody>
              </table>
            </div>
            <p class="mt-1 text-gray-500">{{ filteredEvents.length }} evento(s) mais recentes.</p>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class AdminSystemComponent implements OnInit {
  tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Estado do Sistema' },
    { id: 'backup', label: 'Cópia de Segurança' },
    { id: 'events', label: 'Eventos' }
  ];
  tab: Tab = 'info';
  offline = false;
  loading = false;
  busy = false;
  error = '';
  info: any = null;
  events: any[] = [];
  eventCategory = '';
  eventSearch = '';
  lastBackup: { at: Date; name: string; checksum: string } | null = null;
  restore: { checking: boolean; summary: any; payload: any; confirm: string; error: string; done: any } = { checking: false, summary: null, payload: null, confirm: '', error: '', done: null };
  companyId: string | undefined;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.offline = this.dataService.isLocalBrowser();
    if (this.offline) return;
    this.dataService.activeCompany$.subscribe(c => {
      const id = c?.id || undefined;
      if (id !== this.companyId) { this.companyId = id; this.setTab(this.tab); }
    });
  }

  setTab(t: Tab) {
    this.tab = t;
    this.error = '';
    if (this.offline) return;
    if (t === 'info') this.loadInfo();
    if (t === 'events') this.loadEvents();
  }

  private fail(e: any) {
    this.loading = false; this.busy = false;
    this.error = e?.status === 403 ? 'Sem permissão: apenas administradores.' : (e?.error?.message || 'Não foi possível contactar o servidor.');
  }

  loadInfo() {
    this.loading = true;
    this.dataService.getSystemInfo(this.companyId).subscribe({
      next: r => { this.info = r; this.loading = false; },
      error: e => this.fail(e)
    });
  }

  loadEvents() {
    this.loading = true;
    this.dataService.getSystemEvents(this.companyId).subscribe({
      next: r => { this.events = r || []; this.loading = false; },
      error: e => this.fail(e)
    });
  }

  get filteredEvents() {
    const q = this.eventSearch.toLowerCase().trim();
    return this.events.filter(e =>
      (!this.eventCategory || e.category === this.eventCategory) &&
      (!q || `${e.user} ${e.action} ${e.detail}`.toLowerCase().includes(q)));
  }

  onRestoreFile(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    this.restore = { checking: false, summary: null, payload: null, confirm: '', error: '', done: null };
    if (!file) return;
    this.restore.checking = true;
    const reader = new FileReader();
    reader.onerror = () => { this.restore.checking = false; this.restore.error = 'Não foi possível ler o ficheiro.'; };
    reader.onload = () => {
      let payload: any;
      try { payload = JSON.parse(String(reader.result)); } catch { this.restore.checking = false; this.restore.error = 'O ficheiro não é um JSON válido.'; return; }
      this.dataService.restoreBackup(payload, { dryRun: true, companyId: this.companyId }).subscribe({
        next: r => { this.restore.checking = false; this.restore.payload = payload; this.restore.summary = r; },
        error: e => { this.restore.checking = false; this.restore.error = e?.error?.message || 'Ficheiro recusado pelo servidor.'; }
      });
    };
    reader.readAsText(file);
  }

  doRestore() {
    if (!this.restore.payload || this.restore.confirm !== this.companyId) return;
    if (!confirm('Substituir TODOS os dados da empresa pela cópia seleccionada?\n\nO estado actual será guardado automaticamente no servidor antes de substituir.')) return;
    this.busy = true; this.restore.error = '';
    this.dataService.restoreBackup(this.restore.payload, { confirm: this.restore.confirm, companyId: this.companyId }).subscribe({
      next: r => { this.busy = false; this.restore.done = r; this.restore.summary = null; this.restore.payload = null; this.restore.confirm = ''; },
      error: e => { this.busy = false; this.restore.error = e?.error?.message || 'O restauro falhou. Nada foi alterado.'; }
    });
  }

  reload() { window.location.reload(); }

  download() {
    this.busy = true; this.error = '';
    this.dataService.downloadServerBackup(this.companyId).subscribe({
      next: resp => {
        const blob = resp.body as Blob;
        const cd = resp.headers.get('Content-Disposition') || '';
        const name = /filename="?([^";]+)"?/.exec(cd)?.[1] || `inverno-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
        this.lastBackup = { at: new Date(), name, checksum: resp.headers.get('X-Backup-Checksum') || '—' };
        this.busy = false;
      },
      error: e => this.fail(e)
    });
  }

  size(bytes?: number | null): string {
    if (!bytes) return '—';
    const mb = bytes / 1048576;
    return mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : mb.toFixed(1) + ' MB';
  }

  uptime(sec?: number): string {
    if (!sec && sec !== 0) return '—';
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  }
}
