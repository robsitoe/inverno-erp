import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ToasterService } from '../../services/toaster.service';
import { environment } from '../../shared/config';

@Component({
  selector: 'app-chart-of-accounts-setup',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl"
         [ngClass]="compact ? 'p-4' : 'p-6'">
      <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-amber-600 text-[22px]">account_balance</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-amber-900 text-sm">Plano de Contas não configurado</p>
        <p class="text-xs text-amber-700 mt-0.5">
          A empresa <strong>{{ companyName }}</strong> não tem o Plano de Contas carregado.
          A integração contabilística automática (lançamentos de vendas, compras, etc.) ficará inactiva até ser configurado.
        </p>
        <div class="flex flex-wrap items-center gap-2 mt-3">
          <button (click)="loadPGC()"
                  [disabled]="loading"
                  class="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-xs font-bold rounded-lg transition-colors">
            <span class="material-symbols-outlined text-[15px]" [class.animate-spin]="loading">
              {{ loading ? 'refresh' : 'download' }}
            </span>
            {{ loading ? 'A carregar PGC...' : 'Carregar PGC Moçambique (Recomendado)' }}
          </button>
          <span class="text-[10px] text-amber-600">ou</span>
          <button (click)="dismiss.emit()"
                  class="px-3 py-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors">
            Lembrar mais tarde
          </button>
        </div>
        <p *ngIf="loaded" class="text-xs text-green-700 font-semibold mt-2 flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">check_circle</span>
          {{ loaded }} contas carregadas com sucesso!
        </p>
      </div>
    </div>
  `
})
export class ChartOfAccountsSetupComponent {
  @Input() companyName = '';
  @Input() companyId = '';
  @Input() compact = false;
  @Output() dismiss = new EventEmitter<void>();
  @Output() setupComplete = new EventEmitter<number>();

  loading = false;
  loaded: number | null = null;

  private readonly apiBase = `${environment.apiUrl}/accounting`;

  constructor(private http: HttpClient, private toaster: ToasterService) {}

  loadPGC() {
    this.loading = true;
    const url = this.companyId
      ? `${this.apiBase}/accounts/presets/PGC-NIR?companyId=${this.companyId}`
      : `${this.apiBase}/accounts/presets/PGC-NIR`;

    this.http.post<any[]>(url, {}).subscribe({
      next: (accounts) => {
        this.loading = false;
        this.loaded = accounts?.length || 0;
        this.toaster.showSuccess(
          'Plano de Contas Carregado',
          `${this.loaded} contas do PGC Moçambique carregadas com sucesso para ${this.companyName}.`
        );
        this.setupComplete.emit(this.loaded);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || err.message || 'Erro desconhecido';
        this.toaster.showError('Erro ao Carregar PGC', msg);
      }
    });
  }
}
