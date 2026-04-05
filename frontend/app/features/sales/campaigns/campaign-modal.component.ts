import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesCampaign, WorkflowStatus, SalesCampaignItem, CampaignTargetType } from '../../../shared/models';
import { AppIconComponent } from '../../../shared/components/app-icon.component';
import { DataService } from '../../../services/data.service';
import { ToasterService } from '../../../services/toaster.service';

@Component({
    selector: 'app-sales-campaign-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, AppIconComponent],
    template: `
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in" (click)="onClose()">
      <div class="bg-[var(--bg-card)] border border-[var(--border-standard)] rounded-[var(--radius-sm)] shadow-2xl w-[600px] max-h-[90vh] flex flex-col overflow-hidden relative" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border-standard)] bg-[var(--bg-side)] shrink-0">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-[var(--brand-emerald-dim)] rounded-[var(--radius-xs)] border border-[var(--brand-emerald-glow)]">
              <app-icon name="electric_bolt" [size]="18" class="text-[var(--brand-emerald)]"></app-icon>
            </div>
            <div>
              <h3 class="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em] italic">Configurar Campanha Operacional</h3>
              <p class="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Definição de Parâmetros Promocionais</p>
            </div>
          </div>
          <button (click)="onClose()" class="text-[var(--text-muted)] hover:text-[var(--brand-emerald)] transition-colors p-1">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          
          <!-- General Info -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-4">
              <div class="space-y-1">
                <label class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nome da Campanha</label>
                <input 
                  type="text" 
                  [(ngModel)]="campaign.name" 
                  placeholder="EX: PROMOÇÃO VERÃO 2026"
                  class="w-full px-4 py-2.5 bg-[var(--bg-side)] border border-[var(--border-standard)] rounded-[var(--radius-xs)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-emerald)] transition-all font-bold"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Descrição / Metadados</label>
                <textarea 
                  [(ngModel)]="campaign.description" 
                  rows="2"
                  placeholder="Descreva o objetivo técnico da campanha..."
                  class="w-full px-4 py-2.5 bg-[var(--bg-side)] border border-[var(--border-standard)] rounded-[var(--radius-xs)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-emerald)] transition-all resize-none"
                ></textarea>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Data Início</label>
                <input 
                  type="date" 
                  [(ngModel)]="campaign.startDate"
                  class="w-full px-4 py-2 bg-[var(--bg-side)] border border-[var(--border-standard)] rounded-[var(--radius-xs)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-emerald)] transition-all"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Data Fim (Deadline)</label>
                <input 
                  type="date" 
                  [(ngModel)]="campaign.endDate"
                  class="w-full px-4 py-2 bg-[var(--bg-side)] border border-[var(--border-standard)] rounded-[var(--radius-xs)] text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-emerald)] transition-all"
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="space-y-1">
                <label class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Desconto (%)</label>
                <div class="relative">
                  <input 
                    type="number" 
                    [(ngModel)]="campaign.discountPercentage"
                    class="w-full pl-4 pr-8 py-2 bg-[var(--bg-side)] border border-[var(--border-standard)] rounded-[var(--radius-xs)] text-[12px] text-[var(--brand-emerald)] text-right font-black focus:outline-none focus:border-[var(--brand-emerald)] transition-all"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--brand-emerald)] opacity-50">%</span>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Prioridade</label>
                <input 
                  type="number" 
                  [(ngModel)]="campaign.priority"
                  class="w-full px-4 py-2 bg-[var(--bg-side)] border border-[var(--border-standard)] rounded-[var(--radius-xs)] text-[11px] text-[var(--text-secondary)] text-right focus:outline-none focus:border-[var(--brand-emerald)] transition-all"
                />
              </div>
              <div class="space-y-1 flex flex-col justify-end">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <div class="relative w-10 h-5 bg-[var(--slate-800)] rounded-full border border-[var(--border-standard)] transition-all overflow-hidden" [class.bg-[var(--brand-emerald-dim)]]="campaign.isActive">
                    <input type="checkbox" [(ngModel)]="campaign.isActive" class="sr-only" />
                    <div class="absolute top-1 left-1 w-3 h-3 bg-[var(--text-muted)] rounded-full transition-all" [class.translate-x-5]="campaign.isActive" [class.bg-[var(--brand-emerald)]]="campaign.isActive"></div>
                  </div>
                  <span class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest group-hover:text-[var(--text-primary)] transition-colors">Activa</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Targeting Section -->
          <div class="space-y-3 p-4 bg-[var(--bg-side)]/50 border border-[var(--border-standard)] border-dashed rounded-[var(--radius-xs)]">
            <h4 class="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-widest">Configuração de Alvo (Target)</h4>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" [checked]="isGlobalCampaign" (change)="toggleGlobal()" class="accent-[var(--brand-emerald)]" />
                <span class="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">Aplicar a todos os Artigos</span>
              </label>
            </div>
          </div>

          <!-- Status & Workflow -->
          <div class="p-4 bg-[var(--bg-side)] border border-[var(--border-standard)] rounded-[var(--radius-xs)] space-y-3">
             <div class="flex items-center justify-between">
                <span class="text-[9px] font-black text-[var(--brand-emerald)] uppercase tracking-widest">Estado do Fluxo</span>
                <span class="text-[10px] font-black uppercase tracking-widest" [class.text-amber-500]="campaign.status === 'DRAFT'" [class.text-[var(--brand-emerald)]]="campaign.status === 'APPROVED'">{{ campaign.status }}</span>
             </div>
             <div class="flex gap-2" *ngIf="campaign.status === 'DRAFT'">
                <button (click)="setStatus('APPROVED')" class="flex-1 py-2 bg-[var(--brand-emerald)] text-[var(--bg-app)] text-[9px] font-black uppercase tracking-widest rounded-[var(--radius-xs)] hover:bg-[var(--brand-emerald-glow)] transition-all shadow-lg shadow-emerald-900/20">Aprovar p/ Execução</button>
             </div>
          </div>

        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 border-t border-[var(--border-standard)] bg-[var(--bg-side)] flex justify-end gap-3 shrink-0">
          <button (click)="onClose()" class="px-6 py-2 border border-[var(--border-standard)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest rounded-[var(--radius-xs)] hover:bg-[var(--slate-800)] transition-all">Cancelar</button>
          <button (click)="onSave()" [disabled]="isSaving" class="px-8 py-2 bg-[var(--slate-800)] border border-[var(--brand-emerald)] text-[var(--brand-emerald)] text-[10px] font-black uppercase tracking-widest rounded-[var(--radius-xs)] hover:bg-[var(--brand-emerald)] hover:text-[var(--bg-app)] transition-all disabled:opacity-50">
            <span *ngIf="!isSaving">Gravar Campanha</span>
            <span *ngIf="isSaving" class="flex items-center gap-2">
              <div class="w-3 h-3 border-2 border-[var(--bg-app)] border-t-transparent rounded-full animate-spin"></div>
              Processando...
            </span>
          </button>
        </div>

      </div>
    </div>
  `,
    styles: [`
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class SalesCampaignModalComponent implements OnInit {
    @Input() campaign: Partial<SalesCampaign> = {};
    @Output() close = new EventEmitter<void>();
    @Output() saved = new EventEmitter<SalesCampaign>();

    isSaving = false;

    get isGlobalCampaign(): boolean {
        return this.campaign.items?.some(i => i.targetType === CampaignTargetType.ALL) || false;
    }

    constructor(
        private dataService: DataService,
        private toaster: ToasterService
    ) { }

    ngOnInit() {
        if (!this.campaign.id) {
            this.campaign = {
                name: '',
                description: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
                discountPercentage: 0,
                priority: 1,
                isActive: true,
                status: WorkflowStatus.DRAFT,
                items: [],
                ...this.campaign
            };
        }
        if (!this.campaign.items) this.campaign.items = [];
    }

    toggleGlobal() {
        if (this.isGlobalCampaign) {
            this.campaign.items = this.campaign.items?.filter(i => i.targetType !== CampaignTargetType.ALL);
        } else {
            this.campaign.items?.push({
                id: 'temp-' + Date.now(),
                campaignId: this.campaign.id || '',
                targetType: CampaignTargetType.ALL
            });
        }
    }

    setStatus(status: any) {
        this.campaign.status = status;
    }

    onClose() {
        this.close.emit();
    }

    onSave() {
        if (!this.campaign.name) {
            this.toaster.showError('Erro', 'Nome da campanha é obrigatório.');
            return;
        }

        if (this.campaign.status === WorkflowStatus.APPROVED && (!this.campaign.items || this.campaign.items.length === 0)) {
            this.toaster.showWarning('Aviso', 'Campanhas aprovadas devem ter ao menos um alvo configurado.');
            // Don't return, let user decide if they want a 0-item campaign for now.
        }

        this.isSaving = true;

        const action = this.campaign.id ?
            this.dataService.updateSalesCampaign(this.campaign.id, this.campaign) :
            this.dataService.createSalesCampaign(this.campaign);

        action.subscribe({
            next: (res) => {
                this.isSaving = false;
                this.toaster.showSuccess('Sucesso', 'Campanha guardada com sucesso.');
                this.saved.emit(res);
            },
            error: (err) => {
                this.isSaving = false;
                this.toaster.showError('Erro', 'Erro ao guardar campanha.');
                console.error(err);
            }
        });
    }
}
