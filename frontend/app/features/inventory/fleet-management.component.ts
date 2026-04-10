import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { ToasterService } from '../../services/toaster.service';

@Component({
  selector: 'app-fleet-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="p-6 bg-[#0a0f18] min-h-full font-['Inter'] text-white">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-2xl font-black tracking-tighter uppercase text-emerald-400">Gestão de Frota</h2>
          <p class="text-xs text-gray-400 uppercase tracking-widest font-bold">Setor de Gás - Registo de Ativos</p>
        </div>
        <button (click)="openModal()" class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]">
          <app-icon name="add" [size]="20"></app-icon>
          Novo Camião
        </button>
      </div>

      <!-- Vehicle Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let vehicle of vehicles" class="bg-[#111827] border border-[#1f2937] rounded-3xl p-6 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] transition-all group">
          <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <app-icon name="local_shipping" [size]="28"></app-icon>
            </div>
            <span [class]="getStatusClass(vehicle.status)" class="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              {{ vehicle.status }}
            </span>
          </div>
          
          <h3 class="text-2xl font-black tracking-tighter mb-1">{{ vehicle.plate }}</h3>
          <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">{{ vehicle.brand }} {{ vehicle.model }}</p>

          <div class="grid grid-cols-2 gap-4 py-4 border-t border-[#1f2937]">
            <div>
              <p class="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Capacidade</p>
              <p class="text-lg font-black text-white">{{ vehicle.capacity }} <span class="text-xs text-gray-500">{{ vehicle.capacityUnit }}</span></p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Tipo</p>
              <p class="text-lg font-black text-white">{{ vehicle.type }}</p>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-[#1f2937] flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
             <span>Armazém: {{ vehicle.warehouse?.code || 'N/A' }}</span>
             <button (click)="editVehicle(vehicle)" class="text-emerald-500 hover:underline">Editar</button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div *ngIf="showModal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-[#111827] border border-[#1f2937] rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl">
          <div class="p-8 border-b border-[#1f2937] flex justify-between items-center">
            <h3 class="text-xl font-black uppercase tracking-tighter text-emerald-400">{{ editingVehicle ? 'Editar Camião' : 'Novo Camião' }}</h3>
            <button (click)="closeModal()" class="text-gray-500 hover:text-white uppercase text-[10px] font-black tracking-widest">Fechar</button>
          </div>
          
          <div class="p-8 grid grid-cols-2 gap-6">
             <div class="col-span-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Matrícula</label>
                <input [(ngModel)]="currentVehicle.plate" class="w-full bg-[#0a0f18] border border-[#1f2937] rounded-xl p-4 font-bold outline-none focus:border-emerald-500" placeholder="ABA-000-XX">
             </div>
             <div class="col-span-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Marca</label>
                <input [(ngModel)]="currentVehicle.brand" class="w-full bg-[#0a0f18] border border-[#1f2937] rounded-xl p-4 font-bold outline-none focus:border-emerald-500" placeholder="Toyota, Mercedes...">
             </div>
             <div class="col-span-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Capacidade</label>
                <input type="number" [(ngModel)]="currentVehicle.capacity" class="w-full bg-[#0a0f18] border border-[#1f2937] rounded-xl p-4 font-bold outline-none focus:border-emerald-500">
             </div>
             <div class="col-span-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Unidade</label>
                <select [(ngModel)]="currentVehicle.capacityUnit" class="w-full bg-[#0a0f18] border border-[#1f2937] rounded-xl p-4 font-bold outline-none focus:border-emerald-500">
                   <option value="Garrafas">Garrafas</option>
                   <option value="Kg">Kg</option>
                   <option value="Ton">Ton</option>
                </select>
             </div>
             <div class="col-span-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Tipo de Camião</label>
                <input [(ngModel)]="currentVehicle.type" class="w-full bg-[#0a0f18] border border-[#1f2937] rounded-xl p-4 font-bold outline-none focus:border-emerald-500" placeholder="Distribuição, Cisterna...">
             </div>
          </div>

          <div class="p-8 bg-[#0a0f18] border-t border-[#1f2937] flex gap-4">
             <button (click)="saveVehicle()" class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all">
                Guardar Dados
             </button>
             <button (click)="closeModal()" class="flex-1 bg-[#1f2937] hover:bg-[#374151] text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all">
                Cancelar
             </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
  `]
})
export class FleetManagementComponent implements OnInit {
  vehicles: any[] = [];
  showModal = false;
  editingVehicle = false;
  currentVehicle: any = {};

  constructor(
    private dataService: DataService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadVehicles();
  }

  loadVehicles() {
    const cid = this.dataService.getCurrentCompany()?.id;
    this.dataService.getVehicles(cid).subscribe(data => {
      this.vehicles = data || [];
      this.cdr.detectChanges();
    });
  }

  openModal() {
    this.editingVehicle = false;
    this.currentVehicle = {
      capacityUnit: 'Garrafas',
      status: 'AVAILABLE'
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  editVehicle(vehicle: any) {
    this.editingVehicle = true;
    this.currentVehicle = { ...vehicle };
    this.showModal = true;
  }

  saveVehicle() {
    const company = this.dataService.getCurrentCompany();
    this.currentVehicle.companyId = company ? company.id : null;

    this.dataService.saveVehicle(this.currentVehicle).subscribe({
      next: () => {
        this.toaster.showSuccess('Sucesso', 'Camião registado com sucesso!');
        this.loadVehicles();
        this.closeModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toaster.showError('Erro', 'Erro ao guardar camião.');
        this.cdr.detectChanges();
      }
    });
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-500';
      case 'IN_USE': return 'bg-blue-500/10 text-blue-500';
      case 'MAINTENANCE': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  }
}
