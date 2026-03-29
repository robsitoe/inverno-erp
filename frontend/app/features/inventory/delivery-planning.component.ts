import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';

@Component({
    selector: 'app-delivery-planning',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="flex flex-col h-full bg-[var(--bg-app)]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-[var(--border-standard)] bg-[var(--bg-side)] shrink-0 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-[var(--text-primary)] tracking-tight uppercase">Planeamento de Entregas</h2>
          <p class="text-xs text-[var(--text-muted)] font-medium">Organize e atribua rotas para os motoristas do setor de gás.</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="loadData()" class="p-2 hover:bg-[var(--slate-800)] rounded-lg text-[var(--text-secondary)] transition-colors" title="Atualizar">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>

      <!-- Main Board -->
      <div class="flex-1 p-6 overflow-hidden flex gap-6">
        
        <!-- Unassigned Column -->
        <div class="w-80 flex flex-col bg-[var(--slate-900)] rounded-xl border border-[var(--border-standard)] shrink-0 overflow-hidden">
          <div class="p-4 border-b border-[var(--border-standard)] bg-[var(--slate-800)] flex items-center justify-between">
            <h3 class="font-bold text-xs uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
              <span class="material-symbols-outlined text-orange-500">pending_actions</span>
              Pendentes ({{ pendingDeliveries.length }})
            </h3>
          </div>
          
          <div class="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <div *ngFor="let del of pendingDeliveries" 
                 class="delivery-card shadow-sm border border-[var(--border-standard)] bg-[var(--bg-card)] rounded-[var(--radius-sm)] p-3 cursor-grab hover:border-[var(--brand-emerald)] transition-all relative group"
                 [class.border-red-500]="del.statusNotes">
              
              <!-- Justification Banner -->
              <div *ngIf="del.statusNotes" class="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full shadow-lg z-10 animate-pulse">
                MOTIVO: {{ del.statusNotes }}
              </div>

              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-[var(--brand-emerald)] tracking-wider">{{ del.documentNumber }}</span>
                <span class="text-[10px] text-[var(--text-muted)]">{{ del.date | date:'HH:mm' }}</span>
              </div>
              <h4 class="font-bold text-sm text-white mb-1 truncate">{{ del.customerName || 'Cliente Mobile' }}</h4>
              <p class="text-[11px] text-[var(--text-muted)] mb-3 line-clamp-1">{{ del.customerAddress || 'Sem morada' }}</p>
              
              <div class="flex flex-wrap gap-1 mb-3">
                 <span *ngFor="let line of del.lines" class="px-1.5 py-0.5 bg-[var(--slate-700)] rounded text-[9px] font-bold text-white border border-white/10">
                   {{ line.quantity }}x {{ line.articleCode }}
                 </span>
              </div>

              <div class="pt-3 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
                <button *ngFor="let driver of drivers" 
                        (click)="moveToDriver(del, driver)"
                        class="px-2 py-1 bg-[var(--slate-700)] hover:bg-[var(--brand-emerald)] hover:text-white rounded text-[9px] font-black transition-colors shrink-0">
                  + {{ getShortName(driver.name) }}
                </button>
              </div>
            </div>

            <div *ngIf="pendingDeliveries.length === 0" class="h-40 flex flex-col items-center justify-center text-center p-4">
              <span class="material-symbols-outlined text-4xl text-[var(--text-muted)] mb-2 opacity-20">done_all</span>
              <p class="text-xs text-[var(--text-muted)]">Nenhuma entrega pendente.</p>
            </div>
          </div>
        </div>

        <!-- Driver Columns -->
        <div class="flex-1 flex gap-6 overflow-x-auto pb-4 no-scrollbar">
          <div *ngFor="let driver of drivers" class="w-80 flex flex-col bg-[var(--slate-900)] rounded-xl border border-[var(--border-standard)] shrink-0 overflow-hidden">
            <div class="p-4 border-b border-[var(--border-standard)] bg-[var(--brand-emerald)]/10 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-[var(--brand-emerald)] flex items-center justify-center text-white font-bold text-xs">
                  {{ driver.name.substring(0, 1) }}
                </div>
                <div>
                  <h3 class="font-bold text-sm text-white">{{ driver.name }}</h3>
                  <p class="text-[10px] text-[var(--brand-emerald)] font-bold">EM ROTA: {{ getDriverRoute(driver.id).length }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="optimizeRoute(driver)" 
                        [disabled]="getDriverRoute(driver.id).length < 2"
                        class="w-8 h-8 flex items-center justify-center bg-[var(--slate-800)] hover:bg-[var(--brand-emerald)] hover:text-white rounded text-[var(--text-secondary)] transition-colors"
                        title="Otimizar Sequência">
                  <span class="material-symbols-outlined text-[18px]">auto_fix_high</span>
                </button>
                <button (click)="saveRoute(driver)" 
                        [disabled]="getDriverRoute(driver.id).length === 0"
                        class="px-3 py-1.5 bg-[var(--brand-emerald)] text-white rounded text-xs font-black shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform disabled:opacity-30 disabled:pointer-events-none">
                  ENVIAR
                </button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              <div *ngFor="let del of getDriverRoute(driver.id); let idx = index" 
                   class="p-4 bg-[var(--slate-800)] border border-[var(--brand-emerald)]/30 rounded-lg group relative shadow-md">
                <div class="absolute -left-2 top-4 w-5 h-5 bg-[var(--brand-emerald)] rounded-full border-2 border-[var(--slate-800)] flex items-center justify-center text-[10px] font-black text-white">
                  {{ idx + 1 }}
                </div>
                
                <div class="flex justify-between items-start mb-1 pl-2">
                  <span class="text-[9px] font-bold text-[var(--brand-emerald)] tracking-wider">{{ del.documentNumber }}</span>
                  <button (click)="returnToPending(del)" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all">
                    <span class="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                
                <h4 class="font-bold text-sm text-white mb-1 truncate pl-2">{{ del.customerName || 'Cliente Mobile' }}</h4>
                <p class="text-[11px] text-[var(--text-muted)] mb-3 line-clamp-1 pl-2">{{ del.customerAddress || 'Sem morada' }}</p>

                <div class="flex flex-wrap gap-1 mb-2 pl-2">
                   <span *ngFor="let line of del.lines" class="px-1.5 py-0.5 bg-[var(--slate-700)] rounded text-[9px] font-bold text-white uppercase tracking-tighter">
                     {{ line.quantity }}x {{ line.articleCode }}
                   </span>
                </div>

                <!-- Sequence buttons -->
                <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button (click)="moveInRoute(driver.id, idx, -1)" class="p-1 hover:bg-white/10 rounded cursor-pointer" [disabled]="idx === 0">
                     <span class="material-symbols-outlined text-[16px]">keyboard_arrow_up</span>
                   </button>
                   <button (click)="moveInRoute(driver.id, idx, 1)" class="p-1 hover:bg-white/10 rounded cursor-pointer" [disabled]="idx === getDriverRoute(driver.id).length - 1">
                     <span class="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
                   </button>
                </div>
              </div>

              <div *ngIf="getDriverRoute(driver.id).length === 0" class="h-40 flex flex-col items-center justify-center text-center p-4">
                <span class="material-symbols-outlined text-4xl text-[var(--text-muted)] mb-2 opacity-5">route</span>
                <p class="text-xs text-[var(--text-muted)] italic">Nenhuma entrega atribuída.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
    styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-standard); border-radius: 2px; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class DeliveryPlanningComponent implements OnInit {
    pendingDeliveries: any[] = [];
    drivers: any[] = [];
    assignments: Map<string, any[]> = new Map(); // driverId -> Delivery[]

    constructor(
        private dataService: DataService,
        private toaster: ToasterService
    ) { }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.dataService.getPendingMobileDeliveries().subscribe({
            next: (res) => {
                this.pendingDeliveries = res;
            },
            error: (err) => this.toaster.showError('Erro', 'Erro ao carregar entregas: ' + err.message)
        });

        this.dataService.getApprovedDrivers().subscribe({
            next: (res) => {
                this.drivers = res;
                this.drivers.forEach(d => {
                    if (!this.assignments.has(d.id)) this.assignments.set(d.id, []);
                });
            },
            error: (err) => this.toaster.showError('Erro', 'Erro ao carregar motoristas: ' + err.message)
        });
    }

    getDriverRoute(driverId: string): any[] {
        return this.assignments.get(driverId) || [];
    }

    getShortName(name: string): string {
        const parts = name.split(' ');
        if (parts.length > 1) return parts[0] + ' ' + parts[parts.length - 1][0] + '.';
        return name;
    }

    moveToDriver(delivery: any, driver: any) {
        // Remove from pending
        this.pendingDeliveries = this.pendingDeliveries.filter(d => d.id !== delivery.id);

        // Add to driver assignments
        const route = this.getDriverRoute(driver.id);
        route.push(delivery);
        this.assignments.set(driver.id, [...route]);
    }

    returnToPending(delivery: any) {
        // Remove from any driver assignment
        this.assignments.forEach((route, driverId) => {
            const idx = route.findIndex(r => r.id === delivery.id);
            if (idx !== -1) {
                route.splice(idx, 1);
                this.assignments.set(driverId, [...route]);
            }
        });

        // Add back to pending
        this.pendingDeliveries.push(delivery);
        this.pendingDeliveries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    moveInRoute(driverId: string, index: number, direction: number) {
        const route = this.getDriverRoute(driverId);
        const newIdx = index + direction;
        if (newIdx < 0 || newIdx >= route.length) return;

        const temp = route[index];
        route[index] = route[newIdx];
        route[newIdx] = temp;
        this.assignments.set(driverId, [...route]);
    }

    optimizeRoute(driver: any) {
        const route = this.getDriverRoute(driver.id);
        const docIds = route.map(d => d.id);

        this.dataService.optimizeMobileRoute(docIds).subscribe({
            next: (optimized) => {
                this.assignments.set(driver.id, optimized);
                this.toaster.showSuccess('Sucesso', 'Sequência de entrega otimizada pela distância.');
            },
            error: (err) => this.toaster.showError('Erro', 'Não foi possível otimizar a rota: ' + err.message)
        });
    }

    saveRoute(driver: any) {
        const route = this.getDriverRoute(driver.id);
        const docIds = route.map(d => d.id);

        this.dataService.assignMobileRoute(driver.id, docIds).subscribe({
            next: () => {
                this.toaster.showSuccess('Sucesso', `Rota enviada com sucesso para ${driver.name}!`);
                this.assignments.set(driver.id, []);
                // Refresh pending just in case
                this.loadData();
            },
            error: (err) => this.toaster.showError('Erro', 'Erro ao atribuir rota: ' + err.message)
        });
    }
}
