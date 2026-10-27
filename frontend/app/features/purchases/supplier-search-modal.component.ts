import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { SupplierService } from '../../shared/supplier.service';
import { Supplier } from '../../shared/models';
import { DataService } from '../../services/data.service';

type SearchField = 'all' | 'name' | 'code' | 'nif' | 'address';

/** Lista de fornecedores ao estilo Primavera: ↑/↓, Enter/duplo clique, Esc, e criação rápida se não existir. */
@Component({
  selector: 'app-supplier-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" (click)="close.emit()" (keydown)="onKeydown($event)">
      <div class="bg-[#F0F0F0] border border-gray-500 shadow-2xl w-[860px] max-w-[95vw] h-[520px] max-h-[90vh] flex flex-col text-[11px] text-gray-800"
           (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-2 py-1 bg-slate-700 text-white select-none">
          <span class="font-medium">Lista de Fornecedores</span>
          <button type="button" (click)="close.emit()" class="hover:bg-red-600 px-1.5 leading-none" title="Fechar (Esc)">&#10005;</button>
        </div>

        <div #gridBox class="flex-1 overflow-auto bg-white border border-gray-400 m-2">
          <table class="w-full border-collapse">
            <thead class="sticky top-0 z-10 bg-[#E1E1E1] text-gray-800">
              <tr>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400 w-24">Fornecedor</th>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400">Nome</th>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400 w-28">Contribuinte</th>
                <th class="px-2 py-1 text-left font-semibold border-b border-gray-400">Morada</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of filteredSuppliers; let i = index"
                  [attr.data-row]="i"
                  (click)="selectedIndex = i"
                  (dblclick)="select.emit(s)"
                  class="cursor-default"
                  [ngClass]="i === selectedIndex ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-100'">
                <td class="px-2 py-0.5 border-r border-gray-200">{{ s.code }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200">{{ s.name }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200">{{ s.nif }}</td>
                <td class="px-2 py-0.5 truncate max-w-[260px]">{{ s.address }}</td>
              </tr>
              <tr *ngIf="filteredSuppliers.length === 0 && !creating">
                <td colspan="4" class="px-2 py-6 text-center text-gray-600">
                  <div class="italic mb-2">Nenhum fornecedor encontrado{{ searchTerm ? ' para "' + searchTerm + '"' : '' }}.</div>
                  <button type="button" (click)="startCreate()"
                          class="px-3 py-1 border border-blue-700 bg-blue-600 text-white hover:bg-blue-700">+ Criar novo fornecedor</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="creating" class="mx-2 mb-2 p-2 border border-blue-500 bg-blue-50 grid grid-cols-12 gap-2 items-end">
          <div class="col-span-12 font-semibold">Novo fornecedor ({{ newCode }})</div>
          <label class="col-span-5 flex flex-col gap-0.5">Nome *
            <input type="text" [(ngModel)]="draft.name" (keydown)="$event.stopPropagation()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600" />
          </label>
          <label class="col-span-2 flex flex-col gap-0.5">Contribuinte
            <input type="text" [(ngModel)]="draft.nif" (keydown)="$event.stopPropagation()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600" />
          </label>
          <label class="col-span-2 flex flex-col gap-0.5">Telefone
            <input type="text" [(ngModel)]="draft.phone" (keydown)="$event.stopPropagation()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600" />
          </label>
          <label class="col-span-3 flex flex-col gap-0.5">Morada
            <input type="text" [(ngModel)]="draft.address" (keydown)="$event.stopPropagation()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600" />
          </label>
          <div class="col-span-12 flex items-center justify-end gap-2">
            <span *ngIf="createError" class="text-red-600 mr-auto">{{ createError }}</span>
            <button type="button" (click)="saveCreate()" [disabled]="saving" class="px-3 py-0.5 border border-blue-700 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{{ saving ? 'A gravar…' : 'Gravar e seleccionar' }}</button>
            <button type="button" (click)="creating = false" class="px-3 py-0.5 border border-gray-500 bg-white hover:bg-gray-100">Cancelar</button>
          </div>
        </div>

        <div class="flex items-center gap-2 px-2 pb-2">
          <label class="whitespace-nowrap">Pesquisar por:</label>
          <select [(ngModel)]="searchField" (ngModelChange)="filterSuppliers()"
                  class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600">
            <option value="all">Todos os campos</option>
            <option value="name">Nome</option>
            <option value="code">Código</option>
            <option value="nif">Contribuinte</option>
            <option value="address">Morada</option>
          </select>
          <input #searchInput type="text" [(ngModel)]="searchTerm" (ngModelChange)="filterSuppliers()"
                 placeholder="Escreva para filtrar…"
                 class="flex-1 border border-gray-400 bg-white px-1.5 py-0.5 focus:outline-none focus:border-blue-600" />
        </div>

        <div class="flex items-center justify-between px-2 py-1.5 border-t border-gray-300 bg-[#E8E8E8]">
          <span class="text-gray-600">{{ filteredSuppliers.length }} registo(s)</span>
          <div class="flex gap-2">
            <button type="button" (click)="startCreate()" class="px-3 py-0.5 border border-gray-500 bg-white hover:bg-gray-100">Novo…</button>
            <button type="button" (click)="confirm()" [disabled]="selectedIndex < 0"
                    class="w-20 py-0.5 border border-gray-500 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">OK</button>
            <button type="button" (click)="close.emit()" class="w-20 py-0.5 border border-gray-500 bg-white hover:bg-gray-100">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SupplierSearchModalComponent implements OnInit, AfterViewInit {
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<Supplier>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('gridBox') gridBox?: ElementRef<HTMLElement>;

  searchTerm = '';
  searchField: SearchField = 'all';
  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];
  selectedIndex = -1;

  creating = false;
  saving = false;
  createError = '';
  newCode = '';
  draft: any = { name: '', nif: '', phone: '', address: '' };
  private companyId: string | undefined;

  constructor(private supplierService: SupplierService, private dataService: DataService) {
    this.dataService.activeCompany$.subscribe(c => this.companyId = c?.id || undefined);
  }

  ngOnInit() {
    this.setSuppliers(this.supplierService.getSuppliers());
    if (!this.suppliers.length) {
      this.supplierService.loadSuppliers().then(() => this.setSuppliers(this.supplierService.getSuppliers()));
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  private setSuppliers(list: Supplier[]) {
    this.suppliers = [...(list || [])].sort((a, b) =>
      String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { numeric: true, sensitivity: 'base' }));
    this.filterSuppliers();
  }

  filterSuppliers() {
    const q = this.searchTerm.toLowerCase().trim();
    const f = this.searchField;
    const has = (v: any) => String(v ?? '').toLowerCase().includes(q);
    this.filteredSuppliers = !q
      ? this.suppliers
      : this.suppliers.filter(s =>
          f === 'name' ? has(s.name) : f === 'code' ? has(s.code) : f === 'nif' ? has(s.nif) : f === 'address' ? has(s.address)
          : has(s.name) || has(s.code) || has(s.nif) || has(s.address));
    this.selectedIndex = this.filteredSuppliers.length ? 0 : -1;
  }

  startCreate() {
    const max = this.suppliers
      .filter(s => String(s.code).startsWith('F'))
      .map(s => parseInt(String(s.code).substring(1), 10))
      .reduce((m, n) => (isNaN(n) ? m : Math.max(m, n)), 0);
    this.newCode = 'F' + String(max + 1).padStart(3, '0');
    this.draft = { name: this.searchField === 'nif' ? '' : this.searchTerm.trim(), nif: this.searchField === 'nif' ? this.searchTerm.trim() : '', phone: '', address: '' };
    this.createError = '';
    this.creating = true;
  }

  async saveCreate() {
    if (!this.draft.name?.trim()) { this.createError = 'O nome é obrigatório.'; return; }
    this.saving = true;
    this.createError = '';
    const supplier: any = {
      id: 'NEW_' + Date.now(), companyId: this.companyId, code: this.newCode,
      name: this.draft.name.trim(), nif: this.draft.nif?.trim() || '', address: this.draft.address?.trim() || '',
      city: '', postalCode: '', country: 'Moçambique', phone: this.draft.phone?.trim() || '', email: '',
      paymentTerms: 30, creditLimit: 0, currentBalance: 0, payableAccountId: '', isActive: true
    };
    try {
      const saved = await lastValueFrom(this.dataService.saveSupplier(supplier));
      const final = saved?.id ? saved : supplier;
      await this.supplierService.loadSuppliers();
      this.creating = false;
      this.select.emit(final);
    } catch (e: any) {
      this.createError = e?.error?.message || 'Não foi possível criar o fornecedor.';
    } finally {
      this.saving = false;
    }
  }

  onKeydown(ev: KeyboardEvent) {
    if (this.creating) { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.creating = false; } return; }
    const n = this.filteredSuppliers.length;
    switch (ev.key) {
      case 'ArrowDown': ev.preventDefault(); this.move(1, n); break;
      case 'ArrowUp': ev.preventDefault(); this.move(-1, n); break;
      case 'PageDown': ev.preventDefault(); this.move(10, n); break;
      case 'PageUp': ev.preventDefault(); this.move(-10, n); break;
      case 'Enter': ev.preventDefault(); this.confirm(); break;
      case 'Escape': ev.preventDefault(); this.close.emit(); break;
    }
  }

  private move(delta: number, n: number) {
    if (!n) return;
    const next = this.selectedIndex < 0 ? 0 : this.selectedIndex + delta;
    this.selectedIndex = Math.max(0, Math.min(n - 1, next));
    setTimeout(() => {
      this.gridBox?.nativeElement.querySelector(`[data-row="${this.selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    });
  }

  confirm() {
    const s = this.filteredSuppliers[this.selectedIndex];
    if (s) this.select.emit(s);
  }
}
