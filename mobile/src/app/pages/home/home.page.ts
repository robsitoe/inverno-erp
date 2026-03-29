import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title>Início</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()">
            <ion-icon slot="icon-only" name="log-out-outline" color="danger"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding content-dark">
      <div class="welcome-section">
        <h2>Olá, {{ user?.name }}!</h2>
        <p class="company-name">{{ user?.company?.name || 'Inverno ERP' }}</p>
      </div>

      <!-- Status Card for Pending Users -->
      <div *ngIf="isPending" class="status-card pending">
        <div class="icon-circle">
          <ion-icon name="time-outline"></ion-icon>
        </div>
        <div class="status-info">
          <h3>Registo em Análise</h3>
          <p>A sua conta está a ser verificada pela administração. Brevemente terá acesso às encomendas.</p>
        </div>
      </div>

      <!-- Status Card for Approved Users -->
      <div *ngIf="!isPending" class="status-card approved">
        <div class="icon-circle">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
        </div>
        <div class="status-info">
          <h3>Conta Ativa</h3>
          <p>O seu perfil de {{ userRole }} está autorizado. Podes começar a operar.</p>
        </div>
      </div>

      <!-- Location Warning for Resellers without points -->
      <div *ngIf="!isPending && user?.customerId && !hasPoints" class="status-card warning" (click)="goToDeliveryPoints()">
        <div class="icon-circle">
          <ion-icon name="location-outline"></ion-icon>
        </div>
        <div class="status-info">
          <h3>Localização Pendente</h3>
          <p>Para encomendar, deve primeiro registrar o seu posto de entrega. Clique aqui para configurar.</p>
        </div>
        <ion-icon name="chevron-forward" slot="end" class="arrow-icon"></ion-icon>
      </div>

      <!-- Quick Actions -->
      <div class="section-header">
        <h3 class="text-white">Ações Rápidas</h3>
      </div>

      <div class="grid-actions">
        <div class="action-item" (click)="goToOrders()">
          <div class="action-icon orders">
            <ion-icon name="cart-outline"></ion-icon>
          </div>
          <span>{{ user?.employeeId ? 'Entregas' : 'Encomendas' }}</span>
        </div>

        <div class="action-item" (click)="goToHistory()">
          <div class="action-icon history">
            <ion-icon name="time-outline"></ion-icon>
          </div>
          <span>Histórico</span>
        </div>
        
        <div class="action-item" (click)="goToProfile()">
          <div class="action-icon profile">
            <ion-icon name="person-outline"></ion-icon>
          </div>
          <span>O meu Perfil</span>
        </div>

        <div class="action-item" (click)="goToSupport()">
          <div class="action-icon support">
            <ion-icon name="help-buoy-outline"></ion-icon>
          </div>
          <span>Suporte</span>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .content-dark { --background: #0A0E1A; }
    .welcome-section { margin-top: 10px; margin-bottom: 25px; }
    h2 { color: white; font-weight: 800; font-size: 24px; margin-bottom: 4px; }
    .company-name { color: #00D1FF; font-weight: 600; font-size: 14px; }

    .status-card {
      border-radius: 20px; padding: 20px; display: flex; gap: 16px; align-items: center;
      margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.05);
    }
    .status-card.pending { background: linear-gradient(135deg, #1A1C30 0%, #161B2E 100%); border-left: 4px solid #FFA500; }
    .status-card.approved { background: linear-gradient(135deg, #1A2E2A 0%, #161B2E 100%); border-left: 4px solid #2ECC71; }
    
    .icon-circle {
      width: 48px; h-height: 48px; min-width: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 24px;
    }
    .pending .icon-circle { background: rgba(255, 165, 0, 0.1); color: #FFA500; }
    .approved .icon-circle { background: rgba(46, 204, 113, 0.1); color: #2ECC71; }
    
    .status-info h3 { color: white; margin: 0 0 6px; font-size: 16px; font-weight: 700; }
    .status-info p { color: #A0A0A0; font-size: 13px; margin: 0; line-height: 1.4; }

    .status-card.warning { 
      background: linear-gradient(135deg, #2D2010 0%, #161B2E 100%); 
      border-left: 4px solid #F1C40F; 
      cursor: pointer;
    }
    .warning .icon-circle { background: rgba(241, 196, 15, 0.1); color: #F1C40F; }
    .arrow-icon { color: #555; font-size: 20px; }

    .section-header { margin-bottom: 15px; }
    .grid-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .action-item {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 15px 10px; background: #161B2E; border-radius: 16px; transition: 0.3s;
    }
    .action-item:active { background: #1A2340; transform: scale(0.95); }
    .action-icon {
      width: 45px; height: 45px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; font-size: 22px;
    }
    .action-icon.orders { background: rgba(0, 209, 255, 0.1); color: #00D1FF; }
    .action-icon.history { background: rgba(46, 204, 113, 0.1); color: #2ECC71; }
    .action-icon.profile { background: rgba(160, 160, 160, 0.1); color: #A0A0A0; }
    .action-icon.support { background: rgba(255, 255, 255, 0.05); color: #eee; }
    .action-item span { color: white; font-size: 11px; font-weight: 600; text-align: center; }
  `]
})
export class HomePage implements OnInit {
  user: any;
  isPending = false;
  hasPoints = true; // Assume true to avoid flicker
  userRole = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.authService.refreshProfile().subscribe();

    // Subscribe to user changes
    this.authService.user$.subscribe(user => {
      this.user = user;
      this.updateStatus();
    });
  }

  ionViewWillEnter() {
    this.authService.refreshProfile().subscribe();
  }

  updateStatus() {
    this.isPending = this.user?.status !== 'APPROVED';
    this.userRole = this.user?.customerId ? 'Revendedor' : 'Motorista';

    if (!this.isPending && this.user?.customerId) {
      this.authService.getDeliveryPoints().subscribe((points: any) => {
        this.hasPoints = points.length > 0;
      });
    }
  }

  logout() {
    this.authService.logout();
  }

  goToOrders() {
    const tab = this.user?.employeeId ? 'delivery' : 'order';
    this.router.navigate([`/tabs/${tab}`]);
  }

  goToHistory() {
    this.router.navigate(['/tabs/history']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  goToSupport() {
    this.router.navigate(['/support']);
  }

  goToDeliveryPoints() {
    this.router.navigate(['/delivery-points']);
  }
}
