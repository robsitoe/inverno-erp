import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title>Histórico</ion-title>
      </ion-toolbar>
      <ion-toolbar color="dark">
        <ion-segment [(ngModel)]="segment" (ionChange)="segmentChanged()" mode="ios">
          <ion-segment-button value="orders">
            <ion-label>Encomendas</ion-label>
          </ion-segment-button>
          <ion-segment-button value="payments">
            <ion-label>Pagamentos</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="content-dark">
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div *ngIf="loading" class="ion-text-center ion-padding mt-4">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p style="color: grey;">A carregar...</p>
      </div>

      <!-- Orders List -->
      <div *ngIf="!loading && segment === 'orders'">
        <div *ngIf="orders.length === 0" class="empty-state">
          <ion-icon name="cart-outline"></ion-icon>
          <p>Nenhuma encomenda encontrada.</p>
        </div>
        
        <ion-list lines="none" class="transparent-list">
          <ion-item *ngFor="let order of orders" class="history-item">
            <div slot="start" class="status-indicator" [ngClass]="order.status.toLowerCase()"></div>
            <ion-label>
              <h3>{{ order.documentNumber }}</h3>
              <p class="date">{{ order.date | date:'dd/MM/yyyy' }}</p>
              <div *ngIf="order.status === 'POSTED' && order.driverLat" class="tracking-pill" (click)="trackDelivery(order, $event)">
                <ion-icon name="location" color="success"></ion-icon>
                <span>A caminho... Seguir</span>
              </div>
            </ion-label>
            <div slot="end" class="amount">
              <h3>{{ order.total | number:'1.2-2' }} MT</h3>
              <ion-badge [color]="getStatusColor(order.status)" mode="ios">{{ getStatusLabel(order.status) }}</ion-badge>
            </div>
          </ion-item>
        </ion-list>
      </div>

      <!-- Payments List -->
      <div *ngIf="!loading && segment === 'payments'">
        <div *ngIf="payments.length === 0" class="empty-state">
          <ion-icon name="wallet-outline"></ion-icon>
          <p>Nenhum pagamento efetuado.</p>
        </div>

        <ion-list lines="none" class="transparent-list">
          <ion-item *ngFor="let payment of payments" class="history-item">
            <ion-icon slot="start" name="cash-outline" color="success"></ion-icon>
            <ion-label>
              <h3>{{ payment.number }}</h3>
              <p class="date">{{ payment.date | date:'dd/MM/yyyy' }}</p>
            </ion-label>
            <div slot="end" class="amount">
              <h3 class="text-success">{{ payment.amount | number:'1.2-2' }} MT</h3>
              <p class="payment-method">{{ payment.paymentMethod || 'M-Pesa' }}</p>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  `,
  styles: [`
    .content-dark { --background: #0A0E1A; }
    ion-segment { --background: #161B2E; padding: 4px; }
    .transparent-list { background: transparent; padding: 16px; }
    .history-item {
      --background: #161B2E;
      margin-bottom: 12px;
      border-radius: 16px;
      border: 1px solid #2A3043;
      --padding-start: 16px;
      --padding-end: 16px;
    }
    .status-indicator {
      width: 4px; height: 30px; border-radius: 2px; margin-right: 12px;
    }
    .status-indicator.draft { background: #555A6F; }
    .status-indicator.posted { background: #2ECC71; }
    .status-indicator.approved { background: #00D1FF; }
    
    .tracking-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(46, 204, 113, 0.1); border-radius: 20px;
      padding: 4px 10px; margin-top: 8px; color: #2ECC71;
      font-size: 11px; font-weight: 800; cursor: pointer;
    }
    .tracking-pill ion-icon { font-size: 14px; }

    h3 { color: white; font-weight: bold; margin: 0; font-size: 15px; }
    p.date { color: #A0A0A0; font-size: 12px; margin-top: 4px; }
    .amount { text-align: right; }
    .amount h3 { color: #00D1FF; }
    .amount .text-success { color: #2ECC71; }
    .payment-method { font-size: 11px; color: #555A6F; margin-top: 4px; }
    
    .empty-state {
      text-align: center; padding: 60px 20px; color: #555A6F;
    }
    .empty-state ion-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.3; }
    .mt-4 { margin-top: 32px; }
    ion-badge { font-size: 10px; margin-top: 4px; }
  `]
})
export class HistoryPage implements OnInit {
  segment = 'orders';
  orders: any[] = [];
  payments: any[] = [];
  loading = true;

  constructor(private http: HttpClient, private authService: AuthService) { }

  ngOnInit() {
    this.loadHistory();
  }

  doRefresh(event: any) {
    this.loadHistory(event);
  }

  segmentChanged() {
    // Optionally refresh specific segment if needed
  }

  loadHistory(event?: any) {
    this.loading = !event;
    this.http.get(`${environment.apiUrl}/mobile/history`).subscribe({
      next: (data: any) => {
        console.log(`[HistoryPage] Dados recebidos do servidor em ${new Date().toLocaleTimeString()}:`, data);
        if (Array.isArray(data)) {
          // It's a driver list
          this.orders = data;
          this.payments = [];
        } else {
          // It's a reseller object
          this.orders = data.orders || [];
          this.payments = data.payments || [];
        }
        this.loading = false;
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error('Erro ao carregar histórico:', err);
        this.loading = false;
        if (event) event.target.complete();
      }
    });
  }

  getStatusColor(status: string) {
    switch (status.toUpperCase()) {
      case 'POSTED': return 'success';
      case 'APPROVED': return 'primary';
      case 'DRAFT': return 'medium';
      default: return 'medium';
    }
  }

  getStatusLabel(status: string) {
    switch (status.toUpperCase()) {
      case 'POSTED': return 'A caminho';
      case 'APPROVED': return 'Pendente';
      case 'DRAFT': return 'Rascunho';
      default: return status;
    }
  }

  trackDelivery(order: any, event: Event) {
    event.stopPropagation();
    if (order.driverLat && order.driverLng) {
      // Directions from Driver to Customer
      const url = `https://www.google.com/maps/dir/?api=1&origin=${order.driverLat},${order.driverLng}&destination=${order.latitude},${order.longitude}&travelmode=driving`;
      window.open(url, '_system');
    }
  }
}
