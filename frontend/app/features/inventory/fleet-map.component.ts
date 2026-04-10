import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';

declare var L: any; // Leaflet

@Component({
    selector: 'app-fleet-map',
    standalone: true,
    imports: [CommonModule, AppIconComponent],
    template: `
    <div class="h-full flex flex-col bg-[#0a0f18] font-['Inter'] text-white">
      <!-- Header Overlay -->
      <div class="p-6 shrink-0 flex justify-between items-center bg-[#111827] border-b border-[#1f2937] z-10">
        <div>
          <h2 class="text-2xl font-black tracking-tighter uppercase text-emerald-400">Mapa de Rastreamento</h2>
          <p class="text-xs text-gray-400 uppercase tracking-widest font-bold">Localização da Frota em Tempo Real</p>
        </div>
        <div class="flex gap-4">
           <div class="flex items-center gap-2 px-4 py-2 bg-[#0a0f18] rounded-xl border border-[#1f2937]">
              <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Live</span>
           </div>
           <button (click)="refreshMap()" class="p-3 bg-[#1f2937] hover:bg-[#374151] rounded-xl transition-all">
             <app-icon name="refresh" [size]="20"></app-icon>
           </button>
        </div>
      </div>

      <!-- Map Container -->
      <div class="flex-1 relative">
         <div id="fleet-map" class="absolute inset-0 z-0"></div>
         
         <!-- Stats Overlay (Bottom Right) -->
         <div class="absolute bottom-6 right-6 z-10 bg-[#111827]/90 backdrop-blur-md border border-[#1f2937] p-6 rounded-[32px] shadow-2xl min-w-[200px]">
            <p class="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4">Estado da Frota</p>
            <div class="space-y-4">
               <div class="flex justify-between items-center">
                  <span class="text-xs font-bold text-gray-400">Em Viagem</span>
                  <span class="text-xl font-black text-emerald-400">{{ activeTrips.length }}</span>
               </div>
               <div class="flex justify-between items-center">
                  <span class="text-xs font-bold text-gray-400">Total Camiões</span>
                  <span class="text-xl font-black text-white">{{ vehicles.length }}</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; height: 100%; }
    #fleet-map { background: #0a0f18; }
    /* Leaflet Dark mode overrides */
    ::ng-deep .leaflet-container { background: #0a0f18 !important; }
    ::ng-deep .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
    ::ng-deep .leaflet-popup-content-wrapper, ::ng-deep .leaflet-popup-tip {
      background: #111827 !important;
      color: white !important;
      border: 1px solid #1f2937;
      border-radius: 12px;
    }
    ::ng-deep .truck-marker {
       background: #10b981;
       border: 3px solid #064e3b;
       border-radius: 50%;
       width: 40px;
       height: 40px;
       display: flex;
       align-items: center;
       justify-content: center;
       color: black;
       box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
    }
  `]
})
export class FleetMapComponent implements OnInit, OnDestroy, AfterViewInit {
    private map: any;
    private markers: { [key: string]: any } = {};
    vehicles: any[] = [];
    activeTrips: any[] = [];
    private pollInterval: any;

    constructor(private dataService: DataService) { }

    ngOnInit() {
        this.loadInitialData();
        this.pollInterval = setInterval(() => this.refreshMap(), 15000);
    }

    ngOnDestroy() {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }

    ngAfterViewInit() {
        this.initMap();
    }

    private initMap() {
        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            // Mock or wait
            setTimeout(() => this.initMap(), 1000);
            return;
        }

        this.map = L.map('fleet-map').setView([-25.9692, 32.5732], 13); // Default Maputo

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);
    }

    private loadInitialData() {
        const cid = this.dataService.getCurrentCompany()?.id;
        this.dataService.getVehicles(cid).subscribe(vs => this.vehicles = vs);
        this.refreshMap();
    }

    refreshMap() {
        const cid = this.dataService.getCurrentCompany()?.id;
        this.dataService.getActiveTrips(cid).subscribe(trips => {
            this.activeTrips = trips;
            this.updateMarkers();
        });
    }

    private updateMarkers() {
        if (!this.map) return;

        this.activeTrips.forEach(trip => {
            if (trip.lastLat && trip.lastLng) {
                const vehicle = this.vehicles.find(v => v.id === trip.vehicleId);
                const name = vehicle ? vehicle.plate : 'Desconhecido';

                if (this.markers[trip.id]) {
                    this.markers[trip.id].setLatLng([trip.lastLat, trip.lastLng]);
                } else {
                    const icon = L.divIcon({
                        className: 'truck-marker',
                        html: `<i class="material-icons" style="font-size: 20px">local_shipping</i>`,
                        iconSize: [40, 40]
                    });

                    this.markers[trip.id] = L.marker([trip.lastLat, trip.lastLng], { icon })
                        .addTo(this.map)
                        .bindPopup(`
              <div style="font-family: 'Inter', sans-serif;">
                <p style="margin: 0; font-weight: 900; color: #10b981; font-size: 14px;">${name}</p>
                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 10px; font-weight: 700;">MOTORISTA: ${trip.driverName || 'N/A'}</p>
                <div style="margin-top: 10px; border-top: 1px solid #1f2937; padding-top: 8px;">
                   <a href="https://wa.me/" target="_blank" style="color: #10b981; text-decoration: none; font-size: 10px; font-weight: 900; text-transform: uppercase;">Abrir Chat</a>
                </div>
              </div>
            `);
                }
            }
        });

        // Remove finished trips? Not implemented yet.
    }
}
