import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MobileApiService } from '../../services/mobile-api.service';
import { LocationService } from '../../services/location.service';
import { addIcons } from 'ionicons';
import {
  flame, add, remove, cart, checkmark, close, refresh,
  locationOutline, personOutline, callOutline, cashOutline, cubeOutline,
  warningOutline, receiptOutline, arrowBackOutline
} from 'ionicons/icons';

interface GasType {
  id: string;
  name: string;
  code?: string;
  articleId?: string;
  articleCode?: string;
  price?: number;
  capacity?: number;
}

interface CartLine {
  typeId: string;
  name: string;
  articleId: string;
  articleCode: string;
  unitPrice: number;
  quantity: number;
  available: number;
}

@Component({
  selector: 'app-driver-gas-sale',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goBack()"><ion-icon name="arrow-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Venda de Gás</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="loadAll()"><ion-icon name="refresh"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="content-dark">

      <!-- Truck Header -->
      <div class="truck-banner">
        <div class="flex-row">
          <ion-icon name="cube-outline" class="truck-icon"></ion-icon>
          <div>
            <p class="label">Viatura</p>
            <h2>{{ truckPlate || 'Sem viatura' }}</h2>
          </div>
        </div>
        <div class="stock-pill" [class.empty]="totalStock === 0">
          {{ totalStock }} cheias em stock
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="center-msg">
        <ion-spinner name="crescent"></ion-spinner>
        <p>A carregar inventário da viatura...</p>
      </div>

      <!-- No stock warning -->
      <div *ngIf="!loading && gasTypes.length === 0" class="center-msg">
        <ion-icon name="warning-outline" class="big-icon"></ion-icon>
        <p>Sem tipos de gás disponíveis.</p>
        <p class="hint">Verifique a configuração no escritório.</p>
      </div>

      <!-- Gas type list -->
      <div *ngIf="!loading && gasTypes.length > 0" class="section">
        <h3 class="section-title">Cilindros Disponíveis</h3>
        <div class="card" *ngFor="let g of gasTypes">
          <div class="card-row">
            <div class="gas-info">
              <div class="gas-icon"><ion-icon name="flame"></ion-icon></div>
              <div>
                <h3>{{ g.name }}</h3>
                <p class="price">{{ g.price | number:'1.2-2' }} MZN</p>
                <p class="avail" [class.zero]="getAvailable(g) === 0">
                  {{ getAvailable(g) }} disponível
                </p>
              </div>
            </div>
            <div class="qty-control">
              <ion-button fill="clear" size="small" (click)="dec(g)" [disabled]="getQty(g) === 0">
                <ion-icon name="remove"></ion-icon>
              </ion-button>
              <span class="qty">{{ getQty(g) }}</span>
              <ion-button fill="clear" size="small" (click)="inc(g)" [disabled]="getQty(g) >= getAvailable(g)">
                <ion-icon name="add"></ion-icon>
              </ion-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer + Payment (only if cart has items) -->
      <div *ngIf="cartCount > 0" class="section">
        <h3 class="section-title">Dados da Venda</h3>
        <div class="card">
          <ion-item class="dark-item">
            <ion-icon name="person-outline" slot="start"></ion-icon>
            <ion-input label="Cliente" labelPlacement="stacked" [(ngModel)]="customerName" placeholder="Nome do cliente"></ion-input>
          </ion-item>
          <ion-item class="dark-item">
            <ion-icon name="call-outline" slot="start"></ion-icon>
            <ion-input label="Telefone" labelPlacement="stacked" type="tel" [(ngModel)]="customerPhone" placeholder="84/85..."></ion-input>
          </ion-item>
          <ion-item class="dark-item">
            <ion-icon name="cash-outline" slot="start"></ion-icon>
            <ion-select label="Pagamento" labelPlacement="stacked" [(ngModel)]="paymentMethod" interface="action-sheet">
              <ion-select-option value="NUM">Numerário</ion-select-option>
              <ion-select-option value="MPESA">M-Pesa</ion-select-option>
              <ion-select-option value="EMOLA">e-Mola</ion-select-option>
              <ion-select-option value="TRF">Transferência</ion-select-option>
            </ion-select>
          </ion-item>
          <div class="gps-row" [class.ok]="latitude">
            <ion-icon name="location-outline"></ion-icon>
            <span>{{ latitude ? 'Localização capturada' : 'A obter localização...' }}</span>
          </div>
        </div>
      </div>

      <!-- spacer for footer -->
      <div style="height: 90px"></div>
    </ion-content>

    <!-- Sticky checkout footer -->
    <ion-footer *ngIf="cartCount > 0">
      <ion-toolbar class="checkout-bar">
        <div class="checkout-content">
          <div>
            <p class="ck-label">{{ cartCount }} item(s)</p>
            <h2 class="ck-total">{{ cartTotal | number:'1.2-2' }} MZN</h2>
          </div>
          <ion-button color="success" (click)="confirmSale()" [disabled]="submitting">
            <ion-icon name="checkmark" slot="start"></ion-icon>
            {{ submitting ? 'A processar...' : 'Finalizar Venda' }}
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .content-dark { --background: #0A0E1A; }
    ion-toolbar { --background: #161B2E; --color: white; }
    .truck-banner {
      background: linear-gradient(135deg, #1e3a8a, #0078D7);
      margin: 12px; padding: 16px; border-radius: 16px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .flex-row { display: flex; align-items: center; gap: 12px; }
    .truck-icon { font-size: 32px; color: white; }
    .truck-banner .label { color: #bfdbfe; font-size: 10px; text-transform: uppercase; margin: 0; }
    .truck-banner h2 { color: white; font-weight: 800; font-size: 20px; margin: 0; }
    .stock-pill { background: rgba(255,255,255,0.2); color: white; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 20px; }
    .stock-pill.empty { background: rgba(239,68,68,0.4); }
    .center-msg { text-align: center; padding: 48px 16px; color: #94a3b8; }
    .center-msg p { margin: 6px 0; font-size: 14px; }
    .center-msg .hint { font-size: 12px; color: #64748b; }
    .big-icon { font-size: 48px; color: #475569; }
    .section { margin: 16px 12px; }
    .section-title { color: #e2e8f0; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }
    .card { background: #161B2E; border: 1px solid #2A3043; border-radius: 14px; margin-bottom: 10px; overflow: hidden; }
    .card-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; }
    .gas-info { display: flex; align-items: center; gap: 12px; }
    .gas-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(249,115,22,0.15); display: flex; align-items: center; justify-content: center; }
    .gas-icon ion-icon { color: #f97316; font-size: 22px; }
    .gas-info h3 { color: white; font-size: 15px; font-weight: 700; margin: 0; }
    .gas-info .price { color: #2ECC71; font-size: 13px; font-weight: 600; margin: 2px 0 0; }
    .gas-info .avail { color: #94a3b8; font-size: 11px; margin: 1px 0 0; }
    .gas-info .avail.zero { color: #ef4444; }
    .qty-control { display: flex; align-items: center; gap: 4px; }
    .qty-control .qty { color: white; font-weight: 800; font-size: 17px; min-width: 24px; text-align: center; }
    .dark-item { --background: transparent; --color: white; --border-color: #2A3043; }
    .dark-item ion-icon { color: #64748b; }
    .gps-row { display: flex; align-items: center; gap: 6px; padding: 10px 14px; color: #94a3b8; font-size: 12px; }
    .gps-row.ok { color: #2ECC71; }
    .checkout-bar { --background: #161B2E; }
    .checkout-content { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; }
    .ck-label { color: #94a3b8; font-size: 11px; margin: 0; }
    .ck-total { color: white; font-weight: 800; font-size: 19px; margin: 0; }
  `]
})
export class DriverGasSalePage implements OnInit, OnDestroy {
  truckPlate = '';
  gasTypes: GasType[] = [];
  inventory: Record<string, { full?: number; empty?: number; damaged?: number }> = {};
  cart: Record<string, number> = {};   // typeId -> qty

  customerName = '';
  customerPhone = '';
  paymentMethod = 'NUM';
  latitude: number | null = null;
  longitude: number | null = null;

  loading = true;
  submitting = false;
  private gpsWatch: any;

  constructor(
    private authService: AuthService,
    private mobileApi: MobileApiService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private router: Router,
    private locationService: LocationService,
  ) {
    addIcons({
      flame, add, remove, cart, checkmark, close, refresh,
      locationOutline, personOutline, callOutline, cashOutline, cubeOutline,
      warningOutline, receiptOutline, arrowBackOutline,
    });
  }

  ngOnInit() {
    this.truckPlate = this.locationService.getTruckPlate();
    this.loadAll();
    this.requestLocation();
  }

  ngOnDestroy() {
    if (this.gpsWatch) navigator.geolocation.clearWatch(this.gpsWatch);
  }

  get cartCount(): number {
    return Object.values(this.cart).reduce((s, q) => s + q, 0);
  }

  get cartTotal(): number {
    return this.gasTypes.reduce((sum, g) => sum + (this.getQty(g) * (g.price || 0)), 0);
  }

  get totalStock(): number {
    return Object.values(this.inventory).reduce((s, v) => s + (v.full || 0), 0);
  }

  loadAll() {
    this.loading = true;
    // Load gas types + truck inventory in parallel
    this.mobileApi.getGasTypes().subscribe({
      next: (types: any[]) => {
        this.gasTypes = (types || []).map(t => ({
          ...t,
          price: parseFloat(String(t.price)) || 0,
        }));
        this.loadInventory();
      },
      error: () => {
        this.loading = false;
        this.toast('Falha ao carregar tipos de gás.', 'danger');
      }
    });
  }

  private loadInventory() {
    this.mobileApi.getTruckInventory(this.truckPlate).subscribe({
      next: (inv: any) => {
        this.inventory = inv || {};
        this.loading = false;
      },
      error: () => {
        this.inventory = {};
        this.loading = false;
      }
    });
  }

  private typeKey(g: GasType): string {
    // Match cylinder type key like "9KG" from the name
    const m = (g.name || '').toUpperCase().match(/(\d{1,2})\s*KG/);
    return m ? `${m[1]}KG` : g.name;
  }

  getAvailable(g: GasType): number {
    return this.inventory[this.typeKey(g)]?.full || 0;
  }

  getQty(g: GasType): number {
    return this.cart[g.id] || 0;
  }

  inc(g: GasType) {
    const cur = this.getQty(g);
    if (cur >= this.getAvailable(g)) {
      this.toast(`Apenas ${this.getAvailable(g)} ${g.name} em stock.`, 'warning');
      return;
    }
    this.cart[g.id] = cur + 1;
  }

  dec(g: GasType) {
    const cur = this.getQty(g);
    if (cur > 0) this.cart[g.id] = cur - 1;
    if (this.cart[g.id] === 0) delete this.cart[g.id];
  }

  requestLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { this.latitude = pos.coords.latitude; this.longitude = pos.coords.longitude; },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async confirmSale() {
    if (this.cartCount === 0) return;
    if (!this.customerName.trim()) {
      this.toast('Indique o nome do cliente.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirmar Venda',
      message: `${this.cartCount} cilindro(s) a ${this.customerName} por ${this.cartTotal.toFixed(2)} MZN. Confirmar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', handler: () => this.submitSale() },
      ],
    });
    await alert.present();
  }

  private async submitSale() {
    this.submitting = true;
    const loading = await this.loadingCtrl.create({ message: 'A registar venda...', spinner: 'crescent' });
    await loading.present();

    const lines = this.gasTypes
      .filter(g => this.getQty(g) > 0)
      .map(g => ({
        articleId: g.articleId || g.id,
        articleCode: g.articleCode || g.code || `GAS-${this.typeKey(g)}`,
        articleName: g.name,
        quantity: this.getQty(g),
        unitPrice: g.price || 0,
        ivaRate: 16,
      }));

    const today = new Date().toISOString().split('T')[0];
    const payload = {
      truckPlate: this.truckPlate,
      date: today,
      dueDate: today,
      series: 'APP',
      paymentCondition: 'PRONTO',
      paymentMethod: this.paymentMethod,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      latitude: this.latitude,
      longitude: this.longitude,
      lines,
    };

    this.mobileApi.createDirectSale(payload).subscribe({
      next: () => {
        loading.dismiss();
        this.submitting = false;
        this.toast('Venda registada com sucesso!', 'success');
        this.resetForm();
        this.loadInventory(); // refresh truck stock
      },
      error: (err) => {
        loading.dismiss();
        this.submitting = false;
        const msg = err?.error?.message || (err.status === 0 ? 'Servidor inacessível.' : `Erro ${err.status}`);
        this.toast(msg, 'danger');
      },
    });
  }

  private resetForm() {
    this.cart = {};
    this.customerName = '';
    this.customerPhone = '';
    this.paymentMethod = 'NUM';
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  private async toast(message: string, color: string = 'success') {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    await t.present();
  }
}
