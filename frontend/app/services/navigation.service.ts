import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MENU_ITEMS, MenuItem } from '../shared/constants';

export interface NavItem {
    label: string;
    view: string;
}

@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    private readonly RECENT_KEY = 'erp_recent_views';
    private readonly FAVORITE_KEY = 'erp_favorite_views';
    private readonly MAX_RECENTS = 5;

    // Navigation Events
    private navigationSubject = new BehaviorSubject<{ view: string; params?: any }>({ view: 'dashboard' });
    public navigation$ = this.navigationSubject.asObservable();

    private paramsSubject = new BehaviorSubject<any>(null);
    public params$ = this.paramsSubject.asObservable();

    private recentSubject = new BehaviorSubject<NavItem[]>(this.loadFromStorage(this.RECENT_KEY));
    public recents$ = this.recentSubject.asObservable();

    private favoriteSubject = new BehaviorSubject<NavItem[]>(this.loadFromStorage(this.FAVORITE_KEY));
    public favorites$ = this.favoriteSubject.asObservable();

    // Sidebar collapse control — any component can request sidebar to collapse/expand
    private sidebarCollapsedSubject = new BehaviorSubject<boolean>(false);
    public sidebarCollapsed$ = this.sidebarCollapsedSubject.asObservable();

    collapseSidebar() { this.sidebarCollapsedSubject.next(true); }
    expandSidebar() { this.sidebarCollapsedSubject.next(false); }
    toggleSidebar() { this.sidebarCollapsedSubject.next(!this.sidebarCollapsedSubject.value); }

    constructor() { }

    /** Trigger navigation to a specific view with optional parameters */
    navigate(view: string, params?: any) {
        const enrichedParams = params ? { ...params, _targetView: view } : { _targetView: view };
        this.paramsSubject.next(enrichedParams);
        this.navigationSubject.next({ view, params: enrichedParams });
    }

    /** Record a navigation to a specific view */
    recordNavigation(view: string) {
        if (view === 'dashboard' || view === 'admin-page' || view === 'license-manager') return;

        const label = this.findLabelByView(view);
        if (!label) return;

        const currentRecents = this.recentSubject.value;
        // Remove if already exists to move to top
        const filtered = currentRecents.filter(item => item.view !== view);
        const updated = [{ label, view }, ...filtered].slice(0, this.MAX_RECENTS);

        this.recentSubject.next(updated);
        this.saveToStorage(this.RECENT_KEY, updated);
    }

    /** Toggle favorite status for a view */
    toggleFavorite(view: string) {
        const label = this.findLabelByView(view);
        if (!label) return;

        const currentFavorites = this.favoriteSubject.value;
        const isFavorite = currentFavorites.some(item => item.view === view);

        let updated: NavItem[];
        if (isFavorite) {
            updated = currentFavorites.filter(item => item.view !== view);
        } else {
            updated = [...currentFavorites, { label, view }];
        }

        this.favoriteSubject.next(updated);
        this.saveToStorage(this.FAVORITE_KEY, updated);
    }

    isFavorite(view: string): boolean {
        return this.favoriteSubject.value.some(item => item.view === view);
    }

    private loadFromStorage(key: string): NavItem[] {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    private saveToStorage(key: string, items: NavItem[]) {
        try {
            localStorage.setItem(key, JSON.stringify(items));
        } catch { }
    }

    private findLabelByView(view: string): string | null {
        const findInMenu = (items: MenuItem[]): string | null => {
            for (const item of items) {
                if (item.view === view) return item.label;
                if (item.children) {
                    const found = findInMenu(item.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findInMenu(MENU_ITEMS);
    }
}
