import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../shared/accounting.service';
import { CustomerService } from '../../shared/customer.service';
import { SupplierService } from '../../shared/supplier.service';
import { DataService } from '../../services/data.service';

import { Account, JournalEntry } from '../../shared/models';
import { EntityListModalComponent } from '../../shared/components/entity-list-modal.component';
import { SupplierListModalComponent } from '../../shared/components/supplier-list-modal.component';
import { AccountListModalComponent } from '../../shared/components/account-list-modal.component';

interface StatementMovement {
    date: Date;
    docType: string;
    docNumber: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

@Component({
    selector: 'app-account-statement',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        EntityListModalComponent,
        SupplierListModalComponent,
        AccountListModalComponent
    ],
    template: `
    <div class="flex h-full bg-[#F0F0F0]">
        <!-- Sidebar Filters -->
        <div class="w-80 bg-white border-r border-gray-300 flex flex-col shrink-0 overflow-hidden no-print">
            <div class="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-4 py-3 flex items-center gap-2 shrink-0 shadow">
                <span class="material-symbols-outlined">history</span>
                <h2 class="font-bold text-sm uppercase tracking-tighter">Extrato de Conta</h2>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                <!-- Entity Type Selection -->
                <div class="space-y-1.5">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo de Entidade</label>
                    <select 
                        [(ngModel)]="entityType"
                        (ngModelChange)="setEntityType($event)"
                        class="w-full px-3 py-1.5 border border-gray-300 rounded text-[11px] font-medium transition-all focus:ring-1 focus:ring-blue-500 outline-none hover:border-gray-400"
                    >
                        <option value="CUSTOMER">Clientes (Class 21)</option>
                        <option value="SUPPLIER">Fornecedores (Class 22)</option>
                        <option value="ACCOUNT">Contas Gerais (Todas)</option>
                    </select>
                </div>

                <!-- Entity Selection with F4 List -->
                <div class="space-y-1.5">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {{ getEntityLabel() }}
                    </label>
                    <div class="flex items-center gap-1">
                        <div class="flex items-center border border-gray-300 bg-white rounded-sm h-6 w-24 relative overflow-hidden group">
                            <input 
                                class="w-full h-full px-2 focus:outline-none text-[11px] font-mono font-bold" 
                                [(ngModel)]="entityCode"
                                (ngModelChange)="onCodeChange($event)"
                                (keyup.enter)="onCodeBlur()"
                                [placeholder]="'Código'"
                            />
                            <button 
                                (click)="openEntityModal()"
                                class="absolute right-0 top-0 bottom-0 px-1 bg-gray-100 border-l hover:bg-blue-600 hover:text-white text-blue-600 text-[10px] font-black cursor-pointer transition-colors"
                            >F4</button>
                        </div>
                        <div class="flex-1 h-6 border border-gray-300 bg-gray-50 rounded-sm px-2 flex items-center overflow-hidden">
                            <span class="text-[11px] text-gray-700 truncate font-medium" [class.text-red-500]="!selectedAccountId && entityCode">
                                {{ entityName || 'Selecione uma conta ou entidade...' }}
                            </span>
                        </div>
                    </div>
                    <p *ngIf="entityCode && !selectedAccountId" class="text-[9px] text-red-500 font-bold uppercase italic">
                        ⚠️ Código não encontrado no sistema.
                    </p>
                    <p *ngIf="entityCode && selectedAccountId && (!selectedEntity?.receivableAccountId && !selectedEntity?.payableAccountId)" class="text-[9px] text-blue-600 font-bold uppercase italic">
                        ℹ️ Conta corrente partilhada — movimentos filtrados por esta entidade.
                    </p>
                </div>

                <!-- Date Range -->
                <div class="space-y-1.5 pt-2 border-t border-gray-100">
                    <label class="block text-[10px] font-bold text-gray-400 uppercase">Intervalo de Datas</label>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="space-y-1">
                            <input type="date" [(ngModel)]="dateFrom" class="w-full px-2 py-1.5 border border-gray-300 rounded shadow-sm hover:border-gray-400" />
                        </div>
                        <div class="space-y-1">
                            <input type="date" [(ngModel)]="dateTo" class="w-full px-2 py-1.5 border border-gray-300 rounded shadow-sm hover:border-gray-400" />
                        </div>
                    </div>
                </div>

                <!-- Options -->
                <div class="space-y-2 pt-2">
                    <label class="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" [(ngModel)]="showOnlyPending" class="rounded text-blue-600 focus:ring-blue-500" />
                        <span class="text-gray-600 group-hover:text-blue-700 transition-colors">Apenas movimentos em aberto</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" [(ngModel)]="includeDrafts" class="rounded text-blue-600 focus:ring-blue-500" />
                        <span class="text-gray-600 group-hover:text-blue-700 transition-colors">Incluir Rascunhos (Previsional)</span>
                    </label>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="p-4 border-t border-gray-200 bg-gray-50 shrink-0 space-y-2">
                <button 
                    (click)="generateStatement()"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded shadow-lg hover:shadow-xl active:transform active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <span class="material-symbols-outlined text-[18px]">play_circle</span>
                    VISUALIZAR EXTRATO
                </button>
                <button 
                    (click)="resetFilters()"
                    class="w-full bg-white hover:bg-gray-100 text-gray-500 font-bold py-2 rounded border border-gray-200 transition-all flex items-center justify-center gap-2"
                >
                    <span class="material-symbols-outlined text-[18px]">refresh</span>
                    LIMPAR FILTROS
                </button>
            </div>
        </div>

        <!-- Main Display Area -->
        <div class="flex-1 flex flex-col overflow-hidden relative">
            <!-- Toolbar -->
            <div class="bg-white border-b border-gray-300 px-4 py-2.5 flex justify-between items-center shrink-0 shadow-sm z-10 no-print">
                <div class="flex items-center gap-6">
                    <button class="flex items-center gap-1.5 text-gray-600 hover:text-blue-700 text-[11px] font-bold uppercase tracking-tight" (click)="windowPrint()">
                        <span class="material-symbols-outlined text-lg">print</span> Imprimir
                    </button>
                    <button class="flex items-center gap-1.5 text-gray-600 hover:text-green-700 text-[11px] font-bold uppercase tracking-tight">
                        <span class="material-symbols-outlined text-lg">table_view</span> Excel
                    </button>
                    <button class="flex items-center gap-1.5 text-gray-600 hover:text-red-700 text-[11px] font-bold uppercase tracking-tight">
                        <span class="material-symbols-outlined text-lg">picture_as_pdf</span> PDF
                    </button>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-400 font-mono bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                    {{ currentDate | date:'dd/MM/yyyy HH:mm' }}
                </div>
            </div>

            <!-- Statement Content -->
            <div class="flex-1 overflow-auto bg-[#E5E7EB] p-8" id="statement-area">
                <div *ngIf="!movements.length" class="h-full flex flex-col items-center justify-center text-gray-400">
                    <div class="bg-white p-12 rounded-full shadow-inner mb-6">
                        <span class="material-symbols-outlined text-[120px] opacity-20">description</span>
                    </div>
                    <p *ngIf="!selectedAccountId" class="text-2xl font-light tracking-widest uppercase opacity-40 text-center">Selecione uma conta para gerar o extrato</p>
                    <div *ngIf="selectedAccountId" class="text-center space-y-2">
                        <p class="text-2xl font-light tracking-widest uppercase opacity-40">Nenhum movimento encontrado</p>
                        <p class="text-xs opacity-60 italic">Verifique se as faturas estão rascunho ou tente marcar "Incluir Rascunhos".</p>
                    </div>
                </div>


                <!-- Template Content (Paper format) -->
                <div *ngIf="movements.length > 0" class="max-w-4xl mx-auto bg-white p-10 shadow-2xl border border-gray-200 rounded-sm min-h-[1120px] flex flex-col Paper">
                    <!-- Document Header -->
                    <div class="border-b-2 border-gray-900 pb-4 mb-6 flex justify-between items-start">
                        <div>
                            <h1 class="text-2xl font-black text-gray-900 tracking-tighter">EXTRATO DE CONTA CORRENTE</h1>
                            <p class="text-xs text-gray-500 font-mono uppercase">Inverno ERP - Sistema de Gestão</p>
                        </div>
                        <div class="text-right">
                            <div class="text-xs font-bold text-gray-400">PERÍODO</div>
                            <div class="text-sm font-black">{{ dateFrom | date:'dd MMM yyyy' }} - {{ dateTo | date:'dd MMM yyyy' }}</div>
                        </div>
                    </div>

                    <!-- Entity Info -->
                    <div class="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <div class="text-[10px] font-bold text-gray-400 uppercase mb-1">Entidade / Conta</div>
                            <div class="text-lg font-bold text-blue-900 leading-tight">{{ getEntityDisplay() }}</div>
                            <div class="text-xs text-gray-600">{{ getEntityDetails() }}</div>
                        </div>
                        <div class="bg-gray-50 p-4 rounded flex flex-col justify-center border border-gray-100 italic">
                            <div class="text-[10px] font-bold text-gray-400 uppercase mb-1 text-center">Resumo de Saldos</div>
                            <div class="flex justify-between text-xs px-4">
                                <span>Saldo Inicial:</span>
                                <span class="font-mono">{{ initialBalance | number:'1.2-2' }}</span>
                            </div>
                            <div class="flex justify-between text-xs px-4 border-t border-gray-200 mt-1 pt-1">
                                <span>Saldo Final:</span>
                                <span class="font-mono font-bold" [class.text-red-600]="finalBalance < 0">{{ finalBalance | number:'1.2-2' }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Movements Table -->
                    <table class="w-full text-xs border-collapse">
                        <thead>
                            <tr class="bg-gray-900 text-white">
                                <th class="px-3 py-2 text-left w-20">Data</th>
                                <th class="px-3 py-2 text-left">Documento / Descrição</th>
                                <th class="px-3 py-2 text-right w-24">Débito</th>
                                <th class="px-3 py-2 text-right w-24">Crédito</th>
                                <th class="px-3 py-2 text-right w-28">Saldo Acum.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Initial Balance Row -->
                            <tr class="bg-blue-print border-b border-gray-200 italic font-medium">
                                <td class="px-3 py-2 text-gray-400">{{ dateFrom | date:'dd/MM/yy' }}</td>
                                <td class="px-3 py-2">Saldo à data de {{ dateFrom | date:'dd/MM/yyyy' }}</td>
                                <td class="px-3 py-2 text-right">-</td>
                                <td class="px-3 py-2 text-right">-</td>
                                <td class="px-3 py-2 text-right font-mono">{{ initialBalance | number:'1.2-2' }}</td>
                            </tr>
                            <!-- Movement Rows -->
                            <tr *ngFor="let m of movements" class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td class="px-3 py-2 text-gray-500">{{ m.date | date:'dd/MM/yy' }}</td>
                                <td class="px-3 py-2">
                                    <div class="font-bold text-gray-800">{{ m.docType }} {{ m.docNumber }}</div>
                                    <div class="text-[10px] text-gray-500 uppercase">{{ m.description }}</div>
                                </td>
                                <td class="px-3 py-2 text-right font-mono font-medium text-green-700">
                                    {{ m.debit > 0 ? ((+m.debit || 0) | number:'1.2-2') : '-' }}
                                </td>
                                <td class="px-3 py-2 text-right font-mono font-medium text-red-700">
                                    {{ m.credit > 0 ? ((+m.credit || 0) | number:'1.2-2') : '-' }}
                                </td>
                                <td class="px-3 py-2 text-right font-mono font-bold" [class.text-blue-700]="m.balance >= 0" [class.text-red-600]="m.balance < 0">
                                    {{ (+m.balance || 0) | number:'1.2-2' }}
                                </td>
                            </tr>
                        </tbody>
                        <tfoot class="bg-gray-50 font-black text-[13px]">
                            <tr>
                                <td colspan="2" class="px-3 py-3 text-right uppercase text-gray-500">Totais do Período</td>
                                <td class="px-3 py-3 text-right font-mono text-green-700">{{ totalDebit | number:'1.2-2' }}</td>
                                <td class="px-3 py-3 text-right font-mono text-red-700">{{ totalCredit | number:'1.2-2' }}</td>
                                <td class="px-3 py-3 text-right font-mono bg-gray-900 text-white">{{ finalBalance | number:'1.2-2' }}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Footer Note -->
                    <div class="mt-8 pt-4 border-t border-dashed border-gray-300 flex justify-between text-[10px] text-gray-400 uppercase font-mono">
                        <div>Emitido por: {{ currentUser }}</div>
                        <div>Folha 1 de 1</div>
                        <div>Assinatura do Responsável: ___________________________</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    <app-entity-list-modal 
        *ngIf="showEntityModal" 
        (close)="showEntityModal = false" 
        (select)="onEntitySelect($event)"
    ></app-entity-list-modal>

    <app-supplier-list-modal 
        *ngIf="showSupplierModal" 
        (close)="showSupplierModal = false" 
        (select)="onSupplierSelect($event)"
    ></app-supplier-list-modal>

    <app-account-list-modal 
        *ngIf="showAccountModal" 
        [selectedId]="selectedAccountId"
        (close)="showAccountModal = false" 
        (select)="onAccountSelect($event)"
    ></app-account-list-modal>
    `,
    styles: [`
        @media print {
            /* Hide all UI elements except the statement */
            .no-print, .no-print * { display: none !important; }
            
            #statement-area { 
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                overflow: visible !important;
                display: block !important;
            }

            /* Paper formatting for A4 */
            .max-w-4xl { 
                max-width: none !important; 
                width: 210mm !important; /* A4 width */
                margin: 0 auto !important;
                padding: 15mm !important; 
                border: none !important; 
                box-shadow: none !important;
                min-height: 0 !important;
                height: auto !important;
                display: block !important;
            }

            /* Force background colors to print */
            .bg-gray-900 { background-color: #111827 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bg-blue-print { background-color: #eff6ff80 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bg-white { background-color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

            /* Color forcing */
            .text-green-700 { color: #15803d !important; -webkit-print-color-adjust: exact; }
            .text-red-700 { color: #b91c1c !important; -webkit-print-color-adjust: exact; }
            .text-red-600 { color: #dc2626 !important; -webkit-print-color-adjust: exact; }
            .text-blue-700 { color: #1d4ed8 !important; -webkit-print-color-adjust: exact; }
            .text-blue-900 { color: #1e3a8a !important; -webkit-print-color-adjust: exact; }
            .text-gray-900 { color: #111827 !important; -webkit-print-color-adjust: exact; }
            
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

            /* Ensure table borders appear */
            table { border-collapse: collapse !important; }
            th, td { border-bottom: 1px solid #e5e7eb !important; }
            .bg-gray-900 th, .bg-gray-900 td { border-color: #111827 !important; }
        }

        /* Paper effect on screen */
        .Paper {
            box-shadow: 0 0 50px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
    `]
})
export class AccountStatementComponent implements OnInit {
    // Selection state
    entityType: 'CUSTOMER' | 'SUPPLIER' | 'ACCOUNT' = 'CUSTOMER';
    selectedAccountId: string = '';
    entityCode: string = '';
    entityName: string = '';
    selectedEntity: any = null;

    // Modal state
    showEntityModal = false;
    showSupplierModal = false;
    showAccountModal = false;
    isLoading = false;

    // Filters
    dateFrom: string = '';
    dateTo: string = '';
    showOnlyPending: boolean = false;
    includeDrafts: boolean = false;

    // Data
    availableAccounts: Account[] = [];
    currentDate: Date = new Date();

    // Statement Data
    initialBalance: number = 0;
    movements: StatementMovement[] = [];
    totalDebit: number = 0;
    totalCredit: number = 0;
    finalBalance: number = 0;

    currentUser = 'Utilizador';

    constructor(
        private accountingService: AccountingService,
        private customerService: CustomerService,
        private supplierService: SupplierService,
        private dataService: DataService
    ) { }


    ngOnInit() {
        // Load current user for footer
        const storedUser = localStorage.getItem('erp_current_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            this.currentUser = user.username || user.name || 'Utilizador';
        }

        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        this.dateFrom = firstDay.toISOString().split('T')[0];
        this.dateTo = today.toISOString().split('T')[0];

        this.dataService.activeCompany$.subscribe(company => {
            if (company) {
                this.resetSelection();
                this.loadAccounts();
                this.customerService.loadCustomers();
                this.supplierService.loadSuppliers();
                this.movements = [];
                this.initialBalance = 0;
                this.finalBalance = 0;
            }
        });
    }


    loadAccounts() {
        this.availableAccounts = this.accountingService.getAccounts()
            .filter(a => a.allowPosting)
            .sort((a, b) => a.code.localeCompare(b.code));
    }

    getEntityLabel(): string {
        switch (this.entityType) {
            case 'CUSTOMER': return 'Cliente';
            case 'SUPPLIER': return 'Fornecedor';
            case 'ACCOUNT': return 'Conta do PGC';
            default: return 'Entidade';
        }
    }

    setEntityType(type: 'CUSTOMER' | 'SUPPLIER' | 'ACCOUNT') {
        this.entityType = type;
        this.resetSelection();
    }

    resetSelection() {
        this.selectedAccountId = '';
        this.entityCode = '';
        this.entityName = '';
        this.selectedEntity = null;
        this.movements = [];
    }

    openEntityModal() {
        if (this.entityType === 'CUSTOMER') this.showEntityModal = true;
        else if (this.entityType === 'SUPPLIER') this.showSupplierModal = true;
        else if (this.entityType === 'ACCOUNT') this.showAccountModal = true;
    }

    onEntitySelect(entity: any) {
        this.showEntityModal = false;
        this.selectedEntity = entity;
        this.entityCode = entity.code;
        this.entityName = entity.name;

        // Use dedicated account if available, otherwise fallback to generic (code 21.1.2 - Clientes a Crédito)
        // '21.1.1' is usually for Cash Customers (no balance), so we use '21.1.2' for statements.
        this.selectedAccountId = entity.receivableAccountId || this.findAccountByCode('4.1.1') || this.findAccountByCode('4.1');
    }

    onSupplierSelect(supplier: any) {
        this.showSupplierModal = false;
        this.selectedEntity = supplier;
        this.entityCode = supplier.code;
        this.entityName = supplier.name;

        // Use dedicated account if available, otherwise fallback to generic (code 22.1)
        this.selectedAccountId = supplier.payableAccountId || this.findAccountByCode('4.2.1') || this.findAccountByCode('4.2');
    }

    onAccountSelect(acc: Account) {
        this.showAccountModal = false;
        this.selectedEntity = null;
        this.entityCode = acc.code;
        this.entityName = acc.name;
        this.selectedAccountId = acc.id;
    }

    onCodeChange(code: string) {
        if (!code) {
            this.resetSelection();
            return;
        }
        // Auto-resolve if code is complete (e.g. exactly 4 chars for C001)
        if (code.length >= 3) {
            this.resolveCode(code, false);
        }
    }

    onCodeBlur() {
        if (!this.entityCode) {
            this.resetSelection();
            return;
        }
        this.resolveCode(this.entityCode, true);
    }

    private resolveCode(code: string, showAlert: boolean) {
        if (this.entityType === 'CUSTOMER') {
            const norm = (code || '').trim().toLowerCase(); const eqv = (v) => (v == null ? '' : v.toString()).trim().toLowerCase() === norm; const _cl = this.customerService.getCustomers(); const customer = _cl.find(c => eqv(c.code)) || _cl.find(c => eqv(c.name));
            if (customer) this.onEntitySelect(customer);
            else if (showAlert) this.entityName = 'Não encontrado';
        } else if (this.entityType === 'SUPPLIER') {
            const norm = (code || '').trim().toLowerCase(); const eqv = (v) => (v == null ? '' : v.toString()).trim().toLowerCase() === norm; const _sl = this.supplierService.getSuppliers(); const supplier = _sl.find(s => eqv(s.code)) || _sl.find(s => eqv(s.name));
            if (supplier) this.onSupplierSelect(supplier);
            else if (showAlert) this.entityName = 'Não encontrado';
        } else {
            const norm = (code || '').trim().toLowerCase(); const acc = this.accountingService.getAccounts().find(a => (a.code == null ? '' : a.code.toString()).trim().toLowerCase() === norm);
            if (acc) this.onAccountSelect(acc);
            else if (showAlert) this.entityName = 'Não encontrado';
        }
    }

    generateStatement() {
        // Force resolution if needed
        if (this.entityCode && !this.selectedAccountId) {
            this.onCodeBlur();
        }

        if (!this.selectedAccountId) {
            alert('Por favor, selecione uma entidade/conta válida que possua mapeamento contabilístico.');
            return;
        }

        const companyInfo = JSON.parse(localStorage.getItem('erp_company_info') || '{}');
        const companyId = companyInfo.id;
        this.isLoading = true;

        // Professional per-entity statement: when this customer/supplier uses the SHARED
        // generic receivable/payable account, a per-account statement would mix ALL
        // entities together. Generate an entity-filtered statement instead.
        const usesGenericAccount = !!this.selectedEntity &&
            !this.selectedEntity.receivableAccountId && !this.selectedEntity.payableAccountId;
        if (usesGenericAccount) {
            this.isLoading = false;
            this.generateStatementLocally();
            return;
        }

        this.accountingService.getAccountStatement(this.selectedAccountId, this.dateFrom, this.dateTo, companyId, this.includeDrafts).subscribe({
            next: (data) => {
                this.isLoading = false;
                if (data && data.movements && data.movements.length > 0) {
                    this.processMovements(data.movements, data.initialBalance);
                } else {
                    this.generateStatementLocally();
                }
            },
            error: () => {
                this.isLoading = false;
                this.generateStatementLocally();
            }
        });
    }

    processMovements(movements: any[], initialBalance: number) {
        const account = this.accountingService.getAccount(this.selectedAccountId);
        const isAssetSide = account ? ['ASSET', 'EXPENSE'].includes(account.type) : true;

        this.initialBalance = initialBalance;
        this.totalDebit = 0;
        this.totalCredit = 0;

        this.movements = movements.map((m: any) => {
            this.totalDebit += Number(m.debit) || 0;
            this.totalCredit += Number(m.credit) || 0;

            // Use backend balance if provided, otherwise calculate
            const calculatedBalance = m.balance !== undefined ? m.balance :
                (isAssetSide ? (m.debit - m.credit) : (m.credit - m.debit));

            return {
                ...m,
                date: new Date(m.date),
                balance: calculatedBalance
            };
        });

        const lastMovement = this.movements[this.movements.length - 1];
        this.finalBalance = lastMovement ? lastMovement.balance : this.initialBalance;
    }

    generateStatementLocally() {
        // Ensure entity is set if we are in local mode with entity selected
        if (!this.selectedEntity && this.entityCode) {
            // Try to resolve entity again
            if (this.entityType === 'CUSTOMER') {
                this.selectedEntity = this.customerService.getCustomers().find(c => c.code === this.entityCode);
            } else if (this.entityType === 'SUPPLIER') {
                this.selectedEntity = this.supplierService.getSuppliers().find(s => s.code === this.entityCode);
            }
        }

        const journalEntries = this.accountingService.getJournalEntries();
        const startDate = new Date(this.dateFrom);
        const endDate = new Date(this.dateTo);
        endDate.setHours(23, 59, 59);

        // Determine target accounts to search
        let targetAccountIds: string[] = [];

        if (this.selectedEntity) {
            // For entities, search all relevant generic accounts + their specific account
            targetAccountIds.push(this.selectedAccountId);

            const findId = (code: string) => this.accountingService.getAccounts().find(a => a.code === code)?.id;

            if (this.entityType === 'CUSTOMER') {
                ['4.1.1', '4.1.2', '4.1.8', '4.1.9'].forEach(code => {
                    const id = findId(code);
                    if (id && !targetAccountIds.includes(id)) targetAccountIds.push(id);
                });
            } else if (this.entityType === 'SUPPLIER') {
                ['4.2.1', '4.2.2', '4.2.9'].forEach(code => {
                    const id = findId(code);
                    if (id && !targetAccountIds.includes(id)) targetAccountIds.push(id);
                });
            }
        } else {
            targetAccountIds = [this.selectedAccountId];
        }

        // Helper to check if entry belongs to the selected entity
        const belongsToEntity = (entry: any, lineDesc: string) => {
            if (!this.selectedEntity) return true;
            const desc = (entry.description || '').toLowerCase() + ' ' + (lineDesc || '').toLowerCase();
            const eName = (this.entityName || '').trim().toLowerCase();
            const eCode = (this.entityCode || '').trim().toLowerCase();
            return (eName && desc.includes(eName)) || (eCode && desc.includes(eCode));
        };

        const account = this.accountingService.getAccount(this.selectedAccountId);
        const isAssetSide = account ? ['ASSET', 'EXPENSE'].includes(account.type) : true;

        // 1. Calculate Initial Balance from Journal Entries
        this.initialBalance = 0;
        journalEntries.forEach(entry => {
            if (entry.status !== 'POSTED' && !this.includeDrafts) return;
            const entryDate = new Date(entry.date);
            if (entryDate < startDate) {
                entry.lines.filter(l => targetAccountIds.includes(l.accountId)).forEach(line => {
                    if (belongsToEntity(entry, line.description)) {
                        const amount = isAssetSide ? (line.debit - line.credit) : (line.credit - line.debit);
                        this.initialBalance += amount;
                    }
                });
            }
        });

        // 2. Fetch Movements from Journal Entries
        const periodMovements: any[] = [];
        const processedDocNumbers = new Set<string>();

        journalEntries.forEach(entry => {
            if (entry.status !== 'POSTED' && !this.includeDrafts) return;
            const entryDate = new Date(entry.date);
            if (entryDate >= startDate && entryDate <= endDate) {
                entry.lines.filter(l => targetAccountIds.includes(l.accountId)).forEach(line => {
                    if (belongsToEntity(entry, line.description)) {
                        const ref = entry.reference || entry.id;
                        // Prevent duplicates if multiple lines match same document (e.g. split payment) - actually we want all lines?
                        // Usually Account Statement shows one line per JE unless detail is needed.
                        // But if split lines exist (e.g. partial payment), we want them.

                        periodMovements.push({
                            date: entryDate, _order: new Date(entry.createdAt || entry.date).getTime(),
                            docType: entry.sourceType || 'JE',
                            docNumber: ref,
                            description: entry.description || line.description,
                            debit: line.debit || 0,
                            credit: line.credit || 0
                        });
                        processedDocNumbers.add(ref);
                    }
                });
            }
        });

        // 3. FALLBACK: Fetch Documents directly if they are missing from JEs
        // This handles cases where JEs were not created or lost
        if (this.selectedEntity) {
            const companyId = JSON.parse(localStorage.getItem('erp_company_info') || '{}').id;
            let docsObservable;

            if (this.entityType === 'CUSTOMER') {
                docsObservable = this.dataService.getSalesDocuments(companyId);
            } else if (this.entityType === 'SUPPLIER') {
                docsObservable = this.dataService.getPurchaseDocuments(companyId);
            }

            if (docsObservable) {
                docsObservable.subscribe(docs => {
                    // 1. Process Sales/Purchase Documents
                    docs.forEach((doc: any) => {
                        const docDate = new Date(doc.date);
                        if (docDate < startDate || docDate > endDate) return;

                        let isMatch = false;
                        if (this.entityType === 'CUSTOMER') {
                            if (doc.customerId && this.selectedEntity.id && doc.customerId === this.selectedEntity.id) isMatch = true;
                            else if (doc.customerName && this.selectedEntity.name && doc.customerName.toLowerCase().includes(this.selectedEntity.name.toLowerCase())) isMatch = true;
                        } else if (this.entityType === 'SUPPLIER') {
                            if (doc.supplierId && this.selectedEntity.id && doc.supplierId === this.selectedEntity.id) isMatch = true;
                            else if (doc.supplierName && this.selectedEntity.name && doc.supplierName.toLowerCase().includes(this.selectedEntity.name.toLowerCase())) isMatch = true;
                        }

                        if (!isMatch) return;

                        const docNum = doc.documentNumber || doc.number;
                        const foundInProcessed = Array.from(processedDocNumbers).some(ref => ref && docNum && (ref.toString().includes(docNum.toString()) || docNum.toString().includes(ref.toString())));

                        if (foundInProcessed) return;

                        const isDraft = doc.status === 'DRAFT';
                        // if (isDraft && !this.includeDrafts) return; // User requested to see all documents

                        const statusSuffix = isDraft ? ' (Rascunho)' : '';

                        if (this.entityType === 'CUSTOMER') {
                            // Sales Invoice, VD, etc = DEBIT
                            // Credit Note = CREDIT
                            const isCreditNote = ['NC', 'RE', 'ADC'].includes(doc.documentType);
                            // VD (Venda Dinheiro) and FR (Fatura Recibo) are Cash Sales, so they don't generate Debt (Debit).
                            // User Request: "VD should not be in debits".
                            const isCashSale = ['VD', 'FR'].includes(doc.documentType);
                            const isDebit = !isCreditNote && !isCashSale;

                            // Check for different total field names (Sales uses total/totalValue, Purchases uses totalValue)
                            const amount = Number(doc.total || doc.totalValue || doc.amount) || 0;
                            const docType = doc.documentType || doc.type || doc.docType || '';
                            const series = doc.series || '';
                            const fullDocRef = series ? `${docType} ${series}/${docNum}` : `${docType} ${docNum}`;

                            periodMovements.push({
                                date: docDate, _order: new Date(doc.createdAt || doc.date).getTime(),
                                docType: doc.documentType,
                                docNumber: fullDocRef,
                                description: `Doc. Comercial${statusSuffix} ${fullDocRef} - ${doc.customerName || ''}`,
                                debit: isDebit ? amount : 0,
                                credit: isCreditNote ? amount : 0
                            });
                        } else {
                            // Supplier Invoice = CREDIT (Increases Debt)
                            // Credit Note, Advance = DEBIT (Decreases Debt)
                            const isDebit = ['NC', 'ADF'].includes(doc.documentType);
                            // VD (Venda Dinheiro / Compra a Pronto) and FR (Fatura Recibo) are Cash Purchases.
                            // User Request: "Supplier statement equal to customer statement" -> Exclude Cash Purchases from Debt.
                            const isCashPurchase = ['VD', 'FR'].includes(doc.documentType);
                            const isCredit = !isDebit && !isCashPurchase;

                            // Purchase Docs use 'totalValue'
                            const amount = Number(doc.total || doc.totalValue || doc.amount) || 0;
                            const docType = doc.documentType || doc.type || doc.docType || '';
                            const series = doc.series || '';
                            const fullDocRef = series ? `${docType} ${series}/${docNum}` : `${docType} ${docNum}`;

                            periodMovements.push({
                                date: docDate, _order: new Date(doc.createdAt || doc.date).getTime(),
                                docType: doc.documentType,
                                docNumber: fullDocRef,
                                description: `Doc. Comercial${statusSuffix} ${fullDocRef} - ${doc.supplierName || ''}`,
                                debit: isDebit ? amount : 0,
                                credit: isCredit ? amount : 0
                            });
                        }
                    });

                    // 2. Process Treasury Documents (Receipts, Payments)
                    this.dataService.getTreasuryDocuments().subscribe(treasuryDocs => {
                        if (treasuryDocs) {
                            treasuryDocs.forEach((doc: any) => {
                                const docDate = new Date(doc.date);
                                if (docDate < startDate || docDate > endDate) return;

                                // Entity Match
                                let isMatch = false;
                                // Treasury_documents real fields: docType, type, customerCode/Name, entityCode/Name.
                                const docTypeT = doc.docType || doc.documentType || doc.type || '';
                                const eCode = this.entityType === 'CUSTOMER' ? (doc.customerCode || doc.entityCode) : (doc.beneficiaryCode || doc.entityCode);
                                const entityName = this.entityType === 'CUSTOMER' ? (doc.customerName || doc.entityName) : (doc.beneficiaryName || doc.supplierName || doc.entityName);
                                const codeMatch = !!(eCode && this.selectedEntity.code && eCode.toString().trim().toLowerCase() === this.selectedEntity.code.toString().trim().toLowerCase());
                                const nameMatch = !!(entityName && this.selectedEntity.name && entityName.toLowerCase().includes(this.selectedEntity.name.toLowerCase()));
                                if (this.entityType === 'CUSTOMER') {
                                    if (doc.type === 'RECEIPT' || docTypeT === 'RE' || docTypeT === 'ADC') { if (codeMatch || nameMatch) isMatch = true; }
                                } else if (this.entityType === 'SUPPLIER') {
                                    if (doc.type === 'PAYMENT' || docTypeT === 'PAG' || docTypeT === 'ADF') { if (codeMatch || nameMatch) isMatch = true; }
                                }

                                if (!isMatch) return;

                                const docNum = doc.docNumber || doc.number || doc.id;
                                const foundInProcessed = Array.from(processedDocNumbers).some(ref => ref && docNum && (ref.toString().includes(docNum.toString()) || docNum.toString().includes(ref.toString())));
                                if (foundInProcessed) return;

                                const isDraftT = doc.status === 'DRAFT';
                                const statusSuffixT = isDraftT ? ' (Rascunho)' : '';

                                // Treasury uses 'amount' or 'total'
                                const amount = Number(doc.amount || doc.total || doc.totalValue) || 0;
                                const fullDocRefT = `${docTypeT || ''} ${docNum}`; // Treasury usually just Type and Number

                                if (this.entityType === 'CUSTOMER') {
                                    // Receipt = CREDIT (Reduces debt)
                                    periodMovements.push({
                                        date: docDate, _order: new Date(doc.createdAt || doc.date).getTime(),
                                        docType: docTypeT || 'RE',
                                        docNumber: fullDocRefT,
                                        description: `Tesouraria${statusSuffixT} ${fullDocRefT} - ${entityName || ''}`,
                                        debit: 0,
                                        credit: amount
                                    });
                                } else {
                                    // Payment = DEBIT (Reduces debt to supplier)
                                    periodMovements.push({
                                        date: docDate, _order: new Date(doc.createdAt || doc.date).getTime(),
                                        docType: docTypeT || 'PAG',
                                        docNumber: fullDocRefT,
                                        description: `Tesouraria${statusSuffixT} ${fullDocRefT} - ${entityName || ''}`,
                                        debit: amount,
                                        credit: 0
                                    });
                                }
                            });
                        }

                        // Finalize after BOTH
                        this.finalizeLocallyGeneratedStatement(periodMovements, isAssetSide);
                    });
                });
                return;
            }
        }

        // Finalize if no docs fetching done
        this.finalizeLocallyGeneratedStatement(periodMovements, isAssetSide);
    }

    finalizeLocallyGeneratedStatement(periodMovements: any[], isAssetSide: boolean) {
        periodMovements.sort((a, b) => (a.date.getTime() - b.date.getTime()) || (((a as any)._order || 0) - ((b as any)._order || 0)));

        let running = this.initialBalance;
        this.totalDebit = 0;
        this.totalCredit = 0;

        this.movements = periodMovements.map(m => {
            const parsedDebit = Number(m.debit) || 0;
            const parsedCredit = Number(m.credit) || 0;

            const movementAmount = isAssetSide
                ? (parsedDebit - parsedCredit)
                : (parsedCredit - parsedDebit);

            running += movementAmount;
            this.totalDebit += parsedDebit;
            this.totalCredit += parsedCredit;
            return {
                ...m,
                debit: parsedDebit,
                credit: parsedCredit,
                balance: running
            };
        });

        const lastMovement = this.movements[this.movements.length - 1];
        this.finalBalance = lastMovement ? lastMovement.balance : this.initialBalance;

        // Notify UI update if needed (ChangeDetectorRef might be useful but bindings should auto-update)
    }

    getEntityDisplay(): string {
        if (this.selectedEntity) return `${this.selectedEntity.code} - ${this.selectedEntity.name}`;
        const acc = this.availableAccounts.find(a => a.id === this.selectedAccountId);
        return acc ? `${acc.code} - ${acc.name}` : 'SELCIONE UMA CONTA';
    }

    getEntityDetails(): string {
        if (this.selectedEntity) {
            let details = `NIF: ${this.selectedEntity.nif || '---'} | Endereço: ${this.selectedEntity.address || '---'}`;
            if (!this.selectedEntity.receivableAccountId && !this.selectedEntity.payableAccountId) {
                details += ' | [Conta corrente partilhada — filtrado por esta entidade]';
            }
            return details;
        }
        return 'Detalhamento geral da conta contabilística selecionada';
    }

    private findAccountByCode(code: string): string {
        const norm = (code || '').trim().toLowerCase(); const acc = this.accountingService.getAccounts().find(a => (a.code == null ? '' : a.code.toString()).trim().toLowerCase() === norm);
        return acc ? acc.id : '';
    }

    resetFilters() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        this.dateFrom = firstDay.toISOString().split('T')[0];
        this.dateTo = today.toISOString().split('T')[0];
        this.showOnlyPending = false;
        this.includeDrafts = false;
        this.resetSelection();
    }

    windowPrint() {
        window.print();
    }
}
