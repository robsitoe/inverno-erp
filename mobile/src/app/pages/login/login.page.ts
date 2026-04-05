import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule],
  template: `
    <ion-content [fullscreen]="true" class="login-content">
      <div class="login-container">
        <div class="logo-section">
          <div class="logo-icon">
            <ion-icon name="flame"></ion-icon>
          </div>
          <h1>Inverno Go</h1>
          <p>Gestão de Distribuição de Gás</p>
        </div>

        <div class="form-section">
          <ion-item lines="none" class="custom-input">
            <ion-icon name="person-outline" slot="start"></ion-icon>
            <ion-input type="text" placeholder="Utilizador" [(ngModel)]="username"></ion-input>
          </ion-item>

          <ion-item lines="none" class="custom-input">
            <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
            <ion-input type="password" placeholder="Palavra-passe" [(ngModel)]="password"></ion-input>
          </ion-item>

          <ion-button expand="block" shape="round" color="primary" class="login-btn" (click)="login()">
            <span *ngIf="!loading">Entrar</span>
            <ion-spinner *ngIf="loading" name="crescent"></ion-spinner>
          </ion-button>
          
          <div class="footer-links">
            <p class="forgot-pwd">Esqueceu a palavra-passe?</p>
            <p class="register-link" routerLink="/register">Novo aqui? <b>Registe-se</b></p>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-content { --background: #0A0E1A; }
    .login-container {
      display: flex; flex-direction: column;
      height: 100%; justify-content: space-around;
      padding: 40px 30px;
    }
    .logo-section { text-align: center; }
    .logo-icon {
      background: linear-gradient(135deg, #00D1FF 0%, #0070F3 100%);
      width: 80px; height: 80px; border-radius: 20px;
      margin: 0 auto 20px; display: flex; align-items: center;
      justify-content: center; font-size: 40px; color: white;
      box-shadow: 0 10px 20px rgba(0, 209, 255, 0.3);
    }
    h1 { color: white; margin: 0; font-weight: 800; font-size: 32px; }
    p { color: #A0A0A0; font-size: 14px; margin-top: 8px; }
    
    .form-section { border-radius: 30px; }
    .custom-input {
      --background: #161B2E;
      --border-radius: 16px;
      margin-bottom: 20px;
      padding: 8px 16px;
      border: 1px solid #2A3043;
      color: white;
    }
    .custom-input ion-icon { color: #00D1FF; margin-right: 12px; }
    ion-input { --placeholder-color: #555A6F; }
    
    .login-btn { --height: 56px; margin-top: 30px; font-weight: bold; font-size: 18px; }
    .footer-links { margin-top: 20px; text-align: center; }
    .forgot-pwd { color: #4A5568; font-weight: 500; font-size: 13px; margin: 0; }
    .register-link { color: #00D1FF; font-size: 14px; margin-top: 12px; cursor: pointer; }
    .register-link b { text-decoration: underline; }
  `]
})
export class LoginPage {
  username = '';
  password = '';
  loading = false;

  constructor(private authService: AuthService) { }

  async login() {
    if (!this.username || !this.password) return;
    this.loading = true;

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        alert('Falha no login. Verifique as credenciais.');
      }
    });
  }
}
