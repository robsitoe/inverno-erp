
import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MENU_ITEMS, ADMIN_MENU_ITEMS, MenuItem } from '../shared/constants';
import { AppIconComponent } from '../shared/components/app-icon.component';
import { LicenseService } from '../services/license.service';
import { NavigationService, NavItem } from '../services/navigation.service';
import { Subscription } from 'rxjs';

interface TaskResult { item: MenuItem; label: string; path: string; icon: string; available: boolean; haystack: string }

const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <aside [class]="'flex flex-col h-full bg-white border-r border-gray-300 shrink-0 transition-all duration-300 ' + (collapsed ? 'w-14' : 'w-64')">
      <!-- Sidebar Header -->
      <div class="flex items-center justify-between p-2 border-b border-gray-300 h-12">
                <div *ngIf="!collapsed" class="flex items-center gap-2 animate-fade-in overflow-hidden whitespace-nowrap">
            <div class="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shadow-sm shrink-0" title="Inverno ERP">
              <svg width="15" height="15" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="11" y="2" width="4" height="26" rx="2" fill="white"/>
                <rect x="5" y="2" width="20" height="5" rx="2" fill="white"/>
                <rect x="5" y="23" width="20" height="5" rx="2" fill="white"/>
              </svg>
            </div>
            <h2 class="font-bold text-gray-800 text-sm tracking-tight">{{ mode === 'ADMIN' ? 'Administração' : 'Menu Principal' }}</h2>
        </div>
        <button 
            (click)="toggleCollapsed()"
            [class]="'text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors ' + (collapsed ? 'mx-auto' : '')"
            [title]="collapsed ? 'Expandir' : 'Recolher'"
        >
          <app-icon name="menu" [size]="20" color="#374151"></app-icon>
        </button>
      </div>
      <button *ngIf="collapsed" (click)="showAllTasks()" class="mx-auto mt-2 p-1.5 rounded hover:bg-gray-100" title="Todas as tarefas (F3)">
        <app-icon name="apps" [size]="20" color="#1d4ed8"></app-icon>
      </button>

      <!-- Scrollable Content -->
      <div class="flex flex-col flex-1 min-h-0">
        <div #scrollArea class="flex-1 overflow-y-auto overflow-x-hidden">
          <!-- Resultados da pesquisa (todas as tarefas que contêm o texto) -->
          <div *ngIf="!collapsed && searchQuery" class="py-1 text-xs">
            <div class="px-3 py-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500 font-bold">
              <span>Resultados ({{ searchResults.length }})</span>
              <button (click)="clearSearch()" class="normal-case font-semibold text-blue-600 hover:underline">Limpar</button>
            </div>
            <a *ngFor="let r of searchResults; let i = index" href="#" [attr.data-result]="i"
               (click)="openTask($event, r)" (mouseenter)="activeResult = i"
               class="flex items-start gap-2 px-3 py-1.5 border-l-2"
               [ngClass]="i === activeResult ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-gray-50'"
               [class.opacity-50]="!r.available">
              <app-icon [name]="r.icon" [size]="16" color="#374151" class="mt-0.5 shrink-0"></app-icon>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-gray-800" [class.font-semibold]="i === activeResult" [innerHTML]="highlight(r.label)"></span>
                <span class="block truncate text-[10px] text-gray-400">{{ r.path }}</span>
              </span>
              <span *ngIf="!r.available" class="text-[9px] uppercase bg-gray-200 text-gray-500 px-1 py-0.5 rounded shrink-0">Brevemente</span>
            </a>
            <p *ngIf="!searchResults.length" class="px-3 py-4 text-gray-400 italic">Nenhuma tarefa contém "{{ searchQuery }}".</p>
          </div>

          <!-- Todas as tarefas: árvore completa de todos os módulos -->
          <div *ngIf="!collapsed && !searchQuery && panel === 'all'" class="py-1 text-xs">
            <div class="px-3 py-1.5 flex items-center gap-2 border-b border-gray-200 mb-1">
              <app-icon name="apps" [size]="18" color="#1d4ed8"></app-icon>
              <span class="font-bold text-gray-800 flex-1">Todas as tarefas</span>
              <button (click)="expandAll(true)" class="p-0.5 rounded hover:bg-gray-100" title="Expandir tudo"><app-icon name="unfold_more" [size]="16" color="#374151"></app-icon></button>
              <button (click)="expandAll(false)" class="p-0.5 rounded hover:bg-gray-100" title="Recolher tudo"><app-icon name="unfold_less" [size]="16" color="#374151"></app-icon></button>
              <button (click)="panel = 'menu'" class="p-0.5 rounded hover:bg-gray-100" title="Voltar ao Menu Principal"><app-icon name="close" [size]="16" color="#374151"></app-icon></button>
            </div>
            <ng-container *ngTemplateOutlet="taskTree; context: { $implicit: displayedMenuItems, depth: 0, path: '' }"></ng-container>
          </div>

          <ng-template #taskTree let-items let-depth="depth" let-path="path">
            <ng-container *ngFor="let it of items">
              <ng-container *ngIf="it.children?.length; else taskLeaf">
                <button (click)="toggleTree(path + '/' + it.label)" class="w-full flex items-center gap-1.5 py-1 pr-2 hover:bg-gray-100 text-left"
                        [style.padding-left.px]="8 + depth * 14">
                  <app-icon name="chevron_right" [size]="14" color="#374151" class="transition-transform duration-150"
                            [class.rotate-90]="!treeClosed.has(path + '/' + it.label)"></app-icon>
                  <app-icon [name]="it.icon" [size]="16" [color]="depth === 0 ? getIconColor(it.label) : '#374151'"></app-icon>
                  <span class="truncate" [ngClass]="depth === 0 ? 'font-bold text-gray-800' : 'font-semibold text-gray-700'">{{ it.label }}</span>
                </button>
                <ng-container *ngIf="!treeClosed.has(path + '/' + it.label)">
                  <ng-container *ngTemplateOutlet="taskTree; context: { $implicit: it.children, depth: depth + 1, path: path + '/' + it.label }"></ng-container>
                </ng-container>
              </ng-container>
              <ng-template #taskLeaf>
                <a href="#" (click)="handleMenuItemClick($event, it)" class="flex items-center gap-1.5 py-1 pr-2 hover:bg-blue-50"
                   [style.padding-left.px]="22 + depth * 14"
                   [ngClass]="it.view === currentView ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-600'" [class.opacity-50]="coming(it)">
                  <app-icon [name]="it.icon" [size]="14" color="#374151"></app-icon>
                  <span class="truncate">{{ it.label }}</span>
                  <span *ngIf="coming(it)" class="ml-auto text-[9px] uppercase bg-gray-200 text-gray-500 px-1 py-0.5 rounded">Brevemente</span>
                </a>
              </ng-template>
            </ng-container>
          </ng-template>

          <ng-container *ngIf="collapsed || (!searchQuery && panel === 'menu')">
          <!-- Favorites -->
          <div class="mb-2 mt-2" *ngIf="mode !== 'ADMIN'">
            <div [class]="'flex items-center gap-2 px-3 py-1 ' + (collapsed ? 'justify-center' : '')">
              <app-icon name="star" [size]="18" color="#eab308" title="Favoritos"></app-icon>
              <h3 *ngIf="!collapsed" class="font-semibold text-xs text-gray-800">Favoritos</h3>
            </div>
            <p *ngIf="!collapsed && !favorites.length" class="pl-9 text-[10px] text-gray-400 italic">sem favoritos</p>
            <nav *ngIf="!collapsed && favorites.length" class="flex flex-col text-xs pl-9 space-y-1 mt-1">
              <a *ngFor="let item of favorites" 
                 class="text-gray-600 hover:text-primary hover:underline block truncate cursor-pointer" 
                 href="#"
                 (click)="handleItemClick($event, item.view)">
                {{ item.label }}
              </a>
            </nav>
          </div>

          <!-- Recents -->
          <div class="mb-4" *ngIf="mode !== 'ADMIN'">
            <div [class]="'flex items-center gap-2 px-3 py-1 ' + (collapsed ? 'justify-center' : '')">
              <app-icon name="history" [size]="18" color="#2563eb" title="Recentes"></app-icon>
              <h3 *ngIf="!collapsed" class="font-semibold text-xs text-gray-800">Recentes</h3>
            </div>
            <p *ngIf="!collapsed && !recentItems.length" class="pl-9 text-[10px] text-gray-400 italic">sem recentes</p>
            <nav *ngIf="!collapsed && recentItems.length" class="flex flex-col text-xs pl-9 space-y-1 mt-1">
              <a *ngFor="let item of recentItems" 
                 class="text-gray-600 hover:text-primary hover:underline block truncate cursor-pointer" 
                 href="#"
                 (click)="handleItemClick($event, item.view)">
                {{ item.label }}
              </a>
            </nav>
          </div>

          <div class="h-px bg-gray-200 mx-2 mb-2" *ngIf="mode !== 'ADMIN'"></div>

          <!-- Modules Accordion -->
          <div class="space-y-0.5 text-xs pb-2">
            <div *ngFor="let item of displayedMenuItems" class="group">
              <button
                (click)="!collapsed && handleTopLevelClick($event, item)"
                [class]="'w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer select-none ' + (collapsed ? 'justify-center' : '') + ' ' + (isModuleOpen(item.label) || (item.view === currentView) ? 'bg-gray-50 text-blue-600' : 'text-gray-700')"
                [title]="collapsed ? item.label : ''"
              >
                <app-icon 
                  *ngIf="!collapsed && item.children && item.children.length > 0 && !coming(item)"
                  name="chevron_right"
                  [size]="20" 
                  color="#172554" 
                  [class.rotate-90]="isModuleOpen(item.label)"
                  class="transition-transform duration-200"
                ></app-icon>
                <div *ngIf="!collapsed && (!item.children || item.children.length === 0 || coming(item))" class="w-5"></div>
                <app-icon 
                  [name]="item.icon" 
                  [size]="22" 
                  [color]="(isModuleOpen(item.label) || (item.view === currentView)) ? '#2563eb' : getIconColor(item.label)"
                ></app-icon>
                <span *ngIf="!collapsed" class="font-medium truncate" [class.opacity-50]="coming(item)">{{ item.label }}</span>
                <span *ngIf="!collapsed && coming(item)" class="ml-auto text-[9px] uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded shrink-0">Em breve</span>
              </button>
              
              <!-- Submenu Level 1 -->
              <div *ngIf="!collapsed && isModuleOpen(item.label) && item.children" class="pl-9 pr-2 space-y-1 py-1 bg-gray-50 border-l-2 border-blue-100 ml-4">
                <div *ngFor="let child of item.children">
                  <!-- If child has children, show as expandable -->
                  <div *ngIf="child.children; else simpleItem">
                    <button
                      (click)="toggleSubModule(child.label)"
                      class="w-full flex items-center gap-2 text-gray-600 hover:text-primary py-0.5 transition-colors text-left"
                    >
                      <app-icon 
                        name="chevron_right" 
                        [size]="16" 
                        color="#000000" 
                        [class.rotate-90]="isSubModuleOpen(child.label)"
                        class="transition-transform duration-200"
                      ></app-icon>
                      <app-icon [name]="child.icon" [size]="16" color="#374151"></app-icon>
                      <span>{{ child.label }}</span>
                      <span *ngIf="child.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                      <span *ngIf="coming(child)" class="ml-auto text-[9px] uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Brevemente</span>
                    </button>
                    
                    <!-- Submenu Level 2 -->
                    <div *ngIf="isSubModuleOpen(child.label)" class="pl-6 space-y-1 mt-1">
                      <div *ngFor="let subChild of child.children">
                        <!-- Level 3: If subChild has children, show as expandable -->
                        <div *ngIf="subChild.children; else simpleSubItem">
                          <button
                            (click)="toggleSubSubModule(subChild.label)"
                            class="w-full flex items-center gap-2 text-gray-600 hover:text-primary py-0.5 transition-colors text-left"
                          >
                            <app-icon 
                              name="chevron_right" 
                              [size]="12" 
                              color="#111827" 
                              [class.rotate-90]="isSubSubModuleOpen(subChild.label)"
                              class="transition-transform duration-200"
                            ></app-icon>
                            <app-icon [name]="subChild.icon" [size]="12" color="#374151"></app-icon>
                            <span class="text-xs">{{ subChild.label }}</span>
                            <span *ngIf="subChild.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                            <span *ngIf="coming(subChild)" class="ml-auto text-[9px] uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Brevemente</span>
                          </button>
                          
                          <!-- Submenu Level 3 -->
                          <div *ngIf="isSubSubModuleOpen(subChild.label)" class="pl-5 space-y-1 mt-1">
                            <a *ngFor="let subSubChild of subChild.children" 
                               href="#" 
                               (click)="handleMenuItemClick($event, subSubChild)"
                               [class]="'flex items-center gap-2 text-gray-600 hover:text-primary hover:underline py-0.5 transition-colors text-xs ' + 
                                  (subSubChild.view === currentView ? 'text-primary font-semibold' : '') + (coming(subSubChild) ? ' opacity-50' : '')"
                            >
                              <span class="material-symbols-outlined text-[12px]">{{ subSubChild.icon }}</span>
                              <span>{{ subSubChild.label }}</span>
                              <span *ngIf="subSubChild.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                              <span *ngIf="coming(subSubChild)" class="ml-auto text-[9px] uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Brevemente</span>
                            </a>
                          </div>
                        </div>
                        
                        <ng-template #simpleSubItem>
                          <a href="#" 
                             (click)="handleMenuItemClick($event, subChild)"
                             [class]="'flex items-center gap-2 text-gray-600 hover:text-primary hover:underline py-0.5 transition-colors ' + 
                                (subChild.view === currentView ? 'text-primary font-semibold' : '') + (coming(subChild) ? ' opacity-50' : '')"
                          >
                            <span class="material-symbols-outlined text-[14px]">{{ subChild.icon }}</span>
                            <span>{{ subChild.label }}</span>
                            <span *ngIf="subChild.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                            <span *ngIf="coming(subChild)" class="ml-auto text-[9px] uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Brevemente</span>
                          </a>
                        </ng-template>
                      </div>
                    </div>
                  </div>
                  
                  <ng-template #simpleItem>
                    <a href="#" 
                       (click)="handleMenuItemClick($event, child)"
                       [class]="'flex items-center gap-2 text-gray-600 hover:text-primary hover:underline py-0.5 transition-colors ' + 
                          (child.view === currentView ? 'text-primary font-semibold' : '') + (coming(child) ? ' opacity-50' : '')"
                    >
                      <app-icon [name]="child.icon" [size]="16" color="#374151"></app-icon>
                      <span>{{ child.label }}</span>
                      <span *ngIf="child.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                      <span *ngIf="coming(child)" class="ml-auto text-[9px] uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Brevemente</span>
                    </a>
                  </ng-template>
                </div>
              </div>
            </div>
          </div>
          </ng-container>
        </div>
      </div>

      <!-- Search Footer in Sidebar -->
      <div *ngIf="!collapsed" class="border-t border-gray-300 p-3 space-y-2 bg-gray-50 shrink-0">
        <button (click)="panel === 'all' && !searchQuery ? panel = 'menu' : showAllTasks()"
                class="w-full flex items-center gap-2 rounded -mx-1 px-1 py-0.5 text-left"
                [ngClass]="panel === 'all' && !searchQuery ? 'bg-blue-100' : 'hover:bg-gray-100'"
                [title]="panel === 'all' ? 'Voltar ao Menu Principal' : 'Ver todas as tarefas de todos os módulos (F3)'">
          <app-icon name="apps" [size]="20" color="#1d4ed8"></app-icon>
          <h3 class="font-semibold text-xs text-gray-800 flex-1">Todas as tarefas</h3>
          <span class="text-[10px] text-gray-400">{{ taskCount }}</span>
        </button>
        <div class="relative">
          <input #searchInput
              class="w-full pl-2 pr-7 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              placeholder="Pesquisar tarefas..."
              type="text"
              autocomplete="off"
              [value]="searchQuery"
              (input)="onSearch($event)"
              (keydown)="onSearchKey($event)"
          />
          <button *ngIf="searchQuery" (click)="clearSearch()" class="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100" title="Limpar (Esc)">
            <app-icon name="close" [size]="16" color="#111827"></app-icon>
          </button>
          <app-icon *ngIf="!searchQuery"
            name="search"
            [size]="18"
            color="#111827"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
          ></app-icon>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() currentView: string = 'dashboard';
  @Input() mode: string = 'ERP';
  @Input() productionMode: boolean = false;
  @Output() onNavigate = new EventEmitter<string>();

  menuItems = MENU_ITEMS;
  adminMenuItems = ADMIN_MENU_ITEMS;

  recentItems: NavItem[] = [];
  favorites: NavItem[] = [];

  activeModule: string | null = null;
  activeSubModules = new Set<string>();
  activeSubSubModules = new Set<string>();
  collapsed = false;
  /** 'menu' = Menu Principal; 'all' = árvore de todas as tarefas. */
  panel: 'menu' | 'all' = 'menu';
  searchQuery = '';
  searchResults: TaskResult[] = [];
  activeResult = 0;
  /** Nós da árvore "Todas as tarefas" recolhidos (por caminho). */
  treeClosed = new Set<string>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLDivElement>;

  private subs = new Subscription();

  constructor(
    private licenseService: LicenseService,
    private navService: NavigationService
  ) { }

  ngOnInit() {
    this.subs.add(this.navService.recents$.subscribe(items => this.recentItems = items));
    this.subs.add(this.navService.favorites$.subscribe(items => this.favorites = items));
    // React to external collapse requests (e.g. from trial balance row click)
    this.subs.add(this.navService.sidebarCollapsed$.subscribe(v => this.collapsed = v));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  get displayedMenuItems() { return this.visibleMenuItems; }

  /** Menu filtrado pela licença e pelo modo de produção (é o mesmo que o painel de tarefas lista). */
  get visibleMenuItems(): MenuItem[] {
    let items = this.mode === 'ADMIN' ? this.adminMenuItems : this.menuItems;

    if (this.mode !== 'ADMIN') {
      items = items.filter(item => item.label !== 'Administração');
    }

    const filterProduction = (menu: MenuItem[]): MenuItem[] => menu
      .map(item => {
        const children = item.children ? filterProduction(item.children) : undefined;
        const hiddenInProduction = this.productionMode && item.productionReady === false;

        // Feature check: hide if item requires a feature that user doesn't have
        const featureDisabled = item.feature && !this.licenseService.hasFeature(item.feature);

        if (hiddenInProduction || featureDisabled) return null;
        if (item.children && (!children || children.length === 0) && !item.view) return null;
        return { ...item, children };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null) as MenuItem[];

    return filterProduction(items);
  }

  isModuleOpen(label: string): boolean {
    return this.activeModule === label;
  }

  isSubModuleOpen(label: string): boolean {
    return this.activeSubModules.has(label);
  }

  isSubSubModuleOpen(label: string): boolean {
    return this.activeSubSubModules.has(label);
  }

  /** Todas as tarefas (folhas do menu) com o caminho, para a pesquisa. */
  private allTasks(): TaskResult[] {
    const out: TaskResult[] = [];
    const walk = (items: MenuItem[], path: string[], icon: string) => {
      for (const it of items) {
        if (it.children?.length) { walk(it.children, [...path, it.label], it.icon || icon); continue; }
        out.push({
          item: it, label: it.label, path: path.join(' › ') || it.label, icon: it.icon || icon || 'task',
          available: !this.coming(it), haystack: norm([...path, it.label].join(' ')),
        });
      }
    };
    walk(this.displayedMenuItems, [], '');
    return out;
  }

  get taskCount() { return this.allTasks().filter(t => t.available).length; }

  onSearch(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.runSearch();
  }

  private runSearch() {
    const words = norm(this.searchQuery).split(/\s+/).filter(Boolean);
    this.activeResult = 0;
    if (!words.length) { this.searchResults = []; return; }
    const score = (t: TaskResult) => {
      const label = norm(t.label);
      let sc = 0;
      for (const w of words) {
        if (!t.haystack.includes(w)) return -1;
        sc += label.startsWith(w) ? 30 : label.split(/\s+/).some(x => x.startsWith(w)) ? 20 : label.includes(w) ? 10 : 2;
      }
      return sc - (t.available ? 0 : 15);
    };
    this.searchResults = this.allTasks().map(t => ({ t, sc: score(t) })).filter(x => x.sc >= 0)
      .sort((a, b) => b.sc - a.sc || a.t.label.localeCompare(b.t.label)).map(x => x.t);
  }

  /** Realça o texto pesquisado no nome da tarefa. */
  highlight(label: string): string {
    const esc = (x: string) => x.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
    const words = norm(this.searchQuery).split(/\s+/).filter(Boolean);
    const n = norm(label);
    const marks = new Array(label.length).fill(false);
    for (const w of words) { let i = n.indexOf(w); while (i >= 0) { for (let k = i; k < i + w.length; k++) marks[k] = true; i = n.indexOf(w, i + w.length); } }
    let html = '', open = false;
    for (let i = 0; i < label.length; i++) {
      if (marks[i] && !open) { html += '<mark class="bg-yellow-200 text-inherit rounded-sm">'; open = true; }
      if (!marks[i] && open) { html += '</mark>'; open = false; }
      html += esc(label[i]);
    }
    return html + (open ? '</mark>' : '');
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.searchInput?.nativeElement.focus();
  }

  onSearchKey(e: KeyboardEvent) {
    const n = this.searchResults.length;
    if (e.key === 'Escape') { e.preventDefault(); if (this.searchQuery) this.clearSearch(); else this.searchInput?.nativeElement.blur(); return; }
    if (!n) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.activeResult = (this.activeResult + 1) % n; this.scrollToActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeResult = (this.activeResult - 1 + n) % n; this.scrollToActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); this.openTask(e, this.searchResults[this.activeResult]); }
  }

  private scrollToActive() {
    setTimeout(() => this.scrollArea?.nativeElement.querySelector(`[data-result="${this.activeResult}"]`)?.scrollIntoView({ block: 'nearest' }));
  }

  openTask(e: Event, r: TaskResult) {
    e.preventDefault();
    if (!r?.available) return;
    this.handleMenuItemClick(e, r.item);
  }

  /** Mostra a árvore completa de todas as tarefas no painel. */
  showAllTasks() {
    if (this.collapsed) this.toggleCollapsed();
    this.searchQuery = '';
    this.searchResults = [];
    this.panel = 'all';
  }

  toggleTree(key: string) {
    this.treeClosed.has(key) ? this.treeClosed.delete(key) : this.treeClosed.add(key);
  }

  expandAll(open: boolean) {
    this.treeClosed.clear();
    if (open) return;
    const walk = (items: MenuItem[], path: string) => {
      for (const it of items) if (it.children?.length) { this.treeClosed.add(path + '/' + it.label); walk(it.children, path + '/' + it.label); }
    };
    walk(this.displayedMenuItems, '');
  }

  /** F3 ou Ctrl+K: vai para a pesquisa de tarefas, em qualquer ecrã. */
  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent) {
    const ctrlK = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k';
    if (!ctrlK && e.key !== 'F3') return;
    e.preventDefault();
    if (this.collapsed) this.toggleCollapsed();
    setTimeout(() => { const el = this.searchInput?.nativeElement; el?.focus(); el?.select(); });
  }

  toggleModule(label: string) {
    this.activeModule = this.activeModule === label ? null : label;
  }

  handleTopLevelClick(e: Event, item: MenuItem) {
    if (item.comingSoon) { e.preventDefault(); return; }
    if (item.view) {
      if (item.children && item.children.length > 0) {
        // If it has both, we toggle but ALSO navigate? 
        // Usually, better to just toggle if it's a module.
        this.toggleModule(item.label);
      } else {
        this.handleMenuItemClick(e, item);
        this.activeModule = null; // Close others
      }
    } else {
      this.toggleModule(item.label);
    }
  }

  toggleSubModule(label: string) {
    if (this.activeSubModules.has(label)) {
      this.activeSubModules.delete(label);
    } else {
      this.activeSubModules.add(label);
    }
  }

  toggleSubSubModule(label: string) {
    if (this.activeSubSubModules.has(label)) {
      this.activeSubSubModules.delete(label);
    } else {
      this.activeSubSubModules.add(label);
    }
  }

  toggleCollapsed() {
    this.collapsed = !this.collapsed;
    // Keep service in sync so external listeners know the state
    if (this.collapsed) {
      this.navService.collapseSidebar();
    } else {
      this.navService.expandSidebar();
    }
  }

  getIconColor(label: string): string {
    const colors: { [key: string]: string } = {
      'Contabilidade': '#1d4ed8', // blue-700
      'Equipamentos e Ativos': '#334155', // slate-700
      'Tesouraria': '#047857', // emerald-700
      'Inventário': '#c2410c', // orange-700
      'Vendas': '#be123c', // rose-700
      'Compras': '#0369a1', // sky-700
      'Projetos e Serviços': '#7e22ce', // purple-700
      'Recursos Humanos': '#4338ca', // indigo-700
      'Administração': '#4338ca', // indigo-700
      'Tabelas': '#374151', // gray-700
      'Menus do Utilizador': '#0f766e' // teal-700
    };
    return colors[label] || '#374151';
  }

  /** Leaf menu item not yet implemented (no view, no children) -> show as 'Brevemente'. */
  coming(item: MenuItem): boolean {
    return !!item.comingSoon || (!item.view && (!item.children || item.children.length === 0));
  }

  handleMenuItemClick(e: Event, item: MenuItem) {
    e.preventDefault();
    if (item.view) {
      if (item.context) this.navService.setViewContext(item.view, item.context);
      else this.navService.clearViewContext();
      this.onNavigate.emit(item.view);
    }
  }

  handleItemClick(e: Event, view: string) {
    e.preventDefault();
    this.onNavigate.emit(view);
  }
}
