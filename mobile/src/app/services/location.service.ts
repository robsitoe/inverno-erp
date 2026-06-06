import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import { MobileApiService } from './mobile-api.service';
import { AuthService } from './auth.service';

export interface LiveStatus {
  active: boolean;
  lat: number | null;
  lng: number | null;
  lastSent: Date | null;
  truckPlate: string;
  error: string | null;
}

/**
 * Global GPS reporter. While a driver is logged in, this continuously sends the
 * phone's position to the backend (POST /mobile/driver/status), so the truck
 * shows up live on the web Fleet Tracking map — regardless of which page the
 * driver is on.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private timer: any = null;
  private readonly intervalMs = 15000;

  private statusSubject = new BehaviorSubject<LiveStatus>({
    active: false, lat: null, lng: null, lastSent: null, truckPlate: '', error: null,
  });
  public status$ = this.statusSubject.asObservable();

  constructor(
    private mobileApi: MobileApiService,
    private authService: AuthService,
  ) {}

  get current(): LiveStatus { return this.statusSubject.value; }

  /** Stable truck plate for this driver (overridable in settings). */
  getTruckPlate(): string {
    const saved = localStorage.getItem('truck_plate');
    if (saved && saved.trim()) return saved.trim().toUpperCase();
    const u = this.authService.user;
    const id = (u?.id || u?.employeeId || 'X').toString();
    return `VTR-${id.slice(-4).toUpperCase()}`;
  }

  setTruckPlate(plate: string) {
    if (plate?.trim()) {
      localStorage.setItem('truck_plate', plate.trim().toUpperCase());
      this.patch({ truckPlate: this.getTruckPlate() });
    }
  }

  /** Start reporting (idempotent). Only meaningful for drivers. */
  start() {
    if (this.timer) return;
    this.patch({ active: true, truckPlate: this.getTruckPlate() });
    this.report(); // immediate first ping
    this.timer = setInterval(() => this.report(), this.intervalMs);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.patch({ active: false });
  }

  /** Force a single immediate report (used by the "radar" button). */
  async pingNow(): Promise<boolean> {
    return this.report();
  }

  private async report(): Promise<boolean> {
    try {
      const pos = await this.getPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      await this.mobileApi.updateStatus({
        truckPlate: this.getTruckPlate(),
        lat, lng,
      }).toPromise();
      this.patch({ lat, lng, lastSent: new Date(), error: null });
      return true;
    } catch (e: any) {
      this.patch({ error: e?.message || 'Falha ao obter/enviar localização' });
      return false;
    }
  }

  private async getPosition(): Promise<{ coords: { latitude: number; longitude: number } }> {
    // Capacitor Geolocation works natively (no HTTPS needed) and falls back to
    // the browser API on web (works on localhost).
    try {
      return await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    } catch {
      return await new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Sem GPS disponível')); return; }
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p as any),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 },
        );
      });
    }
  }

  private patch(p: Partial<LiveStatus>) {
    this.statusSubject.next({ ...this.statusSubject.value, ...p });
  }
}
