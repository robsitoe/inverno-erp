import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LicenseService, LicenseInfo } from '../../services/license.service';

@Component({
  selector: 'app-license-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-[#F0F2F5] p-6 space-y-6 overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between text-gray-800">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-600 rounded-lg shadow-lg text-white">
            <span class="material-symbols-outlined text-2xl">verified</span>
            </div>
            <div>
            <h1 class="text-2xl font-bold tracking-tight">Gestão de Licenciamento</h1>
            <p class="text-sm text-gray-500">Controle a validade e as funcionalidades do seu ERP</p>
            </div>
        </div>
        <button (click)="toggleGenerator()" class="text-gray-400 hover:text-gray-600 transition-colors" title="Modo Administrador">
            <span class="material-symbols-outlined">settings_suggest</span>
        </button>
      </div>

      <!-- Generator Mode (Hidden by default) -->
      <div *ngIf="showGenerator" class="bg-gray-800 text-white rounded-xl shadow-lg border border-gray-700 overflow-hidden mb-6 animate-fade-in">
        <div class="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
            <h2 class="font-bold flex items-center gap-2 text-yellow-500">
                <span class="material-symbols-outlined">key</span>
                Gerador de Licenças (Admin)
            </h2>
            <button (click)="showGenerator = false" class="text-gray-400 hover:text-white"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Empresa Cliente</label>
                <input [(ngModel)]="genCompany" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-yellow-500 outline-none text-white" placeholder="Nome da Empresa">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Licença</label>
                <select [(ngModel)]="genType" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-yellow-500 outline-none text-white">
                    <option value="DEMO">Demonstração</option>
                    <option value="PRO">Profissional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Validade (Dias)</label>
                <input type="number" [(ngModel)]="genDays" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-yellow-500 outline-none text-white" placeholder="365">
            </div>
            <div class="md:col-span-3">
                <button (click)="generateKey()" class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded transition-colors flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">vpn_key</span> GERAR CHAVE
                </button>
            </div>
            <div *ngIf="generatedKey" class="md:col-span-3 mt-2 bg-black/30 p-4 rounded border border-gray-600 relative group">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Chave Gerada</label>
                <code class="block font-mono text-xs break-all text-green-400">{{ generatedKey }}</code>
                <button (click)="copyKey()" class="absolute top-2 right-2 text-gray-400 hover:text-white bg-gray-700 p-1 rounded">
                    <span class="material-symbols-outlined text-sm">content_copy</span>
                </button>
            </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Current License Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 class="font-bold text-gray-700 flex items-center gap-2">
              <span class="material-symbols-outlined text-gray-400">badge</span>
              Licença Atual
            </h2>
            <span [class]="getStatusClass(license?.status || 'INVALID')" class="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider">
              {{ license?.status === 'VALID' ? 'Ativa' : license?.status === 'EXPIRED' ? 'Expirada' : 'Inválida' }}
            </span>
          </div>
          
          <div class="p-6 flex-1 space-y-6" *ngIf="license">
            <div class="text-center py-4">
              <div class="inline-flex items-center justify-center size-20 rounded-full bg-blue-50 text-blue-600 mb-3 relative">
                 <span class="material-symbols-outlined text-4xl">workspace_premium</span>
                 <div class="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                    <span class="material-symbols-outlined text-green-500 text-sm" *ngIf="license.status === 'VALID'">check_circle</span>
                    <span class="material-symbols-outlined text-red-500 text-sm" *ngIf="license.status !== 'VALID'">error</span>
                 </div>
              </div>
              <h3 class="text-xl font-bold text-gray-800">{{ license.companyName }}</h3>
              <p class="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest">{{ license.type }} EDITION</p>
            </div>

            <div class="space-y-4">
               <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                 <span class="text-sm text-gray-500">Expira em</span>
                 <span class="font-mono font-bold text-gray-800">{{ license.expirationDate | date:'dd/MM/yyyy' }}</span>
               </div>
               <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                 <span class="text-sm text-gray-500">Dias Restantes</span>
                 <span class="font-mono font-bold" [class.text-red-500]="getDaysRemaining() < 7" [class.text-green-600]="getDaysRemaining() >= 7">
                    {{ getDaysRemaining() }} dias
                 </span>
               </div>
               <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                 <span class="text-sm text-gray-500">Chave</span>
                 <span class="font-mono text-xs text-gray-400 truncate max-w-[150px]">{{ license.key }}</span>
               </div>
            </div>
          </div>
        </div>

        <!-- Activation Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div class="p-6 border-b border-gray-100 bg-gray-50/50">
             <h2 class="font-bold text-gray-700 flex items-center gap-2">
              <span class="material-symbols-outlined text-gray-400">key</span>
              Ativar Nova Licença
            </h2>
          </div>
          
          <div class="p-6 flex-1 flex flex-col justify-center space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Chave de Licença</label>
              <textarea 
                [(ngModel)]="activationKey"
                rows="4"
                class="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 font-mono text-xs text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                placeholder="Cole aqui a sua chave de licença..."
              ></textarea>
            </div>

            <button 
              (click)="activate()"
              [disabled]="!activationKey"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined">lock_open</span>
              ATIVAR LICENÇA
            </button>
            
            <div *ngIf="message" [class]="'p-3 rounded text-xs font-medium flex items-center gap-2 ' + (success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')">
               <span class="material-symbols-outlined text-lg">{{ success ? 'check' : 'error' }}</span>
               {{ message }}
            </div>

            <div class="pt-6 border-t border-gray-100 mt-4">
               <p class="text-[10px] text-gray-400 text-center uppercase tracking-wider mb-3">Zona de Testes (Desenvolvimento)</p>
               <button (click)="generateDemoKey()" class="w-full border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 py-2 rounded text-xs transition-colors">
                 Gerar Chave de Demo (30 Dias)
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LicenseManagerComponent implements OnInit {
  license: LicenseInfo | null = null;
  activationKey: string = '';
  message: string = '';
  success: boolean = false;

  // Generator State
  showGenerator = false;
  genCompany = '';
  genType = 'PRO';
  genDays = 365;
  generatedKey = '';

  constructor(private licenseService: LicenseService) { }

  ngOnInit() {
    this.licenseService.license$.subscribe(lic => {
      this.license = lic;
    });
  }

  toggleGenerator() {
    this.showGenerator = !this.showGenerator;
  }

  generateKey() {
    if (!this.genCompany || !this.genDays) return;
    this.generatedKey = this.licenseService.generateLicenseKey(this.genCompany, this.genType, this.genDays);
  }

  copyKey() {
    navigator.clipboard.writeText(this.generatedKey);
    alert('Chave copiada!');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'VALID': return 'bg-green-100 text-green-700 border border-green-200';
      case 'EXPIRED': return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  getDaysRemaining(): number {
    if (!this.license) return 0;
    const now = new Date();
    const exp = new Date(this.license.expirationDate);
    const diff = exp.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  activate() {
    this.message = '';

    if (!this.activationKey) return;

    const result = this.licenseService.activateLicense(this.activationKey);
    if (result) {
      this.success = true;
      this.message = 'Licença ativada com sucesso!';
      this.activationKey = '';
    } else {
      this.success = false;
      this.message = 'Chave de licença inválida ou corrompida.';
    }
  }

  generateDemoKey() {
    // Generate a key for the current company or a generic one
    const key = this.licenseService.generateLicenseKey('Minha Empresa Demo', 'PRO', 30);
    this.activationKey = key;
    this.message = 'Chave de demonstração gerada. Clique em "Ativar" para aplicar.';
    this.success = true; // technically just info
  }
}
