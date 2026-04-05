import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MobileApiService } from '../../services/mobile-api.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, IonicModule, FormsModule, RouterModule],
    template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Criar Conta</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="register-content">
      <div class="register-container">
        <div class="header-text">
          <h2>Junte-se à Rede</h2>
          <p>Escolha o seu perfil para começar</p>
        </div>

        <div class="role-selector">
          <div 
            class="role-card" 
            [class.active]="role === 'RESELLER'"
            (click)="role = 'RESELLER'">
            <ion-icon name="storefront-outline"></ion-icon>
            <span>Revendedor</span>
          </div>
          <div 
            class="role-card" 
            [class.active]="role === 'DRIVER'"
            (click)="role = 'DRIVER'">
            <ion-icon name="truck-outline"></ion-icon>
            <span>Motorista</span>
          </div>
        </div>

        <div class="form-section">
          <ion-item lines="none" class="custom-input">
            <ion-select label="Empresa" label-placement="floating" placeholder="Selecione a sua empresa" [(ngModel)]="selectedCompanyId" class="w-full">
              <ion-select-option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="custom-input">
            <ion-input type="text" placeholder="Nome Completo / Empresa" [(ngModel)]="name"></ion-input>
          </ion-item>
          <ion-item lines="none" class="custom-input">
            <ion-input type="text" placeholder="Utilizador (Login)" [(ngModel)]="username"></ion-input>
          </ion-item>
          <ion-item lines="none" class="custom-input">
            <ion-input type="tel" placeholder="Telefone de Contacto" [(ngModel)]="phone"></ion-input>
          </ion-item>
          <ion-item lines="none" class="custom-input" *ngIf="role === 'RESELLER'">
            <ion-input type="text" placeholder="NUIT (NIF) da Empresa" [(ngModel)]="nuit"></ion-input>
          </ion-item>
          <ion-item lines="none" class="custom-input">
            <ion-input type="password" placeholder="Palavra-passe" [(ngModel)]="password"></ion-input>
          </ion-item>

          <!-- Document Section for Resellers -->
          <div *ngIf="role === 'RESELLER'" class="docs-section">
            <h3 class="section-title">Documentação Obrigatória</h3>
            
            <div class="doc-item" (click)="pickFile('alvara')">
              <ion-icon name="document-text-outline"></ion-icon>
              <span>{{ attachments.alvara || 'Anexar Alvará Comercial' }}</span>
              <ion-icon slot="end" name="checkmark-circle" color="success" *ngIf="attachments.alvara"></ion-icon>
            </div>

            <div class="doc-item" (click)="pickFile('nuit')">
              <ion-icon name="card-outline"></ion-icon>
              <span>{{ attachments.nuit || 'Anexar NUIT da Empresa' }}</span>
              <ion-icon slot="end" name="checkmark-circle" color="success" *ngIf="attachments.nuit"></ion-icon>
            </div>

            <div class="doc-item" (click)="pickFile('photo')">
              <ion-icon name="camera-outline"></ion-icon>
              <span>{{ attachments.photo ? 'Foto do Local Anexada' : 'Foto das Instalações' }}</span>
              <ion-icon slot="end" name="checkmark-circle" color="success" *ngIf="attachments.photo"></ion-icon>
            </div>
          </div>

          <ion-button expand="block" shape="round" color="primary" class="register-btn" (click)="register()">
            <span *ngIf="!loading">Submeter Pedido</span>
            <ion-spinner *ngIf="loading" name="crescent"></ion-spinner>
          </ion-button>
          
          <p class="info-text">
            * Todos os registos mobile requerem validação e aprovação da administração.
          </p>
          <p class="back-link" routerLink="/login">Já tem conta? <b>Faça Login</b></p>
        </div>
      </div>
    </ion-content>
  `,
    styles: [`
    .register-content { --background: #0A0E1A; }
    .register-container { padding: 20px; padding-bottom: 60px; }
    .header-text { margin: 10px 0 30px; text-align: center; }
    h2 { color: white; font-weight: 800; font-size: 26px; margin-bottom: 8px; }
    p { color: #A0A0A0; font-size: 14px; }
    
    .role-selector { display: flex; gap: 16px; margin-bottom: 25px; }
    .role-card {
      flex: 1; background: #161B2E; border-radius: 20px;
      padding: 16px; display: flex; flex-direction: column;
      align-items: center; border: 2px solid transparent;
      transition: 0.3s; color: #555A6F;
    }
    .role-card ion-icon { font-size: 28px; margin-bottom: 6px; }
    .role-card span { font-weight: 600; font-size: 13px; }
    .role-card.active {
      border-color: #00D1FF; background: #1A2340; color: white;
      box-shadow: 0 0 15px rgba(0, 209, 255, 0.15);
    }

    .custom-input {
      --background: #161B2E; --border-radius: 16px;
      margin-bottom: 12px; padding: 2px 14px;
      border: 1px solid #2A3043; color: white;
    }

    .docs-section { margin-top: 20px; margin-bottom: 10px; }
    .section-title { color: white; font-size: 14px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #2A3043; padding-bottom: 8px; }
    .doc-item {
      background: #161B2E; border-radius: 12px; padding: 12px 16px;
      margin-bottom: 10px; display: flex; align-items: center;
      gap: 12px; border: 1px dashed #4A5568; color: #A0A0A0;
      cursor: pointer; position: relative;
    }
    .doc-item span { font-size: 13px; flex: 1; }
    .doc-item ion-icon { font-size: 20px; }

    .register-btn { --height: 56px; margin-top: 25px; font-weight: bold; }
    .info-text { color: #888; font-size: 11px; font-style: italic; margin-top: 16px; text-align: center; }
    .back-link { text-align: center; color: #4A5568; margin-top: 20px; font-size: 14px; cursor: pointer; }
    .back-link b { color: #00D1FF; text-decoration: underline; }
  `]
})
export class RegisterPage implements OnInit {
    role: 'RESELLER' | 'DRIVER' = 'RESELLER';
    name = '';
    username = '';
    phone = '';
    nuit = '';
    password = '';
    selectedCompanyId = '';
    companies: any[] = [];
    loading = false;

    // Document attachments
    attachments: any = {
        alvara: null,
        nuit: null,
        photo: null
    };

    constructor(
        private authService: AuthService,
        private mobileService: MobileApiService,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadCompanies();
    }

    loadCompanies() {
        this.mobileService.getCompanies().subscribe({
            next: (data) => {
                this.companies = data;
                if (this.companies.length > 0) {
                    this.selectedCompanyId = this.companies[0].id;
                }
            },
            error: (err) => console.error('Erro ao carregar empresas:', err)
        });
    }

    pickFile(type: 'alvara' | 'nuit' | 'photo') {
        // Simulating file picker. In production this would use Capacitor FilePicker or Camera
        const filenames: any = {
            alvara: 'alvara_comercial.pdf',
            nuit: 'nuit_document.jpg',
            photo: 'local_instalações.png'
        };
        this.attachments[type] = filenames[type];
        console.log(`Ficheiro selecionado para ${type}: ${filenames[type]}`);
    }

    async register() {
        if (!this.username || !this.password || !this.name || !this.selectedCompanyId) {
            alert('Por favor, preencha todos os campos, incluindo a empresa.');
            return;
        }

        if (this.role === 'RESELLER' && (!this.attachments.alvara || !this.attachments.nuit)) {
            alert('É obrigatório anexar o Alvará e o NUIT para o perfil de Revendedor.');
            return;
        }

        this.loading = true;

        this.authService.register({
            role: this.role,
            name: this.name,
            username: this.username,
            phone: this.phone,
            nuit: this.nuit,
            password: this.password,
            companyId: this.selectedCompanyId,
            attachments: this.attachments
        }).subscribe({
            next: () => {
                this.loading = false;
                alert('Pedido de registo enviado com sucesso! A administração irá analisar os seus documentos e entrará em contacto.');
                this.router.navigate(['/login']);
            },
            error: (err: any) => {
                this.loading = false;
                console.error('Erro no registo:', err);
                const msg = err.error?.message || 'Erro de conexão ou utilizador já existe.';
                alert('Erro: ' + msg);
            }
        });
    }
}
