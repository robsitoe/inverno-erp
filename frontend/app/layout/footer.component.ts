import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="flex items-center justify-between bg-[#0078D7] text-white text-[11px] px-4 py-1 shrink-0 shadow-inner select-none z-20">
      <div class="flex items-center gap-4 overflow-hidden whitespace-nowrap">
        <div class="flex items-center gap-1">
          <span class="opacity-70">Empresa:</span>
          <span class="font-medium">{{ companyName }}</span>
        </div>
        <div class="w-px h-3 bg-white/30 hidden sm:block"></div>
        <div class="hidden sm:flex items-center gap-1">
          <span class="opacity-70">Base de Dados:</span>
          <span class="font-medium">{{ dbConnection }}</span>
        </div>
        <div class="w-px h-3 bg-white/30 hidden md:block"></div>
        <div class="hidden md:flex items-center gap-1">
          <span class="opacity-70">Utilizador:</span>
          <span class="font-medium">{{ username }}</span>
        </div>
        <div class="w-px h-3 bg-white/30 hidden md:block"></div>
        <span class="font-bold hidden md:block">PT</span>
      </div>
      
      <div class="flex items-center gap-4 shrink-0 ml-4">
        <span class="font-medium">Lic.: VERSÃO DE DEMONSTRAÇÃO</span>
        <div class="size-2.5 bg-green-400 rounded-full border border-green-600 shadow-sm" title="Online"></div>
      </div>
    </footer>
  `
})
export class FooterComponent implements OnInit {
  companyName: string = 'N/A';
  dbConnection: string = 'N/A';
  username: string = 'N/A';

  ngOnInit() {
    this.loadFooterInfo();

    // Listen for storage changes to update footer dynamically if needed
    window.addEventListener('storage', () => {
      this.loadFooterInfo();
    });
  }

  loadFooterInfo() {
    // 1. Company Info
    const companyInfo = localStorage.getItem('erp_company_info');
    if (companyInfo) {
      const parsed = JSON.parse(companyInfo);
      this.companyName = parsed.name || 'Empresa Desconhecida';
    }

    // 2. User Info
    const userInfo = localStorage.getItem('erp_current_user');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      this.username = parsed.username || 'Visitante';
    }

    // 3. Database Connection
    const systemConfig = localStorage.getItem('erp_system_config');
    if (systemConfig) {
      const config = JSON.parse(systemConfig);
      if (config.deploymentMode === 'WEB') {
        this.dbConnection = 'CLOUD / WEB API';
      } else if (config.localStorageType === 'POSTGRES') {
        const { host, database } = config.postgresConfig || {};
        this.dbConnection = `${host || 'localhost'}/${database || 'db'}`;
      } else {
        this.dbConnection = 'LOCAL BROWSER STORAGE';
      }
    } else {
      this.dbConnection = 'LOCAL DEFAULT';
    }
  }
}
