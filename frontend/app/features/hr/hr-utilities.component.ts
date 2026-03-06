import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../shared/components/app-icon.component';
import { DataService } from '../../services/data.service';
import { ToasterService } from '../../services/toaster.service';

@Component({
    selector: 'app-hr-utilities',
    standalone: true,
    imports: [CommonModule, FormsModule, AppIconComponent],
    template: `
    <div class="h-full flex flex-col bg-[#F3F4F6]">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm relative z-10">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-50 rounded-lg text-blue-600">
            <app-icon name="handyman" [size]="28"></app-icon>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Utilitários de RH</h1>
            <p class="text-xs text-gray-500">Ferramentas de manutenção e ações em massa</p>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-auto p-6">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Bulk Actions Section -->
          <div class="space-y-6">
            <h2 class="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <app-icon name="dynamic_form" [size]="18"></app-icon>
              Ações em Massa
            </h2>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
              
              <!-- Action: Atualização Salarial -->
              <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div class="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <app-icon name="trending_up" [size]="24"></app-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-gray-800 text-sm">Atualização Salarial Coletiva</h3>
                  <p class="text-[10px] text-gray-500 italic">Aplicar aumento percentual ou valor fixo a múltiplos funcionários.</p>
                </div>
                <app-icon name="chevron_right" [size]="20" color="#94a3b8"></app-icon>
              </div>

              <!-- Action: Importação de Dados -->
              <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div class="p-3 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <app-icon name="upload_file" [size]="24"></app-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-gray-800 text-sm">Importar Funcionários de Excel</h3>
                  <p class="text-[10px] text-gray-500 italic">Carregar lista de colaboradores via ficheiro CSV ou XLSX.</p>
                </div>
                <app-icon name="chevron_right" [size]="20" color="#94a3b8"></app-icon>
              </div>

              <!-- Action: Exportação Bancária -->
              <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div class="p-3 bg-orange-50 rounded-lg text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <app-icon name="account_balance_wallet" [size]="24"></app-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-gray-800 text-sm">Gerar Ficheiro de Transferências SEPA/Bancária</h3>
                  <p class="text-[10px] text-gray-500 italic">Exportar pagamentos mensais para importação no portal do banco.</p>
                </div>
                <app-icon name="chevron_right" [size]="20" color="#94a3b8"></app-icon>
              </div>

            </div>
          </div>

          <!-- Configuration & Maintenance Section -->
          <div class="space-y-6">
            <h2 class="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <app-icon name="admin_panel_settings" [size]="18"></app-icon>
              Manutenção e Diagnóstico
            </h2>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
              
              <!-- Action: Re-calculo de Antiguidade -->
              <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div class="p-3 bg-teal-50 rounded-lg text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <app-icon name="update" [size]="24"></app-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-gray-800 text-sm">Recalcular Tempos de Serviço</h3>
                  <p class="text-[10px] text-gray-500 italic">Verificar e corrigir datas de admissão e cálculo de anos de antiguidade.</p>
                </div>
                <app-icon name="chevron_right" [size]="20" color="#94a3b8"></app-icon>
              </div>

              <!-- Action: Fecho de Ano RH -->
              <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div class="p-3 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <app-icon name="lock" [size]="24"></app-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-gray-800 text-sm">Fecho de Ano Civil</h3>
                  <p class="text-[10px] text-gray-500 italic">Migrar saldos de férias e arquivar registos históricos.</p>
                </div>
                <div class="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded font-bold uppercase">Crítico</div>
              </div>

              <!-- Action: Limpeza de Rascunhos -->
              <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div class="p-3 bg-gray-50 rounded-lg text-gray-600 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                  <app-icon name="delete_sweep" [size]="24"></app-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-gray-800 text-sm">Limpeza de Processamentos Pendentes</h3>
                  <p class="text-[10px] text-gray-500 italic">Remover todos os rascunhos de salários não confirmados.</p>
                </div>
                <app-icon name="chevron_right" [size]="20" color="#94a3b8"></app-icon>
              </div>

            </div>
            
            <div class="bg-blue-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
               <div class="relative z-10 font-bold text-lg mb-2 flex items-center gap-2">
                 <app-icon name="support_agent" [size]="24"></app-icon>
                 Precisa de Ajuda?
               </div>
               <p class="relative z-10 text-sm opacity-90 leading-relaxed mb-4">Se necessitar de personalização de fórmulas ou integração com relógios de ponto, contacte o suporte técnico.</p>
               <button class="relative z-10 bg-white text-blue-600 font-bold px-4 py-2 rounded-lg text-xs hover:bg-blue-50 transition-colors uppercase tracking-widest shadow-sm">Abrir Ticket</button>
               
               <!-- Abstract circles in background -->
               <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full"></div>
               <div class="absolute right-12 top-0 w-16 h-16 bg-white/5 rounded-full"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class HRUtilitiesComponent implements OnInit {
    constructor(
        private toaster: ToasterService
    ) { }

    ngOnInit() { }
}
