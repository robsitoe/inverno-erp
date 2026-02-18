import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface LicenseInfo {
    valid: boolean;
    status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'GRACE' | 'INVALID';
    plan: 'DEMO' | 'LITE' | 'STANDARD' | 'PRO' | 'ENTERPRISE';
    companyName: string;
    expiresAt: Date;
    daysRemaining: number;
    features: string[];
    maxUsers?: number;
    maxCompanies?: number;
    inGracePeriod: boolean;
    gracePeriodEndsAt?: Date;
}

export interface LicensePlanDefinition {
    id: string;
    name: string;
    description: string;
    price: number;
    billing: string;
    features: string[];
    benefitSummary: string[];
    icon: string;
    color: string;
    isPopular?: boolean;
}

const CACHE_KEY = 'erp_license_cache';
const CACHE_TTL_MS = 72 * 60 * 60 * 1000; // 72h offline grace

@Injectable({
    providedIn: 'root'
})
export class LicenseService {
    private readonly apiBase = 'http://localhost:3000/licenses';

    private licenseSubject = new BehaviorSubject<LicenseInfo>(this.getCachedLicense());
    public license$ = this.licenseSubject.asObservable();

    constructor(private http: HttpClient) {
        this.refreshFromServer();
    }

    // ─── PUBLIC API ───────────────────────────────────────────────────────────

    getAvailablePlans(): Observable<LicensePlanDefinition[]> {
        return this.http.get<LicensePlanDefinition[]>(`${this.apiBase}/plans`);
    }

    validatePromoCode(code: string): Observable<any> {
        return this.http.get<any>(`${this.apiBase}/promo/${code}`);
    }

    /** Activate a license token received from the vendor */
    activateLicense(token: string): Observable<any> {
        return this.http.post<any>(`${this.apiBase}/activate`, { token }).pipe(
            tap(result => {
                if (result && result.valid !== undefined) {
                    this.updateCache(result);
                    this.licenseSubject.next(result);
                }
            }),
            catchError(err => {
                console.error('License activation failed:', err);
                throw err;
            })
        );
    }

    /** Refresh license status from server (uses server time — tamper-proof) */
    refreshFromServer(companyId?: string): void {
        const cid = companyId || this.getCompanyId();
        if (!cid) return;

        this.http.get<LicenseInfo>(`${this.apiBase}/status/${cid}`).pipe(
            tap(status => {
                this.updateCache(status);
                this.licenseSubject.next(status);
            }),
            catchError(() => {
                // Offline: use cached value if within TTL
                const cached = this.getCachedLicense();
                this.licenseSubject.next(cached);
                return of(cached);
            })
        ).subscribe();
    }

    /** Check if a specific feature is enabled */
    hasFeature(feature: string): boolean {
        const license = this.licenseSubject.value;
        if (!license?.valid) return false;
        if (license.features?.includes('ALL')) return true;
        return license.features?.includes(feature) ?? false;
    }

    /** Current license snapshot */
    get current(): LicenseInfo {
        return this.licenseSubject.value;
    }

    // ─── PRIVATE ──────────────────────────────────────────────────────────────

    private getCompanyId(): string | null {
        try {
            const info = localStorage.getItem('erp_company_info');
            if (info) return JSON.parse(info).id || null;
        } catch { }
        return null;
    }

    private updateCache(license: LicenseInfo): void {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: license,
                cachedAt: Date.now()
            }));
        } catch { }
    }

    private getCachedLicense(): LicenseInfo {
        try {
            const stored = localStorage.getItem(CACHE_KEY);
            if (stored) {
                const { data, cachedAt } = JSON.parse(stored);
                const age = Date.now() - cachedAt;
                if (age < CACHE_TTL_MS) {
                    return data;
                }
            }
        } catch { }

        // Default: DEMO fallback for offline/first-run
        return {
            valid: true,
            status: 'ACTIVE',
            plan: 'DEMO',
            companyName: 'Demo',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            daysRemaining: 30,
            features: ['SALES', 'PURCHASES', 'BASIC'],
            inGracePeriod: false,
        };
    }
}
