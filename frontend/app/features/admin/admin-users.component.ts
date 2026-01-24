import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataService } from '../../services/data.service';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isTechnical: boolean;
  isActive: boolean;
  profile: string;
  language: string;
  permissions: UserPermission[];
  password?: string;
}

interface UserPermission {
  companyId: string;
  companyName: string;
  profileId: string;
  profileName: string;
}

interface Profile {
  id: string;
  name: string;
  description: string;
}

interface Company {
  id: string;
  name: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-6xl mx-auto h-full flex flex-col font-sans">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Utilizadores</h1>
          <p class="text-sm text-gray-500">Gestão de utilizadores e permissões de acesso</p>
        </div>
        <div class="flex gap-2">
          <button (click)="loadUsers()" class="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors" title="Atualizar">
            <span class="material-symbols-outlined">refresh</span>
          </button>
          <button (click)="openNewUserModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm flex items-center gap-2 transition-colors">
            <span class="material-symbols-outlined">add</span>
            Novo Utilizador
          </button>
        </div>
      </div>

      <!-- User List -->
      <div class="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden flex-1">
        <table class="w-full text-left">
          <thead class="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium text-sm">
            <tr>
              <th class="px-6 py-3 w-10"></th>
              <th class="px-6 py-3">Utilizador</th>
              <th class="px-6 py-3">Nome</th>
              <th class="px-6 py-3">Perfil</th>
              <th class="px-6 py-3 text-center">Adm.</th>
              <th class="px-6 py-3 text-center">Ativo</th>
              <th class="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm">
            <tr *ngFor="let user of users" class="hover:bg-gray-50 transition-colors group cursor-pointer">
              <td class="px-6 py-4">
                <span class="material-symbols-outlined text-gray-400">person</span>
              </td>
              <td class="px-6 py-4 font-medium text-gray-900">{{ user.username }}</td>
              <td class="px-6 py-4 text-gray-600">{{ user.name }}</td>
              <td class="px-6 py-4 text-gray-600">{{ user.profile || '-' }}</td>
              <td class="px-6 py-4 text-center">
                <span *ngIf="user.isAdmin || user.isSuperAdmin" class="material-symbols-outlined text-green-600 text-base">check</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span *ngIf="user.isActive" class="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                <span *ngIf="!user.isActive" class="w-2 h-2 bg-red-500 rounded-full inline-block"></span>
              </td>
              <td class="px-6 py-4 text-right">
                <button (click)="editUser(user)" class="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors" title="Editar">
                  <span class="material-symbols-outlined text-[20px]">edit</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- User Modal -->
    <div *ngIf="showUserModal" class="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[2px]">
      <div class="bg-[#F0F0F0] rounded-lg shadow-2xl w-[800px] h-[600px] flex flex-col overflow-hidden border border-gray-400 animate-fade-in font-sans text-sm">
        
        <!-- Modal Header -->
        <div class="bg-white px-4 py-2 border-b border-gray-300 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-600">person</span>
            <span class="font-bold text-gray-800">{{ isEditing ? 'Propriedades do Utilizador' : 'Novo Utilizador' }}</span>
          </div>
          <button (click)="closeUserModal()" class="text-gray-500 hover:text-red-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Tabs -->
        <div class="bg-white px-4 pt-2 border-b border-gray-300 flex gap-1">
          <button 
            *ngFor="let tab of tabs" 
            (click)="activeTab = tab.id"
            class="px-4 py-2 text-sm font-medium border-t border-l border-r rounded-t transition-colors relative top-[1px]"
            [ngClass]="activeTab === tab.id ? 'bg-[#F0F0F0] border-gray-300 text-gray-900' : 'bg-white border-transparent text-gray-500 hover:text-gray-700'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Modal Content -->
        <div class="flex-1 p-6 overflow-y-auto bg-[#F0F0F0]">
          
          <!-- Tab: Identificação -->
          <div *ngIf="activeTab === 'id'" class="space-y-4">
            <div class="flex gap-6">
              <div class="flex-1 space-y-3">
                <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                  <label class="text-right text-gray-700">Utilizador:</label>
                  <input [(ngModel)]="currentUser.username" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
                </div>
                <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                  <label class="text-right text-gray-700">Nome:</label>
                  <input [(ngModel)]="currentUser.name" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
                </div>
                <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                  <label class="text-right text-gray-700">E-mail:</label>
                  <input [(ngModel)]="currentUser.email" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
                </div>
                <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                  <label class="text-right text-gray-700">Telemóvel:</label>
                  <input [(ngModel)]="currentUser.phone" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
                </div>
                <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                  <label class="text-right text-gray-700">Perfil sug.:</label>
                  <select [(ngModel)]="currentUser.profile" class="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:outline-none">
                    <option value="">(Nenhum)</option>
                    <option *ngFor="let p of availableProfiles" [value]="p.name">{{ p.name }}</option>
                  </select>
                </div>
                <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                  <label class="text-right text-gray-700">Idioma:</label>
                  <select [(ngModel)]="currentUser.language" class="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:outline-none">
                    <option value="pt">Português (Portugal)</option>
                    <option value="en">English (United States)</option>
                  </select>
                </div>
              </div>
              
              <!-- Photo Placeholder -->
              <div class="w-32 flex flex-col items-center">
                <div class="w-24 h-24 bg-gray-200 rounded border border-gray-300 flex items-center justify-center mb-2">
                  <span class="material-symbols-outlined text-4xl text-gray-400">person</span>
                </div>
              </div>
            </div>

            <div class="ml-[116px] space-y-2 mt-4">
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="currentUser.isActive" class="text-blue-600 rounded">
                  <span class="text-gray-700">Ativo</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="currentUser.isTechnical" class="text-blue-600 rounded">
                  <span class="text-gray-700">Técnico</span>
                </label>
              </div>
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="currentUser.isSuperAdmin" class="text-blue-600 rounded">
                  <span class="text-gray-700">Super Administrador</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="currentUser.isAdmin" class="text-blue-600 rounded">
                  <span class="text-gray-700">Administrador</span>
                </label>
              </div>
            </div>

            <fieldset class="border border-gray-300 rounded p-4 mt-4 bg-white">
              <legend class="text-xs font-semibold text-gray-700 px-1">Segurança</legend>
              <div class="grid grid-cols-[100px_1fr] gap-4 items-center mb-3">
                <label class="text-right text-gray-700">Password:</label>
                <input type="password" [(ngModel)]="password" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
              </div>
              <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                <label class="text-right text-gray-700">Confirmação:</label>
                <input type="password" [(ngModel)]="confirmPassword" class="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
              </div>
            </fieldset>
          </div>

          <!-- Tab: Permissões -->
          <div *ngIf="activeTab === 'permissions'" class="h-full flex flex-col">
            <fieldset class="border border-gray-300 rounded p-4 bg-white flex-1 flex flex-col">
              <legend class="text-xs font-semibold text-gray-700 px-1">Empresas/Perfis do Utilizador</legend>
              
              <div class="flex-1 border border-gray-300 rounded bg-white overflow-y-auto mb-4">
                <table class="w-full text-left text-sm">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-3 py-2">Empresa</th>
                      <th class="px-3 py-2">Perfil</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let perm of currentUser.permissions" class="border-b border-gray-100 last:border-0">
                      <td class="px-3 py-2">{{ perm.companyName }}</td>
                      <td class="px-3 py-2">{{ perm.profileName }}</td>
                    </tr>
                    <tr *ngIf="currentUser.permissions.length === 0">
                      <td colspan="2" class="px-3 py-4 text-center text-gray-500 italic">Sem permissões atribuídas</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end">
                <button (click)="openPermissionsModal()" class="px-4 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 text-sm shadow-sm">
                  Permissões...
                </button>
              </div>
            </fieldset>
          </div>

          <!-- Tab: Módulos (Placeholder) -->
          <div *ngIf="activeTab === 'modules'" class="h-full">
             <div class="border border-gray-300 rounded p-4 bg-white h-full">
               <p class="text-gray-500 italic">Configuração de módulos não disponível nesta versão.</p>
             </div>
          </div>

        </div>

        <!-- Modal Footer -->
        <div class="bg-[#F0F0F0] px-4 py-3 border-t border-gray-300 flex justify-end gap-2">
          <button (click)="saveUser()" class="px-4 py-1.5 border border-gray-400 rounded bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-400 text-sm min-w-[80px] font-medium shadow-sm">
            Confirmar
          </button>
          <button (click)="closeUserModal()" class="px-4 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 text-sm min-w-[80px]">
            Cancelar
          </button>
          <button class="px-4 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 text-sm min-w-[80px]">
            Ajuda
          </button>
        </div>
      </div>
    </div>

    <!-- Permissions Modal (Propriedades) -->
    <div *ngIf="showPermissionsModal" class="fixed inset-0 bg-black/20 flex items-center justify-center z-[60] backdrop-blur-[1px]">
      <div class="bg-[#F0F0F0] rounded-lg shadow-2xl w-[700px] h-[500px] flex flex-col overflow-hidden border border-gray-400 animate-fade-in font-sans text-sm">
        
        <div class="bg-white px-4 py-2 border-b border-gray-300 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-gray-600">settings_accessibility</span>
            <span class="font-bold text-gray-800">Propriedades - Permissões</span>
          </div>
          <button (click)="closePermissionsModal()" class="text-gray-500 hover:text-red-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="flex-1 p-4 flex gap-4 overflow-hidden">
          
          <!-- Left: Available Profiles -->
          <div class="flex-1 flex flex-col">
            <label class="text-xs font-semibold text-gray-700 mb-1">Perfis disponíveis:</label>
            <div class="flex-1 border border-gray-300 rounded bg-white overflow-y-auto">
              <table class="w-full text-left">
                <thead class="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th class="px-2 py-1 text-xs font-medium text-gray-600">Perfil</th>
                    <th class="px-2 py-1 text-xs font-medium text-gray-600">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let profile of availableProfiles" 
                      (click)="selectedAvailableProfile = profile"
                      [class.bg-blue-100]="selectedAvailableProfile === profile"
                      class="cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <td class="px-2 py-1 flex items-center gap-2">
                      <span class="material-symbols-outlined text-gray-400 text-sm">group</span>
                      {{ profile.name }}
                    </td>
                    <td class="px-2 py-1 text-gray-500 truncate max-w-[150px]">{{ profile.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="mt-2">
               <label class="text-xs font-semibold text-gray-700 mb-1">Empresa Alvo:</label>
               <select [(ngModel)]="selectedTargetCompanyId" class="w-full border border-gray-300 rounded px-2 py-1 bg-white text-sm">
                 <option value="ALL">&lt;Todas&gt;</option>
                 <option *ngFor="let comp of companies" [value]="comp.id">{{ comp.name }}</option>
               </select>
            </div>
          </div>

          <!-- Middle: Buttons -->
          <div class="flex flex-col justify-center gap-2">
            <button (click)="addPermission()" [disabled]="!selectedAvailableProfile" class="p-1 border border-gray-300 rounded bg-white hover:bg-blue-50 disabled:opacity-50">
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
            <button (click)="removePermission()" [disabled]="!selectedAssignedPermission" class="p-1 border border-gray-300 rounded bg-white hover:bg-blue-50 disabled:opacity-50">
              <span class="material-symbols-outlined text-sm">chevron_left</span>
            </button>
          </div>

          <!-- Right: Assigned Permissions -->
          <div class="flex-1 flex flex-col">
            <label class="text-xs font-semibold text-gray-700 mb-1">Permissões do Utilizador:</label>
            <div class="flex-1 border border-gray-300 rounded bg-white overflow-y-auto">
              <ul class="divide-y divide-gray-100">
                <li *ngFor="let perm of tempPermissions" 
                    (click)="selectedAssignedPermission = perm"
                    [class.bg-blue-100]="selectedAssignedPermission === perm"
                    class="px-2 py-1.5 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                  <span class="material-symbols-outlined text-green-600 text-sm">check_box</span>
                  <div>
                    <div class="font-medium">{{ perm.profileName }}</div>
                    <div class="text-xs text-gray-500">{{ perm.companyName }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </div>

        <div class="bg-[#F0F0F0] px-4 py-3 border-t border-gray-300 flex justify-end gap-2">
          <button (click)="confirmPermissions()" class="px-4 py-1.5 border border-gray-400 rounded bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-400 text-sm min-w-[80px] font-medium shadow-sm">
            Confirmar
          </button>
          <button (click)="closePermissionsModal()" class="px-4 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 text-sm min-w-[80px]">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in {
      animation: fadeIn 0.15s ease-out forwards;
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  companies: Company[] = [];

  constructor(private dataService: DataService) { }

  // Modal State
  showUserModal = false;
  showPermissionsModal = false;
  isEditing = false;
  activeTab = 'id';

  // Data for Modals
  currentUser: User = this.getEmptyUser();
  password = '';
  confirmPassword = '';

  tabs = [
    { id: 'id', label: 'Identificação' },
    { id: 'permissions', label: 'Permissões' },
    { id: 'modules', label: 'Módulos' },
    { id: 'mappings', label: 'Mapeamentos' }
  ];

  availableProfiles: Profile[] = [
    { id: 'ADMIN', name: 'Administrador', description: 'Acesso total ao sistema' },
    { id: 'FIN', name: 'Financeiro', description: 'Direção Adm. & Financeira' },
    { id: 'COM', name: 'Comercial', description: 'Direção Comercial' },
    { id: 'STK', name: 'Armazém', description: 'Resp. Stocks/Armazéns' },
    { id: 'VEND', name: 'Vendedor', description: 'Vendedores de Loja' }
  ];

  // Permissions Modal State
  selectedAvailableProfile: Profile | null = null;
  selectedTargetCompanyId: string = 'ALL';
  selectedAssignedPermission: UserPermission | null = null;
  tempPermissions: UserPermission[] = [];

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    forkJoin({
      users: this.dataService.getUsers(),
      companies: this.dataService.getCompanies()
    }).subscribe({
      next: (result) => {
        this.companies = result.companies.map((c: any) => ({ id: c.id, name: c.name }));
        this.users = result.users;

        // Refresh company names in permissions
        this.users.forEach(user => {
          if (user.permissions) {
            user.permissions.forEach(perm => {
              if (perm.companyId === 'ALL') {
                perm.companyName = '<Todas>';
              } else {
                const company = this.companies.find(c => c.id === perm.companyId);
                if (company) {
                  perm.companyName = company.name;
                } else {
                  perm.companyName = '(Empresa Removida)';
                }
              }
            });
          }
        });
      },
      error: (err) => {
        console.error('Error loading users/companies:', err);
        alert('Erro ao carregar utilizadores. Verifique a ligação ao servidor.');
      }
    });
  }

  loadCompanies() {
    this.dataService.getCompanies().subscribe(companies => {
      this.companies = companies.map((c: any) => ({ id: c.id, name: c.name }));
    });
  }

  getEmptyUser(): User {
    return {
      id: '',
      username: '',
      name: '',
      email: '',
      phone: '',
      isAdmin: false,
      isSuperAdmin: false,
      isTechnical: false,
      isActive: true,
      profile: '',
      language: 'pt',
      permissions: []
    };
  }

  openNewUserModal() {
    this.isEditing = false;
    this.currentUser = this.getEmptyUser();
    this.password = '';
    this.confirmPassword = '';
    this.activeTab = 'id';
    this.showUserModal = true;
  }

  editUser(user: User) {
    this.isEditing = true;
    this.currentUser = JSON.parse(JSON.stringify(user)); // Deep copy
    this.password = ''; // Don't show existing password
    this.confirmPassword = '';
    this.activeTab = 'id';
    this.showUserModal = true;
  }

  closeUserModal() {
    this.showUserModal = false;
  }

  saveUser() {
    if (!this.currentUser.username || !this.currentUser.name) {
      alert('Preencha os campos obrigatórios (Utilizador e Nome).');
      return;
    }

    const userToSave = { ...this.currentUser };

    if (this.password || this.confirmPassword) {
      if (this.password !== this.confirmPassword) {
        alert('As passwords não coincidem.');
        return;
      }
      userToSave.password = this.password;
    } else {
      // If editing and no password provided, remove it from payload to avoid re-hashing or overwriting
      if (this.isEditing) {
        delete (userToSave as any).password;
      } else if (!userToSave.password) {
        alert('Defina uma password para o novo utilizador.');
        return;
      }
    }

    if (!this.isEditing) {
      userToSave.id = userToSave.username.toLowerCase().replace(/\s/g, '');
    }

    this.dataService.saveUser(userToSave).subscribe({
      next: () => {
        this.loadUsers();
        this.closeUserModal();
        alert('Utilizador gravado com sucesso!');
      },
      error: (err) => {
        console.error('Error saving user:', err);
        alert('Erro ao gravar utilizador: ' + (err.error?.message || err.message || 'Erro desconhecido'));
      }
    });
  }

  // Permissions Logic
  openPermissionsModal() {
    this.tempPermissions = [...this.currentUser.permissions];
    this.selectedAvailableProfile = null;
    this.selectedAssignedPermission = null;
    this.selectedTargetCompanyId = 'ALL';
    this.showPermissionsModal = true;
  }

  closePermissionsModal() {
    this.showPermissionsModal = false;
  }

  addPermission() {
    if (!this.selectedAvailableProfile) return;

    const companyName = this.selectedTargetCompanyId === 'ALL'
      ? '<Todas>'
      : this.companies.find(c => c.id === this.selectedTargetCompanyId)?.name || 'Unknown';

    const newPerm: UserPermission = {
      companyId: this.selectedTargetCompanyId,
      companyName: companyName,
      profileId: this.selectedAvailableProfile.id,
      profileName: this.selectedAvailableProfile.name
    };

    // Check duplicate
    const exists = this.tempPermissions.some(p =>
      p.companyId === newPerm.companyId && p.profileId === newPerm.profileId
    );

    if (!exists) {
      this.tempPermissions.push(newPerm);
    }
  }

  removePermission() {
    if (!this.selectedAssignedPermission) return;
    this.tempPermissions = this.tempPermissions.filter(p => p !== this.selectedAssignedPermission);
    this.selectedAssignedPermission = null;
  }

  confirmPermissions() {
    this.currentUser.permissions = [...this.tempPermissions];

    // Auto-update main profile if empty
    if (!this.currentUser.profile && this.currentUser.permissions.length > 0) {
      this.currentUser.profile = this.currentUser.permissions[0].profileName;
    }

    this.closePermissionsModal();
  }
}
