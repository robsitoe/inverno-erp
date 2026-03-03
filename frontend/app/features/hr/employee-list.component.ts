import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HRService, Employee, EmployeeDocument } from '../../shared/hr.service';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { Subscription, Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

const MOZAMBIQUE_BANKS = [
  'Millennium Bim',
  'BCI',
  'Standard Bank',
  'Absa Bank',
  'Moza Banco',
  'FNB',
  'Banco Único',
  'Nedbank',
  'Access Bank',
  'MyBucks',
  'Banguat'
];

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="newEmployee()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs text-nowrap">
          <app-icon name="person_add" [size]="18"></app-icon>
          <span>Novo Funcionário</span>
        </button>
        <button (click)="saveEmployee()" [disabled]="!selectedEmployee || isSaving || hasNibConflict"
          class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs disabled:opacity-40 disabled:cursor-not-allowed text-nowrap">
          <app-icon name="save" [size]="18"></app-icon>
          <span>{{ isSaving ? 'A gravar...' : 'Gravar' }}</span>
        </button>
        <button (click)="deleteEmployee()" [disabled]="!selectedEmployee?.id"
          class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs text-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-nowrap">
          <app-icon name="delete" [size]="18"></app-icon>
          <span>Eliminar</span>
        </button>
      </div>

      <!-- Main Content -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Employee List (Left Panel) -->
        <div class="w-80 border-r border-gray-300 bg-white flex flex-col">
          <div class="p-2 border-b border-gray-200">
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              (ngModelChange)="filterEmployees()"
              placeholder="Procurar funcionário..."
              class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="flex-1 overflow-auto">
            <div 
              *ngFor="let emp of filteredEmployees"
              (click)="selectEmployee(emp)"
              [class.bg-blue-50]="selectedEmployee?.id === emp.id"
              [class.border-l-4]="selectedEmployee?.id === emp.id"
              [class.border-l-blue-600]="selectedEmployee?.id === emp.id"
              class="p-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div class="font-medium text-xs text-gray-800">{{ emp.code }} - {{ emp.name }}</div>
              <div class="text-[10px] text-gray-600 truncate">{{ emp.position }} | {{ emp.department }}</div>
              <div class="text-[10px] text-gray-500 mt-1">Salário: {{ emp.salaryBase | number:'1.2-2' }} MT</div>
            </div>

            <div *ngIf="filteredEmployees.length === 0" class="p-4 text-center text-xs text-gray-400">
              Nenhum funcionário encontrado
            </div>
          </div>
        </div>

        <!-- Employee Details (Right Panel) -->
        <div class="flex-1 overflow-auto p-4 bg-[#F0F0F0]">
          <div *ngIf="selectedEmployee" class="max-w-4xl bg-white p-6 rounded shadow-sm">
            <h2 class="text-lg font-semibold text-gray-800 mb-6 border-b pb-2">
              {{ selectedEmployee.id ? 'Ficha do Funcionário' : 'Novo Funcionário' }}
            </h2>
            
            <div class="flex gap-8">
              <!-- Photo Section (Top Left) -->
              <div class="shrink-0">
                <div class="relative group">
                  <div class="w-40 h-40 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-white bg-cover bg-center shadow-inner"
                    [style.background-image]="selectedEmployee.id && selectedEmployee.photoUrl ? 'url(' + getFileUrl(selectedEmployee.photoUrl) + ')' : 'none'">
                    <app-icon *ngIf="!selectedEmployee.photoUrl || !selectedEmployee.id" name="account_circle" [size]="80" class="text-gray-100"></app-icon>
                    
                    <div *ngIf="selectedEmployee.id" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      (click)="photoInput.click()">
                      <app-icon name="upload" [size]="32" color="white"></app-icon>
                    </div>
                  </div>
                  <input #photoInput type="file" (change)="onPhotoUpload($event)" accept="image/*" class="hidden">
                </div>
                <p class="text-[10px] text-gray-400 mt-2 text-center italic w-40 leading-tight">
                  {{ selectedEmployee.id ? 'Clique para alterar foto' : 'Grave primeiro para adicionar foto' }}
                </p>

                <!-- Status Indicator (Quick Info) -->
                <div *ngIf="selectedEmployee.id" class="mt-8 space-y-2 border-t pt-4">
                    <p class="text-[10px] font-bold text-gray-400 uppercase">Estado da Documentação</p>
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-gray-600">B.I.</span>
                        <app-icon [name]="hasDoc('BI') ? 'check_circle' : 'cancel'" [size]="14" [color]="hasDoc('BI') ? '#10b981' : '#ef4444'"></app-icon>
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-gray-600">Contrato</span>
                        <app-icon [name]="hasDoc('CONTRATO') ? 'check_circle' : 'cancel'" [size]="14" [color]="hasDoc('CONTRATO') ? '#10b981' : '#ef4444'"></app-icon>
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-gray-600">NUIT</span>
                        <app-icon [name]="hasDoc('NUIT') ? 'check_circle' : 'cancel'" [size]="14" [color]="hasDoc('NUIT') ? '#10b981' : '#ef4444'"></app-icon>
                    </div>
                </div>
              </div>

              <!-- Main Form Content -->
              <div class="flex-1 grid grid-cols-2 gap-x-8 gap-y-4">
                <!-- Identificação -->
                <div class="col-span-2">
                    <h3 class="font-medium text-blue-900 border-b border-blue-50 pb-1 flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                        <app-icon name="person" [size]="18" color="#1e3a8a"></app-icon>
                        Dados de Identificação
                    </h3>
                </div>

                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Código do Funcionário *</label>
                  <div class="relative">
                    <input 
                      type="text" 
                      [(ngModel)]="selectedEmployee.code"
                      (ngModelChange)="onCodeChange($event)"
                      [class.border-red-400]="codeStatus === 'taken'"
                      [class.border-green-400]="codeStatus === 'available'"
                      class="w-full px-3 py-2 border rounded text-xs pr-8 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-bold"
                    >
                    <span *ngIf="codeStatus === 'checking'" class="absolute right-2 top-1/2 -translate-y-1/2">
                      <svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"></path>
                      </svg>
                    </span>
                    <app-icon *ngIf="codeStatus === 'available'" name="check" [size]="18" color="#10b981" class="absolute right-2 top-1/2 -translate-y-1/2"></app-icon>
                    <app-icon *ngIf="codeStatus === 'taken'" name="error" [size]="18" color="#ef4444" class="absolute right-2 top-1/2 -translate-y-1/2"></app-icon>
                  </div>
                </div>

                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome Completo *</label>
                  <input type="text" [(ngModel)]="selectedEmployee.name" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all">
                </div>
                
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">NUIT (Número Único Identificação Tributária) *</label>
                  <input type="text" [(ngModel)]="selectedEmployee.nif" placeholder="9 algarismos" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500">
                </div>
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">INSS</label>
                  <input type="text" [(ngModel)]="selectedEmployee.inss" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>

                <!-- Contactos -->
                <div class="col-span-2 mt-4">
                    <h3 class="font-medium text-gray-800 border-b border-gray-100 pb-1 flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                        <app-icon name="contacts" [size]="18" color="#4b5563"></app-icon>
                        Morada & Contactos
                    </h3>
                </div>
                <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Endereço de Residência</label>
                    <input type="text" [(ngModel)]="selectedEmployee.address" placeholder="Av... Rua... Casa nº..." class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Telefone / Telemóvel</label>
                  <input type="text" [(ngModel)]="selectedEmployee.phone" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email</label>
                  <input type="email" [(ngModel)]="selectedEmployee.email" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>

                <!-- Profissional -->
                <div class="col-span-2 mt-4">
                    <h3 class="font-medium text-green-900 border-b border-green-50 pb-1 flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                        <app-icon name="work" [size]="18" color="#166534"></app-icon>
                        Dados Profissionais & Salário
                    </h3>
                </div>
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cargo / Função</label>
                  <input type="text" [(ngModel)]="selectedEmployee.position" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Departamento</label>
                  <input type="text" [(ngModel)]="selectedEmployee.department" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>
                
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Contrato (Lei 13/2023)</label>
                  <select [(ngModel)]="selectedEmployee.contractType" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                    <option value="INDETERMINADO">Tempo Indeterminado</option>
                    <option value="DETERMINADO_CERTO">Tempo Determinado Certo</option>
                    <option value="DETERMINADO_INCERTO">Tempo Determinado Incerto</option>
                    <option value="TELETRABALHO">Teletrabalho</option>
                    <option value="INTERMITENTE">Trabalho Intermitente</option>
                    <option value="SAZONAL">Trabalho Sazonal</option>
                    <option value="EVENTUAL">Trabalho Eventual</option>
                    <option value="DOMICILIO">Trabalho no Domicílio</option>
                    <option value="ESTAGIO">Estágio Profissional</option>
                  </select>
                </div>
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data de Admissão *</label>
                  <input type="date" [(ngModel)]="selectedEmployee.hireDate" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>

                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fim do Período de Experiência</label>
                  <input type="date" [(ngModel)]="selectedEmployee.trialPeriodEnd" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>

                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Horas Semanais (Normal: 44h)</label>
                  <input type="number" [(ngModel)]="selectedEmployee.weeklyHours" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                </div>

                <div *ngIf="selectedEmployee.contractType !== 'INDETERMINADO'" class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data de Terminação (Contrato Termo)</label>
                  <input type="date" [(ngModel)]="selectedEmployee.endDate" class="w-full px-3 py-2 border rounded text-xs bg-blue-50 focus:bg-white">
                </div>

                <div class="col-span-1 bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col justify-center shadow-sm">
                  <label class="block text-[11px] font-black text-blue-900 uppercase mb-1 tracking-tighter">Salário Base (MT)</label>
                  <input type="number" [(ngModel)]="selectedEmployee.salaryBase" class="w-full px-3 py-2 border-2 border-blue-200 rounded text-lg text-right font-black text-blue-700 bg-white ring-blue-500 ring-offset-2 focus:ring-2 outline-none">
                </div>

                <div class="col-span-1 bg-orange-50 p-4 rounded-lg border border-orange-100 flex flex-col justify-center shadow-sm">
                  <label class="block text-[11px] font-black text-orange-900 uppercase mb-1 tracking-tighter">Dependentes (IRPS)</label>
                  <select [(ngModel)]="selectedEmployee.dependents" class="w-full px-3 py-2 border-2 border-orange-200 rounded text-lg text-right font-black text-orange-700 bg-white focus:ring-2 focus:ring-orange-500 outline-none">
                    <option [ngValue]="0">0 Dependentes</option>
                    <option [ngValue]="1">1 Dependente</option>
                    <option [ngValue]="2">2 Dependentes</option>
                    <option [ngValue]="3">3 Dependentes</option>
                    <option [ngValue]="4">4 ou mais</option>
                  </select>
                </div>

                <div class="col-span-1 grid grid-cols-1 gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <label class="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Subs. Transporte</label>
                    <input type="number" [(ngModel)]="selectedEmployee.subsidyTransport" class="w-24 px-2 py-1.5 border rounded text-xs text-right bg-gray-50">
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <label class="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Subs. Alimentação</label>
                    <input type="number" [(ngModel)]="selectedEmployee.subsidyFood" class="w-24 px-2 py-1.5 border rounded text-xs text-right bg-gray-50">
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <label class="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Subs. Habitação</label>
                    <input type="number" [(ngModel)]="selectedEmployee.subsidyHousing" class="w-24 px-2 py-1.5 border rounded text-xs text-right bg-gray-50">
                  </div>
                </div>

                <!-- Pagamento -->
                <div class="col-span-2 mt-4">
                    <h3 class="font-medium text-amber-900 border-b border-amber-50 pb-1 flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                        <app-icon name="account_balance" [size]="18" color="#78350f"></app-icon>
                        Dados Bancários
                    </h3>
                </div>
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Banco</label>
                  <select [(ngModel)]="selectedEmployee.bankName" class="w-full px-3 py-2 border rounded text-xs bg-gray-50 focus:bg-white">
                    <option value="">-- Seleccionar Banco --</option>
                    <option *ngFor="let bank of banks" [value]="bank">{{ bank }}</option>
                  </select>
                </div>
                <div class="col-span-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">NIB / IBAN</label>
                  <div class="relative">
                    <input 
                      type="text" 
                      [(ngModel)]="selectedEmployee.nib"
                      (ngModelChange)="onNibChange($event)"
                      [class.border-red-400]="nibStatus === 'taken'"
                      [class.border-green-400]="nibStatus === 'available' && selectedEmployee.nib"
                      class="w-full px-3 py-2 border rounded text-xs pr-8 font-mono tracking-widest bg-gray-50 focus:bg-white"
                      placeholder="000.0000.0000000000.00"
                    >
                    <app-icon *ngIf="nibStatus === 'available' && selectedEmployee.nib" name="verified" [size]="18" color="#10b981" class="absolute right-2 top-1/2 -translate-y-1/2"></app-icon>
                    <app-icon *ngIf="nibStatus === 'taken'" name="warning" [size]="18" color="#ef4444" class="absolute right-2 top-1/2 -translate-y-1/2"></app-icon>
                  </div>
                  <div *ngIf="nibStatus === 'taken' && nibConflictName" class="mt-1 text-[10px] text-red-600 bg-red-50 p-1 border border-red-100 rounded">
                    NIB já em uso por: <strong>{{ nibConflictName }}</strong>
                  </div>
                </div>

                <!-- Documentação Oficiais -->
                <div class="col-span-2 mt-4">
                    <h3 class="font-medium text-gray-800 border-b border-gray-100 pb-1 flex items-center gap-2 text-sm uppercase tracking-wide mb-4">
                        <app-icon name="fact_check" [size]="18" color="#1f2937"></app-icon>
                        Documentação Obrigatória
                    </h3>
                    
                    <div *ngIf="!selectedEmployee.id" class="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded text-center">
                        <p class="text-[11px] text-gray-500 italic">Grave o funcionário primeiro para habilitar o upload de documentos escaneados.</p>
                    </div>

                    <div *ngIf="selectedEmployee.id" class="grid grid-cols-4 gap-4">
                        <!-- BI -->
                        <div class="relative group cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all hover:shadow-md"
                             [class.border-green-200]="hasDoc('BI')" [class.bg-green-50]="hasDoc('BI')"
                             (click)="triggerDocUpload('BI')">
                            <app-icon name="badge" [size]="32" [color]="hasDoc('BI') ? '#059669' : '#94a3b8'"></app-icon>
                            <span class="text-[10px] font-bold text-center leading-tight uppercase" [class.text-green-800]="hasDoc('BI')">B.I. / Identidade</span>
                            <div *ngIf="hasDoc('BI')" class="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                <app-icon name="check" [size]="12"></app-icon>
                            </div>
                            <div class="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                <app-icon name="file_upload" [size]="20" color="#2563eb"></app-icon>
                            </div>
                        </div>

                        <!-- CONTRATO -->
                        <div class="relative group cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all hover:shadow-md"
                             [class.border-green-200]="hasDoc('CONTRATO')" [class.bg-green-50]="hasDoc('CONTRATO')"
                             (click)="triggerDocUpload('CONTRATO')">
                            <app-icon name="history_edu" [size]="32" [color]="hasDoc('CONTRATO') ? '#059669' : '#94a3b8'"></app-icon>
                            <span class="text-[10px] font-bold text-center leading-tight uppercase" [class.text-green-800]="hasDoc('CONTRATO')">Contrato Assinado</span>
                            <div *ngIf="hasDoc('CONTRATO')" class="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                <app-icon name="check" [size]="12"></app-icon>
                            </div>
                            <div class="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                <app-icon name="file_upload" [size]="20" color="#2563eb"></app-icon>
                            </div>
                        </div>

                        <!-- NUIT -->
                        <div class="relative group cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all hover:shadow-md"
                             [class.border-green-200]="hasDoc('NUIT')" [class.bg-green-50]="hasDoc('NUIT')"
                             (click)="triggerDocUpload('NUIT')">
                            <app-icon name="vignette" [size]="32" [color]="hasDoc('NUIT') ? '#059669' : '#94a3b8'"></app-icon>
                            <span class="text-[10px] font-bold text-center leading-tight uppercase" [class.text-green-800]="hasDoc('NUIT')">Cartão NUIT</span>
                            <div *ngIf="hasDoc('NUIT')" class="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                <app-icon name="check" [size]="12"></app-icon>
                            </div>
                            <div class="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                <app-icon name="file_upload" [size]="20" color="#2563eb"></app-icon>
                            </div>
                        </div>

                        <!-- INSS -->
                        <div class="relative group cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all hover:shadow-md"
                             [class.border-green-200]="hasDoc('INSS')" [class.bg-green-50]="hasDoc('INSS')"
                             (click)="triggerDocUpload('INSS')">
                            <app-icon name="security" [size]="32" [color]="hasDoc('INSS') ? '#059669' : '#94a3b8'"></app-icon>
                            <span class="text-[10px] font-bold text-center leading-tight uppercase" [class.text-green-800]="hasDoc('INSS')">Cartão INSS</span>
                            <div *ngIf="hasDoc('INSS')" class="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                <app-icon name="check" [size]="12"></app-icon>
                            </div>
                            <div class="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                <app-icon name="file_upload" [size]="20" color="#2563eb"></app-icon>
                            </div>
                        </div>
                    </div>

                    <!-- List of other/uploaded docs -->
                    <div *ngIf="selectedEmployee.id && (selectedEmployee.documents?.length || 0) > 0" class="mt-6">
                        <p class="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Ficheiros Anexados ({{selectedEmployee.documents?.length}})</p>
                        <div class="grid grid-cols-2 gap-2">
                             <div *ngFor="let doc of selectedEmployee.documents" 
                                  class="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 hover:bg-white transition-all group">
                                <div class="flex items-center gap-2">
                                    <app-icon [name]="doc.mimeType.includes('pdf') ? 'picture_as_pdf' : 'description'" [size]="16" color="#64748b"></app-icon>
                                    <div class="flex flex-col">
                                        <span class="text-[11px] font-bold text-gray-700 leading-none">{{ doc.label }}</span>
                                        <span class="text-[9px] text-gray-400 mt-0.5 uppercase">{{ doc.type }} • {{(doc.size/1024)|number:'1.0-0'}} KB</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                    <a [href]="getFileUrl(doc.url)" target="_blank" title="Ver Ficheiro" class="p-1 hover:bg-blue-100 rounded text-blue-600">
                                        <app-icon name="visibility" [size]="14"></app-icon>
                                    </a>
                                    <button (click)="removeDocument(doc.id)" title="Eliminar" class="p-1 hover:bg-red-100 rounded text-red-600">
                                        <app-icon name="delete" [size]="14"></app-icon>
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
            <input #docInputHidden id="docInputHidden" type="file" (change)="onDocUpload($event)" class="hidden">
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!selectedEmployee" class="flex-1 flex items-center justify-center bg-[#F0F0F0] text-gray-400">
          <div class="text-center">
            <app-icon name="badge" [size]="64" class="mb-2 opacity-20"></app-icon>
            <p class="text-sm">Selecione um funcionário para ver os detalhes</p>
            <button (click)="newEmployee()" class="mt-3 px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 shadow transition-all">
              + Novo Funcionário
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EmployeeListComponent implements OnInit, OnDestroy {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  selectedEmployee: Employee | null = null;
  searchTerm = '';
  isSaving = false;

  // Validation state
  codeStatus: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  nibStatus: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  nibConflictName = '';

  banks = MOZAMBIQUE_BANKS;

  private sub = new Subscription();
  private codeCheck$ = new Subject<string>();
  private nibCheck$ = new Subject<string>();

  get hasNibConflict(): boolean {
    return this.nibStatus === 'taken';
  }

  constructor(
    private hrService: HRService,
    private dataService: DataService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.sub.add(
      this.dataService.activeCompany$.subscribe(company => {
        if (company) {
          this.refresh();
        }
      })
    );
    this.setupCodeCheck();
    this.setupNibCheck();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private getCompanyId(): string {
    return JSON.parse(localStorage.getItem('erp_company_info') || '{}').id || '';
  }

  private setupCodeCheck() {
    this.sub.add(
      this.codeCheck$.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(code => {
          if (!code || !this.selectedEmployee) return [{ available: true }];
          this.codeStatus = 'checking';
          return this.hrService.checkCode(code, this.getCompanyId(), this.selectedEmployee.id || undefined);
        })
      ).subscribe(result => {
        this.codeStatus = result.available ? 'available' : 'taken';
        this.cdr.detectChanges();
      })
    );
  }

  private setupNibCheck() {
    this.sub.add(
      this.nibCheck$.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(nib => {
          if (!nib?.trim() || !this.selectedEmployee) return [{ available: true, usedBy: undefined as string | undefined }];
          this.nibStatus = 'checking';
          return this.hrService.checkNib(nib, this.getCompanyId(), this.selectedEmployee.id || undefined);
        })
      ).subscribe(result => {
        if (result.available) {
          this.nibStatus = 'available';
          this.nibConflictName = '';
        } else {
          this.nibStatus = 'taken';
          this.nibConflictName = result.usedBy || 'Outro funcionário';
        }
        this.cdr.detectChanges();
      })
    );
  }

  refresh() {
    const cid = this.getCompanyId();
    if (!cid) return;

    this.sub.add(
      this.hrService.loadEmployees(cid).subscribe({
        next: (data) => {
          this.employees = data;
          this.filterEmployees();
          this.cdr.detectChanges();
        },
        error: (err) => this.toaster.showError('Erro ao carregar', err.message)
      })
    );
  }

  filterEmployees() {
    const s = this.searchTerm.toLowerCase().trim();
    if (!s) {
      this.filteredEmployees = [...this.employees];
    } else {
      this.filteredEmployees = this.employees.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.code.toLowerCase().includes(s) ||
        (e.position || '').toLowerCase().includes(s)
      );
    }
  }

  selectEmployee(emp: Employee) {
    // Clone to avoid direct mutation
    this.selectedEmployee = { ...emp };
    this.codeStatus = 'idle';
    this.nibStatus = 'idle';
    this.nibConflictName = '';
  }

  newEmployee() {
    this.selectedEmployee = {
      code: '',
      name: '',
      salaryBase: 0,
      subsidyTransport: 0,
      subsidyFood: 0,
      subsidyHousing: 0,
      contractType: 'INDETERMINADO',
      weeklyHours: 44,
      isActive: true
    } as Employee;
    this.codeStatus = 'idle';
    this.nibStatus = 'idle';
    this.nibConflictName = '';
  }

  onCodeChange(val: string) {
    this.codeCheck$.next(val);
  }

  onNibChange(val: string) {
    this.nibCheck$.next(val);
  }

  saveEmployee() {
    if (!this.selectedEmployee) return;
    if (!this.selectedEmployee.code || !this.selectedEmployee.name) {
      this.toaster.showError('Erro', 'Código e Nome são obrigatórios.');
      return;
    }

    this.isSaving = true;
    const cid = this.getCompanyId();

    this.sub.add(
      this.hrService.saveEmployee(this.selectedEmployee, cid).subscribe({
        next: (saved) => {
          this.toaster.showSuccess('Sucesso', 'Funcionário gravado com sucesso.');
          this.isSaving = false;
          this.refresh();
          this.selectEmployee(saved);
        },
        error: (err) => {
          this.isSaving = false;
          this.toaster.showError('Erro ao gravar', err.error?.message || err.message);
        }
      })
    );
  }

  deleteEmployee() {
    if (!this.selectedEmployee?.id || !confirm('Deseja eliminar este funcionário?')) return;

    this.sub.add(
      this.hrService.deleteEmployee(this.selectedEmployee.id).subscribe({
        next: () => {
          this.toaster.showSuccess('Eliminado', 'Funcionário removido com sucesso.');
          this.selectedEmployee = null;
          this.refresh();
        },
        error: (err) => this.toaster.showError('Erro ao eliminar', err.message)
      })
    );
  }

  cancel() {
    this.selectedEmployee = null;
    this.codeStatus = 'idle';
    this.nibStatus = 'idle';
    this.nibConflictName = '';
  }

  // ── File Handling ──────────────────────────────────────────────────────────

  getFileUrl(path: string) {
    return this.hrService.getFileUrl(path);
  }

  hasDoc(type: string): boolean {
    return !!this.selectedEmployee?.documents?.some(d => d.type === type);
  }

  private currentUploadType: string = 'OUTRO';

  triggerDocUpload(type: string) {
    this.currentUploadType = type;
    const input = document.getElementById('docInputHidden') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  onPhotoUpload(event: any) {
    const file = event.target.files[0];
    if (!file || !this.selectedEmployee?.id) return;

    this.toaster.showWarning('Carregando...', 'Aguarde o upload da foto');

    this.sub.add(
      this.hrService.uploadPhoto(this.selectedEmployee.id, this.getCompanyId(), file).subscribe({
        next: (emp) => {
          this.toaster.showSuccess('Sucesso', 'Foto actualizada com sucesso.');
          this.selectedEmployee!.photoUrl = emp.photoUrl;
          this.updateEmployeeInList(emp);
          this.cdr.detectChanges();
        },
        error: (e) => this.toaster.showError('Erro no upload', e?.error?.message || e.message)
      })
    );
  }

  onDocUpload(event: any) {
    const file = event.target.files[0];
    if (!file || !this.selectedEmployee?.id) return;

    let type = this.currentUploadType;
    let label = '';

    if (type === 'BI') label = 'BI / Bilhete de Identidade';
    else if (type === 'CONTRATO') label = 'Contrato de Trabalho';
    else if (type === 'NUIT') label = 'Cartão NUIT';
    else if (type === 'INSS') label = 'Cartão INSS';
    else {
      label = prompt('Descrição do documento:', file.name) || file.name;
    }

    this.toaster.showWarning('Enviando...', 'O documento está a ser carregado');

    this.sub.add(
      this.hrService.uploadDocument(this.selectedEmployee.id, this.getCompanyId(), file, type, label).subscribe({
        next: (emp) => {
          this.toaster.showSuccess('Sucesso', 'Documento anexado.');
          this.selectedEmployee!.documents = emp.documents;
          this.updateEmployeeInList(emp);
          this.currentUploadType = 'OUTRO';
          this.cdr.detectChanges();
        },
        error: (e) => {
          this.toaster.showError('Erro no upload', e?.error?.message || e.message);
          this.currentUploadType = 'OUTRO';
        }
      })
    );
  }

  removeDocument(docId: string) {
    if (!this.selectedEmployee?.id || !confirm('Deseja eliminar este anexo?')) return;

    this.sub.add(
      this.hrService.removeDocument(this.selectedEmployee.id, docId, this.getCompanyId()).subscribe({
        next: (emp) => {
          this.toaster.showSuccess('Eliminado', 'O anexo foi removido.');
          this.selectedEmployee!.documents = emp.documents;
          this.updateEmployeeInList(emp);
          this.cdr.detectChanges();
        },
        error: (e) => this.toaster.showError('Erro ao eliminar', e?.error?.message || e.message)
      })
    );
  }

  private updateEmployeeInList(updated: Employee) {
    const idx = this.employees.findIndex(e => e.id === updated.id);
    if (idx !== -1) {
      this.employees[idx] = updated;
      this.filterEmployees();
    }
  }
}
