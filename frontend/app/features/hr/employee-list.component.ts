import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HRService, Employee } from '../../shared/hr.service';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="newEmployee()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <app-icon name="person_add" [size]="18"></app-icon>
          <span>Novo Funcionário</span>
        </button>
        <button (click)="saveEmployee()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <app-icon name="save" [size]="18"></app-icon>
          <span>Gravar</span>
        </button>
        <button (click)="deleteEmployee()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs text-red-600">
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
          </div>
        </div>

        <!-- Employee Details (Right Panel) -->
        <div class="flex-1 overflow-auto p-4 bg-[#F0F0F0]">
          <div *ngIf="selectedEmployee" class="max-w-4xl bg-white p-6 rounded shadow-sm">
            <h2 class="text-lg font-semibold text-gray-800 mb-6 border-b pb-2">Ficha do Funcionário</h2>
            
            <div class="grid grid-cols-2 gap-6">
              <!-- Dados Pessoais -->
              <div class="space-y-4">
                <h3 class="font-medium text-blue-800 border-b border-blue-100 pb-1 flex items-center gap-2">
                  <app-icon name="person" [size]="16" color="#1e40af"></app-icon>
                  Identificação
                </h3>
                <div class="grid grid-cols-4 gap-2">
                  <div class="col-span-1">
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Código</label>
                    <input type="text" [(ngModel)]="selectedEmployee.code" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                  <div class="col-span-3">
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Nome Completo</label>
                    <input type="text" [(ngModel)]="selectedEmployee.name" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">NIF</label>
                    <input type="text" [(ngModel)]="selectedEmployee.nif" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">INSS</label>
                    <input type="text" [(ngModel)]="selectedEmployee.inss" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                </div>

                <h3 class="font-medium text-blue-800 border-b border-blue-100 pb-1 flex items-center gap-2 mt-4">
                  <app-icon name="home" [size]="16" color="#1e40af"></app-icon>
                  Morada & Contacto
                </h3>
                <input type="text" [(ngModel)]="selectedEmployee.address" placeholder="Endereço" class="w-full px-2 py-1 border rounded text-xs">
                <div class="grid grid-cols-2 gap-2">
                  <input type="text" [(ngModel)]="selectedEmployee.phone" placeholder="Telefone" class="w-full px-2 py-1 border rounded text-xs">
                  <input type="email" [(ngModel)]="selectedEmployee.email" placeholder="Email" class="w-full px-2 py-1 border rounded text-xs">
                </div>
              </div>

              <!-- Contrato e Salário -->
              <div class="space-y-4">
                <h3 class="font-medium text-green-800 border-b border-green-100 pb-1 flex items-center gap-2">
                  <app-icon name="contract" [size]="16" color="#166534"></app-icon>
                  Contrato
                </h3>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Cargo</label>
                    <input type="text" [(ngModel)]="selectedEmployee.position" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Departamento</label>
                    <input type="text" [(ngModel)]="selectedEmployee.department" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Tipo de Contrato</label>
                    <select [(ngModel)]="selectedEmployee.contractType" class="w-full px-2 py-1 border rounded text-xs">
                      <option value="FULL_TIME">Tempo Inteiro</option>
                      <option value="PART_TIME">Tempo Parcial</option>
                      <option value="CONTRACTOR">Prestação de Serviços</option>
                      <option value="INTERN">Estagiário</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Data Admissão</label>
                    <input type="date" [(ngModel)]="selectedEmployee.hireDate" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                </div>

                <h3 class="font-medium text-emerald-800 border-b border-emerald-100 pb-1 flex items-center gap-2 mt-4">
                  <app-icon name="payments" [size]="16" color="#065f46"></app-icon>
                  Vencimento & Subsídios
                </h3>
                <div>
                  <label class="block text-[10px] font-medium text-gray-500 uppercase">Salário Base (MT)</label>
                  <input type="number" [(ngModel)]="selectedEmployee.salaryBase" class="w-full px-2 py-1 border rounded text-xs text-right font-bold text-blue-700">
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Transporte</label>
                    <input type="number" [(ngModel)]="selectedEmployee.subsidyTransport" class="w-full px-2 py-1 border rounded text-xs text-right">
                  </div>
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Alimentação</label>
                    <input type="number" [(ngModel)]="selectedEmployee.subsidyFood" class="w-full px-2 py-1 border rounded text-xs text-right">
                  </div>
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Habitação</label>
                    <input type="number" [(ngModel)]="selectedEmployee.subsidyHousing" class="w-full px-2 py-1 border rounded text-xs text-right">
                  </div>
                </div>

                <h3 class="font-medium text-gray-800 border-b border-gray-100 pb-1 flex items-center gap-2 mt-4">
                   <app-icon name="account_balance" [size]="16"></app-icon>
                   Pagamento Bancário
                </h3>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">Banco</label>
                    <input type="text" [(ngModel)]="selectedEmployee.bankName" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                  <div class="col-span-2">
                    <label class="block text-[10px] font-medium text-gray-500 uppercase">NIB / Conta</label>
                    <input type="text" [(ngModel)]="selectedEmployee.nib" class="w-full px-2 py-1 border rounded text-xs">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mt-8 flex justify-end gap-2 border-t pt-4">
               <button (click)="cancel()" class="px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
               <button (click)="saveEmployee()" class="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 shadow-md transition-all">Gravar Alterações</button>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!selectedEmployee" class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <app-icon name="badge" [size]="64" class="mb-2 opacity-20"></app-icon>
              <p class="text-sm">Selecione um funcionário para ver os detalhes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EmployeeListComponent implements OnInit, OnDestroy {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  selectedEmployee: Employee | null = null;
  searchTerm = '';
  private sub = new Subscription();

  constructor(private hrService: HRService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.refresh();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  refresh() {
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    this.sub.add(this.hrService.loadEmployees(company.id).subscribe(data => {
      this.employees = data;
      this.filterEmployees();
      this.cdr.detectChanges();
    }));
  }

  filterEmployees() {
    const term = this.searchTerm.toLowerCase();
    this.filteredEmployees = this.employees.filter(e => 
      e.name.toLowerCase().includes(term) || e.code.includes(term)
    );
  }

  selectEmployee(emp: Employee) {
    this.selectedEmployee = { ...emp };
  }

  newEmployee() {
    const company = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
    this.selectedEmployee = {
      id: '',
      companyId: company.id,
      code: '',
      name: '',
      contractType: 'FULL_TIME',
      salaryBase: 0,
      subsidyTransport: 0,
      subsidyFood: 0,
      subsidyHousing: 0,
       isActive: true
    };
  }

  saveEmployee() {
    if (!this.selectedEmployee) return;
    this.sub.add(this.hrService.saveEmployee(this.selectedEmployee).subscribe({
      next: () => {
        alert('Funcionário gravado com sucesso!');
        this.refresh();
        this.selectedEmployee = null;
      },
      error: (e) => alert('Erro ao gravar: ' + e.message)
    }));
  }

  deleteEmployee() {
    if (!this.selectedEmployee?.id) return;
    if (confirm('Deseja eliminar este funcionário?')) {
      this.sub.add(this.hrService.deleteEmployee(this.selectedEmployee.id).subscribe(() => {
        this.refresh();
        this.selectedEmployee = null;
      }));
    }
  }

  cancel() {
    this.selectedEmployee = null;
  }
}
