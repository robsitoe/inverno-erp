import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../shared/config';
import { DataService } from '../../services/data.service';

/**
 * Contrato de Licença de Utilização (EULA) — aceite obrigatório no primeiro acesso.
 * O aceite fica registado no servidor (versão, data/hora, utilizador, nome do signatário, IP).
 * NOTA: texto-base; deve ser revisto por um advogado antes da comercialização.
 */
@Component({
  selector: 'app-eula-gate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div *ngIf="show" class="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-bold text-gray-800">Contrato de Licença de Utilização — Inverno ERP</h2>
        <p class="text-xs text-gray-500">Versão {{ version }} · Leia com atenção antes de continuar</p>
      </div>
      <div class="px-6 py-4 overflow-y-auto text-sm text-gray-700 leading-relaxed space-y-3">
        <p><b>1. Objeto.</b> O Inverno ERP (o "Programa") é um programa de computador protegido por direitos de autor. Este contrato concede ao Licenciado uma licença <b>limitada, não exclusiva, intransmissível e revogável</b> para usar o Programa na sua própria empresa, nos termos da licença adquirida (empresa, número de utilizadores, módulos e prazo).</p>
        <p><b>2. Propriedade.</b> O Programa, o seu código, bases de dados de estrutura, marcas e documentação pertencem ao Titular dos direitos. Nada neste contrato transfere a propriedade ou o código-fonte ao Licenciado.</p>
        <p><b>3. Proibições.</b> É proibido, sem autorização escrita do Titular: (a) copiar, instalar ou usar o Programa fora da licença adquirida; (b) emprestar, vender, sublicenciar ou disponibilizar o Programa a terceiros; (c) descompilar, desmontar, fazer engenharia inversa ou tentar obter o código-fonte; (d) remover, alterar, contornar ou desativar a licença, os seus mecanismos de verificação, o período de avaliação ou os registos de utilização; (e) emitir, falsificar ou partilhar chaves de licença.</p>
        <p><b>4. Verificação e registos.</b> O Licenciado aceita que o Programa verifique periodicamente a validade da licença e que sejam guardados registos do aceite deste contrato e da ativação (data, hora, identificador da instalação e endereço IP), que poderão ser usados como prova em caso de utilização não autorizada.</p>
        <p><b>5. Dados do Licenciado.</b> Os dados inseridos no Programa pertencem ao Licenciado, que é responsável por manter cópias de segurança. O Titular não acede aos dados do Licenciado sem pedido ou autorização deste.</p>
        <p><b>6. Prazo e termo.</b> A licença vigora pelo prazo adquirido. O Titular pode revogá-la, sem reembolso, em caso de violação deste contrato. Terminada a licença, o Programa passa a modo restrito e o Licenciado mantém o direito de exportar os seus dados.</p>
        <p><b>7. Responsabilidade.</b> O Programa é fornecido "como está". O Titular não responde por lucros cessantes ou danos indiretos, e a responsabilidade total limita-se ao valor pago pelo Licenciado nos últimos 12 meses. A conformidade fiscal e contabilística da empresa permanece responsabilidade do Licenciado e do seu contabilista.</p>
        <p><b>8. Violação e consequências.</b> A utilização, cópia ou distribuição do Programa sem licença, ou o contorno dos seus mecanismos de proteção, constitui violação de direitos de autor e pode dar lugar a responsabilidade civil (indemnização e cessação imediata do uso) e criminal, nos termos da lei moçambicana aplicável.</p>
        <p><b>9. Lei e foro.</b> Este contrato rege-se pela lei da República de Moçambique. Para qualquer litígio é competente o foro da cidade de Maputo.</p>
      </div>
      <div class="px-6 py-4 border-t border-gray-200 space-y-3 bg-gray-50 rounded-b-xl">
        <label class="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" [(ngModel)]="agreed" class="mt-1">
          <span>Li e aceito o Contrato de Licença, em nome da empresa Licenciada.</span>
        </label>
        <input type="text" [(ngModel)]="signer" placeholder="Nome completo de quem aceita"
               class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
        <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>
        <button (click)="accept()" [disabled]="!agreed || signer.trim().length < 3 || busy"
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-bold">
          {{ busy ? 'A REGISTAR...' : 'ACEITAR E CONTINUAR' }}
        </button>
      </div>
    </div>
  </div>
  `,
})
export class EulaGateComponent implements OnInit {
  show = false;
  agreed = false;
  signer = '';
  error = '';
  busy = false;
  version = '1.0';
  private api = `${environment.apiUrl}/licenses`;

  constructor(private http: HttpClient, private data: DataService) { }

  ngOnInit() {
    if (this.data.isLocalBrowser()) return; // modo local/offline do browser: sem servidor
    this.http.get<{ accepted: boolean; version: string }>(`${this.api}/eula`).subscribe({
      next: r => { this.version = r.version; this.show = !r.accepted; },
      error: () => { /* servidor indisponível: não bloqueia */ },
    });
  }

  accept() {
    this.busy = true; this.error = '';
    this.http.post(`${this.api}/eula/accept`, { signerName: this.signer.trim() }).subscribe({
      next: () => { this.busy = false; this.show = false; },
      error: e => { this.busy = false; this.error = e?.error?.message || 'Não foi possível registar o aceite. Tente de novo.'; },
    });
  }
}
