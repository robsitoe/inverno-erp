import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-[#F0F0F0] p-4 gap-4">
      <div class="bg-white border border-gray-300 rounded shadow-sm p-4">
        <h2 class="text-lg font-semibold text-gray-800 mb-3">Consulta de Auditoria</h2>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label class="text-xs text-gray-600 block mb-1">De</label>
            <input type="datetime-local" [(ngModel)]="filters.from" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-600 block mb-1">Até</label>
            <input type="datetime-local" [(ngModel)]="filters.to" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-600 block mb-1">Utilizador</label>
            <input type="text" [(ngModel)]="filters.user" placeholder="admin" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-600 block mb-1">Módulo</label>
            <select [(ngModel)]="filters.module" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">Todos</option>
              <option value="financial">Financeiro</option>
              <option value="master-data">Mestre de Dados</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button (click)="loadLogs()" class="px-3 py-1.5 border border-blue-500 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Filtrar</button>
            <button (click)="exportCsv()" class="px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded text-sm hover:bg-gray-100">Exportar</button>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-300 rounded shadow-sm flex-1 overflow-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th class="px-2 py-2 text-left">Timestamp</th>
              <th class="px-2 py-2 text-left">Utilizador</th>
              <th class="px-2 py-2 text-left">Módulo</th>
              <th class="px-2 py-2 text-left">Ação</th>
              <th class="px-2 py-2 text-left">Entidade</th>
              <th class="px-2 py-2 text-left">Antes</th>
              <th class="px-2 py-2 text-left">Depois</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of logs" class="border-b border-gray-100 align-top">
              <td class="px-2 py-2 whitespace-nowrap">{{ log.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</td>
              <td class="px-2 py-2">{{ log.username || log.userId || '-' }}</td>
              <td class="px-2 py-2">{{ log.module }}</td>
              <td class="px-2 py-2">{{ log.action }}</td>
              <td class="px-2 py-2">{{ log.entity }} <span class="text-gray-400">{{ log.entityId }}</span></td>
              <td class="px-2 py-2 max-w-[220px] break-all">{{ toJson(log.before) }}</td>
              <td class="px-2 py-2 max-w-[220px] break-all">{{ toJson(log.after) }}</td>
            </tr>
            <tr *ngIf="logs.length === 0">
              <td colspan="7" class="px-3 py-6 text-center text-gray-500 italic">Sem registos para os filtros selecionados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminAuditLogComponent implements OnInit {
  logs: any[] = [];
  filters: { from?: string; to?: string; user?: string; module?: string } = {};

  constructor(private readonly dataService: DataService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs() {
    const payload = {
      ...this.filters,
      from: this.filters.from ? new Date(this.filters.from).toISOString() : undefined,
      to: this.filters.to ? new Date(this.filters.to).toISOString() : undefined,
    };

    this.dataService.getAuditLogs(payload).subscribe({
      next: logs => (this.logs = logs),
      error: err => {
        console.error('Erro ao carregar auditoria', err);
        this.logs = [];
      },
    });
  }

  toJson(value: any) {
    if (!value) return '-';
    return JSON.stringify(value);
  }

  exportCsv() {
    if (!this.logs.length) return;

    const escape = (value: any) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['timestamp', 'utilizador', 'modulo', 'acao', 'entidade', 'entityId', 'before', 'after'],
      ...this.logs.map(log => [
        log.timestamp,
        log.username || log.userId || '',
        log.module,
        log.action,
        log.entity,
        log.entityId || '',
        JSON.stringify(log.before || {}),
        JSON.stringify(log.after || {}),
      ]),
    ];

    const content = rows.map(cols => cols.map(escape).join(';')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
