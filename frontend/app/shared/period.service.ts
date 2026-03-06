import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PeriodService {
    private readonly STORAGE_KEY = 'erp_config_periods';

    constructor() { }

    /**
     * Checks if a given date is in an open period.
     * A period is closed if the date is on or before the "lastClosedDate".
     * @param date Date string (YYYY-MM-DD) or Date object
     * @returns true if the period is open (editable), false if closed (read-only)
     */
    isPeriodOpen(date: string | Date): boolean {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const lastClosed = this.getLastClosedDate();
        if (!lastClosed) return true; // No periods closed yet

        const closedDate = new Date(lastClosed);
        closedDate.setHours(0, 0, 0, 0);

        return checkDate > closedDate;
    }

    getLastClosedDate(): string | null {
        const config = localStorage.getItem(this.STORAGE_KEY);
        if (config) {
            const parsed = JSON.parse(config);
            return parsed.lastClosedDate || null;
        }
        return null;
    }

    closePeriod(date: string) {
        const config = {
            lastClosedDate: date,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin' // In real app, get current user
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    }
}
