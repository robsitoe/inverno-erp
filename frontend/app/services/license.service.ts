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
    offline?: boolean;
    lastServerCheckAt?: Date;
}

interface LicenseCacheEntry {
    data: LicenseInfo;
    cachedAt: number;
    lastServerCheckAt?: number;
}

export interface LicenseRenewalInfo {
    id: string;
    companyId: string;
    licenseId: string;
    paidAt: Date;
    durationDays: number;
    amount?: number;
    previousExpiresAt?: Date;
    newExpiresAt: Date;
    issuedBy: string;
    createdAt: Date;
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

    getRenewalsByCompany(companyId: string): Observable<LicenseRenewalInfo[]> {
        return this.http.get<LicenseRenewalInfo[]>(`${this.apiBase}/${companyId}/renewals`);
    }

    /** Activate a license token received from the vendor */
    activateLicense(token: string): Observable<any> {
        return this.http.post<any>(`${this.apiBase}/activate`, { token }).pipe(
            tap(result => {
                if (result && result.valid !== undefined) {
                    const normalized = this.normalizeLicense(result, false, Date.now());
                    this.updateCache(normalized);
                    this.licenseSubject.next(normalized);
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
                const normalized = this.normalizeLicense(status, false, Date.now());
                this.updateCache(normalized);
                this.licenseSubject.next(normalized);
            }),
            catchError(() => {
                const lastKnown = this.licenseSubject.value ?? this.getCachedLicense();
                const offlineSnapshot = this.normalizeLicense(lastKnown, true, this.resolveLastServerCheck(lastKnown));
                this.licenseSubject.next(offlineSnapshot);
                return of(offlineSnapshot);
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
            const checkAt = this.resolveLastServerCheck(license) ?? Date.now();
            const normalized = this.normalizeLicense(license, false, checkAt);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: normalized,
                cachedAt: Date.now(),
                lastServerCheckAt: checkAt,
            } as LicenseCacheEntry));
        } catch { }
    }

    private getCachedLicense(): LicenseInfo {
        try {
            const stored = localStorage.getItem(CACHE_KEY);
            if (stored) {
                const { data, cachedAt, lastServerCheckAt } = JSON.parse(stored) as LicenseCacheEntry;
                if (data) {
                    const checkAt = lastServerCheckAt ?? cachedAt;
                    return this.normalizeLicense(data, false, checkAt);
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
            features: ['SALES', 'PURCHASES', 'BASIC', 'HR'],
            inGracePeriod: false,
            offline: false,
            lastServerCheckAt: undefined,
        };
    }

    private normalizeLicense(raw: Partial<LicenseInfo>, offline: boolean, lastServerCheckAt?: number): LicenseInfo {
        const now = Date.now();
        const expiresAt = raw.expiresAt ? new Date(raw.expiresAt) : new Date(now);
        const gracePeriodEndsAt = raw.gracePeriodEndsAt ? new Date(raw.gracePeriodEndsAt) : undefined;
        const effectiveGraceEnd = gracePeriodEndsAt ?? expiresAt;

        const inGracePeriod = expiresAt.getTime() < now && now <= effectiveGraceEnd.getTime();
        const isExpired = now > effectiveGraceEnd.getTime();
        const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now) / (1000 * 60 * 60 * 24)));

        let status: LicenseInfo['status'] = raw.status ?? 'INVALID';
        if (status !== 'REVOKED' && status !== 'INVALID') {
            status = isExpired ? 'EXPIRED' : inGracePeriod ? 'GRACE' : 'ACTIVE';
        }

        return {
            valid: status === 'ACTIVE' || status === 'GRACE',
            status,
            plan: raw.plan ?? 'DEMO',
            companyName: raw.companyName ?? 'Demo',
            expiresAt,
            daysRemaining,
            features: raw.features ?? ['SALES', 'PURCHASES', 'BASIC', 'HR'],
            maxUsers: raw.maxUsers,
            maxCompanies: raw.maxCompanies,
            inGracePeriod: status === 'GRACE',
            gracePeriodEndsAt: effectiveGraceEnd,
            offline,
            lastServerCheckAt: lastServerCheckAt ? new Date(lastServerCheckAt) : (raw.lastServerCheckAt ? new Date(raw.lastServerCheckAt) : undefined),
        };
    }

    private resolveLastServerCheck(license: Partial<LicenseInfo>): number | undefined {
        if (!license?.lastServerCheckAt) return undefined;
        const parsed = new Date(license.lastServerCheckAt).getTime();
        return Number.isNaN(parsed) ? undefined : parsed;
    }
}
