import React, { useState, useMemo, useEffect } from 'react';
import { RECENT_ITEMS, MENU_ITEMS } from '../constants';

interface SidebarProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

const MAX_RECENT_ITEMS = 5;
const STORAGE_KEY = 'sidebar_recent_items';

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentView }) => {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Load recent items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent items:', error);
      setRecentItems([]);
    }
  }, []);

  const displayedMenuItems = useMemo(() => {
    if (!searchQuery) return MENU_ITEMS;
    const query = searchQuery.toLowerCase();
    return MENU_ITEMS.map(item => {
      const matchLabel = item.label.toLowerCase().includes(query);
      const matchSub = item.subItems.filter(s => s.toLowerCase().includes(query));

      if (matchLabel || matchSub.length > 0) {
        return {
          ...item,
          subItems: matchLabel ? item.subItems : matchSub
        };
      }
      return null;
    }).filter((item): item is typeof item => item !== null);
  }, [searchQuery]);

  const isModuleOpen = (id: string) => {
    if (searchQuery) return true;
    return activeModule === id;
  };

  const toggleModule = (id: string) => {
    if (searchQuery) return;
    setActiveModule(activeModule === id ? null : id);
  };

  const addToRecentItems = (item: string) => {
    setRecentItems(prevItems => {
      // Remove item if it already exists
      const filtered = prevItems.filter(i => i !== item);

      // Add to the beginning
      const updated = [item, ...filtered];

      // Keep only MAX_RECENT_ITEMS
      const limited = updated.slice(0, MAX_RECENT_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      } catch (error) {
        console.error('Error saving recent items:', error);
      }

      return limited;
    });
  };

  const handleSubItemClick = (e: React.MouseEvent, subItem: string) => {
    e.preventDefault();

    // Add to recent items
    addToRecentItems(subItem);

    if (subItem === 'Vendas/Encomendas') {
      onNavigate('sales-form');
    } else if (subItem === 'Documentos Internos') {
      onNavigate('internal-docs');
    } else {
      // For other items, we might just reset to dashboard or handle them later
      onNavigate('dashboard');
    }
  };

  return (
    <aside className={`flex flex-col bg-white border-r border-gray-300 shrink-0 transition-all duration-300 ${collapsed ? 'w-14' : 'w-64'}`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-300 h-12">
        {!collapsed && (
          <div className="flex items-center gap-2 animate-fade-in overflow-hidden whitespace-nowrap">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover size-8 rounded-sm border border-gray-200"
              style={{ backgroundImage: 'url("https://picsum.photos/64/64")' }}
              title="Logo da Empresa"
            ></div>
            <h2 className="font-semibold text-gray-800 text-sm">Navegador</h2>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-col flex-1 overflow-y-auto overflow-x-hidden">

        {/* Favorites */}
        <div className="mb-2 mt-2">
          <div className={`flex items-center gap-2 px-3 py-1 ${collapsed ? 'justify-center' : ''}`}>
            <span className="material-symbols-outlined text-[18px] text-yellow-500" title="Favoritos">star</span>
            {!collapsed && <h3 className="font-semibold text-xs text-gray-800">Favoritos</h3>}
          </div>
          {!collapsed && (
            <p className="pl-9 text-xs text-gray-400 italic">sem favoritos</p>
          )}
        </div>

        {/* Recents */}
        <div className="mb-4">
          <div className={`flex items-center gap-2 px-3 py-1 ${collapsed ? 'justify-center' : ''}`}>
            <span className="material-symbols-outlined text-[18px] text-blue-600" title="Recentes">history</span>
            {!collapsed && <h3 className="font-semibold text-xs text-gray-800">Recentes</h3>}
          </div>
          {!collapsed && (
            <>
              {recentItems.length > 0 ? (
                <nav className="flex flex-col text-xs pl-9 space-y-1 mt-1">
                  {recentItems.map((item) => (
                    <a
                      key={item}
                      className="text-gray-600 hover:text-primary hover:underline block truncate cursor-pointer"
                      href="#"
                      onClick={(e) => handleSubItemClick(e, item)}
                    >
                      {item}
                    </a>
                  ))}
                </nav>
              ) : (
                <p className="pl-9 text-xs text-gray-400 italic">sem itens recentes</p>
              )}
            </>
          )}
        </div>

        <div className="h-px bg-gray-200 mx-2 mb-2"></div>

        {/* Modules Accordion */}
        <div className="space-y-0.5 text-xs">
          {displayedMenuItems.map((item) => {
            const isOpen = isModuleOpen(item.id);
            return (
              <div key={item.id} className="group">
                <button
                  onClick={() => !collapsed && toggleModule(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer select-none ${collapsed ? 'justify-center' : ''} ${isOpen ? 'bg-gray-50 text-primary' : 'text-gray-700'}`}
                  title={collapsed ? item.label : undefined}
                >
                  {!collapsed && (
                    <span className={`material-symbols-outlined text-[18px] text-blue-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                      chevron_right
                    </span>
                  )}
                  <span className={`material-symbols-outlined text-[18px] ${isOpen ? 'text-primary' : 'text-gray-500'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                </button>

                {/* Submenu */}
                {!collapsed && isOpen && (
                  <div className="pl-9 pr-2 space-y-1 py-1 bg-gray-50 border-l-2 border-blue-100 ml-4">
                    {item.subItems.map((sub) => (
                      <a
                        key={sub}
                        href="#"
                        onClick={(e) => handleSubItemClick(e, sub)}
                        className={`block text-gray-600 hover:text-primary hover:underline py-0.5 transition-colors 
                          ${(sub === 'Vendas/Encomendas' && currentView === 'sales-form') ||
                            (sub === 'Documentos Internos' && currentView === 'internal-docs')
                            ? 'text-primary font-semibold' : ''}`}
                      >
                        {sub}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Footer in Sidebar */}
      {!collapsed && (
        <div className="border-t border-gray-300 p-3 space-y-2 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-blue-600">apps</span>
            <h3 className="font-semibold text-xs text-gray-800">Todas as tarefas</h3>
          </div>
          <div className="relative">
            <input
              className="w-full pl-2 pr-7 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              placeholder="Pesquisar..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          </div>
        </div>
      )}
    </aside>
  );
};