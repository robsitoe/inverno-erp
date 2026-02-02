import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { DataService } from '../../services/data.service';

interface Company {
  id: string;
  name: string;
  nif: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  currentYear: number;
  type: 'STANDARD' | 'DEMO';
  category: string;
  country: string;
  location: string;
  chartOfAccounts: string;
  logoUrl?: string;
  currency?: string;
  seriesConfig?: SeriesConfig;
  documentNameFormat?: string;
  dbConfig?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    type?: 'postgres' | 'sqlite';
  };
}

interface SeriesConfig {
  code: string;
  description: string;
  startDate: string;
  endDate: string;
  companyId?: string;
}

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-6xl mx-auto h-full flex flex-col font-sans">
      <!-- Main Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Empresas</h1>
          <p class="text-sm text-gray-500">Gestão de empresas e configurações iniciais</p>
        </div>
        <button (click)="openWizard()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm flex items-center gap-2 transition-colors">
          <span class="material-symbols-outlined">add</span>
          Nova Empresa
        </button>
      </div>

      <!-- Company List -->
      <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden flex-1">
        <table class="w-full text-left">
          <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium text-sm">
            <tr>
              <th class="px-6 py-3 w-24">Código</th>
              <th class="px-6 py-3">Empresa</th>
              <th class="px-6 py-3">NIF</th>
              <th class="px-6 py-3">Localização</th>
              <th class="px-6 py-3">Ano</th>
              <th class="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm">
            <tr *ngFor="let company of companies" class="hover:bg-gray-50 transition-colors group cursor-pointer">
              <td class="px-6 py-4 font-mono text-gray-500">{{ company.id }}</td>
              <td class="px-6 py-4 font-medium text-gray-900">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs overflow-hidden border border-blue-200">
                    <img *ngIf="company.logoUrl" [src]="company.logoUrl" class="w-full h-full object-cover">
                    <span *ngIf="!company.logoUrl">{{ company.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div>
                    <div class="font-semibold">{{ company.name }}</div>
                    <div class="text-xs text-gray-400">{{ company.type === 'DEMO' ? 'Demonstração' : 'Standard' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-gray-600">{{ company.nif }}</td>
              <td class="px-6 py-4 text-gray-600">{{ company.location || '-' }}</td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {{ company.currentYear }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button (click)="editCompany(company)" class="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors" title="Editar">
                  <span class="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button (click)="deleteCompany(company)" class="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors" title="Remover">
                  <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </td>
            </tr>
            <tr *ngIf="companies.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <div class="flex flex-col items-center gap-2">
                  <span class="material-symbols-outlined text-4xl text-gray-300">domain_disabled</span>
                  <p>Nenhuma empresa configurada.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Primavera Style Wizard Modal -->
    <div *ngIf="showWizard" class="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[2px]">
      <div class="bg-[#F0F0F0] rounded-lg shadow-2xl w-[700px] flex flex-col overflow-hidden border border-gray-400 animate-fade-in font-sans text-sm">
        
        <!-- Wizard Header -->
        <div class="bg-white px-6 py-4 border-b border-gray-300 flex justify-between items-start relative overflow-hidden">
          <div class="z-10">
            <h2 class="text-base font-bold text-gray-800">Assistente de {{ isEditing ? 'Edição' : 'Criação' }} de Empresas</h2>
            <h3 class="text-lg font-bold text-gray-900 mt-1">{{ getStepTitle() }}</h3>
            <p class="text-gray-600 mt-1 max-w-[400px]">{{ getStepDescription() }}</p>
          </div>
          <!-- Blue Circle Logo -->
          <div class="w-16 h-16 bg-[#2D3E96] rounded-full flex items-center justify-center text-white font-bold text-3xl italic shadow-md z-10 shrink-0">
            9
          </div>
          <!-- Decorative background curve -->
          <div class="absolute -right-10 -top-10 w-40 h-40 bg-blue-50 rounded-full opacity-50 z-0"></div>
        </div>

        <!-- Wizard Content Area -->
        <div class="flex-1 p-6 overflow-y-auto bg-[#F0F0F0] min-h-[350px]">
          
          <!-- Step 1: Tipo de Empresa -->
          <div *ngIf="currentStep === 1" class="space-y-6 animate-slide-in">
            <!-- Group Box -->
            <fieldset class="border border-gray-300 rounded p-4 bg-white">
              <legend class="text-xs font-semibold text-gray-700 px-1">Tipo de Empresa</legend>
              <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" [(ngModel)]="newCompany.type" value="STANDARD" class="text-blue-600 focus:ring-blue-500">
                  <span class="text-gray-900">Empresa standard</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" [(ngModel)]="newCompany.type" value="DEMO" class="text-blue-600 focus:ring-blue-500">
                  <span class="text-gray-900">Empresa de demonstração</span>
                </label>
              </div>
            </fieldset>

            <fieldset class="border border-gray-300 rounded p-4 bg-white">
              <legend class="text-xs font-semibold text-gray-700 px-1">Empresa a criar</legend>
              <div class="grid grid-cols-[100px_1fr] gap-4 items-center mb-3">
                <label class="text-right text-gray-700">Identificador:</label>
                <input [(ngModel)]="newCompany.id" [disabled]="isEditing" class="w-32 border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500">
              </div>
              <div class="grid grid-cols-[100px_1fr] gap-4 items-center mb-3">
                <label class="text-right text-gray-700">Nome:</label>
                <input [(ngModel)]="newCompany.name" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              </div>
              <div class="grid grid-cols-[100px_1fr] gap-4 items-center mb-3">
                <label class="text-right text-gray-700">NIF:</label>
                <input [(ngModel)]="newCompany.nif" class="w-48 border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              </div>
              <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                <label class="text-right text-gray-700">Categoria:</label>
                <div class="flex gap-2">
                  <select [(ngModel)]="newCompany.category" class="flex-1 border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="Geral">Geral</option>
                    <option value="Comércio">Comércio</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Indústria">Indústria</option>
                  </select>
                  <button class="px-2 py-1 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200">...</button>
                </div>
              </div>
              
              <div class="grid grid-cols-[100px_1fr] gap-4 items-center mb-3">
                <label class="text-right text-gray-700">Moeda:</label>
                <select [(ngModel)]="newCompany.currency" class="w-32 border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="MT">MT (MZN)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="$">$ (USD)</option>
                  <option value="R$">R$ (BRL)</option>
                  <option value="Kz">Kz (AOA)</option>
                </select>
              </div>

              <div class="grid grid-cols-[100px_1fr] gap-4 items-start mb-3">
                <label class="text-right text-gray-700 mt-2">Logótipo:</label>
                <div class="flex flex-col gap-2">
                  <input type="file" (change)="onLogoSelected($event)" accept="image/*" class="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                  <div *ngIf="newCompany.logoUrl" class="w-32 h-16 border border-gray-200 rounded bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img [src]="newCompany.logoUrl" class="max-w-full max-h-full object-contain">
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-[100px_1fr] gap-4 items-center mb-3">
                <label class="text-right text-gray-700">Formato Doc.:</label>
                <div class="flex flex-col gap-1 w-full">
                  <input [(ngModel)]="newCompany.documentNameFormat" [placeholder]="'{description} Nº.{number} - {series}'" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <span class="text-[10px] text-gray-500">Ex: {{ '{' }}description{{ '}' }} Nº.{{ '{' }}number{{ '}' }} - {{ '{' }}series{{ '}' }}</span>
                </div>
              </div>
            </fieldset>
          </div>

          <!-- Step 2: Localização e Exercício -->
          <div *ngIf="currentStep === 2" class="space-y-4 animate-slide-in">
            <fieldset class="border border-gray-300 rounded p-4 bg-white">
              <legend class="text-xs font-semibold text-gray-700 px-1">Tipo de exercício</legend>
              
              <div class="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label class="block text-gray-700 mb-1">País:</label>
                  <select [(ngModel)]="newCompany.country" class="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:outline-none">
                    <option value="Moçambique">Moçambique</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Angola">Angola</option>
                    <option value="Cabo Verde">Cabo Verde</option>
                  </select>
                </div>
                <div>
                  <label class="block text-gray-700 mb-1">Localização da Sede:</label>
                  <select [(ngModel)]="newCompany.location" class="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:outline-none">
                    <option value="Maputo">Maputo</option>
                    <option value="Beira">Beira</option>
                    <option value="Nampula">Nampula</option>
                    <option value="Lisboa">Lisboa</option>
                    <option value="Porto">Porto</option>
                    <option value="Luanda">Luanda</option>
                  </select>
                </div>
              </div>

              <div class="border border-gray-300 rounded h-48 overflow-y-auto bg-white p-2">
                <div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Planos de Contas Disponíveis</div>
                <div class="space-y-1">
                  <!-- Tree View Simulation -->
                  <div class="flex items-center gap-1 text-gray-700 cursor-pointer hover:bg-blue-50 p-1 rounded" 
                       [class.bg-blue-100]="newCompany.chartOfAccounts === 'PGC-NIR'"
                       (click)="newCompany.chartOfAccounts = 'PGC-NIR'">
                    <span class="material-symbols-outlined text-base text-yellow-600">folder</span>
                    <span>Organizações Privadas (PGC-NIR)</span>
                  </div>
                  <div class="ml-6 flex items-center gap-1 text-gray-700 cursor-pointer hover:bg-blue-50 p-1 rounded"
                       [class.bg-blue-100]="newCompany.chartOfAccounts === 'PGC-PE'"
                       (click)="newCompany.chartOfAccounts = 'PGC-PE'">
                    <span class="material-symbols-outlined text-base text-blue-400">description</span>
                    <span>Pequenas Entidades (PGC-PE)</span>
                  </div>
                  <div class="flex items-center gap-1 text-gray-700 cursor-pointer hover:bg-blue-50 p-1 rounded mt-2"
                       [class.bg-blue-100]="newCompany.chartOfAccounts === 'PUBLIC'"
                       (click)="newCompany.chartOfAccounts = 'PUBLIC'">
                    <span class="material-symbols-outlined text-base text-yellow-600">folder</span>
                    <span>Organizações Públicas</span>
                  </div>
                   <div class="ml-6 flex items-center gap-1 text-gray-700 cursor-pointer hover:bg-blue-50 p-1 rounded"
                       [class.bg-blue-100]="newCompany.chartOfAccounts === 'PUBLIC_GEN'"
                       (click)="newCompany.chartOfAccounts = 'PUBLIC_GEN'">
                    <span class="material-symbols-outlined text-base text-blue-400">description</span>
                    <span>Contabilidade Pública Geral</span>
                  </div>
                </div>
              </div>
            </fieldset>

            <div class="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800 flex gap-2">
              <span class="material-symbols-outlined text-base">info</span>
              <p>O plano de contas selecionado servirá de base para toda a estrutura contabilística da empresa.</p>
            </div>
          </div>

          <!-- Step 3: Configuração de Séries -->
          <div *ngIf="currentStep === 3" class="space-y-4 animate-slide-in">
            <fieldset class="border border-gray-300 rounded p-4 bg-white">
              <legend class="text-xs font-semibold text-gray-700 px-1">Configuração da Série Inicial</legend>
              
              <!-- Mode Selection -->
              <div class="flex gap-6 mb-4 border-b border-gray-100 pb-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="seriesMode" [(ngModel)]="seriesMode" value="NEW" (change)="onSeriesModeChange()" class="text-blue-600 focus:ring-blue-500">
                  <span class="text-gray-900 font-medium">Nova Série</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="seriesMode" [(ngModel)]="seriesMode" value="EXISTING" (change)="onSeriesModeChange()" class="text-blue-600 focus:ring-blue-500">
                  <span class="text-gray-900 font-medium">Utilizar Existente</span>
                </label>
              </div>

              <!-- Existing Series Selection -->
              <div *ngIf="seriesMode === 'EXISTING'" class="mb-4 animate-fade-in">
                <label class="block text-gray-700 mb-1">Selecione a Série:</label>
                <select (change)="onExistingSeriesSelect($event)" class="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:outline-none">
                  <option value="">-- Selecione uma série --</option>
                  <option *ngFor="let s of availableSeries" [value]="s.code">
                    {{ s.code }} - {{ s.description }} ({{ s.startDate | date:'yyyy' }})
                  </option>
                </select>
                <p *ngIf="availableSeries.length === 0" class="text-xs text-orange-500 mt-1">
                  Não existem séries configuradas anteriormente.
                </p>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-gray-700 mb-1">Código da Série:</label>
                  <input [(ngModel)]="seriesConfig.code" [disabled]="seriesMode === 'EXISTING'" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500">
                </div>
                <div>
                  <label class="block text-gray-700 mb-1">Descrição:</label>
                  <input [(ngModel)]="seriesConfig.description" [disabled]="seriesMode === 'EXISTING'" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 mb-1">Data Início:</label>
                  <input type="date" [(ngModel)]="seriesConfig.startDate" [disabled]="seriesMode === 'EXISTING'" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500">
                </div>
                <div>
                  <label class="block text-gray-700 mb-1">Data Fim:</label>
                  <input type="date" [(ngModel)]="seriesConfig.endDate" [disabled]="seriesMode === 'EXISTING'" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500">
                </div>
              </div>
            </fieldset>

            <div *ngIf="dateError" class="bg-red-50 border border-red-200 p-2 rounded text-xs text-red-700 flex items-center gap-2">
              <span class="material-symbols-outlined text-base">error</span>
              {{ dateError }}
            </div>

            <div class="bg-white border border-gray-300 rounded p-4">
               <div class="flex items-center gap-2 mb-2">
                 <input type="checkbox" id="defaultSeries" checked disabled class="text-blue-600 rounded">
                 <label for="defaultSeries" class="text-gray-700">Definir como série por defeito</label>
               </div>
               <p class="text-xs text-gray-500 ml-6">Esta série será sugerida automaticamente em todos os documentos.</p>
            </div>
          </div>

          <!-- Step 4: Configuração de Base de Dados -->
          <div *ngIf="currentStep === 4" class="space-y-4 animate-slide-in">
             <div class="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800 flex gap-2 mb-4">
              <span class="material-symbols-outlined text-base">database</span>
              <p>Configure aqui a ligação exclusiva para esta empresa. Deixe em branco para usar a base de dados principal (Partilhada).</p>
            </div>

            <fieldset class="border border-gray-300 rounded p-4 bg-white">
              <legend class="text-xs font-semibold text-gray-700 px-1">Ligação à Base de Dados</legend>
              
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-gray-700 mb-1">Tipo de Servidor:</label>
                  <select [(ngModel)]="newCompany.dbConfig!.type" class="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:outline-none">
                    <option value="postgres">PostgreSQL (Recomendado)</option>
                    <option value="sqlite">SQLite (Local)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-gray-700 mb-1">Porta:</label>
                  <input type="number" [(ngModel)]="newCompany.dbConfig!.port" placeholder="5432" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
                </div>
              </div>

              <div class="mb-4">
                <label class="block text-gray-700 mb-1">Host / Endereço:</label>
                <input [(ngModel)]="newCompany.dbConfig!.host" placeholder="localhost ou IP" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
              </div>

              <div class="mb-4">
                <label class="block text-gray-700 mb-1">Nome da Base de Dados:</label>
                <input [(ngModel)]="newCompany.dbConfig!.database" [placeholder]="'inverno_erp_' + (newCompany.id || 'tenant')" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 mb-1">Utilizador:</label>
                  <input [(ngModel)]="newCompany.dbConfig!.username" placeholder="postgres" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
                </div>
                <div>
                  <label class="block text-gray-700 mb-1">Palavra-passe:</label>
                  <input type="password" [(ngModel)]="newCompany.dbConfig!.password" placeholder="********" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
                </div>
              </div>
            </fieldset>

            <div class="text-[10px] text-gray-500 italic">
              * Nota: O servidor backend deve ter permissões para criar e aceder a esta base de dados.
            </div>
          </div>

          <!-- Step 5: Resumo -->
          <div *ngIf="currentStep === 5" class="space-y-4 animate-slide-in">
            <div class="bg-white border border-gray-300 rounded p-6">
              <h4 class="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Resumo da Configuração</h4>
              
              <div class="grid grid-cols-2 gap-y-4 text-sm">
                <div class="text-gray-500">Empresa:</div>
                <div class="font-medium">{{ newCompany.name }} ({{ newCompany.id }})</div>
                
                <div class="text-gray-500">Tipo:</div>
                <div class="font-medium">{{ newCompany.type === 'STANDARD' ? 'Standard' : 'Demonstração' }}</div>
                
                <div class="text-gray-500">Localização:</div>
                <div class="font-medium">{{ newCompany.location }}, {{ newCompany.country }}</div>
                
                <div class="text-gray-500">Plano de Contas:</div>
                <div class="font-medium">{{ newCompany.chartOfAccounts }}</div>
                
                <div class="text-gray-500">Série Inicial:</div>
                <div class="font-medium">{{ seriesConfig.code }} ({{ seriesConfig.startDate | date:'dd/MM/yyyy' }})</div>

                <div class="text-gray-500">Base de Dados:</div>
                <div class="font-medium">
                  <span *ngIf="!newCompany.dbConfig?.database" class="text-blue-600 italic">Partilhada (Default)</span>
                  <span *ngIf="newCompany.dbConfig?.database" class="text-green-600 font-mono text-xs">
                    {{ newCompany.dbConfig?.type }}://{{ newCompany.dbConfig?.host }}/{{ newCompany.dbConfig?.database }}
                  </span>
                </div>
              </div>
            </div>

            <div class="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800 flex gap-2">
              <span class="material-symbols-outlined text-base">warning</span>
              <p>Ao confirmar, a base de dados será {{ isEditing ? 'atualizada' : 'inicializada' }}. Este processo pode demorar alguns instantes.</p>
            </div>
          </div>

        </div>

        <!-- Wizard Footer -->
        <div class="bg-[#F0F0F0] px-6 py-3 border-t border-gray-300 flex justify-end items-center gap-2">
          
          <ng-container *ngIf="!isSaving">
            <button 
              (click)="prevStep()" 
              [disabled]="currentStep === 1"
              class="px-4 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm min-w-[80px]"
            >
              Anterior
            </button>
            
            <button 
              *ngIf="currentStep < totalSteps"
              (click)="nextStep()" 
              class="px-4 py-1.5 border border-gray-400 rounded bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-400 text-sm min-w-[80px] font-medium shadow-sm"
            >
              Próximo >
            </button>

            <button 
              *ngIf="currentStep === totalSteps"
              (click)="finishWizard()" 
              class="px-4 py-1.5 border border-blue-600 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm min-w-[80px] font-medium shadow-sm"
            >
              Concluir
            </button>
            
            <button 
              (click)="showWizard = false" 
              class="px-4 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 text-sm min-w-[80px] ml-2"
            >
              Cancelar
            </button>
          </ng-container>

          <!-- Loading Animation -->
          <div *ngIf="isSaving" class="flex items-center gap-3 text-blue-700 animate-pulse font-medium">
            <div class="w-5 h-5 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span>A configurar ambiente... por favor aguarde</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in {
      animation: slideIn 0.2s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in {
      animation: fadeIn 0.15s ease-out forwards;
    }
  `]
})
export class AdminCompaniesComponent implements OnInit {
  companies: Company[] = [];
  showWizard = false;
  currentStep = 1;
  totalSteps = 5;
  dateError = '';
  isEditing = false;
  isSaving = false;
  seriesMode: 'NEW' | 'EXISTING' = 'NEW';
  availableSeries: SeriesConfig[] = [];

  newCompany: Company = this.getEmptyCompany();
  seriesConfig: SeriesConfig = this.getEmptySeriesConfig();

  constructor(private dataService: DataService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadCompanies();
    this.loadSeriesDefinitions();
  }

  getEmptyCompany(): Company {
    return {
      id: '',
      name: '',
      nif: '',
      address: '',
      email: '',
      phone: '',
      website: '',
      currentYear: new Date().getFullYear(),
      type: 'STANDARD',
      category: 'Geral',
      country: 'Moçambique',
      location: 'Maputo',
      chartOfAccounts: 'PGC-NIR',
      currency: 'MT',
      documentNameFormat: '{description} Nº.{number} - {series}',
      dbConfig: {
        type: 'postgres',
        host: '',
        port: 5432,
        username: '',
        password: ''
      }
    };
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newCompany.logoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  getEmptySeriesConfig(): SeriesConfig {
    const year = new Date().getFullYear();
    return {
      code: year.toString(),
      description: `Série ${year}`,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }



  loadSeriesDefinitions() {
    // If we have a new company ID (in wizard), try to load its series
    // Or if we are just loading general definitions, we might want all?
    // For the wizard, we usually want series for the company we are editing.
    // If creating new, we have no ID yet, so no series.
    if (this.newCompany.id) {
      this.dataService.getSeries(this.newCompany.id).subscribe(series => {
        this.availableSeries = series;
      });
    } else {
      this.availableSeries = [];
    }
  }

  onSeriesModeChange() {
    if (this.seriesMode === 'NEW') {
      this.seriesConfig = this.getEmptySeriesConfig();
    } else {
      // Reset to empty but keep dates valid to avoid immediate errors if user hasn't selected yet
      // Ideally we wait for selection.
      this.seriesConfig = {
        code: '',
        description: '',
        startDate: '',
        endDate: ''
      };
    }
  }

  onExistingSeriesSelect(event: any) {
    const code = event.target.value;
    if (!code) return;

    const selected = this.availableSeries.find(s => s.code === code);
    if (selected) {
      this.seriesConfig = { ...selected };
    }
  }

  loadCompanies() {
    this.dataService.getCompanies().subscribe(companies => {
      this.companies = companies;
      this.cdr.detectChanges();

      // Migration path: Check for legacy single company if list is empty
      if (this.companies.length === 0) {
        const legacyStored = localStorage.getItem('erp_company_info');
        if (legacyStored) {
          const info = JSON.parse(legacyStored);
          const fiscalYears = localStorage.getItem('erp_fiscal_years');
          let currentYear = new Date().getFullYear();

          if (fiscalYears) {
            const years = JSON.parse(fiscalYears);
            const active = years.find((y: any) => y.isCurrent);
            if (active) currentYear = active.year;
          }

          const migratedCompany: Company = {
            id: '001',
            ...info,
            currentYear: currentYear,
            type: info.type || 'STANDARD',
            category: info.category || 'Geral',
            country: info.country || 'Moçambique',
            location: info.location || 'Maputo',
            chartOfAccounts: info.chartOfAccounts || 'PGC-NIR'
          };

          this.dataService.saveCompanyInfo(migratedCompany).subscribe(() => {
            this.loadCompanies();
          });
        }
      }
    });
  }

  openWizard() {
    this.resetWizard();
    this.showWizard = true;
    this.isEditing = false;
    this.seriesMode = 'NEW';
    this.loadSeriesDefinitions(); // Refresh list
  }

  editCompany(company: Company) {
    this.newCompany = { ...company };
    this.isEditing = true;
    this.isEditing = true;
    this.showWizard = true;
    this.currentStep = 1;
    if (!this.newCompany.dbConfig) {
      this.newCompany.dbConfig = {
        type: 'postgres',
        host: '',
        port: 5432,
        username: '',
        password: ''
      };
    }
    this.loadSeriesDefinitions(); // Refresh list

    // Priority 1: Load from company object (Professional storage)
    if (company.seriesConfig) {
      this.seriesConfig = { ...company.seriesConfig };
      // Check if this series exists in availableSeries to set mode
      const exists = this.availableSeries.some(s => s.code === this.seriesConfig.code);
      this.seriesMode = exists ? 'EXISTING' : 'NEW';
      return;
    }

    // Priority 2: Attempt to load from available series (which should be loaded by now if company has ID)
    // Since loadSeriesDefinitions is async, we might need to wait or rely on it being fast enough or call it here.

    this.dataService.getSeries(company.id).subscribe(series => {
      this.availableSeries = series;

      const matchingSeries = this.availableSeries.find(s => s.code === company.currentYear.toString());

      if (matchingSeries) {
        this.seriesConfig = { ...matchingSeries };
        this.seriesMode = 'EXISTING';
      } else {
        this.seriesConfig = this.getEmptySeriesConfig();
        this.seriesMode = 'NEW';
        // If company has a specific year, try to set that as default even if no config found
        if (company.currentYear) {
          this.seriesConfig.code = company.currentYear.toString();
          this.seriesConfig.description = `Série ${company.currentYear}`;
          this.seriesConfig.startDate = `${company.currentYear}-01-01`;
          this.seriesConfig.endDate = `${company.currentYear}-12-31`;
        }
      }
    });
  }

  deleteCompany(company: Company) {
    if (confirm(`Tem a certeza que deseja eliminar a empresa ${company.name}?`)) {
      this.dataService.deleteCompany(company.id).subscribe(() => {
        this.loadCompanies();

        // If we deleted the active company, clear it (optional, but good practice)
        const active = localStorage.getItem('erp_company_info');
        if (active) {
          const activeCompany = JSON.parse(active);
          if (activeCompany.id === company.id) {
            this.dataService.setActiveCompany(null);
          }
        }

      });
    }
  }

  resetWizard() {
    this.currentStep = 1;
    this.newCompany = this.getEmptyCompany();
    this.newCompany.id = String(this.companies.length + 1).padStart(3, '0');
    this.seriesConfig = this.getEmptySeriesConfig();
    this.dateError = '';
    this.isEditing = false;
    this.seriesMode = 'NEW';
  }

  getStepTitle() {
    switch (this.currentStep) {
      case 1: return 'Definição da Empresa';
      case 2: return 'Localização e Contabilidade';
      case 3: return 'Gestão de Séries';
      case 4: return 'Infraestrutura de Dados';
      case 5: return 'Resumo e Confirmação';
      default: return '';
    }
  }

  getStepDescription() {
    switch (this.currentStep) {
      case 1: return 'Introduza os dados base da organização e escolha o nível de utilização.';
      case 2: return 'Configure o enquadramento geográfico e o plano de contas a utilizar.';
      case 3: return 'Defina a série de numeração para os documentos de faturação e contabilidade.';
      case 4: return 'Configure o isolamento de dados (opcional). Selecione uma base de dados dedicada.';
      case 5: return 'Verifique se todos os dados estão corretos antes de criar a empresa.';
      default: return '';
    }
  }

  validateSeriesDates(): boolean {
    const start = new Date(this.seriesConfig.startDate);
    const end = new Date(this.seriesConfig.endDate);

    if (!this.seriesConfig.startDate || !this.seriesConfig.endDate) {
      this.dateError = 'As datas de início e fim são obrigatórias.';
      return false;
    }

    if (start > end) {
      this.dateError = 'A data de início não pode ser superior à data de fim.';
      return false;
    }

    this.dateError = '';
    return true;
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (!this.newCompany.name || !this.newCompany.id || !this.newCompany.nif) {
        alert('Por favor preencha os campos obrigatórios.');
        return;
      }
    }

    if (this.currentStep === 3) {
      if (!this.validateSeriesDates()) {
        return;
      }
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  finishWizard() {
    this.isSaving = true;
    this.cdr.detectChanges();

    // Save series config into company object for professional persistence
    this.newCompany.seriesConfig = { ...this.seriesConfig };

    // Save Company via Service
    this.dataService.saveCompanyInfo(this.newCompany).subscribe({
      next: () => {
        // Setup Fiscal Year based on Series Start Date
        const startYear = new Date(this.seriesConfig.startDate).getFullYear();

        const newFiscalYear = {
          year: startYear,
          status: 'OPEN',
          isCurrent: true,
          startDate: this.seriesConfig.startDate,
          endDate: this.seriesConfig.endDate,
          companyId: this.newCompany.id
        };

        this.dataService.saveFiscalYear(newFiscalYear).subscribe({
          next: () => {
            // Save Global Series Definition
            this.saveGlobalSeries({ ...this.seriesConfig, companyId: this.newCompany.id });

            // Create Series for the new year
            this.createSeriesForYear(this.seriesConfig.code);

            this.isSaving = false;
            this.showWizard = false;
            this.loadCompanies();
            alert(`Empresa ${this.isEditing ? 'atualizada' : 'criada'} com sucesso!`);
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Error saving fiscal year:', err);
            alert(`Erro ao configurar exercício fiscal: ${err.message || 'Erro desconhecido'}`);
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error saving company:', err);
        alert(`Erro ao gravar empresa: ${err.message || 'Erro desconhecido'}`);
        this.cdr.detectChanges();
      }
    });
  }

  saveGlobalSeries(config: SeriesConfig) {
    // We need to adapt SeriesConfig to Series entity structure if they differ, but they seem compatible enough for now
    // except SeriesConfig might miss some fields like 'active' or 'module' which backend might expect or default.
    const seriesData: any = {
      ...config,
      active: true,
      module: 'GLOBAL'
    };

    // If it doesn't have an ID, we might need to generate one or let backend handle it.
    // Backend saveSeries uses save() which inserts or updates.
    if (!seriesData.id) {
      seriesData.id = `SERIES_${config.code}_${config.companyId}_${Date.now()}`;
    }

    this.dataService.saveSeries(seriesData).subscribe();
  }

  createSeriesForYear(seriesCode: string) {
    const modules: ('SALES' | 'PURCHASES' | 'STOCK' | 'TREASURY')[] = ['SALES', 'PURCHASES', 'STOCK', 'TREASURY'];

    modules.forEach(module => {
      this.dataService.getDocumentTypes(module).subscribe(docTypes => {
        if (docTypes && docTypes.length > 0) {
          let updated = false;

          docTypes.forEach((dt: any) => {
            if (!dt.series) dt.series = [];

            // Check if exists
            const existing = dt.series.find((s: any) => s.code === seriesCode && s.companyId === this.newCompany.id);

            if (!existing) {
              dt.series.unshift({
                code: seriesCode,
                description: this.seriesConfig.description,
                active: true,
                startDate: this.seriesConfig.startDate,
                endDate: this.seriesConfig.endDate,
                companyId: this.newCompany.id,
                currentNumber: 1
              });
              updated = true;
            }
          });

          if (updated) {
            this.dataService.saveDocumentTypes(module, docTypes).subscribe();
          }
        }
      });
    });
  }
}
