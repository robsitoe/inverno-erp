import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-admin-tools',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-6 text-gray-800">🔧 Ferramentas de Administração</h1>
      
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <span class="material-symbols-outlined text-yellow-400">warning</span>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              <strong>Atenção:</strong> Estas ações são irreversíveis e irão apagar dados permanentemente.
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Reset Database -->
        <div class="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-2 text-gray-800">🗑️ Reiniciar Base de Dados</h3>
          <p class="text-sm text-gray-600 mb-4">
            Remove todos os dados do sistema (documentos, lançamentos, movimentos de stock) e restaura os dados de exemplo.
          </p>
          <button 
            (click)="resetDatabase()"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Reiniciar Tudo
          </button>
        </div>

        <!-- Clear Sales Documents -->
        <div class="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-2 text-gray-800">📄 Limpar Documentos de Venda</h3>
          <p class="text-sm text-gray-600 mb-4">
            Remove apenas os documentos de venda (FA, GR, VD, etc.).
          </p>
          <button 
            (click)="clearSalesDocuments()"
            class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Limpar Documentos
          </button>
        </div>

        <!-- Clear Journal Entries -->
        <div class="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-2 text-gray-800">📊 Limpar Lançamentos Contábeis</h3>
          <p class="text-sm text-gray-600 mb-4">
            Remove todos os lançamentos contábeis do diário.
          </p>
          <button 
            (click)="clearJournalEntries()"
            class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Limpar Lançamentos
          </button>
        </div>

        <!-- Clear Stock Movements -->
        <div class="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-2 text-gray-800">📦 Limpar Movimentos de Stock</h3>
          <p class="text-sm text-gray-600 mb-4">
            Remove todos os movimentos de stock e restaura quantidades iniciais.
          </p>
          <button 
            (click)="clearStockMovements()"
            class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Limpar Stock
          </button>
        </div>

        <!-- Export Data -->
        <div class="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-2 text-gray-800">💾 Exportar Dados</h3>
          <p class="text-sm text-gray-600 mb-4">
            Exporta todos os dados do sistema para um arquivo JSON (backup).
          </p>
          <button 
            (click)="exportData()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Exportar Backup
          </button>
        </div>

        <!-- Sync with Backend -->
        <div class="bg-white border border-gray-300 rounded-lg p-4 shadow-sm border-l-4 border-l-blue-500">
          <h3 class="text-lg font-semibold mb-2 text-gray-800 flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-500">sync</span>
            Sincronizar com Backend
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            Envia todos os dados locais (localStorage) para o servidor backend. Útil para migrar do modo navegador para o modo Base de Dados Local.
          </p>
          <div class="flex items-center gap-3">
            <button 
              (click)="syncWithBackend()"
              [disabled]="isSyncing"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 disabled:bg-blue-300"
            >
              <span *ngIf="isSyncing" class="animate-spin material-symbols-outlined text-[18px]">sync</span>
              {{ isSyncing ? 'A Sincronizar...' : 'Sincronizar Agora' }}
            </button>
            <span *ngIf="syncStatus" class="text-xs font-medium" [ngClass]="syncStatus.success ? 'text-green-600' : 'text-red-600'">
              {{ syncStatus.message }}
            </span>
          </div>
        </div>
      </div>

      <div class="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h4 class="font-semibold mb-2 text-gray-700">ℹ️ Informação</h4>
        <ul class="text-sm text-gray-600 space-y-1">
          <li>• Os dados são armazenados no localStorage do navegador</li>
          <li>• Após reiniciar, os dados de exemplo serão restaurados automaticamente</li>
          <li>• Recomenda-se fazer backup antes de limpar dados importantes</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #f5f5f5;
    }
  `]
})
export class AdminToolsComponent {
  isSyncing = false;
  syncStatus: { success: boolean, message: string } | null = null;

  constructor(private dataService: DataService) { }

  resetDatabase() {
    if (confirm('⚠️ ATENÇÃO!\n\nTem certeza que deseja REINICIAR TODA A BASE DE DADOS?\n\nTodos os dados serão perdidos permanentemente:\n- Documentos de venda\n- Lançamentos contábeis\n- Movimentos de stock\n- Clientes customizados\n\nEsta ação é IRREVERSÍVEL!')) {
      localStorage.clear();
      alert('✅ Base de dados reiniciada com sucesso!\n\nA página será recarregada.');
      window.location.reload();
    }
  }

  clearSalesDocuments() {
    if (confirm('Tem certeza que deseja limpar TODOS os documentos de venda?')) {
      localStorage.removeItem('erp_sales_documents');
      alert('✅ Documentos de venda removidos com sucesso!');
      window.location.reload();
    }
  }

  clearJournalEntries() {
    if (confirm('Tem certeza que deseja limpar TODOS os lançamentos contábeis?')) {
      localStorage.removeItem('erp_journal_entries');
      alert('✅ Lançamentos contábeis removidos com sucesso!');
      window.location.reload();
    }
  }

  clearStockMovements() {
    if (confirm('Tem certeza que deseja limpar TODOS os movimentos de stock?')) {
      localStorage.removeItem('erp_stock_movements');
      alert('✅ Movimentos de stock removidos com sucesso!');
      window.location.reload();
    }
  }

  exportData() {
    const data = {
      salesDocuments: localStorage.getItem('erp_sales_documents'),
      journalEntries: localStorage.getItem('erp_journal_entries'),
      stockMovements: localStorage.getItem('erp_stock_movements'),
      accounts: localStorage.getItem('erp_accounts'),
      journals: localStorage.getItem('erp_journals'),
      customers: localStorage.getItem('erp_customers'),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert('✅ Backup exportado com sucesso!');
  }

  syncWithBackend() {
    if (!confirm('Deseja enviar todos os dados locais para o backend? Isso pode sobrescrever dados existentes no servidor.')) {
      return;
    }

    this.isSyncing = true;
    this.syncStatus = null;

    this.dataService.syncAllDataToBackend().subscribe({
      next: (response) => {
        this.isSyncing = false;
        this.syncStatus = { success: true, message: '✅ Sincronização concluída com sucesso!' };
        alert('✅ Sincronização concluída com sucesso!');
      },
      error: (error) => {
        this.isSyncing = false;
        this.syncStatus = { success: false, message: '❌ Erro na sincronização: ' + (error.error?.message || error.message) };
        console.error('Sync error:', error);
      }
    });
  }
}
