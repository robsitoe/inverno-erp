import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
    selector: 'app-mobile-approvals',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-6 max-w-7xl mx-auto h-full flex flex-col font-sans">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 tracking-tight">Gestão de Registos Mobile</h1>
          <p class="text-sm text-gray-500">Controle de acessos para Revendedores e Motoristas</p>
        </div>
        <div class="flex gap-4 items-center">
            <!-- Search -->
            <div class="relative group">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">search</span>
                <input type="text" [(ngModel)]="searchTerm" placeholder="Procurar nome ou telefone..." 
                       class="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64 focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all">
            </div>

            <div class="flex gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100 items-center">
                <span class="material-symbols-outlined">pending_actions</span>
                <span class="font-bold">{{ pendingUsers.length }} Pendentes</span>
            </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        <button (click)="activeTab = 'PENDING'" 
                [class]="activeTab === 'PENDING' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'"
                class="px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
            <span class="material-symbols-outlined text-[20px]">pending_actions</span>
            Aguardando Aprovação ({{ pendingUsers.length }})
        </button>
        <button (click)="activeTab = 'APPROVED'" 
                [class]="activeTab === 'APPROVED' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'"
                class="px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
            <span class="material-symbols-outlined text-[20px]">verified</span>
            Registos Aprovados ({{ approvedUsers.length }})
        </button>
      </div>

      <!-- Content -->
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div class="overflow-y-auto flex-1">
            <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[10px] uppercase tracking-widest sticky top-0 z-10">
                <tr>
                <th class="px-6 py-4">Data</th>
                <th class="px-6 py-4">Nome / Entidade</th>
                <th class="px-6 py-4">Empresa</th>
                <th class="px-6 py-4">Telefone</th>
                <th class="px-6 py-4">Perfil</th>
                <th class="px-6 py-4">Docs</th>
                <th class="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm italic-empty">
                <tr *ngFor="let user of filteredUsers" class="hover:bg-gray-50/50 transition-colors group">
                <td class="px-6 py-4 text-gray-400 font-mono text-xs">{{ (user.updatedAt || user.createdAt) | date:'dd/MM/yyyy' }}</td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-900">{{ user.name }}</span>
                        <span class="text-[10px] text-gray-400 font-mono">{{ user.username }}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                    <span class="text-xs font-bold text-gray-600 uppercase">{{ user.company?.name || '---' }}</span>
                    <span class="text-[9px] text-gray-400 font-mono italic">{{ user.companyId }}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-600 font-medium">{{ user.phone }}</td>
                <td class="px-6 py-4">
                    <span [class]="(user.profile === 'RESELLER' || user.customerId) ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'" 
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border">
                    {{ user.profile || (user.customerId ? 'RESELLER' : (user.employeeId ? 'DRIVER' : 'UNKNOWN')) }}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <button *ngIf="user.attachments" (click)="viewAttachments(user)" class="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold text-xs transition-colors">
                    <span class="material-symbols-outlined text-[16px]">visibility</span>
                    Ver Docs
                    </button>
                    <span [class]="activeTab === 'APPROVED' ? 'text-green-500' : 'text-gray-300'" class="text-[10px] font-mono italic">
                        {{ user.attachments ? 'Disponíveis' : 'N/A' }}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div *ngIf="activeTab === 'PENDING'" class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button (click)="rejectUser(user)" class="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-transparent hover:border-red-200 uppercase tracking-tighter">
                            Rejeitar
                        </button>
                        <button (click)="approveUser(user)" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1 uppercase tracking-tighter">
                            <span class="material-symbols-outlined text-sm">check_circle</span>
                            Aprovar
                        </button>
                    </div>
                    <div *ngIf="activeTab === 'APPROVED'" class="flex justify-end gap-2">
                        <span class="flex items-center gap-1 text-green-600 font-bold text-[10px] uppercase bg-green-50 px-2 py-1 rounded border border-green-100">
                            <span class="material-symbols-outlined text-sm">verified_user</span>
                            Ativo
                        </span>
                    </div>
                </td>
                </tr>
                
                <!-- Loading State -->
                <tr *ngIf="(activeTab === 'PENDING' && loadingPending) || (activeTab === 'APPROVED' && loadingApproved)">
                    <td colspan="7" class="px-6 py-20 text-center">
                        <div class="flex flex-col items-center">
                            <span class="material-symbols-outlined text-4xl mb-2 text-orange-500 animate-spin">sync</span>
                            <p class="text-sm font-bold text-gray-500 uppercase tracking-widest">A carregar registos...</p>
                        </div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr *ngIf="filteredUsers.length === 0 && !((activeTab === 'PENDING' && loadingPending) || (activeTab === 'APPROVED' && loadingApproved))">
                <td colspan="7" class="px-6 py-32 text-center">
                    <div class="flex flex-col items-center opacity-20">
                        <span class="material-symbols-outlined text-7xl mb-4 text-gray-400">
                            {{ searchTerm ? 'search_off' : (activeTab === 'PENDING' ? 'how_to_reg' : 'history') }}
                        </span>
                        <p class="text-xl font-bold text-gray-500">
                            {{ searchTerm ? 'Nenhum resultado para "' + searchTerm + '"' : (activeTab === 'PENDING' ? 'Sem pedidos pendentes' : 'Ainda não há utilizadores aprovados') }}
                        </p>
                        <p class="text-sm text-gray-400 mt-1 italic">Tente mudar os filtros ou termos de pesquisa.</p>
                    </div>
                </td>
                </tr>
            </tbody>
            </table>
        </div>
      </div>
    </div>

    <!-- Document Preview Modal (Visual only simulation for now) -->
    <div *ngIf="selectedUser" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden border border-gray-200">
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="font-bold text-gray-800 flex items-center gap-2">
                    <span class="material-symbols-outlined text-blue-600">description</span>
                    Documentação: {{ selectedUser.name }}
                </h3>
                <button (click)="selectedUser = null" class="text-gray-400 hover:text-gray-600 p-1 rounded-full">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-8 overflow-y-auto space-y-6">
                <!-- Alvará -->
                <div *ngIf="selectedUser.attachments?.alvara" class="bg-gray-50 border p-4 rounded-lg border-gray-200 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                            <span class="material-symbols-outlined">description</span>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase font-bold">Alvará Comercial</p>
                            <p class="font-medium text-gray-800">{{ selectedUser.attachments.alvara }}</p>
                        </div>
                    </div>
                    <button class="text-blue-600 hover:underline text-sm font-bold">Abrir</button>
                </div>
                <!-- NUIT -->
                <div *ngIf="selectedUser.attachments?.nuit" class="bg-gray-50 border p-4 rounded-lg border-gray-200 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-green-100 text-green-600 rounded flex items-center justify-center">
                            <span class="material-symbols-outlined">id_card</span>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase font-bold">NUIT (Documento)</p>
                            <p class="font-medium text-gray-800">{{ selectedUser.attachments.nuit }}</p>
                        </div>
                    </div>
                    <button class="text-blue-600 hover:underline text-sm font-bold">Abrir</button>
                </div>
                <!-- Photo -->
                <div *ngIf="selectedUser.attachments?.photo" class="bg-gray-50 border p-4 rounded-lg border-gray-200 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-orange-100 text-orange-600 rounded flex items-center justify-center">
                            <span class="material-symbols-outlined">image</span>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase font-bold">Fotografia do Estabelecimento</p>
                            <p class="font-medium text-gray-800">{{ selectedUser.attachments.photo }}</p>
                        </div>
                    </div>
                    <button class="text-blue-600 hover:underline text-sm font-bold">Abrir</button>
                </div>
            </div>
            <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                <button (click)="selectedUser = null" class="bg-white border border-gray-300 px-6 py-2 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                    Fechar Pré-visualização
                </button>
            </div>
        </div>
    </div>
  `,
    styles: [`
    :host { display: block; height: 100%; }
    .italic-empty tr:hover .material-symbols-outlined { color: #f97316; }
  `]
})
export class MobileApprovalsComponent implements OnInit, OnDestroy {
    activeTab: 'PENDING' | 'APPROVED' = 'PENDING';
    searchTerm: string = '';
    pendingUsers: any[] = [];
    approvedUsers: any[] = [];
    selectedUser: any = null;
    loadingPending: boolean = false;
    loadingApproved: boolean = false;
    private refreshInterval: any;

    constructor(private dataService: DataService) { }

    ngOnInit() {
        this.loadAll();
        this.setupAutoRefresh();
    }

    ngOnDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    setupAutoRefresh() {
        // Refresh every 15 seconds to keep the list up to date without over-polling
        this.refreshInterval = setInterval(() => {
            this.loadAll();
        }, 15000);
    }

    loadAll() {
        this.loadPending();
        this.loadApproved();
    }

    loadPending() {
        this.loadingPending = true;
        this.dataService.getPendingMobileUsers().subscribe({
            next: (users) => {
                this.pendingUsers = users;
                this.loadingPending = false;
            },
            error: (err) => {
                console.error('Error fetching pending users:', err);
                this.loadingPending = false;
            }
        });
    }

    loadApproved() {
        this.loadingApproved = true;
        this.dataService.getApprovedMobileUsers().subscribe({
            next: (users) => {
                this.approvedUsers = users;
                this.loadingApproved = false;
            },
            error: (err) => {
                console.error('Error fetching approved users:', err);
                this.loadingApproved = false;
            }
        });
    }

    get filteredUsers() {
        const list = this.activeTab === 'PENDING' ? this.pendingUsers : this.approvedUsers;
        if (!this.searchTerm) return list;

        const term = this.searchTerm.toLowerCase();
        return list.filter(u =>
            u.name?.toLowerCase().includes(term) ||
            u.phone?.includes(term) ||
            u.username?.toLowerCase().includes(term)
        );
    }

    viewAttachments(user: any) {
        this.selectedUser = user;
    }

    approveUser(user: any) {
        if (confirm(`Confirmar aprovação de registo para ${user.name}? \n\nIsto criará o acesso oficial no sistema e enviará uma notificação ao utilizador.`)) {
            this.dataService.approveMobileUser(user.id).subscribe({
                next: () => {
                    this.loadPending();
                    this.loadApproved();
                    alert('Utilizador aprovado com sucesso!');
                },
                error: (err) => alert('Erro ao processar aprovação.')
            });
        }
    }

    rejectUser(user: any) {
        alert('Funcionalidade de rejeição será implementada no próximo sprint.');
    }
}
