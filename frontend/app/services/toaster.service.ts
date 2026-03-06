import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToasterService {
    private toastSubject = new Subject<Toast>();
    toasts$ = this.toastSubject.asObservable();

    showSuccess(title: string, message: string) {
        console.log('[ToasterService] Success:', title, message);
        this.toastSubject.next({ title, message, type: 'success' });
    }

    showError(title: string, message: string) {
        console.log('[ToasterService] Error:', title, message);
        this.toastSubject.next({ title, message, type: 'error' });
    }

    showInfo(title: string, message: string) {
        console.log('[ToasterService] Info:', title, message);
        this.toastSubject.next({ title, message, type: 'info' });
    }

    showWarning(title: string, message: string) {
        console.log('[ToasterService] Warning:', title, message);
        this.toastSubject.next({ title, message, type: 'warning' });
    }
}
