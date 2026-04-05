import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [IonicModule, CommonModule],
    template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title>Notificações</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="content-dark">
      <div class="notifications-list">
        <div *ngFor="let n of notifications" class="notification-item" [class.unread]="!n.read">
          <div class="icon-box" [class]="n.type">
            <ion-icon [name]="getIcon(n.type)"></ion-icon>
          </div>
          <div class="notif-content">
            <div class="notif-header">
              <h3>{{ n.title }}</h3>
              <span class="time">{{ n.time }}</span>
            </div>
            <p>{{ n.message }}</p>
          </div>
        </div>

        <div *ngIf="notifications.length === 0" class="empty-state">
          <ion-icon name="notifications-off-outline"></ion-icon>
          <p>Não tens novas notificações</p>
        </div>
      </div>
    </ion-content>
  `,
    styles: [`
    .content-dark { --background: #0A0E1A; }
    .notifications-list { padding: 10px; }
    .notification-item {
      background: #161B2E; border-radius: 16px; padding: 16px;
      display: flex; gap: 14px; margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,0.02);
    }
    .notification-item.unread { border-left: 3px solid #00D1FF; background: #1A2340; }
    
    .icon-box {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }
    .icon-box.info { background: rgba(0, 209, 255, 0.1); color: #00D1FF; }
    .icon-box.success { background: rgba(46, 204, 113, 0.1); color: #2ECC71; }
    .icon-box.warning { background: rgba(255, 165, 0, 0.1); color: #FFA500; }

    .notif-content { flex: 1; }
    .notif-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .notif-header h3 { color: white; margin: 0; font-size: 14px; font-weight: 700; }
    .time { color: #555A6F; font-size: 10px; }
    .notif-content p { color: #A0A0A0; font-size: 12px; margin: 0; line-height: 1.4; }

    .empty-state { text-align: center; color: #555A6F; padding-top: 60px; }
    .empty-state ion-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.2; }
  `]
})
export class NotificationsPage implements OnInit {
    notifications = [
        {
            title: 'Registo Submetido',
            message: 'O seu pedido de registo foi enviado e está em análise.',
            time: 'Agora',
            type: 'info',
            read: false
        },
        {
            title: 'Dica de Segurança',
            message: 'Mantenha os cilindros sempre na vertical durante o transporte.',
            time: '2h atrás',
            type: 'warning',
            read: true
        },
        {
            title: 'Bem-vindo ao Inverno!',
            message: 'Explore a aplicação e conheça as nossas funcionalidades.',
            time: '1d atrás',
            type: 'success',
            read: true
        }
    ];

    constructor() { }
    ngOnInit() { }

    getIcon(type: string) {
        if (type === 'success') return 'checkmark-circle-outline';
        if (type === 'warning') return 'alert-circle-outline';
        return 'information-circle-outline';
    }
}
