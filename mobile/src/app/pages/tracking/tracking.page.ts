import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MobileApiService } from '../../services/mobile-api.service';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { mapOutline, bicycleOutline, locationOutline, navigateOutline, locate, refreshOutline, refresh, barcodeOutline, cubeOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';

declare let L: any;

@Component({
    selector: 'app-tracking',
    standalone: true,
    imports: [CommonModule, IonicModule],
    template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title>Central de Monitoramento</ion-title>
        <ion-buttons slot="end">
          <!-- Force Location Button (Radar) for Drivers -->
          <ion-button *ngIf="!isReseller" (click)="forceRadar()" color="success">
            <ion-icon name="navigate" slot="icon-only"></ion-icon>
          </ion-button>
          
          <ion-button (click)="refresh(false)">
            <ion-spinner name="crescent" *ngIf="loading"></ion-spinner>
            <ion-icon name="refresh-outline" *ngIf="!loading"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="content-dark">
      <div id="map" style="height: 55%; width: 100%; border-bottom: 2px solid #2A3043;"></div>

      <div class="info-panel ion-padding">
        <div class="section-title">
           <h3>{{ isReseller ? 'Minha Entrega' : 'Minha Rota de Hoje' }}</h3>
           <ion-badge color="success" mode="ios" *ngIf="activeDeliveries.length > 0">
             {{ activeDeliveries.length }} ativa(s)
           </ion-badge>
        </div>

        <div *ngIf="activeDeliveries.length === 0" class="empty-status">
           <ion-icon name="map-outline"></ion-icon>
           <p>Nenhuma entrega em trânsito neste momento.</p>
        </div>

        <ion-list lines="none" class="transparent-list">
          <ion-item *ngFor="let del of activeDeliveries" class="route-item">
            <ion-icon name="cube-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <h3>{{ del.documentNumber }}</h3>
                <ion-badge [color]="del.latitude ? 'success' : 'danger'" mode="ios" style="font-size: 8px;">
                   {{ del.latitude ? 'GPS OK' : 'SEM GPS' }}
                </ion-badge>
              </div>
              <p>{{ isReseller ? 'Motorista a caminho' : del.customerName }}</p>
              <p class="items-summary" *ngIf="del.itemsSummary">{{ del.itemsSummary }}</p>
            </ion-label>
            <ion-button slot="end" fill="clear" [color]="del.latitude ? 'primary' : 'medium'" (click)="focusOn(del)" [disabled]="!del.latitude">
              <ion-icon name="locate" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  `,
    styles: [`
    .content-dark { --background: #0A0E1A; }
    #map { background: #0A0E1A; transition: 0.3s; }
    .info-panel { height: 45%; overflow-y: auto; }
    .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
    .section-title h3 { color: white; margin: 0; font-weight: 800; font-size: 18px; }
    
    .empty-status { text-align: center; padding: 40px; color: #555A6F; }
    .empty-status ion-icon { font-size: 48px; opacity: 0.2; margin-bottom: 12px; }

    .transparent-list { background: transparent; }
    .route-item {
      --background: #161B2E; margin-bottom: 10px; border-radius: 14px;
      border: 1px solid #2A3043; --padding-start: 12px;
    }
    h3 { color: white; font-weight: 700; font-size: 14px; }
    p { color: #A0A0A0; font-size: 12px; margin: 4px 0 0; }
    .items-summary { color: #00D1FF; font-weight: 600; font-size: 11px; }

    /* Pop-up Styles for Map */
    ::ng-deep .leaflet-popup-content-wrapper { 
      background: #161B2E !important; color: white !important; 
      border-radius: 12px !important; border: 1px solid #2A3043 !important;
    }
    ::ng-deep .leaflet-popup-tip { background: #161B2E !important; }
    .marker-popup h4 { margin: 0 0 5px; color: #00D1FF; font-size: 14px; }
    .marker-popup p { margin: 3px 0; color: #EEE; font-size: 11px; }
    .qty-badge { color: #2ECC71; font-weight: bold; }
  `]
})
export class TrackingPage implements OnInit, OnDestroy, AfterViewInit {
    private map: any;
    private markers: any[] = [];
    loading = true;
    activeDeliveries: any[] = [];
    isReseller = false;
    private timer: any;

    constructor(
        private mobileApi: MobileApiService,
        private authService: AuthService
    ) {
        addIcons({ mapOutline, bicycleOutline, locationOutline, navigateOutline, locate, refreshOutline, refresh, barcodeOutline, cubeOutline });
    }

    ngOnInit() {
        this.isReseller = !!this.authService.user?.customerId;
        this.timer = setInterval(() => this.refresh(true), 15000);
    }

    ngAfterViewInit() {
        setTimeout(() => this.initMap(), 500);
    }

    ngOnDestroy() {
        if (this.timer) clearInterval(this.timer);
        if (this.map) this.map.remove();
    }

    initMap() {
        this.map = L.map('map', { zoomControl: false }).setView([-25.96, 32.58], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB' }).addTo(this.map);
        this.refresh();
    }

    async forceRadar() {
        this.loading = true;
        try {
            // 1. Force Local GPS reading
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
            // 2. Report it to backend so everyone else sees us
            await this.mobileApi.updateStatus({
                truckPlate: localStorage.getItem('truck_plate') || 'T-REGO-001',
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            }).toPromise();
            // 3. Refresh our own map
            this.refresh();
            alert('Radar Atualizado! A sua localização foi enviada e o mapa refrescado.');
        } catch (err) {
            console.warn('Radar fail, using mock:', err);
            // Mock for dev
            const mockLat = -25.968 + (Math.random() * 0.005);
            const mockLng = 32.573 + (Math.random() * 0.005);
            await this.mobileApi.updateStatus({ truckPlate: 'T-MOCK', lat: mockLat, lng: mockLng }).toPromise();
            this.refresh();
        }
    }

    refresh(isSilent = false) {
        if (!isSilent) this.loading = true;
        this.mobileApi.getHistory().subscribe((res: any) => {
            const orders = res.orders || res || [];
            this.activeDeliveries = orders.filter((o: any) => o.status === 'POSTED' || o.status === 1 || o.status === '1');
            this.updateMapMarkers();
            this.loading = false;
        }, () => this.loading = false);
    }

    updateMapMarkers() {
        if (!this.map) return;
        this.map.invalidateSize();
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];

        const bounds: any[] = [];
        const truckIcon = L.divIcon({
            html: `<div style="font-size: 24px; filter: drop-shadow(0 0 5px #2ECC71);">🚚</div>`,
            className: 'custom-div-icon', iconSize: [30, 30], iconAnchor: [15, 15]
        });

        const destinationIcon = L.divIcon({
            html: `<div style="font-size: 24px; filter: drop-shadow(0 0 5px #00D1FF);">📍</div>`,
            className: 'custom-div-icon', iconSize: [30, 30], iconAnchor: [15, 30]
        });

        // Grouping by location to handle multiple orders at one spot
        const locations: { [key: string]: any[] } = {};
        const driverLocs: { [key: string]: any } = {};

        this.activeDeliveries.forEach(del => {
            // Destinations
            if (del.latitude && del.longitude) {
                const key = `${del.latitude.toFixed(5)},${del.longitude.toFixed(5)}`;
                if (!locations[key]) locations[key] = [];
                locations[key].push(del);
            }
            // Drivers
            if (del.driverLat && del.driverLng && del.driverId) {
                driverLocs[del.driverId] = { lat: del.driverLat, lng: del.driverLng, plate: del.truckPlate };
            }
        });

        // Draw Destination Markers
        Object.keys(locations).forEach(key => {
            const orders = locations[key];
            const [lat, lng] = key.split(',').map(Number);

            let popupContent = `<div class="marker-popup"><h4>${orders[0].customerName || 'Cliente'}</h4>`;
            orders.forEach(o => {
                popupContent += `<p><b>${o.documentNumber}</b>: <span class="qty-badge">${o.totalQty} garrafas</span></p>`;
                if (o.itemsSummary) popupContent += `<p style="font-size: 9px; opacity: 0.7;">${o.itemsSummary}</p>`;
            });
            popupContent += `</div>`;

            const m = L.marker([lat, lng], { icon: destinationIcon })
                .addTo(this.map)
                .bindPopup(popupContent);
            this.markers.push(m);
            bounds.push([lat, lng]);
        });

        // Draw Driver Markers
        Object.keys(driverLocs).forEach(driverId => {
            const loc = driverLocs[driverId];
            const m = L.marker([loc.lat, loc.lng], { icon: truckIcon })
                .addTo(this.map)
                .bindPopup(`<div class="marker-popup"><h4>Motorista: ${driverId}</h4><p>Camião: ${loc.plate}</p></div>`);
            this.markers.push(m);
            bounds.push([loc.lat, loc.lng]);

            // Connect trucks to their targets in this view
            this.activeDeliveries.filter(d => d.driverId === driverId && d.latitude).forEach(d => {
                const poly = L.polyline([[loc.lat, loc.lng], [d.latitude, d.longitude]], {
                    color: '#00D1FF', weight: 2, opacity: 0.3, dashArray: '5, 10'
                }).addTo(this.map);
                this.markers.push(poly);
            });
        });

        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    focusOn(del: any) {
        if (del.latitude && del.longitude) {
            this.map.setView([del.latitude, del.longitude], 17);
        }
    }
}
