import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-driver-delivery',
    template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title>Entregas de Hoje</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="dark-content">
      <div class="map-placeholder">
        <div class="overlay-text">Mapa Logístico (Google Maps API)</div>
        <div class="marker truck"><ion-icon name="truck-outline"></ion-icon></div>
        <div class="marker destination"><ion-icon name="flag-outline"></ion-icon></div>
      </div>

      <ion-card class="delivery-card">
        <ion-card-header>
          <ion-card-subtitle>PRÓXIMO DESTINO</ion-card-subtitle>
          <ion-card-title>Revendedor Matola A</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <div class="inventory-grid">
            <div class="inv-item">
              <span class="qty">08</span>
              <span class="label">9KG</span>
            </div>
            <div class="inv-item">
              <span class="qty">03</span>
              <span class="label">14KG</span>
            </div>
            <div class="inv-item">
              <span class="qty">02</span>
              <span class="label">19KG</span>
            </div>
          </div>

          <ion-button expand="block" shape="round" color="primary" class="main-action">
            Confirmar Entrega
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
    styles: [`
    .dark-content { --background: #0A0E1A; }
    .map-placeholder {
      height: 40vh; margin: 16px; border-radius: 20px;
      background: #111625; position: relative;
      display: flex; justify-content: center; align-items: center;
      border: 1px solid #2A3043; overflow: hidden;
    }
    .overlay-text { color: #4A5568; font-weight: 500; font-size: 14px; }
    .marker { position: absolute; font-size: 24px; color: white; padding: 6px; border-radius: 50%; }
    .truck { background: #0070F3; top: 30%; left: 30%; }
    .destination { background: #FF6B00; top: 60%; left: 70%; }
    
    .delivery-card {
      background: #161B2E; border-radius: 24px;
      margin: 16px; border: 1px solid #2A3043;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    ion-card-subtitle { color: #A0A0A0; font-weight: 600; letter-spacing: 1px; }
    ion-card-title { color: white; font-weight: bold; font-size: 22px; margin-top: 8px; }
    
    .inventory-grid { display: flex; justify-content: space-around; margin: 20px 0; }
    .inv-item { display: flex; flex-direction: column; align-items: center; }
    .qty { font-size: 26px; font-weight: bold; color: white; }
    .label { font-size: 12px; font-weight: bold; color: #00D1FF; margin-top: 4px; }
    
    .main-action { --height: 56px; font-weight: bold; margin-top: 10px; }
  `]
})
export class DriverDeliveryComponent implements OnInit {
    constructor() { }
    ngOnInit() { }
}
