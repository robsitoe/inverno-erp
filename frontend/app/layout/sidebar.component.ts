

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RECENT_ITEMS, MENU_ITEMS, ADMIN_MENU_ITEMS, MenuItem } from '../shared/constants';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside [class]="'flex flex-col h-full bg-white border-r border-gray-300 shrink-0 transition-all duration-300 ' + (collapsed ? 'w-14' : 'w-64')">
      <!-- Sidebar Header -->
      <div class="flex items-center justify-between p-2 border-b border-gray-300 h-12">
        <div *ngIf="!collapsed" class="flex items-center gap-2 animate-fade-in overflow-hidden whitespace-nowrap">
            <div 
                class="bg-center bg-no-repeat aspect-square bg-cover size-8 rounded-sm border border-gray-200" 
                style='background-image: url("https://picsum.photos/64/64")'
                title="Logo da Empresa"
            ></div>
            <h2 class="font-semibold text-gray-800 text-sm">{{ mode === 'ADMIN' ? 'Administrador' : 'Navegador' }}</h2>
        </div>
        <button 
            (click)="toggleCollapsed()"
            [class]="'text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors ' + (collapsed ? 'mx-auto' : '')"
            [title]="collapsed ? 'Expandir' : 'Recolher'"
        >
          <span class="material-symbols-outlined">menu</span>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 overflow-y-auto overflow-x-hidden">
          <!-- Favorites -->
          <div class="mb-2 mt-2" *ngIf="mode !== 'ADMIN'">
            <div [class]="'flex items-center gap-2 px-3 py-1 ' + (collapsed ? 'justify-center' : '')">
              <span class="material-symbols-outlined text-[18px] text-yellow-500" title="Favoritos">star</span>
              <h3 *ngIf="!collapsed" class="font-semibold text-xs text-gray-800">Favoritos</h3>
            </div>
            <p *ngIf="!collapsed" class="pl-9 text-xs text-gray-400 italic">sem favoritos</p>
          </div>

          <!-- Recents -->
          <div class="mb-4" *ngIf="mode !== 'ADMIN'">
            <div [class]="'flex items-center gap-2 px-3 py-1 ' + (collapsed ? 'justify-center' : '')">
              <span class="material-symbols-outlined text-[18px] text-blue-600" title="Recentes">history</span>
              <h3 *ngIf="!collapsed" class="font-semibold text-xs text-gray-800">Recentes</h3>
            </div>
            <nav *ngIf="!collapsed" class="flex flex-col text-xs pl-9 space-y-1 mt-1">
              <a *ngFor="let item of recentItems" 
                 class="text-gray-600 hover:text-primary hover:underline block truncate cursor-pointer" 
                 href="#"
                 (click)="$event.preventDefault()">
                {{ item }}
              </a>
            </nav>
          </div>

          <div class="h-px bg-gray-200 mx-2 mb-2" *ngIf="mode !== 'ADMIN'"></div>

          <!-- Modules Accordion -->
          <div class="space-y-0.5 text-xs pb-2">
            <div *ngFor="let item of displayedMenuItems" class="group">
              <button
                (click)="!collapsed && toggleModule(item.label)"
                [class]="'w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer select-none ' + (collapsed ? 'justify-center' : '') + ' ' + (isModuleOpen(item.label) ? 'bg-gray-50 text-primary' : 'text-gray-700')"
                [title]="collapsed ? item.label : ''"
              >
                <span *ngIf="!collapsed" [class]="'material-symbols-outlined text-[18px] text-blue-600 transition-transform duration-200 ' + (isModuleOpen(item.label) ? 'rotate-90' : '')">
                    chevron_right
                </span>
                <span [class]="'material-symbols-outlined text-[18px] ' + (isModuleOpen(item.label) ? 'text-primary' : 'text-gray-500')">
                  {{ item.icon }}
                </span>
                <span *ngIf="!collapsed" class="font-medium truncate">{{ item.label }}</span>
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
                      <span [class]="'material-symbols-outlined text-[14px] transition-transform duration-200 ' + (isSubModuleOpen(child.label) ? 'rotate-90' : '')">
                        chevron_right
                      </span>
                      <span class="material-symbols-outlined text-[14px]">{{ child.icon }}</span>
                      <span>{{ child.label }}</span>
                      <span *ngIf="child.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
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
                            <span [class]="'material-symbols-outlined text-[12px] transition-transform duration-200 ' + (isSubSubModuleOpen(subChild.label) ? 'rotate-90' : '')">
                              chevron_right
                            </span>
                            <span class="material-symbols-outlined text-[12px]">{{ subChild.icon }}</span>
                            <span class="text-xs">{{ subChild.label }}</span>
                            <span *ngIf="subChild.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                          </button>
                          
                          <!-- Submenu Level 3 -->
                          <div *ngIf="isSubSubModuleOpen(subChild.label)" class="pl-5 space-y-1 mt-1">
                            <a *ngFor="let subSubChild of subChild.children" 
                               href="#" 
                               (click)="handleMenuItemClick($event, subSubChild)"
                               [class]="'flex items-center gap-2 text-gray-600 hover:text-primary hover:underline py-0.5 transition-colors text-xs ' + 
                                  (subSubChild.view === currentView ? 'text-primary font-semibold' : '')"
                            >
                              <span class="material-symbols-outlined text-[12px]">{{ subSubChild.icon }}</span>
                              <span>{{ subSubChild.label }}</span>
                              <span *ngIf="subSubChild.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                            </a>
                          </div>
                        </div>
                        
                        <ng-template #simpleSubItem>
                          <a href="#" 
                             (click)="handleMenuItemClick($event, subChild)"
                             [class]="'flex items-center gap-2 text-gray-600 hover:text-primary hover:underline py-0.5 transition-colors ' + 
                                (subChild.view === currentView ? 'text-primary font-semibold' : '')"
                          >
                            <span class="material-symbols-outlined text-[14px]">{{ subChild.icon }}</span>
                            <span>{{ subChild.label }}</span>
                            <span *ngIf="subChild.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                          </a>
                        </ng-template>
                      </div>
                    </div>
                  </div>
                  
                  <ng-template #simpleItem>
                    <a href="#" 
                       (click)="handleMenuItemClick($event, child)"
                       [class]="'flex items-center gap-2 text-gray-600 hover:text-primary hover:underline py-0.5 transition-colors ' + 
                          (child.view === currentView ? 'text-primary font-semibold' : '')"
                    >
                      <span class="material-symbols-outlined text-[14px]">{{ child.icon }}</span>
                      <span>{{ child.label }}</span>
                      <span *ngIf="child.beta" class="ml-auto text-[10px] uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">beta</span>
                    </a>
                  </ng-template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Footer in Sidebar -->
      <div *ngIf="!collapsed && mode !== 'ADMIN'" class="border-t border-gray-300 p-3 space-y-2 bg-gray-50 shrink-0">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px] text-blue-600">apps</span>
          <h3 class="font-semibold text-xs text-gray-800">Todas as tarefas</h3>
        </div>
        <div class="relative">
          <input 
              class="w-full pl-2 pr-7 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
              placeholder="Pesquisar..." 
              type="text"
              (input)="onSearch($event)"
          />
          <span class="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  @Input() currentView: string = 'dashboard';
  @Input() mode: string = 'ERP';
  @Input() productionMode: boolean = false;
  @Output() onNavigate = new EventEmitter<string>();

  menuItems = MENU_ITEMS;
  adminMenuItems = ADMIN_MENU_ITEMS;
  recentItems = RECENT_ITEMS;
  activeModule: string | null = null;
  activeSubModules = new Set<string>();
  activeSubSubModules = new Set<string>();
  searchQuery = '';
  collapsed = false;

  get displayedMenuItems() {
    let items = this.mode === 'ADMIN' ? this.adminMenuItems : this.menuItems;

    if (this.mode !== 'ADMIN') {
      items = items.filter(item => item.label !== 'Administração');
    }

    const filterProduction = (menu: MenuItem[]): MenuItem[] => menu
      .map(item => {
        const children = item.children ? filterProduction(item.children) : undefined;
        const hiddenInProduction = this.productionMode && item.productionReady === false;
        if (hiddenInProduction) return null;
        if (item.children && (!children || children.length === 0) && !item.view) return null;
        return { ...item, children };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null) as MenuItem[];

    items = filterProduction(items);

    if (!this.searchQuery) return items;

    const query = this.searchQuery.toLowerCase();
    return items
      .map(item => {
        const matchLabel = item.label.toLowerCase().includes(query);
        const matchChildren = item.children?.filter(s => s.label.toLowerCase().includes(query)) || [];

        if (matchLabel || matchChildren.length > 0) {
          return {
            ...item,
            children: matchLabel ? item.children : matchChildren
          };
        }
        return null;
      })
      .filter(item => item !== null) as MenuItem[];
  }

  isModuleOpen(label: string): boolean {
    if (this.searchQuery) return true;
    return this.activeModule === label;
  }

  isSubModuleOpen(label: string): boolean {
    return this.activeSubModules.has(label);
  }

  isSubSubModuleOpen(label: string): boolean {
    return this.activeSubSubModules.has(label);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
  }

  toggleModule(label: string) {
    if (this.searchQuery) return;
    this.activeModule = this.activeModule === label ? null : label;
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
  }

  handleMenuItemClick(e: Event, item: MenuItem) {
    e.preventDefault();
    if (item.view) {
      this.onNavigate.emit(item.view);
    }
  }
}
