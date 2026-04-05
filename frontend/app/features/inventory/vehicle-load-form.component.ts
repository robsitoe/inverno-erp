import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { InventoryService } from '../../shared/inventory.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { ToasterService } from '../../services/toaster.service';

@Component({
    selector: 'app-vehicle-load-form',
    standalone: true,
    imports: [CommonModule, FormsModule, AppIconComponent],
    template: `
    <div class="p-6 bg-[#0a0f18] min-h-full font-['Inter'] text-white">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-2xl font-black tracking-tighter uppercase text-emerald-400">Carga & Descarga</h2>
          <p class="text-xs text-gray-400 uppercase tracking-widest font-bold">Gestão de Inventário Móvel</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Step 1: Selection -->
        <div class="lg:col-span-1 space-y-6">
           <div class="bg-[#111827] border border-[#1f2937] rounded-3xl p-6">
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 block">1. Selecionar Operação</label>
              <div class="grid grid-cols-2 gap-4">
                 <button 
                  (click)="setMode('LOAD')" 
                  [class.bg-emerald-500]="mode === 'LOAD'"
                  [class.text-black]="mode === 'LOAD'"
                  class="py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-emerald-500/20 transition-all"
                 >Carga (Saída)</button>
                 <button 
                  (click)="setMode('UNLOAD')" 
                  [class.bg-red-500]="mode === 'UNLOAD'"
                  [class.text-white]="mode === 'UNLOAD'"
                  class="py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-red-500/20 transition-all"
                 >Descarga (Retorno)</button>
              </div>
           </div>

           <div class="bg-[#111827] border border-[#1f2937] rounded-3xl p-6">
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 block">2. Selecionar Viatura</label>
              <select [(ngModel)]="selectedVehicleId" class="w-full bg-[#0a0f18] border border-[#1f2937] rounded-xl p-4 font-bold outline-none focus:border-emerald-500">
                 <option [ngValue]="null" disabled>Escolha um camião...</option>
                 <option *ngFor="let v of vehicles" [value]="v.id">{{ v.plate }} ({{ v.brand }})</option>
              </select>
           </div>
        </div>

        <!-- Step 2: Items -->
        <div class="lg:col-span-2 bg-[#111827] border border-[#1f2937] rounded-[40px] p-8">
           <div class="flex justify-between items-center mb-6">
              <h3 class="text-xl font-black uppercase tracking-tighter">{{ mode === 'LOAD' ? 'Guia de Carga' : 'Guia de Descarga' }}</h3>
              <button (click)="addItem()" class="text-emerald-500 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
                <app-icon name="add" [size]="16"></app-icon> Adicionar Linha
              </button>
           </div>

           <div class="space-y-4 mb-8">
              <div *ngFor="let line of lines; let i = index" class="grid grid-cols-12 gap-4 items-center bg-[#0a0f18] p-4 rounded-2xl border border-[#1f2937]">
                 <div class="col-span-6">
                    <select [(ngModel)]="line.articleCode" (change)="onArticleChange(i)" class="w-full bg-transparent border-none font-bold outline-none text-sm">
                       <option value="">Selecionar Artigo...</option>
                       <option *ngFor="let art of articles" [value]="art.code">{{ art.name }} ({{ art.code }})</option>
                    </select>
                 </div>
                 <div class="col-span-3">
                    <input type="number" [(ngModel)]="line.quantity" class="w-full bg-transparent border-none font-black text-center outline-none text-emerald-400" placeholder="0">
                 </div>
                 <div class="col-span-2">
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Unid</p>
                    <p class="text-xs font-black">{{ line.unit || 'UN' }}</p>
                 </div>
                 <div class="col-span-1 text-right">
                    <button (click)="removeLine(i)" class="text-red-500/30 hover:text-red-500">
                       <app-icon name="close" [size]="20"></app-icon>
                    </button>
                 </div>
              </div>

              <div *ngIf="lines.length === 0" class="text-center py-10 opacity-20 border-2 border-dashed border-[#1f2937] rounded-3xl">
                 <p class="font-black uppercase tracking-widest text-xs">Nenhum item adicionado</p>
              </div>
           </div>

           <button 
            (click)="processOperation()" 
            [disabled]="!selectedVehicleId || lines.length === 0 || isProcessing"
            [class]="mode === 'LOAD' ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-red-500 hover:bg-red-400 text-white'"
            class="w-full py-6 rounded-2xl font-black uppercase text-lg tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-3"
           >
              <span *ngIf="isProcessing" class="animate-spin border-4 border-current border-t-transparent rounded-full w-6 h-6"></span>
              {{ isProcessing ? 'A Processar...' : (mode === 'LOAD' ? 'Confirmar Distribuição' : 'Confirmar Retorno') }}
           </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
  `]
})
export class VehicleLoadFormComponent implements OnInit {
    mode: 'LOAD' | 'UNLOAD' = 'LOAD';
    vehicles: any[] = [];
    articles: any[] = [];
    selectedVehicleId: string | null = null;
    lines: any[] = [];
    isProcessing = false;

    constructor(
        private dataService: DataService,
        private inventoryService: InventoryService,
        private toaster: ToasterService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        const cid = this.dataService.getCurrentCompany()?.id;
        this.dataService.getVehicles(cid).subscribe(vs => {
            this.vehicles = vs;
            this.cdr.detectChanges();
        });
        this.articles = this.inventoryService.getArticles();
    }

    setMode(m: 'LOAD' | 'UNLOAD') {
        this.mode = m;
    }

    addItem() {
        this.lines.push({ articleCode: '', quantity: 0, unit: 'UN' });
    }

    removeLine(i: number) {
        this.lines.splice(i, 1);
    }

    onArticleChange(i: number) {
        const art = this.articles.find(a => a.code === this.lines[i].articleCode);
        if (art) {
            this.lines[i].articleId = art.id;
            this.lines[i].articleName = art.name;
            this.lines[i].unit = art.unit;
        }
    }

    processOperation() {
        this.isProcessing = true;
        const company = this.dataService.getCurrentCompany();
        const vehicle = this.vehicles.find(v => v.id === this.selectedVehicleId);

        // Create Stock Document
        const isLoad = this.mode === 'LOAD';
        const doc: any = {
            companyId: company?.id,
            type: isLoad ? 'TA' : 'TAV', // Transferência de Artigos
            date: new Date().toISOString().split('T')[0],
            warehouse: isLoad ? 'ARM01' : vehicle.warehouseId, // Source
            notes: `${isLoad ? 'Carga' : 'Descarga'} Camião ${vehicle.plate}`,
            lines: this.lines.map(l => ({
                articleId: l.articleId,
                articleCode: l.articleCode,
                articleName: l.articleName,
                quantity: l.quantity,
                warehouse: isLoad ? vehicle.warehouseId : 'ARM01' // Destination
            }))
        };

        // For LOAD: ARM01 -> Truck WH
        // For UNLOAD: Truck WH -> ARM01
        // We might need to adjust the backend for TA/TAV to handle warehouse-to-warehouse correctly.

        this.inventoryService.saveStockDocument(doc).subscribe({
            next: () => {
                this.isProcessing = false;
                this.toaster.showSuccess('Sucesso', 'Operação de stock registada com sucesso!');
                this.lines = [];
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.isProcessing = false;
                this.toaster.showError('Erro', 'Falha ao processar transferência de stock.');
                this.cdr.detectChanges();
            }
        });
    }
}
