import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>O meu Perfil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="content-dark">
      <div class="profile-header">
        <div class="avatar-circle">
          <ion-icon name="person-outline"></ion-icon>
        </div>
        <h2>{{ user?.name }}</h2>
        <p>{{ user?.email || 'Sem email associado' }}</p>
        <ion-badge color="primary" mode="ios">{{ userRole }}</ion-badge>
      </div>

      <ion-list lines="full" class="dark-list">
        <ion-item>
          <ion-icon slot="start" name="business-outline" color="primary"></ion-icon>
          <ion-label>
            <h3>Empresa</h3>
            <p>{{ user?.company?.name || 'Inverno ERP' }}</p>
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-icon slot="start" name="call-outline" color="primary"></ion-icon>
          <ion-label>
            <h3>Telefone</h3>
            <p>{{ user?.phone || 'Não definido' }}</p>
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-icon slot="start" name="key-outline" color="primary"></ion-icon>
          <ion-label>
            <h3>ID de Utilizador</h3>
            <p>{{ user?.id }}</p>
          </ion-label>
        </ion-item>

        <ion-item *ngIf="user?.customerId" button (click)="goToDeliveryPoints()">
          <ion-icon slot="start" name="location-outline" color="primary"></ion-icon>
          <ion-label>
            <h3>Postos de Entrega</h3>
            <p>Gerir localizações</p>
          </ion-label>
          <ion-icon name="chevron-forward" slot="end" size="small" color="medium"></ion-icon>
        </ion-item>
      </ion-list>

      <div class="ion-padding mt-4">
        <ion-button expand="block" shape="round" color="danger" fill="outline" (click)="logout()">
          Sair da Conta
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .content-dark { --background: #0A0E1A; }
    .profile-header {
      padding: 40px 20px; text-align: center;
      background: linear-gradient(to bottom, #161B2E 0%, #0A0E1A 100%);
    }
    .avatar-circle {
      width: 100px; height: 100px; border-radius: 50%;
      background: rgba(0, 209, 255, 0.1); color: #00D1FF;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 48px;
      border: 2px solid rgba(0, 209, 255, 0.2);
    }
    h2 { color: white; margin: 0 0 4px; font-weight: 800; }
    p { color: #A0A0A0; margin: 0 0 12px; font-size: 14px; }

    .dark-list { background: transparent; margin-top: 20px; }
    ion-item {
      --background: #161B2E; --color: white;
      --border-color: rgba(255,255,255,0.05);
      margin-bottom: 2px;
    }
    h3 { color: #555A6F; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
    ion-label p { color: white !important; font-size: 15px !important; font-weight: 500; }
    .mt-4 { margin-top: 32px; }
  `]
})
export class ProfilePage implements OnInit {
  user: any;
  userRole = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.user = this.authService.user;
    this.userRole = this.user?.customerId ? 'Revendedor' : 'Motorista';
  }

  goToDeliveryPoints() {
    this.router.navigate(['/delivery-points']);
  }

  logout() {
    this.authService.logout();
  }
}
