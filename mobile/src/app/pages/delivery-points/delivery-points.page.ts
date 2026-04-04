import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Geolocation } from '@capacitor/geolocation';

@Component({
    selector: 'app-delivery-points',
    standalone: true,
    imports: [CommonModule, IonicModule, FormsModule],
    template: `
    <ion-header [translucent]="true" class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Pontos de Entrega</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="dark-content ion-padding">
      <div class="header-section">
        <p class="subtitle">Faça a gestão dos seus postos de entrega de gás. Estas localizações ajudam os motoristas a chegar até si.</p>
      </div>

      <div *ngIf="loading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>

      <ion-list lines="none" class="transparent-list" *ngIf="!loading">
        <div *ngFor="let point of points" class="point-card" [class.is-default]="point.isDefault">
          <div class="card-content">
            <div class="info">
              <div class="title-row">
                <h3>{{ point.name }}</h3>
                <ion-badge color="success" mode="ios" *ngIf="point.isDefault">Principal</ion-badge>
              </div>
              <p class="address">{{ point.address || 'Sem morada descritiva' }}</p>
              <p class="coords">GPS: {{ point.latitude | number:'1.4-4' }}, {{ point.longitude | number:'1.4-4' }}</p>
            </div>
            <div class="actions">
              <ion-button fill="clear" color="primary" (click)="editPoint(point)">
                <ion-icon name="create-outline"></ion-icon>
              </ion-button>
              <ion-button fill="clear" color="danger" (click)="deletePoint(point)" *ngIf="!point.isDefault || points.length === 1">
                <ion-icon name="trash-outline"></ion-icon>
              </ion-button>
            </div>
          </div>
        </div>
      </ion-list>

      <div *ngIf="!loading && points.length === 0" class="empty-state">
        <ion-icon name="location-outline"></ion-icon>
        <p>Ainda não registrou nenhum ponto de entrega.</p>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button (click)="addPoint()">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
    styles: [`
    .dark-content { --background: #0A0E1A; }
    .header-section { margin-bottom: 20px; }
    .subtitle { color: #A0A0A0; font-size: 13px; line-height: 1.5; }
    .transparent-list { background: transparent; }
    .point-card {
      background: #161B2E; border-radius: 16px; margin-bottom: 15px;
      border: 1px solid rgba(255,255,255,0.05); padding: 16px;
      transition: 0.3s;
    }
    .point-card.is-default { border-left: 4px solid #2ECC71; }
    .card-content { display: flex; justify-content: space-between; align-items: flex-start; }
    .info { flex: 1; }
    .title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    h3 { color: white; font-weight: bold; margin: 0; font-size: 16px; }
    .address { color: #A0A0A0; font-size: 12px; margin-bottom: 4px; }
    .coords { color: #00D1FF; font-size: 10px; font-weight: 600; font-family: monospace; }
    .actions { display: flex; flex-direction: column; }
    .empty-state { text-align: center; color: #555; padding-top: 50px; }
    .empty-state ion-icon { font-size: 64px; opacity: 0.2; }
  `]
})
export class DeliveryPointsPage implements OnInit {
    points: any[] = [];
    loading = true;

    constructor(
        private authService: AuthService,
        private alertCtrl: AlertController,
        private loadingCtrl: LoadingController
    ) { }

    ngOnInit() {
        this.loadPoints();
    }

    loadPoints() {
        this.authService.getDeliveryPoints().subscribe({
            next: (res: any) => {
                this.points = res;
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    async addPoint() {
        this.promptForLocation('Novo Ponto de Entrega');
    }

    async editPoint(point: any) {
        this.promptForLocation('Editar Ponto', point);
    }

    private async promptForLocation(header: string, point?: any) {
        const loader = await this.loadingCtrl.create({ message: 'A obter localização...' });
        await loader.present();

        try {
            const position = await this.getCurrentPosition();
            loader.dismiss();

            const alert = await this.alertCtrl.create({
                header,
                message: point ? 'Atualize os dados do seu posto.' : 'Um novo posto será criado na sua localização atual.',
                inputs: [
                    { name: 'name', type: 'text', placeholder: 'Ex: Posto Principal', value: point?.name || '' },
                    { name: 'address', type: 'text', placeholder: 'Referência (opcional)', value: point?.address || '' }
                ],
                buttons: [
                    { text: 'Cancelar', role: 'cancel' },
                    {
                        text: point ? 'Atualizar' : 'Guardar',
                        handler: (data) => {
                            if (!data.name) return false;
                            const payload = {
                                ...data,
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            };
                            if (point) {
                                this.authService.updateDeliveryPoint(point.id, payload).subscribe(() => this.loadPoints());
                            } else {
                                this.authService.createDeliveryPoint(payload).subscribe(() => this.loadPoints());
                            }
                            return true;
                        }
                    }
                ]
            });
            await alert.present();
        } catch (err) {
            loader.dismiss();
            const alert = await this.alertCtrl.create({
                header: 'Erro de Localização',
                message: 'Não foi possível obter a sua localização GPS automaticamente. Deseja inserir as coordenadas manualmente?',
                buttons: [
                    { text: 'Cancelar', role: 'cancel' },
                    {
                        text: 'Inserir Manualmente',
                        handler: () => {
                            this.promptManualLocation(header, point);
                        }
                    }
                ]
            });
            await alert.present();
        }
    }

    private async promptManualLocation(header: string, point?: any) {
        const alert = await this.alertCtrl.create({
            header: 'Inserir Coordenadas',
            message: 'Insira a latitude e longitude do posto.',
            inputs: [
                { name: 'name', type: 'text', placeholder: 'Nome do Posto', value: point?.name || '' },
                { name: 'address', type: 'text', placeholder: 'Referência', value: point?.address || '' },
                { name: 'latitude', type: 'number', placeholder: 'Latitude (Ex: -25.9)', value: point?.latitude || '' },
                { name: 'longitude', type: 'number', placeholder: 'Longitude (Ex: 32.5)', value: point?.longitude || '' }
            ],
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Guardar',
                    handler: (data) => {
                        if (!data.name || !data.latitude || !data.longitude) return false;
                        const payload = {
                            ...data,
                            latitude: parseFloat(data.latitude),
                            longitude: parseFloat(data.longitude)
                        };
                        if (point) {
                            this.authService.updateDeliveryPoint(point.id, payload).subscribe(() => this.loadPoints());
                        } else {
                            this.authService.createDeliveryPoint(payload).subscribe(() => this.loadPoints());
                        }
                        return true;
                    }
                }
            ]
        });
        await alert.present();
    }

    private async getCurrentPosition(): Promise<any> {
        try {
            // Priority: Capacitor Geolocation for native bypass of HTTP restrictions
            return await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        } catch (e) {
            // Fallback to browser geolocation just in case it's a legacy environment
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });
        }
    }

    async deletePoint(point: any) {
        const alert = await this.alertCtrl.create({
            header: 'Confirmar',
            message: `Deseja remover o posto "${point.name}"?`,
            buttons: [
                { text: 'Não', role: 'cancel' },
                {
                    text: 'Sim, Remover',
                    role: 'destructive',
                    handler: () => {
                        this.authService.deleteDeliveryPoint(point.id).subscribe(() => this.loadPoints());
                    }
                }
            ]
        });
        await alert.present();
    }
}
