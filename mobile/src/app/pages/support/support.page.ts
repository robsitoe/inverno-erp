import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-support',
    standalone: true,
    imports: [IonicModule, CommonModule],
    template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Suporte Técnico</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="content-dark ion-padding">
      <div class="support-hero">
        <ion-icon name="help-buoy-outline" color="primary"></ion-icon>
        <h2>Como podemos ajudar?</h2>
        <p>Estamos disponíveis para resolver qualquer problema técnico ou dúvida operacional.</p>
      </div>

      <div class="support-channels">
        <div class="channel-card" (click)="openWhatsApp()">
          <ion-icon name="logo-whatsapp" class="whatsapp"></ion-icon>
          <div class="channel-info">
            <h3>WhatsApp</h3>
            <p>Atendimento imediato via chat</p>
          </div>
          <ion-icon name="chevron-forward-outline" slot="end"></ion-icon>
        </div>

        <div class="channel-card" (click)="makeCall()">
          <ion-icon name="call-outline" class="call"></ion-icon>
          <div class="channel-info">
            <h3>Chamada Telefónica</h3>
            <p>Fale com um técnico agora</p>
          </div>
          <ion-icon name="chevron-forward-outline" slot="end"></ion-icon>
        </div>

        <div class="channel-card">
          <ion-icon name="mail-outline" class="email"></ion-icon>
          <div class="channel-info">
            <h3>E-mail</h3>
            <p>suporte@inverno-erp.com</p>
          </div>
          <ion-icon name="chevron-forward-outline" slot="end"></ion-icon>
        </div>
      </div>

      <div class="faq-section">
        <h3 class="section-title">Perguntas Frequentes</h3>
        <ion-list lines="full" class="dark-list">
          <ion-item detail="true">
            <ion-label>Como alterar a minha senha?</ion-label>
          </ion-item>
          <ion-item detail="true">
            <ion-label>Como anexar documentos em falta?</ion-label>
          </ion-item>
          <ion-item detail="true">
            <ion-label>O que fazer se o pagamento falhar?</ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  `,
    styles: [`
    .content-dark { --background: #0A0E1A; }
    .support-hero { text-align: center; padding: 40px 20px; }
    .support-hero ion-icon { font-size: 80px; margin-bottom: 16px; opacity: 0.8; }
    h2 { color: white; font-weight: 800; font-size: 24px; margin: 0 0 8px; }
    p { color: #A0A0A0; font-size: 14px; margin: 0; line-height: 1.5; }

    .support-channels { margin-top: 20px; }
    .channel-card {
      background: #161B2E; border-radius: 16px; padding: 16px;
      display: flex; align-items: center; gap: 16px; margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,0.02);
    }
    .channel-card:active { transform: scale(0.98); background: #1A2340; }
    .channel-card ion-icon:first-child { font-size: 32px; }
    .whatsapp { color: #25D366; }
    .call { color: #00D1FF; }
    .email { color: #eee; }
    
    .channel-info { flex: 1; }
    .channel-info h3 { color: white; margin: 0 0 2px; font-size: 16px; font-weight: 700; }
    .channel-info p { color: #555A6F; font-size: 12px; margin: 0; }
    .channel-card ion-icon[name="chevron-forward-outline"] { color: #555A6F; font-size: 18px; }

    .faq-section { margin-top: 30px; }
    .section-title { color: white; font-size: 18px; font-weight: 700; margin-bottom: 15px; }
    .dark-list { background: transparent; border-radius: 16px; overflow: hidden; }
    ion-item {
      --background: #161B2E; --color: white;
      --border-color: rgba(255,255,255,0.05);
      font-size: 14px; font-weight: 500;
    }
  `]
})
export class SupportPage {
    constructor() { }

    openWhatsApp() {
        window.open('https://wa.me/258840000000', '_blank');
    }

    makeCall() {
        window.open('tel:+258840000000', '_system');
    }
}
