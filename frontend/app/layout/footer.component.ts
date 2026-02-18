import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { LicenseService, LicenseInfo } from '../services/license.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="flex items-center justify-between bg-[#0078D7] text-white text-[11px] px-4 py-1 shrink-0 shadow-inner select-none z-20">
      <div class="flex items-center gap-4 overflow-hidden whitespace-nowrap">
        <div class="flex items-center flex-col leading-tight mr-2 border-r border-white/20 pr-4">
          <span class="font-bold tracking-tight">ERP INVERNO v1.1</span>
          <div class="flex items-center gap-1 opacity-80">
            <div class="size-1.5 rounded-full animate-pulse" [ngClass]="isLocal ? 'bg-orange-400' : 'bg-green-400'"></div>
            <span class="text-[8px] font-bold uppercase tracking-widest">{{ dataSourceLabel }}</span>
          </div>
        </div>
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
        <span class="font-medium" [class.text-red-300]="licenseStatus === 'EXPIRED'" title="Clique em Admin > Licenciamento para gerir">
            Lic.: {{ licenseText }}
        </span>
        <div 
            class="size-2.5 rounded-full border shadow-sm"
            [ngClass]="{
                'bg-green-400 border-green-600': licenseStatus === 'VALID',
                'bg-red-500 border-red-700 animate-pulse': licenseStatus === 'EXPIRED' || licenseStatus === 'INVALID',
                'bg-yellow-400 border-yellow-600': licenseStatus === 'DEMO'
            }"
            [title]="'Status: ' + licenseStatus">
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent implements OnInit {
  companyName: string = 'N/A';
  dbConnection: string = 'N/A';
  username: string = 'N/A';
  dataSourceLabel: string = '';
  isLocal: boolean = false;

  licenseText: string = 'CARREGANDO...';
  licenseStatus: string = '';

  constructor(
    private dataService: DataService,
    private licenseService: LicenseService
  ) { }

  ngOnInit() {
    this.dataSourceLabel = this.dataService.getDataSourceLabel();
    this.isLocal = this.dataService.isLocalBrowser();
    this.loadFooterInfo();

    // Subscribe to license updates
    this.licenseService.license$.subscribe(lic => {
      if (lic) {
        this.licenseStatus = lic.status;
        if (lic.status === 'VALID') {
          this.licenseText = `${lic.type} EDITION`;
        } else if (lic.status === 'EXPIRED') {
          this.licenseText = 'EXPIRADA';
        } else {
          this.licenseText = 'VERSÃO DE DEMONSTRAÇÃO';
        }
      }
    });

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
