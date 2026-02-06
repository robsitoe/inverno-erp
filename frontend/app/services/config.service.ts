import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { SystemConfig } from '../shared/models';

const CONFIG_STORAGE_KEY = 'erp_system_config';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: SystemConfig | null = null;

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  private loadConfig(): void {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      this.config = JSON.parse(stored) as SystemConfig;
      return;
    }

    this.config = {
      deploymentMode: 'LOCAL',
      localStorageType: 'POSTGRES',
      apiUrl: 'http://localhost:3000'
    };
    this.persist();
  }

  private persist(): void {
    if (this.config) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    }
  }

  getSystemConfig(): SystemConfig {
    if (!this.config) this.loadConfig();
    return this.config as SystemConfig;
  }

  get baseUrl(): string {
    const cfg = this.getSystemConfig();
    return cfg.deploymentMode === 'WEB' ? cfg.apiUrl : 'http://localhost:3000';
  }

  isLocalBrowser(): boolean {
    return this.getSystemConfig().localStorageType === 'BROWSER';
  }

  getDataSourceLabel(): string {
    if (this.isLocalBrowser()) return 'OFFLINE / LOCAL';
    return this.getSystemConfig().deploymentMode === 'WEB' ? 'BACKEND (NUVEM)' : 'BACKEND (LOCAL)';
  }

  checkBackendConnectivity(): Observable<boolean> {
    return this.http.get(`${this.baseUrl}/test-route`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  switchMode(type: 'BROWSER' | 'POSTGRES', deployment: 'LOCAL' | 'WEB' = 'LOCAL'): void {
    const modeLabel = type === 'BROWSER' ? 'Modo Local (Browser)' : 'Modo Backend';

    if (confirm(`Atenção: A aplicação será reiniciada para mudar para ${modeLabel}. Deseja fazer um backup dos dados locais antes de mudar?`)) {
      this.downloadBackup();
    }

    if (confirm(`Confirmar mudança para ${modeLabel}?`)) {
      const newConfig: SystemConfig = { ...this.getSystemConfig(), deploymentMode: deployment, localStorageType: type };
      this.config = newConfig;
      this.persist();
      window.location.reload();
    }
  }

  exportData(): string {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('erp_')) data[key] = localStorage.getItem(key);
    }

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      user: localStorage.getItem('erp_current_user'),
      config: this.getSystemConfig(),
      data
    }, null, 2);
  }

  downloadBackup(): void {
    const backupData = this.exportData();
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `inverno_erp_backup_${timestamp}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
