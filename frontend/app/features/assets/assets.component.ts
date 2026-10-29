import { ChangeDetectorRef, Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../shared/config';
import { ToasterService } from '../../services/toaster.service';

const TITLES: Record<string, [string, string]> = {
  'asset-register': ['Ficha do Ativo', 'Registo dos equipamentos e ativos da empresa, com contas, custo e vida útil.'],
  'asset-maintenance': ['Manutenções', 'Histórico de manutenções preventivas e corretivas, com a próxima data prevista.'],
  'asset-depreciation': ['Depreciações', 'Quotas constantes mensais: pré-visualize e lance as depreciações de cada mês.'],
  'asset-insurance': ['Seguros', 'Apólices por ativo, com alerta de vencimento.'],
  'asset-transfers': ['Transferências', 'Mudança de local ou de centro de custo, com histórico.'],
  'asset-disposals': ['Abates', 'Alienação (venda) ou abate do ativo, com o apuramento do ganho ou perda.'],
  'asset-revaluations': ['Reavaliações', 'Aumento do valor do ativo por reavaliação (excedente de revalorização).'],
  'asset-exploration': ['Exploração', 'Mapa do imobilizado: valores brutos, amortizações e valor líquido.'],
};

/** Equipamentos e ativos fixos: as vistas do menu partilham a mesma lista de ativos. */
@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="h-full overflow-y-auto bg-[#F0F0F0] p-4">
    <div class="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 class="text-lg font-bold text-gray-800">{{ title[0] }}</h1>
        <p class="text-xs text-gray-500">{{ title[1] }}</p>
      </div>

      <!-- ================= FICHA ================= -->
      <div *ngIf="view === 'asset-register'" class="flex gap-4 items-start">
        <div class="w-72 shrink-0 bg-white border border-gray-200 rounded shadow-sm">
          <div class="p-2 border-b border-gray-200 flex gap-2">
            <input [(ngModel)]="search" placeholder="Procurar..." class="flex-1 border border-gray-300 rounded px-2 py-1 text-xs">
            <button (click)="newAsset()" class="px-2 py-1 text-xs font-bold rounded bg-blue-600 text-white">+ Novo</button>
          </div>
          <div class="max-h-[620px] overflow-y-auto divide-y divide-gray-100">
            <button *ngFor="let a of filtered" (click)="openAsset(a.id)" class="w-full text-left px-3 py-2 text-xs hover:bg-blue-50"
                    [class.bg-blue-50]="form?.id === a.id">
              <div class="font-semibold text-gray-800">{{ a.code }} <span *ngIf="a.status !== 'ACTIVE'" class="text-red-600">(abatido)</span></div>
              <div class="text-gray-500 truncate">{{ a.description }}</div>
              <div class="text-gray-400">VLC {{ a.netBookValue | number:'1.2-2' }}</div>
            </button>
            <div *ngIf="!filtered.length" class="p-3 text-xs text-gray-400">Sem ativos.</div>
          </div>
        </div>

        <div *ngIf="form" class="flex-1 min-w-0 space-y-4">
          <div class="bg-white border border-gray-200 rounded shadow-sm p-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <label class="block"><span class="font-semibold text-gray-600">Código *</span>
                <input [(ngModel)]="form.code" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
              <label class="block md:col-span-3"><span class="font-semibold text-gray-600">Descrição *</span>
                <input [(ngModel)]="form.description" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
              <label class="block"><span class="font-semibold text-gray-600">Tipo</span>
                <select [(ngModel)]="form.category" (ngModelChange)="onCategory()" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white" [disabled]="locked">
                  <option value="TANGIBLE">Tangível</option><option value="INTANGIBLE">Intangível</option></select></label>
              <label class="block"><span class="font-semibold text-gray-600">Data de aquisição *</span>
                <input type="date" [(ngModel)]="form.acquisitionDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" [disabled]="locked"></label>
              <label class="block"><span class="font-semibold text-gray-600">Início das depreciações</span>
                <input type="date" [(ngModel)]="form.startDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" [disabled]="locked"></label>
              <label class="block"><span class="font-semibold text-gray-600">N.º de série / matrícula</span>
                <input [(ngModel)]="form.serialNumber" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
              <label class="block"><span class="font-semibold text-gray-600">Custo de aquisição (MT) *</span>
                <input type="number" [(ngModel)]="form.cost" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right" [disabled]="locked"></label>
              <label class="block"><span class="font-semibold text-gray-600">Valor residual</span>
                <input type="number" [(ngModel)]="form.residualValue" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
              <label class="block"><span class="font-semibold text-gray-600">Vida útil (anos)</span>
                <input type="number" [ngModel]="lifeYears" (ngModelChange)="setYears($event)" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
              <label class="block"><span class="font-semibold text-gray-600">Vida útil (meses) *</span>
                <input type="number" [(ngModel)]="form.usefulLifeMonths" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
              <label class="block"><span class="font-semibold text-gray-600">Conta do ativo</span>
                <input [(ngModel)]="form.assetAccount" list="as-acc" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono" [disabled]="locked"></label>
              <label class="block"><span class="font-semibold text-gray-600">Amortização acumulada</span>
                <input [(ngModel)]="form.accDepAccount" list="as-acc" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono" [disabled]="locked"></label>
              <label class="block"><span class="font-semibold text-gray-600">Gasto de depreciação</span>
                <input [(ngModel)]="form.expenseAccount" list="as-acc" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono"></label>
              <label class="block"><span class="font-semibold text-gray-600">Local</span>
                <input [(ngModel)]="form.location" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" [disabled]="!!form.id"></label>
              <label class="block"><span class="font-semibold text-gray-600">Centro de custo</span>
                <input [(ngModel)]="form.costCenter" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" [disabled]="!!form.id"></label>
              <label class="block"><span class="font-semibold text-gray-600">Fornecedor</span>
                <input [(ngModel)]="form.supplier" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
              <label class="block"><span class="font-semibold text-gray-600">Documento de compra</span>
                <input [(ngModel)]="form.documentRef" placeholder="Ex.: FC 2026/12" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
              <label class="block md:col-span-4"><span class="font-semibold text-gray-600">Observações</span>
                <input [(ngModel)]="form.notes" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
            </div>
            <div *ngIf="!form.id" class="mt-3 flex flex-wrap items-center gap-3 text-xs border-t border-gray-100 pt-3">
              <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="form.postAcquisition"> Lançar a aquisição na contabilidade</label>
              <label *ngIf="form.postAcquisition" class="flex items-center gap-2">Contrapartida
                <input [(ngModel)]="form.counterpartAccount" list="as-acc" placeholder="Ex.: 4.6.x / 1.2.x" class="border border-gray-300 rounded px-2 py-1 font-mono w-32"></label>
              <span class="text-gray-400">Não marque se a compra já foi lançada pela fatura de compra.</span>
            </div>
            <div *ngIf="form.id" class="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs border-t border-gray-100 pt-3">
              <div><div class="text-gray-500">Valor bruto</div><b>{{ form.grossValue | number:'1.2-2' }}</b></div>
              <div><div class="text-gray-500">Amort. acumulada</div><b>{{ form.accumulatedDepreciation | number:'1.2-2' }}</b></div>
              <div><div class="text-gray-500">Valor líquido</div><b class="text-blue-700">{{ form.netBookValue | number:'1.2-2' }}</b></div>
              <div><div class="text-gray-500">Quota mensal</div><b>{{ form.monthlyDepreciation | number:'1.2-2' }}</b></div>
              <div><div class="text-gray-500">Estado</div><b [class.text-red-600]="form.status !== 'ACTIVE'">{{ form.status === 'ACTIVE' ? 'Em uso' : 'Abatido em ' + (form.disposedAt | date:'dd/MM/yyyy') }}</b></div>
            </div>
            <div *ngIf="errors.length" class="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700"><div *ngFor="let e of errors">{{ e }}</div></div>
            <div class="mt-3 flex gap-2">
              <button (click)="saveAsset()" [disabled]="busy || form.status === 'DISPOSED'" class="px-4 py-2 text-xs font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Gravar</button>
              <button *ngIf="form.id && !hasPostings" (click)="deleteAsset()" class="px-4 py-2 text-xs font-semibold rounded border border-red-300 text-red-700">Eliminar</button>
            </div>
          </div>
          <div *ngIf="form.id" class="bg-white border border-gray-200 rounded shadow-sm">
            <div class="px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-700">Histórico do ativo</div>
            <table class="w-full text-xs"><tbody>
              <tr *ngFor="let e of form.events" class="border-t border-gray-100">
                <td class="px-3 py-1.5 whitespace-nowrap">{{ e.date | date:'dd/MM/yyyy' }}</td>
                <td class="px-3 py-1.5"><span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{{ eventLabel(e.type) }}</span></td>
                <td class="px-3 py-1.5">{{ e.description }}</td>
                <td class="px-3 py-1.5 text-right">{{ +e.amount ? (e.amount | number:'1.2-2') : '' }}</td>
                <td class="px-3 py-1.5 text-gray-400">{{ e.journalEntryId ? 'lançado' : '' }}</td>
              </tr>
            </tbody></table>
          </div>
        </div>
        <div *ngIf="!form" class="flex-1 text-center text-sm text-gray-400 py-16">Escolha um ativo ou crie um novo.</div>
      </div>

      <!-- Seletor de ativo comum às operações -->
      <ng-template #assetPicker>
        <label class="block"><span class="text-xs font-semibold text-gray-600">Ativo</span>
          <select [(ngModel)]="opAssetId" (ngModelChange)="onOpAsset()" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white">
            <option value="">— escolha —</option>
            <option *ngFor="let a of activeAssets" [value]="a.id">{{ a.code }} — {{ a.description }}</option>
          </select></label>
      </ng-template>

      <!-- ================= MANUTENÇÕES ================= -->
      <ng-container *ngIf="view === 'asset-maintenance'">
        <div class="bg-white border border-gray-200 rounded shadow-sm p-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
          <div class="md:col-span-2"><ng-container *ngTemplateOutlet="assetPicker"></ng-container></div>
          <label class="block"><span class="font-semibold text-gray-600">Data</span><input type="date" [(ngModel)]="op.date" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Tipo</span><select [(ngModel)]="op.kind" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white"><option value="PREVENTIVE">Preventiva</option><option value="CORRECTIVE">Corretiva</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Custo</span><input type="number" [(ngModel)]="op.cost" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Próxima</span><input type="date" [(ngModel)]="op.nextDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-3"><span class="font-semibold text-gray-600">Descrição</span><input [(ngModel)]="op.description" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Fornecedor</span><input [(ngModel)]="op.supplier" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <button (click)="doOp('maintenance')" [disabled]="busy" class="px-4 py-2 font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Registar</button>
        </div>
        <p class="text-[11px] text-gray-500">O custo fica no histórico do ativo; o lançamento contabilístico faz-se pela fatura do fornecedor.</p>
        <ng-container *ngTemplateOutlet="eventsTable; context: { cols: ['kind','supplier','nextDate'] }"></ng-container>
      </ng-container>

      <!-- ================= DEPRECIAÇÕES ================= -->
      <ng-container *ngIf="view === 'asset-depreciation'">
        <div class="bg-white border border-gray-200 rounded shadow-sm p-4 flex flex-wrap gap-3 items-end text-xs">
          <label class="block"><span class="font-semibold text-gray-600">Mês</span><input type="month" [(ngModel)]="period" class="mt-1 border border-gray-300 rounded px-2 py-1.5"></label>
          <button (click)="previewDep()" [disabled]="busy" class="px-4 py-2 font-semibold rounded border border-gray-300">Pré-visualizar</button>
          <button (click)="postDep()" [disabled]="busy || !depPreview?.total" class="px-4 py-2 font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Lançar depreciações</button>
          <span *ngIf="depPreview" class="text-gray-600">Total do mês: <b>{{ depPreview.total | number:'1.2-2' }} MT</b></span>
        </div>
        <div *ngIf="depPreview" class="bg-white border border-gray-200 rounded shadow-sm overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600"><tr><th class="text-left px-3 py-2">Ativo</th><th class="text-left px-3 py-2">Gasto</th><th class="text-left px-3 py-2">Amort. acumulada</th><th class="text-right px-3 py-2">Quota</th><th class="px-3 py-2"></th></tr></thead>
            <tbody>
              <tr *ngFor="let r of depPreview.rows" class="border-t border-gray-100">
                <td class="px-3 py-1.5">{{ r.code }} — {{ r.description }}</td><td class="px-3 py-1.5 font-mono">{{ r.expenseAccount }}</td><td class="px-3 py-1.5 font-mono">{{ r.accDepAccount }}</td>
                <td class="px-3 py-1.5 text-right">{{ r.amount | number:'1.2-2' }}</td>
                <td class="px-3 py-1.5 text-gray-400">{{ r.alreadyPosted ? 'já lançado neste mês' : (r.amount ? '' : 'nada a depreciar') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-container *ngTemplateOutlet="eventsTable; context: { cols: ['period'] }"></ng-container>
      </ng-container>

      <!-- ================= SEGUROS ================= -->
      <ng-container *ngIf="view === 'asset-insurance'">
        <div class="bg-white border border-gray-200 rounded shadow-sm p-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
          <div class="md:col-span-2"><ng-container *ngTemplateOutlet="assetPicker"></ng-container></div>
          <label class="block"><span class="font-semibold text-gray-600">Seguradora</span><input [(ngModel)]="op.insurer" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Apólice</span><input [(ngModel)]="op.policy" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Início</span><input type="date" [(ngModel)]="op.startDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Fim</span><input type="date" [(ngModel)]="op.endDate" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Capital seguro</span><input type="number" [(ngModel)]="op.insuredValue" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Prémio</span><input type="number" [(ngModel)]="op.premium" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block md:col-span-3"><span class="font-semibold text-gray-600">Coberturas</span><input [(ngModel)]="op.coverage" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <button (click)="doOp('insurance')" [disabled]="busy" class="px-4 py-2 font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Registar</button>
        </div>
        <ng-container *ngTemplateOutlet="eventsTable; context: { cols: ['insurance'] }"></ng-container>
      </ng-container>

      <!-- ================= TRANSFERÊNCIAS ================= -->
      <ng-container *ngIf="view === 'asset-transfers'">
        <div class="bg-white border border-gray-200 rounded shadow-sm p-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
          <div class="md:col-span-2"><ng-container *ngTemplateOutlet="assetPicker"></ng-container></div>
          <div class="text-gray-500" *ngIf="opAsset">Atual: <b>{{ opAsset.location || '—' }}</b> / {{ opAsset.costCenter || '—' }}</div>
          <label class="block"><span class="font-semibold text-gray-600">Novo local</span><input [(ngModel)]="op.toLocation" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Novo centro de custo</span><input [(ngModel)]="op.toCostCenter" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Data</span><input type="date" [(ngModel)]="op.date" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-2"><span class="font-semibold text-gray-600">Responsável</span><input [(ngModel)]="op.responsible" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block md:col-span-3"><span class="font-semibold text-gray-600">Observações</span><input [(ngModel)]="op.notes" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <button (click)="doOp('transfer')" [disabled]="busy" class="px-4 py-2 font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Transferir</button>
        </div>
        <ng-container *ngTemplateOutlet="eventsTable; context: { cols: ['transfer'] }"></ng-container>
      </ng-container>

      <!-- ================= ABATES ================= -->
      <ng-container *ngIf="view === 'asset-disposals'">
        <div class="bg-white border border-gray-200 rounded shadow-sm p-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
          <div class="md:col-span-2"><ng-container *ngTemplateOutlet="assetPicker"></ng-container></div>
          <label class="block"><span class="font-semibold text-gray-600">Tipo</span><select [(ngModel)]="op.kind" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white"><option value="SALE">Alienação (venda)</option><option value="WRITE_OFF">Abate</option></select></label>
          <label class="block"><span class="font-semibold text-gray-600">Data</span><input type="date" [(ngModel)]="op.date" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label *ngIf="op.kind === 'SALE'" class="block"><span class="font-semibold text-gray-600">Valor de venda</span><input type="number" [(ngModel)]="op.proceeds" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label *ngIf="op.kind === 'SALE'" class="block"><span class="font-semibold text-gray-600">Conta de recebimento</span><input [(ngModel)]="op.proceedsAccount" list="as-acc" placeholder="1.1 / 1.2.x / 4.x" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono"></label>
          <label class="block md:col-span-3"><span class="font-semibold text-gray-600">Motivo</span><input [(ngModel)]="op.reason" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <div *ngIf="opAsset" class="md:col-span-2 text-gray-600">Valor líquido: <b>{{ opAsset.netBookValue | number:'1.2-2' }}</b> ·
            {{ disposalResult >= 0 ? 'Ganho' : 'Perda' }}: <b [class.text-green-700]="disposalResult >= 0" [class.text-red-600]="disposalResult < 0">{{ (disposalResult < 0 ? -disposalResult : disposalResult) | number:'1.2-2' }}</b></div>
          <button (click)="doOp('dispose')" [disabled]="busy" class="px-4 py-2 font-bold rounded bg-red-600 text-white disabled:bg-gray-300">Abater</button>
        </div>
        <p class="text-[11px] text-gray-500">Lança: débito da amortização acumulada e do recebimento; crédito do ativo; diferença em 7.6.3.1 (ganho) ou 6.8.3.1/6.8.3.2 (perda). Lance antes as depreciações até à data do abate.</p>
        <ng-container *ngTemplateOutlet="eventsTable; context: { cols: ['disposal'] }"></ng-container>
      </ng-container>

      <!-- ================= REAVALIAÇÕES ================= -->
      <ng-container *ngIf="view === 'asset-revaluations'">
        <div class="bg-white border border-gray-200 rounded shadow-sm p-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
          <div class="md:col-span-2"><ng-container *ngTemplateOutlet="assetPicker"></ng-container></div>
          <label class="block"><span class="font-semibold text-gray-600">Data</span><input type="date" [(ngModel)]="op.date" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <label class="block"><span class="font-semibold text-gray-600">Novo valor líquido</span><input type="number" [(ngModel)]="op.newValue" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-right"></label>
          <label class="block"><span class="font-semibold text-gray-600">Conta do excedente</span><input [(ngModel)]="op.surplusAccount" list="as-acc" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 font-mono"></label>
          <div *ngIf="opAsset" class="text-gray-600">Atual: <b>{{ opAsset.netBookValue | number:'1.2-2' }}</b> · Aumento: <b>{{ (op.newValue || 0) - opAsset.netBookValue | number:'1.2-2' }}</b></div>
          <label class="block md:col-span-5"><span class="font-semibold text-gray-600">Fundamento (avaliação, perito...)</span><input [(ngModel)]="op.reason" class="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"></label>
          <button (click)="doOp('revalue')" [disabled]="busy" class="px-4 py-2 font-bold rounded bg-blue-600 text-white disabled:bg-gray-300">Reavaliar</button>
        </div>
        <p class="text-[11px] text-gray-500">Lança: débito da conta do ativo e crédito do excedente de revalorização. O aumento passa a ser depreciado na vida útil restante.</p>
        <ng-container *ngTemplateOutlet="eventsTable; context: { cols: ['revaluation'] }"></ng-container>
      </ng-container>

      <!-- ================= EXPLORAÇÃO ================= -->
      <ng-container *ngIf="view === 'asset-exploration' && report">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Ativos em uso</div><div class="text-lg font-bold">{{ report.totals.count }}</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Valor bruto</div><div class="text-lg font-bold">{{ report.totals.gross | number:'1.2-2' }}</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Amortizações acumuladas</div><div class="text-lg font-bold">{{ report.totals.accumulated | number:'1.2-2' }}</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Valor líquido</div><div class="text-lg font-bold text-blue-700">{{ report.totals.net | number:'1.2-2' }}</div></div>
          <div class="bg-white border border-gray-200 rounded p-3"><div class="text-[11px] text-gray-500">Depreciação mensal</div><div class="text-lg font-bold">{{ report.totals.monthly | number:'1.2-2' }}</div></div>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <span *ngIf="report.alerts.insuranceExpiring" class="px-2 py-1 rounded bg-amber-100 text-amber-800">{{ report.alerts.insuranceExpiring }} seguro(s) a vencer em 30 dias</span>
          <span *ngIf="report.alerts.uninsured" class="px-2 py-1 rounded bg-red-100 text-red-700">{{ report.alerts.uninsured }} ativo(s) sem seguro válido</span>
          <span *ngIf="report.alerts.maintenanceDue" class="px-2 py-1 rounded bg-blue-100 text-blue-800">{{ report.alerts.maintenanceDue }} manutenção(ões) prevista(s) em 30 dias</span>
          <label class="ml-auto flex items-center gap-1"><input type="checkbox" [(ngModel)]="showDisposed"> Mostrar abatidos</label>
          <button (click)="exportCsv()" class="px-3 py-1 rounded border border-gray-300 bg-white">Exportar CSV</button>
        </div>
        <div class="bg-white border border-gray-200 rounded shadow-sm overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600"><tr>
              <th class="text-left px-3 py-2">Código</th><th class="text-left px-3 py-2">Descrição</th><th class="text-left px-3 py-2">Local</th><th class="text-left px-3 py-2">Aquisição</th>
              <th class="text-right px-3 py-2">Valor bruto</th><th class="text-right px-3 py-2">Amort. acum.</th><th class="text-right px-3 py-2">Valor líquido</th>
              <th class="text-left px-3 py-2">Seguro até</th><th class="text-left px-3 py-2">Próx. manutenção</th><th class="text-left px-3 py-2">Estado</th></tr></thead>
            <tbody>
              <tr *ngFor="let a of reportRows" class="border-t border-gray-100">
                <td class="px-3 py-1.5 font-semibold">{{ a.code }}</td><td class="px-3 py-1.5">{{ a.description }}</td><td class="px-3 py-1.5">{{ a.location || '—' }}</td>
                <td class="px-3 py-1.5">{{ a.acquisitionDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-3 py-1.5 text-right">{{ a.grossValue | number:'1.2-2' }}</td><td class="px-3 py-1.5 text-right">{{ a.accumulatedDepreciation | number:'1.2-2' }}</td>
                <td class="px-3 py-1.5 text-right font-semibold">{{ a.netBookValue | number:'1.2-2' }}</td>
                <td class="px-3 py-1.5" [class.text-red-600]="a.status === 'ACTIVE' && (!a.insuranceEnd || a.insuranceEnd < today)">{{ a.insuranceEnd ? (a.insuranceEnd | date:'dd/MM/yyyy') : 'sem seguro' }}</td>
                <td class="px-3 py-1.5">{{ a.nextMaintenance ? (a.nextMaintenance | date:'dd/MM/yyyy') : '—' }}</td>
                <td class="px-3 py-1.5" [class.text-red-600]="a.status !== 'ACTIVE'">{{ a.status === 'ACTIVE' ? 'Em uso' : 'Abatido' }}</td>
              </tr>
              <tr *ngIf="!reportRows.length"><td colspan="10" class="px-3 py-3 text-gray-400">Sem ativos.</td></tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- Tabela de eventos (histórico das operações da vista) -->
      <ng-template #eventsTable let-cols="cols">
        <div class="bg-white border border-gray-200 rounded shadow-sm overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-600"><tr><th class="text-left px-3 py-2">Data</th><th class="text-left px-3 py-2">Ativo</th><th class="text-left px-3 py-2">Descrição</th><th class="text-left px-3 py-2">Detalhe</th><th class="text-right px-3 py-2">Valor</th></tr></thead>
            <tbody>
              <tr *ngFor="let e of events" class="border-t border-gray-100">
                <td class="px-3 py-1.5 whitespace-nowrap">{{ e.date | date:'dd/MM/yyyy' }}</td>
                <td class="px-3 py-1.5">{{ e.code }} — {{ e.assetDescription }}</td>
                <td class="px-3 py-1.5">{{ e.description }}</td>
                <td class="px-3 py-1.5 text-gray-600">{{ detail(e) }}</td>
                <td class="px-3 py-1.5 text-right">{{ +e.amount ? (e.amount | number:'1.2-2') : '' }}</td>
              </tr>
              <tr *ngIf="!events.length"><td colspan="5" class="px-3 py-3 text-gray-400">Sem registos.</td></tr>
            </tbody>
          </table>
        </div>
      </ng-template>

      <datalist id="as-acc"><option *ngFor="let a of postingAccounts" [value]="a.code">{{ a.code }} — {{ a.name }}</option></datalist>
    </div>
  </div>
  `,
})
export class AssetsComponent implements OnInit, OnChanges {
  @Input() view = 'asset-register';

  assets: any[] = [];
  accounts: any[] = [];
  defaults: any = {};
  form: any = null;
  errors: string[] = [];
  busy = false;
  search = '';
  opAssetId = '';
  op: any = {};
  events: any[] = [];
  period = new Date().toISOString().slice(0, 7);
  depPreview: any = null;
  report: any = null;
  showDisposed = false;
  today = new Date().toISOString().slice(0, 10);
  private api = `${environment.apiUrl}/fixed-assets`;

  constructor(private http: HttpClient, private toaster: ToasterService, private cdr: ChangeDetectorRef) { }

  get title() { return TITLES[this.view] || TITLES['asset-register']; }
  get filtered() { const q = this.search.toLowerCase(); return this.assets.filter(a => !q || `${a.code} ${a.description}`.toLowerCase().includes(q)); }
  get activeAssets() { return this.assets.filter(a => a.status === 'ACTIVE'); }
  get opAsset() { return this.assets.find(a => a.id === this.opAssetId); }
  get postingAccounts() { return this.accounts.filter(a => a.allowPosting !== false).sort((a, b) => String(a.code).localeCompare(String(b.code))); }
  get locked() { return !!this.form?.id && Number(this.form?.accumulatedDepreciation) > 0; }
  get hasPostings() { return (this.form?.events || []).some((e: any) => e.journalEntryId); }
  get lifeYears() { return this.form?.usefulLifeMonths ? Math.round((this.form.usefulLifeMonths / 12) * 100) / 100 : ''; }
  get disposalResult() { return (this.op.kind === 'SALE' ? Number(this.op.proceeds) || 0 : 0) - (this.opAsset?.netBookValue || 0); }
  get reportRows() { return (this.report?.rows || []).filter((a: any) => this.showDisposed || a.status === 'ACTIVE'); }

  async ngOnInit() {
    try {
      const [defaults, accounts] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${this.api}/defaults`)),
        firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/accounting/accounts`)).catch(() => []),
      ]);
      this.defaults = defaults; this.accounts = accounts || [];
    } catch { /* sem contas: a lista de sugestões fica vazia */ }
    await this.load();
  }

  async ngOnChanges() { this.resetOp(); await this.load(); }

  private eventType(): string | null {
    return ({ 'asset-maintenance': 'MAINTENANCE', 'asset-depreciation': 'DEPRECIATION', 'asset-insurance': 'INSURANCE',
      'asset-transfers': 'TRANSFER', 'asset-disposals': 'DISPOSAL', 'asset-revaluations': 'REVALUATION' } as any)[this.view] || null;
  }

  async load() {
    try {
      this.assets = await firstValueFrom(this.http.get<any[]>(this.api));
      const t = this.eventType();
      this.events = t ? await firstValueFrom(this.http.get<any[]>(`${this.api}/events/${t}`)) : [];
      if (this.view === 'asset-exploration') this.report = await firstValueFrom(this.http.get<any>(`${this.api}/report`));
    } catch (e: any) {
      this.toaster.showError('Ativos', e?.error?.message || 'Não foi possível carregar os ativos.');
    }
    this.cdr.detectChanges();
  }

  private resetOp() {
    this.op = { date: this.today, kind: this.view === 'asset-disposals' ? 'SALE' : 'PREVENTIVE', surplusAccount: '5.6.2', proceedsAccount: '1.1' };
    this.depPreview = null; this.errors = [];
  }

  eventLabel(t: string) {
    return ({ ACQUISITION: 'Aquisição', DEPRECIATION: 'Depreciação', MAINTENANCE: 'Manutenção', INSURANCE: 'Seguro', TRANSFER: 'Transferência', DISPOSAL: 'Abate', REVALUATION: 'Reavaliação' } as any)[t] || t;
  }

  detail(e: any): string {
    const d = typeof e.data === 'string' ? JSON.parse(e.data || '{}') : (e.data || {});
    const fd = (s: string) => s ? s.split('-').reverse().join('/') : '—';
    switch (e.type) {
      case 'MAINTENANCE': return `${d.kind === 'CORRECTIVE' ? 'Corretiva' : 'Preventiva'}${d.supplier ? ' · ' + d.supplier : ''}${d.nextDate ? ' · próxima ' + fd(d.nextDate) : ''}`;
      case 'INSURANCE': {
        const left = d.endDate ? Math.ceil((new Date(d.endDate).getTime() - Date.now()) / 86400000) : null;
        return `${fd(d.startDate)} a ${fd(d.endDate)} · capital ${Number(d.insuredValue || 0).toLocaleString('pt-PT')}${left === null ? '' : left < 0 ? ' · EXPIRADO' : left <= 30 ? ` · vence em ${left} dias` : ''}`;
      }
      case 'TRANSFER': return `${d.fromCostCenter || '—'} → ${d.toCostCenter || '—'}${d.responsible ? ' · ' + d.responsible : ''}`;
      case 'DISPOSAL': return `${d.kind === 'SALE' ? 'Venda' : 'Abate'} · VLC ${Number(d.netBookValue || 0).toLocaleString('pt-PT')} · ${Number(d.result) >= 0 ? 'ganho' : 'perda'} ${Math.abs(Number(d.result || 0)).toLocaleString('pt-PT')}`;
      case 'REVALUATION': return `VLC ${Number(d.previousNetBookValue || 0).toLocaleString('pt-PT')} → ${Number(d.newValue || 0).toLocaleString('pt-PT')}`;
      case 'DEPRECIATION': return e.period || '';
      default: return '';
    }
  }

  // ---------------- ficha
  newAsset() {
    const d = this.defaults?.TANGIBLE || {};
    this.form = { category: 'TANGIBLE', acquisitionDate: this.today, startDate: this.today, cost: null, residualValue: 0, usefulLifeMonths: 60,
      assetAccount: d.asset, accDepAccount: d.accDep, expenseAccount: d.expense, postAcquisition: false };
    this.errors = [];
  }
  onCategory() {
    const d = this.defaults?.[this.form.category] || {};
    this.form.assetAccount = d.asset; this.form.accDepAccount = d.accDep; this.form.expenseAccount = d.expense;
  }
  setYears(y: any) { const n = Number(y); if (n > 0) this.form.usefulLifeMonths = Math.round(n * 12); }
  async openAsset(id: string) {
    this.errors = [];
    this.form = await firstValueFrom(this.http.get<any>(`${this.api}/${id}`));
    this.cdr.detectChanges();
  }
  async saveAsset() {
    this.busy = true; this.errors = [];
    try {
      const saved = await firstValueFrom(this.http.post<any>(this.api, this.form));
      this.toaster.showSuccess('Ativo gravado', `${saved.code} — ${saved.description}`);
      this.form = saved; await this.load();
    } catch (e: any) { this.errors = e?.error?.errors || [e?.error?.message || 'Não foi possível gravar.']; }
    this.busy = false; this.cdr.detectChanges();
  }
  async deleteAsset() {
    if (!confirm(`Eliminar o ativo ${this.form.code}?`)) return;
    try { await firstValueFrom(this.http.delete(`${this.api}/${this.form.id}`)); this.form = null; await this.load(); }
    catch (e: any) { this.toaster.showError('Ativos', e?.error?.message || 'Não foi possível eliminar.'); }
  }

  // ---------------- operações
  onOpAsset() { this.cdr.detectChanges(); }
  async doOp(kind: 'maintenance' | 'insurance' | 'transfer' | 'dispose' | 'revalue') {
    if (!this.opAssetId) { this.toaster.showWarning('Ativos', 'Escolha o ativo.'); return; }
    if (kind === 'dispose' && !confirm(`Confirmar o ${this.op.kind === 'SALE' ? 'alienação' : 'abate'} de ${this.opAsset?.code}? É gerado o lançamento e o ativo deixa de depreciar.`)) return;
    this.busy = true;
    try {
      await firstValueFrom(this.http.post<any>(`${this.api}/${this.opAssetId}/${kind}`, this.op));
      this.toaster.showSuccess('Ativos', 'Registado.');
      this.resetOp(); this.opAssetId = ''; await this.load();
    } catch (e: any) {
      const errs = e?.error?.errors; this.toaster.showError('Ativos', errs?.length ? errs.join(' ') : (e?.error?.message || 'Falhou.'));
    }
    this.busy = false; this.cdr.detectChanges();
  }

  // ---------------- depreciações
  async previewDep() {
    this.busy = true;
    try { this.depPreview = await firstValueFrom(this.http.post<any>(`${this.api}/depreciation/run`, { period: this.period })); }
    catch (e: any) { this.toaster.showError('Depreciações', e?.error?.message || 'Falhou.'); }
    this.busy = false; this.cdr.detectChanges();
  }
  async postDep() {
    if (!confirm(`Lançar as depreciações de ${this.period} (${this.depPreview?.total} MT)?`)) return;
    this.busy = true;
    try {
      const r = await firstValueFrom(this.http.post<any>(`${this.api}/depreciation/run`, { period: this.period, post: true }));
      this.toaster.showSuccess('Depreciações', r.posted ? `Lançadas ${r.total} MT de ${this.period}.` : 'Nada a lançar neste mês.');
      this.depPreview = await firstValueFrom(this.http.post<any>(`${this.api}/depreciation/run`, { period: this.period }));
      await this.load();
    } catch (e: any) { this.toaster.showError('Depreciações', e?.error?.message || (e?.error?.errors || []).join(' ') || 'Falhou.'); }
    this.busy = false; this.cdr.detectChanges();
  }

  exportCsv() {
    const head = ['Código', 'Descrição', 'Local', 'Aquisição', 'Valor bruto', 'Amort. acumulada', 'Valor líquido', 'Estado'];
    const lines = this.reportRows.map((a: any) => [a.code, a.description, a.location || '', a.acquisitionDate, a.grossValue, a.accumulatedDepreciation, a.netBookValue, a.status === 'ACTIVE' ? 'Em uso' : 'Abatido']
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mapa-imobilizado-${this.today}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
