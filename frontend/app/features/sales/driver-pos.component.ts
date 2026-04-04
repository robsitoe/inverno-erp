import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { InventoryService } from '../../shared/inventory.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { ToasterService } from '../../services/toaster.service';

interface POSItem {
  articleId: string;
  articleCode: string;
  articleName: string;
  unitPrice: number;
  quantity: number;
  ivaRate: number;
  ivaCode: string;
}

@Component({
  selector: 'app-driver-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="pos-container flex flex-col h-full bg-[#0a0f18] text-white font-['Inter']">
      
      <!-- Trip Assignment Overlay -->
      <div *ngIf="!activeTrip && !loadingVehicles" class="absolute inset-0 z-[100] bg-[#0a0f18] p-8 flex flex-col justify-center">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-emerald-500/10 rounded-[32px] flex items-center justify-center text-emerald-500 mx-auto mb-4">
            <app-icon name="local_shipping" [size]="48"></app-icon>
          </div>
          <h2 class="text-3xl font-black tracking-tighter uppercase text-white">Iniciar Viagem</h2>
          <p class="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Selecione o seu camião para hoje</p>
        </div>

        <div class="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
          <div 
            *ngFor="let v of availableVehicles" 
            (click)="selectVehicle(v)"
            [class.border-emerald-500]="selectedVehicleId === v.id"
            class="p-6 bg-[#111827] border-2 border-[#1f2937] rounded-3xl cursor-pointer hover:border-emerald-500/50 transition-all flex justify-between items-center"
          >
            <div>
               <p class="text-xl font-black">{{ v.plate }}</p>
               <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{{ v.brand }} - {{ v.capacity }} {{ v.capacityUnit }}</p>
            </div>
            <div *ngIf="selectedVehicleId === v.id" class="text-emerald-500">
               <app-icon name="check_circle" [size]="24"></app-icon>
            </div>
          </div>
          
          <div *ngIf="availableVehicles.length === 0" class="text-center py-10 opacity-30">
             <app-icon name="info" [size]="48"></app-icon>
             <p class="font-bold mt-2 uppercase tracking-widest text-xs">Nenhum camião disponível</p>
          </div>
        </div>

        <button 
          (click)="confirmStartTrip()" 
          [disabled]="!selectedVehicleId || isStartingTrip"
          class="mt-8 w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-800 disabled:text-gray-600 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-3"
        >
          <span *ngIf="isStartingTrip" class="animate-spin border-4 border-black border-t-transparent rounded-full w-5 h-5"></span>
          {{ isStartingTrip ? 'A Iniciar...' : 'Confirmar e Iniciar' }}
        </button>
      </div>

      <!-- Main POS UI (only visible when trip is active) -->
      <ng-container *ngIf="activeTrip">
        <!-- Header -->
        <header class="p-4 bg-[#111827] border-b border-[#1f2937] flex justify-between items-center shrink-0">
          <div>
            <h1 class="text-lg font-black tracking-tighter uppercase text-emerald-400">PDV Motorista</h1>
            <p class="text-[10px] text-emerald-500/50 uppercase tracking-widest font-bold">Viagem Ativa: {{ activeTrip.vehiclePlate }}</p>
          </div>
          <div class="flex gap-2">
             <button (click)="resetForm()" class="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
               <app-icon name="refresh" [size]="20"></app-icon>
             </button>
             <button (click)="confirmEndTrip()" class="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
               <app-icon name="exit_to_app" [size]="20"></app-icon>
             </button>
          </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <!-- Article Selection -->
          <section>
            <label class="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70 mb-2">Selecionar Artigo</label>
            <div class="relative">
              <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                (input)="searchArticles()"
                placeholder="Pesquisar garrafa..." 
                class="w-full bg-[#111827] border-2 border-[#1f2937] focus:border-emerald-500 rounded-xl p-4 text-lg font-bold outline-none transition-all placeholder:text-gray-600"
              />
              <div *ngIf="searchResults.length > 0" class="absolute z-50 left-0 right-0 mt-2 bg-[#1f2937] rounded-xl shadow-2xl overflow-hidden border border-[#374151]">
                <div 
                  *ngFor="let art of searchResults" 
                  (click)="addArticle(art)"
                  class="p-4 border-b border-[#374151] last:border-0 hover:bg-emerald-500/10 cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p class="font-bold text-sm">{{ art.name }}</p>
                    <p class="text-[10px] text-gray-400 uppercase font-medium">{{ art.code }}</p>
                  </div>
                  <p class="font-black text-emerald-400">{{ art.price | number:'1.2-2' }} MT</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Selected Items Cart -->
          <section class="flex-1 flex flex-col gap-3">
            <label class="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70">Carrinho</label>
            <div *ngIf="cart.length === 0" class="flex-1 flex flex-col items-center justify-center opacity-20 py-10">
              <app-icon name="shopping_cart" [size]="64"></app-icon>
              <p class="font-bold mt-2 uppercase tracking-widest text-xs">Sem itens</p>
            </div>
            <div *ngFor="let item of cart; let i = index" class="bg-[#111827] rounded-2xl p-4 border border-[#1f2937] flex flex-col gap-3">
              <div class="flex justify-between items-start">
                 <div>
                    <h3 class="font-black text-sm uppercase leading-tight">{{ item.articleName }}</h3>
                    <p class="text-[10px] text-gray-500 font-bold tracking-wider">{{ item.articleCode }}</p>
                 </div>
                 <button (click)="removeItem(i)" class="text-red-500/50 hover:text-red-500">
                   <app-icon name="delete" [size]="20"></app-icon>
                 </button>
              </div>
              <div class="flex justify-between items-center">
                 <div class="flex items-center gap-4 bg-[#0a0f18] rounded-xl p-1 border border-[#1f2937]">
                   <button (click)="updateQty(i, -1)" class="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1f2937]">
                      <app-icon name="remove" [size]="24"></app-icon>
                   </button>
                   <span class="text-xl font-black w-8 text-center">{{ item.quantity }}</span>
                   <button (click)="updateQty(i, 1)" class="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1f2937]">
                      <app-icon name="add" [size]="24"></app-icon>
                   </button>
                 </div>
                 <div class="text-right">
                   <p class="text-[10px] text-gray-500 uppercase font-black tracking-widest">Subtotal</p>
                   <p class="text-lg font-black text-emerald-400">{{ (item.unitPrice * item.quantity) | number:'1.2-2' }} MT</p>
                 </div>
              </div>
            </div>
          </section>
        </main>

        <!-- Footer -->
        <footer class="p-6 bg-[#111827] border-t border-[#1f2937] flex flex-col gap-4 shrink-0">
          <div class="flex justify-between items-end">
            <div>
              <p class="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Total a Pagar</p>
              <p class="text-3xl font-black text-white leading-none">{{ calculateTotal() | number:'1.2-2' }} <span class="text-sm font-bold text-emerald-500 tracking-normal ml-1">MT</span></p>
            </div>
          </div>
          <button (click)="handleCheckout()" [disabled]="cart.length === 0 || isSaving" class="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 text-black font-black text-lg uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-3">
            <span *ngIf="isSaving" class="animate-spin border-4 border-black border-t-transparent rounded-full w-5 h-5"></span>
            <app-icon *ngIf="!isSaving" name="check_circle" [size]="24"></app-icon>
            {{ isSaving ? 'A Processar...' : 'Finalizar Venda' }}
          </button>
        </footer>
      </ng-container>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; position: relative; }
    .pos-container { height: 100%; max-width: 500px; margin: 0 auto; box-shadow: 0 0 100px rgba(0,0,0,0.5); }
  `]
})
export class DriverPosComponent implements OnInit, OnDestroy {
  searchQuery = '';
  searchResults: any[] = [];
  cart: POSItem[] = [];
  isSaving = false;

  // Fleet & Trip Logic
  activeTrip: any = null;
  availableVehicles: any[] = [];
  selectedVehicleId: string | null = null;
  loadingVehicles = true;
  isStartingTrip = false;

  // Geolocation & Tracking
  latitude: number | null = null;
  longitude: number | null = null;
  private trackingInterval: any;

  constructor(
    private dataService: DataService,
    private inventoryService: InventoryService,
    private toaster: ToasterService
  ) { }

  ngOnInit() {
    this.checkActiveTrip();
    this.loadAvailableVehicles();
    this.requestLocation();
    this.trackingInterval = setInterval(() => this.syncLocation(), 30000); // 30s location sync
  }

  ngOnDestroy() {
    if (this.trackingInterval) clearInterval(this.trackingInterval);
  }

  checkActiveTrip() {
    const storedTrip = localStorage.getItem('erp_active_trip');
    if (storedTrip) {
      this.activeTrip = JSON.parse(storedTrip);
    }
  }

  loadAvailableVehicles() {
    this.loadingVehicles = true;
    const cid = this.dataService.getCurrentCompany()?.id;
    this.dataService.getVehicles(cid).subscribe({
      next: (vs) => {
        this.availableVehicles = vs.filter(v => v.status === 'AVAILABLE');
        this.loadingVehicles = false;
      },
      error: () => this.loadingVehicles = false
    });
  }

  selectVehicle(v: any) {
    this.selectedVehicleId = v.id;
  }

  confirmStartTrip() {
    if (!this.selectedVehicleId) return;
    this.isStartingTrip = true;

    const vehicle = this.availableVehicles.find(v => v.id === this.selectedVehicleId);
    const currentUser = JSON.parse(localStorage.getItem('erp_current_user') || '{}');
    const company = this.dataService.getCurrentCompany();

    const tripData = {
      vehicleId: this.selectedVehicleId,
      driverId: currentUser.employeeId || currentUser.id,
      companyId: company ? company.id : null
    };

    this.dataService.startTrip(tripData).subscribe({
      next: (trip) => {
        this.activeTrip = {
          id: trip.id,
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plate,
          warehouseId: vehicle.warehouseId
        };
        localStorage.setItem('erp_active_trip', JSON.stringify(this.activeTrip));
        this.isStartingTrip = false;
        this.toaster.showSuccess('Viagem Iniciada', `Camião ${vehicle.plate} atribuído.`);
      },
      error: () => {
        this.isStartingTrip = false;
        this.toaster.showError('Erro', 'Não foi possível iniciar a viagem.');
      }
    });
  }

  confirmEndTrip() {
    if (!confirm('Deseja terminar a sua viagem de hoje?')) return;

    const company = this.dataService.getCurrentCompany();
    this.dataService.updateTripLocation(this.activeTrip.id, this.latitude || 0, this.longitude || 0, company?.id).subscribe();

    localStorage.removeItem('erp_active_trip');
    this.activeTrip = null;
    this.loadAvailableVehicles();
  }

  syncLocation() {
    if (this.activeTrip && this.latitude && this.longitude) {
      const company = this.dataService.getCurrentCompany();
      this.dataService.updateTripLocation(this.activeTrip.id, this.latitude, this.longitude, company?.id).subscribe();
    }
  }

  requestLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.latitude = pos.coords.latitude;
          this.longitude = pos.coords.longitude;
          this.syncLocation();
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  }

  searchArticles() {
    if (this.searchQuery.length < 2) {
      this.searchResults = [];
      return;
    }
    const query = this.searchQuery.toLowerCase();
    const all = this.inventoryService.getArticles() || [];
    this.searchResults = all.filter((a: any) =>
      a.code.toLowerCase().includes(query) || a.name?.toLowerCase().includes(query)
    ).slice(0, 5).map((a: any) => ({
      id: a.id, code: a.code, name: a.name || a.description,
      price: a.salePrice || a.pvp1 || 0, ivaRate: a.ivaRate || 16, ivaCode: a.ivaCode || 'IVA16'
    }));
  }

  addArticle(art: any) {
    const existing = this.cart.find(c => c.articleId === art.id);
    if (existing) existing.quantity++;
    else {
      this.cart.push({
        articleId: art.id, articleCode: art.code, articleName: art.name,
        unitPrice: art.price, quantity: 1, ivaRate: art.ivaRate, ivaCode: art.ivaCode
      });
    }
    this.searchQuery = '';
    this.searchResults = [];
  }

  updateQty(i: number, d: number) {
    this.cart[i].quantity += d;
    if (this.cart[i].quantity < 1) this.removeItem(i);
  }

  removeItem(i: number) { this.cart.splice(i, 1); }

  calculateTotal(): number {
    return this.cart.reduce((s, i) => s + (i.unitPrice * i.quantity) * (1 + i.ivaRate / 100), 0);
  }

  resetForm() {
    this.cart = [];
    this.searchQuery = '';
    this.searchResults = [];
  }

  async handleCheckout() {
    if (this.cart.length === 0 || !this.activeTrip) return;
    this.isSaving = true;

    try {
      const company = this.dataService.getCurrentCompany();
      const companyId = company ? company.id : null;
      const currentUser = JSON.parse(localStorage.getItem('erp_current_user') || '{}');

      const saleDoc: any = {
        companyId,
        documentType: 'VD',
        series: 'M',
        date: new Date().toISOString().split('T')[0],
        customerName: 'Consumidor Final',
        isMobileSale: true,
        driverId: currentUser.employeeId || currentUser.id,
        latitude: this.latitude,
        longitude: this.longitude,
        status: 'POSTED',
        warehouseId: this.activeTrip.warehouseId, // Crucial: stock comes from truck
        lines: this.cart.map(item => ({
          articleId: item.articleId,
          articleCode: item.articleCode,
          articleName: item.articleName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ivaRate: item.ivaRate,
          ivaCode: item.ivaCode,
          discount: 0
        }))
      };

      this.dataService.saveSalesDocument(saleDoc).subscribe({
        next: (savedDoc) => {
          this.isSaving = false;
          this.toaster.showSuccess('Sucesso', 'Venda efetuada e stock atualizado!');
          this.shareToWhatsApp(savedDoc);
          this.resetForm();
        },
        error: (err) => {
          this.isSaving = false;
          this.toaster.showError('Erro', 'Erro ao guardar venda.');
        }
      });
    } catch (e) {
      this.isSaving = false;
      this.toaster.showError('Erro', 'Erro inesperado.');
    }
  }

  shareToWhatsApp(doc: any) {
    const message = `*INVERNO ERP - Recibo Digital*\nDoc: ${doc.documentNumber}\nTotal: ${this.calculateTotal().toLocaleString()} MT`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }
}
