import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToasterService, Toast } from '../services/toaster.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
    selector: 'app-toaster',
    standalone: true,
    imports: [CommonModule],
    animations: [
        trigger('toastTrigger', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ transform: 'translateX(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
            ])
        ])
    ],
    template: `
    <div class="fixed top-24 right-6 z-[999999] flex flex-col gap-3 pointer-events-none">
      <div *ngFor="let toast of activeToasts" 
           @toastTrigger
           class="pointer-events-auto flex items-start gap-4 p-4 rounded-xl shadow-2xl border min-w-[320px] max-w-[400px] transition-all backdrop-blur-md relative overflow-hidden"
           [ngClass]="getToastClasses(toast.type)">
        
        <!-- Icon -->
        <div class="flex-shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-2xl" [ngClass]="getIconClasses(toast.type)">
            {{ getIcon(toast.type) }}
          </span>
        </div>

        <!-- Content -->
        <div class="flex-1">
          <h4 class="font-bold text-[14px] mb-1">{{ toast.title }}</h4>
          <p class="text-[13px] opacity-90 leading-relaxed">{{ toast.message }}</p>
        </div>

        <!-- Close -->
        <button (click)="removeSpecificToast(toast)" class="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>

        <!-- Progress Bar -->
        <div class="absolute bottom-0 left-0 h-1 bg-current opacity-20 animate-progress"></div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; }
    .animate-progress { 
      animation: progress 4s linear forwards; 
    }
    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `]
})
export class ToasterComponent implements OnInit {
    activeToasts: Toast[] = [];

    constructor(
        private toasterService: ToasterService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        console.log('[ToasterComponent] Initialized and listening for toasts...');
        this.toasterService.toasts$.subscribe(toast => {
            console.log('[ToasterComponent] Toast received:', toast);
            this.activeToasts.push(toast);
            this.cdr.detectChanges();

            setTimeout(() => {
                this.removeSpecificToast(toast);
            }, toast.duration || 4000);
        });
    }

    removeSpecificToast(toast: Toast) {
        const index = this.activeToasts.indexOf(toast);
        if (index > -1) {
            this.activeToasts.splice(index, 1);
            this.cdr.detectChanges();
        }
    }

    getToastClasses(type: string) {
        switch (type) {
            case 'success': return 'bg-white/95 border-green-200 text-green-900 shadow-xl';
            case 'error': return 'bg-white/95 border-red-200 text-red-900 shadow-xl';
            case 'warning': return 'bg-white/95 border-amber-200 text-amber-900 shadow-xl';
            default: return 'bg-white/95 border-blue-200 text-blue-900 shadow-xl';
        }
    }

    getIconClasses(type: string) {
        switch (type) {
            case 'success': return 'text-green-600';
            case 'error': return 'text-red-600';
            case 'warning': return 'text-amber-600';
            default: return 'text-blue-600';
        }
    }

    getIcon(type: string) {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    }
}
