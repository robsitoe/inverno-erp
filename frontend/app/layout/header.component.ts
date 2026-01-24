
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="flex items-center justify-between bg-[#F0F0F0] px-4 py-1.5 border-b border-gray-300 shadow-sm select-none shrink-0 z-20">
      <div class="flex items-center gap-6 text-xs">
        <p class="font-semibold text-gray-700 tracking-tight">ERP INVERNO v1.1</p>
        <nav class="hidden md:flex items-center gap-4">
          <a *ngFor="let link of navLinks" 
             [href]="'#' + link.toLowerCase()" 
             class="text-gray-600 hover:text-black hover:underline transition-colors font-medium">
            {{ link }}
          </a>
        </nav>
      </div>
      
      <div class="flex items-center gap-3 text-gray-600">
        <button class="hover:bg-gray-200 p-1 rounded transition-colors" title="Perfil">
          <span class="material-symbols-outlined text-[18px] align-middle">person</span>
        </button>
        <div class="flex flex-col items-end leading-tight">
          <span class="text-xs font-medium hidden sm:block">{{ username }}</span>
          <span *ngIf="companyName" class="text-[10px] text-gray-500 hidden sm:block">{{ companyName }}</span>
        </div>
        <div class="h-4 w-px bg-gray-300 mx-1 hidden sm:block"></div>
        <button class="hover:bg-gray-200 p-1 rounded transition-colors" title="Mudar Vista">
          <span class="material-symbols-outlined text-[18px] align-middle">view_in_ar</span>
        </button>
        <button (click)="resetData()" class="hover:bg-red-100 p-1 rounded transition-colors text-red-600" title="Reiniciar Dados">
          <span class="material-symbols-outlined text-[18px] align-middle">restart_alt</span>
        </button>
        <button (click)="logout()" class="hover:bg-red-100 p-1 rounded transition-colors text-red-600" title="Sair">
          <span class="material-symbols-outlined text-[18px] align-middle">logout</span>
        </button>
      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit {
  @Output() onLogout = new EventEmitter<void>();
  navLinks = ["SISTEMA", "FERRAMENTAS", "PREFERÊNCIAS", "", ""];
  username = 'Utilizador';
  companyName = '';

  ngOnInit() {
    const storedUser = localStorage.getItem('erp_current_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.username = user.username || user.name || 'Utilizador';
    }

    const storedCompany = localStorage.getItem('erp_company_info');
    if (storedCompany) {
      const company = JSON.parse(storedCompany);
      this.companyName = company.name;
    }
  }

  resetData() {
    if (confirm('Tem certeza que deseja reiniciar todos os dados? Isso apagará todas as transações e restaurará os dados de exemplo.')) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('erp_')) {
          localStorage.removeItem(key);
        }
      });
      window.location.reload();
    }
  }

  logout() {
    this.onLogout.emit();
  }
}
