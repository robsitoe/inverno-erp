import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-document-type-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="close.emit()">
      <div class="bg-[#F0F0F0] w-[800px] h-[600px] shadow-xl border border-gray-400 flex flex-col text-xs" (click)="$event.stopPropagation()">
        <!-- Title Bar -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-2 py-1 flex justify-between items-center select-none">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px]">settings_applications</span>
            <span class="font-bold">
              {{ module === 'TREASURY' ? 'Documento de Conta Corrente' : 'Documento de ' + (module === 'SALES' ? 'Venda' : module === 'PURCHASES' ? 'Compra' : 'Stock') }}
            </span>
          </div>
          <button (click)="close.emit()" class="hover:bg-red-500 rounded px-1">
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center gap-1 px-2 py-1 bg-[#F0F0F0] border-b border-gray-300">
          <button (click)="save()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm text-gray-700">
            <span class="material-symbols-outlined text-[18px] text-blue-600">save</span>
            <span>Gravar</span>
          </button>
          <button (click)="reset()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm text-gray-700">
            <span class="material-symbols-outlined text-[18px] text-green-600">add_circle</span>
            <span>Novo</span>
          </button>
          <button (click)="delete()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm text-gray-700">
            <span class="material-symbols-outlined text-[18px] text-red-600">block</span>
            <span>Anular</span>
          </button>
          <div class="w-px h-4 bg-gray-300 mx-1"></div>
          <button (click)="toggleList()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm text-gray-700">
            <span class="material-symbols-outlined text-[18px] text-gray-600">list</span>
            <span>Listas</span>
          </button>
          <button class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm text-gray-700">
            <span class="material-symbols-outlined text-[18px] text-blue-400">help</span>
            <span>Ajuda</span>
          </button>
          <button (click)="close.emit()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm text-gray-700">
            <span class="material-symbols-outlined text-[18px] text-gray-600">logout</span>
            <span>Cancelar</span>
          </button>
        </div>

        <!-- Main Content -->
        <div class="flex-1 p-2 flex flex-col gap-2 overflow-auto relative">
          
          <!-- List Overlay -->
          <div *ngIf="showList" class="absolute inset-0 bg-white z-20 flex flex-col">
            <div class="bg-gray-100 border-b border-gray-300 px-2 py-1 font-bold text-gray-700 flex justify-between items-center">
              <span>Lista de Documentos</span>
              <button (click)="showList = false" class="text-red-500 hover:text-red-700">
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <div class="flex-1 overflow-auto">
              <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50 sticky top-0 shadow-sm">
                  <tr>
                    <th class="border-b border-gray-300 px-2 py-1 w-20">Código</th>
                    <th class="border-b border-gray-300 px-2 py-1">Descrição</th>
                    <th class="border-b border-gray-300 px-2 py-1 w-32">Tipo</th>
                    <th class="border-b border-gray-300 px-2 py-1 w-24">Natureza</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let doc of documentTypesList" 
                      (click)="selectDocumentType(doc)"
                      class="hover:bg-blue-50 cursor-pointer border-b border-gray-100">
                    <td class="px-2 py-1 font-bold">{{ doc.code }}</td>
                    <td class="px-2 py-1">{{ doc.description }}</td>
                    <td class="px-2 py-1">{{ doc.type }}</td>
                    <td class="px-2 py-1">{{ doc.nature === 'PAY' ? 'Pagamento' : (doc.nature === 'RECEIVE' ? 'Recebimento' : '-') }}</td>
                  </tr>
                  <tr *ngIf="documentTypesList.length === 0">
                    <td colspan="4" class="px-2 py-8 text-center text-gray-500">
                      Nenhum documento configurado.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Header Inputs -->
          <div class="flex items-center gap-2">
            <label class="w-20 text-right font-medium">Documento:</label>
            <input type="text" [(ngModel)]="config.code" class="w-16 border border-gray-300 px-1 py-0.5 uppercase font-bold" maxlength="3" />
            <input type="text" [(ngModel)]="config.description" class="flex-1 border border-gray-300 px-1 py-0.5" placeholder="Descrição do documento" />
          </div>

          <!-- Tabs -->
          <div class="flex items-end border-b border-gray-300 mt-2">
            <button *ngFor="let tab of tabs" 
              (click)="activeTab = tab"
              [class]="'px-3 py-1 border-t border-x rounded-t-sm -mb-px ' + (activeTab === tab ? 'bg-white border-gray-300 border-b-white font-medium' : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200')">
              {{ tab }}
            </button>
          </div>

          <!-- Tab Content -->
          <div class="flex-1 bg-white border border-gray-300 p-3 overflow-auto">
            
            <!-- Tab: Gerais -->
            <div *ngIf="activeTab === 'Gerais'">
              
              <!-- TREASURY Specific Layout -->
              <div *ngIf="module === 'TREASURY'" class="grid grid-cols-2 gap-4">
                <!-- Left Column -->
                <div class="flex flex-col gap-4">
                  <!-- Características -->
                  <fieldset class="border border-gray-300 p-2 rounded-sm h-64 flex flex-col">
                     <legend class="px-1 text-blue-600 font-medium">Características</legend>
                     <!-- Tipo Doc -->
                     <div class="flex items-center gap-2 mb-2">
                       <label class="w-20">Tipo Doc.:</label>
                       <select [(ngModel)]="config.type" class="flex-1 border border-gray-300 px-1 py-0.5">
                         <option value="Liquidações">Liquidações</option>
                         <option value="Pagamentos">Pagamentos</option>
                         <option value="Recebimentos">Recebimentos</option>
                         <option value="Transferências">Transferências</option>
                       </select>
                     </div>
                     <!-- Documento permitido a ... -->
                     <div class="flex-1 border border-gray-300 bg-white p-1 overflow-y-auto">
                       <div class="font-medium mb-1">Documento permitido a ...</div>
                       <div class="ml-2 flex flex-col gap-1">
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.allowedEntities.customer"> Cliente</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.allowedEntities.supplier"> Fornecedor</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.allowedEntities.state"> Estado/Ente Público</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.allowedEntities.other"> Outro</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.allowedEntities.shareholder"> Acionista/Sócio</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.allowedEntities.bank"> Banco</label>
                       </div>
                     </div>
                  </fieldset>

                  <!-- Estorno/Crédito -->
                  <fieldset class="border border-gray-300 p-2 rounded-sm">
                     <div class="flex items-center gap-2 mb-2">
                        <input type="checkbox" [(ngModel)]="config.allowReversal"> <span class="font-medium">Permite Documentos Estorno/Crédito</span>
                     </div>
                     <div class="grid grid-cols-[80px_1fr] gap-2 items-center mb-1">
                        <label class="text-blue-600">Documento:</label>
                        <select [(ngModel)]="config.reversalDoc" class="border border-gray-300 px-1 py-0.5">
                           <option value="EST">EST</option>
                           <option value="NC">NC</option>
                        </select>
                     </div>
                     <div class="grid grid-cols-[80px_1fr] gap-2 items-center">
                        <label>Série:</label>
                        <select [(ngModel)]="config.reversalSeries" class="border border-gray-300 px-1 py-0.5">
                           <option value="018">018</option>
                           <option value="2025">2025</option>
                        </select>
                     </div>
                  </fieldset>

                  <!-- Natureza -->
                  <fieldset class="border border-gray-300 p-2 rounded-sm">
                     <legend class="px-1 text-blue-600 font-medium">Natureza</legend>
                     <div class="flex flex-col gap-1">
                        <label class="flex items-center gap-2"><input type="radio" name="nature" value="PAY" [(ngModel)]="config.nature"> Pagamento</label>
                        <label class="flex items-center gap-2"><input type="radio" name="nature" value="RECEIVE" [(ngModel)]="config.nature"> Recebimento</label>
                     </div>
                  </fieldset>
                  
                  <!-- Formato exportação -->
                   <div class="flex items-center gap-2">
                      <label>Formato exportação:</label>
                      <select [(ngModel)]="config.exportFormat" class="flex-1 border border-gray-300 px-1 py-0.5"></select>
                   </div>
                </div>

                <!-- Right Column -->
                <div class="flex flex-col gap-4">
                   <!-- Opções -->
                   <fieldset class="border border-gray-300 p-2 rounded-sm h-64">
                      <legend class="px-1 text-blue-600 font-medium">Opções</legend>
                      <div class="flex flex-col gap-1">
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.recapitulatives"> Sujeito a recapitulativos</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.commissionCalculation"> Cálculo de comissões</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.treasuryIntegration"> Ligação à Tesouraria</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.creditLimit"> Gestão de limite crédito</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.provisionSuggestion"> Sugestão para provisões</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.allowNegativeLines"> Permite Linhas Negativas</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.allowNegativeDocs"> Permite Documentos Negativos</label>
                      </div>
                   </fieldset>

                   <!-- Retenções -->
                   <fieldset class="border border-gray-300 p-2 rounded-sm">
                      <legend class="px-1 text-blue-600 font-medium">Retenções</legend>
                      <div class="flex flex-col gap-1 mb-2">
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.subjectToRetention"> Sujeito a Retenção na Fonte</label>
                         <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="config.retentionAtSource"> Liquida Retenção na Fonte na Introdução</label>
                      </div>
                      <div class="flex items-center justify-end gap-2">
                         <label>Documento a Utilizar:</label>
                         <select [(ngModel)]="config.retentionDoc" class="w-32 border border-gray-300 px-1 py-0.5">
                            <option value="">(Nenhum)</option>
                         </select>
                      </div>
                   </fieldset>
                   
                   <!-- Designação -->
                   <div class="flex items-center gap-2 mt-auto">
                      <label>Designação:</label>
                      <select [(ngModel)]="config.designation" class="flex-1 border border-gray-300 px-1 py-0.5"></select>
                   </div>
                </div>
              </div>

              <!-- Standard Layout (Sales, Purchases, Inventory) -->
              <div *ngIf="module !== 'TREASURY'" class="grid grid-cols-2 gap-6">
                <!-- Left Column -->
                <div class="flex flex-col gap-4">
                  <fieldset class="border border-gray-300 p-2 rounded-sm">
                    <legend class="px-1 text-blue-600 font-medium">Características</legend>
                    <div class="flex items-center gap-2 mb-2">
                      <label class="w-24" title="Classificação fundamental do documento no sistema.">Tipo Doc.:</label>
                      <select [(ngModel)]="config.type" class="flex-1 border border-gray-300 px-1 py-0.5" title="Financeiro: Documentos de liquidação/regularização. Venda/Compra: Documentos comerciais. Stock: Movimentos internos de inventário.">
                        <option value="Financeiro">Financeiro</option>
                        <option value="Venda">Venda</option>
                        <option value="Compra">Compra</option>
                        <option value="Stock">Stock</option>
                      </select>
                    </div>
                    <div class="flex flex-col gap-1 ml-24">
                      <label class="flex items-center gap-2" title="Permite a emissão deste documento para entidades do tipo 'Outros Credores'.">
                        <input type="checkbox" [(ngModel)]="config.allowOtherCreditors" /> Outros Credores
                      </label>
                      <label class="flex items-center gap-2" title="Permite a emissão deste documento para entidades do tipo 'Fornecedores'.">
                        <input type="checkbox" [(ngModel)]="config.allowSuppliers" /> Fornecedores
                      </label>
                    </div>
                  </fieldset>

                  <fieldset class="border border-gray-300 p-2 rounded-sm">
                    <legend class="px-1 text-blue-600 font-medium">Natureza do Documento</legend>
                    <div class="flex flex-col gap-1">
                      <label class="flex items-center gap-2" title="O documento representa um valor a receber (ex: Fatura Cliente, Nota de Débito).">
                        <input type="radio" name="nature" value="RECEIVE" [(ngModel)]="config.nature" /> Documento a Receber
                      </label>
                      <label class="flex items-center gap-2" title="O documento representa um valor a pagar (ex: Fatura Fornecedor, Nota de Crédito Cliente).">
                        <input type="radio" name="nature" value="PAY" [(ngModel)]="config.nature" /> Documento a Pagar
                      </label>
                    </div>
                  </fieldset>

                  <fieldset class="border border-gray-300 p-2 rounded-sm">
                    <legend class="px-1 text-blue-600 font-medium">Documento Externo</legend>
                    <div class="flex flex-col gap-1">
                      <label class="flex items-center gap-2" title="Permite a gravação de múltiplos documentos com a mesma referência externa.">
                        <input type="radio" name="extDoc" value="IGNORE" [(ngModel)]="config.externalDocBehavior" /> Ignorar duplicação
                      </label>
                      <label class="flex items-center gap-2" title="Emite um aviso ao utilizador se a referência externa já existir, mas permite gravar.">
                        <input type="radio" name="extDoc" value="WARN" [(ngModel)]="config.externalDocBehavior" /> Informar sobre duplicação
                      </label>
                      <label class="flex items-center gap-2" title="Impede a gravação se a referência externa já existir para a mesma entidade.">
                        <input type="radio" name="extDoc" value="BLOCK" [(ngModel)]="config.externalDocBehavior" /> Não permitir duplicação
                      </label>
                    </div>
                  </fieldset>
                </div>

                <!-- Right Column -->
                <div class="flex flex-col gap-4">
                  <fieldset class="border border-gray-300 p-2 rounded-sm">
                    <legend class="px-1 text-blue-600 font-medium">Opções</legend>
                    <div class="flex flex-col gap-1">
                      <label class="flex items-center gap-2" title="Inclui os valores deste documento nos mapas de análise de gestão e volumes de negócios.">
                        <input type="checkbox" [(ngModel)]="config.stats" /> Sugestão para as estatísticas
                      </label>
                      <label class="flex items-center gap-2" title="Gera movimentos na conta corrente, atualizando o saldo da entidade.">
                        <input type="checkbox" [(ngModel)]="config.currentAccounts" /> Ligação às Contas Correntes
                      </label>
                      <label class="flex items-center gap-2" title="Movimenta quantidades no inventário. Se desligado, é apenas um documento de valor (ex: Fatura de Serviços).">
                        <input type="checkbox" [(ngModel)]="config.stocks" /> Ligação aos Stocks
                      </label>
                      <label class="flex items-center gap-2" title="Permite a liquidação financeira imediata e integração com contas de caixa/bancos.">
                        <input type="checkbox" [(ngModel)]="config.treasury" /> Ligação à Tesouraria
                      </label>
                      <label class="flex items-center gap-2" title="Valida se a gravação deste documento excede o plafond de crédito atribuído à entidade.">
                        <input type="checkbox" [(ngModel)]="config.creditLimit" /> Gestão de limite de crédito
                      </label>
                      <label class="flex items-center gap-2" title="Marca o documento para processamento nas declarações fiscais recapitulativas (IVA).">
                        <input type="checkbox" [(ngModel)]="config.recapitulatives" /> Sujeito a recapitulativos
                      </label>
                    </div>
                  </fieldset>

                  <fieldset class="border border-gray-300 p-2 rounded-sm">
                    <legend class="px-1 text-blue-600 font-medium">Estorno/Crédito</legend>
                    <label class="flex items-center gap-2 mb-2">
                      <input type="checkbox" [(ngModel)]="config.allowReversal" /> Permite Documentos Estorno/Crédito
                    </label>
                    <div class="flex items-center gap-2">
                      <label class="w-24" title="Tipo de documento a gerar quando se efetua um estorno deste documento.">Doc. Estorno:</label>
                      <select [(ngModel)]="config.reversalDoc" class="flex-1 border border-gray-300 px-1 py-0.5">
                        <option value="NC">NC - Nota de Crédito</option>
                        <option value="ND">ND - Nota de Débito</option>
                      </select>
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>

            <!-- Tab: Contas Correntes / Configuração -->
            <div *ngIf="activeTab === 'Contas Correntes' || activeTab === 'Configuração'" class="flex flex-col gap-4">
              <fieldset class="border border-gray-300 p-2 rounded-sm">
                <legend class="px-1 text-blue-600 font-medium">Tipo de Conta</legend>
                <div class="grid grid-cols-[80px_1fr] gap-2 items-center">
                  <label>Conta:</label>
                  <div class="flex items-center gap-2">
                    <select [(ngModel)]="config.accountType" class="w-24 border border-gray-300 px-1 py-0.5" title="Conta do plano de contas (SNC) onde será contabilizado o movimento.">
                      <option value="CCF">CCF</option>
                      <option value="CCC">CCC</option>
                    </select>
                    <span class="text-gray-600">Conta Fornecedores</span>
                  </div>
                  
                  <label>Estado:</label>
                  <div class="flex items-center gap-2">
                    <select [(ngModel)]="config.accountStatus" class="w-24 border border-gray-300 px-1 py-0.5" title="Estado inicial do movimento (AGP: Aguarda Aprovação; APR: Aprovado).">
                      <option value="AGP">AGP</option>
                      <option value="APR">APR</option>
                    </select>
                    <span class="text-gray-600">Aguarda Aprovação</span>
                  </div>
                </div>
              </fieldset>

              <fieldset class="border border-gray-300 p-2 rounded-sm">
                <legend class="px-1 text-blue-600 font-medium">Liquidação Automática</legend>
                <div class="flex items-center justify-between">
                  <label class="flex items-center gap-2" title="Lança automaticamente o recebimento/pagamento associado a este documento.">
                    <input type="checkbox" [(ngModel)]="config.autoLiquidation" /> Efetua Liquidação Automática
                  </label>
                  <div class="flex items-center gap-2">
                    <label>Documento a Gerar:</label>
                    <select [(ngModel)]="config.autoLiquidationDoc" class="w-48 border border-gray-300 px-1 py-0.5" [disabled]="!config.autoLiquidation">
                      <option value="">(Nenhum)</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              <fieldset class="border border-gray-300 p-2 rounded-sm">
                <legend class="px-1 text-blue-600 font-medium">Pendentes</legend>
                <label class="flex items-center gap-2" title="Cria um movimento pendente individual para cada linha do documento, permitindo liquidação parcial detalhada.">
                  <input type="checkbox" [(ngModel)]="config.generatePendingByLine" /> Gera pendentes por linha
                </label>
              </fieldset>

              <fieldset class="border border-gray-300 p-2 rounded-sm">
                <legend class="px-1 text-blue-600 font-medium">Retenções</legend>
                <div class="flex items-center justify-between">
                  <label class="flex items-center gap-2" title="Calcula e lança automaticamente valores de retenção na fonte baseados nas regras fiscais.">
                    <input type="checkbox" [(ngModel)]="config.retentionAtSource" /> Liquida Retenção na Fonte na Introdução
                  </label>
                  <div class="flex items-center gap-2">
                    <label>Documento a Utilizar:</label>
                    <select [(ngModel)]="config.retentionDoc" class="w-48 border border-gray-300 px-1 py-0.5" [disabled]="!config.retentionAtSource">
                      <option value="">(Nenhum)</option>
                    </select>
                  </div>
                </div>
              </fieldset>
            </div>

            <!-- Tab: Stocks -->
            <div *ngIf="activeTab === 'Stocks'" class="grid grid-cols-2 gap-6">
              <fieldset class="border border-gray-300 p-2 rounded-sm">
                <legend class="px-1 text-blue-600 font-medium">Movimentos de Quantidade Positiva</legend>
                <div class="flex items-center gap-2 mb-3">
                  <label class="w-32" title="Define o sentido do movimento de stock.">Tipo de Documento:</label>
                  <select [(ngModel)]="config.stockMovementPositiveType" class="flex-1 border border-gray-300 px-1 py-0.5">
                    <option value="Entrada">Entrada</option>
                    <option value="Saída">Saída</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
                <div class="ml-32 flex flex-col gap-1">
                  <label class="font-medium mb-1">Atualiza:</label>
                  <label class="flex items-center gap-2" title="Recalcula o Preço de Custo Médio ponderado com base no valor desta entrada.">
                    <input type="checkbox" [(ngModel)]="config.stockUpdatePCM" /> Preço Custo Médio
                  </label>
                  <label class="flex items-center gap-2" title="Atualiza o registo do último preço de custo de aquisição do artigo.">
                    <input type="checkbox" [(ngModel)]="config.stockUpdateUPC" /> Último Preço de Custo
                  </label>
                  <label class="flex items-center gap-2" title="Atualiza a data da última entrada na ficha do artigo.">
                    <input type="checkbox" [(ngModel)]="config.stockUpdateLastEntry" /> Data Última Entrada
                  </label>
                  <label class="flex items-center gap-2" title="Atualiza a data da última saída na ficha do artigo.">
                    <input type="checkbox" [(ngModel)]="config.stockUpdateLastExit" /> Data Última Saída
                  </label>
                </div>
              </fieldset>

              <fieldset class="border border-gray-300 p-2 rounded-sm">
                <legend class="px-1 text-blue-600 font-medium">Movimentos de Quantidade Negativa</legend>
                <div class="flex items-center gap-2 mb-3">
                  <label class="w-32" title="Define o sentido do movimento de stock.">Tipo de Documento:</label>
                  <select [(ngModel)]="config.stockMovementNegativeType" class="flex-1 border border-gray-300 px-1 py-0.5">
                    <option value="Entrada">Entrada</option>
                    <option value="Saída">Saída</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
                <div class="ml-32 flex flex-col gap-1">
                  <label class="font-medium mb-1">Atualiza:</label>
                  <label class="flex items-center gap-2" title="Recalcula o Preço de Custo Médio ponderado com base no valor desta saída (normalmente não aplicável).">
                    <input type="checkbox" [(ngModel)]="config.stockUpdatePCM_Neg" /> Preço Custo Médio
                  </label>
                  <label class="flex items-center gap-2" title="Atualiza o registo do último preço de custo de aquisição do artigo.">
                    <input type="checkbox" [(ngModel)]="config.stockUpdateUPC_Neg" /> Último Preço de Custo
                  </label>
                  <label class="flex items-center gap-2" title="Atualiza a data da última entrada na ficha do artigo.">
                    <input type="checkbox" [(ngModel)]="config.stockUpdateLastEntry_Neg" /> Data Última Entrada
                  </label>
                  <label class="flex items-center gap-2" title="Atualiza a data da última saída na ficha do artigo.">
                    <input type="checkbox" [(ngModel)]="config.stockUpdateLastExit_Neg" /> Data Última Saída
                  </label>
                </div>
              </fieldset>
            </div>

            <!-- Tab: Tesouraria -->
            <div *ngIf="activeTab === 'Tesouraria'" class="flex flex-col gap-4">
              <!-- Standard Treasury Integration (for non-Treasury modules) -->
              <div *ngIf="module !== 'TREASURY'">
                <fieldset class="border border-gray-300 p-2 rounded-sm">
                  <legend class="px-1 text-blue-600 font-medium">Integração</legend>
                  <label class="flex items-center gap-2 mb-2" title="Ativa a integração direta com a tesouraria, gerando movimentos de caixa/banco.">
                    <input type="checkbox" [(ngModel)]="config.treasuryIntegration" /> Movimenta Tesouraria
                  </label>
                  <div class="flex items-center gap-2 ml-6">
                    <label class="w-32">Conta por Defeito:</label>
                    <select [(ngModel)]="config.treasuryDefaultAccount" class="w-48 border border-gray-300 px-1 py-0.5" [disabled]="!config.treasuryIntegration" title="Conta de caixa ou banco sugerida automaticamente para o movimento financeiro.">
                      <option value="">(Nenhuma)</option>
                      <option value="CX1">Caixa Geral</option>
                      <option value="DO1">Depósitos à Ordem</option>
                    </select>
                  </div>
                </fieldset>
              </div>

              <!-- Treasury Module Specific Layout -->
              <div *ngIf="module === 'TREASURY'">
                <fieldset class="border border-gray-300 p-2 rounded-sm flex flex-col h-full">
                  <legend class="px-1 text-blue-600 font-medium">Tipo de Ligação à Tesouraria</legend>
                  
                  <div class="flex items-center gap-4 mb-2">
                    <div class="flex items-center gap-2">
                      <label class="text-blue-600">Tipo Doc.:</label>
                      <select [(ngModel)]="config.treasuryDocType" class="border border-gray-300 px-1 py-0.5 w-48">
                        <option value="Movimento em conta">Movimento em conta</option>
                      </select>
                    </div>
                    
                    <div class="flex items-center gap-4 ml-8">
                      <label class="flex items-center gap-1 font-medium text-blue-800">
                        <input type="radio" name="treasuryMode" value="PAYMENT_MODE" [(ngModel)]="config.treasuryMode"> Modo de Pagamento
                      </label>
                      <label class="flex items-center gap-1">
                        <input type="radio" name="treasuryMode" value="CONFIG_GRID" [(ngModel)]="config.treasuryMode"> Grelha de Configurações
                      </label>
                    </div>
                  </div>

                  <!-- Grid 1: Pos./Neg. Configuration -->
                  <div class="border border-gray-300 bg-white mb-2 h-40 overflow-auto relative">
                    <table class="w-full text-left border-collapse">
                      <thead class="bg-gray-50 sticky top-0 text-blue-600">
                        <tr>
                          <th class="border-b border-r border-gray-300 px-2 py-1 w-20">Pos./Neg.</th>
                          <th class="border-b border-r border-gray-300 px-2 py-1">Movimento</th>
                          <th class="border-b border-r border-gray-300 px-2 py-1">Item Tesouraria</th>
                          <th class="border-b border-r border-gray-300 px-2 py-1 w-24">Valor</th>
                          <th class="border-b px-2 py-1 w-8 text-center">?</th>
                        </tr>
                      </thead>
                      <tbody>
                         <tr class="border-b border-gray-100">
                           <td class="border-r border-gray-100 px-1">
                             <select class="w-full border-none bg-transparent focus:outline-none text-xs">
                               <option></option>
                               <option>Pos.</option>
                               <option>Neg.</option>
                             </select>
                           </td>
                           <td class="border-r border-gray-100 px-1"><input class="w-full border-none bg-transparent focus:outline-none text-xs"></td>
                           <td class="border-r border-gray-100 px-1"><input class="w-full border-none bg-transparent focus:outline-none text-xs"></td>
                           <td class="border-r border-gray-100 px-1"><input class="w-full border-none bg-transparent focus:outline-none text-xs"></td>
                           <td class="px-1 text-center"><input type="checkbox"></td>
                         </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Grid 2: Custos Bancários -->
                  <fieldset class="border border-gray-300 p-0 rounded-sm flex-1 flex flex-col">
                    <legend class="px-1 text-black font-medium ml-2">Custos Bancários</legend>
                    <div class="flex-1 overflow-auto relative">
                      <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 sticky top-0 text-blue-600">
                          <tr>
                            <th class="border-b border-r border-gray-300 px-2 py-1 w-48">Mov. Bancário</th>
                            <th class="border-b border-r border-gray-300 px-2 py-1 w-24">Valor</th>
                            <th class="border-b border-r border-gray-300 px-2 py-1 w-8 text-center">?</th>
                            <th class="border-b border-r border-gray-300 px-2 py-1 w-16">IVA</th>
                            <th class="border-b border-r border-gray-300 px-2 py-1 w-16">Selo</th>
                            <th class="border-b border-r border-gray-300 px-2 py-1">Item Tesouraria</th>
                            <th class="border-b px-2 py-1 w-16 text-center">A Cobrar</th>
                          </tr>
                        </thead>
                        <tbody>
                           <tr class="border-b border-gray-100">
                             <td class="border-r border-gray-100 px-1 py-1">
                               <input class="w-full border border-black h-4 px-1 text-xs">
                             </td>
                             <td class="border-r border-gray-100 px-1"><input class="w-full border-none bg-transparent focus:outline-none text-xs"></td>
                             <td class="border-r border-gray-100 px-1 text-center"><input type="checkbox"></td>
                             <td class="border-r border-gray-100 px-1"><input class="w-full border-none bg-transparent focus:outline-none text-xs"></td>
                             <td class="border-r border-gray-100 px-1"><input class="w-full border-none bg-transparent focus:outline-none text-xs"></td>
                             <td class="border-r border-gray-100 px-1"><input class="w-full border-none bg-transparent focus:outline-none text-xs"></td>
                             <td class="px-1 text-center"><input type="checkbox"></td>
                           </tr>
                        </tbody>
                      </table>
                    </div>
                  </fieldset>

                </fieldset>
              </div>
            </div>

            <!-- Tab: Séries -->
            <div *ngIf="activeTab === 'Séries'" class="flex flex-col h-full">
              <div class="flex-1 border border-gray-300 overflow-auto mb-2">
                <table class="w-full text-left">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr>
                      <th class="px-2 py-1 border-b w-16 text-center">Usar</th>
                      <th class="px-2 py-1 border-b">Série</th>
                      <th class="px-2 py-1 border-b">Descrição</th>
                      <th class="px-2 py-1 border-b w-32">Validade</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let serie of globalSeries" class="hover:bg-blue-50 cursor-pointer">
                      <td class="px-2 py-1 border-b text-center">
                        <input type="checkbox" 
                               [checked]="isAssociated(serie)" 
                               (change)="toggleAssociation(serie)"
                               class="cursor-pointer" />
                      </td>
                      <td class="px-2 py-1 border-b">{{ serie.code }}</td>
                      <td class="px-2 py-1 border-b">{{ serie.description }}</td>
                      <td class="px-2 py-1 border-b text-gray-500 text-xs">
                        {{ serie.startDate | date:'dd/MM/yyyy' }} - {{ serie.endDate | date:'dd/MM/yyyy' }}
                      </td>
                    </tr>
                    <tr *ngIf="globalSeries.length === 0">
                      <td colspan="4" class="px-2 py-8 text-center text-gray-500">
                        Nenhuma série global encontrada.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="h-40 border border-gray-300 p-2 bg-gray-50">
                <div class="flex gap-4 border-b border-gray-300 mb-2">
                  <button class="font-medium text-blue-600 border-b-2 border-blue-600 px-2">Gerais</button>
                  <button class="text-gray-600 px-2">Fiscalidade</button>
                  <button class="text-gray-600 px-2">Impressão</button>
                  <button class="text-gray-600 px-2">Sugestão</button>
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                      <label>Lançamento:</label>
                      <select class="w-24 border border-gray-300 px-1 py-0.5"><option>000</option></select>
                    </div>
                    <div class="flex items-center justify-between">
                      <label>Data Inicial:</label>
                      <input type="date" value="2025-01-01" class="w-24 border border-gray-300 px-1 py-0.5" />
                    </div>
                    <div class="flex items-center justify-between">
                      <label>Limite Inferior:</label>
                      <input type="number" value="0" class="w-24 border border-gray-300 px-1 py-0.5" />
                    </div>
                    <div class="flex items-center justify-between">
                      <label class="text-blue-600">Último Documento:</label>
                      <input type="number" value="1016" class="w-24 border border-gray-300 px-1 py-0.5" />
                    </div>
                  </div>
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                      <label>Actual</label>
                    </div>
                    <div class="flex items-center justify-between">
                      <label>Data Final:</label>
                      <input type="date" value="2025-12-31" class="w-24 border border-gray-300 px-1 py-0.5" />
                    </div>
                    <div class="flex items-center justify-between">
                      <label>Limite Superior:</label>
                      <input type="number" value="999999" class="w-24 border border-gray-300 px-1 py-0.5" />
                    </div>
                    <div class="flex items-center justify-between">
                      <label>Data Últ. Doc.:</label>
                      <input type="date" value="2025-12-16" class="w-24 border border-gray-300 px-1 py-0.5" />
                    </div>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="flex items-center gap-2"><input type="checkbox" checked /> Sugere Data Sistema</label>
                    <label class="flex items-center gap-2"><input type="checkbox" checked /> Série por Defeito</label>
                    <label class="flex items-center gap-2"><input type="checkbox" checked /> Alteração da Data</label>
                    <label class="flex items-center gap-2"><input type="checkbox" /> IVA Incluído</label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab: Internet -->
            <div *ngIf="activeTab === 'Internet'" class="flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <label class="flex items-center gap-2" title="Habilita o envio automático deste documento por correio eletrónico para a entidade.">
                  <input type="checkbox" [(ngModel)]="config.emailSend" /> Envia o documento por E-mail
                </label>
                <label class="flex items-center gap-2 ml-6" title="Solicita confirmação ao utilizador antes de enviar o e-mail.">
                  <input type="checkbox" [(ngModel)]="config.emailConfirm" [disabled]="!config.emailSend" /> Confirma Envio
                </label>
                <label class="flex items-center gap-2 ml-6" title="Abre a janela de pré-visualização do e-mail antes do envio.">
                  <input type="checkbox" [(ngModel)]="config.emailVisualize" [disabled]="!config.emailSend" /> Visualiza
                </label>
              </div>

              <fieldset class="border border-gray-300 p-2 rounded-sm" [disabled]="!config.emailSend">
                <legend class="px-1 text-blue-600 font-medium">Endereços</legend>
                <div class="grid grid-cols-[40px_1fr] gap-2 items-center mb-2">
                  <label>Para:</label>
                  <div class="flex items-center gap-4">
                    <input type="text" [(ngModel)]="config.emailTo" class="flex-1 border border-gray-300 px-1 py-0.5" />
                    <div class="flex items-center gap-2">
                      <label class="flex items-center gap-1"><input type="radio" name="emailType" value="fixed" checked /> Fixo</label>
                      <label class="flex items-center gap-1"><input type="radio" name="emailType" value="contact" /> Tipo Contacto</label>
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-[40px_1fr] gap-2 items-center mb-2">
                  <label>CC:</label>
                  <input type="text" [(ngModel)]="config.emailCc" class="w-full border border-gray-300 px-1 py-0.5" />
                </div>
                <div class="grid grid-cols-[40px_1fr] gap-2 items-center">
                  <label>BCC:</label>
                  <input type="text" [(ngModel)]="config.emailBcc" class="w-full border border-gray-300 px-1 py-0.5" />
                </div>
              </fieldset>

              <fieldset class="border border-gray-300 p-2 rounded-sm flex-1 flex flex-col" [disabled]="!config.emailSend">
                <legend class="px-1 text-blue-600 font-medium">Mensagem Anexa</legend>
                <textarea [(ngModel)]="config.emailMessage" class="flex-1 w-full border border-gray-300 p-1 resize-none"></textarea>
              </fieldset>
            </div>

            <!-- Tab: Projetos -->
            <div *ngIf="activeTab === 'Projetos'" class="flex flex-col h-full">
              <fieldset class="border border-gray-300 p-2 rounded-sm flex-1">
                <legend class="px-1 text-blue-600 font-medium">Classe Analítica</legend>
                <div class="flex flex-col gap-2 mt-2" title="Define a categoria de análise para a contabilidade analítica ou orçamental.">
                  <label class="flex items-center gap-2">
                    <input type="radio" name="analytic" value="None" [(ngModel)]="config.analyticClass" /> Nenhuma
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="analytic" value="CostBudget" [(ngModel)]="config.analyticClass" /> Orçamento de Custos
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="analytic" value="Consumptions" [(ngModel)]="config.analyticClass" /> Consumos
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="analytic" value="Purchases" [(ngModel)]="config.analyticClass" /> Compras
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="analytic" value="RevenueBudget" [(ngModel)]="config.analyticClass" /> Orçamento de Proveitos
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="analytic" value="Revenues" [(ngModel)]="config.analyticClass" /> Proveitos
                  </label>
                </div>
              </fieldset>

              <div class="mt-4 border-t border-gray-300 pt-4">
                <label class="flex items-center gap-2 mb-2" title="Altera automaticamente o estado do projeto ou obra associada após a gravação.">
                  <input type="checkbox" [(ngModel)]="config.transitionState" /> Efetua Transição de Estado
                </label>
                <div class="flex items-center gap-2">
                  <label class="w-16 text-gray-500">Estado:</label>
                  <select [(ngModel)]="config.targetState" class="w-48 border border-gray-300 px-1 py-0.5" [disabled]="!config.transitionState">
                    <option value="">(Selecionar)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `
})
export class DocumentTypeConfigModalComponent implements OnInit {
  @Input() module: 'SALES' | 'PURCHASES' | 'INVENTORY' | 'TREASURY' = 'SALES';
  @Input() documentCode: string = '';
  @Input() activeTab = 'Gerais';
  @Output() close = new EventEmitter<void>();

  tabs = ['Gerais', 'Contas Correntes', 'Stocks', 'Tesouraria', 'Séries', 'Internet', 'Projetos'];

  config: any = {
    code: '',
    description: '',
    type: 'Financeiro',
    allowOtherCreditors: false,
    allowSuppliers: true,
    nature: 'PAY',
    externalDocBehavior: 'WARN',
    stats: true,
    currentAccounts: true,
    stocks: true,
    treasury: false,
    creditLimit: true,
    recapitulatives: true,
    allowReversal: true,
    reversalDoc: 'NC',

    // Treasury Specific
    allowedEntities: {
      customer: false,
      supplier: false,
      state: false,
      other: false,
      shareholder: false,
      bank: false
    },
    commissionCalculation: false,
    provisionSuggestion: false,
    allowNegativeLines: false,
    allowNegativeDocs: false,
    reversalSeries: '',
    subjectToRetention: false,
    exportFormat: '',
    designation: '',

    // Contas Correntes
    accountType: 'CCF',
    accountStatus: 'AGP',
    autoLiquidation: false,
    autoLiquidationDoc: '',
    generatePendingByLine: false,
    retentionAtSource: false,
    retentionDoc: '',

    // Stocks
    stockMovementPositiveType: 'Entrada',
    stockUpdatePCM: true,
    stockUpdateUPC: true,
    stockUpdateLastEntry: true,
    stockUpdateLastExit: false,
    stockMovementNegativeType: 'Saída',
    stockUpdatePCM_Neg: false,
    stockUpdateUPC_Neg: false,
    stockUpdateLastEntry_Neg: false,
    stockUpdateLastExit_Neg: false,

    // Tesouraria
    treasuryIntegration: false,
    treasuryDefaultAccount: '',
    treasuryDocType: 'Movimento em conta',
    treasuryMode: 'PAYMENT_MODE',

    // Séries
    series: [],

    // Internet
    emailSend: false,
    emailConfirm: false,
    emailVisualize: false,
    emailTo: '',
    emailCc: '',
    emailBcc: '',
    emailMessage: '',

    // Projetos
    analyticClass: 'Purchases',
    transitionState: false,
    targetState: ''
  };

  activeCompanyId: string | null = null;
  globalSeries: any[] = [];
  showList = false;
  documentTypesList: any[] = [];

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.loadActiveCompany();
    this.loadGlobalSeries();

    // Set defaults based on module
    if (this.module === 'SALES') {
      this.config.stockMovementPositiveType = 'Saída';
      this.config.stockMovementNegativeType = 'Entrada';
    } else if (this.module === 'PURCHASES') {
      this.config.stockMovementPositiveType = 'Entrada';
      this.config.stockMovementNegativeType = 'Saída';
    } else if (this.module === 'INVENTORY') {
      this.config.type = 'Stock';
    } else if (this.module === 'TREASURY') {
      this.config.type = 'Liquidações';
      this.tabs = ['Gerais', 'Configuração', 'Tesouraria', 'Séries', 'Internet', 'Projetos'];
      // If activeTab was passed as 'Contas Correntes' (default for others), switch it to 'Configuração'
      if (this.activeTab === 'Contas Correntes') {
        // Keep it or change? The user might have requested 'Séries' specifically.
        // If the user requested 'Séries', it's fine.
      }
    }

    if (this.documentCode) {
      this.loadDocumentType();
    }
  }

  loadActiveCompany() {
    this.dataService.getCompanyInfo().subscribe(info => {
      this.activeCompanyId = info.id;
      this.loadGlobalSeries(); // Reload series when company is loaded
    });
  }

  loadGlobalSeries() {
    if (this.activeCompanyId) {
      this.dataService.getSeries(this.activeCompanyId).subscribe(series => {
        this.globalSeries = series;
        this.globalSeries.sort((a, b) => b.code.localeCompare(a.code));
      });
    } else {
      this.globalSeries = [];
    }
  }

  loadDocumentType() {
    let key = '';
    switch (this.module) {
      case 'SALES': key = 'erp_sales_document_types'; break;
      case 'PURCHASES': key = 'erp_purchase_document_types'; break;
      case 'INVENTORY': key = 'erp_stock_document_types'; break;
      case 'TREASURY': key = 'erp_treasury_document_types'; break;
    }

    const stored = localStorage.getItem(key);
    if (stored) {
      const types = JSON.parse(stored);
      const found = types.find((t: any) => t.code === this.documentCode);
      if (found) {
        // Merge found config with default config to ensure all fields exist
        this.config = { ...this.config, ...found };

        // Ensure allowedEntities exists for Treasury
        if (this.module === 'TREASURY' && !this.config.allowedEntities) {
          this.config.allowedEntities = {
            customer: false,
            supplier: false,
            state: false,
            other: false,
            shareholder: false,
            bank: false
          };
        }
      }
    }

    // Ensure series array exists
    if (!this.config.series) {
      this.config.series = [];
    }
  }

  toggleList() {
    this.showList = !this.showList;
    if (this.showList) {
      this.loadDocumentTypesList();
    }
  }

  loadDocumentTypesList() {
    let key = '';
    switch (this.module) {
      case 'SALES': key = 'erp_sales_document_types'; break;
      case 'PURCHASES': key = 'erp_purchase_document_types'; break;
      case 'INVENTORY': key = 'erp_stock_document_types'; break;
      case 'TREASURY': key = 'erp_treasury_document_types'; break;
    }

    const stored = localStorage.getItem(key);
    let list = stored ? JSON.parse(stored) : [];

    if (this.module === 'TREASURY' && list.length === 0) {
      // Defaults
      const defaults = [
        // Receipts
        { code: 'RE', description: 'Recibo', nature: 'RECEIVE', allowedEntities: { customer: true, supplier: false, state: false, other: false, shareholder: false, bank: false } },
        { code: 'ADC', description: 'Adiantamento de Cliente', nature: 'RECEIVE', allowedEntities: { customer: true, supplier: false, state: false, other: false, shareholder: false, bank: false } },
        { code: 'REF', description: 'Recebimento de Fornecedor', nature: 'RECEIVE', allowedEntities: { customer: false, supplier: true, state: false, other: false, shareholder: false, bank: false } },
        { code: 'OTR', description: 'Outros Recebimentos', nature: 'RECEIVE', allowedEntities: { customer: true, supplier: true, state: true, other: true, shareholder: true, bank: true } },

        // Payments
        { code: 'PAG', description: 'Pagamento', nature: 'PAY', allowedEntities: { customer: false, supplier: true, state: false, other: false, shareholder: false, bank: false } },
        { code: 'ADF', description: 'Adiantamento a Fornecedor', nature: 'PAY', allowedEntities: { customer: false, supplier: true, state: false, other: false, shareholder: false, bank: false } },
        { code: 'PGF', description: 'Pagamento a Funcionários', nature: 'PAY', allowedEntities: { customer: false, supplier: false, state: false, other: true, shareholder: false, bank: false } },
        { code: 'PGE', description: 'Pagamento ao Estado', nature: 'PAY', allowedEntities: { customer: false, supplier: false, state: true, other: false, shareholder: false, bank: false } },
        { code: 'OTP', description: 'Outros Pagamentos', nature: 'PAY', allowedEntities: { customer: true, supplier: true, state: true, other: true, shareholder: true, bank: true } }
      ];

      list = defaults;
      localStorage.setItem(key, JSON.stringify(list));
    }

    this.documentTypesList = list;
    // Sort by code
    this.documentTypesList.sort((a, b) => a.code.localeCompare(b.code));
  }

  selectDocumentType(doc: any) {
    this.config = { ...doc };
    // Ensure nested objects are initialized if missing
    if (this.module === 'TREASURY' && !this.config.allowedEntities) {
      this.config.allowedEntities = {
        customer: false,
        supplier: false,
        state: false,
        other: false,
        shareholder: false,
        bank: false
      };
    }
    if (!this.config.series) {
      this.config.series = [];
    }

    this.showList = false;
  }

  isAssociated(globalSerie: any): boolean {
    if (!this.config.series) return false;
    return this.config.series.some((s: any) => s.code === globalSerie.code && s.companyId === this.activeCompanyId);
  }

  toggleAssociation(globalSerie: any) {
    if (!this.config.series) this.config.series = [];

    const index = this.config.series.findIndex((s: any) => s.code === globalSerie.code && s.companyId === this.activeCompanyId);

    if (index !== -1) {
      // Remove
      this.config.series.splice(index, 1);
    } else {
      // Add
      this.config.series.push({
        code: globalSerie.code,
        description: globalSerie.description,
        active: true,
        companyId: this.activeCompanyId
      });
    }
  }

  save() {
    if (!this.config.code) {
      alert('O código do documento é obrigatório.');
      return;
    }

    let key = '';
    switch (this.module) {
      case 'SALES': key = 'erp_sales_document_types'; break;
      case 'PURCHASES': key = 'erp_purchase_document_types'; break;
      case 'INVENTORY': key = 'erp_stock_document_types'; break;
      case 'TREASURY': key = 'erp_treasury_document_types'; break;
    }

    const stored = localStorage.getItem(key);
    let types = stored ? JSON.parse(stored) : [];

    const index = types.findIndex((t: any) => t.code === this.config.code);
    if (index !== -1) {
      types[index] = { ...types[index], ...this.config };
    } else {
      types.push(this.config);
    }

    localStorage.setItem(key, JSON.stringify(types));
    alert('Configuração gravada com sucesso!');
    this.close.emit();
  }

  delete() {
    if (!this.config.code) return;

    if (!confirm(`Tem a certeza que deseja anular/remover o documento ${this.config.code}?`)) {
      return;
    }

    let key = '';
    switch (this.module) {
      case 'SALES': key = 'erp_sales_document_types'; break;
      case 'PURCHASES': key = 'erp_purchase_document_types'; break;
      case 'INVENTORY': key = 'erp_stock_document_types'; break;
      case 'TREASURY': key = 'erp_treasury_document_types'; break;
    }

    const stored = localStorage.getItem(key);
    if (stored) {
      let types = JSON.parse(stored);
      const initialLength = types.length;
      types = types.filter((t: any) => t.code !== this.config.code);

      if (types.length < initialLength) {
        localStorage.setItem(key, JSON.stringify(types));
        alert('Documento removido com sucesso.');
        this.reset();
      } else {
        alert('Documento não encontrado para remover.');
      }
    }
  }

  reset() {
    // Reset to defaults
    this.config = {
      code: '',
      description: '',
      type: 'Financeiro',
      allowOtherCreditors: false,
      allowSuppliers: true,
      nature: 'PAY',
      externalDocBehavior: 'WARN',
      stats: true,
      currentAccounts: true,
      stocks: true,
      treasury: false,
      creditLimit: true,
      recapitulatives: true,
      allowReversal: true,
      reversalDoc: 'NC',
      accountType: 'CCF',
      accountStatus: 'AGP',
      autoLiquidation: false,
      autoLiquidationDoc: '',
      generatePendingByLine: false,
      retentionAtSource: false,
      retentionDoc: '',

      // Treasury Specific
      allowedEntities: {
        customer: false,
        supplier: false,
        state: false,
        other: false,
        shareholder: false,
        bank: false
      },
      commissionCalculation: false,
      provisionSuggestion: false,
      allowNegativeLines: false,
      allowNegativeDocs: false,
      reversalSeries: '',
      subjectToRetention: false,
      exportFormat: '',
      designation: '',

      // Stocks - Set based on module
      stockMovementPositiveType: this.module === 'SALES' ? 'Saída' : 'Entrada',
      stockUpdatePCM: true,
      stockUpdateUPC: true,
      stockUpdateLastEntry: true,
      stockUpdateLastExit: false,
      stockMovementNegativeType: this.module === 'SALES' ? 'Entrada' : 'Saída',
      stockUpdatePCM_Neg: false,
      stockUpdateUPC_Neg: false,
      stockUpdateLastEntry_Neg: false,
      stockUpdateLastExit_Neg: false,

      treasuryIntegration: false,
      treasuryDefaultAccount: '',
      treasuryDocType: 'Movimento em conta',
      treasuryMode: 'PAYMENT_MODE',

      series: [],
      emailSend: false,
      emailConfirm: false,
      emailVisualize: false,
      emailTo: '',
      emailCc: '',
      emailBcc: '',
      emailMessage: '',
      analyticClass: 'Purchases',
      transitionState: false,
      targetState: ''
    };

    // Set module specific defaults again
    if (this.module === 'INVENTORY') {
      this.config.type = 'Stock';
    } else if (this.module === 'TREASURY') {
      this.config.type = 'Liquidações';
    }
  }
}
