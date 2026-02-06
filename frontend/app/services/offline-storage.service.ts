import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ConfigService } from './config.service';

export interface StorageGateway {
  resolve<T>(browserResolver: () => T, backendResolver: () => Observable<T>): Observable<T>;
}

@Injectable({ providedIn: 'root' })
export class OfflineStorageService implements StorageGateway {
  constructor(private configService: ConfigService) {}

  resolve<T>(browserResolver: () => T, backendResolver: () => Observable<T>): Observable<T> {
    if (this.configService.isLocalBrowser()) {
      return of(browserResolver());
    }
    return backendResolver();
  }

  getItem<T>(key: string, fallback: T): T {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  }

  setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
