import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../shared/config';
import { ToasterService } from './toaster.service';

export type PrintModule = 'SALES' | 'PURCHASES' | 'TREASURY' | 'STOCK';

export interface PrintTemplate {
  id?: string;
  module: PrintModule;
  name: string;
  docTypes: string[];
  isDefault: boolean;
  html: string;
  css: string;
  version?: number;
  updatedBy?: string | null;
  updatedAt?: string;
}

/** Janela de impressão: o que sai em automático e os modelos que servem para o tipo de documento. */
export interface PrintOptions {
  auto: { id: string; name: string; version: number } | null;
  /** O administrador deixa escolher na janela de impressão (senão, sai sempre o automático, sem lista). */
  choose: boolean;
  allowNormal: boolean;
  templates: { id: string; name: string; version: number; inUse: boolean; allDocs: boolean }[];
}

/** Regra da janela de impressão de um módulo. */
export interface PrintPrefs { module: PrintModule; mode: 'FIXED' | 'CHOOSE'; allowNormal: boolean; templateIds: string[]; }

export interface PrintField { key: string; label: string; fiscal: boolean; scope: 'doc' | 'linha' | 'iva'; requiredIn?: string[]; }

/** Resultado de uma tentativa de impressão com modelo. */
export type TemplatePrintResult = 'printed' | 'no-template' | 'blocked' | 'error';

/**
 * Modelos de impressão. A impressão com modelo é preparada e conferida no servidor (compara com a
 * base de dados); aqui só se mostra e imprime o resultado, numa moldura isolada.
 */
@Injectable({ providedIn: 'root' })
export class PrintTemplatesService {
  private api = `${environment.apiUrl}/print-templates`;

  constructor(private http: HttpClient, private toaster: ToasterService) { }

  list() { return firstValueFrom(this.http.get<PrintTemplate[]>(this.api)); }
  fields(module: PrintModule) { return firstValueFrom(this.http.get<PrintField[]>(`${this.api}/fields`, { params: { module } })); }
  starter(module: PrintModule) { return firstValueFrom(this.http.get<{ html: string; css: string }>(`${this.api}/starter`, { params: { module } })); }
  validate(t: Partial<PrintTemplate>) { return firstValueFrom(this.http.post<{ errors: string[] }>(`${this.api}/validate`, t)); }
  preview(t: Partial<PrintTemplate>) { return firstValueFrom(this.http.post<{ html: string; errors: string[] }>(`${this.api}/preview`, t)); }
  save(t: PrintTemplate) { return firstValueFrom(this.http.post<PrintTemplate>(this.api, t)); }
  remove(id: string) { return firstValueFrom(this.http.delete(`${this.api}/${id}`)); }
  versions(id: string) { return firstValueFrom(this.http.get<any[]>(`${this.api}/${id}/versions`)); }
  restore(id: string, version: number) { return firstValueFrom(this.http.post<PrintTemplate>(`${this.api}/${id}/restore/${version}`, {})); }
  logs() { return firstValueFrom(this.http.get<any[]>(`${this.api}/logs`)); }
  options(module: PrintModule, docType: string) { return firstValueFrom(this.http.get<PrintOptions>(`${this.api}/options`, { params: { module, docType: docType || '' } })); }
  printPrefs(module: PrintModule) { return firstValueFrom(this.http.get<PrintPrefs>(`${this.api}/print-prefs`, { params: { module } })); }
  savePrintPrefs(p: PrintPrefs) { return firstValueFrom(this.http.post<PrintPrefs>(`${this.api}/print-prefs`, p)); }
  /** Um clique: modelo usado no módulo (null = formato normal do sistema). */
  useTemplate(module: PrintModule, templateId: string | null) { return firstValueFrom(this.http.post<any>(`${this.api}/use`, { module, templateId })); }
  /** O módulo deixa de ter modelo em uso: imprime no formato normal do sistema. */
  useNormalFormat(module: PrintModule) { return firstValueFrom(this.http.post<{ ok: boolean; cleared: number }>(`${this.api}/use-normal`, { module })); }
  verify(numero: string, codigo: string) { return firstValueFrom(this.http.get<any>(`${this.api}/verify`, { params: { numero, codigo } })); }

  /**
   * Imprime o documento gravado com o modelo da empresa para o seu tipo.
   * 'no-template' => o chamador usa a impressão normal; 'blocked' => a impressão foi recusada (já avisado).
   * templateChoice: vazio = automático (modelo em uso, ou formato normal se não houver); 'NONE' = formato normal do sistema; id = esse modelo.
   */
  async printDocument(module: PrintModule, documentId: string | undefined | null, copia = '', templateChoice = ''): Promise<TemplatePrintResult> {
    if (!documentId || templateChoice === 'NONE') return 'no-template';
    try {
      const body: any = { module, documentId, copia };
      if (templateChoice) body.templateId = templateChoice;
      const r = await firstValueFrom(this.http.post<{ html: string; controlCode: string }>(`${this.api}/render`, body));
      this.printHtml(r.html);
      return 'printed';
    } catch (e: any) {
      const body = e?.error || {};
      if (e?.status === 404 && body.useDefault) return 'no-template';
      if (e?.status === 404 && /Cannot (GET|POST)/.test(body.message || '')) return 'no-template'; // servidor antigo
      if (e?.status === 422) {
        const detail = (body.errors || []).slice(0, 3).join(' ');
        this.toaster.showError('Impressão bloqueada', `${body.message || 'O documento não corresponde à base de dados.'} ${detail}`);
        return 'blocked';
      }
      // Documento ainda não está no servidor (ex.: modo local) ou servidor indisponível: formato normal do programa
      if (e?.status === 404 || e?.status === 0) return 'no-template';
      this.toaster.showError('Impressão', body.message || 'Não foi possível preparar a impressão com o modelo.');
      return 'error';
    }
  }

  /** Imprime HTML numa moldura isolada (sem scripts, sem acesso à aplicação). */
  printHtml(html: string) {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-modals allow-same-origin');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } finally {
        setTimeout(() => frame.remove(), 1000);
      }
    };
    frame.srcdoc = html;
  }
}
