import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LicenseInfo {
    key: string;
    companyName: string;
    type: 'DEMO' | 'PRO' | 'ENTERPRISE';
    expirationDate: Date;
    status: 'VALID' | 'EXPIRED' | 'INVALID';
    features: string[];
}

@Injectable({
    providedIn: 'root'
})
export class LicenseService {
    private licenseSubject = new BehaviorSubject<LicenseInfo>(this.getStoredLicense());
    public license$ = this.licenseSubject.asObservable();

    constructor() {
        this.checkExpiration();
    }

    private getStoredLicense(): LicenseInfo {
        const stored = localStorage.getItem('erp_license_key');
        if (stored) {
            return this.parseLicense(stored);
        }
        return this.getDemoLicense();
    }

    private getDemoLicense(): LicenseInfo {
        // Default Demo License: 30 days from first run or fixed date
        const storedDemo = localStorage.getItem('erp_demo_start');
        let startDate = new Date();
        if (storedDemo) {
            startDate = new Date(storedDemo);
        } else {
            localStorage.setItem('erp_demo_start', startDate.toISOString());
        }

        const expires = new Date(startDate);
        expires.setDate(expires.getDate() + 30); // 30 days trial

        return {
            key: 'DEMO-VERSION',
            companyName: 'Bussiness(Demo)',
            type: 'DEMO',
            expirationDate: expires,
            status: this.isExpired(expires) ? 'EXPIRED' : 'VALID',
            features: ['BASIC']
        };
    }

    public activateLicense(key: string): boolean {
        try {
            const info = this.parseLicense(key);
            if (info.status === 'INVALID') return false;

            localStorage.setItem('erp_license_key', key);
            this.licenseSubject.next(info);
            return true;
        } catch (e) {
            console.error('Invalid License Key', e);
            return false;
        }
    }

    private parseLicense(key: string): LicenseInfo {
        try {
            // Format: BASE64(JSON)
            // JSON: { "c": "Company", "t": "PRO", "e": "2025-12-31", "s": "signature" }
            const decoded = atob(key);
            const data = JSON.parse(decoded);

            const expires = new Date(data.e);
            const isExpired = this.isExpired(expires);

            return {
                key: key,
                companyName: data.c,
                type: data.t,
                expirationDate: expires,
                status: isExpired ? 'EXPIRED' : 'VALID',
                features: data.f || ['ALL']
            };
        } catch (e) {
            // If parse fails, return invalid (unless it's the demo string)
            if (key === 'DEMO-VERSION') return this.getDemoLicense();

            return {
                key: key,
                companyName: 'Unknown',
                type: 'DEMO',
                expirationDate: new Date(),
                status: 'INVALID',
                features: []
            };
        }
    }

    private isExpired(date: Date): boolean {
        return new Date() > date;
    }

    public checkExpiration() {
        const current = this.licenseSubject.value;
        if (current.status !== 'INVALID' && this.isExpired(current.expirationDate)) {
            const updated = { ...current, status: 'EXPIRED' as const };
            this.licenseSubject.next(updated);
        }
    }

    public generateLicenseKey(company: string, type: string, days: number): string {
        const date = new Date();
        date.setDate(date.getDate() + days);
        const payload = {
            c: company,
            t: type,
            e: date.toISOString().split('T')[0], // YYYY-MM-DD
            f: ['ALL']
        };
        return btoa(JSON.stringify(payload));
    }
}
