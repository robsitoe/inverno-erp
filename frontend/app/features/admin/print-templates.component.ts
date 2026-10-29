import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PrintField, PrintModule, PrintTemplate, PrintTemplatesService } from '../../services/print-templates.service';
import { ToasterService } from '../../services/toaster.service';

const MODULE_TABS: { id: PrintModule; label: string; docTypes: { code: string; label: string }[] }[] = [
  {
    id: 'SALES', label: 'Vendas', docTypes: [
      { code: 'FA', label: 'Fatura' }, { code: 'FR', label: 'Fatura-Recibo' }, { code: 'VD', label: 'Venda a Dinheiro' },
      { code: 'FT', label: 'Fatura Título' }, { code: 'NC', label: 'Nota de Crédito' }, { code: 'ND', label: 'Nota de Débito' },
      { code: 'NE', label: 'Nota de Encomenda' }, { code: 'OR', label: 'Orçamento' }, { code: 'GT', label: 'Guia de Transporte' },
    ],
  },
  {
    id: 'PURCHASES', label: 'Compras', docTypes: [
      { code: 'FC', label: 'Fatura de Compra' }, { code: 'VDC', label: 'Venda a Dinheiro (Compra)' }, { code: 'NCC', label: 'Nota de Crédito (Compra)' },
      { code: 'NDC', label: 'Nota de Débito (Compra)' }, { code: 'NEC', label: 'Nota de Encomenda (Compra)' }, { code: 'GRC', label: 'Guia de Remessa' },
    ],
  },
  { id: 'TREASURY', label: 'Tesouraria', docTypes: [{ code: 'RE', label: 'Recibo' }, { code: 'PA', label: 'Pagamento' }, { code: 'PAG', label: 'Pagamento (PAG)' }] },
  {
    id: 'STOCK', label: 'Stock', docTypes: [
      { code: 'ENT', label: 'Entrada' }, { code: 'SAI', label: 'Saída' }, { code: 'TRA', label: 'Transferência' }, { code: 'INV', label: 'Inventário' },
    ],
  },
];

/**
 * Modelos de impressão: criar, editar, pré-visualizar, versões, importar/exportar e verificar papéis impressos.
 * As regras de segurança são aplicadas no servidor; aqui só se mostram os problemas encontrados.
 */
@Component({
  selector: 'app-print-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="space-y-4">
    <div class="bg-white border border-gray-200 rounded shadow-sm">
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-gray-800">Modelos de Impressão</h3>
          <p class="text-xs text-gray-500">O modelo define o aspeto; os valores vêm sempre do documento gravado e são conferidos antes de imprimir.</p>
        </div>
        <div class="flex gap-1">
          <button *ngFor="let m of modules" (click)="selectModule(m.id)"
                  class="px-3 py-1.5 text-xs font-semibold rounded border"
                  [ngClass]="module === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'">{{ m.label }}</button>
        </div>
      </div>

      <div class="flex min-h-[560px]">
        <!-- Lista -->
        <div class="w-56 border-r border-gray-200 p-3 space-y-2 shrink-0">
          <button (click)="newTemplate()" class="w-full px-3 py-2 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700">+ Novo modelo</button>
          <label class="w-full block text-center px-3 py-2 text-xs font-semibold rounded border border-gray-300 cursor-pointer hover:bg-gray-50">
            Importar ficheiro
            <input type="file" accept=".json,application/json" class="hidden" (change)="importFile($event)">
          </label>
          <div *ngIf="!moduleTemplates.length" class="text-xs text-gray-400 pt-2">Sem modelos. Sem modelo, a impressão usa o formato normal do programa.</div>
          <button *ngFor="let t of moduleTemplates" (click)="open(t)"
                  class="w-full text-left px-2 py-2 rounded border text-xs"
                  [ngClass]="editing?.id === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'">
            <div class="font-semibold text-gray-800">{{ t.name }} <span *ngIf="t.isDefault" class="text-[10px] text-green-700">(padrão)</span></div>
            <div class="text-gray-500">{{ t.docTypes.join(', ') }} · v{{ t.version }}</div>
          </button>
        </div>

        <!-- Editor -->
        <div *ngIf="editing; else emptyTpl" class="flex-1 p-4 space-y-3 min-w-0">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label class="block md:col-span-2">
              <span class="text-xs font-semibold text-gray-600">Nome do modelo</span>
              <input [(ngModel)]="editing.name" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
            </label>
            <label class="flex items-center gap-2 text-xs text-gray-700 mt-5">
              <input type="checkbox" [(ngModel)]="editing.isDefault"> Modelo padrão para os tipos escolhidos
            </label>
          </div>
          <div>
            <span class="text-xs font-semibold text-gray-600">Usar para</span>
            <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <label *ngFor="let d of currentDocTypes" class="flex items-center gap-1 text-xs text-gray-700">
                <input type="checkbox" [checked]="editing.docTypes.includes(d.code)" (change)="toggleDocType(d.code)"> {{ d.code }} — {{ d.label }}
              </label>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="flex-1 min-w-0 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-gray-600">HTML do modelo</span>
                <label class="text-xs text-blue-700 cursor-pointer hover:underline">
                  Inserir imagem de fundo / timbrado
                  <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" (change)="insertImage($event)">
                </label>
              </div>
              <textarea #htmlBox [(ngModel)]="editing.html" spellcheck="false" rows="18"
                        class="w-full border border-gray-300 rounded px-2 py-1.5 font-mono text-[11px] leading-snug"></textarea>
              <span class="text-xs font-semibold text-gray-600">CSS</span>
              <textarea [(ngModel)]="editing.css" spellcheck="false" rows="6"
                        class="w-full border border-gray-300 rounded px-2 py-1.5 font-mono text-[11px] leading-snug"></textarea>
            </div>
            <div class="w-60 shrink-0">
              <div class="text-xs font-semibold text-gray-600 mb-1">Campos (clique para inserir)</div>
              <div class="border border-gray-200 rounded max-h-[430px] overflow-y-auto divide-y divide-gray-100">
                <button *ngFor="let b of blocks" (click)="insert(b.code)" class="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50">
                  <span class="font-mono text-purple-700">{{ b.code }}</span><div class="text-gray-500">{{ b.label }}</div>
                </button>
                <button *ngFor="let f of fields" (click)="insert(ph(f.key))" class="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50">
                  <span class="font-mono" [class.text-blue-700]="f.fiscal">{{ ph(f.key) }}</span>
                  <span *ngIf="isRequired(f)" class="text-red-600"> *</span>
                  <div class="text-gray-500">{{ f.label }}<span *ngIf="f.scope === 'linha'"> · dentro de linhas</span><span *ngIf="f.scope === 'iva'"> · dentro de resumoIva</span></div>
                </button>
              </div>
              <div class="text-[10px] text-gray-500 mt-1"><span class="text-blue-700">Azul</span> = valor fiscal conferido com a base de dados. <span class="text-red-600">*</span> = obrigatório.</div>
            </div>
          </div>

          <div *ngIf="errors.length" class="rounded border border-red-200 bg-red-50 p-3">
            <div class="text-xs font-bold text-red-700 mb-1">O modelo tem problemas:</div>
            <ul class="list-disc pl-5 text-xs text-red-700 space-y-0.5"><li *ngFor="let e of errors">{{ e }}</li></ul>
          </div>
          <div *ngIf="okMessage" class="rounded border border-green-200 bg-green-50 p-2 text-xs text-green-700">{{ okMessage }}</div>

          <div class="flex flex-wrap gap-2">
            <button (click)="save()" [disabled]="busy" class="px-4 py-2 text-xs font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Gravar</button>
            <button (click)="doPreview()" [disabled]="busy" class="px-4 py-2 text-xs font-semibold rounded border border-gray-300">Pré-visualizar</button>
            <button (click)="check()" [disabled]="busy" class="px-4 py-2 text-xs font-semibold rounded border border-gray-300">Verificar regras</button>
            <button (click)="exportFile()" class="px-4 py-2 text-xs font-semibold rounded border border-gray-300">Exportar</button>
            <button (click)="loadStarter()" class="px-4 py-2 text-xs font-semibold rounded border border-gray-300">Repor modelo base</button>
            <button *ngIf="editing.id" (click)="remove()" class="px-4 py-2 text-xs font-semibold rounded border border-red-300 text-red-700 ml-auto">Eliminar</button>
          </div>

          <div *ngIf="previewHtml" class="border border-gray-300 rounded">
            <div class="flex items-center justify-between px-2 py-1 bg-gray-50 border-b border-gray-200">
              <span class="text-xs font-semibold text-gray-600">Pré-visualização (dados de exemplo)</span>
              <button (click)="previewHtml = ''" class="text-xs text-gray-500 hover:text-gray-800">Fechar</button>
            </div>
            <iframe sandbox="" [srcdoc]="previewSafe" class="w-full h-[640px] bg-white"></iframe>
          </div>

          <div *ngIf="editing.id && versions.length" class="border border-gray-200 rounded">
            <div class="px-2 py-1 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">Versões</div>
            <div *ngFor="let v of versions" class="flex items-center justify-between px-2 py-1 text-xs border-b border-gray-100 last:border-0">
              <span>v{{ v.version }} · {{ v.createdBy || '—' }} · {{ v.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              <button *ngIf="v.version !== editing.version" (click)="restore(v.version)" class="text-blue-700 hover:underline">Restaurar</button>
              <span *ngIf="v.version === editing.version" class="text-green-700">atual</span>
            </div>
          </div>
        </div>
        <ng-template #emptyTpl>
          <div class="flex-1 flex items-center justify-center text-sm text-gray-400 p-8 text-center">
            Escolha um modelo à esquerda ou crie um novo. O modelo novo começa com um formato base que pode alterar.
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Verificação de um papel impresso -->
    <div class="bg-white border border-gray-200 rounded shadow-sm p-4">
      <h3 class="text-sm font-bold text-gray-800">Verificar documento impresso</h3>
      <p class="text-xs text-gray-500 mb-2">Indique o número e o código de controlo que estão no rodapé do papel.</p>
      <div class="flex flex-wrap gap-2 items-end">
        <label class="block"><span class="text-xs text-gray-600">Número</span>
          <input [(ngModel)]="verifyNumber" placeholder="FA 2026/1" class="mt-1 block border border-gray-300 rounded px-2 py-1.5 text-sm w-40"></label>
        <label class="block"><span class="text-xs text-gray-600">Código de controlo</span>
          <input [(ngModel)]="verifyCode" placeholder="XXXX-XXXX-XXXX" class="mt-1 block border border-gray-300 rounded px-2 py-1.5 text-sm w-44 font-mono"></label>
        <button (click)="doVerify()" class="px-4 py-2 text-xs font-bold rounded bg-slate-700 text-white">Verificar</button>
      </div>
      <div *ngIf="verifyResult" class="mt-3 rounded border p-3 text-xs"
           [ngClass]="verifyResult.valid ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'">
        <ng-container *ngIf="verifyResult.valid; else invalid">
          <b>Documento autêntico.</b> {{ verifyResult.documento.tipo }} {{ verifyResult.documento.numero }} de {{ verifyResult.documento.data }} ·
          {{ verifyResult.documento.entidade }} · Total {{ verifyResult.documento.total }} MT · Estado: {{ verifyResult.documento.estado }}.
          Confirme que estes valores coincidem com os do papel.
        </ng-container>
        <ng-template #invalid><b>Não confirmado.</b> {{ verifyResult.message }}</ng-template>
      </div>
    </div>

    <!-- Registo de impressões -->
    <div class="bg-white border border-gray-200 rounded shadow-sm">
      <button (click)="toggleLogs()" class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-800">
        Registo de impressões <span class="text-xs text-gray-500">{{ showLogs ? 'ocultar' : 'mostrar' }}</span>
      </button>
      <div *ngIf="showLogs" class="overflow-x-auto border-t border-gray-200">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 text-gray-600"><tr><th class="text-left px-2 py-1">Data</th><th class="text-left px-2 py-1">Documento</th><th class="text-left px-2 py-1">Utilizador</th><th class="text-left px-2 py-1">Modelo</th><th class="text-left px-2 py-1">Resultado</th></tr></thead>
          <tbody>
            <tr *ngFor="let l of logs" class="border-t border-gray-100">
              <td class="px-2 py-1 whitespace-nowrap">{{ l.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="px-2 py-1">{{ l.documentNumber }}</td>
              <td class="px-2 py-1">{{ l.userName || '—' }}</td>
              <td class="px-2 py-1">v{{ l.version }}</td>
              <td class="px-2 py-1" [class.text-red-700]="l.result !== 'OK'">{{ l.result === 'OK' ? 'Impresso · ' + l.controlCode : 'Bloqueado: ' + l.reason }}</td>
            </tr>
            <tr *ngIf="!logs.length"><td colspan="5" class="px-2 py-2 text-gray-400">Sem impressões registadas.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `,
})
export class PrintTemplatesComponent implements OnInit {
  @ViewChild('htmlBox') htmlBox?: ElementRef<HTMLTextAreaElement>;

  modules = MODULE_TABS;
  module: PrintModule = 'SALES';
  templates: PrintTemplate[] = [];
  fields: PrintField[] = [];
  editing: PrintTemplate | null = null;
  versions: any[] = [];
  errors: string[] = [];
  okMessage = '';
  previewHtml = '';
  /** HTML gerado pelo servidor (valores escapados) mostrado numa moldura sem scripts (sandbox vazio). */
  previewSafe: SafeHtml = '';
  busy = false;
  verifyNumber = '';
  verifyCode = '';
  verifyResult: any = null;
  showLogs = false;
  logs: any[] = [];

  constructor(private svc: PrintTemplatesService, private toaster: ToasterService, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) { }

  async ngOnInit() {
    await this.reload();
    await this.loadFields();
  }

  get moduleTemplates() { return this.templates.filter(t => t.module === this.module); }
  get currentDocTypes() { return MODULE_TABS.find(m => m.id === this.module)!.docTypes; }
  get blocks() {
    const list = [{ code: '{{#linhas}}\n\n{{/linhas}}', label: 'Bloco das linhas (repete por linha)' }];
    if (this.module === 'SALES' || this.module === 'PURCHASES') list.push({ code: '{{#resumoIva}}\n\n{{/resumoIva}}', label: 'Bloco do resumo de IVA' });
    return list;
  }
  /** Texto do campo como se escreve no modelo, ex.: {{documento.numero}} */
  ph(key: string) { return String.fromCharCode(123, 123) + key + String.fromCharCode(125, 125); }
  isRequired(f: PrintField) { return !!f.requiredIn?.includes(this.module); }

  private async reload() {
    try { this.templates = await this.svc.list(); } catch (e: any) { this.toaster.showError('Modelos de impressão', e?.error?.message || 'Não foi possível carregar os modelos.'); }
    this.cdr.detectChanges();
  }
  private async loadFields() {
    try { this.fields = await this.svc.fields(this.module); } catch { this.fields = []; }
    this.cdr.detectChanges();
  }

  async selectModule(m: PrintModule) {
    this.module = m; this.editing = null; this.errors = []; this.previewHtml = ''; this.okMessage = '';
    await this.loadFields();
  }

  async newTemplate() {
    const s = await this.svc.starter(this.module);
    this.editing = { module: this.module, name: 'Novo modelo', docTypes: [this.currentDocTypes[0].code], isDefault: true, html: s.html, css: s.css };
    this.versions = []; this.errors = []; this.previewHtml = ''; this.okMessage = '';
    this.cdr.detectChanges();
  }

  async loadStarter() {
    if (!this.editing) return;
    if (!confirm('Substituir o HTML e o CSS pelo modelo base?')) return;
    const s = await this.svc.starter(this.module);
    this.editing.html = s.html; this.editing.css = s.css;
    this.cdr.detectChanges();
  }

  async open(t: PrintTemplate) {
    this.editing = { ...t, docTypes: [...t.docTypes] };
    this.errors = []; this.previewHtml = ''; this.okMessage = '';
    try { this.versions = await this.svc.versions(t.id!); } catch { this.versions = []; }
    this.cdr.detectChanges();
  }

  toggleDocType(code: string) {
    if (!this.editing) return;
    const i = this.editing.docTypes.indexOf(code);
    if (i >= 0) this.editing.docTypes.splice(i, 1); else this.editing.docTypes.push(code);
  }

  insert(text: string) {
    if (!this.editing) return;
    const box = this.htmlBox?.nativeElement;
    const pos = box ? box.selectionStart : this.editing.html.length;
    const end = box ? box.selectionEnd : pos;
    this.editing.html = this.editing.html.slice(0, pos) + text + this.editing.html.slice(end);
    this.cdr.detectChanges();
    setTimeout(() => { if (box) { box.focus(); box.selectionStart = box.selectionEnd = pos + text.length; } });
  }

  insertImage(event: any) {
    const file: File = event.target.files?.[0];
    event.target.value = '';
    if (!file || !this.editing) return;
    if (file.size > 300 * 1024) { this.toaster.showWarning('Imagem', 'A imagem deve ter no máximo 300 KB.'); return; }
    const reader = new FileReader();
    reader.onload = (e: any) => this.insert(`<img data-zona="fundo" src="${e.target.result}" style="width:100%" alt="">`);
    reader.readAsDataURL(file);
  }

  async check() {
    if (!this.editing) return;
    const r = await this.svc.validate(this.editing);
    this.errors = r.errors; this.okMessage = r.errors.length ? '' : 'O modelo cumpre todas as regras.';
    this.cdr.detectChanges();
  }

  async doPreview() {
    if (!this.editing) return;
    this.busy = true;
    try {
      const r = await this.svc.preview(this.editing);
      this.previewHtml = r.html; this.previewSafe = this.sanitizer.bypassSecurityTrustHtml(r.html);
      this.errors = r.errors; this.okMessage = '';
    } catch (e: any) { this.toaster.showError('Pré-visualização', e?.error?.message || 'Falhou.'); }
    this.busy = false; this.cdr.detectChanges();
  }

  async save() {
    if (!this.editing) return;
    this.busy = true; this.errors = []; this.okMessage = '';
    try {
      const saved = await this.svc.save(this.editing);
      this.toaster.showSuccess('Modelo gravado', `${saved.name} (versão ${saved.version}).`);
      await this.reload();
      await this.open(saved);
      this.okMessage = `Gravado como versão ${saved.version}.`;
    } catch (e: any) {
      this.errors = e?.error?.errors || [e?.error?.message || 'Não foi possível gravar o modelo.'];
    }
    this.busy = false; this.cdr.detectChanges();
  }

  async remove() {
    if (!this.editing?.id || !confirm(`Eliminar o modelo «${this.editing.name}»? Os documentos passam a usar o formato normal.`)) return;
    await this.svc.remove(this.editing.id);
    this.editing = null;
    await this.reload();
  }

  async restore(version: number) {
    if (!this.editing?.id || !confirm(`Restaurar a versão ${version}? É gravada como uma nova versão.`)) return;
    try {
      const t = await this.svc.restore(this.editing.id, version);
      await this.reload(); await this.open(t);
      this.toaster.showSuccess('Modelo', `Versão ${version} restaurada como versão ${t.version}.`);
    } catch (e: any) { this.errors = e?.error?.errors || [e?.error?.message || 'Não foi possível restaurar.']; this.cdr.detectChanges(); }
  }

  exportFile() {
    if (!this.editing) return;
    const { module, name, docTypes, isDefault, html, css } = this.editing;
    const blob = new Blob([JSON.stringify({ formato: 'inverno-modelo-impressao', versao: 1, module, name, docTypes, isDefault, html, css }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `modelo-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  importFile(event: any) {
    const file: File = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const j = JSON.parse(String(reader.result));
        if (j.formato !== 'inverno-modelo-impressao' || !j.html) throw new Error('formato');
        if (j.module && j.module !== this.module) await this.selectModule(j.module);
        // Importado entra como modelo novo e só fica ativo depois de gravado (e validado)
        this.editing = { module: this.module, name: String(j.name || 'Modelo importado'), docTypes: Array.isArray(j.docTypes) ? j.docTypes : [], isDefault: !!j.isDefault, html: String(j.html), css: String(j.css || '') };
        this.versions = []; this.previewHtml = '';
        await this.check();
        this.toaster.showSuccess('Importar', 'Modelo carregado. Reveja e clique em Gravar.');
      } catch {
        this.toaster.showError('Importar', 'O ficheiro não é um modelo de impressão do Inverno ERP.');
      }
      this.cdr.detectChanges();
    };
    reader.readAsText(file);
  }

  async doVerify() {
    try { this.verifyResult = await this.svc.verify(this.verifyNumber.trim(), this.verifyCode.trim()); }
    catch (e: any) { this.verifyResult = { valid: false, message: e?.error?.message || 'Não foi possível verificar.' }; }
    this.cdr.detectChanges();
  }

  async toggleLogs() {
    this.showLogs = !this.showLogs;
    if (this.showLogs) { try { this.logs = await this.svc.logs(); } catch { this.logs = []; } }
    this.cdr.detectChanges();
  }
}
