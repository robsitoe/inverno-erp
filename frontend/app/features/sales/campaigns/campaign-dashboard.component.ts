import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../services/data.service';
import { SalesCampaign, WorkflowStatus, SalesCampaignType } from '../../../shared/models';
import { ToasterService } from '../../../services/toaster.service';

import { SalesCampaignModalComponent } from './campaign-modal.component';

@Component({
    selector: 'app-campaign-dashboard',
    standalone: true,
    imports: [CommonModule, SalesCampaignModalComponent],
    templateUrl: './campaign-dashboard.component.html',
    styleUrls: ['./campaign-dashboard.component.css']
})
export class CampaignDashboardComponent implements OnInit {
    campaigns: SalesCampaign[] = [];
    isLoading: boolean = true;
    showModal: boolean = false;
    selectedCampaign: Partial<SalesCampaign> | null = null;

    constructor(
        private dataService: DataService,
        private toaster: ToasterService
    ) { }

    ngOnInit(): void {
        this.loadCampaigns();
    }

    loadCampaigns(): void {
        console.log('[CampaignDashboard] Iniciando carregamento de campanhas...');
        this.isLoading = true;

        // Timeout de segurança para não ficar preso infinitamente
        const timeoutSubscription = setTimeout(() => {
            if (this.isLoading) {
                console.warn('[CampaignDashboard] Carregamento demorou muito, forçando interrupção.');
                this.isLoading = false;
                this.toaster.showWarning('Aviso', 'O servidor está demorando a responder. Tente novamente.');
            }
        }, 15000);

        this.dataService.getSalesCampaigns().subscribe({
            next: (data) => {
                clearTimeout(timeoutSubscription);
                console.log('[CampaignDashboard] Campanhas carregadas com sucesso:', data?.length);
                this.campaigns = data || [];
                this.isLoading = false;
            },
            error: (err) => {
                clearTimeout(timeoutSubscription);
                console.error('[CampaignDashboard] Erro ao carregar campanhas:', err);
                this.toaster.showError('Erro', 'Não foi possível carregar as campanhas de vendas.');
                this.isLoading = false;
            }
        });
    }

    retry(): void {
        this.loadCampaigns();
    }

    getStatusClass(status: WorkflowStatus): string {
        switch (status) {
            case WorkflowStatus.APPROVED: return 'bg-[var(--brand-emerald-dim)] text-[var(--brand-emerald)] border-[var(--brand-emerald-glow)]';
            case WorkflowStatus.DRAFT: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case WorkflowStatus.REJECTED: return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-[var(--slate-800)] text-[var(--text-muted)] border-[var(--border-standard)]';
        }
    }

    getProgressBarWidth(campaign: SalesCampaign): string {
        const start = new Date(campaign.startDate).getTime();
        const end = new Date(campaign.endDate).getTime();
        const now = new Date().getTime();

        if (now < start) return '0%';
        if (now > end) return '100%';

        const progress = ((now - start) / (end - start)) * 100;
        return `${progress}%`;
    }

    openConfigModal(campaign?: SalesCampaign): void {
        this.selectedCampaign = campaign ? { ...campaign } : {};
        this.showModal = true;
    }

    closeModal(): void {
        this.showModal = false;
        this.selectedCampaign = null;
    }

    onCampaignSaved(campaign: SalesCampaign): void {
        this.loadCampaigns();
        this.closeModal();
    }

    deleteCampaign(id: string): void {
        if (confirm('Tem a certeza que deseja eliminar esta campanha?')) {
            this.dataService.deleteSalesCampaign(id).subscribe({
                next: () => {
                    this.toaster.showSuccess('Sucesso', 'Campanha eliminada.');
                    this.loadCampaigns();
                },
                error: (err) => {
                    this.toaster.showError('Erro', 'Não foi possível eliminar a campanha.');
                }
            });
        }
    }
}
