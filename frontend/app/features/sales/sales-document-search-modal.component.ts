import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesDocument } from '../../shared/models';
import { DataService } from '../../services/data.service';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Submetido',
  APPROVED: 'Aprovado',
  POSTED: 'Lançado',
  REJECTED: 'Rejeitado',
};

/**
 * Procurar documentos de venda — ao estilo Primavera:
 * filtros (tipo, série, nº, entidade, datas, estado), grelha compacta,
 * ↑/↓ para mover, Enter ou duplo clique para abrir, Esc para fechar.
 */
@Component({
  selector: 'app-sales-document-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" (keydown)="onKeydown($event)">
      <div class="bg-[#F0F0F0] border border-gray-500 shadow-2xl w-[980px] max-w-[96vw] h-[560px] max-h-[92vh] flex flex-col text-[11px] text-gray-800">

        <!-- Barra de título -->
        <div class="flex items-center justify-between px-2 py-1 bg-slate-700 text-white select-none shrink-0">
          <span class="font-medium">Procurar Documentos de Venda</span>
          <button type="button" (click)="close.emit()" class="hover:bg-red-600 px-1.5 leading-none" title="Fechar (Esc)">&#10005;</button>
        </div>

        <!-- Filtros -->
        <div class="grid grid-cols-12 gap-x-3 gap-y-1.5 items-end p-2 border-b border-gray-300 shrink-0">
          <label class="col-span-2 flex flex-col gap-0.5">Documento
            <select [(ngModel)]="fType" (ngModelChange)="applyFilter()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600">
              <option value="">Todos</option>
              <option *ngFor="let t of typeOptions" [value]="t">{{ t }}</option>
            </select>
          </label>
          <label class="col-span-2 flex flex-col gap-0.5">Série
            <select [(ngModel)]="fSeries" (ngModelChange)="applyFilter()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600">
              <option value="">Todas</option>
              <option *ngFor="let s of seriesOptions" [value]="s">{{ s }}</option>
            </select>
          </label>
          <label class="col-span-2 flex flex-col gap-0.5">Número
            <input type="text" [(ngModel)]="fNumber" (ngModelChange)="applyFilter()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600" />
          </label>
          <label class="col-span-3 flex flex-col gap-0.5">Estado
            <select [(ngModel)]="fStatus" (ngModelChange)="applyFilter()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600">
              <option value="">Todos</option>
              <option value="DRAFT">Rascunho</option>
              <option value="SUBMITTED">Submetido</option>
              <option value="APPROVED">Aprovado</option>
              <option value="POSTED">Lançado</option>
              <option value="REJECTED">Rejeitado</option>
            </select>
          </label>
          <div class="col-span-3 flex justify-end">
            <button type="button" (click)="clearFilters()" class="px-3 py-0.5 border border-gray-500 bg-white hover:bg-gray-100">Limpar filtros</button>
          </div>

          <label class="col-span-5 flex flex-col gap-0.5">Entidade (nome, código ou contribuinte)
            <input #firstInput type="text" [(ngModel)]="fEntity" (ngModelChange)="applyFilter()" placeholder="Escreva para filtrar…"
                   class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600" />
          </label>
          <label class="col-span-2 flex flex-col gap-0.5">Data de
            <input type="date" [(ngModel)]="fDateFrom" (ngModelChange)="applyFilter()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600" />
          </label>
          <label class="col-span-2 flex flex-col gap-0.5">Data até
            <input type="date" [(ngModel)]="fDateTo" (ngModelChange)="applyFilter()" class="border border-gray-400 bg-white px-1 py-0.5 focus:outline-none focus:border-blue-600" />
          </label>
        </div>

        <!-- Grelha -->
        <div #gridBox class="flex-1 overflow-auto bg-white border border-gray-400 m-2">
          <table class="w-full border-collapse">
            <thead class="sticky top-0 z-10 bg-[#E1E1E1] text-gray-800">
              <tr>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400 w-14">Doc.</th>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400 w-16">Série</th>
                <th class="px-2 py-1 text-right font-semibold border-r border-b border-gray-400 w-16">Núm.</th>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400 w-24">Data</th>
                <th class="px-2 py-1 text-left font-semibold border-r border-b border-gray-400">Entidade</th>
                <th class="px-2 py-1 text-right font-semibold border-r border-b border-gray-400 w-28">Total</th>
                <th class="px-2 py-1 text-left font-semibold border-b border-gray-400 w-24">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of filteredDocuments; let i = index"
                  [attr.data-row]="i"
                  (click)="selectedIndex = i"
                  (dblclick)="selectDocument(doc)"
                  class="cursor-default"
                  [ngClass]="i === selectedIndex ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-100'">
                <td class="px-2 py-0.5 border-r border-gray-200">{{ doc.documentType }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200">{{ doc.series }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200 text-right">{{ doc.seriesNumber }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200">{{ doc.date | date:'dd/MM/yyyy' }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200">{{ doc.customerName }}</td>
                <td class="px-2 py-0.5 border-r border-gray-200 text-right tabular-nums">{{ doc.total | number:'1.2-2' }}</td>
                <td class="px-2 py-0.5">{{ statusLabel(doc.status) }}</td>
              </tr>
              <tr *ngIf="filteredDocuments.length === 0">
                <td colspan="7" class="px-2 py-6 text-center text-gray-500 italic">Nenhum documento encontrado.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Rodapé -->
        <div class="flex items-center justify-between px-2 py-1.5 border-t border-gray-300 bg-[#E8E8E8] shrink-0">
          <span class="text-gray-600">{{ filteredDocuments.length }} documento(s)</span>
          <div class="flex gap-2">
            <button type="button" (click)="confirm()" [disabled]="selectedIndex < 0"
                    class="w-20 py-0.5 border border-gray-500 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Abrir</button>
            <button type="button" (click)="close.emit()"
                    class="w-20 py-0.5 border border-gray-500 bg-white hover:bg-gray-100">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SalesDocumentSearchModalComponent implements OnInit, AfterViewInit {
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<SalesDocument>();

  @ViewChild('firstInput') firstInput?: ElementRef<HTMLInputElement>;
  @ViewChild('gridBox') gridBox?: ElementRef<HTMLElement>;

  documents: any[] = [];
  filteredDocuments: any[] = [];
  selectedIndex = -1;

  fType = '';
  fSeries = '';
  fNumber = '';
  fStatus = '';
  fEntity = '';
  fDateFrom = '';
  fDateTo = '';

  typeOptions: string[] = [];
  seriesOptions: string[] = [];

  private activeCompanyId: string | null = null;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.dataService.activeCompany$.subscribe(company => {
      this.activeCompanyId = company?.id || null;
      this.loadDocuments();
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.firstInput?.nativeElement.focus());
  }

  loadDocuments() {
    // Filtrar sempre pela empresa activa para não misturar dados
    const companyId = this.activeCompanyId || undefined;
    this.dataService.getSalesDocuments(companyId).subscribe(docs => {
      const list = [...(docs || [])];
      // Mais recentes primeiro; dentro do mesmo dia, número mais alto primeiro
      list.sort((a: any, b: any) =>
        String(b.date).slice(0, 10).localeCompare(String(a.date).slice(0, 10)) ||
        (Number(b.seriesNumber) || 0) - (Number(a.seriesNumber) || 0));
      this.documents = list;
      this.typeOptions = Array.from(new Set(list.map((d: any) => d.documentType).filter(Boolean))).sort() as string[];
      this.seriesOptions = Array.from(new Set(list.map((d: any) => d.series).filter(Boolean))).sort() as string[];
      this.applyFilter();
    });
  }

  statusLabel(s: string): string {
    return STATUS_LABEL[s] || s || '';
  }

  clearFilters() {
    this.fType = this.fSeries = this.fNumber = this.fStatus = this.fEntity = this.fDateFrom = this.fDateTo = '';
    this.applyFilter();
  }

  applyFilter() {
    const ent = this.fEntity.toLowerCase().trim();
    const num = this.fNumber.trim();
    this.filteredDocuments = this.documents.filter((d: any) => {
      const day = String(d.date || '').slice(0, 10);
      if (this.fType && d.documentType !== this.fType) return false;
      if (this.fSeries && d.series !== this.fSeries) return false;
      if (this.fStatus && d.status !== this.fStatus) return false;
      if (num && !String(d.seriesNumber ?? '').includes(num) && !String(d.documentNumber ?? '').toLowerCase().includes(num.toLowerCase())) return false;
      if (this.fDateFrom && day < this.fDateFrom) return false;
      if (this.fDateTo && day > this.fDateTo) return false;
      if (ent &&
        !String(d.customerName ?? '').toLowerCase().includes(ent) &&
        !String(d.customerId ?? '').toLowerCase().includes(ent) &&
        !String(d.customerNif ?? '').toLowerCase().includes(ent)) return false;
      return true;
    });
    this.selectedIndex = this.filteredDocuments.length ? 0 : -1;
  }

  onKeydown(ev: KeyboardEvent) {
    const n = this.filteredDocuments.length;
    const target = ev.target as HTMLElement;
    const inSelect = target && target.tagName === 'SELECT';
    switch (ev.key) {
      case 'ArrowDown': if (inSelect) return; ev.preventDefault(); this.move(1, n); break;
      case 'ArrowUp': if (inSelect) return; ev.preventDefault(); this.move(-1, n); break;
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
      this.gridBox?.nativeElement
        .querySelector(`[data-row="${this.selectedIndex}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  confirm() {
    const d = this.filteredDocuments[this.selectedIndex];
    if (d) this.selectDocument(d);
  }

  selectDocument(doc: SalesDocument) {
    this.select.emit(doc);
  }
}
