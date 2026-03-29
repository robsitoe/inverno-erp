import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reseller-order',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  template: `
    <ion-header [translucent]="true" class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Nova Encomenda</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="dark-content">
      <!-- Pending Approval Banner -->
      <div *ngIf="isPending" class="pending-banner">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <p>A sua conta aguarda aprovação. Poderá encomendar assim que for validada.</p>
      </div>

      <div class="header-section">
        <p class="subtitle">Selecione as garrafas para encomendar</p>
      </div>

      <div *ngIf="loading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p style="color: grey;">A carregar artigos...</p>
      </div>

      <ion-list lines="none" class="transparent-list" *ngIf="!loading">
        <ion-item *ngFor="let type of cylinderTypes" class="cylinder-card">
          <ion-label>
            <h2>{{ type.name }}</h2>
            <p class="price">{{ type.priceRevendedor }} MT (Revenda)</p>
          </ion-label>
          <div slot="end" class="counter-box" *ngIf="!isPending">
            <ion-button fill="clear" (click)="updateQty(type.id, -1)">
              <ion-icon name="remove-circle-outline"></ion-icon>
            </ion-button>
            <span class="qty">{{ order[type.id] || 0 }}</span>
            <ion-button fill="clear" (click)="updateQty(type.id, 1)">
              <ion-icon name="add-circle-outline"></ion-icon>
            </ion-button>
          </div>
          <div slot="end" class="counter-box" *ngIf="isPending">
            <ion-badge color="medium" mode="ios">Bloqueado</ion-badge>
          </div>
        </ion-item>
      </ion-list>

      <div class="summary-card" *ngIf="!loading">
        <div class="row payment-row" *ngIf="!isPending">
          <span>Ponto de Entrega</span>
          <ion-select [(ngModel)]="selectedPointId" interface="action-sheet" placeholder="Selecionar Local" class="payment-select">
            <ion-select-option *ngFor="let point of deliveryPoints" [value]="point.id">
              {{ point.name }} {{ point.isDefault ? '(Principal)' : '' }}
            </ion-select-option>
          </ion-select>
        </div>
        <div class="row payment-row" *ngIf="!isPending">
          <span>Método de Pagamento</span>
          <ion-select [(ngModel)]="paymentMethod" interface="action-sheet" placeholder="Selecionar" class="payment-select">
            <ion-select-option *ngFor="let method of paymentMethods" [value]="method.code">
              {{ method.description }}
            </ion-select-option>
          </ion-select>
        </div>
        <div class="row">
          <span>Total de Garrafas</span>
          <span class="value">{{ getTotalCylinders() }}</span>
        </div>
        <div class="row">
          <span>Total Estimado</span>
          <span class="value" color="primary">{{ getTotalAmount() | number:'1.2-2' }} MT</span>
        </div>
        <ion-button expand="block" shape="round" color="primary" [disabled]="isPending || getTotalCylinders() === 0 || !paymentMethod || !selectedPointId || submitting" (click)="submitOrder()">
          <ion-spinner name="crescent" *ngIf="submitting"></ion-spinner>
          <span *ngIf="!submitting">{{ isPending ? 'Aguardando Aprovação' : 'Confirmar Encomenda' }}</span>
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .dark-content { --background: #0A0E1A; }
    .pending-banner {
      background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.2);
      border-radius: 12px; margin: 16px; padding: 12px;
      display: flex; align-items: center; gap: 12px;
    }
    .pending-banner ion-icon { color: #FFA500; font-size: 24px; }
    .pending-banner p { color: #FFA500; font-size: 12px; margin: 0; font-weight: 500; }
    .header-section { padding: 16px; pt-top: 0; }
    .subtitle { color: #A0A0A0; font-size: 14px; }
    .transparent-list { background: transparent; padding: 10px; margin-bottom: 120px; }
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
      position: fixed; bottom: 0; width: 100%;
      background: #161B2E; padding: 20px;
      border-top-left-radius: 24px; border-top-right-radius: 24px;
      border-top: 1px solid #2A3043;
      z-index: 10;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; color: #A0A0A0; font-weight: 500; align-items: center; }
    .value { color: white; font-size: 16px; font-weight: bold; }
    .payment-row { margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
    .payment-select { --placeholder-color: #555A6F; --color: #00D1FF; font-weight: 600; font-size: 14px; }
  `]
})
export class ResellerOrderPage implements OnInit {
  cylinderTypes: any[] = [];
  paymentMethods: any[] = [];
  deliveryPoints: any[] = [];
  order: { [key: string]: number } = {};
  paymentMethod: string = '';
  selectedPointId: string = '';
  loading = true;
  submitting = false;
  isPending = false;

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.authService.refreshProfile().subscribe(() => {
      this.isPending = this.authService.user?.status !== 'APPROVED';
    });
    this.loadGasTypes();
    this.loadPaymentMethods();
    this.loadDeliveryPoints();
  }

  loadDeliveryPoints() {
    this.authService.getDeliveryPoints().subscribe({
      next: (points: any) => {
        this.deliveryPoints = points;
        if (points.length > 0) {
          const defaultPoint = points.find((p: any) => p.isDefault) || points[0];
          this.selectedPointId = defaultPoint.id;
        }
      }
    });
  }

  loadPaymentMethods() {
    this.authService.getPaymentMethods().subscribe({
      next: (methods: any) => {
        this.paymentMethods = methods;
        if (methods.length > 0) this.paymentMethod = methods[0].code;
      }
    });
  }

  loadGasTypes() {
    this.authService.getGasTypes().subscribe({
      next: (types: any) => {
        this.cylinderTypes = types;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar artigos:', err);
        this.loading = false;
        alert('Erro ao carregar lista de artigos. Verifique a sua ligação.');
      }
    });
  }

  updateQty(id: string, delta: number) {
    const current = this.order[id] || 0;
    this.order[id] = Math.max(0, current + delta);
  }

  getTotalCylinders() {
    return Object.values(this.order).reduce((a, b) => a + b, 0);
  }

  getTotalAmount() {
    return this.cylinderTypes.reduce((acc, type) => {
      const qty = this.order[type.id] || 0;
      return acc + (qty * type.priceRevendedor);
    }, 0);
  }

  submitOrder() {
    this.submitting = true;
    const items = Object.keys(this.order)
      .filter(id => this.order[id] > 0)
      .map(id => {
        const type = this.cylinderTypes.find(t => t.id === id);
        return {
          articleId: type.articleId || id,
          articleCode: type.articleCode || type.code || (id.includes('-') ? id : 'GAS-CYL'),
          articleName: type.name || 'Gás',
          quantity: this.order[id],
          unitPrice: type.priceRevendedor || 0,
          ivaRate: 16
        };
      });

    const selectedPoint = this.deliveryPoints.find(p => p.id === this.selectedPointId);

    const orderData = {
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      documentType: 'GT',
      series: 'APP',
      paymentCondition: 'PRONTO',
      paymentMethod: this.paymentMethod,
      deliveryPointId: this.selectedPointId,
      latitude: selectedPoint?.latitude,
      longitude: selectedPoint?.longitude,
      lines: items
    };

    console.log('Enviando encomenda real:', orderData);
    this.authService.submitOrder(orderData).subscribe({
      next: (res: any) => {
        this.submitting = false;
        alert('Encomenda enviada com sucesso! O motorista será notificado.');
        // reset order
        this.order = {};
      },
      error: (err) => {
        this.submitting = false;
        console.error('Erro ao enviar encomenda:', err);
        alert('Erro ao enviar encomenda. Tente novamente.');
      }
    });
  }
}
