import { Injectable } from '@angular/core';

export interface AuditLog {
    id: string;
    timestamp: string;
    user: string;
    action: string; // e.g., 'DATE_EXCEPTION', 'OUT_OF_SEQUENCE', 'NEGATIVE_BALANCE'
    module: string; // 'SALES', 'PURCHASES', 'TREASURY', 'SYSTEM'
    documentRef: string;
    details: {
        originalDate?: string;
        newDate?: string;
        reason?: string;
        [key: string]: any;
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuditService {
    private readonly STORAGE_KEY = 'erp_audit_logs';

    constructor() { }

    logException(log: Omit<AuditLog, 'id' | 'timestamp'>) {
        const newLog: AuditLog = {
            ...log,
            id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString()
        };

        const logs = this.getLogs();
        logs.push(newLog);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));

        console.log('[AuditService] Exception Logged:', newLog);
    }

    getLogs(): AuditLog[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    getLogsByModule(module: string): AuditLog[] {
        return this.getLogs().filter(l => l.module === module);
    }

    getLogsByDocument(docRef: string): AuditLog[] {
        return this.getLogs().filter(l => l.documentRef === docRef);
    }
}
