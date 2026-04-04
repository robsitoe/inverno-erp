
import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeType = 'sovereign' | 'classic';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private renderer: Renderer2;
    private currentTheme: ThemeType = 'sovereign';
    private themeSubject = new BehaviorSubject<ThemeType>('sovereign');

    theme$ = this.themeSubject.asObservable();

    constructor(rendererFactory: RendererFactory2) {
        this.renderer = rendererFactory.createRenderer(null, null);
        this.initTheme();
    }

    private initTheme() {
        const savedTheme = localStorage.getItem('erp_theme') as ThemeType;
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            this.setTheme('sovereign');
        }
    }

    setTheme(theme: ThemeType) {
        // Remove old themes
        this.renderer.removeClass(document.body, 'theme-sovereign');
        this.renderer.removeClass(document.body, 'theme-classic');

        // Add new theme
        this.renderer.addClass(document.body, `theme-${theme}`);

        this.currentTheme = theme;
        this.themeSubject.next(theme);
        localStorage.setItem('erp_theme', theme);
    }

    toggleTheme() {
        const nextTheme = this.currentTheme === 'sovereign' ? 'classic' : 'sovereign';
        this.setTheme(nextTheme);
    }

    getCurrentTheme(): ThemeType {
        return this.currentTheme;
    }
}
