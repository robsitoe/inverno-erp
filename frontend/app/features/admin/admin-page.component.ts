import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AdminToolsComponent } from './admin-tools.component';
import { AdminSeriesComponent } from './admin-series.component';
import { LicenseManagerComponent } from './license-manager.component';
import { PeriodService } from '../../shared/period.service';
import { DataService } from '../../services/data.service';

interface CompanyInfo {
  name: string;
  nif: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  id?: string;
}

interface FiscalYear {
  year: number;
  status: 'OPEN' | 'CLOSED';
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  companyId?: string;
}

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, AdminToolsComponent, AdminSeriesComponent, LicenseManagerComponent],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Header -->
      <div class="bg-gradient-to-r from-gray-800 to-gray-700 text-white px-4 py-3 shadow-md shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-white/10 rounded-lg">
            <span class="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-wide">Administrador</h1>
            <p class="text-xs text-gray-300">Configurações e Manutenção do Sistema</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-300 bg-white px-4 pt-4 shrink-0 shadow-sm">
        <button 
          *ngFor="let tab of tabs"
          (click)="activeTab = tab.id"
          class="px-6 py-2 text-sm font-medium border-t-2 border-x border-transparent transition-all relative top-px"
          [ngClass]="{
            'bg-[#F0F0F0] border-t-blue-600 border-x-gray-300 text-blue-700 rounded-t-sm z-10': activeTab === tab.id,
            'text-gray-600 hover:bg-gray-50 hover:text-gray-800': activeTab !== tab.id
          }"
        >
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">{{ tab.icon }}</span>
            {{ tab.label }}
          </div>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-6">
        
        <!-- Tab: Empresa -->
        <div *ngIf="activeTab === 'company'" class="max-w-4xl mx-auto">
          <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-600">business</span>
                Dados da Empresa
              </h2>
              <button (click)="saveCompanyInfo()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                <span class="material-symbols-outlined text-[18px]">save</span>
                Gravar Alterações
              </button>
            </div>
            
            <div class="p-6 grid grid-cols-2 gap-8">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                  <input [(ngModel)]="companyInfo.name" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Ex: Minha Empresa, Lda.">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">NIF</label>
                  <input [(ngModel)]="companyInfo.nif" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Ex: 123456789">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Morada</label>
                  <textarea [(ngModel)]="companyInfo.address" rows="3" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Rua Principal, Nº 123"></textarea>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input [(ngModel)]="companyInfo.email" type="email" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="geral@empresa.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input [(ngModel)]="companyInfo.phone" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="+258 84 123 4567">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input [(ngModel)]="companyInfo.website" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="www.empresa.com">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Exercícios -->
        <div *ngIf="activeTab === 'years'" class="max-w-4xl mx-auto">
          <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-600">calendar_month</span>
                Exercícios Económicos
              </h2>
              <button (click)="openNewYearModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                <span class="material-symbols-outlined text-[18px]">add_circle</span>
                Novo Exercício
              </button>
            </div>

            <!-- Period Closure Section -->
            <div class="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 text-blue-800">
                  <span class="material-symbols-outlined">lock_clock</span>
                  <span class="font-medium">Fecho de Períodos:</span>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600">Bloquear documentos anteriores a:</label>
                  <input type="date" [(ngModel)]="periodLockDate" class="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <button (click)="savePeriodLock()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors">
                    Atualizar Fecho
                  </button>
                </div>
                <span class="text-xs text-gray-500 italic ml-2">
                  (Nenhum documento poderá ser criado, editado ou anulado com data igual ou anterior a esta)
                </span>
              </div>
            </div>

            <div class="p-6">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3">Ano</th>
                    <th class="px-4 py-3">Estado</th>
                    <th class="px-4 py-3">Início</th>
                    <th class="px-4 py-3">Fim</th>
                    <th class="px-4 py-3 text-center">Atual</th>
                    <th class="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr *ngFor="let year of fiscalYears" class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 font-medium text-gray-900">{{ year.year }}</td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-1 rounded-full text-xs font-medium" 
                        [ngClass]="year.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                        {{ year.status === 'OPEN' ? 'Aberto' : 'Fechado' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-gray-600">{{ year.startDate | date:'dd/MM/yyyy' }}</td>
                    <td class="px-4 py-3 text-gray-600">{{ year.endDate | date:'dd/MM/yyyy' }}</td>
                    <td class="px-4 py-3 text-center">
                      <span *ngIf="year.isCurrent" class="material-symbols-outlined text-green-600">check_circle</span>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button *ngIf="!year.isCurrent && year.status === 'OPEN'" (click)="setAsCurrent(year)" class="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3">
                        Definir como Atual
                      </button>
                      <button *ngIf="year.status === 'OPEN'" (click)="closeYear(year)" class="text-red-600 hover:text-red-800 text-xs font-medium">
                        Fechar Ano
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab: Séries -->
        <div *ngIf="activeTab === 'series'" class="max-w-4xl mx-auto">
          <app-admin-series></app-admin-series>
        </div>

        <!-- Tab: Parâmetros -->
        <div *ngIf="activeTab === 'parameters'" class="max-w-4xl mx-auto">
          <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-600">settings_applications</span>
                Parâmetros Gerais
              </h2>
              <button (click)="saveSystemConfig()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                <span class="material-symbols-outlined text-[18px]">save</span>
                Gravar Configurações
              </button>
            </div>
            
            <div class="p-6 space-y-6">
              <!-- Deployment Mode -->
              <div>
                <h3 class="text-md font-medium text-gray-700 mb-3 border-b pb-2">Modo de Operação</h3>
                <div class="grid grid-cols-2 gap-4">
                  <label class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" [class.border-blue-500]="systemConfig.deploymentMode === 'LOCAL'" [class.bg-blue-50]="systemConfig.deploymentMode === 'LOCAL'">
                    <input type="radio" name="deploymentMode" value="LOCAL" [(ngModel)]="systemConfig.deploymentMode" class="mt-1">
                    <div>
                      <div class="font-medium text-gray-900">Local (Standalone)</div>
                      <div class="text-sm text-gray-500 mt-1">
                        O sistema opera inteiramente no navegador. Todos os dados são guardados localmente neste dispositivo. Ideal para demonstrações ou uso monoposto sem internet.
                      </div>
                    </div>
                  </label>
                  
                  <label class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" [class.border-blue-500]="systemConfig.deploymentMode === 'WEB'" [class.bg-blue-50]="systemConfig.deploymentMode === 'WEB'">
                    <input type="radio" name="deploymentMode" value="WEB" [(ngModel)]="systemConfig.deploymentMode" class="mt-1">
                    <div>
                      <div class="font-medium text-gray-900">Web / Cloud</div>
                      <div class="text-sm text-gray-500 mt-1">
                        O sistema conecta-se a um servidor remoto para sincronizar dados. Permite acesso multi-utilizador e backup automático na nuvem.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- API Configuration (Visible only if WEB) -->
              <div *ngIf="systemConfig.deploymentMode === 'WEB'" class="space-y-4">
                <h3 class="text-md font-medium text-gray-700 mb-3 border-b pb-2">Configuração de Conexão</h3>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">URL da API</label>
                  <input [(ngModel)]="systemConfig.apiUrl" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="https://api.inverno-erp.com">
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="systemConfig.syncEnabled" id="syncEnabled" class="rounded text-blue-600 focus:ring-blue-500">
                  <label for="syncEnabled" class="text-sm text-gray-700">Ativar sincronização automática em segundo plano</label>
                </div>
              </div>

              <!-- Local Storage Configuration (Visible only if LOCAL) -->
              <div *ngIf="systemConfig.deploymentMode === 'LOCAL'" class="space-y-4">
                <h3 class="text-md font-medium text-gray-700 mb-3 border-b pb-2">Armazenamento de Dados</h3>
                <div class="flex flex-col gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="localStorageType" value="BROWSER" [(ngModel)]="systemConfig.localStorageType" class="text-blue-600 focus:ring-blue-500">
                        <span class="text-gray-900">Navegador (LocalStorage) <span class="text-gray-500 text-sm">- Dados guardados apenas neste browser</span></span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="localStorageType" value="POSTGRES" [(ngModel)]="systemConfig.localStorageType" class="text-blue-600 focus:ring-blue-500">
                        <span class="text-gray-900">Base de Dados Local (PostgreSQL) <span class="text-gray-500 text-sm">- Requer servidor local</span></span>
                    </label>
                </div>

                <!-- Postgres Config -->
                <div *ngIf="systemConfig.localStorageType === 'POSTGRES'" class="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded border border-gray-200 mt-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Host</label>
                        <input [(ngModel)]="systemConfig.postgresConfig.host" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="localhost">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Porta</label>
                        <input type="number" [(ngModel)]="systemConfig.postgresConfig.port" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="5432">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Utilizador</label>
                        <input [(ngModel)]="systemConfig.postgresConfig.username" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="postgres">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" [(ngModel)]="systemConfig.postgresConfig.password" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Base de Dados</label>
                        <input [(ngModel)]="systemConfig.postgresConfig.database" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="inverno_erp">
                    </div>
                    <div class="col-span-2 flex justify-between items-center border-t pt-4 mt-2">
                         <div class="flex items-center gap-2">
                           <span class="text-sm font-medium text-gray-700">Status do Backend:</span>
                           <span class="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" 
                             [ngClass]="{
                               'bg-green-100 text-green-700': backendStatus === 'online',
                               'bg-red-100 text-red-700': backendStatus === 'offline',
                               'bg-gray-100 text-gray-500': backendStatus === 'checking'
                             }">
                             <span class="w-2 h-2 rounded-full" [ngClass]="{
                               'bg-green-500 animate-pulse': backendStatus === 'online',
                               'bg-red-500': backendStatus === 'offline',
                               'bg-gray-400': backendStatus === 'checking'
                             }"></span>
                             {{ backendStatus === 'online' ? 'ONLINE' : backendStatus === 'offline' ? 'OFFLINE' : 'A VERIFICAR...' }}
                           </span>
                           <button (click)="checkBackendStatus()" class="text-gray-400 hover:text-blue-600 transition-colors">
                             <span class="material-symbols-outlined text-[18px]">refresh</span>
                           </button>
                         </div>

                         <div class="flex gap-4">
                           <button *ngIf="backendStatus === 'offline'" (click)="startBackend()" class="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all border border-orange-200">
                             <span class="material-symbols-outlined text-[16px]">terminal</span>
                             INICIAR BACKEND
                           </button>
                           
                           <button (click)="testConnection()" class="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
                             <span class="material-symbols-outlined text-[16px]">wifi</span>
                             Testar Conexão DB
                           </button>
                         </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Manutenção -->
        <div *ngIf="activeTab === 'maintenance'" class="max-w-4xl mx-auto space-y-6">
          <!-- Backup Card -->
          <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span class="material-symbols-outlined text-green-600">backup</span>
                Cópia de Segurança & Recuperação
              </h2>
            </div>
            <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="p-4 border border-gray-100 bg-gray-50 rounded-lg">
                <h3 class="font-bold text-gray-800 mb-2">Exportar Dados Locais</h3>
                <p class="text-sm text-gray-600 mb-4">Cria um ficheiro JSON com todos os dados armazenados localmente no browser (erp_*).</p>
                <button (click)="exportBackup()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 transition-all">
                  <span class="material-symbols-outlined text-[18px]">download</span>
                  Descarregar Backup (.json)
                </button>
              </div>

              <div class="p-4 border border-red-100 bg-red-50 rounded-lg">
                <h3 class="font-bold text-red-800 mb-2 underline">ZONA DE PERIGO: Reset</h3>
                <p class="text-sm text-red-600 mb-4">Apaga permanentemente todos os dados erp_* deste browser e restaura as definições de fábrica.</p>
                <button (click)="dangerReset()" class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 transition-all">
                  <span class="material-symbols-outlined text-[18px]">delete_forever</span>
                  LIMPAR TUDO
                </button>
              </div>
            </div>
          </div>

          <!-- Runbook / Status Card (Point 8, 9) -->
          <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-600">troubleshoot</span>
                Diagnóstico & Runbook (Dados "Sumidos")
              </h2>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="p-3 bg-gray-50 rounded border border-gray-200">
                  <p class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Modo Atual</p>
                  <p class="text-sm font-bold text-gray-800">{{ dataSourceLabel }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded border border-gray-200">
                  <p class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Empresa Ativa</p>
                  <p class="text-sm font-bold text-gray-800">{{ companyInfo.name || '---' }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded border border-gray-200">
                  <p class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Status Backend</p>
                  <p class="text-sm font-bold flex items-center gap-1.5" [ngClass]="backendStatus === 'online' ? 'text-green-600' : 'text-red-600'">
                    <span class="size-2 rounded-full" [ngClass]="backendStatus === 'online' ? 'bg-green-500' : 'bg-red-500'"></span>
                    {{ backendStatus.toUpperCase() }}
                  </p>
                </div>
              </div>

              <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h4 class="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px]">info</span>
                  Procedimento de Recuperação
                </h4>
                <ul class="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                  <li>Confirme no indicador acima se está no modo correto (Local vs Backend).</li>
                  <li>Se usa LOCAL, verifique se mudou de browser ou limpou a cache recentemente.</li>
                  <li>Se usa BACKEND, confirme se o tenant (X-Company-Id) está correto nos cabeçalhos.</li>
                  <li>Em caso de perda total local, utilize o ficheiro descarregado para restaurar dados.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Sistema -->
        <div *ngIf="activeTab === 'system'" class="max-w-4xl mx-auto">
          <app-admin-tools></app-admin-tools>
        </div>

        <!-- Tab: Licenças -->
        <div *ngIf="activeTab === 'licenses'" class="max-w-4xl mx-auto">
          <app-license-manager></app-license-manager>
        </div>
      </div>
    </div>

    <!-- New Year Modal -->
    <div *ngIf="showNewYearModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-96 overflow-hidden transform transition-all scale-100">
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">Abertura de Novo Ano</h3>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <input type="number" [(ngModel)]="newYearModel.year" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" min="2000" max="2100">
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <p class="font-medium mb-1">ℹ️ Ações Automáticas:</p>
            <ul class="list-disc list-inside space-y-1">
              <li>Criação de séries para todos os documentos</li>
              <li>Definição como ano corrente</li>
              <li>Inicialização de contadores</li>
            </ul>
          </div>
        </div>
        <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button (click)="showNewYearModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors">Cancelar</button>
          <button (click)="createYear()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors">Confirmar Abertura</button>
        </div>
      </div>
    </div>
  `
})
export class AdminPageComponent implements OnInit {
  activeTab = 'company';

  constructor(
    private periodService: PeriodService,
    private dataService: DataService
  ) { }

  tabs = [
    { id: 'company', label: 'Empresa', icon: 'business' },
    { id: 'years', label: 'Exercícios', icon: 'calendar_month' },
    { id: 'series', label: 'Séries', icon: 'format_list_numbered' },
    { id: 'parameters', label: 'Parâmetros', icon: 'settings_applications' },
    { id: 'maintenance', label: 'Manutenção', icon: 'build_circle' },
    { id: 'system', label: 'Sistema', icon: 'settings_system_daydream' },
    { id: 'licenses', label: 'Licenças', icon: 'verified' }
  ];

  companyInfo: CompanyInfo = {
    name: '',
    nif: '',
    address: '',
    email: '',
    phone: '',
    website: ''
  };

  fiscalYears: FiscalYear[] = [];
  showNewYearModal = false;
  newYearModel = { year: new Date().getFullYear() + 1 };
  periodLockDate: string = '';

  dataSourceLabel = '';

  ngOnInit() {
    this.dataSourceLabel = this.dataService.getDataSourceLabel();
    this.loadSystemConfig(); // Load config first
    this.loadCompanyInfo();
    this.loadFiscalYears();
    this.loadPeriodLock();
    this.checkBackendStatus();
  }

  // Company Info Logic
  loadCompanyInfo() {
    this.dataService.getCompanyInfo().subscribe(info => {
      if (info) {
        this.companyInfo = info;
      }
    });
  }

  saveCompanyInfo() {
    this.dataService.saveCompanyInfo(this.companyInfo).subscribe(() => {
      alert('Dados da empresa gravados com sucesso!');
    });
  }

  // Fiscal Years Logic
  loadFiscalYears() {
    if (!this.companyInfo.id) {
      // If no ID, maybe load all or wait? 
      // For now, let's try loading with current logic which might need companyId
    }

    // We need companyId to filter years properly in multi-company setup.
    // But if we are just starting, maybe we don't have it yet.
    // Let's assume dataService handles it or we pass what we have.

    this.dataService.getFiscalYears(this.companyInfo.id).subscribe(years => {
      this.fiscalYears = years;
    });
  }

  openNewYearModal() {
    // Suggest next year
    const maxYear = Math.max(...this.fiscalYears.map(y => y.year), new Date().getFullYear());
    this.newYearModel.year = maxYear + 1;
    this.showNewYearModal = true;
  }

  createYear() {
    const year = this.newYearModel.year;

    // Check if exists
    if (this.fiscalYears.find(y => y.year === year)) {
      alert('Este exercício já existe!');
      return;
    }

    // Create new year
    const newYear: FiscalYear = {
      year: year,
      status: 'OPEN',
      isCurrent: true, // Automatically set as current
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      companyId: this.companyInfo.id
    };

    // 1. Save the new year
    this.dataService.saveFiscalYear(newYear).subscribe(() => {
      // 2. Set as current (which updates others)
      this.dataService.setAsCurrentYear(year, this.companyInfo.id!).subscribe(() => {
        // 3. Create series (this is still local logic for now, should be moved to service eventually)
        this.createSeriesForYear(year.toString());

        this.showNewYearModal = false;
        this.loadFiscalYears(); // Reload list
        alert(`Exercício de ${year} aberto com sucesso! As séries de documentos foram criadas.`);
      });
    });
  }

  setAsCurrent(targetYear: FiscalYear) {
    this.dataService.setAsCurrentYear(targetYear.year, this.companyInfo.id!).subscribe(() => {
      this.loadFiscalYears(); // Reload to reflect changes
    });
  }

  closeYear(targetYear: FiscalYear) {
    if (confirm(`Tem certeza que deseja fechar o exercício de ${targetYear.year}?`)) {
      targetYear.status = 'CLOSED';
      this.dataService.saveFiscalYear(targetYear).subscribe(() => {
        this.loadFiscalYears();
      });
    }
  }

  createSeriesForYear(yearCode: string) {
    const modules = [
      { key: 'erp_sales_document_types', name: 'Vendas' },
      { key: 'erp_purchase_document_types', name: 'Compras' },
      { key: 'erp_stock_document_types', name: 'Stock' },
      { key: 'erp_treasury_document_types', name: 'Tesouraria' }
    ];

    modules.forEach(mod => {
      const stored = localStorage.getItem(mod.key);
      if (stored) {
        const docTypes = JSON.parse(stored);
        let updated = false;

        docTypes.forEach((dt: any) => {
          if (!dt.series) dt.series = [];

          // Check if series exists for this company
          if (!dt.series.find((s: any) => s.code === yearCode && s.companyId === this.companyInfo.id)) {
            dt.series.unshift({
              code: yearCode,
              description: `Série ${yearCode}`,
              active: true,
              companyId: this.companyInfo.id
            });
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem(mod.key, JSON.stringify(docTypes));
        }
      }
    });
  }

  loadPeriodLock() {
    const date = this.periodService.getLastClosedDate();
    if (date) {
      this.periodLockDate = date.split('T')[0];
    }
  }

  savePeriodLock() {
    if (this.periodLockDate) {
      if (confirm(`Tem certeza que deseja fechar todos os períodos até ${this.periodLockDate}?\n\nEsta ação impedirá a criação e edição de documentos com data igual ou anterior.`)) {
        this.periodService.closePeriod(this.periodLockDate);
        alert('Data de fecho atualizada com sucesso!');
      }
    }
  }

  // System Config Logic
  systemConfig = {
    deploymentMode: 'LOCAL', // LOCAL, WEB
    localStorageType: 'BROWSER', // BROWSER, POSTGRES
    postgresConfig: {
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '',
      database: 'inverno_erp'
    },
    apiUrl: '',
    syncEnabled: false
  };

  backendStatus: 'checking' | 'online' | 'offline' = 'checking';

  checkBackendStatus() {
    this.backendStatus = 'checking';
    // Try to reach the backend
    fetch('http://localhost:3000')
      .then(response => {
        this.backendStatus = 'online';
      })
      .catch(error => {
        this.backendStatus = 'offline';
      });
  }

  startBackend() {
    const command = 'cd backend && npm run start:dev';

    // Copy to clipboard
    navigator.clipboard.writeText(command).then(() => {
      alert(`🚀 Para iniciar o backend:\n\n1. Abra um novo terminal\n2. O comando foi copiado: ${command}\n3. Cole e pressione Enter\n\nO navegador não pode iniciar processos diretamente por segurança.`);
    }).catch(() => {
      alert(`🚀 Para iniciar o backend, execute no terminal:\n\n${command}`);
    });
  }

  loadSystemConfig() {
    const stored = localStorage.getItem('erp_system_config');
    if (stored) {
      const loaded = JSON.parse(stored);
      this.systemConfig = { ...this.systemConfig, ...loaded };

      // Ensure nested objects exist
      if (!this.systemConfig.postgresConfig) {
        this.systemConfig.postgresConfig = {
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: '',
          database: 'inverno_erp'
        };
      }
    }
  }

  saveSystemConfig() {
    // Point 4: Ritual de troca centralizado no DataService
    this.dataService.switchMode(this.systemConfig.localStorageType as any, this.systemConfig.deploymentMode as any);
  }

  exportBackup() {
    this.dataService.downloadBackup();
  }

  dangerReset() {
    if (confirm('!!! AVISO CRÍTICO !!!\n\nEstá prestes a APAGAR TODOS OS DADOS deste browser. Esta operação é irreversível.\n\nTem a certeza absoluta?')) {
      if (confirm('Último aviso: Deseja realmente continuar com a destruição dos dados locais?')) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('erp_')) localStorage.removeItem(key);
        });
        window.location.reload();
      }
    }
  }

  async testConnection() {
    if (this.systemConfig.localStorageType !== 'POSTGRES') {
      alert('Por favor selecione "Base de Dados Local (PostgreSQL)" para testar a conexão.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/test-db-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.systemConfig.postgresConfig)
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ ' + result.message);
        this.checkBackendStatus(); // Refresh status
      } else {
        alert('❌ ' + result.message);
      }
    } catch (error: any) {
      this.checkBackendStatus(); // Refresh status
      alert('❌ Erro ao contactar o servidor local (Backend).\n\nCertifique-se que o backend está a correr em http://localhost:3000.\n\nDetalhes: ' + error.message);
    }
  }
}
