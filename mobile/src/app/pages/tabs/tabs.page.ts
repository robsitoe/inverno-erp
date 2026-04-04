import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { homeOutline, cartOutline, notificationsOutline, timeOutline, bicycleOutline, mapOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" color="dark">
        <ion-tab-button tab="home">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Início</ion-label>
        </ion-tab-button>

        <ion-tab-button [tab]="middleTab">
          <ion-icon [name]="middleIcon"></ion-icon>
          <ion-label>{{ middleLabel }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="notifications" layout="icon-top">
          <ion-icon name="notifications-outline"></ion-icon>
          <ion-label>Notificações</ion-label>
          <ion-badge color="danger" *ngIf="unreadCount > 0">{{ unreadCount }}</ion-badge>
        </ion-tab-button>

        <ion-tab-button tab="tracking" layout="icon-top">
          <ion-icon name="map-outline"></ion-icon>
          <ion-label>GPS</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="history" layout="icon-top">
          <ion-icon name="time-outline"></ion-icon>
          <ion-label>Histórico</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --border: none;
      --background: #161B2E;
      border-top: 1px solid #2A3043;
      height: 65px;
    }
    ion-tab-button {
      --color: #555A6F;
      --color-selected: #00D1FF;
    }
    ion-icon { font-size: 24px; margin-bottom: 2px; }
    ion-label { font-size: 11px; font-weight: 600; }
  `]
})
export class TabsPage {
  middleTab = 'order';
  middleLabel = 'Encomendas';
  middleIcon = 'cart-outline';
  unreadCount = 0;

  constructor(private authService: AuthService) {
    addIcons({ homeOutline, cartOutline, notificationsOutline, timeOutline, bicycleOutline, mapOutline });

    const user = this.authService.user;
    if (user?.employeeId) {
      this.middleTab = 'delivery';
      this.middleLabel = 'Entregas';
      this.middleIcon = 'bicycle-outline';
    }
  }
}
