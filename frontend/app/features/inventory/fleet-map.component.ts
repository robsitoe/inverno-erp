import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';

declare var L: any; // Leaflet (loaded in index.html)

interface FleetUnit {
    truckPlate: string;
    driverId?: string;
    driverName?: string;
    lat: number;
    lng: number;
    lastUpdate?: string;
    ageMinutes: number | null;
    online: boolean;
    onTrip: boolean;
    tripId?: string;
    cylindersOnBoard: number;
    inventory: Record<string, any>;
}

@Component({
    selector: 'app-fleet-map',
    standalone: true,
    imports: [CommonModule, FormsModule, AppIconComponent],
    template: `
    <div class="h-full flex flex-col bg-[#0a0f18] font-['Inter'] text-white">
      <!-- Header -->
      <div class="p-5 shrink-0 flex justify-between items-center bg-[#111827] border-b border-[#1f2937] z-10">
        <div>
          <h2 class="text-xl font-black tracking-tighter uppercase text-emerald-400">Mapa de Rastreamento</h2>
          <p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Localização da Frota em Tempo Real</p>
        </div>
        <div class="flex gap-3 items-center">
           <!-- Mode toggle -->
           <div class="flex bg-[#0a0f18] rounded-xl border border-[#1f2937] p-1">
             <button (click)="setMode('LIVE')"
                     [class]="mode === 'LIVE' ? 'bg-emerald-600 text-white' : 'text-gray-400'"
                     class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Live</button>
             <button (click)="setMode('HISTORY')"
                     [class]="mode === 'HISTORY' ? 'bg-blue-600 text-white' : 'text-gray-400'"
                     class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Histórico</button>
           </div>
           <button (click)="fitAll()" class="p-2.5 bg-[#1f2937] hover:bg-[#374151] rounded-xl transition-all" title="Centrar">
             <app-icon name="zoom_out_map" [size]="18"></app-icon>
           </button>
           <button (click)="mode === 'LIVE' ? refreshMap() : loadHistory()" class="p-2.5 bg-[#1f2937] hover:bg-[#374151] rounded-xl transition-all" title="Actualizar">
             <app-icon name="refresh" [size]="18"></app-icon>
           </button>
        </div>
      </div>

      <!-- History control bar -->
      <div *ngIf="mode === 'HISTORY'" class="shrink-0 bg-[#111827] border-b border-[#1f2937] px-5 py-3 flex flex-wrap items-center gap-3">
        <select [(ngModel)]="histPlate" (change)="onHistTruckChange()"
                class="bg-[#0a0f18] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">— Escolher viatura —</option>
          <option *ngFor="let p of knownPlates" [value]="p">{{ p }}</option>
        </select>
        <input type="date" [(ngModel)]="histDate" (change)="loadHistory()"
               class="bg-[#0a0f18] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]">
        <button (click)="loadHistory()" [disabled]="!histPlate"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg text-xs font-bold transition-all">
          Ver Rota
        </button>

        <div *ngIf="histResult" class="flex gap-5 ml-auto text-xs">
          <div><span class="text-gray-500">Distância:</span> <span class="font-black text-emerald-400">{{ histResult.distanceKm }} km</span></div>
          <div><span class="text-gray-500">Duração:</span> <span class="font-black text-white">{{ formatDuration(histResult.durationMinutes) }}</span></div>
          <div><span class="text-gray-500">Pontos:</span> <span class="font-black text-white">{{ histResult.pointCount }}</span></div>
          <div *ngIf="histResult.firstSeen"><span class="text-gray-500">Início:</span> <span class="font-bold text-gray-300">{{ histResult.firstSeen | date:'HH:mm' }}</span></div>
          <div *ngIf="histResult.lastSeen"><span class="text-gray-500">Fim:</span> <span class="font-bold text-gray-300">{{ histResult.lastSeen | date:'HH:mm' }}</span></div>
        </div>
      </div>

      <div class="flex-1 relative">
        <!-- Map -->
        <div id="fleet-map" class="absolute inset-0 z-0"></div>

        <!-- History empty state -->
        <div *ngIf="mode === 'HISTORY' && histResult && histResult.pointCount === 0" class="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#111827]/95 border border-[#1f2937] rounded-xl px-5 py-3 text-sm text-gray-400">
          Sem dados de rota para esta viatura nesta data.
        </div>

        <!-- Leaflet missing warning -->
        <div *ngIf="mapError" class="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0f18]/90">
          <div class="text-center text-gray-400">
            <app-icon name="map" [size]="48" class="opacity-30"></app-icon>
            <p class="mt-3 text-sm">Não foi possível carregar o mapa.</p>
            <p class="text-xs text-gray-500">Verifique a ligação à internet (Leaflet/OpenStreetMap).</p>
          </div>
        </div>

        <!-- Left: unit list -->
        <div *ngIf="mode === 'LIVE'" class="absolute top-4 left-4 z-10 bg-[#111827]/95 backdrop-blur-md border border-[#1f2937] rounded-2xl shadow-2xl w-64 max-h-[calc(100%-2rem)] flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-[#1f2937] flex items-center justify-between">
            <span class="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Viaturas</span>
            <span class="text-[10px] font-bold text-emerald-400">{{ onlineCount }}/{{ units.length }} online</span>
          </div>
          <div class="overflow-y-auto">
            <button *ngFor="let u of units" (click)="focusUnit(u)"
                    class="w-full text-left px-4 py-3 border-b border-[#1f2937]/50 hover:bg-[#1f2937] transition-colors flex items-center gap-3">
              <div class="w-2.5 h-2.5 rounded-full shrink-0" [class]="u.online ? 'bg-emerald-500' : 'bg-gray-600'"></div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-black text-white truncate">{{ u.truckPlate }}</p>
                <p class="text-[10px] text-gray-400 truncate">
                  {{ u.driverName || 'Sem motorista' }} · {{ u.cylindersOnBoard }} cil.
                </p>
              </div>
              <span class="text-[9px] font-bold" [class]="u.online ? 'text-emerald-400' : 'text-gray-500'">
                {{ formatAge(u.ageMinutes) }}
              </span>
            </button>
            <div *ngIf="units.length === 0 && !loading" class="px-4 py-8 text-center text-gray-500 text-xs">
              Nenhuma viatura a reportar localização.
              <p class="text-[10px] text-gray-600 mt-1">Os telemóveis dos camiões enviam GPS automaticamente em viagem.</p>
            </div>
          </div>
        </div>

        <!-- Bottom-right: stats -->
        <div *ngIf="mode === 'LIVE'" class="absolute bottom-5 right-5 z-10 bg-[#111827]/90 backdrop-blur-md border border-[#1f2937] p-5 rounded-3xl shadow-2xl min-w-[180px]">
           <p class="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-3">Estado da Frota</p>
           <div class="space-y-3">
              <div class="flex justify-between items-center">
                 <span class="text-xs font-bold text-gray-400">Online</span>
                 <span class="text-lg font-black text-emerald-400">{{ onlineCount }}</span>
              </div>
              <div class="flex justify-between items-center">
                 <span class="text-xs font-bold text-gray-400">Em Viagem</span>
                 <span class="text-lg font-black text-blue-400">{{ onTripCount }}</span>
              </div>
              <div class="flex justify-between items-center">
                 <span class="text-xs font-bold text-gray-400">Total</span>
                 <span class="text-lg font-black text-white">{{ units.length }}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; height: 100%; }
    #fleet-map { background: #0a0f18; }
    ::ng-deep .leaflet-container { background: #0a0f18 !important; }
    ::ng-deep .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
    ::ng-deep .leaflet-popup-content-wrapper, ::ng-deep .leaflet-popup-tip {
      background: #111827 !important; color: white !important;
      border: 1px solid #1f2937; border-radius: 12px;
    }
    ::ng-deep .truck-marker {
       border-radius: 50%; width: 38px; height: 38px;
       display: flex; align-items: center; justify-content: center;
       font-size: 20px; box-shadow: 0 0 18px rgba(16,185,129,0.5);
    }
    ::ng-deep .truck-marker.online { background: #10b981; border: 3px solid #064e3b; color: #052e16; }
    ::ng-deep .truck-marker.offline { background: #6b7280; border: 3px solid #374151; color: #111827; box-shadow: none; }
  `]
})
export class FleetMapComponent implements OnInit, OnDestroy, AfterViewInit {
    private map: any;
    private markers: { [plate: string]: any } = {};
    units: FleetUnit[] = [];
    loading = true;
    mapError = false;
    private pollInterval: any;
    private mapReady = false;

    // History mode
    mode: 'LIVE' | 'HISTORY' = 'LIVE';
    knownPlates: string[] = [];
    histPlate = '';
    histDate = new Date().toISOString().slice(0, 10);
    histResult: any = null;
    private histLayers: any[] = [];

    constructor(private dataService: DataService, private cdr: ChangeDetectorRef) { }

    get onlineCount(): number { return this.units.filter(u => u.online).length; }
    get onTripCount(): number { return this.units.filter(u => u.onTrip).length; }

    ngOnInit() {
        this.pollInterval = setInterval(() => this.refreshMap(), 15000);
    }

    ngOnDestroy() {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }

    ngAfterViewInit() {
        this.initMap(0);
    }

    private initMap(attempt: number) {
        if (typeof L === 'undefined') {
            if (attempt > 10) { this.mapError = true; this.cdr.markForCheck(); return; }
            setTimeout(() => this.initMap(attempt + 1), 600);
            return;
        }
        this.map = L.map('fleet-map', { zoomControl: true }).setView([-25.9692, 32.5732], 12); // Maputo
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap', maxZoom: 19,
        }).addTo(this.map);
        this.mapReady = true;
        this.refreshMap();
    }

    refreshMap() {
        if (this.mode !== 'LIVE') return;
        this.loading = true;
        this.dataService.getLiveFleet().subscribe({
            next: (units) => {
                this.units = units || [];
                this.knownPlates = this.units.map(u => u.truckPlate);
                this.loading = false;
                this.updateMarkers();
                this.cdr.markForCheck();
            },
            error: () => { this.loading = false; this.cdr.markForCheck(); },
        });
    }

    private updateMarkers() {
        if (!this.mapReady || !this.map) return;
        const seen = new Set<string>();

        for (const u of this.units) {
            seen.add(u.truckPlate);
            const pos = [u.lat, u.lng];
            if (this.markers[u.truckPlate]) {
                this.markers[u.truckPlate].setLatLng(pos);
                this.markers[u.truckPlate].setPopupContent(this.popupHtml(u));
                this.markers[u.truckPlate].setIcon(this.icon(u));
            } else {
                this.markers[u.truckPlate] = L.marker(pos, { icon: this.icon(u) })
                    .addTo(this.map)
                    .bindPopup(this.popupHtml(u));
            }
        }

        // Remove markers for trucks no longer reporting
        for (const plate of Object.keys(this.markers)) {
            if (!seen.has(plate)) {
                this.map.removeLayer(this.markers[plate]);
                delete this.markers[plate];
            }
        }
    }

    private icon(u: FleetUnit): any {
        return L.divIcon({
            className: '',
            html: `<div class="truck-marker ${u.online ? 'online' : 'offline'}"><span class="material-symbols-outlined" style="font-size:20px">local_shipping</span></div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
        });
    }

    private popupHtml(u: FleetUnit): string {
        const stock = Object.keys(u.inventory || {})
            .map(k => `${k}: ${u.inventory[k]?.full || 0}`).join(' · ') || 'sem stock';
        return `
          <div style="font-family:'Inter',sans-serif; min-width:180px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${u.online ? '#10b981' : '#6b7280'}"></span>
              <p style="margin:0;font-weight:900;color:${u.online ? '#10b981' : '#9ca3af'};font-size:14px">${u.truckPlate}</p>
            </div>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase">Motorista: ${u.driverName || 'N/A'}</p>
            <p style="margin:3px 0 0;color:#9ca3af;font-size:10px">Última posição: ${this.formatAge(u.ageMinutes)}</p>
            <p style="margin:3px 0 0;color:#9ca3af;font-size:10px">Cilindros: ${stock}</p>
            <div style="margin-top:8px;border-top:1px solid #1f2937;padding-top:8px;display:flex;gap:10px">
              <a href="https://www.google.com/maps?q=${u.lat},${u.lng}" target="_blank" style="color:#10b981;text-decoration:none;font-size:10px;font-weight:900;text-transform:uppercase">Ver no Google Maps</a>
            </div>
          </div>`;
    }

    focusUnit(u: FleetUnit) {
        if (this.map) {
            this.map.setView([u.lat, u.lng], 16, { animate: true });
            this.markers[u.truckPlate]?.openPopup();
        }
    }

    fitAll() {
        if (!this.map) return;
        if (this.mode === 'HISTORY' && this.histResult?.trail?.length) {
            const b = L.latLngBounds(this.histResult.trail.map((p: any) => [p.lat, p.lng]));
            this.map.fitBounds(b, { padding: [60, 60], maxZoom: 16 });
            return;
        }
        if (this.units.length === 0) return;
        const bounds = L.latLngBounds(this.units.map(u => [u.lat, u.lng]));
        this.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }

    // ── History mode ─────────────────────────────────────────────────────────
    setMode(m: 'LIVE' | 'HISTORY') {
        if (this.mode === m) return;
        this.mode = m;
        if (m === 'HISTORY') {
            if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
            // Populate truck list from current live units (or fetch once)
            if (this.knownPlates.length === 0) {
                this.dataService.getLiveFleet().subscribe(units => {
                    this.knownPlates = (units || []).map((u: any) => u.truckPlate);
                    this.cdr.markForCheck();
                });
            }
            this.clearLiveMarkers();
        } else {
            this.clearHistoryLayers();
            this.histResult = null;
            if (!this.pollInterval) this.pollInterval = setInterval(() => this.refreshMap(), 15000);
            this.refreshMap();
        }
        this.cdr.markForCheck();
    }

    onHistTruckChange() {
        this.histResult = null;
        this.clearHistoryLayers();
    }

    loadHistory() {
        if (!this.histPlate) return;
        this.loading = true;
        this.dataService.getRouteHistory(this.histPlate, this.histDate, this.histDate).subscribe({
            next: (res) => {
                this.histResult = res;
                this.loading = false;
                this.drawTrail();
                this.cdr.markForCheck();
            },
            error: () => { this.loading = false; this.cdr.markForCheck(); },
        });
    }

    private drawTrail() {
        if (!this.mapReady || !this.map) return;
        this.clearHistoryLayers();
        const trail = this.histResult?.trail || [];
        if (trail.length === 0) return;

        const latlngs = trail.map((p: any) => [p.lat, p.lng]);
        const line = L.polyline(latlngs, { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(this.map);
        this.histLayers.push(line);

        // Start marker (green) + end marker (red)
        const start = trail[0], end = trail[trail.length - 1];
        const startIcon = L.divIcon({ className: '', html: `<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:3px solid #052e16"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
        const endIcon = L.divIcon({ className: '', html: `<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid #450a0a"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
        this.histLayers.push(
            L.marker([start.lat, start.lng], { icon: startIcon }).addTo(this.map)
                .bindPopup(`<b style="color:#10b981">Início</b><br>${new Date(start.timestamp).toLocaleString('pt-PT')}`),
            L.marker([end.lat, end.lng], { icon: endIcon }).addTo(this.map)
                .bindPopup(`<b style="color:#ef4444">Fim</b><br>${new Date(end.timestamp).toLocaleString('pt-PT')}`),
        );
        this.map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 16 });
    }

    private clearHistoryLayers() {
        this.histLayers.forEach(l => this.map && this.map.removeLayer(l));
        this.histLayers = [];
    }

    private clearLiveMarkers() {
        Object.values(this.markers).forEach((m: any) => this.map && this.map.removeLayer(m));
        this.markers = {};
    }

    formatDuration(min: number): string {
        if (!min) return '0 min';
        if (min < 60) return `${min} min`;
        const h = Math.floor(min / 60);
        return `${h}h ${min % 60}min`;
    }

    formatAge(min: number | null): string {
        if (min == null) return 'sem dados';
        if (min < 1) return 'agora';
        if (min < 60) return `há ${min} min`;
        const h = Math.floor(min / 60);
        return `há ${h}h`;
    }
}
