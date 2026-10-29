import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment, VENDOR_CONTACT, PAYMENT_INFO } from '../../shared/config';
import { DataService } from '../../services/data.service';
import { LicenseService } from '../../services/license.service';

/**
 * Assistente de configuração inicial — aparece ao administrador enquanto não existir nenhuma empresa.
 * Passos: boas-vindas, palavra-passe do admin, empresa, exercício e séries, licença, resumo.
 * A empresa é gravada no fim do passo "Exercício e séries"; o servidor cria então a base de dados
 * da empresa com o exercício, a série, os tipos de documento, os meios de pagamento e as taxas de IVA.
 */
@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div *ngIf="show" class="fixed inset-0 z-[9990] bg-slate-900/70 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl min-h-[min(540px,94vh)] max-h-[94vh] flex overflow-hidden">

      <!-- Passos -->
      <aside class="hidden md:flex w-60 shrink-0 flex-col bg-gradient-to-b from-blue-700 to-blue-900 text-white p-6">
        <div class="text-lg font-bold">Inverno ERP</div>
        <div class="text-[11px] uppercase tracking-wider text-blue-200 mb-8">Configuração inicial</div>
        <ol class="space-y-4">
          <li *ngFor="let s of steps; let i = index" class="flex items-center gap-3 text-sm"
              [class.opacity-50]="i > step">
            <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border"
                  [ngClass]="i < step ? 'bg-white text-blue-700 border-white' : (i === step ? 'border-white bg-blue-500' : 'border-blue-300')">
              {{ i < step ? '✓' : i + 1 }}
            </span>
            <span [class.font-semibold]="i === step">{{ s }}</span>
          </li>
        </ol>
        <div class="mt-auto pt-6 shrink-0 text-[11px] text-blue-200 leading-relaxed">
          Precisa de ajuda?<br>
          <span *ngIf="vendor.phone">{{ vendor.phone }}<br></span>
          <span *ngIf="vendor.email">{{ vendor.email }}</span>
        </div>
      </aside>

      <section class="flex-1 flex flex-col min-w-0">
        <div class="px-8 pt-6 pb-3 border-b border-gray-100">
          <div class="text-[11px] uppercase tracking-wider text-blue-600 font-semibold">Passo {{ step + 1 }} de {{ steps.length }}</div>
          <h2 class="text-xl font-bold text-gray-800">{{ titles[step] }}</h2>
        </div>

        <div class="flex-1 overflow-y-auto px-8 py-6 text-sm text-gray-700">

          <!-- 0. Boas-vindas -->
          <div *ngIf="step === 0" class="space-y-4">
            <p>Bem-vindo ao Inverno ERP. Este assistente prepara o sistema para começar a trabalhar, em poucos minutos:</p>
            <ul class="space-y-2">
              <li class="flex gap-2"><span class="text-blue-600 font-bold">1.</span> Definir a palavra-passe definitiva do administrador.</li>
              <li class="flex gap-2"><span class="text-blue-600 font-bold">2.</span> Criar a empresa com os dados fiscais e de contacto.</li>
              <li class="flex gap-2"><span class="text-blue-600 font-bold">3.</span> Abrir o exercício e criar as séries de documentos.</li>
              <li class="flex gap-2"><span class="text-blue-600 font-bold">4.</span> Escolher a licença: avaliação gratuita, ativação ou compra.</li>
            </ul>
            <div class="rounded-lg bg-blue-50 border border-blue-100 p-3 text-blue-800 text-xs">
              Tenha à mão o NIF e os dados da empresa. Tudo pode ser alterado depois em Administração.
            </div>
          </div>

          <!-- 1. Palavra-passe -->
          <div *ngIf="step === 1" class="space-y-4 max-w-md">
            <p>A palavra-passe gerada na instalação é temporária. Escolha a palavra-passe definitiva do utilizador <b>admin</b>.</p>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">Nova palavra-passe</span>
              <input type="password" [(ngModel)]="pass1" autocomplete="new-password" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">Repetir a palavra-passe</span>
              <input type="password" [(ngModel)]="pass2" autocomplete="new-password" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <ul class="text-xs space-y-1">
              <li [class.text-green-600]="pass1.length >= 8" [class.text-gray-500]="pass1.length < 8">{{ pass1.length >= 8 ? '✓' : '•' }} Pelo menos 8 caracteres</li>
              <li [class.text-green-600]="hasLetterAndDigit()" [class.text-gray-500]="!hasLetterAndDigit()">{{ hasLetterAndDigit() ? '✓' : '•' }} Letras e números</li>
              <li [class.text-green-600]="pass1 && pass1 === pass2" [class.text-gray-500]="!(pass1 && pass1 === pass2)">{{ pass1 && pass1 === pass2 ? '✓' : '•' }} As duas são iguais</li>
            </ul>
          </div>

          <!-- 2. Empresa -->
          <div *ngIf="step === 2" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="block md:col-span-2">
              <span class="text-xs font-semibold text-gray-600">Nome da empresa *</span>
              <input [(ngModel)]="company.name" placeholder="Ex.: Minha Empresa, Lda." class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">NIF / NUIT *</span>
              <input [(ngModel)]="company.nif" maxlength="20" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">Telefone</span>
              <input [(ngModel)]="company.phone" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block md:col-span-2">
              <span class="text-xs font-semibold text-gray-600">Morada</span>
              <input [(ngModel)]="company.address" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">Cidade</span>
              <input [(ngModel)]="company.location" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">País</span>
              <input [(ngModel)]="company.country" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">Email</span>
              <input type="email" [(ngModel)]="company.email" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">Website</span>
              <input [(ngModel)]="company.website" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">Moeda</span>
              <select [(ngModel)]="company.currency" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                <option value="MT">Metical (MT)</option>
                <option value="USD">Dólar americano (USD)</option>
                <option value="ZAR">Rand (ZAR)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-gray-600">Logótipo (opcional)</span>
              <input type="file" accept="image/*" (change)="onLogo($event)" class="mt-1 w-full text-xs">
            </label>
            <img *ngIf="company.logoUrl" [src]="company.logoUrl" alt="Logótipo" class="h-14 object-contain md:col-span-2">
          </div>

          <!-- 3. Exercício e séries -->
          <div *ngIf="step === 3" class="space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label class="block">
                <span class="text-xs font-semibold text-gray-600">Ano do exercício</span>
                <input type="number" [(ngModel)]="year" (ngModelChange)="onYearChange()" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              </label>
              <label class="block">
                <span class="text-xs font-semibold text-gray-600">Início</span>
                <input type="date" [(ngModel)]="startDate" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              </label>
              <label class="block">
                <span class="text-xs font-semibold text-gray-600">Fim</span>
                <input type="date" [(ngModel)]="endDate" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              </label>
              <label class="block">
                <span class="text-xs font-semibold text-gray-600">Código da série</span>
                <input [(ngModel)]="seriesCode" maxlength="10" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              </label>
              <label class="block md:col-span-2">
                <span class="text-xs font-semibold text-gray-600">Descrição da série</span>
                <input [(ngModel)]="seriesDesc" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
              </label>
              <label class="block md:col-span-3">
                <span class="text-xs font-semibold text-gray-600">Plano de contas</span>
                <select [(ngModel)]="company.chartOfAccounts" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  <option value="PGC-NIR">PGC-NIR — Plano Geral de Contabilidade (Moçambique)</option>
                </select>
              </label>
            </div>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div class="text-xs font-semibold text-gray-600 mb-2">Ao continuar, o sistema cria automaticamente:</div>
              <ul class="text-xs text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-1">
                <li>✓ Exercício {{ year }} aberto ({{ startDate | date:'dd/MM/yyyy' }} a {{ endDate | date:'dd/MM/yyyy' }})</li>
                <li>✓ Série {{ seriesCode }} para todos os documentos</li>
                <li>✓ Tipos de documento de vendas, compras, tesouraria e stock</li>
                <li>✓ Meios de pagamento e taxas de IVA</li>
              </ul>
            </div>
          </div>

          <!-- 4. Licença -->
          <div *ngIf="step === 4" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button *ngFor="let o of licenseOptions" (click)="licenseChoice = o.id"
                      class="text-left rounded-xl border-2 p-4 transition-colors"
                      [ngClass]="licenseChoice === o.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'">
                <div class="font-semibold text-gray-800">{{ o.title }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ o.text }}</div>
              </button>
            </div>

            <div *ngIf="licenseChoice === 'TRIAL'" class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900 text-xs leading-relaxed">
              Tem <b>{{ trialDays }} dias</b> de avaliação com os módulos principais. No fim do período, o sistema
              exige uma chave de licença válida para continuar. Pode ativar ou comprar a qualquer momento em
              Administração &gt; Licença.
            </div>

            <div *ngIf="licenseChoice === 'BUY'" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button *ngFor="let p of plans" (click)="selectedPlan = p"
                        class="text-left rounded-xl border p-3 transition-colors"
                        [ngClass]="selectedPlan?.id === p.id ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'">
                  <div class="text-xs font-bold text-gray-800">{{ p.name }}</div>
                  <div class="text-lg font-bold text-blue-700">{{ p.price | number:'1.0-0' }} MT</div>
                  <div class="text-[11px] text-gray-500">{{ p.billing }}</div>
                  <ul class="mt-2 text-[11px] text-gray-600 space-y-0.5">
                    <li *ngFor="let b of p.benefitSummary">• {{ b }}</li>
                  </ul>
                </button>
              </div>
              <div *ngIf="selectedPlan" class="rounded-lg border border-gray-200 p-4 space-y-3">
                <div class="text-xs font-semibold text-gray-700">1. Pague {{ selectedPlan.price | number:'1.0-0' }} MT por um destes meios</div>
                <div *ngIf="hasPaymentInfo(); else noPay" class="text-xs text-gray-700 space-y-1">
                  <div *ngIf="pay.holder">Titular: <b>{{ pay.holder }}</b></div>
                  <div *ngIf="pay.mpesa">M-Pesa: <b>{{ pay.mpesa }}</b></div>
                  <div *ngIf="pay.emola">e-Mola: <b>{{ pay.emola }}</b></div>
                  <div *ngIf="pay.bank">Transferência: <b>{{ pay.bank }}</b></div>
                </div>
                <ng-template #noPay>
                  <div class="text-xs text-gray-600">Contacte o fornecedor para receber os dados de pagamento.</div>
                </ng-template>
                <div class="text-xs font-semibold text-gray-700">2. Envie o comprovativo com o pedido de licença</div>
                <div class="flex items-center gap-2">
                  <code class="flex-1 text-xs font-mono bg-gray-100 rounded px-2 py-1.5 break-all">ID da instalação: {{ installationId || 'a obter...' }}</code>
                </div>
                <div class="flex flex-wrap gap-2">
                  <a *ngIf="vendor.phone" [href]="whatsappLink()" target="_blank" rel="noopener" class="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold">Enviar por WhatsApp</a>
                  <a *ngIf="vendor.email" [href]="mailLink()" class="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold">Enviar por email</a>
                  <button (click)="copyRequest()" class="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold">{{ copied ? 'Copiado ✓' : 'Copiar pedido' }}</button>
                </div>
                <div class="text-xs font-semibold text-gray-700">3. Cole aqui a chave que recebeu</div>
              </div>
            </div>

            <div *ngIf="licenseChoice === 'KEY' || (licenseChoice === 'BUY' && selectedPlan)" class="space-y-2">
              <div *ngIf="licenseChoice === 'KEY'" class="text-xs text-gray-600">
                Cole a chave de licença enviada pelo fornecedor. ID desta instalação:
                <code class="font-mono">{{ installationId || 'a obter...' }}</code>
              </div>
              <textarea [(ngModel)]="licenseKey" rows="3" placeholder="Chave de licença" class="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs"></textarea>
              <div class="flex items-center gap-3">
                <button (click)="activate()" [disabled]="!licenseKey.trim() || busy" class="px-4 py-2 rounded-lg bg-blue-600 disabled:bg-gray-300 text-white text-xs font-bold">
                  {{ busy ? 'A ATIVAR...' : 'ATIVAR CHAVE' }}
                </button>
                <span *ngIf="activated" class="text-xs text-green-700 font-semibold">✓ Licença ativada</span>
              </div>
              <div *ngIf="licenseChoice === 'BUY'" class="text-[11px] text-gray-500">
                Ainda não recebeu a chave? Pode concluir já em avaliação e ativá-la depois em Administração &gt; Licença.
              </div>
            </div>
          </div>

          <!-- 5. Resumo -->
          <div *ngIf="step === 5" class="space-y-4">
            <p>O sistema está pronto a usar.</p>
            <div class="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
              <div class="flex justify-between px-4 py-2"><span class="text-gray-500">Empresa</span><b>{{ savedCompany?.name }} ({{ savedCompany?.id }})</b></div>
              <div class="flex justify-between px-4 py-2"><span class="text-gray-500">NIF</span><span>{{ savedCompany?.nif }}</span></div>
              <div class="flex justify-between px-4 py-2"><span class="text-gray-500">Exercício</span><span>{{ year }} · série {{ seriesCode }}</span></div>
              <div class="flex justify-between px-4 py-2"><span class="text-gray-500">Licença</span>
                <span>{{ activated ? 'Ativada' : 'Avaliação (' + trialDays + ' dias)' }}</span></div>
            </div>
            <div class="rounded-lg bg-blue-50 border border-blue-100 p-3 text-blue-800 text-xs">
              Próximos passos sugeridos: criar os utilizadores, registar clientes, fornecedores e artigos, e configurar as cópias de segurança em Administração &gt; Planos Agendados.
            </div>
          </div>

          <div *ngIf="error" class="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs p-3">{{ error }}</div>
        </div>

        <div class="px-8 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button *ngIf="step > 0 && step !== 4 && step !== 5" (click)="back()" [disabled]="busy" class="px-4 py-2 rounded-lg border border-gray-300 text-sm">Anterior</button>
          <span *ngIf="!(step > 0 && step !== 4 && step !== 5)"></span>
          <button (click)="next()" [disabled]="busy || !canContinue()" class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-bold">
            {{ busy ? 'A gravar...' : nextLabel() }}
          </button>
        </div>
      </section>
    </div>
  </div>
  `,
})
export class SetupWizardComponent implements OnInit {
  /** Empresa criada, para o app entrar logo no ERP com ela. */
  @Output() finished = new EventEmitter<any>();

  show = false;
  step = 0;
  busy = false;
  error = '';
  steps = ['Boas-vindas', 'Segurança', 'Empresa', 'Exercício e séries', 'Licença', 'Concluir'];
  titles = ['Vamos configurar o seu sistema', 'Palavra-passe do administrador', 'Dados da empresa',
    'Abertura do exercício e séries', 'Licença de utilização', 'Configuração concluída'];

  pass1 = '';
  pass2 = '';
  passwordDone = false;

  company: any = {
    name: '', nif: '', address: '', email: '', phone: '', website: '', logoUrl: '',
    country: 'Moçambique', location: 'Maputo', currency: 'MT', chartOfAccounts: 'PGC-NIR',
    type: 'STANDARD', category: 'Geral', documentNameFormat: '{description} Nº.{number} - {series}',
  };
  year = new Date().getFullYear();
  startDate = `${this.year}-01-01`;
  endDate = `${this.year}-12-31`;
  seriesCode = String(this.year);
  seriesDesc = `Série ${this.year}`;
  savedCompany: any = null;

  licenseOptions = [
    { id: 'TRIAL', title: 'Avaliação gratuita', text: 'Começar já e decidir depois.' },
    { id: 'KEY', title: 'Já tenho uma chave', text: 'Ativar a licença que recebi.' },
    { id: 'BUY', title: 'Comprar agora', text: 'Escolher o plano e pagar.' },
  ];
  licenseChoice: 'TRIAL' | 'KEY' | 'BUY' = 'TRIAL';
  plans: any[] = [];
  selectedPlan: any = null;
  licenseKey = '';
  activated = false;
  installationId = '';
  copied = false;
  vendor = VENDOR_CONTACT;
  pay = PAYMENT_INFO;

  private api = environment.apiUrl;

  constructor(private http: HttpClient, private data: DataService, private licenseService: LicenseService) { }

  ngOnInit() {
    if (this.data.isLocalBrowser()) return; // modo local do browser: sem servidor
    let user: any = null;
    try { user = JSON.parse(localStorage.getItem('erp_current_user') || 'null'); } catch { }
    if (!(user?.isAdmin || user?.isSuperAdmin)) return;
    this.http.get<any[]>(`${this.api}/companies`).subscribe({
      next: list => { this.show = Array.isArray(list) && list.length === 0; if (this.show) this.loadLicenseData(); },
      error: () => { /* servidor indisponível: não bloqueia */ },
    });
  }

  private loadLicenseData() {
    this.http.get<any[]>(`${this.api}/licenses/plans`).subscribe({
      next: p => this.plans = (p || []).filter(x => x.id !== 'DEMO' && x.price > 0),
      error: () => { },
    });
    this.http.get<{ installationId: string | null }>(`${this.api}/licenses/installation-id`).subscribe({
      next: r => this.installationId = r.installationId || '',
      error: () => { },
    });
  }

  /** Dias de avaliação que restam (a avaliação conta desde a instalação). */
  get trialDays(): number {
    const l = this.licenseService.current;
    return l?.plan === 'DEMO' && l.daysRemaining > 0 ? l.daysRemaining : 30;
  }

  hasLetterAndDigit() { return /[A-Za-z]/.test(this.pass1) && /\d/.test(this.pass1); }
  hasPaymentInfo() { return !!(this.pay.mpesa || this.pay.emola || this.pay.bank); }

  onYearChange() {
    const y = Number(this.year);
    if (!y || y < 2000 || y > 2100) return;
    this.startDate = `${y}-01-01`;
    this.endDate = `${y}-12-31`;
    this.seriesCode = String(y);
    this.seriesDesc = `Série ${y}`;
  }

  onLogo(event: any) {
    const file: File = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { this.error = 'O logótipo deve ter no máximo 500 KB.'; return; }
    const reader = new FileReader();
    reader.onload = (e: any) => { this.company.logoUrl = e.target.result; this.error = ''; };
    reader.readAsDataURL(file);
  }

  canContinue(): boolean {
    switch (this.step) {
      case 1: return this.passwordDone || (this.pass1.length >= 8 && this.hasLetterAndDigit() && this.pass1 === this.pass2);
      case 2: return this.company.name.trim().length >= 2 && this.company.nif.trim().length >= 5;
      case 3: return !!this.year && !!this.startDate && !!this.endDate && this.startDate < this.endDate && !!this.seriesCode.trim();
      default: return true;
    }
  }

  nextLabel(): string {
    if (this.step === 0) return 'Começar';
    if (this.step === 3) return 'Criar empresa';
    if (this.step === 4) return this.activated || this.licenseChoice === 'TRIAL' ? 'Continuar' : 'Continuar em avaliação';
    if (this.step === 5) return 'Entrar no sistema';
    return 'Seguinte';
  }

  back() { this.error = ''; if (this.step > 0) this.step--; }

  next() {
    this.error = '';
    if (this.step === 1 && !this.passwordDone) return this.savePassword();
    if (this.step === 3) return this.createCompany();
    if (this.step === 5) { this.show = false; this.finished.emit(this.savedCompany); return; }
    this.step++;
  }

  private savePassword() {
    let user: any = null;
    try { user = JSON.parse(localStorage.getItem('erp_current_user') || 'null'); } catch { }
    if (!user?.id) { this.error = 'Sessão inválida. Entre de novo no sistema.'; return; }
    this.busy = true;
    this.http.patch(`${this.api}/users/${user.id}`, { password: this.pass1 }).subscribe({
      next: () => { this.busy = false; this.passwordDone = true; this.pass1 = this.pass2 = ''; this.step++; },
      error: e => { this.busy = false; this.error = e?.error?.message || 'Não foi possível alterar a palavra-passe.'; },
    });
  }

  private createCompany() {
    this.busy = true;
    const payload = {
      ...this.company,
      name: this.company.name.trim(),
      nif: this.company.nif.trim(),
      currentYear: Number(this.year),
      seriesConfig: { code: this.seriesCode.trim(), description: this.seriesDesc.trim(), startDate: this.startDate, endDate: this.endDate },
    };
    this.http.post<any>(`${this.api}/company`, payload).subscribe({
      next: c => {
        this.busy = false; this.savedCompany = c;
        this.data.setActiveCompany(c);
        this.licenseService.refreshFromServer();
        this.step++;
      },
      error: e => { this.busy = false; this.error = e?.error?.message || 'Não foi possível criar a empresa.'; },
    });
  }

  activate() {
    this.busy = true; this.error = '';
    this.licenseService.activateLicense(this.licenseKey.trim()).subscribe({
      next: r => {
        this.busy = false;
        if (r?.valid === false) { this.error = r?.message || 'Chave inválida.'; return; }
        this.activated = true;
      },
      error: e => { this.busy = false; this.error = e?.error?.message || 'Chave inválida ou não pertence a esta instalação.'; },
    });
  }

  private requestText(): string {
    const nl = '\n';
    return `Pedido de licença Inverno ERP${nl}Empresa: ${this.savedCompany?.name || this.company.name}${nl}NIF: ${this.savedCompany?.nif || this.company.nif}`
      + `${nl}Plano: ${this.selectedPlan?.name || ''} (${this.selectedPlan?.price || ''} MT)${nl}ID da instalação: ${this.installationId}`;
  }
  whatsappLink(): string {
    const digits = (this.vendor.phone || '').replace(/\D/g, '');
    const intl = digits.length === 9 ? '258' + digits : digits;
    return 'https://wa.me/' + intl + '?text=' + encodeURIComponent(this.requestText());
  }
  mailLink(): string {
    return 'mailto:' + this.vendor.email + '?subject=' + encodeURIComponent('Pedido de licença Inverno ERP') + '&body=' + encodeURIComponent(this.requestText());
  }
  copyRequest() {
    try { navigator.clipboard.writeText(this.requestText()); this.copied = true; setTimeout(() => this.copied = false, 2000); } catch { }
  }
}
