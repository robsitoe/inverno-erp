import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ModalController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { MobileApiService } from '../../services/mobile-api.service';
import { Geolocation } from '@capacitor/geolocation';
import { addIcons } from 'ionicons';
import { mapOutline, navigate, checkmarkCircle, closeCircleOutline, pinOutline, logOutOutline, refreshOutline, map } from 'ionicons/icons';

@Component({
  selector: 'app-driver-delivery',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title>Entregas Disponíveis</ion-title>
        <ion-buttons slot="end">
            <!-- Force Radar Button -->
            <ion-button (click)="reportLocation()" color="success" title="Enviar GPS Agora">
                <ion-icon name="navigate" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button (click)="logout()">
                <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
            </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="content-dark">
      <ion-refresher slot="fixed" (ionRefresh)="loadDeliveries($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Assigned Route Section -->
      <div class="assigned-section" *ngIf="assignedRoute.length > 0">
        <div class="section-header">
          <ion-icon name="map-outline" color="success"></ion-icon>
          <h2>A Minha Rota ({{ assignedRoute.length }})</h2>
          <ion-button fill="clear" size="small" (click)="navigateFullRoute()" *ngIf="assignedRoute.length > 0" class="maps-btn">
            <ion-icon name="map" slot="start"></ion-icon>
            Ver no Maps
          </ion-button>
        </div>
        
        <ion-list lines="none" class="transparent-list">
          <ion-item *ngFor="let del of assignedRoute; let idx = index" class="delivery-card assigned">
             <div class="stop-number" slot="start">{{ idx + 1 }}</div>
             <ion-label>
               <h3>{{ del.customerName || 'Cliente Mobile' }}</h3>
               <p class="doc-num">{{ del.documentNumber }}</p>
               <div class="items-list">
                  <span *ngFor="let line of del.lines" class="item-tag">
                    {{ line.quantity }}x {{ line.articleCode }}
                  </span>
               </div>
               <p class="address" *ngIf="del.customerAddress">
                 <ion-icon name="pin-outline"></ion-icon> {{ del.customerAddress }}
               </p>
             </ion-label>
              <ion-button slot="end" fill="clear" color="primary" (click)="navigate(del)">
                 <ion-icon name="navigate" slot="icon-only"></ion-icon>
              </ion-button>
              <ion-button slot="end" fill="clear" color="success" (click)="openFinishModal(del)">
                 <ion-icon name="checkmark-circle" slot="icon-only"></ion-icon>
              </ion-button>
              <ion-button slot="end" fill="clear" color="danger" (click)="cancelClaim(del)">
                 <ion-icon name="close-circle-outline" slot="icon-only"></ion-icon>
              </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- Pending Section -->
      <div class="pending-section">
        <div class="section-header">
          <ion-icon name="cube-outline" color="primary"></ion-icon>
          <h2>Cargas Pendentes</h2>
        </div>
        
        <div *ngIf="pendingDeliveries.length === 0" class="empty-state">
           <ion-icon name="cube-outline"></ion-icon>
           <p>Sem cargas aguardando coleta.</p>
        </div>

        <ion-list lines="none" class="transparent-list">
          <ion-item *ngFor="let del of pendingDeliveries" class="delivery-card pending">
             <ion-label>
               <h3>{{ del.customerName || 'Cliente Mobile' }}</h3>
               <p class="doc-num">{{ del.documentNumber }}</p>
               <div class="items-list">
                  <span *ngFor="let line of del.lines" class="item-tag">
                    {{ line.quantity }}x {{ line.articleCode }}
                  </span>
               </div>
             </ion-label>
             <ion-button slot="end" fill="solid" size="small" color="primary" (click)="claimDelivery(del)">
                ACEITAR
             </ion-button>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  `,
  styles: [`
    .content-dark { --background: #0A0E1A; }
    .transparent-list { background: transparent; padding: 10px; }
    .delivery-card {
      --background: #161B2E; margin-bottom: 12px; border-radius: 16px;
      border: 1px solid #2A3043; --padding-start: 16px;
    }
    .assigned { border-left: 4px solid #2ECC71; }
    .pending { border-left: 4px solid #3498DB; }
    h2 { color: white; margin: 0; font-size: 16px; font-weight: 800; }
    h3 { color: white; font-weight: 700; font-size: 14px; margin: 0; }
    .doc-num { color: #555A6F; font-size: 11px; margin-top: 2px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 0; }
    .section-header ion-icon { font-size: 20px; margin-right: 8px; }
    .stop-number { background: #2ECC71; color: white; height: 24px; width: 24px; border-radius: 50%; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; }
    .item-tag { background: rgba(0,209,255,0.1); color: #00D1FF; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-right: 4px; }
    .address { color: #A0A0A0; font-size: 11px; margin-top: 8px; display: flex; align-items: center; gap: 4px; }
    .empty-state { text-align: center; padding: 40px; color: #555A6F; }
    .empty-state ion-icon { font-size: 48px; opacity: 0.2; margin-bottom: 12px; }
    .maps-btn { font-size: 10px; --color: #2ECC71; }
  `]
})
export class DriverDeliveryPage implements OnInit, OnDestroy {
  pendingDeliveries: any[] = [];
  assignedRoute: any[] = [];
  loading = true;
  private interval: any;

  constructor(
    private authService: AuthService,
    private mobileApi: MobileApiService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {
    addIcons({ mapOutline, navigate, checkmarkCircle, closeCircleOutline, pinOutline, logOutOutline, refreshOutline, map });
  }

  ngOnInit() {
    this.loadDeliveries();
    this.interval = setInterval(() => {
      this.loadDeliveries();
      this.reportLocation();
    }, 20000);
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  async reportLocation() {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.mobileApi.updateStatus({
        truckPlate: localStorage.getItem('truck_plate') || 'T-REGO-001',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }).subscribe();
    } catch (err) {
      console.warn('[GPS-LOGISTIC] Mock Simulation Maputo Enabled');
      const mockLat = -25.968 + (Math.random() * 0.005);
      const mockLng = 32.573 + (Math.random() * 0.005);
      this.mobileApi.updateStatus({
        truckPlate: localStorage.getItem('truck_plate') || 'T-REGO-001',
        lat: mockLat,
        lng: mockLng
      }).subscribe();
    }
  }

  loadDeliveries(event?: any) {
    this.mobileApi.getPendingDeliveries().subscribe((res: any) => {
      this.pendingDeliveries = res;
      if (event) event.target.complete();
    });

    this.mobileApi.getAssignedRoute().subscribe((res: any) => {
      this.assignedRoute = res;
    });
  }

  claimDelivery(del: any) {
    this.mobileApi.claimDelivery(del.id).subscribe(() => {
      this.loadDeliveries();
      alert('Entrega aceita! Agora está na sua rota GPS.');
    });
  }

  async cancelClaim(del: any) {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar Entrega',
      message: 'Tem a certeza que deseja libertar esta entrega?',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Motivo (Ex: Cesto cheio)' }],
      buttons: [
        { text: 'Sair', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: (data) => {
            this.mobileApi.cancelDelivery(del.id, data.reason).subscribe(() => {
              this.loadDeliveries();
            });
          }
        }
      ]
    });
    await alert.present();
  }

  navigate(del: any) {
    if (del.latitude && del.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${del.latitude},${del.longitude}&travelmode=driving`, '_blank');
    } else {
      alert('Erro: Coordenadas GPS não disponíveis para este cliente.');
    }
  }

  navigateFullRoute() {
    if (this.assignedRoute.length === 0) return;
    const waypoints = this.assignedRoute
      .filter(d => d.latitude && d.longitude)
      .map(d => `${d.latitude},${d.longitude}`)
      .join('|');

    if (!waypoints) {
      alert('Nenhuma localização GPS válida na rota.');
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&waypoints=${waypoints}&travelmode=driving`, '_blank');
  }

  async openFinishModal(del: any) {
    // Implement simple finish alert for now
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Entrega',
      message: `Tudo pronto para finalizar a entrega ${del.documentNumber}?`,
      buttons: [
        { text: 'Não', role: 'cancel' },
        {
          text: 'Sim, Finalizar',
          handler: () => {
            // In a real app, this would call /finish-delivery
            alert.dismiss();
            this.loadDeliveries();
          }
        }
      ]
    });
    await alert.present();
  }

  logout() {
    this.authService.logout();
  }
}
