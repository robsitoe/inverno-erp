import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-reseller-order',
    template: `
    <ion-header [translucent]="true" class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title>Nova Encomenda</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="dark-content">
      <div class="header-section">
        <p class="subtitle">Selecione as garrafas para encomendar</p>
      </div>

      <ion-list lines="none" class="transparent-list">
        <ion-item *ngFor="let type of cylinderTypes" class="cylinder-card">
          <ion-label>
            <h2>{{ type.name }}</h2>
            <p class="price">{{ type.price }} MT</p>
          </ion-label>
          <div slot="end" class="counter-box">
            <ion-button fill="clear" (click)="updateQty(type.id, -1)">
              <ion-icon name="remove-circle-outline"></ion-icon>
            </ion-button>
            <span class="qty">{{ order[type.id] || 0 }}</span>
            <ion-button fill="clear" (click)="updateQty(type.id, 1)">
              <ion-icon name="add-circle-outline"></ion-icon>
            </ion-button>
          </div>
        </ion-item>
      </ion-list>

      <div class="summary-card">
        <div class="row">
          <span>Total de Garrafas</span>
          <span class="value">{{ getTotalCylinders() }}</span>
        </div>
        <ion-button expand="block" shape="round" color="primary" [disabled]="getTotalCylinders() === 0">
          Confirmar Encomenda
        </ion-button>
      </div>
    </ion-content>
  `,
    styles: [`
    .dark-content { --background: #0A0E1A; }
    .header-section { padding: 16px; }
    .subtitle { color: #A0A0A0; font-size: 14px; }
    .transparent-list { background: transparent; padding: 10px; }
    .cylinder-card {
      --background: #161B2E;
      margin-bottom: 12px;
      border-radius: 16px;
      border: 1px solid #2A3043;
      --padding-start: 16px;
      --padding-end: 16px;
    }
    h2 { color: white; font-weight: bold; margin: 0; }
    .price { color: #00D1FF; font-size: 13px; font-weight: 500; }
    .counter-box { display: flex; align-items: center; color: white; }
    .qty { font-size: 18px; font-weight: bold; min-width: 24px; text-align: center; }
    ion-button { --color: white; }
    .summary-card {
      position: absolute; bottom: 0; width: 100%;
      background: #161B2E; padding: 20px;
      border-top-left-radius: 24px; border-top-right-radius: 24px;
      border-top: 1px solid #2A3043;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 16px; color: #A0A0A0; font-weight: 500; }
    .value { color: white; font-size: 18px; font-weight: bold; }
  `]
})
export class ResellerOrderComponent implements OnInit {
    cylinderTypes = [
        { id: '9kg', name: 'Gás 9KG', price: 950 },
        { id: '14kg', name: 'Gás 14KG', price: 1450 },
        { id: '19kg', name: 'Gás 19KG', price: 1950 },
    ];

    order: { [key: string]: number } = {};

    constructor() { }
    ngOnInit() { }

    updateQty(id: string, delta: number) {
        const current = this.order[id] || 0;
        this.order[id] = Math.max(0, current + delta);
    }

    getTotalCylinders() {
        return Object.values(this.order).reduce((a, b) => a + b, 0);
    }
}
