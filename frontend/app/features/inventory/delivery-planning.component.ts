import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-delivery-planning',
    standalone: true,
    imports: [CommonModule, AppIconComponent, FormsModule],
    template: `
    <div class="flex flex-col h-full bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <app-icon name="local_shipping" [size]="24" color="#2563eb"></app-icon>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-800">Planeamento de Entregas</h1>
            <p class="text-sm text-gray-500">Gerir rotas e atribuição de motoristas</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            (click)="optimizeRoute()"
            [disabled]="selectedDocuments.length < 2 || optimizing"
            class="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <app-icon *ngIf="!optimizing" name="auto_fix_high" [size]="20" color="#ffffff"></app-icon>
            <span *ngIf="optimizing" class="animate-spin material-symbols-outlined text-[20px]">sync</span>
            {{ optimizing ? 'Otimizando...' : 'Otimizar Rota' }}
          </button>
          
          <button 
            (click)="openAssignModal()"
            [disabled]="selectedDocuments.length === 0"
            class="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
          >
            <app-icon name="person_add" [size]="20" color="#374151"></app-icon>
            Atribuir Motorista
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-hidden flex p-6 gap-6">
        <!-- List of Pending Deliveries -->
        <div class="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 class="font-bold text-gray-700">Entregas Pendentes (Aprovadas)</h2>
            <span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full font-semibold">
              {{ pendingDocuments.length }} Total
            </span>
          </div>
          
          <div class="flex-1 overflow-y-auto">
            <table class="w-full text-left">
              <thead class="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10 border-b border-gray-100">
                <tr>
                  <th class="px-4 py-3 w-10">
                    <input type="checkbox" (change)="toggleAll($event)" [checked]="allSelected" class="rounded border-gray-300">
                  </th>
                  <th class="px-4 py-3">Documento</th>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3">Localização</th>
                  <th class="px-4 py-3">Total</th>
                  <th class="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 text-sm">
                <tr *ngFor="let doc of pendingDocuments" 
                    [class.bg-blue-50]="isSelected(doc.id)"
                    class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-4">
                    <input type="checkbox" [checked]="isSelected(doc.id)" (change)="toggleSelection(doc.id)" class="rounded border-gray-300 text-blue-600">
                  </td>
                  <td class="px-4 py-4">
                    <div class="font-medium text-gray-900">{{ doc.documentType }} {{ doc.seriesNumber }}</div>
                    <div class="text-xs text-gray-500">{{ doc.date | date:'dd/MM/yyyy' }}</div>
                  </td>
                  <td class="px-4 py-4">
                    <div class="font-medium text-gray-800">{{ doc.entityName }}</div>
                    <div class="text-xs text-gray-500">{{ doc.entityCode }}</div>
                  </td>
                  <td class="px-4 py-4">
                    <div class="flex items-center gap-1 text-gray-600">
                      <app-icon name="location_on" [size]="16" color="#9ca3af"></app-icon>
                      <span class="truncate max-w-[150px]">{{ doc.address || 'Sem morada' }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-4 font-semibold text-gray-900">
                    {{ doc.totalAmount | number:'1.2-2' }} MT
                  </td>
                  <td class="px-4 py-4">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
                      {{ doc.status }}
                    </span>
                  </td>
                </tr>
                <tr *ngIf="pendingDocuments.length === 0">
                  <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center gap-2">
                      <app-icon name="inbox" [size]="48" color="#d1d5db"></app-icon>
                      <p>Nenhuma entrega aprovada para planeamento.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Selected Route / Driver Sidebar -->
        <div class="w-1/3 flex flex-col gap-6">
          <!-- Route Panel -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-1/2">
            <div class="p-4 border-b border-gray-200 bg-gray-50">
              <h2 class="font-bold text-gray-700">Sequência da Rota</h2>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <div *ngIf="selectedDocuments.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center p-6">
                <app-icon name="route" [size]="40" color="#e5e7eb" class="mb-2"></app-icon>
                <p>Selecione documentos na lista ao lado para construir a rota.</p>
              </div>
              
              <div class="space-y-3">
                <div *ngFor="let docId of selectedDocuments; let i = index" 
                     class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 relative group">
                  <div class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {{ i + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-gray-800 text-sm truncate">{{ getDoc(docId)?.entityName }}</div>
                    <div class="text-xs text-gray-500">{{ getDoc(docId)?.documentType }} {{ getDoc(docId)?.seriesNumber }}</div>
                    <div class="text-[10px] text-gray-400 flex items-center gap-0.5 mt-1">
                      <app-icon name="place" [size]="10" color="#d1d5db"></app-icon>
                      {{ getDoc(docId)?.address }}
                    </div>
                  </div>
                  <button (click)="toggleSelection(docId)" class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
                    <app-icon name="close" [size]="16" color="currentColor"></app-icon>
                  </button>
                  
                  <!-- Connector line -->
                  <div *ngIf="i < selectedDocuments.length - 1" class="absolute left-6 top-7 w-0.5 h-6 bg-blue-200 -z-10"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Driver Assignment Panel -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-1/2">
             <div class="p-4 border-b border-gray-200 bg-gray-50">
              <h2 class="font-bold text-gray-700">Motoristas Disponíveis</h2>
            </div>
            <div class="flex-1 overflow-y-auto p-2">
              <div *ngFor="let driver of drivers" 
                   (click)="selectedDriverId = driver.id"
                   [class.ring-2]="selectedDriverId === driver.id"
                   [class.ring-blue-500]="selectedDriverId === driver.id"
                   class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-all border border-transparent">
                <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                    <img *ngIf="driver.photo" [src]="driver.photo" class="w-full h-full object-cover">
                    <span *ngIf="!driver.photo">{{ driver.name.substring(0,2).toUpperCase() }}</span>
                </div>
                <div class="flex-1">
                  <div class="font-bold text-gray-800 text-sm">{{ driver.name }}</div>
                  <div class="text-xs text-gray-500">{{ driver.licenseNumber || 'Sem carta' }}</div>
                </div>
                <div *ngIf="driver.status === 'ON_TRIP'" class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                  EM VIAGEM
                </div>
                <div *ngIf="driver.status === 'AVAILABLE' || !driver.status" class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                  LIVRE
                </div>
              </div>
            </div>
            <div class="p-4 bg-gray-50 border-t border-gray-200">
               <button 
                  (click)="assignSelectedDriver()"
                  [disabled]="!selectedDriverId || selectedDocuments.length === 0"
                  class="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  Confirmar Atribuição
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; height: 100%; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class DeliveryPlanningComponent implements OnInit {
    pendingDocuments: any[] = [];
    selectedDocuments: string[] = []; // List of IDs in sequence
    drivers: any[] = [];
    selectedDriverId: string | null = null;
    optimizing = false;

    constructor(private dataService: DataService) { }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.dataService.getSalesDocuments().subscribe(docs => {
            // Filter only confirmed/approved docs that are not yet assigned
            this.pendingDocuments = docs.filter(d =>
                (d.status === 'CONFIRMED' || d.status === 'APPROVED') && !d.tripId
            );
        });

        this.dataService.getDrivers(this.dataService.getCompanyId() || '001').subscribe(drivers => {
            this.drivers = drivers;
        });
    }

    toggleSelection(docId: string) {
        const index = this.selectedDocuments.indexOf(docId);
        if (index > -1) {
            this.selectedDocuments.splice(index, 1);
        } else {
            this.selectedDocuments.push(docId);
        }
    }

    isSelected(docId: string): boolean {
        return this.selectedDocuments.includes(docId);
    }

    getDoc(docId: string) {
        return this.pendingDocuments.find(d => d.id === docId);
    }

    get allSelected(): boolean {
        return this.pendingDocuments.length > 0 && this.selectedDocuments.length === this.pendingDocuments.length;
    }

    toggleAll(event: any) {
        if (event.target.checked) {
            this.selectedDocuments = this.pendingDocuments.map(d => d.id);
        } else {
            this.selectedDocuments = [];
        }
    }

    optimizeRoute() {
        this.optimizing = true;
        const companyId = this.dataService.getCompanyId() || '001';

        this.dataService.getOptimizedSequence(this.selectedDocuments, companyId).subscribe({
            next: (optimizedIds) => {
                this.selectedDocuments = optimizedIds;
                this.optimizing = false;
                alert('Rota otimizada com sucesso via algoritmo Nearest Neighbor! 🪄');
            },
            error: (err) => {
                console.error('Optimization failed', err);
                this.optimizing = false;
                alert('Falha na otimização da rota. Verifique as coordenadas dos clientes.');
            }
        });
    }

    assignSelectedDriver() {
        if (!this.selectedDriverId) return;

        const companyId = this.dataService.getCompanyId() || '001';
        this.dataService.assignRoute(this.selectedDriverId, this.selectedDocuments, companyId).subscribe({
            next: () => {
                alert('Rota atribuída com sucesso! Os documentos foram associados à nova viagem.');
                this.selectedDocuments = [];
                this.selectedDriverId = null;
                this.loadData();
            },
            error: (err) => {
                console.error('Assignment failed', err);
                alert('Erro ao atribuir motorista.');
            }
        });
    }

    openAssignModal() {
        // Already have driver selection in sidebar for efficiency
    }
}
