import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../customer.service';
import { Customer } from '../models';
import { DataService } from '../../services/data.service';
import { lastValueFrom } from 'rxjs';

type SearchField = 'all' | 'name' | 'code' | 'nif' | 'address';

/**
 * Lista de entidades (clientes) — lookup ao estilo Primavera:
 * grelha compacta, ↑/↓ para mover, Enter ou duplo clique para escolher, Esc para fechar,
 * e pesquisa incremental por campo.
 */
@Component({
  selector: 'app-entity-list-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" (click)="onClose()" (keydown)="onKeydown($event)">
      <div class="bg-[#F0F0F0] border border-gray-500 shadow-2xl w-[860px] max-w-[95vw] h-[520px] max-h-[90vh] flex flex-col text-[11px] text-gray-800"
           (click)="$event.stopPropagation()">

        <!-- Barra de título -->
        <div class="flex items-center justify-between px-2 py-1 bg-slate-700 text-white select-none">
          <span class="font-medium">{{ title || 'Lista de Clientes' }}</span>
          <button type="button" (click)="onClose()" class="hover:bg-red-600 px-1.5 leading-none" title="Fechar (Esc)">&#10005;</button>
        </div>

        <!-- Grelha -->
        <div #gridBox class="flex-1 overflow-auto bg-white border border-gray-400 m-2">
          <table class="w-full border-collapse">
            <thead class="sticky top-0 z-10 bg-[#E1E1E1] text-gray-800">
              <tr>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400 w-24">Cliente</th>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400">Nome</th>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400 w-28">Contribuinte</th>
                <th class="px-2 py-1 text-left font-semibold border-b border-gray-400">Morada</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of filteredEntities; let i = index"
                  [attr.data-row]="i"
                  (click)="selectedIndex = i"
                  (dblclick)="onSelect(e)"
                  class="cursor-default"
                  [ngClass]="i === selectedIndex ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-100'">
                <td class="px-2 py-0.5 border-r border-gray-200">{{ e.code }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200">{{ e.name }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200">{{ e.nif }}</td>
                <td class="px-2 py-0.5 truncate max-w-[260px]">{{ e.address }}</td>
              </tr>
              <tr *ngIf="filteredEntities.length === 0 && !creating">
                <td colspan="4" class="px-2 py-6 text-center text-gray-600">
                  <div class="italic mb-2">Nenhum cliente encontrado{{ searchQuery ? ' para "' + searchQuery + '"' : '' }}.</div>
                  <button type="button" (click)="startCreate()"
                          class="px-3 py-1 border border-blue-700 bg-blue-600 text-white hover:bg-blue-700">+ Criar novo cliente</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Criação rápida -->
        <div *ngIf="creating" class="mx-2 mb-2 p-2 border border-blue-500 bg-blue-50 grid grid-cols-12 gap-2 items-end">
          <div class="col-span-12 font-semibold">Novo cliente ({{ newCode }})</div>
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

        <!-- Pesquisa -->
        <div class="flex items-center gap-2 px-2 pb-2">
          <label class="whitespace-nowrap">Pesquisar por:</label>
          <select [(ngModel)]="searchField" (ngModelChange)="applyFilter()"
                  class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600">
            <option value="all">Todos os campos</option>
            <option value="name">Nome</option>
            <option value="code">Código</option>
            <option value="nif">Contribuinte</option>
            <option value="address">Morada</option>
          </select>
          <input #searchInput type="text" [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()"
                 placeholder="Escreva para filtrar…"
                 class="flex-1 border border-gray-400 bg-white px-1.5 py-0.5 focus:outline-none focus:border-blue-600" />
        </div>

        <!-- Rodapé -->
        <div class="flex items-center justify-between px-2 py-1.5 border-t border-gray-300 bg-[#E8E8E8]">
          <span class="text-gray-600">{{ filteredEntities.length }} registo(s)</span>
          <div class="flex gap-2">
            <button type="button" (click)="startCreate()" class="px-3 py-0.5 border border-gray-500 bg-white hover:bg-gray-100">Novo…</button>
            <button type="button" (click)="confirm()" [disabled]="selectedIndex < 0"
                    class="w-20 py-0.5 border border-gray-500 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">OK</button>
            <button type="button" (click)="onClose()"
                    class="w-20 py-0.5 border border-gray-500 bg-white hover:bg-gray-100">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EntityListModalComponent implements OnInit, AfterViewInit {
  @Input() title: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<any>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('gridBox') gridBox?: ElementRef<HTMLElement>;

  entities: Customer[] = [];
  filteredEntities: Customer[] = [];
  searchQuery = '';
  searchField: SearchField = 'all';
  selectedIndex = -1;

  creating = false;
  saving = false;
  createError = '';
  newCode = '';
  draft: any = { name: '', nif: '', phone: '', address: '' };
  private companyId: string | undefined;

  constructor(private customerService: CustomerService, private dataService: DataService) {
    this.dataService.activeCompany$.subscribe(c => this.companyId = c?.id || undefined);
  }

  startCreate() {
    const max = this.entities
      .filter(e => String(e.code).startsWith('C'))
      .map(e => parseInt(String(e.code).substring(1), 10))
      .reduce((m, n) => (isNaN(n) ? m : Math.max(m, n)), 0);
    this.newCode = 'C' + String(max + 1).padStart(3, '0');
    this.draft = { name: this.searchField === 'nif' ? '' : this.searchQuery.trim(), nif: this.searchField === 'nif' ? this.searchQuery.trim() : '', phone: '', address: '' };
    this.createError = '';
    this.creating = true;
  }

  async saveCreate() {
    if (!this.draft.name?.trim()) { this.createError = 'O nome é obrigatório.'; return; }
    this.saving = true;
    this.createError = '';
    const customer: any = {
      id: 'NEW_' + Date.now(), companyId: this.companyId, code: this.newCode,
      name: this.draft.name.trim(), nif: this.draft.nif?.trim() || '', address: this.draft.address?.trim() || '',
      city: '', postalCode: '', country: 'Moçambique', phone: this.draft.phone?.trim() || '', email: '',
      paymentTerms: 30, creditLimit: 0, currentBalance: 0, receivableAccountId: '', isActive: true, type: 'CONSUMIDOR'
    };
    try {
      const saved = await lastValueFrom(this.dataService.saveCustomer(customer));
      const final = saved?.id ? saved : customer;
      await this.customerService.loadCustomers();
      this.creating = false;
      this.onSelect(final);
    } catch (e: any) {
      this.createError = e?.error?.message || 'Não foi possível criar o cliente.';
    } finally {
      this.saving = false;
    }
  }

  ngOnInit() {
    this.setEntities(this.customerService.getCustomers());
    if (!this.entities.length) {
      this.customerService.loadCustomers().then(() => this.setEntities(this.customerService.getCustomers()));
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  private setEntities(list: Customer[]) {
    this.entities = [...(list || [])].sort((a, b) =>
      String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { numeric: true, sensitivity: 'base' }));
    this.applyFilter();
  }

  applyFilter() {
    const q = this.searchQuery.toLowerCase().trim();
    const f = this.searchField;
    const has = (v: any) => String(v ?? '').toLowerCase().includes(q);
    this.filteredEntities = !q
      ? this.entities
      : this.entities.filter(e =>
          f === 'name' ? has(e.name)
          : f === 'code' ? has(e.code)
          : f === 'nif' ? has(e.nif)
          : f === 'address' ? has(e.address)
          : has(e.name) || has(e.code) || has(e.nif) || has(e.address));
    this.selectedIndex = this.filteredEntities.length ? 0 : -1;
  }

  onKeydown(ev: KeyboardEvent) {
    if (this.creating) { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.creating = false; } return; }
    const n = this.filteredEntities.length;
    switch (ev.key) {
      case 'ArrowDown': ev.preventDefault(); this.move(1, n); break;
      case 'ArrowUp': ev.preventDefault(); this.move(-1, n); break;
      case 'PageDown': ev.preventDefault(); this.move(10, n); break;
      case 'PageUp': ev.preventDefault(); this.move(-10, n); break;
      case 'Enter': ev.preventDefault(); this.confirm(); break;
      case 'Escape': ev.preventDefault(); this.onClose(); break;
    }
  }

  private move(delta: number, n: number) {
    if (!n) return;
    const next = this.selectedIndex < 0 ? 0 : this.selectedIndex + delta;
    this.selectedIndex = Math.max(0, Math.min(n - 1, next));
    setTimeout(() => {
      this.gridBox?.nativeElement
        .querySelector(`[data-row="${this.selectedIndex}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  confirm() {
    const e = this.filteredEntities[this.selectedIndex];
    if (e) this.onSelect(e);
  }

  onClose() {
    this.close.emit();
  }

  onSelect(entity: any) {
    this.select.emit(entity);
  }
}
